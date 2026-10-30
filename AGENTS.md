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
| 账号段（第 1 段） | 固定取 **GitHub 用户名**（远端 URL 里出现的那个名字，不是显示名），一律小写。**这一段同时是分支的归属标记** |
| 电脑段（第 2 段） | 取本机 `hostname` 并规范化：去掉空格、`.`、`_` 等非字母数字字符，保留大小写，例如 `studio mac` → `studiomac` |
| 后缀（第 3 段） | **用户可以自定义**，只用字母、数字、连字符，例如 `Main`、`ui`、`test`、`docs` |

- 前两段必须严格遵守上面的规则，不得自己发明。
- 每台电脑的**基础分支**后缀固定为 `Main`：`<账号段>-<电脑段>-Main`。
- **账号段一律小写**：即使 GitHub 用户名为大写（如 `QWERTY6543210`），分支前缀也写成小写的
  `qwerty6543210-*`，全仓库只保留这一种写法。
- 同一台电脑上的其它分支都是基础分支的子分支：`<账号段>-<电脑段>-ui`、`<账号段>-<电脑段>-test`。
- **归属规则**：分支归它的账号段所有。每个账号**只能推送 `<自己的账号段>-*` 的分支**，
  不得推送、改写、删除别人的分支；需要动别人的分支时只能发起合并请求，由对方账号处理。

电脑段只用来区分「同一个人用的不同机器」，不参与权限判断；换机器就换一段，
不需要任何人登记或审批。

### 2.1.1 账号段取值

账号段取 **GitHub 用户名**（远端 URL 里出现的那个名字，一律小写），不是个人资料里的显示名。
当前成员与对应前缀的唯一清单在 [.agents/branch-registry.md](.agents/branch-registry.md) 的「账号表」。

新成员进来时按顺序做三件事：① 在 GitHub 仓库「Settings → Collaborators」邀请成员；
② 在「Settings → Rules → Rulesets」（或 Branches 保护规则）里补一条 `<用户名>-*` 规则；
③ 更新 [.agents/branch-registry.md](.agents/branch-registry.md) 的账号表。**没有对应保护规则的前缀不许新建分支。**

### 2.2 电脑段怎么取

1. 跑 `hostname`（或 `git config --get user.hostname`），拿到本机主机名。
2. 去掉空格与非法字符，保留大小写。
3. 直接拼进分支名，**不需要登记、不需要查表**；判断当前分支属不属于自己只看账号段。

### 2.3 第一次在某台电脑上工作

1. `git fetch origin && git switch -c <账号段>-<电脑段>-Main origin/develop`（从最新 `develop` 切出）。
2. `git push -u origin <账号段>-<电脑段>-Main`。
3. 之后按 2.4 切子分支。

### 2.4 父子关系与多分支

- 子分支**必须**从所属机器的 `-Main` 切出，命名仍用 `<账号段>-<电脑段>-<后缀>`。
- 子分支完成后合并回 `-Main`，再由 `-Main` 按 2.5 的流向进入 `develop`。
- 禁止跨账号、跨电脑共享分支名；不同人只通过第二层 `develop` 汇合，最终由 `develop` 进入 `master`。

### 2.5 三层上传流（这是硬性要求）

仓库只有三个层次。任何改动都按 **第三层 → 第二层 → 第一层** 向上流动，
禁止越层（第三层直接进 `master`）、禁止反向（主线倒推回个人分支）。

| 层次 | 分支 | 是什么 | 谁能写入 |
| --- | --- | --- | --- |
| 第一层 | `master` | **线上发布版本**，只能处于可发布状态 | 只接受来自 `develop` 的 **Pull Request** |
| 第二层 | `develop` | **开发主线**，所有开发者汇聚在这里 | 只接受来自第三层 `-Main` 的 **Pull Request** |
| 第三层 | `<账号段>-<电脑段>-<后缀>` | **账号自己的分支**，`-Main` 是该账号在该机器上的集成分支 | 只有该账号段的主人，且只能推自己账号段的分支 |

推进动作，一步都不能跳：

