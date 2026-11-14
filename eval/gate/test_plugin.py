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


if __name__ == "__main__":
    unittest.main()
