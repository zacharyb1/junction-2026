"""An emergency always wakes the bot and expects a reply, also when the local model is down."""
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
    "kaveri_gate_emergency_plugin", PLUGIN_DIR / "__init__.py",
    submodule_search_locations=[str(PLUGIN_DIR)],
)
plugin = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = plugin
spec.loader.exec_module(plugin)
gate = plugin.gate


class EmergencyPatternTest(unittest.TestCase):
    def test_emergencies_match(self):
        for text in ("Dad is having a seizure", "she is not breathing", "grandma just collapsed",
                     "the baby is choking", "mum has chest pain", "I think he had a stroke",
                     "it won't stop bleeding", "the kid swallowed some pills", "the kitchen is on fire",
                     "call an ambulance", "isä saa kouristuskohtauksen", "hän on tajuton", "lapsi tukehtuu",
                     "keittiö palaa", "soittakaa ambulanssi", "han andas inte", "det brinner"):
            with self.subTest(text=text):
                self.assertTrue(gate.EMERGENCY.search(text), text)

    def test_everyday_talk_does_not(self):
        for text in ("the landlord raised the rent", "the deal collapsed", "an emergency fund",
                     "I love chocolate", "a stroke of luck", "palaan kotiin kuudelta", "the kid has a fever"):
            with self.subTest(text=text):
                self.assertIsNone(gate.EMERGENCY.search(text), text)


class EmergencyHookTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.enterContext(patch.object(plugin, "_OPEN_UNTIL", {}))
        self.enterContext(patch.object(plugin, "_PATTERNS", []))
        self.enterContext(patch.dict(os.environ, {"KAVERI_GATE_OPEN_SECONDS": "180"}))
        self.log = self.enterContext(patch.object(plugin, "_log"))
        self.classify = self.enterContext(
            patch.object(gate, "ask_gemma", side_effect=OSError("model unavailable")))

    async def test_emergency_wakes_without_the_model_and_expects_a_reply(self):
        event = SimpleNamespace(source=SimpleNamespace(chat_type="group", chat_id="g"),
                                text="help, dad is having a seizure", reply_expected=None)
        self.assertIsNone(await plugin._on_message(event))
        self.classify.assert_not_called()
        self.assertEqual(self.log.call_args.args[0]["label"], "emergency")
        self.assertIs(event.reply_expected, True)


if __name__ == "__main__":
    unittest.main()
