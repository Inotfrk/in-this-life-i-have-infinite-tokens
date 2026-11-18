"""最小可行演示：三个角色在同一个沙盘里通气。

运行：python3 -m examples.mvp_demo
不需要 API key —— 默认用离线启发式模型；设置 WORLDSIM_API_KEY 后可以换真模型：
    WORLDSIM_API_KEY=... WORLDSIM_BASE_URL=... WORLDSIM_MODEL=... python3 -m examples.mvp_demo --online
"""

from __future__ import annotations

import argparse
import asyncio

from worldsim import AgentManager, RuleBasedLLM
from worldsim.llm import OpenAICompatLLM


async def main(online: bool) -> None:
    llm = OpenAICompatLLM() if online else RuleBasedLLM()
    mgr = AgentManager(llm=llm)

    await mgr.spawn("阿禾", "码头搬运工，租在城西，最怕没活干", {"信任": 50, "压力": 30, "银钱": 20})
    await mgr.spawn("陈砚", "私塾先生，消息灵通但谨慎", {"信任": 60, "压力": 20, "银钱": 60})
    await mgr.spawn("林岚", "商会会计，手上过账，嘴上极稳", {"信任": 40, "压力": 15, "银钱": 90})

    print("=" * 70)
    print("第 1 轮：码头先听到风声")
    await mgr.begin_round()
    await mgr.inject("清晨，城门口贴出新的告示，说盐税要改", ["阿禾", "陈砚", "林岚"], topic="盐价", stance=-0.5)
    await mgr.send("阿禾", "陈砚", "盐价要涨了，码头上的货都被人连夜拉走了", topic="盐价", credibility=0.7, stance=-0.8)
    await mgr.settle()

    print()
    print("第 2 轮：消息往商会走")
    await mgr.begin_round()
    await mgr.send("陈砚", "林岚", "听阿禾说盐价要涨，你那边账上有没有动静？", topic="盐价", credibility=0.6, stance=-0.5)
    await mgr.settle()

    print()
    print("第 3 轮：商会开口，风向开始分叉")
    await mgr.begin_round()
    await mgr.broadcast("林岚", "账上暂时没看到加税的条目，别自己吓自己", topic="盐价", credibility=0.9, stance=0.3)
    await mgr.settle()

    print()
    print("=" * 70)
    print("对话记录")
    for msg in mgr.history:
        arrow = " -> " + "、".join(msg.recipients)
        print(f"[第{msg.round}轮][{msg.kind}][{msg.sender}{arrow}] {msg.content}")

    print()
    print("=" * 70)
    for name in mgr.names():
        agent = mgr[name]
        print(f"【{name}】背景：{agent.background}")
        print(f"  数值：{'、'.join(f'{k}={v:.0f}' for k, v in agent.values.items())}")
        print(f"  最近记忆：")
        for item in agent.memory.recent(4):
            print(f"    - ({item.kind}) {item.text}")
        print(f"  对他人的印象：")
        for other in agent.memory.impressions:
            print(f"    - {other}：{agent.memory.impression_of(other)}")
        print()

    print("=" * 70)
    print("趋势（DeGroot 占位模型）")
    for topic, stats in mgr.social.report().items():
        print(
            f"  {topic}: 触达 {stats['reached']} 人 / {stats['messages']} 条消息，"
            f"平均立场 {stats['mean']:+.2f}，分歧度 {stats['stdev']:.2f}"
        )

    await mgr.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--online", action="store_true", help="用 OpenAI 兼容接口（需 WORLDSIM_API_KEY）")
    asyncio.run(main(parser.parse_args().online))
