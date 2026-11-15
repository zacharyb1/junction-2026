"""Research notices through the plugin's registered hook, with no gateway or network."""
import asyncio
import contextvars
import importlib.util
from pathlib import Path
import sys
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch


ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "hermes/plugins/kaveri-gate"
SPEC = importlib.util.spec_from_file_location(
    "lifecycle_test_plugin", FOLDER / "__init__.py", submodule_search_locations=[str(FOLDER)],
)
plugin = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = plugin
SPEC.loader.exec_module(plugin)


class Context:
    def __init__(self, surface="telegram"):
        self.surface = surface
        self.hooks = {}
        self.messages = []

    def register_hook(self, name, callback, **kwargs):
        self.hooks[name] = callback

    def session_surface(self):
        return self.surface

    def post_message(self, text):
        self.messages.append(text)
        return SimpleNamespace(ok=True, error=None, pending=False)


class LifecycleTest(unittest.TestCase):
    def setUp(self):
        self.ctx = Context()
        plugin.register(self.ctx)

    def tool(self, tool_name="mcp__casefile__research_case", session="session-a", turn="turn-a", **args):
        hook = self.ctx.hooks.get("pre_tool_call")
        if hook:
            return hook(tool_name=tool_name, args=args, session_id=session, turn_id=turn, tool_call_id="tool-1")

    def test_work_announces_once_before_the_result(self):
        self.tool("skill_view", name="life-event-butler")
        self.assertEqual(self.ctx.messages, [])
        self.assertIsNone(self.tool(language="en"))
        self.assertEqual(len(self.ctx.messages), 1, "Research began without its start notification")
        self.tool()
        self.tool("mcp__casefile__find_products")
        self.assertEqual(len(self.ctx.messages), 1, "One turn must not announce every tool")
        self.assertNotIn("done", self.ctx.messages[0].lower())

    def test_next_turn_and_another_session_have_their_own_notice(self):
        self.tool()
        self.tool(turn="turn-b")
        self.tool(session="session-b")
        self.assertEqual(len(self.ctx.messages), 3)

    def test_no_notice_for_web_silence_or_unknown_turn(self):
        for surface in ("api_server", "cli", "", None):
            self.ctx.surface = surface
            self.tool()
        self.ctx.surface = "telegram"
        for session, turn in (("", "turn"), ("session", ""), (None, "turn")):
            self.tool(session=session, turn=turn)
        for name in ("clarify", "memory", "skill_view", "mcp__casefile__case_get", "unknown_tool"):
            self.tool(name)
        self.assertEqual(self.ctx.messages, [])

    def test_start_notice_does_not_echo_private_tool_arguments(self):
        self.tool(situation="PRIVATE-HOUSEHOLD-CONTEXT", country="Finland", language="fi")
        self.assertEqual(len(self.ctx.messages), 1)
        self.assertNotIn("PRIVATE-HOUSEHOLD-CONTEXT", self.ctx.messages[0])
        self.assertIn("Tarkistan", self.ctx.messages[0])

    def test_concurrent_tools_claim_only_one_notice(self):
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda _: self.tool(), range(16)))
        self.assertEqual(len(self.ctx.messages), 1)

    def test_delivery_keeps_the_callers_context(self):
        route = contextvars.ContextVar("test-telegram-route", default="missing")
        self.ctx.post_message = lambda text: self.ctx.messages.append(route.get())
        token = route.set("synthetic-chat-topic")
        try:
            self.tool()
        finally:
            route.reset(token)
        self.assertEqual(self.ctx.messages, ["synthetic-chat-topic"])

    def test_failed_notice_does_not_block_research_or_retry_uncertain_delivery(self):
        attempts = []
        def fail(text):
            attempts.append(text)
            raise OSError("synthetic delivery failure")
        self.ctx.post_message = fail
        with self.assertLogs("kaveri.lifecycle", level="WARNING"):
            self.assertIsNone(self.tool())
        self.tool()
        self.assertEqual(len(attempts), 1)
        self.ctx.post_message = lambda text: self.ctx.messages.append(text)
        self.assertIsNone(self.tool(turn="next-turn"))
        self.assertEqual(len(self.ctx.messages), 1)

    def test_rejected_or_pending_send_never_gets_an_automatic_retry(self):
        attempts = []
        def pending(text):
            attempts.append(text)
            return SimpleNamespace(ok=False, pending=True, error="timeout")
        self.ctx.post_message = pending
        with self.assertLogs("kaveri.lifecycle", level="WARNING"):
            self.assertIsNone(self.tool())
        self.tool()
        self.assertEqual(len(attempts), 1)

    def test_slow_notice_is_bounded_and_preserves_the_next_turn(self):
        entered, release, completed = threading.Event(), threading.Event(), threading.Event()
        def slow(text):
            entered.set()
            try:
                release.wait(3)
                self.ctx.messages.append(text)
            finally:
                completed.set()
        self.ctx.post_message = slow
        try:
            with patch.object(plugin.lifecycle, "_WAIT_SECONDS", 0.01):
                started = time.monotonic()
                self.assertIsNone(self.tool())
                self.assertLess(time.monotonic() - started, 0.5)
                self.assertTrue(entered.wait(1))
                self.tool()
        finally:
            release.set()
        self.assertTrue(completed.wait(1))
        self.assertEqual(len(self.ctx.messages), 1)
        self.ctx.post_message = lambda text: self.ctx.messages.append(text)
        self.tool(turn="next-turn")
        self.assertEqual(len(self.ctx.messages), 2)

    def test_occupied_workers_do_not_create_an_unbounded_delivery_queue(self):
        release, completed = threading.Event(), threading.Event()
        def slow(text):
            try:
                release.wait(3)
                self.ctx.messages.append(text)
            finally:
                completed.set()
        with patch.object(plugin.lifecycle, "_MAX_PENDING", 1), patch.object(plugin.lifecycle, "_WAIT_SECONDS", 0.01):
            plugin.lifecycle.register(self.ctx)
            self.ctx.post_message = slow
            try:
                self.tool()
                with self.assertLogs("kaveri.lifecycle", level="WARNING"):
                    self.assertIsNone(self.tool(turn="second-turn"))
            finally:
                release.set()
            self.assertTrue(completed.wait(1))
            self.assertEqual(len(self.ctx.messages), 1)
            self.ctx.post_message = lambda text: self.ctx.messages.append(text)
            self.tool(turn="third-turn")
            self.assertEqual(len(self.ctx.messages), 2)

    def test_turn_latches_are_bounded_and_expire(self):
        with patch.object(plugin.lifecycle, "_MAX_TURNS", 2), patch.object(plugin.lifecycle.time, "monotonic", return_value=0):
            plugin.lifecycle.register(self.ctx)
            self.tool(turn="one")
            self.tool(turn="two")
            self.tool(turn="three")
            state = self.ctx.hooks["pre_tool_call"].__self__.turns
            self.assertEqual(len(state), 2)
        with patch.object(plugin.lifecycle.time, "monotonic", return_value=plugin.lifecycle._TURN_TTL_SECONDS + 1):
            self.tool(turn="four")
            self.assertEqual(len(state), 1)


