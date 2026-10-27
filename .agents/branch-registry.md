# 账号与分支前缀

本文件是 [AGENTS.md](../AGENTS.md) 第 2.1.1 节的数据来源：账号段取 **GitHub 用户名**
（远端 URL 里出现的那个名字，不是显示名），写进分支名时一律小写。

## 账号表

| 显示名 | GitHub 账号 | 账号段（分支前缀） | 角色 | 允许推送的分支 |
| --- | --- | --- | --- | --- |
| Hallo_world_Tai | `Inotfrk` | `hello-world-tai` | 仓库拥有者 | `hello-world-tai-*` |
| QL_Leo | 待登记 | `lihaoyuan114` | 管理员 | `lihaoyuan114-*` |
| 吴泓霄 | 待登记 | `shawnwu1086` | 开发者 | `shawnwu1086-*` |
| QAqwANG | 待登记 | `qwerty6543210` | 开发者 | `qwerty6543210-*` |

> 仓库已于 2026-10-27 整体迁到 GitHub（`Inotfrk/in-this-life-i-have-infinite-tokens`），
> 远端名统一为 `origin`。上表的前缀沿用 Gitee 时期的写法，**历史分支不改名**；
> 新成员的账号段取 **GitHub 用户名小写**，与 Gitee 时期无关。

## 新成员接入

1. 在 GitHub 仓库「Settings → Collaborators」邀请协作者，记下他的 **GitHub 用户名**。
2. 「Settings → Rules → Rulesets」（或 Branches）里新建一条 `<用户名>-*` 规则。
3. 在上表补一行（前缀 = GitHub 用户名小写）。

**没有对应保护规则的前缀不许新建分支。**

## 电脑段不在这里登记

分支名里的第二段（电脑段）只用来区分「同一个人用的不同机器」，取本机 `hostname` 规范化即可，
不需要登记、不需要审批，换机器就换一段。判断一个分支归谁，只看**第一段账号段**。
