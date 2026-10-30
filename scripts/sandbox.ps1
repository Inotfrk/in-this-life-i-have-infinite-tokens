# Sandbox runner: keeps a long-lived named container so any run can be inspected
# or reproduced afterwards instead of disappearing with --rm.
#
# Usage (Windows):
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 build          # 轻量版镜像
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 build -Target view
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 start
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 test
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 view           # 可视桌面 + 截图
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 shell
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 runs
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 logs
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 stop
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 clean
param(
    [ValidateSet('build', 'start', 'test', 'view', 'shell', 'runs', 'logs', 'stop', 'clean')]
    [string]$Task = 'test',
    # test = 只跑测试的轻量镜像；view = 额外带 noVNC 桌面的可视镜像
    [ValidateSet('test', 'view')]
    [string]$Target = 'test',
    [string]$Image = 'calculator-sandbox:local',
    [string]$ViewImage = 'calculator-sandbox:view',
    [string]$Container = 'calculator-sandbox',
    [string]$Command = 'xvfb-run -a bash scripts/build.sh test',
    [int]$ViewPort = 6080
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runsDir = Join-Path $root '.sandbox-runs'

function Get-DockerExe {
    $cmd = Get-Command docker.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in 'D:\Docker\resources\bin\docker.exe', 'C:\Program Files\Docker\Docker\resources\bin\docker.exe') {
        if (Test-Path $p) { return $p }
    }
    throw 'docker CLI not found; install Docker Desktop or add resources\bin to PATH'
}

$docker = Get-DockerExe

function Invoke-Docker {
    param([string[]]$DockerArgs, [switch]$AllowFail)
    & $docker @DockerArgs
    if ($LASTEXITCODE -ne 0 -and -not $AllowFail) {
        throw "docker $($DockerArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
    return $LASTEXITCODE
}

function Test-ContainerExists {
    $out = & $docker container ls -a --filter "name=^/$Container$" --format '{{.Names}}' 2>$null
    return [bool]($out -and $out.Trim() -eq $Container)
}

function Test-ViewPortMapped {
    # 用 inspect 的 JSON 判断，避免 docker port 文本输出带 \r 或换行导致匹配失败。
    $json = & $docker container inspect -f '{{json .HostConfig.PortBindings}}' $Container 2>$null
    if (-not $json) { return $false }
    try {
        $bindings = $json.ToString().Trim() | ConvertFrom-Json
        $entry = $bindings.'6080/tcp'
        if (-not $entry) { return $false }
        return [bool]($entry | Where-Object { $_.HostPort -eq "$ViewPort" })
    } catch {
        return $false
    }
}

function Invoke-BuildImage {
    # 按 target 构建：test 是轻量版，view 额外带 noVNC 桌面。
    # 镜像 id 会写进每次运行的 meta.json，失败时可以追溯到具体环境。
    $tag = if ($Target -eq 'view') { $ViewImage } else { $Image }
    Invoke-Docker @(
        'build', '--pull', '--target', $Target, '-t', $tag,
        '-f', (Join-Path $root 'Dockerfile'), $root
    ) | Out-Null
    Write-Host "Image built -> $tag (target=$Target)"
}

function Invoke-Start {
    param([string]$UseImage = $Image)
    if (-not (Test-ContainerExists)) {
        Write-Host "Creating container $Container from $UseImage ..."
        # noVNC 端口固定映射，view 子命令才能在浏览器里打开虚拟桌面。
        Invoke-Docker @(
            'run', '-d',
            '--name', $Container,
            '-p', "${ViewPort}:6080",
            '-v', "$($root):/workspace",
            '-w', '/workspace',
            '--init',
            $UseImage,
            'sleep', 'infinity'
        ) | Out-Null
    } elseif (-not (& $docker container inspect -f '{{.State.Running}}' $Container)) {
        Invoke-Docker @('start', $Container) | Out-Null
    } else {
        if (-not (Test-ViewPortMapped)) {
            Write-Warning "Container $Container was created without -p ${ViewPort}:6080; run 'clean' then 'start' to enable view."
        }
    }
    Write-Host "Container $Container is running"
}

function Get-ContainerImage {
    if (-not (Test-ContainerExists)) { return $null }
    return (& $docker container inspect -f '{{.Config.Image}}' $Container 2>$null).Trim()
}

function Invoke-View {
    # 可视版需要 VNC 那套组件，所以固定用 ViewImage；容器若建自轻量镜像则重建。
    if (Test-ContainerExists) {
        $current = Get-ContainerImage
        if ($current -ne $ViewImage) {
            Write-Host "Container was built from '$current'; recreating from '$ViewImage' ..."
            Invoke-Docker @('rm', '-f', $Container) -AllowFail | Out-Null
        }
    }
    Invoke-Docker @('image', 'inspect', $ViewImage) -AllowFail | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "View image missing, building it (this pulls the VNC layer once) ..."
        $script:Target = 'view'
        Invoke-BuildImage
    }
    Invoke-Start -UseImage $ViewImage
    if (-not (Test-ViewPortMapped)) {
        throw "Container $Container has no noVNC port mapping. Run: sandbox.ps1 clean; sandbox.ps1 view"
    }
    Invoke-Docker @('exec', $Container, 'bash', '-lc', 'bash scripts/desktop.sh') -AllowFail | Out-Null
    # 给 Xvfb / fluxbox / x11vnc / websockify 起来的时间
    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        $code = & $docker exec $Container bash -lc "curl -s -o /dev/null -w '%{http_code}' http://localhost:$ViewPort/vnc.html" 2>$null
        if ($code -eq '200') { $ready = $true; break }
    }
    if (-not $ready) {
        Invoke-Docker @('exec', $Container, 'bash', '-lc', 'tail -n 20 /tmp/websockify.log /tmp/x11vnc.log /tmp/xvfb.log') -AllowFail | Out-Null
        throw 'noVNC did not become ready'
    }
    Write-Host "noVNC ready -> http://localhost:$ViewPort/vnc.html?autoconnect=1&resize=scale"
    Save-Screenshot
}

