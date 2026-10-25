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
| `hello-world-tai-Fairy-Main` | `develop`（第二层） | 本机基础分支，集成该机器的所有工作 | 使用中 |
| `hello-world-tai-FedoraChan-Main` | `develop`（第二层） | 本机基础分支（`/home/ql_leo/AIY_repo`，hostname `FedoraChan`） | 使用中 |
| `hello-world-tai-Fairy-packaging` | `hello-world-tai-Fairy-Main` | 打包链路：Win exe/msi + mac dmg、CI 配置 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-sync` | `hello-world-tai-Fairy-Main` | 同步仓库并修订 AGENTS.md 规则冲突 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-docs-cpp` | `hello-world-tai-Fairy-Main` | README 主描述改为 C++17 单文件计算器、补充仓库用法说明 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-flow` | `hello-world-tai-Fairy-Main` | 三层上传流：AGENTS.md 2.5/7/8、scripts/release、Gitee Go 自动发布 | 已合并回父分支（本地分支已删除） |

> 两层主线：`master`（第一层，线上发布版本）← `develop`（第二层，开发主线）← 各机器 `-Main`（第三层）。
> 子分支完成后合并回本机 `-Main`，再由 `-Main` 合进 `develop`，最后自动推进 `master`。
