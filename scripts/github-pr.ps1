# 只在本地 release 脚本里用：通过 GitHub REST API 开 PR 并合并，避免依赖 gh CLI。
# master / develop 都设了「只接受 Pull Request」的规则（scripts/github-rulesets.ps1），
# 所以发布不能直接 git push 主线。
. "$PSScriptRoot\github-token.ps1"

function Get-GitHubHeaders {
    return @{
        Authorization          = "Bearer $(Get-GitHubToken)"
        Accept                 = 'application/vnd.github+json'
        'User-Agent'           = 'in-this-life-i-have-infinite-tokens-release'
        'X-GitHub-Api-Version' = '2022-11-28'
    }
}

function Invoke-ReleaseApi {
    param([string]$Method, [string]$Uri, $Body)
    $params = @{ Method = $Method; Uri = $Uri; Headers = (Get-GitHubHeaders) }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
        $params.ContentType = 'application/json; charset=utf-8'
    }
    try {
        return Invoke-RestMethod @params
    }
    catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $detail = if ($stream) { (New-Object IO.StreamReader($stream)).ReadToEnd() } else { $_.Exception.Message }
        throw "$Method $Uri 失败：$detail"
    }
}

# 开一个 head -> base 的 PR 并立即合并，然后删掉 head 分支。返回 PR 编号。
function Merge-ReleasePullRequest {
    param(
        [string]$Owner, [string]$Repo, [string]$Head, [string]$Base,
        [string]$Title, [string]$BodyText
    )
    $api = "https://api.github.com/repos/$Owner/$Repo"
    $pr = Invoke-ReleaseApi POST "$api/pulls" @{ head = $Head; base = $Base; title = $Title; body = $BodyText }
    Invoke-ReleaseApi PUT "$api/pulls/$($pr.number)/merge" @{ merge_method = 'merge' } | Out-Null
    try { Invoke-ReleaseApi DELETE "$api/git/refs/heads/$Head" $null | Out-Null } catch { }
    return $pr.number
}
