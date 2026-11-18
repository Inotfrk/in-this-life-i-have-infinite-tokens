"""LLM 适配层：把「模型怎么想」和「沙盘怎么跑」解耦。

三种实现：
- RuleBasedLLM：离线启发式，不需要 API key，保证 demo 与测试可重复；
- ScriptedLLM：测试用，按 (agent, 发送者) 查表给固定回复；
- OpenAICompatLLM：任何 OpenAI 兼容的 /chat/completions（DeepSeek、通义、本地 vLLM 都能用），
  通过环境变量配置，未配置就不启用。

测试里一律用前两种，绝不联网（AGENTS.md 第 1 节）。
"""

from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
import zlib
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from .env import load_env_file
from .message import Message

if TYPE_CHECKING:  # 只用于类型标注，避免循环导入
    from .agent import Agent


@dataclass(slots=True)
class AgentTurn:
    """一次思考的结果：说点什么 + 数值怎么变。"""

    reply: str | None = None
    value_deltas: dict[str, float] = field(default_factory=dict)


@runtime_checkable
class BaseLLM(Protocol):
    async def respond(self, agent: "Agent", msg: Message) -> AgentTurn: ...


class RuleBasedLLM:
    """离线启发式模型。

    规则很土，但足够验证「背景 / 记忆 / 数值真的在影响行为」：
    紧急词汇 -> 压力上升，可信度高的消息 -> 信任上升，回答里会引用记忆里最相关的一条。
    """

    URGENT = ("涨", "危机", "打仗", "战争", "逃", "危险", "崩", "灾", "加税", "征收", "断粮", "封锁")
    HOPEFUL = ("丰收", "降价", "和谈", "平安", "好消息", "开市")

    async def respond(self, agent: "Agent", msg: Message) -> AgentTurn:
        urgent = any(word in msg.content for word in self.URGENT)
        hopeful = any(word in msg.content for word in self.HOPEFUL)

        deltas: dict[str, float] = {}
        if "压力" in agent.values:
            deltas["压力"] = 6.0 if urgent else (-2.0 if hopeful else 0.5)
        if "信任" in agent.values:
            if msg.credibility >= 0.7:
                deltas["信任"] = 2.0
            elif msg.credibility < 0.35:
                deltas["信任"] = -1.5
        if "银钱" in agent.values and urgent:
            deltas["银钱"] = -2.0

        # 语气由「消息立场 + 关键词」共同决定，比单一关键词更接近真人反应
        if msg.stance >= 0.3 or hopeful:
            reaction = self._pick(agent, msg, ("稍稍松了口气", "眉头松开一点", "把心放回肚子里"))
        elif msg.stance <= -0.3 or urgent:
            reaction = self._pick(agent, msg, ("心里咯噔一下", "后背有点发凉", "先把手里的活停了停"))
        else:
            reaction = self._pick(agent, msg, ("没有立刻接话", "把话在心里过了一遍", "点了点头"))

        recalled = agent.memory.recall(msg.content, k=1)
        memory_clause = ""
        if recalled:
            snippet = recalled[0].text if len(recalled[0].text) <= 24 else recalled[0].text[:24] + "…"
            memory_clause = f"我记得之前听过「{snippet}」。 "

        if msg.credibility < 0.35:
            stance_line = f"{msg.sender}这话我信三分，还得再看看。"
        elif msg.credibility < 0.7:
            stance_line = f"{msg.sender}说的我先记下，未必全信。"
        else:
            stance_line = f"{msg.sender}不像乱说的人，我照这话准备。"

        pressure = agent.values.get("压力", 0.0)
        closing = "眼下压力不小，先顾眼前。" if pressure >= 60 else "还不算火烧眉毛。"

        reply = f"{reaction}。{memory_clause}{stance_line}{closing}"
        return AgentTurn(reply=reply, value_deltas=deltas)

    @staticmethod
    def _pick(agent: "Agent", msg: Message, options: tuple[str, ...]) -> str:
        """用 crc32 选一句，保证同一个输入永远同一句（可复现），但不同人有变化。"""

        seed = zlib.crc32(f"{agent.name}|{msg.sender}|{msg.content}".encode("utf-8"))
        return options[seed % len(options)]


class ScriptedLLM:
    """测试用：给了回复就说，没给就不说。"""

    def __init__(self, script: dict[tuple[str, str], str] | None = None, *, default: str | None = None):
        self.script = dict(script or {})
        self.default = default

    async def respond(self, agent: "Agent", msg: Message) -> AgentTurn:
        reply = self.script.get((agent.name, msg.sender), self.default)
        return AgentTurn(reply=reply, value_deltas={})


