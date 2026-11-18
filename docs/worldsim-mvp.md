# worldsim：AI 历史沙盘的最小可行验证

> 状态：**MVP 原型**，用于验证「多 agent 通信 + 独立记忆 + 独立数值 + 队列化调度」这条骨架，
> 不是最终架构，也不代表项目命名。仓库名与产品名都还没定。

## 1. 这一版要验证什么

参考 Ayaka V2.5 的 `Module/WorldEngine.py` 与 `Module/AIThread.py`，把它们的核心经验抽出来，
换成多角色版本，只验证四件事：

| # | 目标 | 对应实现 |
| --- | --- | --- |
| 1 | AI agent 能封装成独立实例 | `worldsim/agent.py` 的 `Agent`：背景、数值、记忆、队列、模型全套私有 |
| 2 | agent 之间能互相通信 | `AgentManager.send / broadcast / inject` 把消息投进收件人自己的队列 |
| 3 | 通信保留记忆 | 发送方记「我对谁说了什么」，接收方记「谁对我说了什么」+ 更新对这个人的印象 |
| 4 | 管理的实例表 + 不串线 | `AgentManager` 用 `dict[name, Agent]`；每个实例一条 `asyncio.Queue` + 专属 worker |

## 2. 与 V2.5 的对应关系

| Ayaka V2.5 | 这里的做法 | 为什么改 |
| --- | --- | --- |
| `AIThread.PROCESSING` 标志位 + 轮询等待，保证同一时刻只有一段对话在跑 | 每个 `Agent` 一条队列 + 一个 worker 协程，消息天然串行 | 标志位只能保护「一个 AI」，多角色时全局锁会把所有人堵在一起 |
| `WorldEngine.Simulate`：把世界状态压成一段文本再喂给模型 | `WorldData` 没了，改成 `Message(kind="event")` 直接进每个角色的记忆 | 历史沙盘里「世界」是持续的事件流，不是每次都要重新生成一段旁白 |
| `WorldEngine.Status`（饱腹/困倦/健康/压力，0~100） | `Agent.values`（信任/压力/银钱…，0~100，可自定义键） | 不同角色需要不同数值，不能写死四个 |
| `ListAction / RunTask`：让模型列行为、再挑一个执行 | 先不做行动决策，只做「收到消息 -> 回应 -> 数值变化」 | MVP 先验证通信与记忆，行动系统是下一步 |
| `MemorySystem`：chromadb 向量库 + 重要记忆 + 内容记忆 + 用户记忆 | `MemoryStore`：见闻 + 对他人的印象 + 关键词召回 | 去掉向量库依赖，让检索结果可复现、可单测；接真向量库时替换 `recall` 即可 |

## 3. 结构

```
worldsim/
  message.py    Message：sender / recipients / topic / credibility / stance / depth
  memory.py     MemoryStore：见闻、印象、关键词召回、序列化
  agent.py      Agent：背景 + 数值 + 记忆 + 队列 + worker
  manager.py    AgentManager：dict 注册表、路由、轮次、世界事件、快照
  llm.py        RuleBasedLLM（离线）/ ScriptedLLM（测试）/ OpenAICompatLLM（真模型）
  social.py     DiffusionModel：DeGroot 观点收敛 + 议题触达（趋势层的占位）
examples/mvp_demo.py   三个角色三轮对话的演示
tests/test_worldsim.py 14 个离线测试
```

## 4. 关键设计决定

### 4.1 每个实例一条队列，而不是全局一条

全局队列会让 A 的两句话之间插进 B 的整段对话，回放和记忆顺序都会乱。
每实例队列保证「同一个角色按它收到的顺序写记忆」，也让卡住的角色不拖累别人。

### 4.2 注册表用 `asyncio.Lock`，消息投递用 `put_nowait`

- 注册 / 注销 / 轮次自增在锁里做，避免并发注册出重复 key；
- 投递只是入队，不等待对方处理，所以谁也不会因为等另一个人而互相卡死；
- 需要「一轮跑完再看结果」时用 `await manager.settle()`。

### 4.3 回复只回一跳

`Message.depth` 记录往返深度，`Agent.max_depth` 默认 1：
A 说话 -> B 回应 -> 到此为止。否则两个角色会无限对喷，烧 token 也烧不出信息。

### 4.4 记忆是「先想再记」

`Agent._handle` 先让模型思考、再写入这条消息，避免模型把自己刚听到的话当成旧闻复述。
这条顺序由测试 `test_sender_remembers_what_it_said` 一类用例兜着。

### 4.5 趋势层先做可替换的占位

`DiffusionModel` 用 DeGroot 加权平均：收信人立场向发送方立场靠拢，权重 = 信任 × 可信度。
真实系统里这层会换成舆情 / 金融模型，接口（`observe` / `stats` / `report`）保持不变即可替换。

## 5. 怎么跑

不需要任何第三方依赖，Python 3.11+：

```bash
python3 -m unittest discover -s tests -v   # 14 个离线测试
python3 -m examples.mvp_demo               # 离线启发式模型跑三轮
```

接真模型（OpenAI 兼容接口，DeepSeek / 通义 / 本地 vLLM 都行）：

```bash
export WORLDSIM_API_KEY=sk-...
export WORLDSIM_BASE_URL=https://api.deepseek.com/v1
export WORLDSIM_MODEL=deepseek-flash
python3 -m examples.mvp_demo --online
```

也可以把这三行写进仓库根的 `.env.local`（已 gitignore、`chmod 600`），
`worldsim.env.load_env_file()` 会在构造 `OpenAICompatLLM` 时补进环境变量，已存在的环境变量优先。
DeepSeek 现在的模型名是 `deepseek-flash` / `deepseek-v4-pro`，V2.5 里硬编码的
`deepseek-v4-flash` 已经调不通了。

## 6. 还没做的（下一步）

1. **行动系统**：把 `ListAction / RunTask` 的思想搬过来，让角色能自己发起行为而不只是回应；
2. **世界时钟**：现在是「轮次」，需要模拟日期、时辰、事件排期；
3. **持久化**：`Agent.snapshot()` 已有，但还没写盘与恢复；
4. **真记忆检索**：用 embedding 替换关键词召回，并按重要度做遗忘曲线；
5. **趋势模型**：把 `DiffusionModel` 换成有理论依据的舆情 / 金融模型；
6. **可观测性**：现在靠 `snapshot()` 打印，后面要事件日志与回放。
