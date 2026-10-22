# TODO — 待完成任务队列

本文件是 [AGENTS.md](AGENTS.md) 第 3 节的队列。agent 在高峰期或夜间读取本文件，按下面的协议认领任务。

## 任务格式

```markdown
### T-001 任务标题

- 状态：queued | in-progress | done | blocked
- 目标分支：hello-world-tai-Fairy-text
- 优先级：P0 | P1 | P2
- 依赖：无 / T-000
- 涉及文件：src/main/java/...
- 验收：`powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Task test` 全绿
- 说明：要做什么、为什么
```

## 执行协议

1. 读本文件，挑一个 `queued` 任务（P0 优先，其次按编号顺序，依赖未完成的跳过）。
2. **先单独提交一次**把状态改成 `in-progress` 并 push，避免与其他 agent 抢同一个任务。
3. 按 `目标分支` 工作：分支不存在就从本机 `-Main` 切出并在
   [.agents/branch-registry.md](.agents/branch-registry.md) 的「子分支」表登记父分支。
4. 每轮迭代通过验收后 commit + push 到当前分支（见 AGENTS.md 2.5）。
5. 任务完成：状态改 `done`，合并回本机 `-Main`；属于完整小功能的再合并并 push `master`。
6. 需求不清或受阻：状态改 `blocked`，在说明里写清缺什么决策，不做猜测性改动。
7. 队列为空 → 不改动任何代码，直接结束。

## 排队中

_（暂无。需要夜间执行的工作请按上面的格式追加在这里。）_

## 已完成

_（暂无。）_
