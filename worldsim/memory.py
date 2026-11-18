"""每个 agent 自己的记忆。

分三层（对应 Ayaka V2.5 里 MemorySystem 的三件套，但去掉向量库依赖，先做可验证版本）：

- 见闻（episodic）：一条条发生过的对话 / 事件，自己说的和别人说的都记；
- 印象（impression）：我对某个人的看法，随往来次数累积，是「对他人的记忆」；
- 检索（recall）：按关键词重合度 + 时间新鲜度挑几条出来，喂给模型当上下文。

刻意不引入 embedding：MVP 阶段只要检索结果稳定可测即可，接真实向量库是替换一个方法的事。
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Iterable


_PUNCT = set("，。！？、；：\"'（）《》【】…—,.!?;:()[]{}<> \t\n")


def _tokens(text: str) -> set[str]:
    """极简分词：中文按字，英文按词，丢掉标点。

    只用于召回打分，不追求语言学正确性。
    """

    tokens: set[str] = set()
    buf: list[str] = []
    for ch in text.lower():
        if ch in _PUNCT:
            if buf:
                tokens.add("".join(buf))
                buf.clear()
            continue
        if ch.isascii() and ch.isalnum():
            buf.append(ch)
        else:
            if buf:
                tokens.add("".join(buf))
                buf.clear()
            tokens.add(ch)
    if buf:
        tokens.add("".join(buf))
    return tokens


@dataclass(slots=True)
class MemoryItem:
    """一条记忆。"""

    kind: str            # heard / self / event
    text: str
    counterpart: str = ""
    round: int = 0
    ts: float = field(default_factory=time.time)
    weight: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "text": self.text,
            "counterpart": self.counterpart,
            "round": self.round,
            "ts": self.ts,
            "weight": self.weight,
        }


@dataclass(slots=True)
class Impression:
    """我对某个人的印象：一条可覆盖的短评 + 往来次数。"""

    note: str = ""
    contacts: int = 0
    last_round: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {"note": self.note, "contacts": self.contacts, "last_round": self.last_round}


class MemoryStore:
    """单个 agent 的记忆容器（不是全局共享的）。"""

    def __init__(self, limit: int = 64) -> None:
        if limit < 1:
            raise ValueError("limit 至少为 1")
        self.limit = limit
        self.items: list[MemoryItem] = []
        self.impressions: dict[str, Impression] = {}

    # ---- 写入 ----
    def record(
        self,
        kind: str,
        text: str,
        *,
        counterpart: str = "",
        round_: int = 0,
        weight: float = 1.0,
    ) -> MemoryItem:
        item = MemoryItem(kind=kind, text=text, counterpart=counterpart, round=round_, weight=weight)
        self.items.append(item)
        self._trim()
        return item

    def update_impression(self, name: str, note: str, *, round_: int = 0) -> Impression:
        imp = self.impressions.get(name)
        if imp is None:
            imp = Impression()
            self.impressions[name] = imp
        imp.note = note
        imp.contacts += 1
        imp.last_round = round_
        return imp

    def _trim(self) -> None:
        """超长时先丢最旧的低权重条目，权重高的留久一点。"""

        if len(self.items) <= self.limit:
            return
        overflow = len(self.items) - self.limit
        order = sorted(range(len(self.items)), key=lambda i: (self.items[i].weight, self.items[i].ts))
        drop = set(order[:overflow])
        self.items = [it for i, it in enumerate(self.items) if i not in drop]

    # ---- 读取 ----
    def recent(self, n: int = 5) -> list[MemoryItem]:
        if n <= 0:
            return []
        return self.items[-n:]

    def about(self, name: str) -> list[MemoryItem]:
        return [it for it in self.items if it.counterpart == name]

    def impression_of(self, name: str) -> str:
        imp = self.impressions.get(name)
        if imp is None:
            return "还不认识"
        return f"{imp.note}（往来 {imp.contacts} 次）"

    def recall(self, query: str, k: int = 3) -> list[MemoryItem]:
        """关键词重合 + 时间新鲜度打分，返回最相关的几条。"""

        query_tokens = _tokens(query)
        if not query_tokens or not self.items:
            return []
        newest = max(it.ts for it in self.items)
        scored: list[tuple[float, MemoryItem]] = []
        for it in self.items:
            overlap = len(query_tokens & _tokens(it.text))
            if overlap == 0:
                continue
            fresh = 1.0 / (1.0 + (newest - it.ts) / 3600.0)
            scored.append((overlap * it.weight + 0.1 * fresh, it))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [it for _, it in scored[:k]]

    # ---- 序列化 ----
    def to_dict(self) -> dict[str, Any]:
        return {
            "items": [it.to_dict() for it in self.items],
            "impressions": {k: v.to_dict() for k, v in self.impressions.items()},
            "limit": self.limit,
        }

    def brief(self, n: int = 3) -> str:
        """把最近 n 条压成一行，给提示词用。"""

        if not self.items:
            return "（还没有记忆）"
        return " / ".join(it.text for it in self.recall_last(n))

    def recall_last(self, n: int = 3) -> Iterable[MemoryItem]:
        return self.items[-n:]
