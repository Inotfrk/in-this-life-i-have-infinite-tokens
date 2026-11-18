"""趋势层的最小占位：DeGroot 观点收敛 + 议题触达统计。

真实系统里这一层会换成舆情 / 金融的理论模型；这里先把「消息进来 -> 每个人
的立场被拉过去一点 -> 统计到达率与离散度」这条链路跑通，接口保持可替换。
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from typing import Iterable

from .message import Message


@dataclass(slots=True)
class TopicState:
    """一个议题的传播与立场分布。"""

    reached: set[str] = field(default_factory=set)
    messages: int = 0


class DiffusionModel:
    """DeGroot 式更新：收信人立场的更新量 = 信任权重 × 可信度 × (对方立场 - 自己立场)。"""

    def __init__(self) -> None:
        self.opinions: dict[str, dict[str, float]] = {}
        self.topics: dict[str, TopicState] = {}
        self.flows = 0

    def observe(
        self,
        msg: Message,
        receivers: Iterable[tuple[str, float]],
        *,
        include_sender: bool = True,
    ) -> None:
        """receivers 是 (收信人, 信任值 0~100) 的序列。

        include_sender=False 用于世界事件：那条消息不是任何人说的，不该算进触达人口。
        """

        if not msg.topic:
            return
        state = self.topics.setdefault(msg.topic, TopicState())
        if include_sender:
            state.reached.add(msg.sender)
        state.messages += 1
        self.flows += 1
        for name, trust in receivers:
            weight = max(0.0, min(1.0, trust / 100.0)) * msg.credibility
            book = self.opinions.setdefault(name, {})
            current = book.get(msg.topic, 0.0)
            book[msg.topic] = max(-1.0, min(1.0, current + weight * (msg.stance - current)))
            state.reached.add(name)

    def opinion_of(self, name: str, topic: str) -> float:
        return self.opinions.get(name, {}).get(topic, 0.0)

    def stats(self, topic: str) -> dict[str, float]:
        state = self.topics.get(topic)
        if state is None:
            return {"reached": 0, "messages": 0, "mean": 0.0, "stdev": 0.0}
        values = [self.opinion_of(name, topic) for name in state.reached]
        return {
            "reached": len(state.reached),
            "messages": state.messages,
            "mean": statistics.fmean(values) if values else 0.0,
            "stdev": statistics.pstdev(values) if len(values) > 1 else 0.0,
        }

    def report(self) -> dict[str, dict[str, float]]:
        return {topic: self.stats(topic) for topic in self.topics}
