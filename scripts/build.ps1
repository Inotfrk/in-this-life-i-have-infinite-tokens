# 配置、构建、界面检查（Windows）。仅需 CMake + Qt 6 + MSVC。
# 用法: powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Task test
param(
    [ValidateSet('build', 'test', 'run', 'clean')]
    [string]$Task = 'build',
    # Qt 6 安装目录，例如 D:\Qt\6.8.1\msvc2022_64；未指定时自动探测。
    [string]$QtDir = $env:QT_ROOT_DIR,
    # 无显示器环境（容器 / CI）下用 offscreen 平台跑界面检查
    [switch]$Headless
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build'
# 单配置生成器（Ninja / Makefiles）直接放 build 根，MSVC 放在 Release 子目录。
$exeCandidates = @(
    (Join-Path $build 'infinite-tokens.exe'),
    (Join-Path $build 'Release\infinite-tokens.exe')
)

function Resolve-QtDir {
    param([string]$Hint)
    if ($Hint -and (Test-Path (Join-Path $Hint 'lib\cmake\Qt6\Qt6Config.cmake'))) { return $Hint }
    # 常见安装布局：<base>\<version>\<toolset>
    foreach ($base in @('C:\Qt', 'D:\Qt')) {
        if (-not (Test-Path $base)) { continue }
        $hits = Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { Get-ChildItem -Path $_.FullName -Directory -ErrorAction SilentlyContinue } |
            Where-Object { Test-Path (Join-Path $_.FullName 'lib\cmake\Qt6\Qt6Config.cmake') } |
            Sort-Object FullName -Descending
        if ($hits) { return $hits[0].FullName }
    }
    throw '未找到 Qt 6；用 -QtDir <Qt6 msvc kit 路径> 指定，或设置 QT_ROOT_DIR'
}

$qtDir = Resolve-QtDir -Hint $QtDir
$qtBin = Join-Path $qtDir 'bin'

function Get-Exe {
    foreach ($path in $exeCandidates) { if (Test-Path $path) { return $path } }
    throw "构建产物不存在，检查 build 目录：$build"
}

function Invoke-Configure {
    $cmakeArgs = @('-S', $root, '-B', $build, '-DCMAKE_BUILD_TYPE=Release',
                   "-DCMAKE_PREFIX_PATH=$qtDir")
    & cmake @cmakeArgs
    if ($LASTEXITCODE -ne 0) { throw 'cmake configure failed' }
}

function Invoke-Build {
    Invoke-Configure
    & cmake --build $build --config Release
    if ($LASTEXITCODE -ne 0) { throw 'build failed' }
    Write-Host "Built -> $(Get-Exe)"
}

# 界面检查：真的把窗口渲染出来。Qt 的 DLL 要先拷到 exe 旁边才能独立运行。
function Invoke-UiCheck {
    Invoke-Build
    $exe = Get-Exe
    & (Join-Path $qtBin 'windeployqt.exe') --release --no-translations $exe | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'windeployqt failed' }
    $shot = Join-Path $build 'ui-screenshot.png'
    if ($Headless) { $env:QT_QPA_PLATFORM = 'offscreen' }
    $env:QT_QUICK_BACKEND = 'software'
    & $exe --screenshot $shot
    if ($LASTEXITCODE -ne 0) { throw 'ui check failed' }
    if (-not (Test-Path $shot) -or (Get-Item $shot).Length -eq 0) {
        throw "界面截图未生成：$shot"
    }
    Write-Host "UI check passed -> $shot"
}

switch ($Task) {
    'build' { Invoke-Build }
    'test' { Invoke-UiCheck }
    'run' {
        Invoke-Build
        $exe = Get-Exe
        & (Join-Path $qtBin 'windeployqt.exe') --release --no-translations $exe | Out-Null
        & $exe
    }
    'clean' {
        if (Test-Path $build) { Remove-Item $build -Recurse -Force }
        Write-Host '已清理 build/'
    }
}
