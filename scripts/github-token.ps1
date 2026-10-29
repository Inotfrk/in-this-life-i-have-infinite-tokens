# 共用的 GitHub 令牌读取：优先环境变量，其次 git 已保存的 github.com 凭据。
function Get-GitHubToken {
    if ($env:GH_TOKEN) { return $env:GH_TOKEN }
    if ($env:GITHUB_TOKEN) { return $env:GITHUB_TOKEN }
    $cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
    $line = $cred | Select-String '^password='
    if (-not $line) { throw '找不到 GitHub 令牌：设置 GH_TOKEN，或先让 git 记住 github.com 的凭据' }
    return $line.Line.Substring(9)
}
