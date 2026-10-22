# AGENTS.md — 本仓库的 Agent 规则

本文件每次对话都会自动加载。所有 agent（VS Code Copilot、命令行 agent、夜间批处理 agent）都必须遵守。

---

## 1. 权限边界

| 范围 | 是否先询问 | 说明 |
| --- | --- | --- |
| agent 所在平台的配置文件 | **否** | 例如 VS Code 的 `.vscode/`、Copilot 的 instruction / MCP / settings 文件、平台的配置目录，可直接读取与修改 |
| 本仓库内的所有文件 | **否** | 读取、搜索、构建、测试、新增、修改、删除、移动、改名都无需询问 |
| 仓库以外的文件 | **是** | 仓库外的任何文件，改动前必须先取得用户同意；只读查看也优先说明意图 |
| 不可逆 / 影响面大的操作 | **是** | `git push --force`、删除远端分支、改写提交历史、发布安装包、修改远端仓库设置 |
| 安装依赖、访问网络、对外发送代码 | **是** | 不得把仓库内容或凭据发送给任何第三方 |

一句话：**平台配置和本仓库内免询问；仓库外的改动、破坏性操作先问。**

---

## 2. 分支规则与上传时机

### 2.1 命名格式

```
<账号段>-<电脑段>-<后缀>
```

| 段 | 规则 |
| --- | --- |
| 账号段（第 1 段） | 固定取 Gitee 账号名，全小写，与远端 URL 一致。本仓库为 `hello-world-tai` |
| 电脑段（第 2 段） | 取本机 `hostname`，去掉空格与非法字符，保留大小写。当前电脑为 `Fairy` |
| 后缀（第 3 段） | **用户可以自定义**，只用字母、数字、连字符，例如 `Main`、`ui`、`test`、`docs` |

- 前两段必须严格遵守上面的规则，不得自己发明。
- 每台电脑的**基础分支**后缀固定为 `Main`：`hello-world-tai-Fairy-Main`。
- 同一台电脑上的其它分支都是基础分支的子分支：`hello-world-tai-Fairy-ui`、`hello-world-tai-Fairy-test`。

### 2.2 用本地仓库路径识别电脑

1. 用 `git rev-parse --show-toplevel` 取本仓库的绝对路径。
2. 读取 `.agents/branch-registry.md`，用它登记的各电脑仓库路径做**前缀匹配**（Windows 下忽略大小写，最长匹配优先）。
3. 命中 → 使用该行登记的电脑段与基础分支。
4. **没有命中 → 视为新电脑**，自动登记并创建基础分支（见 2.3）。

路径是判断依据，不要用 `hostname` 之外的临时手段猜电脑；`hostname` 只用于生成电脑段，不用于判断是否已登记。

### 2.3 新电脑的处理

1. 在 `.agents/branch-registry.md` 追加一行：本地仓库路径、账号段、电脑段、基础分支。
2. 从最新 `master` 创建基础分支：`git switch -c <账号段>-<电脑段>-Main gitee/master`。
3. `git push -u gitee <账号段>-<电脑段>-Main`。
4. 把这次登记 commit 到新分支上。

### 2.4 父子关系与多分支

- 子分支**必须**从本机的 `-Main` 切出，并在 `.agents/branch-registry.md` 的「子分支」表里登记父分支、用途、状态。
- 子分支完成后合并回本机 `-Main`，再按 2.5 决定是否进 `master`。
- 禁止跨电脑共享分支名；不同电脑只通过 `master` 汇合。

### 2.5 上传时机（这是硬性要求）

| 时机 | 动作 |
| --- | --- |
| 每次迭代（一轮改动 / 一次答复带来的修改）完成并通过验证后 | commit 并 **push 到本机当前分支**（`git push gitee HEAD`） |
| 一个小功能完成、测试全绿后 | 合并到 `master` 并 **push `master`**（`git switch master && git merge --no-ff <分支> && git push gitee master`） |
| 推送冲突 / 被拒绝 | 先 `git fetch gitee` 再看差异；**不许 force push**，冲突解决不了就保留现场并报告 |

以上 push 属于用户预先授权，不需要逐次确认；`--force`、删除远端分支、改写历史仍然需要先问。

---

## 3. 待完成任务队列（TODO.md）

- [TODO.md](TODO.md) 是本仓库**唯一的待完成清单**。
- 规划阶段：agent 把计划拆成小任务写进队列，写清目标分支、优先级、依赖、涉及文件、验收命令。
- 高峰期 / 夜间：由读取 `TODO.md` 的 agent 按协议领取并完成 `queued` 任务，逐个提交、逐个 push。
- 状态只有四种：`queued`、`in-progress`、`done`、`blocked`。
- 领取任务时先单独提交一次状态变更，避免多个 agent 抢同一个任务。
- 不擅自扩大任务范围；需求不清就标 `blocked` 并写清需要什么决策。
- 队列为空时不做任何改动，直接结束。

---

## 4. 验证

改代码前后都要跑对应平台的测试，不通过不得 commit / push：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Task test   # Windows
```

```bash
scripts/build.sh test                                                   # macOS / Linux
```

只改文档时不需要构建，但要检查 Markdown 链接与命令示例是否仍然正确。

---

## 5. 提交信息

- 格式：`<type>: <一句话说明>`，`type` 取 `feat` / `fix` / `docs` / `chore` / `refactor` / `test`。
- 正文用中文说明「改了什么、为什么改」，涉及任务时附上 `TODO.md` 的任务 ID。
- 结尾保留 `Co-authored-by` trailer。