class OpenAICompatLLM:
    """OpenAI 兼容接口。启用方式：

        export WORLDSIM_API_KEY=sk-...
        export WORLDSIM_BASE_URL=https://api.deepseek.com/v1
        export WORLDSIM_MODEL=deepseek-chat

    没配 key 时 respond() 会退回 RuleBasedLLM，沙盘不会因为缺 key 直接崩。
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        # 先补 .env.local（仓库根、已 gitignore），再读环境变量；shell 里显式 export 的优先
        load_env_file()
        self.api_key = api_key or os.environ.get("WORLDSIM_API_KEY", "")
        self.base_url = (base_url or os.environ.get("WORLDSIM_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
        self.model = model or os.environ.get("WORLDSIM_MODEL", "gpt-4o-mini")
        self.timeout = timeout
        self._fallback = RuleBasedLLM()

    #: 单次数值变化的上限，防止模型一时兴起写个 ±999
    DELTA_LIMIT = 20.0

    async def respond(self, agent: "Agent", msg: Message) -> AgentTurn:
        if not self.api_key:
            return await self._fallback.respond(agent, msg)
        text = await asyncio.to_thread(self._call, agent, msg)
        return self.parse_turn(text, agent)

    @classmethod
    def parse_turn(cls, text: str, agent: "Agent") -> AgentTurn:
        """把模型输出解析成 AgentTurn：优先 JSON，解析不了就退化成纯文本。

        约定的 JSON 形状是 `{"say": "...", "deltas": {"压力": 6}}`。
        模型不听话（带代码块、说废话、写不存在的键）都不该让沙盘崩，所以这里全程容错。
        """

        raw = (text or "").strip()
        if not raw:
            return AgentTurn(reply=None, value_deltas={})

        payload = cls._extract_json(raw)
        if not isinstance(payload, dict):
            return AgentTurn(reply=raw, value_deltas={})

        reply = payload.get("say") or payload.get("reply") or ""
        deltas: dict[str, float] = {}
        raw_deltas = payload.get("deltas") or {}
        if isinstance(raw_deltas, dict):
            for key, value in raw_deltas.items():
                if key not in agent.values:  # 只改这个角色身上已有的键
                    continue
                try:
                    amount = float(value)
                except (TypeError, ValueError):
                    continue
                if amount != amount or amount in (float("inf"), float("-inf")):
                    continue
                amount = max(-cls.DELTA_LIMIT, min(cls.DELTA_LIMIT, amount))
                if amount:
                    deltas[key] = amount
        return AgentTurn(reply=str(reply).strip() or None, value_deltas=deltas)

    @staticmethod
    def _extract_json(text: str) -> dict[str, object] | None:
        """从可能带 ```json 围栏或多余文字的回复里抠出第一个 JSON 对象。"""

        body = text.strip()
        if body.startswith("```"):
            body = body.strip("`").strip()
            if body[:4].lower() == "json":
                body = body[4:].lstrip()
        start, end = body.find("{"), body.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            return json.loads(body[start : end + 1])
        except json.JSONDecodeError:
            return None

    def _call(self, agent: "Agent", msg: Message) -> str:
        payload = {
            "model": self.model,
            "temperature": 0.8,
            "messages": [
                {"role": "system", "content": self._system_prompt(agent)},
                {"role": "user", "content": f"{msg.sender} 对你说：{msg.content}"},
            ],
        }
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:  # noqa: S310 - 地址来自环境变量
                data = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:  # pragma: no cover - 需要网络
            raise RuntimeError(f"调用 {self.base_url} 失败：{exc}") from exc
        return data["choices"][0]["message"]["content"]

    @staticmethod
    def _system_prompt(agent: "Agent") -> str:
        values = "、".join(f"{k}={v:.0f}" for k, v in agent.values.items()) or "（无）"
        keys = "、".join(agent.values) or "（无）"
        limit = int(OpenAICompatLLM.DELTA_LIMIT)
        impressions = "；".join(
            f"{name}：{agent.memory.impression_of(name)}" for name in list(agent.memory.impressions)[:5]
        ) or "（还没有）"
        return (
            f"你在扮演一个历史沙盘里的角色，名字是 {agent.name}。\n"
            f"【背景】{agent.background}\n"
            f"【当前数值】{values}\n"
            f"【最近记忆】{agent.memory.brief(4)}\n"
            f"【对别人的印象】{impressions}\n"
            "用第一人称、两句话以内回应对方，不要解释规则，不要跳出角色。\n"
            "只输出一个 JSON 对象，不要代码块、不要多余文字：\n"
            '{"say": "你的回应", "deltas": {"压力": 6}}\n'
            f"deltas 只能使用这些键：{keys}；每项在 -{limit}~{limit} 之间，没有变化就写 {{}}。"
        )
