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

### T-001 把计算器核心移植为单文件 C++

- 状态：queued
- 目标分支：`<账号段>-<电脑段>-cpp`
- 优先级：P1
- 依赖：无
- 涉及文件：新增 `calculator.cpp`；`README.md` / `README.en.md` 的 C++ 段落
- 验收：`g++ -std=c++17 -O2 calculator.cpp -o calculator` 编译通过，示例表达式结果与
  `EvaluatorTest` 的 25 项一致；`scripts\build.ps1 -Task test` 仍全绿
- 说明：README 已把 C++17 单文件计算器作为主线描述，但仓库里尚无 `calculator.cpp`。
  需要把 `ExpressionEvaluator` 的递归下降逻辑（`+ - * / % ^`、括号、一元正负号、右结合乘方）
  转成单个 C++ 源文件，错误提示保持中文；Java 实现保留为历史示例，不删除。

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

### T-000 README 主描述从 Java 改为 C++

- 状态：done
- 目标分支：`<账号段>-<电脑段>-docs-cpp`
- 优先级：P2
- 依赖：无
- 涉及文件：`README.md`、`README.en.md`、`.agents/branch-registry.md`
- 验收：Markdown 链接与命令示例正确，Java 构建与测试流程未被改动
- 说明：按用户要求把仓库说明的技术栈从 Java 改为 C++17 单文件计算器，补齐「仓库怎么用」的
  入门段落，并把 Java 实现标注为历史示例；源码、构建脚本与 CI 未改动。