function Save-Screenshot {
    # 抓虚拟屏当前画面，直接落进 .sandbox-runs，方便复盘与贴进报告。
    New-Item -ItemType Directory -Force -Path $runsDir | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $target = Join-Path $runsDir "screen-$stamp.png"
    $inside = "/tmp/screen-$stamp.png"
    & $docker exec $Container bash -lc "DISPLAY=:99 import -window root $inside" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'screenshot failed (imagemagick import); is Invoke-View running?'
        return
    }
    Invoke-Docker @('cp', "${Container}:$inside", $target) | Out-Null
    Invoke-Docker @('exec', $Container, 'rm', '-f', $inside) -AllowFail | Out-Null
    Write-Host "screenshot -> $target"
}

function Invoke-Test {
    Invoke-Start
    New-Item -ItemType Directory -Force -Path $runsDir | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $runDir = Join-Path $runsDir $stamp
    New-Item -ItemType Directory -Force -Path $runDir | Out-Null

    $imageId = (& $docker image inspect -f '{{.Id}}' $Image)
    $containerId = (& $docker container inspect -f '{{.Id}}' $Container)
    $started = Get-Date

    Write-Host "Running: $Command"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    # Stream to console and persist at the same time; the exit code comes from
    # docker exec, not from Tee-Object.
    & $docker exec $Container bash -lc $Command 2>&1 |
        ForEach-Object { $line = $_.ToString(); Write-Host $line; $line } |
        Set-Content -Path (Join-Path $runDir 'stdout.log') -Encoding UTF8
    $exit = $LASTEXITCODE
    $sw.Stop()

    $meta = [ordered]@{
        started_at     = $started.ToString('o')
        finished_at    = (Get-Date).ToString('o')
        duration_sec   = [math]::Round($sw.Elapsed.TotalSeconds, 2)
        exit_code      = $exit
        command        = $Command
        image          = $Image
        image_id       = $imageId
        container      = $Container
        container_id   = $containerId
        git_commit     = (& git -C $root rev-parse HEAD 2>$null)
        git_branch     = (& git -C $root rev-parse --abbrev-ref HEAD 2>$null)
        git_dirty      = [bool](& git -C $root status --porcelain 2>$null)
        docker_version = (& $docker version -f '{{.Server.Version}}' 2>$null)
    }
    $meta | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $runDir 'meta.json') -Encoding UTF8

    Write-Host ''
    Write-Host "exit=$exit  duration=$($sw.Elapsed.TotalSeconds.ToString('n1'))s"
    Write-Host "record -> $runDir"
    if ($exit -ne 0) { exit $exit }
}

function Invoke-Shell {
    Invoke-Start
    # Interactive only; a non-interactive agent shell cannot use this.
    & $docker exec -it $Container bash
}

function Show-Runs {
    if (-not (Test-Path $runsDir)) { Write-Host 'No runs recorded yet.'; return }
    Get-ChildItem $runsDir -Directory | Sort-Object Name -Descending | ForEach-Object {
        $metaFile = Join-Path $_.FullName 'meta.json'
        if (Test-Path $metaFile) {
            $m = Get-Content $metaFile -Raw -Encoding UTF8 | ConvertFrom-Json
            '{0}  exit={1,-3} {2,7:n1}s  {3}  {4}' -f $_.Name, $m.exit_code, $m.duration_sec,
                ($m.git_commit -replace '^(.{8}).*', '$1'), $m.command
        } else {
            '{0}  (no meta.json)' -f $_.Name
        }
    }
}

switch ($Task) {
    'build' { Invoke-BuildImage }
    'start' { Invoke-Start }
    'test' { Invoke-Test }
    'view' { Invoke-View }
    'shell' { Invoke-Shell }
    'runs' { Show-Runs }
    'logs' { & $docker logs --tail 200 $Container }
    'stop' { if (Test-ContainerExists) { Invoke-Docker @('stop', $Container) -AllowFail | Out-Null }; Write-Host "Container $Container stopped" }
    'clean' {
        Invoke-Docker @('rm', '-f', $Container) -AllowFail | Out-Null
        Write-Host "Container $Container removed (image $Image and .sandbox-runs kept)"
    }
}
