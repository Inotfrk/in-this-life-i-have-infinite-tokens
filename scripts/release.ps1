# 把第二层 develop 自动推进到第一层 master（见 AGENTS.md 第 8 节）。
# Usage: powershell -ExecutionPolicy Bypass -File scripts\release.ps1 [-DryRun] [-SkipTests]
param(
    [switch]$DryRun,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$remote = 'gitee'
$devBranch = 'develop'
$relBranch = 'master'

# git 会把进度写到 stderr；直接调用时 PowerShell 会把它当成错误记录打印。
# 走 cmd.exe 包一层，把 stderr 合并进 stdout，只按退出码判断成败。
function Invoke-GitText {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $quoted = $GitArgs | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ } }
    $command = "git -C `"$root`" $($quoted -join ' ') 2>&1"
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        return (& $env:ComSpec /c $command | Out-String)
    }
    finally {
        $ErrorActionPreference = $previous
    }
}

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $output = Invoke-GitText @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') 失败：$($output.Trim())"
    }
    Write-Host $output.Trim()
}

$dirty = (Invoke-GitText status --porcelain).Trim()
if ($dirty) {
    throw '工作区有未提交改动；先提交或 stash（AGENTS.md 7.6）'
}

$startBranch = (Invoke-GitText rev-parse --abbrev-ref HEAD).Trim()
if ($startBranch -eq $relBranch -or $startBranch -eq $devBranch) {
    throw "当前在受保护分支 $startBranch 上；先切回第三层工作分支再发布（AGENTS.md 7.7）"
}

Invoke-Git fetch $remote --prune
try {
    Invoke-Git switch $devBranch
    Invoke-Git pull --ff-only $remote $devBranch

    if (-not $SkipTests) {
        $buildScript = Join-Path $PSScriptRoot 'build.ps1'
        & powershell -ExecutionPolicy Bypass -File $buildScript -Task test
        if ($LASTEXITCODE -ne 0) { throw '测试未通过，发布中止' }
    }

    $ahead = [int]((Invoke-GitText rev-list --count "$relBranch..$devBranch").Trim())
    if ($ahead -eq 0) {
        Write-Host "$devBranch 与 $relBranch 已一致，无需发布"
        return
    }

    $tag = "v$(Get-Date -Format 'yyyy.MM.dd-HHmm')"
    Write-Host "将把 $ahead 个提交从 $devBranch 推进到 $relBranch，标签 $tag"

    if ($DryRun) {
        Invoke-Git --no-pager log --oneline "$relBranch..$devBranch"
        Write-Host 'DryRun：未做任何合并与推送'
        return
    }

    Invoke-Git switch $relBranch
    Invoke-Git pull --ff-only $remote $relBranch
    Invoke-Git merge --no-ff $devBranch -m "release: 自动发布 $devBranch -> $relBranch ($tag)"
    Invoke-Git tag -a $tag -m "release $tag"
    Invoke-Git push $remote $relBranch
    Invoke-Git push $remote $tag

    # 合并提交只在 master 上，回合给 develop，否则下次比较会一直有偏移。
    Invoke-Git switch $devBranch
    Invoke-Git merge --ff-only $relBranch
    Invoke-Git push $remote $devBranch

    Write-Host "发布完成：$devBranch -> $relBranch，标签 $tag"
}
finally {
    $current = (Invoke-GitText rev-parse --abbrev-ref HEAD).Trim()
    if ($current -ne $startBranch) {
        $null = Invoke-GitText switch $startBranch
        Write-Host "已切回 $startBranch"
    }
}
