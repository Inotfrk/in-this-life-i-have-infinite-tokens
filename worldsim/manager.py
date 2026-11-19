"""实例管理器：名字（key）-> Agent（value）的字典 + 消息路由。

三个职责：
1. 注册表：按名字存取实例，重复注册直接报错，保证「一个名字一个实例」；
2. 路由：把消息投进目标实例自己的队列，绝不直接调用对方的方法；
3. 排序：注册表改动用一把 asyncio.Lock 保护；每条消息的投递是同步入队，
   真正的处理在各自 worker 里串行发生，所以通信不会串线。

为什么每实例一条队列，而不是全局一条：
- 全局队列会让所有人的发言挤在一起，A 的两句话之间可能插进 B 的整段对话；
- 每实例队列天然保证「同一个角色的记忆按它收到的顺序写」，回放和调试也简单。
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterable
from typing import Any

from .agent import Agent
from .llm import BaseLLM, RuleBasedLLM
from .message import Message
from .social import DiffusionModel


class AgentManager:
    """沙盘的实例表与消息总线。"""

    WORLD = "世界"

    def __init__(self, *, llm: BaseLLM | None = None, history_limit: int = 256) -> None:
        self._agents: dict[str, Agent] = {}
        self._lock = asyncio.Lock()
        self.default_llm: BaseLLM = llm or RuleBasedLLM()
        self.history: list[Message] = []
        self.history_limit = history_limit
        self.social = DiffusionModel()
        self._round = 0

    # ---- 注册表 ----
    @property
    def round(self) -> int:
        return self._round

    async def add(self, agent: Agent) -> Agent:
        async with self._lock:
            if agent.name in self._agents:
                raise ValueError(f"名字 {agent.name!r} 已被占用，实例不能重名")
            agent.manager = self
            self._agents[agent.name] = agent
        await agent.start()
        return agent

    async def spawn(
        self,
        name: str,
        background: str,
        values: dict[str, float] | None = None,
        *,
        llm: BaseLLM | None = None,
        tags: tuple[str, ...] = (),
        memory_limit: int = 64,
        max_depth: int = 1,
    ) -> Agent:
        agent = Agent(
            name,
            background,
            values,
            llm=llm or self.default_llm,
            tags=tags,
            memory_limit=memory_limit,
            max_depth=max_depth,
        )
        return await self.add(agent)

    async def remove(self, name: str) -> None:
        async with self._lock:
            agent = self._agents.pop(name, None)
        if agent is None:
            raise KeyError(f"没有名为 {name!r} 的 agent")
        await agent.stop()

    def get(self, name: str) -> Agent:
        try:
            return self._agents[name]
        except KeyError:
            raise KeyError(f"没有名为 {name!r} 的 agent；现有：{sorted(self._agents)}") from None

    def names(self) -> tuple[str, ...]:
        return tuple(self._agents)

    def agents(self) -> tuple[Agent, ...]:
        return tuple(self._agents.values())

    def __getitem__(self, name: str) -> Agent:
        return self.get(name)

    def __contains__(self, name: object) -> bool:
        return name in self._agents

    def __len__(self) -> int:
        return len(self._agents)

    # ---- 轮次 ----
    async def begin_round(self) -> int:
        async with self._lock:
            self._round += 1
            return self._round

    # ---- 路由 ----
    async def send(
        self,
        sender: str,
        to: str | Iterable[str],
        content: str,
        *,
        topic: str = "",
        credibility: float = 0.6,
        stance: float = 0.0,
        kind: str = "speech",
        depth: int = 0,
    ) -> int:
        """投一条消息，返回实际投递人数。发送方自己也会记住「我对谁说了什么」。"""

        async with self._lock:
            if sender not in self._agents:
                raise KeyError(f"发送方 {sender!r} 不在沙盘里")
            targets = self._resolve(to)
            names = tuple(agent.name for agent in targets)
            msg = Message(
                sender=sender,
                content=content,
                recipients=names,
                topic=topic,
                credibility=credibility,
                stance=stance,
                kind=kind,
                round=self._round,
                depth=depth,
            )
            self._remember(msg)

        for target in targets:
            target.put_nowait(msg)
            sender_agent = self._agents[sender]
            sender_agent.memory.record(
                "self",
                f"我对 {target.name} 说：{content}",
                counterpart=target.name,
                round_=msg.round,
            )

        self.social.observe(msg, [(t.name, t.values.get("信任", 50.0)) for t in targets])
        return len(targets)

    async def broadcast(
        self,
        sender: str,
        content: str,
        *,
        exclude: Iterable[str] = (),
        **kwargs: Any,
    ) -> int:
        skip = {sender, *exclude}
        targets = [name for name in self._agents if name not in skip]
        if not targets:
            return 0
        return await self.send(sender, targets, content, **kwargs)

    async def inject(
        self,
        content: str,
        to: str | Iterable[str],
        *,
        topic: str = "",
        credibility: float = 1.0,
        stance: float = 0.0,
    ) -> int:
        """世界事件：不是任何 agent 说的，直接进收件人的记忆。"""

        async with self._lock:
            targets = self._resolve(to)
            msg = Message(
                sender=self.WORLD,
                content=content,
                recipients=tuple(t.name for t in targets),
                topic=topic,
                credibility=credibility,
                stance=stance,
                kind="event",
                round=self._round,
            )
            self._remember(msg)
        for target in targets:
            target.put_nowait(msg)
        self.social.observe(
            msg,
            [(t.name, t.values.get("信任", 50.0)) for t in targets],
            include_sender=False,
        )
        return len(targets)

    async def reply(self, agent: Agent, msg: Message, text: str) -> int:
        """agent 对收到的消息做出回应（回给原发送方，深度 +1）。"""

        if msg.sender == self.WORLD or msg.sender not in self._agents:
            return 0
        return await self.send(
            agent.name,
            msg.sender,
            text,
            topic=msg.topic,
            credibility=msg.credibility,
            stance=-msg.stance,
            depth=msg.depth + 1,
        )

    # ---- 收尾 ----
    async def settle(self, timeout: float = 5.0) -> None:
        """等所有实例把队列处理完。"""

        await asyncio.gather(*(agent.wait_idle(timeout) for agent in self._agents.values()))

    async def close(self) -> None:
        await asyncio.gather(*(agent.stop() for agent in self._agents.values()), return_exceptions=True)

    # ---- 观测 ----
    def snapshot(self) -> dict[str, Any]:
        return {
            "round": self._round,
            "agents": {name: agent.snapshot() for name, agent in self._agents.items()},
            "messages": len(self.history),
            "trends": self.social.report(),
        }

    # ---- 内部 ----
    def _resolve(self, to: str | Iterable[str]) -> list[Agent]:
        names = [to] if isinstance(to, str) else list(to)
        if not names:
            raise ValueError("收件人不能为空")
        resolved: list[Agent] = []
        seen: set[str] = set()
        for name in names:
            agent = self.get(name)
            if agent.name in seen:
                continue
            seen.add(agent.name)
            resolved.append(agent)
        return resolved

    def _remember(self, msg: Message) -> None:
        self.history.append(msg)
        if len(self.history) > self.history_limit:
            del self.history[: len(self.history) - self.history_limit]
