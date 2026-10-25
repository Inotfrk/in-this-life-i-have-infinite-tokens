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
2. 从最新 `develop` 创建基础分支：`git fetch gitee && git switch -c <账号段>-<电脑段>-Main gitee/develop`。
3. `git push -u gitee <账号段>-<电脑段>-Main`。
4. 把这次登记 commit 到新分支上。

### 2.4 父子关系与多分支

- 子分支**必须**从本机的 `-Main` 切出，并在 `.agents/branch-registry.md` 的「子分支」表里登记父分支、用途、状态。
- 子分支完成后合并回本机 `-Main`，再由 `-Main` 按 2.5 的流向进入 `develop`。
- 禁止跨电脑共享分支名；不同电脑只通过第二层 `develop` 汇合，最终由 `develop` 进入 `master`。

### 2.5 三层上传流（这是硬性要求）

仓库只有三个层次。任何改动都按 **第三层 → 第二层 → 第一层** 向上流动，
禁止越层（第三层直接进 `master`）、禁止反向（主线倒推回个人分支）。

| 层次 | 分支 | 是什么 | 谁能写入 |
| --- | --- | --- | --- |
| 第一层 | `master` | **线上发布版本**，只能处于可发布状态 | 只接受第二层的自动合并 |
| 第二层 | `develop` | **开发主线**，所有开发者汇聚在这里 | 只接受第三层合并（PR 或 fast-forward） |
| 第三层 | `<账号段>-<电脑段>-<后缀>` | **开发者自己的分支**，`-Main` 是本人基础分支 | 本人，随时 push |

推进动作，一步都不能跳：

| # | 时机 | 动作 |
| --- | --- | --- |
| 1 | 每轮迭代（一次改动 / 一次答复）完成并通过验证 | commit 并 push 到**第三层当前分支**：`git push gitee HEAD` |
| 2 | 一个子分支做完、测试全绿 | 合并回本机 `-Main` 并 push：`git switch <账号段>-<电脑段>-Main && git merge --no-ff <子分支> && git push gitee HEAD` |
| 3 | 本机 `-Main` 攒够一批改动、测试全绿 | 合并进**第二层** `develop` 并 push：`git switch develop && git pull --ff-only gitee develop && git merge --no-ff <账号段>-<电脑段>-Main && git push gitee develop` |
| 4 | `develop` 收到新提交 | **自动**推进到**第一层** `master`：本机跑 `scripts/release`，或由 `.workflow/release.yml` 在 Gitee Go 上合并（见第 7 节） |
| 5 | 推送冲突 / 被拒绝 | 先 `git fetch gitee` 再看差异；**不许 force push**，冲突解决不了就保留现场并报告 |

- 第三层分支**允许多个、允许随时 push**，它本来就是「开发者自己那堆东西」，不进主线也不会影响别人。
- 第二层与第一层不接受第三层的直接推送；`master` 更不接受任何直接推送。
- 以上 push 属于用户预先授权，不需要逐次确认；`--force`、删除远端分支、改写历史仍然需要先问。

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

## 6. 共享信息

Agents可以在 [NOTE.md](NOTE.md)中以 `<ISO8601时间戳>[<分支名>]文本信息` 的格式与其他Agent交流，该文件只能追加，不能删除或插入。
- 示例：`<2026-10-22T22:21:23+08:00>[hello-world-tai-FedoraChan-Main]测试消息`

## 7. Git 分支与提交规范

第 2.5 节的三层流是唯一通道，本节给出它对应的强制约束：

1. **第一层 `master`**：禁止任何直接提交或直接推送，只接受来自 `develop` 的自动合并（见第 8 节）。
2. **第二层 `develop`**：禁止直接提交；只接受第三层 `-Main` 的合并，合并方式为 PR 或已在本地验证过的 fast-forward。
3. **第三层 `<账号段>-<电脑段>-<后缀>`**：唯一可自由提交、自由推送的层次；每项独立任务都在专用子分支上完成
   （如 `hello-world-tai-Fairy-ui`、`hello-world-tai-Fairy-fix`），完成后合并回本人 `-Main`。
4. 完成修改后，先在当前工作分支执行代码检查、测试和 Git commit；测试不通过不得进入上一层。
5. 禁止为了省事而绕过 PR、分支保护、CI 检查或既定的合并流程；禁止 `--force` 推送。
6. 执行任何 Git 写操作前，必须检查当前分支、工作区状态及目标分支，避免将无关改动一起提交。
7. 如果当前位于 `master` 或 `develop`，应先切回第三层工作分支，再进行修改和提交。
8. 遇到规则冲突或无法安全执行的情况，应停止并说明原因，不得擅自绕过规则。

## 8. 自动发布（develop → master）

`develop` 每收到一次通过测试的提交，就要自动推进到 `master`，保证第一层始终等于「最新可发布状态」。

- **本机**：`powershell -ExecutionPolicy Bypass -File scripts\release.ps1`（macOS / Linux：`scripts/release.sh`）。
  脚本依次执行：切到 `develop` 并 `pull --ff-only` → 跑测试 → `--no-ff` 合并进 `master` → push 两个分支
  → 给 `master` 打 `v<日期>` 标签。任何一步失败即中止，不留半成品。
- **远端**：`.workflow/release.yml`（Gitee Go）在 `develop` 推送后跑测试并 `--no-ff` 合并 `master`。
  Gitee Go 需在仓库里手动「一键开启」；未开启时以本机脚本为准。
- 自动推进只做 fast-forward / `--no-ff` 合并，**禁止强推**；冲突时停下来报告，由人决定。
- 发布完成后把 `master` 的合并提交快速回合到 `develop`（`git switch develop && git merge --ff-only master`），
  否则每次 `--no-ff` 都会在两层之间留下永久偏移。
