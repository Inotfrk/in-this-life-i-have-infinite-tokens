# 账号与分支前缀

本文件是 [AGENTS.md](../AGENTS.md) 第 2.1.1 节的数据来源：账号段取 **GitHub 用户名**
（远端 URL 里出现的那个名字，不是显示名），写进分支名时一律小写。

## 账号表

| 显示名 | GitHub 账号 | 账号段（分支前缀） | 角色 | 允许推送的分支 |
| --- | --- | --- | --- | --- |
| AiHoshino（Hallo_world_Tai） | `Inotfrk` | `inotfrk` | 仓库拥有者 | `inotfrk-*` |
| QL_Leo | `lihaoyuan114` | `lihaoyuan114` | 管理员 | `lihaoyuan114-*` |
| 吴泓霄 | `Xiao-xiao10` | `shawnwu1086`、`xiao-xiao10` | 开发者 | `shawnwu1086-*`、`xiao-xiao10-*` |
| QAqwANG | 未注册 | `qwerty6543210` | 开发者 | 待 GitHub 账号建好并受邀后再加规则 |

> 2026-10-27 已在 GitHub 上落地分支规则（见 [AGENTS.md](../AGENTS.md) 2.5.1）：
> `master`、`develop` 只能通过 PR 合并；每个已存在的账号段各有一条 `<前缀>-owner-only` 规则，
> 只有本人能建/推/删该前缀的分支。规则来源是 [scripts/github-rulesets.ps1](../scripts/github-rulesets.ps1)。
>
> 注意：`Xiao-xiao10` 一个人挂两个前缀——`shawnwu1086` 是迁到 GitHub 之前就存在的历史分支前缀
> （已有 `shawnwu1086-MacBookAir3-Main`），`xiao-xiao10` 是他的 GitHub 用户名。两条规则都只授权给他本人。
> `qwerty6543210` 在 GitHub 上还没有这个账号，脚本会跳过并给出警告，账号建好再重跑即可。

> 仓库已于 2026-10-27 整体迁到 GitHub（`Inotfrk/in-this-life-i-have-infinite-tokens`），
> 远端名统一为 `origin`。账号段一律取 **GitHub 用户名小写**，与 Gitee 时期的写法无关。
>
> 2026-10-27 已把 Gitee 时期的 `hello-world-tai-*` 分支统一改名为 `inotfrk-*`：
> `hello-world-tai-Fairy-Main` → `inotfrk-Fairy-Main`、`-runner` → `inotfrk-Fairy-runner`、
> `-docs-cpp` → `inotfrk-Fairy-docs-cpp`、`-packaging` → `inotfrk-Fairy-packaging`，
> 旧名已从远端删除。仓库内的文档、Workflow 触发器与代办清单已同步为新前缀，
> 只有 NOTE.md 的追加记录保留旧名（该文件只追加不改写）。

## 新成员接入

1. 在 GitHub 仓库「Settings → Collaborators」邀请协作者，记下他的 **GitHub 用户名**。
2. 「Settings → Rules → Rulesets」（或 Branches）里新建一条 `<用户名>-*` 规则。
3. 在上表补一行（前缀 = GitHub 用户名小写）。

**没有对应保护规则的前缀不许新建分支。** 账号表里的每个前缀都要有一条
`<前缀>-owner-only` 规则；新成员进来后重跑一次 [scripts/github-rulesets.ps1](scripts/github-rulesets.ps1)
就能补上他的规则。

## 电脑段不在这里登记

分支名里的第二段（电脑段）只用来区分「同一个人用的不同机器」，取本机 `hostname` 规范化即可，
不需要登记、不需要审批，换机器就换一段。判断一个分支归谁，只看**第一段账号段**。
