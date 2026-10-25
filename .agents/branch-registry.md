# 分支登记表

本文件是 [AGENTS.md](../AGENTS.md) 第 2 节的数据来源：agent 用**本地仓库路径**判断当前电脑，
未登记即为新电脑，自动创建本机基础分支并在此登记。

## 命名回顾

```
<账号段>-<电脑段>-<后缀>
hello-world-tai-this-...  ← 账号段：Gitee 账号名，固定
```

- 账号段：`hello-world-tai`
- 电脑段：本机 `hostname`
- 后缀：用户自定义；本机基础分支固定为 `Main`

## 电脑（一机一分支）

| 本地仓库路径 | 账号段 | 电脑段 | 基础分支 | 登记日期 |
| --- | --- | --- | --- | --- |
| `D:\BaiduSyncdisk\comhello-world-taiin-this-life-i-have-infinite-tokens` | `hello-world-tai` | `Fairy` | `hello-world-tai-Fairy-Main` | 2026-10-22 |
| `/home/ql_leo/AIY_repo` | `hello-world-tai` | `FedoraChan` | `hello-world-tai-FedoraChan-Main` | 2026-10-22 |

> 新电脑第一次工作时，agent 追加一行并创建 `<账号段>-<电脑段>-Main`（从最新 `gitee/master` 切出）。

## 子分支（父子关系）

| 分支 | 父分支 | 用途 | 状态 |
| --- | --- | --- | --- |
| `hello-world-tai-Fairy-Main` | `master`（远端） | 本机基础分支，集成该机器的所有工作 | 使用中 |
| `hello-world-tai-Fairy-packaging` | `hello-world-tai-Fairy-Main` | 打包链路：Win exe/msi + mac dmg、CI 配置 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-sync` | `hello-world-tai-Fairy-Main` | 同步仓库并修订 AGENTS.md 规则冲突 | 使用中 |
| `hello-world-tai-FedoraChan-Main` | `master`（远端） | 本机基础分支（`/home/ql_leo/AIY_repo`，hostname `FedoraChan`） | 使用中 |

> 子分支示例：`hello-world-tai-Fairy-text` 的父分支为 `hello-world-tai-Fairy-Main`。
> 子分支完成后合并回父分支，再由父分支决定是否进入 `master`。
