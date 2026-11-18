"""一个可以被实例化的 AI agent。

设计要点（对应 Ayaka V2.5 里 AIThread 的 PROCESSING 标志位）：

- 每个实例一条自己的 asyncio.Queue + 一个专属 worker，队列里的消息**串行**处理，
  所以同一个角色永远不会同时接两个人说话；
- 背景（background）只读；数值（values）会被消息推动，范围 0~100；
- 记忆分「见闻」和「对他人的印象」，都是实例私有的，不共享；
- 回复通过 manager 路由回去，自己不直接访问别人的队列。

这样一个 Agent 就是「背景 + 数值 + 记忆 + 队列 + 模型」的完整封装，
manager 只需要按名字存实例、往里投消息。
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from typing import TYPE_CHECKING, Any

from .llm import AgentTurn, BaseLLM, RuleBasedLLM
from .memory import MemoryStore
from .message import Message

if TYPE_CHECKING:  # pragma: no cover
    from .manager import AgentManager


class Agent:
    """独立角色实例。"""

    def __init__(
        self,
        name: str,
        background: str,
        values: dict[str, float] | None = None,
        *,
        llm: BaseLLM | None = None,
        tags: tuple[str, ...] = (),
        memory_limit: int = 64,
        max_depth: int = 1,
    ) -> None:
        if not name:
            raise ValueError("name 不能为空")
        if not background:
            raise ValueError("background 不能为空")
        self.name = name
        self.background = background
        self.tags = tuple(tags)
        self.values: dict[str, float] = {k: float(v) for k, v in (values or {}).items()}
        self.llm: BaseLLM = llm or RuleBasedLLM()
        self.memory = MemoryStore(limit=memory_limit)
        self.max_depth = max_depth

        self.inbox: asyncio.Queue[Message] = asyncio.Queue()
        self.manager: "AgentManager | None" = None
        self.turns = 0

        self._worker: asyncio.Task[None] | None = None
        self._busy = False

    # ---- 生命周期 ----
    async def start(self) -> None:
        if self._worker is not None and not self._worker.done():
            return
        self._worker = asyncio.create_task(self._work(), name=f"agent:{self.name}")

    async def stop(self) -> None:
        if self._worker is not None:
            self._worker.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._worker
            self._worker = None

    async def join(self) -> None:
        """等自己的队列处理完。"""

        await self.inbox.join()

    async def wait_idle(self, timeout: float = 5.0) -> None:
        deadline = time.monotonic() + timeout
        while self._busy or not self.inbox.empty():
            if time.monotonic() > deadline:
                raise TimeoutError(f"{self.name} 在 {timeout}s 内没有处理完队列（剩余 {self.inbox.qsize()} 条）")
            await asyncio.sleep(0.002)

    # ---- 队列 ----
    async def put(self, msg: Message) -> None:
        await self.inbox.put(msg)

    def put_nowait(self, msg: Message) -> None:
        self.inbox.put_nowait(msg)

    async def _work(self) -> None:
        while True:
            msg = await self.inbox.get()
            self._busy = True
            try:
                await self._handle(msg)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # 单条消息出问题不该拖垮整个沙盘
                self.memory.record("event", f"处理 {msg.sender} 的消息时出错：{exc!r}", round_=msg.round)
            finally:
                self._busy = False
                self.inbox.task_done()

    # ---- 处理一条消息 ----
    async def _handle(self, msg: Message) -> None:
        self.turns += 1

        # 先想，再记：让模型看到的是「这条消息之前」的记忆，
        # 否则它会把自己刚听到的话当成旧闻复述一遍。
        turn: AgentTurn = await self.llm.respond(self, msg)

        if msg.kind == "event":
            self.memory.record("event", msg.content, round_=msg.round, weight=1.2)
        else:
            self.memory.record(
                "heard",
                f"{msg.sender}：{msg.content}",
                counterpart=msg.sender,
                round_=msg.round,
            )
        # 世界事件不是「某个人」说的，不给它建印象
        is_person = self.manager is not None and msg.sender in self.manager
        if is_person:
            snippet = msg.content if len(msg.content) <= 30 else msg.content[:30] + "…"
            self.memory.update_impression(msg.sender, f"最近一次说「{snippet}」", round_=msg.round)

        self.apply_values(turn.value_deltas)

        # 事件不回答；已经来回过一次也不再追问，避免两个 agent 无限对喷
        if turn.reply and msg.kind != "event" and msg.depth < self.max_depth and self.manager is not None:
            await self.manager.reply(self, msg, turn.reply)

    def apply_values(self, deltas: dict[str, float]) -> None:
        """数值变化只作用于已有的键，超出 0~100 截断。"""

        for key, delta in (deltas or {}).items():
            if key not in self.values:
                continue
            self.values[key] = max(0.0, min(100.0, self.values[key] + float(delta)))

    # ---- 观测 ----
    def snapshot(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "background": self.background,
            "tags": list(self.tags),
            "values": dict(self.values),
            "turns": self.turns,
            "queued": self.inbox.qsize(),
            "recent_memory": [item.text for item in self.memory.recent(5)],
            "impressions": {k: self.memory.impression_of(k) for k in self.memory.impressions},
        }

    def __repr__(self) -> str:  # pragma: no cover - 调试用
        return f"<Agent {self.name} turns={self.turns} queued={self.inbox.qsize()}>"
