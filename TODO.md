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

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：T-010
- 涉及文件：`CMakeLists.txt`、`src/ui/main.cpp`、`src/ui/theme.h/.cpp`、
  `src/ui/qml/Main.qml`、`src/ui/qml/RailButton.qml`、`src/ui/qml/HeaderButton.qml`、
  `src/ui/qml/SubjectRow.qml`、`src/ui/qml/GlyphIcon.qml`
- 验收：`scripts\build.ps1 -Task test` 通过；三套主题（dark / light / star）都能 offscreen 出图
- 说明：纯界面骨架，不接任何功能。已落地 [docs/design-study-app-ui.md](docs/design-study-app-ui.md) 的
  **结构化界面结论**：左侧图标栏、卡片头部（☰ + 右端「＋ / AI / 用户」组，C1–C3）、
  学科侧栏、右侧留空主内容区、侧栏底部预留区。

### T-014 主题系统（多主题 + 明暗双模式 + 可扩展接口）

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：T-011
- 涉及文件：`src/ui/theme.h`、`src/ui/theme.cpp`、`src/ui/main.cpp`、`src/ui/qml/*.qml`
- 验收：`--theme dark|light|star` 三套都能渲染；QML 只读 `Theme.palette.*`，不含任何颜色字面量
- 说明：对应文档 4.6 与第 8 节 S1/S2（C4–C6）。配色集中在 `theme.cpp` 的 `kThemes` 表，
  **新增主题只加一份 `Palette`，不改界面结构代码**。当前内置三套：`dark`、`light`、`star`（星空）。
  切换方式（跟随系统 / 手动）尚未决定，见文档 7.2 第 8 条。

### T-015 主题切换 UI 与设置页面

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P1
- 依赖：T-014
- 涉及文件：新增设置页（路径待定）、`src/ui/main.cpp`（记忆选择）
- 验收：能在界面里切换三套主题并持久化
- 说明：主题数据层已可用，但**设置页面尚不存在**，且切换方式未定
  （文档 7.2 第 8 条：自动跟随系统 / 手动 / 两者都支持）。
  阻塞原因：需要先定切换方式与设置页的入口位置（文档 7.2 第 5 条），否则会返工。

## 记录待做（需要接功能，本阶段只登记不实现）

> 以下条目**只把设计意图落到待办**，本阶段一律不实现。它们的详细背景见
> [docs/design-study-app-ui.md](docs/design-study-app-ui.md) 第 4.4.1–4.4.3、7.1、7.2 与第 8 节。

### T-016 学科专属功能模块（按学科渲染不同内容）

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P2
- 依赖：T-011
- 涉及文件：`src/ui/qml/Main.qml`（主内容区）
- 验收：选中不同学科时主内容区渲染不同模块；无专属功能的学科显示资料视图
- 说明：对应 C8 / C9。**阻塞**：学科专属功能是内置写死还是每学科可配置未定（7.2 第 12 条），
  资料区与专属功能是否共存也未定（第 13 条）。

### T-017 背单词模块（学习 + 复习，5 个记忆点）

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P2
- 依赖：T-016
- 涉及文件：新增背单词页面与数据层
- 验收：可实现「每词 5 个记忆点、点对 5 次算过」的学习与复习流程
- 说明：对应 C10–C13 与文档 4.4.1。记忆逻辑参考有道背单词（艾宾浩斯 + 莱特纳五盒）。
  **阻塞**：答错时记忆点怎么走未定（7.2 第 15 条）、每次考什么未定（第 16 条）、
  是否按时间间隔排程未定（第 17 条）、满级后是否回访未定（第 18 条）。

### T-018 作业提交与切题（题号提问的前提）

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P2
- 依赖：T-016
- 涉及文件：新增作业页面、切题与 OCR/解析管线
- 验收：能把一次作业切成题目列表并逐条编号，支持「第 7 题不会」这类指代
- 说明：对应 C14、C15、C18 与文档 4.4.2。这是「报题号」和「点词收生词」的**共同前置**。
  **阻塞**：作业提交形式未定（7.2 第 19 条）、切题识别不准时怎么办未定（第 20 条）。

