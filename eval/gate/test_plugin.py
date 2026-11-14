"""Check the Telegram gate hook without a runtime, credentials or network calls."""
import importlib.util
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
PLUGIN_DIR = ROOT / "hermes" / "plugins" / "kaveri-gate"
spec = importlib.util.spec_from_file_location(
    "kaveri_gate_test_plugin", PLUGIN_DIR / "__init__.py",
    submodule_search_locations=[str(PLUGIN_DIR)],
)
plugin = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = plugin
spec.loader.exec_module(plugin)


class GateHookTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.enterContext(patch.object(plugin, "_OPEN_UNTIL", {}))
        patterns = plugin.gate.patterns_from_snippet(ROOT / "hermes" / "config.snippet.yaml")
        self.enterContext(patch.object(plugin, "_PATTERNS", patterns))
        self.enterContext(patch.dict(os.environ, {"KAVERI_GATE_OPEN_SECONDS": "180"}))
        self.log = self.enterContext(patch.object(plugin, "_log"))
        self.classify = self.enterContext(patch.object(plugin.gate, "ask_gemma", return_value="small_talk"))

    async def dispatch(self, text="hello", **fields):
        event = SimpleNamespace(
            source=SimpleNamespace(chat_type="group", chat_id="test-group"),
            text=text,
            **fields,
        )
        return await plugin._on_message(event)

    async def test_bot_mention_bypasses_small_talk_classifier(self):
        self.assertIsNone(await self.dispatch("@kaveri_bot hello", reply_expected=True))
        self.classify.assert_not_called()
        self.assertEqual(self.log.call_args.args[0]["label"], "addressed")

    async def test_bot_mention_wakes_when_model_is_unavailable(self):
        self.classify.side_effect = OSError("model unavailable")
        self.assertIsNone(await self.dispatch("@separate_test_bot hello", reply_expected=True))
        self.classify.assert_not_called()

    async def test_unaddressed_chatter_still_reaches_classifier(self):
        result = await self.dispatch(reply_expected=False)
        self.assertEqual(result, {"action": "skip", "reason": "kaveri-gate:gemma:small_talk"})
        self.classify.assert_called_once()

    async def test_unknown_addressing_does_not_bypass_gate(self):
        result = await self.dispatch(reply_expected=None)
        self.assertEqual(result["action"], "skip")
        self.classify.assert_called_once()

    async def test_unaddressed_chatter_is_dropped_when_model_is_unavailable(self):
        self.classify.side_effect = OSError("model unavailable")
        result = await self.dispatch(reply_expected=False)
        self.assertEqual(result, {"action": "skip", "reason": "kaveri-gate:patterns:small_talk"})
        self.classify.assert_called_once()

    async def test_reply_to_bot_still_bypasses_classifier(self):
        self.assertIsNone(await self.dispatch(reply_to_is_own_message=True))
        self.classify.assert_not_called()

    async def test_media_still_bypasses_classifier(self):
        self.assertIsNone(await self.dispatch(media_urls=["fixture-image.jpg"], reply_expected=False))
        self.classify.assert_not_called()
        self.assertEqual(self.log.call_args.args[0]["label"], "media")

    # Hermes lets the bot stay silent in a group only when reply_expected is False or the chat has
    # allow_silence. Telegram leaves an unaddressed question ("?") at None, so in a group without
    # allow_silence a silent decision would become a visible notice. The gate settles it.
    def group_event(self, text, reply_expected):
        return SimpleNamespace(
            source=SimpleNamespace(chat_type="group", chat_id="any-group"),
            text=text, reply_expected=reply_expected,
        )

    async def test_unaddressed_wake_permits_silence(self):
        event = self.group_event("we are expecting a baby, what now?", None)
        self.assertIsNone(await plugin._on_message(event))
        self.assertIs(event.reply_expected, False)

    async def test_unaddressed_question_in_open_window_permits_silence(self):
        await plugin._on_message(self.group_event("we are expecting a baby", None))
        event = self.group_event("is it raining?", None)
        self.assertIsNone(await plugin._on_message(event))
        self.assertIs(event.reply_expected, False)

    async def test_addressed_message_still_expects_reply(self):
        event = self.group_event("UKK, what do we register first?", True)
        self.assertIsNone(await plugin._on_message(event))
        self.assertIs(event.reply_expected, True)

    async def test_skipped_message_is_left_unchanged(self):
        event = self.group_event("lunch?", None)
        self.assertEqual((await plugin._on_message(event))["action"], "skip")
        self.assertIsNone(event.reply_expected)


if __name__ == "__main__":
    unittest.main()
