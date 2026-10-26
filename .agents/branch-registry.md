# 分支登记表

本文件是 [AGENTS.md](../AGENTS.md) 第 2 节的数据来源：agent 用**本地仓库路径**判断当前电脑，
未登记即为新电脑，自动创建本机基础分支并在此登记。

## 命名回顾

```
<账号段>-<电脑段>-<后缀>
hello-world-tai-Fairy-Main
```

- 账号段：`hello-world-tai`（= Gitee 账号名，也就是分支的**归属账号**）
- 电脑段：用**本地仓库路径**查下表的路径列得出，`hostname` 只在首次登记时用来生成它
- 后缀：用户自定义；本机基础分支固定为 `Main`

> **归属规则**：每个账号只能提交 / 推送自己账号段的分支。账号段为 `hello-world-tai` 时只能推
> `hello-world-tai-*`；将来加入的协作者用他们自己的账号名做前缀，互不覆盖。

## 账号与分支前缀（Gitee 仓库成员）

| 显示名 | Gitee 登录名（= 账号段 / 分支前缀） | 角色 | 允许推送的分支 |
| --- | --- | --- | --- |
| Hallo_world_Tai | `hello-world-tai` | 仓库拥有者 / 管理员 | `hello-world-tai-*` |
| QL_Leo | `lihaoyuan114` | 管理员 | `lihaoyuan114-*` |
| 吴泓霄 | `shawnwu1086` | 开发者 | `shawnwu1086-*` |
| QAqwANG | `QWERTY6543210` | 开发者 | `qwerty6543210-*` |

> 分支前缀取 **Gitee 登录名**（远端 URL 里出现的那个名字），不是显示名；一律小写。
> 这条规则已在 Gitee「保护分支设置」里落成 5 条规则（`master` 加 4 个 `<登录名>-*`）：
> 每个 `<登录名>-*` 规则只把该成员列为「可推送代码成员」，「可合并 Pull Request」留给仓库管理员。
> 新增协作者时，先在 Gitee 邀请成员，再补一条 `<他的登录名>-*` 保护规则，最后更新上表。

## 电脑（一机一分支）

| 本地仓库路径 | 账号段 | 电脑段 | 基础分支 | 登记日期 |
| --- | --- | --- | --- | --- |
| `D:\BaiduSyncdisk\comhello-world-taiin-this-life-i-have-infinite-tokens` | `hello-world-tai` | `Fairy` | `hello-world-tai-Fairy-Main` | 2026-10-22 |
| `/home/ql_leo/AIY_repo` | `hello-world-tai` | `FedoraChan` | `hello-world-tai-FedoraChan-Main` | 2026-10-22 |

> 新电脑第一次工作时，agent 用 `git rev-parse --show-toplevel` 的路径做**前缀匹配**（忽略大小写，最长匹配优先）；
> 未命中才追加一行并创建 `<账号段>-<电脑段>-Main`（从最新 `gitee/develop` 切出）。
> **路径是唯一判断依据**，路径已登记时即使 `hostname` 变了也沿用原电脑段，不改分支名。

## 子分支（父子关系）

| 分支 | 父分支 | 用途 | 状态 |
| --- | --- | --- | --- |
| `hello-world-tai-Fairy-Main` | `develop`（第二层） | 本机基础分支，集成该机器的所有工作 | 使用中 |
| `hello-world-tai-FedoraChan-Main` | `develop`（第二层） | 本机基础分支（`/home/ql_leo/AIY_repo`，hostname `FedoraChan`） | 使用中 |
| `hello-world-tai-Fairy-packaging` | `hello-world-tai-Fairy-Main` | 打包链路：Win exe/msi + mac dmg、CI 配置 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-sync` | `hello-world-tai-Fairy-Main` | 同步仓库并修订 AGENTS.md 规则冲突 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-docs-cpp` | `hello-world-tai-Fairy-Main` | README 主描述改为 C++17 单文件计算器、补充仓库用法说明 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-flow` | `hello-world-tai-Fairy-Main` | 三层上传流：AGENTS.md 2.5/7/8、scripts/release、Gitee Go 自动发布 | 已合并回父分支（本地分支已删除） |
| `hello-world-tai-Fairy-rules` | `hello-world-tai-Fairy-Main` | 分支归属规则：账号段 = 分支主人，只能推自己的分支，冲突提 OA，路径识别电脑 | 使用中 |

> 两层主线：`master`（第一层，线上发布版本）← `develop`（第二层，开发主线）← 各机器 `-Main`（第三层）。
> 子分支完成后合并回本机 `-Main`，再由 `-Main` 合进 `develop`，最后自动推进 `master`。