| # | 时机 | 动作 |
| --- | --- | --- |
| 1 | 每轮迭代（一次改动 / 一次答复）完成并通过验证 | commit 并 push 到**第三层当前分支**：`git push origin HEAD` |
| 2 | 一个子分支做完、测试全绿 | 合并回 `-Main` 并 push：`git switch <账号段>-<电脑段>-Main && git merge --no-ff <子分支> && git push origin HEAD` |
| 3 | `-Main` 攒够一批改动、测试全绿 | **开 PR** 合并进**第二层** `develop`（不能直推，见 2.5.2） |
| 4 | `develop` 收到新提交 | **自动**推进到**第一层** `master`：本地跑 `scripts/release`，或由 `.github/workflows/release.yml` 开 PR 合并（见第 8 节） |
| 5 | 推送冲突 / 被拒绝 | 先 `git fetch origin` 再看差异；**不许 force push**，冲突解决不了就保留现场并报告 |

#### 冲突处理（硬性）

出现冲突时**不要自行强推，也不要反复重试**，按下面做：

1. `git status` / `git diff` 说明冲突文件与冲突双方。
2. 判断冲突来自「自己账号段的两个分支」→ 可以在本地正常解冲突后继续。
3. 判断冲突来自「别人的账号段」或「`develop` / `master` 已有他人提交」→ **停下来告诉用户去提 OA**，
   由人工决定谁先合并；agent 只保留现场，不做 `--force`、不 `reset --hard`、不强行改主线。

- 第三层分支**允许多个、允许随时 push**，它本来就是「账号自己那堆东西」，不进主线也不会影响别人。
- 每个账号**只能推送 `<自己的账号段>-*` 分支**；`develop` / `master` 只能通过 Pull Request 合并。
- 第二层与第一层不接受任何直接推送；`master` 更不接受第三层直接发起的 PR（必须先经 `develop`）。
- 以上 push 属于用户预先授权，不需要逐次确认；`--force`、删除远端分支、改写历史仍然需要先问。

#### 2.5.1 远端强制（已在 GitHub 配置，不是口头约定）

GitHub 侧已经把这些规则落成机器的检查，agent 只读不绕。配置文件是
[scripts/github-rulesets.ps1](scripts/github-rulesets.ps1)，改规则时改脚本再跑一次，不要只在网页上点：

| 规则名 | 目标分支 | 规则 | 效果 |
| --- | --- | --- | --- |
| `main-pr-only` | `master` | `pull_request` + `non_fast_forward` + `deletion` | 只能通过 PR 合并；禁止强推、禁止删除 |
| `develop-pr-only` | `develop` | `pull_request` + `non_fast_forward` + `deletion` | 只能通过 PR 合并；禁止强推、禁止删除 |
| `no-unowned-branches` | 除以下之外的所有分支 | `creation` | 只能新建 `master`、`develop`、`release/*`、`<账号段>-*` 这几种名字，杜绝乱命名 |
| `<账号段>-owner-only` | `<账号段>-*` | `creation` + `update` + `deletion` | 只有该账号段本人能建、能推、能删这条前缀的分支 |

PR 规则设的是 `required_approving_review_count = 0`：**不需要人工批准**，但必须走 PR 这个入口，
所以合并记录、CI 结果都留在 PR 页面上；`require_extra_approval_for_unattributed_changes` 关掉了，
避免 Gitee 时期没关联 GitHub 账号的老提交把自动发布卡住。

被拒时的典型报错与处理：

```
remote: error: GH013: Repository rule violations found for refs/heads/master.
remote: - Changes must be made through a pull request.
! [remote rejected] ... (push declined due to repository rule violations)
```

```
remote: error: GH013: Repository rule violations found for refs/heads/lihaoyuan114-xxx.
remote: - Cannot create ref due to creations being restricted.
```

1. 先确认分支前缀是不是自己的账号段；不是就别推，改推自己的分支或开 PR。
2. 主线被拒是正常的：`develop` / `master` 只能开 PR，见 2.5.2。
3. 改不动就**停下来，告诉用户去提 OA**，不要尝试 force push、改名绕过或删除规则。

#### 2.5.2 怎么开 PR（组员只需记这一条）

在 GitHub 网页上：打开仓库 → **Pull requests** → **New pull request** →
`base` 选 `develop`、`compare` 选自己的 `<账号段>-<电脑段>-Main` → **Create pull request** → **Merge pull request**。

