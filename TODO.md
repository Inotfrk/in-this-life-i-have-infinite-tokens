# TODO — 待完成任务队列

本文件是 [AGENTS.md](AGENTS.md) 第 3 节的队列。agent 在高峰期或夜间读取本文件，按下面的协议认领任务。

## 任务格式

```markdown
### T-001 任务标题

- 状态：queued | in-progress | done | blocked
- 目标分支：`<账号段>-<电脑段>-text`
- 优先级：P0 | P1 | P2
- 依赖：无 / T-000
- 涉及文件：src/main/java/...
- 验收：`powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Task test` 全绿
- 说明：要做什么、为什么
```

## 执行协议

1. 读本文件，挑一个 `queued` 任务（P0 优先，其次按编号顺序，依赖未完成的跳过）。
2. **先单独提交一次**把状态改成 `in-progress` 并 push，避免与其他 agent 抢同一个任务。
3. 按 `目标分支` 工作：分支不存在就从你的 `-Main` 切出，命名为
   `<账号段>-<电脑段>-<后缀>`（见 AGENTS.md 2.1）。
4. 每轮迭代通过验收后 commit + push 到当前分支（见 AGENTS.md 2.5）。
5. 任务完成：状态改 `done`，合并回你的 `-Main`；再由 `-Main` 进入 `develop`，
   `develop` 经 `scripts/release` 自动推进 `master`（三层流，见 AGENTS.md 2.5 / 第 8 节）。
6. 需求不清或受阻：状态改 `blocked`，在说明里写清缺什么决策，不做猜测性改动。
7. 队列为空 → 不改动任何代码，直接结束。

## 排队中

### T-004 分支归属规则落地为账号隔离（Gitee 保护分支）

- 状态：done
- 目标分支：`<账号段>-<电脑段>-rules`
- 优先级：P0
- 依赖：T-002
- 涉及文件：`AGENTS.md`、`.github/copilot-instructions.md`、`.agents/branch-registry.md`、
  `README.md`、`README.en.md`、`NOTE.md`
- 验收：`scripts\build.ps1 -Task test` 全绿；推送他人账号前缀的分支会被 Gitee 拒绝
  （`Auth error: No permission to push this protected branch`）
- 说明：账号段改为「Gitee 登录名」，每个账号只能提交 / 推送 `<登录名>-*`；电脑段只区分钟同一账号
  的不同机器；跨账号或主线冲突一律提示用户提 OA。Gitee 侧为每个成员建了 `<登录名>-*` 保护分支规则，
  并开启「只能推送自己的提交」推送规则；已实测用某个账号推别人前缀的分支会被 pre-receive hook 拒绝。

### T-011 学习助手主页面——骨架界面

- 状态：in-progress
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：T-010
- 涉及文件：`CMakeLists.txt`、`src/ui/main.cpp`、`src/ui/qml/Main.qml`、
  `src/ui/qml/GlyphIcon.qml`、`src/ui/qml/Theme.js`
- 验收：`scripts\build.ps1 -Task test`（macOS / Linux：`scripts/build.sh test`）通过；
  offscreen 渲染出 `build/ui-screenshot.png`，布局与 [docs/design-study-app-ui.md](docs/design-study-app-ui.md) 一致
- 说明：实现**纯界面骨架**，不接任何功能（不读文件、不调 AI、不存 API Key）。
  学科写死 `math` / `phy` / `che`，点选只改高亮。GitHub 风格只是作者个人偏好，
  不得据此改动任何仓库规则文件。

### T-012 Qt 6 构建与沙箱基础设施

- 状态：in-progress
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：T-011
- 涉及文件：`Dockerfile`、`.devcontainer/devcontainer.json`、`scripts/build.ps1`、
  `scripts/build.sh`、`scripts/sandbox.ps1`、`scripts/sandbox.sh`、`scripts/desktop.sh`、
  `docs/docker-sandbox.md`、`README.md`、`README.en.md`
- 验收：沙箱镜像构建通过；容器内 `bash scripts/build.sh test` 出图；
  旧的 JDK / Xvfb / VisualDrive 相关脚本与文档引用全部清除
- 说明：整体从「JDK 21 + Swing」换成「Qt 6 + CMake + Ninja」。界面检查改为
  `--screenshot` + `QT_QPA_PLATFORM=offscreen`，不再依赖 `xvfb-run`。

## 已完成

### T-013 废弃计算器实现与设计

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：无
- 涉及文件：删除 `docs/design-cpp-qt.md`、`scripts/drive.sh`；改写 `README.md`、`README.en.md`、
  `TODO.md`、`docs/docker-sandbox.md`
- 验收：仓库内不再有 Java / Swing / 计算器求值器的构建入口与文档指引
- 说明：产品方向从「计算器」改为「学习助手」，Java 计算器连同其 C++/Qt 移植设计一并淘汰。

### T-002 上传流改为三层（master ← develop ← 个人分支）