@unittest.skipUnless(importlib.util.find_spec("gateway"), "Run in the pinned Hermes image for native routing")
class NativeLifecycleTest(unittest.IsolatedAsyncioTestCase):
    async def test_native_post_message_preserves_the_bound_chat_and_topic(self):
        from gateway.config import Platform
        from gateway.plugin_messages import bind_live_source
        from gateway.session import SessionSource
        from gateway.session_context import scoped_session_key
        from hermes_cli.plugins_context import PluginContext

        source = SessionSource(platform=Platform.TELEGRAM, chat_id="-100111", chat_type="group", thread_id="77")
        key = "synthetic-telegram-topic"
        adapter = SimpleNamespace(send=AsyncMock(return_value=SimpleNamespace(success=True, message_id="notice-1")))
        runner = SimpleNamespace(
            session_store=SimpleNamespace(lookup_by_session_key=lambda _: None),
            _session_key_for_source=lambda _: key,
            _plugin_messaging_session_owned=lambda *args, **kwargs: True,
            _delivery_adapter_for=lambda _: adapter,
            _thread_metadata_for_source=lambda origin: {"message_thread_id": origin.thread_id},
        )
        ctx = Context()
        ctx.plugin_id = "kaveri-gate"
        ctx._manager = SimpleNamespace(home_path=Path("/tmp/synthetic-plugin-home"))
        ctx.post_message = lambda text: PluginContext.post_message(ctx, text)
        plugin.register(ctx)
        with patch("hermes_cli.plugin_messages._gateway_loop", return_value=(runner, asyncio.get_running_loop())):
            with scoped_session_key(key), bind_live_source(source):
                await asyncio.to_thread(
                    ctx.hooks["pre_tool_call"], tool_name="mcp__casefile__research_case", args={"language": "en"},
                    session_id="synthetic-session", turn_id="synthetic-turn",
                )
        adapter.send.assert_awaited_once()
        self.assertEqual(adapter.send.await_args.args[0], source.chat_id)
        self.assertEqual(adapter.send.await_args.kwargs["metadata"], {"message_thread_id": "77", "_interim_send": True})


if __name__ == "__main__":
    unittest.main()