本地命令等价于（`gh` 未安装时用网页）：

```bash
gh pr create --base develop --head <账号段>-<电脑段>-Main
gh pr merge --merge
```

> 仓库是 **public**，所以 Rulesets 在免费计划下可用。若将来改回 private（免费计划）
> 规则会被平台禁用，届时靠「只有拥有者能推 + 账号前缀约定」兜底，agent 不许因此绕开 2.1 的归属约束。

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

**默认在 Docker 沙箱里跑**，不在宿主机装 JDK；容器里 `UiTest` 靠 `xvfb` 提供虚拟显示，
不会因为无图形环境被跳过。用长驻容器 runner，每次运行都会留档，失败可以回溯现场。
用法见 [docs/docker-sandbox.md](docs/docker-sandbox.md)：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 build   # 首次或基础镜像更新后
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 test    # 跑测试，留档到 .sandbox-runs/
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 runs    # 回溯历史运行
```

```bash
scripts/sandbox.sh build && scripts/sandbox.sh test    # macOS / Linux
```

没有 Docker 或需要原生路径时，退回宿主机脚本（输出应与沙箱一致）：

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
- 示例：`<2026-10-22T22:21:23+08:00>[<账号段>-<电脑段>-Main]测试消息`

## 7. Git 分支与提交规范

第 2.5 节的三层流是唯一通道，本节给出它对应的强制约束：

1. **第一层 `master`**：禁止任何直接提交或直接推送，只接受来自 `develop` 的 Pull Request 合并（见第 8 节）。
2. **第二层 `develop`**：禁止直接提交；只接受第三层 `-Main` 的 Pull Request 合并。
3. **第三层 `<账号段>-<电脑段>-<后缀>`**：唯一可自由提交、自由推送的层次；每项独立任务都在专用子分支上完成
   （如 `<账号段>-<电脑段>-ui`、`<账号段>-<电脑段>-fix`），完成后合并回该机器的 `-Main`。
   **每个账号只能推送自己账号段的分支**：`inotfrk` 只能动 `inotfrk-*`，
   其他账号只能动 `<他们自己的账号段>-*`。
4. 完成修改后，先在当前工作分支执行代码检查、测试和 Git commit；测试不通过不得进入上一层。
5. 禁止为了省事而绕过 PR、分支保护、CI 检查或既定的合并流程；禁止 `--force` 推送。
6. 执行任何 Git 写操作前，必须检查当前分支、工作区状态及目标分支，避免将无关改动一起提交。
7. 如果当前位于 `master` 或 `develop`，应先切回第三层工作分支，再进行修改和提交。
8. 遇到规则冲突或无法安全执行的情况，应停止并说明原因，不得擅自绕过规则；**跨账号、跨主线的冲突一律提示用户去提 OA**。

## 8. 自动发布（develop → master）

`develop` 每收到一次通过测试的提交，就要自动推进到 `master`，保证第一层始终等于「最新可发布状态」。

`master` 与 `develop` 都设了「只接受 Pull Request」的规则，所以两层都是**开 PR 再合并**，不再直接 push 主线。

- **本地**：`powershell -ExecutionPolicy Bypass -File scripts\release.ps1`（macOS / Linux：`scripts/release.sh`）。
  脚本依次执行：切到 `develop` 并 `pull --ff-only` → 跑测试 → 推一个临时发布分支
  `release/develop-to-master-<标签>` → 用 API 开 PR 并合并进 `master` → 打 `v<日期>` 标签 →
  再开一条 `release/master-to-develop-<标签>` 的 PR 把合并提交回合给 `develop`。
  任何一步失败即中止，不留半成品。令牌优先取 `GH_TOKEN`，否则用 git 已保存的 github.com 凭据。
- **远端**：`.github/workflows/release.yml`（GitHub Actions）在 `develop` 推送后跑测试，
  用 `GITHUB_TOKEN` 开 PR 合并 `master`、打标签、再开 PR 回合 `develop`。
  推送即触发，不需要手动开启；Actions 不可用时以本地脚本为准。
- 自动推进禁止强推；冲突时停下来报告，由人决定。
- 发布完成后必须把 `master` 的合并提交回合到 `develop`，否则每次合并都会在两层之间留下永久偏移。
