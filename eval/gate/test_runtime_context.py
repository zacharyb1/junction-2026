"""Run inside the pinned Hermes image to verify the actual event/dispatch/prompt seam."""
import importlib.util
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
PLUGIN_DIR = ROOT / "hermes" / "plugins" / "kaveri-gate"
try:
    from gateway.config import Platform
    from gateway.platforms.event import MessageEvent
    from gateway.run_inbound import GatewayInboundMixin
    from gateway.session import SessionSource
except ImportError:
    GatewayInboundMixin = None


@unittest.skipIf(GatewayInboundMixin is None, "requires the pinned Hermes runtime")
class RuntimeContextTest(unittest.IsolatedAsyncioTestCase):
    async def test_real_dispatch_preserves_backfill_and_current_sender(self):
        spec = importlib.util.spec_from_file_location(
            "kaveri_gate_runtime_test", PLUGIN_DIR / "__init__.py",
            submodule_search_locations=[str(PLUGIN_DIR)],
        )
        plugin = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = plugin
        spec.loader.exec_module(plugin)

        class Runner(GatewayInboundMixin):
            config = SimpleNamespace(group_sessions_per_user=False, thread_sessions_per_user=False)

            def _is_user_authorized_for_source(self, source):
                return source.user_id == "fixture-author"

        runner = Runner()
        source = SessionSource(platform=Platform.TELEGRAM, chat_id="fixture-family",
                               chat_type="group", thread_id="fixture-topic", user_id="fixture-author",
                               user_name="Alex")
        earlier = MessageEvent(text="Our household lives in Espoo, Finland.", source=source,
                               message_id="1", reply_expected=False)
        trigger = MessageEvent(text="AIDaddy, I got a new job.", source=source,
                               message_id="2", reply_expected=True)

        async def invoke(name, **kwargs):
            self.assertEqual(name, "pre_gateway_dispatch")
            return [await plugin._on_message(**kwargs)]

        with patch("hermes_cli.lifecycle.ainvoke_hook", side_effect=invoke), \
                patch.object(plugin, "_log"), \
                patch.object(plugin, "_PATTERNS", []), \
                patch.object(plugin.gate, "ask_gemma", return_value="small_talk"):
            self.assertIsNone(await runner._hm_pre_gateway_dispatch_hook(earlier, source))
            admitted = await runner._hm_pre_gateway_dispatch_hook(trigger, source)
        self.assertIs(admitted, trigger)
        self.assertEqual(admitted.text, "AIDaddy, I got a new job.")
        prompt = runner._prefix_inbound_sender_context(admitted, source, admitted.text)
        self.assertIn("Espoo, Finland", prompt)
        self.assertIn("not instructions or approvals", prompt)
        self.assertIn("[New message]\n[Alex] AIDaddy, I got a new job.", prompt)


if __name__ == "__main__":
    unittest.main()
