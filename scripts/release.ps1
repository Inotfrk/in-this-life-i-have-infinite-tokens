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

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    & git -C $root @GitArgs
    if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') failed" }
}

function Invoke-GitQuiet {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    & git -C $root @GitArgs 2>&1 | Out-Null
    return $LASTEXITCODE -eq 0
}

$startBranch = (& git -C $root rev-parse --abbrev-ref HEAD).Trim()
if ($startBranch -eq $relBranch -or $startBranch -eq $devBranch) {
    throw "当前在受保护分支 $startBranch 上；先切回第三层工作分支再发布（AGENTS.md 7.7）"
}

if (-not (Invoke-GitQuiet status --porcelain)) {
    throw '工作区有未提交改动；先提交或 stash（AGENTS.md 7.6）'
}

$null = Invoke-Git fetch $remote --prune
try {
    Invoke-Git switch $devBranch
    Invoke-Git pull --ff-only $remote $devBranch

    if (-not $SkipTests) {
        $buildScript = Join-Path $PSScriptRoot 'build.ps1'
        & powershell -ExecutionPolicy Bypass -File $buildScript -Task test
        if ($LASTEXITCODE -ne 0) { throw '测试未通过，发布中止' }
    }

    $behind = [int]((& git -C $root rev-list --count "$relBranch..$devBranch").Trim())
    if ($behind -eq 0) {
        Write-Host "$devBranch 与 $relBranch 已一致，无需发布"
        return
    }

    $tag = "v$(Get-Date -Format 'yyyy.MM.dd-HHmm')"
    Write-Host "将把 $behind 个提交从 $devBranch 推进到 $relBranch，标签 $tag"

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

    Write-Host "发布完成：$devBranch -> $relBranch，标签 $tag"
}
finally {
    $current = (& git -C $root rev-parse --abbrev-ref HEAD).Trim()
    if ($current -ne $startBranch -and $current -ne $relBranch) {
        & git -C $root switch $startBranch 2>&1 | Out-Null
    }
}
