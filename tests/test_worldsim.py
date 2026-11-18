"""worldsim 最小可行验证的测试。

全部离线：只用 ScriptedLLM / RuleBasedLLM，不碰网络。
运行：python3 -m unittest discover -s tests -v
"""

from __future__ import annotations

import asyncio
import os
import tempfile
import unittest
from pathlib import Path

from worldsim import Agent, AgentManager, ScriptedLLM
from worldsim.env import load_env_file
from worldsim.llm import RuleBasedLLM


class TestInstanceIsolation(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.mgr = AgentManager(llm=ScriptedLLM(default=None))

    async def asyncTearDown(self) -> None:
        await self.mgr.close()

    async def test_each_agent_has_own_background_values_memory(self) -> None:
        a = await self.mgr.spawn("阿禾", "码头搬运工，怕失业", {"信任": 50, "压力": 10})
        b = await self.mgr.spawn("陈砚", "私塾先生，消息灵通", {"信任": 60, "压力": 5})

        self.assertIsNot(a.memory, b.memory)
        self.assertIsNot(a.values, b.values)

        await self.mgr.begin_round()
        await self.mgr.send("阿禾", "陈砚", "码头今天只来了三条船", topic="生计")
        await self.mgr.settle()

        self.assertTrue(any("三条船" in item.text for item in b.memory.about("阿禾")))
        self.assertFalse(any("三条船" in item.text for item in a.memory.about("阿禾")))

    async def test_sender_remembers_what_it_said(self) -> None:
        await self.mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        await self.mgr.spawn("陈砚", "私塾先生", {"信任": 60})

        await self.mgr.begin_round()
        await self.mgr.send("阿禾", "陈砚", "盐价要涨", topic="盐价")
        await self.mgr.settle()

        said = [item.text for item in self.mgr["阿禾"].memory.recent(5)]
        self.assertTrue(any(text.startswith("我对 陈砚 说") for text in said))


class TestMemoryAndImpressions(unittest.IsolatedAsyncioTestCase):
    async def test_impressions_grow_with_contacts(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM(default=None))
        await mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        b = await mgr.spawn("陈砚", "私塾先生", {"信任": 60})
        try:
            for i in range(3):
                await mgr.begin_round()
                await mgr.send("阿禾", "陈砚", f"第 {i} 次听说盐价要涨", topic="盐价")
                await mgr.settle()

            impression = b.memory.impressions["阿禾"]
            self.assertEqual(impression.contacts, 3)
            self.assertIn("盐价", b.memory.impression_of("阿禾"))
            self.assertEqual(b.memory.impression_of("林岚"), "还不认识")
        finally:
            await mgr.close()

    async def test_recall_prefers_matching_memory(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM(default=None))
        await mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        b = await mgr.spawn("陈砚", "私塾先生", {"信任": 60})
        try:
            await mgr.begin_round()
            await mgr.send("阿禾", "陈砚", "今天码头下雨了", topic="天气")
            await mgr.begin_round()
            await mgr.send("阿禾", "陈砚", "盐价涨得厉害，要加税", topic="盐价")
            await mgr.settle()

            hits = b.memory.recall("盐价 加税", k=1)
            self.assertTrue(hits)
            self.assertIn("盐价", hits[0].text)
        finally:
            await mgr.close()


class TestManagerRegistry(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.mgr = AgentManager(llm=ScriptedLLM(default=None))

    async def asyncTearDown(self) -> None:
        await self.mgr.close()

    async def test_dict_like_access_by_name(self) -> None:
        a = await self.mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        self.assertEqual(self.mgr["阿禾"], a)
        self.assertIn("阿禾", self.mgr)
        self.assertEqual(len(self.mgr), 1)
        self.assertEqual(self.mgr.names(), ("阿禾",))

    async def test_duplicate_name_rejected(self) -> None:
        await self.mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        with self.assertRaises(ValueError):
            await self.mgr.spawn("阿禾", "另一个同名的", {"信任": 10})

    async def test_unknown_name_raises(self) -> None:
        with self.assertRaises(KeyError):
            self.mgr.get("不存在")
        with self.assertRaises(KeyError):
            await self.mgr.send("不存在", "也不存在", "喂")

    async def test_concurrent_register_and_remove(self) -> None:
        names = [f"角色{i}" for i in range(20)]
        await asyncio.gather(*(self.mgr.spawn(name, f"{name} 的背景", {"信任": 50}) for name in names))
        self.assertEqual(len(self.mgr), 20)
        self.assertEqual(set(self.mgr.names()), set(names))

        await asyncio.gather(*(self.mgr.remove(name) for name in names[:10]))
        self.assertEqual(len(self.mgr), 10)
        self.assertTrue(all(name in self.mgr for name in names[10:]))


class _SlowAgent(Agent):
    """记录自己同时在处理几条消息，用来证明串行。"""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.active = 0
        self.peak = 0
        self.order: list[str] = []

    async def _handle(self, msg) -> None:  # type: ignore[override]
        self.active += 1
        self.peak = max(self.peak, self.active)
        try:
            await asyncio.sleep(0.01)
            self.order.append(msg.content)
        finally:
            self.active -= 1


class TestSerialization(unittest.IsolatedAsyncioTestCase):
    async def test_one_worker_per_agent_means_no_interleaving(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM(default=None))
        slow = _SlowAgent("慢工", "做事一板一眼", {"信任": 50})
        await mgr.add(slow)
        await mgr.spawn("快嘴", "话多的人", {"信任": 50})
        try:
            for i in range(6):
                await mgr.begin_round()
                await mgr.send("快嘴", "慢工", f"消息{i}")
            await mgr.settle()

            self.assertEqual(slow.peak, 1, "同一个 agent 同时处理了多条消息")
            self.assertEqual(slow.order, [f"消息{i}" for i in range(6)], "处理顺序被打乱")
        finally:
            await mgr.close()

    async def test_reply_is_one_hop_by_default(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM({("陈砚", "阿禾"): "我也听说了，别声张"}))
        await mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        await mgr.spawn("陈砚", "私塾先生", {"信任": 60})
        try:
            await mgr.begin_round()
            await mgr.send("阿禾", "陈砚", "盐价要涨", topic="盐价")
            await mgr.settle()

            depths = [msg.depth for msg in mgr.history]
            self.assertEqual(depths, [0, 1], f"回复不该继续套娃：{depths}")
            self.assertEqual(mgr.history[-1].sender, "陈砚")
            self.assertEqual(mgr.history[-1].recipients, ("阿禾",))
        finally:
            await mgr.close()


class TestRoutingAndTrends(unittest.IsolatedAsyncioTestCase):
    async def test_broadcast_skips_sender(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM(default=None))
        for name in ("甲", "乙", "丙"):
            await mgr.spawn(name, f"{name} 的背景", {"信任": 50})
        try:
            await mgr.begin_round()
            delivered = await mgr.broadcast("甲", "城外有动静", topic="局势")
            await mgr.settle()
            self.assertEqual(delivered, 2)
            self.assertTrue(any("城外有动静" in i.text for i in mgr["乙"].memory.recent(3)))
            self.assertFalse(any(i.text.startswith("甲：城外有动静") for i in mgr["甲"].memory.recent(3)))
        finally:
            await mgr.close()

    async def test_world_event_does_not_reply(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM(default="我不该说话"))
        a = await mgr.spawn("阿禾", "码头搬运工", {"信任": 50})
        try:
            await mgr.begin_round()
            await mgr.inject("半夜传来一声巨响", "阿禾", topic="异动", stance=-0.8)
            await mgr.settle()
            self.assertTrue(any(item.kind == "event" for item in a.memory.recent(3)))
            self.assertNotIn("世界", a.memory.impressions, "世界事件不该被当成某个人")
            self.assertEqual(len(mgr.history), 1)
        finally:
            await mgr.close()

    async def test_diffusion_updates_opinions(self) -> None:
        mgr = AgentManager(llm=ScriptedLLM(default=None))
        await mgr.spawn("阿禾", "码头搬运工", {"信任": 80})
        await mgr.spawn("陈砚", "私塾先生", {"信任": 40})
        try:
            await mgr.begin_round()
            await mgr.send("阿禾", "陈砚", "盐价要涨三成", topic="盐价", credibility=1.0, stance=-1.0)
            await mgr.settle()

            stats = mgr.social.stats("盐价")
            self.assertEqual(stats["reached"], 2)
            self.assertLess(mgr.social.opinion_of("陈砚", "盐价"), 0)
            self.assertGreater(mgr.social.opinion_of("阿禾", "盐价"), mgr.social.opinion_of("陈砚", "盐价"))
        finally:
            await mgr.close()


class TestValues(unittest.IsolatedAsyncioTestCase):
    async def test_values_move_and_stay_in_range(self) -> None:
        mgr = AgentManager(llm=RuleBasedLLM())
        a = await mgr.spawn("阿禾", "码头搬运工", {"信任": 50, "压力": 99})
        await mgr.spawn("陈砚", "私塾先生", {"信任": 60})
        try:
            await mgr.begin_round()
            await mgr.send("陈砚", "阿禾", "官府要加税了，恐怕要打仗", topic="局势", credibility=0.9, stance=-0.9)
            await mgr.settle()

            self.assertEqual(a.values["压力"], 100.0, "压力应该封顶在 100")
            self.assertGreater(a.values["信任"], 50.0)
        finally:
            await mgr.close()


class TestEnvFile(unittest.TestCase):
    """本机 key 放在 .env.local 里，读取器只补缺、不覆盖已有环境变量。"""

    def test_missing_file_is_not_an_error(self) -> None:
        self.assertEqual(load_env_file(Path("/nonexistent/.env.local")), {})

    def test_reads_pairs_and_keeps_existing_env(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / ".env.local"
            path.write_text("# comment\nWORLDSIM_TEST_A=1\nWORLDSIM_TEST_B='two'\n", encoding="utf-8")
            os.environ["WORLDSIM_TEST_B"] = "from-shell"
            try:
                loaded = load_env_file(path)
                self.assertEqual(loaded, {"WORLDSIM_TEST_A": "1", "WORLDSIM_TEST_B": "two"})
                self.assertEqual(os.environ["WORLDSIM_TEST_A"], "1")
                self.assertEqual(os.environ["WORLDSIM_TEST_B"], "from-shell", "已存在的环境变量不该被文件覆盖")
            finally:
                os.environ.pop("WORLDSIM_TEST_A", None)
                os.environ.pop("WORLDSIM_TEST_B", None)


if __name__ == "__main__":
    unittest.main()
