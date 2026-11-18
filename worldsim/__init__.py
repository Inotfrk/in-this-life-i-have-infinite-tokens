"""worldsim —— AI 驱动的历史模拟沙盘（最小可行验证）。

当前只验证四件事：
1. AI agent 能被封装成独立实例（背景 / 记忆 / 数值各自一份）；
2. agent 之间能互相通信，通信双方都会留下记忆（含「我对别人的印象」）；
3. 实例由 AgentManager 用名字（key）-> 实例（value）的字典管理；
4. 每个实例一条独立队列 + 专属 worker，通信不会串线。
"""

from .agent import Agent
from .llm import AgentTurn, BaseLLM, RuleBasedLLM, ScriptedLLM
from .manager import AgentManager
from .memory import MemoryItem, MemoryStore
from .message import Message
from .social import DiffusionModel

__all__ = [
    "Agent",
    "AgentManager",
    "AgentTurn",
    "BaseLLM",
    "DiffusionModel",
    "MemoryItem",
    "MemoryStore",
    "Message",
    "RuleBasedLLM",
    "ScriptedLLM",
]

__version__ = "0.1.0"