- 状态：done
- 目标分支：`<账号段>-<电脑段>-flow`
- 优先级：P0
- 依赖：无
- 涉及文件：`AGENTS.md`、`README.md`、`README.en.md`、`.github/copilot-instructions.md`、
  `TODO.md`、`.agents/branch-registry.md`、`scripts/release.ps1`、`scripts/release.sh`、
  `.workflow/release.yml`
- 验收：`scripts\build.ps1 -Task test` 全绿；`scripts\release.ps1 -DryRun` 能正确列出待发布提交
- 说明：第一层 `master`（线上发布）← 第二层 `develop`（开发主线）← 第三层各机分支。
  文档、规则、发布脚本一次性对齐。

### T-003 同步远端 develop 与 master

- 状态：done
- 目标分支：`<账号段>-<电脑段>-Main`
- 优先级：P0
- 依赖：T-002
- 涉及文件：无代码改动（纯 git 操作）
- 验收：`scripts\release.ps1 -DryRun` 输出「develop 与 master 已一致，无需发布」
- 说明：`develop` 原来停在 `ca62600` Initial commit、落后 `master` 15 个提交。已把 `gitee/master`
  快进合入本地 `develop`，接收本地改动后推送，再用 `scripts/release.ps1` 完成首次
  `develop -> master` 自动发布（标签 `v2026.10.25-1731`）。三层流现已闭合。

### T-011 学习助手主页面——骨架界面实现

- 状态：blocked
- 目标分支：`<账号段>-<电脑段>-study-ui`
- 优先级：P1
- 依赖：T-010
- 涉及文件：新增主页面骨架（具体路径在 T-010 的技术选型定下来后补）
- 验收：左侧全局图标栏 + 内容卡片 + 学科侧栏 + 主内容区空壳可运行；学科列表可独立滚动
- 说明：按 [docs/design-study-app-ui.md](docs/design-study-app-ui.md) 实现**纯界面骨架**，
  不接任何功能（不读文件、不调 AI、不存 API Key）。**必须先解决该文档第 7 节的 5 个待确认问题**，
  否则状态保持 `blocked`。GitHub 风格只是作者个人偏好，不得据此改动任何仓库规则文件。
  > 已被 T-010/T-013 之后的实际实现取代：骨架已在 Qt 6 里落地，见上方「T-011 学习助手主页面——骨架界面」。

## 已完成

### T-010 学习助手主页面设计文档

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P1
- 依赖：无
- 涉及文件：新增 `docs/design-study-app-ui.md`、`TODO.md`
- 验收：文档 Markdown 链接有效；明确写出「仅设计、不实现功能」与「GitHub 风格非仓库共识」
- 说明：按用户口述 + 手绘草图整理主页面分区（全局图标栏、卡片头部 ☰ 与 AI 入口、学科可滚动侧栏、
  右侧空白主内容区、侧栏底部预留区），并留下 5 个待确认问题供产品决策。

### T-005 仓库整体从 Gitee 迁到 GitHub

- 状态：done
- 目标分支：`inotfrk-Fairy-Main`
- 优先级：P0
- 依赖：无
- 涉及文件：`AGENTS.md`、`.github/copilot-instructions.md`、`.github/workflows/release.yml`、
  `.github/ISSUE_TEMPLATE/bug_report.md`、`.github/pull_request_template.md`、`.agents/branch-registry.md`、
  `README.md`、`README.en.md`、`TODO.md`、`NOTE.md`、`scripts/release.ps1`、`scripts/release.sh`；
  删除 `.gitee/`、`.workflow/`
- 验收：`git ls-remote origin` 与本地 5 个分支 + 12 个标签逐一一致；`scripts\build.ps1 -Task test` 全绿
- 说明：GitHub 侧新建私有仓库 `Inotfrk/in-this-life-i-have-infinite-tokens`，完整推送全部提交历史
  （111 个提交、45 个合并提交）、5 条分支与 12 个标签，远端名统一为 `origin`。
  删除了用户此前用 GitHub Import 试导入的 `in-this-life-i-have-infinite-tokens.` 仓库（只有 1 个
  Initial commit，无独有内容）。CI 从 Gitee Go 换成 GitHub Actions：`.workflow/` 删除，
  新增 `.github/workflows/release.yml` 承担 develop → master 自动发布；`.gitee/` 模板迁到 `.github/`。
  Gitee 仓库保留只读归档，不再接收推送。

### T-000 README 主描述从 Java 改为 C++

- 状态：done
- 目标分支：`<账号段>-<电脑段>-docs-cpp`
- 优先级：P2
- 依赖：无
- 涉及文件：`README.md`、`README.en.md`、`.agents/branch-registry.md`
- 验收：Markdown 链接与命令示例正确，Java 构建与测试流程未被改动
- 说明：按用户要求把仓库说明的技术栈从 Java 改为 C++17 单文件计算器，补齐「仓库怎么用」的
  入门段落，并把 Java 实现标注为历史示例；源码、构建脚本与 CI 未改动。
