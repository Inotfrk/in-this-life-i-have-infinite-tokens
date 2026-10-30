# Sandbox runner: keeps a long-lived named container so any run can be inspected
# or reproduced afterwards instead of disappearing with --rm.
#
# Resource caps: the container is created with --memory/--memory-swap/--cpus
# (default 2g / 2 CPUs) and every run is wrapped in a timeout. Without a cap a
# runaway build can take the whole host down; Docker's default is ~half of RAM
# with no reliable way back.
#
# Usage (Windows):
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 build
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 start
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 test
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 shell
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 runs
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 logs
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 stop
#   powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 clean
param(
    [ValidateSet('build', 'start', 'test', 'shell', 'runs', 'logs', 'stop', 'clean')]
    [string]$Task = 'test',
    [string]$Image = 'calculator-sandbox:local',
    [string]$Container = 'calculator-sandbox',
    [string]$Command = 'xvfb-run -a bash scripts/build.sh test',
    # Hard cap so a runaway build cannot take the whole host down (16 GB host,
    # Docker defaults to roughly half of it and never pages back reliably).
    [string]$Memory = '2g',
    [string]$Cpus = '2',
    # Outer guard against a hung test run; 0 disables it.
    [int]$Timeout = 600
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

function Invoke-BuildImage {
    # Image id is recorded in every run manifest, so a failed run can be traced
    # back to the exact environment it used.
    Invoke-Docker @('build', '--pull', '-t', $Image, '-f', (Join-Path $root 'Dockerfile'), $root) | Out-Null
    Write-Host "Image built -> $Image"
}

function Invoke-Start {
    if (-not (Test-ContainerExists)) {
        Write-Host "Creating container $Container (memory=$Memory cpus=$Cpus) ..."
        Invoke-Docker @(
            'run', '-d',
            '--name', $Container,
            '-v', "$($root):/workspace",
            '-w', '/workspace',
            '--init',
            # Same swap cap as memory: without it a runaway build starts swapping
            # and the host freezes instead of the container being killed.
            '--memory', $Memory,
            '--memory-swap', $Memory,
            '--cpus', $Cpus,
            $Image,
            'sleep', 'infinity'
        ) | Out-Null
    } elseif (-not (& $docker container inspect -f '{{.State.Running}}' $Container)) {
        Invoke-Docker @('start', $Container) | Out-Null
    } else {
        # Limits are frozen at creation time, so changing -Memory on an existing
        # container silently does nothing.
        $current = & $docker container inspect -f '{{.HostConfig.Memory}}' $Container
        if ($current -eq '0') {
            Write-Host "Warning: $Container has no memory limit; run 'clean' then 'start' to apply -Memory $Memory"
        }
    }
    Write-Host "Container $Container is running"
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
    # docker exec, not from Tee-Object. A hang inside the container must not hang
    # the host, so the command runs under an outer timeout.
    & $docker exec $Container bash -lc "timeout $Timeout $Command" 2>&1 |
        ForEach-Object { $line = $_.ToString(); Write-Host $line; $line } |
        Set-Content -Path (Join-Path $runDir 'stdout.log') -Encoding UTF8
    $exit = $LASTEXITCODE
    $sw.Stop()
    if ($exit -eq 124) { Write-Host "timeout: $Command still running after ${Timeout}s and was killed" }

    $meta = [ordered]@{
        started_at     = $started.ToString('o')
        finished_at    = (Get-Date).ToString('o')
        duration_sec   = [math]::Round($sw.Elapsed.TotalSeconds, 2)
        exit_code      = $exit
        command        = $Command
        timeout_sec    = $Timeout
        memory_limit   = (& $docker container inspect -f '{{.HostConfig.Memory}}' $Container)
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
    'shell' { Invoke-Shell }
    'runs' { Show-Runs }
    'logs' { & $docker logs --tail 200 $Container }
    'stop' { if (Test-ContainerExists) { Invoke-Docker @('stop', $Container) -AllowFail | Out-Null }; Write-Host "Container $Container stopped" }
    'clean' {
        Invoke-Docker @('rm', '-f', $Container) -AllowFail | Out-Null
        Write-Host "Container $Container removed (image $Image and .sandbox-runs kept)"
    }
}
