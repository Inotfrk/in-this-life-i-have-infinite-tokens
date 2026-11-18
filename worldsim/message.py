"""agent 之间传递的消息。

一条消息只描述「谁、对谁、说了什么」，不携带任何人的记忆；
记忆由收发双方各自写入自己的 MemoryStore，保证每个实例的数据边界清晰。
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class Message:
    """一次通信。

    Attributes:
        sender: 发送方名字（AgentManager 里的 key）。
        content: 正文。
        recipients: 收件方名字，至少有一个人；广播就是一次投给多人（共享同一条记录）。
        topic: 议题标签，用于传播 / 舆论统计；空串表示闲聊。
        credibility: 消息可信度 0~1，接收方用它计算对发送方的影响权重。
        stance: 这条消息在 topic 上的立场 -1~1（-1 极度悲观，1 极度乐观），供 DeGroot 更新用。
        kind: speech（说话）/ event（世界事件）/ action（动作）。
        round: 第几轮，方便回放。
        ts: 生成时间戳。
    """

    sender: str
    content: str
    recipients: tuple[str, ...] = field(default_factory=tuple)
    topic: str = ""
    credibility: float = 0.6
    stance: float = 0.0
    kind: str = "speech"
    round: int = 0
    depth: int = 0
    ts: float = field(default_factory=time.time)

    def __post_init__(self) -> None:
        if not self.sender:
            raise ValueError("sender 不能为空")
        if not self.content or not self.content.strip():
            raise ValueError("content 不能为空")
        if not self.recipients:
            raise ValueError("recipients 不能为空；广播请传入全部收件人")
        if not 0.0 <= self.credibility <= 1.0:
            raise ValueError(f"credibility 必须在 0~1 之间，收到 {self.credibility}")
        if not -1.0 <= self.stance <= 1.0:
            raise ValueError(f"stance 必须在 -1~1 之间，收到 {self.stance}")

    def to_dict(self) -> dict[str, Any]:
        return {
            "sender": self.sender,
            "content": self.content,
            "recipients": list(self.recipients),
            "topic": self.topic,
            "credibility": self.credibility,
            "stance": self.stance,
            "kind": self.kind,
            "round": self.round,
            "depth": self.depth,
            "ts": self.ts,
        }
