# 在 GitHub 仓库上创建/更新分支规则（Rulesets）。
# 规则目标见 AGENTS.md 第 2.1、2.5、7 节：
#   - master / develop：禁止直接推送，只允许 Pull Request 合并（AGENTS.md 2.5）
#   - <账号段>-*：只允许该账号段的主人推送、删除（AGENTS.md 2.1 归属规则）
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts\github-rulesets.ps1 [-DryRun]
# 令牌来源：环境变量 GH_TOKEN / GITHUB_TOKEN，否则取 git credential 里 github.com 的凭据。
# 重复执行是安全的：同名的规则会被更新，不会重复创建。

param(
    [switch]$DryRun,
    [string]$Owner = 'Inotfrk',
    [string]$Repo = 'in-this-life-i-have-infinite-tokens'
)

$ErrorActionPreference = 'Stop'

# 账号段 -> GitHub 用户名（与 .agents/branch-registry.md 的账号表保持一致）
$accounts = [ordered]@{
    'inotfrk'       = 'Inotfrk'
    'lihaoyuan114'  = 'lihaoyuan114'
    'shawnwu1086'   = 'Xiao-xiao10'
    'xiao-xiao10'   = 'Xiao-xiao10'
    'qwerty6543210' = 'qwerty6543210'
}

. "$PSScriptRoot\github-token.ps1"

$token = Get-GitHubToken
$headers = @{
    Authorization          = "Bearer $token"
    Accept                 = 'application/vnd.github+json'
    'User-Agent'           = 'in-this-life-i-have-infinite-tokens-rulesets'
    'X-GitHub-Api-Version' = '2022-11-28'
}
$api = "https://api.github.com/repos/$Owner/$Repo"

function Invoke-Api {
    param([string]$Method, [string]$Uri, $Body)
    $json = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
    if ($DryRun -and $Method -ne 'GET') {
        Write-Host "[DryRun] $Method $Uri"
        Write-Host $json
        return $null
    }
    $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
    if ($json) { $params.Body = $json; $params.ContentType = 'application/json; charset=utf-8' }
    try {
        return Invoke-RestMethod @params
    }
    catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $detail = if ($stream) { (New-Object IO.StreamReader($stream)).ReadToEnd() } else { $_.Exception.Message }
        throw "$Method $Uri 失败：$detail"
    }
}

# 仓库里登记过、但 GitHub 上尚不存在的账号返回 $null：跳过它的规则，其余照常创建。
function Get-UserId([string]$login) {
    try {
        $u = Invoke-Api GET "https://api.github.com/users/$login"
        if (-not $u) { return 1 }
        return [int]$u.id
    }
    catch {
        if ($_.Exception.Message -match '失败：\s*$|Not Found') { return $null }
        throw
    }
}

$prRule = @{
    type       = 'pull_request'
    parameters = @{
        required_approving_review_count              = 0
        dismiss_stale_reviews_on_push                = $false
        require_code_owner_review                    = $false
        require_last_push_approval                   = $false
        required_review_thread_resolution            = $false
        # Gitee 时期留下的提交可能没关联 GitHub 账号，默认 true 会额外要一次人工批准，卡住自动发布。
        require_extra_approval_for_unattributed_changes = $false
        allowed_merge_methods                        = @('merge', 'squash', 'rebase')
    }
}

# 第三层账号分支：只有本人能建、能推、能删
function New-OwnerRuleset([string]$prefix, [string]$login) {
    $id = Get-UserId $login
    if (-not $id) {
        Write-Warning "跳过 $prefix-*：GitHub 上没有 $login 这个账号（先邀请协作者，再重跑本脚本）"
        return $null
    }
    return @{
        name           = "$prefix-owner-only"
        target         = 'branch'
        enforcement    = 'active'
        conditions     = @{ ref_name = @{ include = @("refs/heads/$prefix-*"); exclude = @() } }
        bypass_actors  = @(@{ actor_id = $id; actor_type = 'User'; bypass_mode = 'always' })
        rules          = @(@{ type = 'creation' }, @{ type = 'update' }, @{ type = 'deletion' })
    }
}

$desired = @(
    @{
        name          = 'main-pr-only'
        target        = 'branch'
        enforcement   = 'active'
        conditions    = @{ ref_name = @{ include = @('refs/heads/master'); exclude = @() } }
        bypass_actors = @()
        rules         = @(@{ type = 'deletion' }, @{ type = 'non_fast_forward' }, $prRule)
    },
    @{
        name          = 'develop-pr-only'
        target        = 'branch'
        enforcement   = 'active'
        conditions    = @{ ref_name = @{ include = @('refs/heads/develop'); exclude = @() } }
        bypass_actors = @()
        rules         = @(@{ type = 'deletion' }, @{ type = 'non_fast_forward' }, $prRule)
    }
)
foreach ($kv in $accounts.GetEnumerator()) {
    $set = New-OwnerRuleset $kv.Key $kv.Value
    if ($set) { $desired += $set }
}

$existing = @{}
if (-not $DryRun) {
    foreach ($r in (Invoke-Api GET "$api/rulesets")) { $existing[$r.name] = $r.id }
}

foreach ($set in $desired) {
    if ($existing.ContainsKey($set.name)) {
        Invoke-Api PUT "$api/rulesets/$($existing[$set.name])" $set | Out-Null
        Write-Host "更新 $($set.name)"
    }
    else {
        Invoke-Api POST "$api/rulesets" $set | Out-Null
        Write-Host "创建 $($set.name)"
    }
}

Write-Host "规则已同步。查看：https://github.com/$Owner/$Repo/settings/rules"