### T-019 学习会话（开始 / 结束 + 全程不跳出）

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P2
- 依赖：T-018
- 涉及文件：新增会话状态与计时
- 验收：能开始 / 结束一次学习会话，会话内所有交互不跳转到外部 AI
- 说明：对应 C16、C17。**阻塞**：会话是纯计时还是锁定作业清单未定（7.2 第 21 条）、
  收尾环节（订正 / 错题 / 明日计划）是否属于流程未定（第 22 条）。

### T-020 生词收集与单词本联动

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P2
- 依赖：T-017、T-018
- 涉及文件：新增单词本数据层、题目文本的点选交互
- 验收：点题目里的词 → AI 判是否学科专业词 → 入库 → 作业结束后可被背单词模块取到
- 说明：对应 C19、C20 与文档 4.4.3。单词本是**全局收集箱**，词源有两处（自建词表 + 点选的生词）。
  **阻塞**：用户能否否决 AI 的判断未定（7.2 第 23 条）、生词归属当前学科还是全局未定（第 24 条）、
  结束后自动进背诵还是仅提示未定（第 25 条）。

### T-021 AI 对话与指令执行协议

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：T-025
- 涉及文件：`src/ui/ai_client.h/.cpp`、`src/ui/control_command.h/.cpp`、
  `src/ui/qml/ChatPanel.qml`、`src/ui/qml/Main.qml`、`docs/design-ai-protocol.md`
- 验收：本地假服务器下发 `ui.set_subject` / `ui.set_theme`，客户端真的切换学科与主题
- 说明：对应 C24。**架构按作者要求定为「全部请求经我们的服务器」**：
  客户端不直连任何厂商、不存厂商 Key；服务器回复 `{reply, commands}`，
  客户端只执行**白名单**里的指令。已用假服务器端到端验证通过（见 docs 截图）。
  服务器本身尚未实现。

### T-029 AI 服务端实现

- 状态：queued
- 目标分支：<待定，可能独立仓库>
- 优先级：P1
- 依赖：T-021
- 涉及文件：新增服务端（语言与部署方式待定）
- 验收：客户端配置该地址后能正常对话并返回合法指令
- 说明：协议已在 [docs/design-ai-protocol.md](docs/design-ai-protocol.md) 定义完毕，
  客户端侧已按协议实现并验证。服务端职责：接收 `{message, context}` →
  调用所选厂商 → 把模型输出规整成 `{reply, commands}`。
  **待定**：认证方式、限额与计费、是否中转用户自备 Key（协议文档第 6 节）。

### T-025 AI 服务商注册表与图标

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P1
- 依赖：T-011
- 涉及文件：`src/ui/ai_provider.h/.cpp`、`src/ui/qml/AiGlyph.qml`、
  `src/ui/qml/AiButton.qml`、`src/ui/qml/AiProviderMenu.qml`、`src/ui/main.cpp`
- 验收：`--ai deepseek|claude|gpt|gemini|qwen|custom` 都能正确渲染对应标识；
  点头部 AI 按钮可切换服务商并立即生效
- 说明：对应 C23 / S3。作者要求 AI 图标**跟着用户所用的服务商变**，当前默认 **DeepSeek**。
  注册表内置六项，每项带展示名、缩写、品牌色；新增服务商只需在注册表与 `AiGlyph.qml`
  各加一处，界面代码不动。图标用形状与配色表达，不内嵌商标文件。

### T-026 AI 服务商设置页与凭据持久化

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P1
- 依赖：T-025
- 涉及文件：`src/ui/qml/SettingsPanel.qml`、`src/ui/ai_provider.cpp`（读写配置）
- 验收：在设置里选服务商并填 API Key，重启后仍然保持
- 说明：设置页界面已完成（AI 服务商单选 + API 凭据说明区），但**不持久化**，
  且**还没有 API Key 输入框**。
  **阻塞**：API Key 存哪、要不要加密、是否跟随账号同步（T-024）；
  「使用我们提供的服务端」这条路怎么走（C25）也还没有方案。

### T-022 新增学科入口与学科数据模型

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P2
- 依赖：T-011
- 涉及文件：`src/ui/qml/SubjectRow.qml`、`src/ui/qml/Main.qml`、新增学科数据层
- 验收：能新增学科并在侧栏出现；学科可持久化
- 说明：原以为是卡片头部的 ＋ 按钮，**2026-11-01 作者已否定**，入口位置需重新确定（7.2 第 31 条）。
  当前 ＋ 已从头部移除，学科列表仍写死 math / phy / che。
  **阻塞**：入口位置未定（31）、学科能否嵌套未定（7.2 第 3 条）。

### T-024 账号登录与资料同步

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P1
- 依赖：T-011
- 涉及文件：`src/ui/qml/GlyphIcon.qml`（user 图标）、`src/ui/qml/Main.qml`（头部右端）、
  新增账号与会话层、新增同步层
- 验收：不同账号登录后能看到各自的资料；退出后可切换账号
- 说明：对应 C21 / C22。目前**只有用户图标外观**（单人剪影，位于 AI 右侧），点击无行为。
  作者意图：多个用户各登各的账号，**数据跟着账号走而不是跟机器走**。
  **阻塞**：点击后的形态（26）、登录后图标是否变头像（27）。同步通道（28）、
  同步范围（29）、未登录能否使用（30）三项已由 T-027 出方案（[docs/server-plan.md](docs/server-plan.md)），
  但**服务端本身尚未实现**，所以仍按 blocked 处理，可先做本地多用户 profile 作为过渡。

### T-027 服务端方案：账号 · 同步 · 配置下发

- 状态：done
- 目标分支：`inotfrk-Fairy-server`
- 优先级：P1
- 依赖：T-011
- 涉及文件：`docs/server-plan.md`（新增）、`docs/design-study-app-ui.md`（7.2 第 28~30 条）、`TODO.md`
- 验收：方案文档落地，7.2 第 28~30 条标注为已出方案并指向该文档
- 说明：首期平台定为 Cloudflare Workers + D1（免实名免卡），契约与平台无关，将来可整体迁到
  阿里云函数计算 / 腾讯云云函数。内容覆盖匿名设备账号、`/v1/doc/{key}` 乐观锁同步（`baseRev` 冲突返回 409）、
  远程配置下发、以及「资料文件本体首期不同步」的理由。**AI Key 走自填还是官方代转仍需作者拍板**（见文档第 7 节）。
  服务端实现另开任务，本文只定契约。

### T-023 侧栏底部预留区的内容

- 状态：blocked
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P3
- 依赖：无
- 涉及文件：`src/ui/qml/Main.qml`（reservedArea）
- 验收：预留区放实际内容并去掉「待定」占位
- 说明：对应文档 4.5。当前只画了分隔线与「预留区（待定）」文字。
  **阻塞**：放什么未定（7.2 第 2 条：资料树 / 标签 / 说明）。

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

### T-028 账号菜单与全页设置（仿 GitHub 操作逻辑）

- 状态：done
- 目标分支：`inotfrk-Fairy-qt-design`
- 优先级：P0
- 依赖：T-025
- 涉及文件：`src/ui/qml/AccountMenu.qml`、`src/ui/qml/SettingsPage.qml`、
  `src/ui/qml/Main.qml`、`src/ui/theme.h/.cpp`、`src/ui/qml/GlyphIcon.qml`
- 验收：点头像弹分组菜单 → 点「设置…」进入全页设置 → 左侧导航可切换四个分区
- 说明：按作者要求**照 GitHub 的操作逻辑**做，去掉通讯/社交类项目。
  菜单分三组（账号信息 / 更换头像·设置·切换账号 / 退出登录危险色），
  设置页是**整页覆盖 + 左侧导航 + 右侧内容**，与 GitHub `/settings` 同构。
  新增 Theme.preview() / displayName() 供设置页画主题缩略图。
  已用 xdotool 实际点击验证整条链路。

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
