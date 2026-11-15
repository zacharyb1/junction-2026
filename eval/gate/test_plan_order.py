"""Sourced plans precede next-action buttons through Hermes' registered hooks."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / "hermes/plugins/kaveri-gate"
SPEC = importlib.util.spec_from_file_location(
    "plan_order_test_plugin", FOLDER / "__init__.py", submodule_search_locations=[str(FOLDER)],
)
plugin = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = plugin
SPEC.loader.exec_module(plugin)

CASE = {
    "url": "https://cases.example/c/synthetic-move",
    "plan": ["Report the move within 7 days. [1]", "Use the official change-of-address form. [2]"],
    "evidenceVerified": 2,
}
PLAN = "Your plan is ready.\n- Report the move within 7 days. [1]\n- Use the official change-of-address form. [2]\nhttps://cases.example/c/synthetic-move"


class Context:
    def __init__(self):
        self.hooks = {}
        self.surface = "telegram"
        self.messages = []

    def register_hook(self, name, callback, **kwargs):
        self.hooks.setdefault(name, []).append(callback)

    def session_surface(self):
        return self.surface

    def post_message(self, text):
        self.messages.append(text)
        return SimpleNamespace(ok=True)

    def invoke(self, name, **kwargs):
        return [result for callback in self.hooks.get(name, ())
                if (result := callback(**kwargs)) is not None]


class PlanOrderTest(unittest.TestCase):
    def setUp(self):
        self.ctx = Context()
        plugin.register(self.ctx)

    def event(self, name, session="session-a", turn="turn-a", request="request-b", **kwargs):
        return self.ctx.invoke(name, session_id=session, turn_id=turn, api_request_id=request, **kwargs)

    def research(self, result=None, **kwargs):
        return self.event("post_tool_call", tool_name="mcp__casefile__research_case", args={},
                          result=json.dumps({"result": json.dumps(CASE)}) if result is None else result,
                          status="ok", **kwargs)

    def response(self, content, calls=None, **kwargs):
        return self.event("post_api_request", response={"assistant_message": {
            "content": content, "tool_calls": [{"function": {"name": "clarify"}}] if calls is None else calls,
        }}, **kwargs)

    def clarify(self, **kwargs):
        return self.event("pre_tool_call", tool_name="clarify", args={"questions": []}, **kwargs)

    def test_successful_research_requires_the_plan_before_next_actions(self):
        self.research()
        self.response("Would you like reminders?")
        result = self.clarify()
        self.assertEqual(len(result), 1, "Next-action buttons appeared before the sourced plan")
        self.assertEqual(result[0]["action"], "block")
        self.assertIn("assistant text", result[0]["message"])
        self.response(PLAN, request="request-c")
        self.assertEqual(self.clarify(request="request-c"), [])
        self.assertEqual(self.ctx.messages, [], "The ordering guard must not send duplicate plans")

    def test_earlier_plan_beside_memory_unlocks_later_clarification(self):
        self.research()
        self.response(PLAN)
        self.event("pre_tool_call", tool_name="memory", args={})
        self.response("Would you like reminders?", request="request-c")
        self.assertEqual(self.clarify(request="request-c"), [])

    def test_discarded_response_does_not_count_as_a_shown_plan(self):
        self.research()
        self.response(PLAN, request="discarded-request")
        self.assertEqual(self.clarify(request="next-request")[0]["action"], "block")
        self.response(PLAN, calls=[], request="next-request")
        self.assertEqual(self.clarify(request="next-request")[0]["action"], "block")

    def test_references_hidden_reasoning_and_tool_arguments_are_not_a_plan(self):
        self.research()
        for content in (CASE["url"], PLAN.replace("7 days", "8 days"),
                        PLAN.replace("[2]", ""), PLAN.replace(CASE["url"], CASE["url"] + "-other"),
                        "<think>" + PLAN + "</think>Would you like reminders?", ""):
            with self.subTest(content=content):
                self.response(content, calls=[{"function": {"name": "clarify", "arguments": PLAN}}])
                self.assertEqual(self.clarify()[0]["action"], "block")

    def test_whitespace_and_markdown_keep_the_exact_plan_valid(self):
        self.research()
        self.response(PLAN.replace("Report the move", "**Report**  the\nmove"))
        self.assertEqual(self.clarify(), [])

    def test_scope_and_failure_leave_unrelated_questions_available(self):
        self.assertEqual(self.clarify(), [], "Questions for missing facts precede research")
        self.research()
        self.assertEqual(self.clarify(session="another-family"), [])
        self.assertEqual(self.clarify(turn="another-turn"), [])
        for surface in ("api_server", "cli", "", None):
            self.ctx.surface = surface
            self.assertEqual(self.clarify(), [])
        self.ctx.surface = "telegram"
        for session, turn in (("", "turn-a"), ("session-a", ""), (None, "turn-a")):
            self.assertEqual(self.clarify(session=session, turn=turn), [])
        for index, (status, result) in enumerate((
                ("error", CASE), ("ok", {"error": "research failed"}),
                ("ok", {"isError": True, **CASE}), ("ok", {**CASE, "plan": []}),
                ("ok", "not a research result"))):
            turn = f"failed-{index}"
            self.event("post_tool_call", turn=turn, tool_name="mcp__casefile__research_case",
                       result=result, status=status)
            self.assertEqual(self.clarify(turn=turn), [])

    def test_a_new_research_result_requires_its_own_plan(self):
        self.research()
        self.response(PLAN)
        self.assertEqual(self.clarify(), [])
        self.research(result={**CASE, "url": "https://cases.example/c/another-case"})
        self.response(PLAN)
        self.assertEqual(self.clarify()[0]["action"], "block")

    def test_expired_and_evicted_turns_do_not_restrict_new_work(self):
        guard = sys.modules[plugin.__name__ + ".plan_order"]
        with patch.object(guard, "_MAX_TURNS", 2), patch.object(guard.time, "monotonic", return_value=100):
            self.research(turn="first")
            self.research(turn="second")
            self.research(turn="third")
            self.assertEqual(self.clarify(turn="first"), [])
            self.assertEqual(self.clarify(turn="third")[0]["action"], "block")
        with patch.object(guard.time, "monotonic", return_value=3701):
            self.assertEqual(self.clarify(turn="third"), [])


class NativePlanOrderTest(unittest.TestCase):
    def test_pinned_loader_mcp_result_and_veto_contract(self):
        try:
            from hermes_cli.plugins import PluginManager, _dispatch_pre_tool_call_hooks
            from gateway.session_context import clear_session_vars, set_session_vars
            from mcp.types import CallToolResult, TextContent
            from tools.mcp_tool_handlers import _render_call_tool_result
        except ModuleNotFoundError:
            self.skipTest("Run inside the pinned Hermes image for native hook integration")
        with tempfile.TemporaryDirectory(prefix="aidaddy-plan-order-") as temporary:
            home = Path(temporary)
            shutil.copytree(FOLDER, home / "plugins/kaveri-gate")
            (home / "config.yaml").write_text(json.dumps({"plugins": {"enabled": ["kaveri-gate"]}}))
            with patch.dict(os.environ, {"HERMES_HOME": str(home)}):
                manager = PluginManager(scope_key=str(home))
                manager.discover_and_load()
                loaded = manager._plugins["kaveri-gate"]
                self.assertFalse(loaded.error)
                expected = {"pre_gateway_dispatch", "pre_tool_call", "post_tool_call", "post_api_request"}
                self.assertEqual(set(loaded.manifest.provides_hooks), expected)
                self.assertEqual(set(loaded.hooks_registered), expected)
                tokens = set_session_vars(platform="telegram", chat_id="-100111", chat_type="group",
                                          session_key="synthetic-topic", session_id="synthetic-session")
                ids = {"session_id": "synthetic-session", "turn_id": "synthetic-turn", "api_request_id": "request"}
                try:
                    rendered = _render_call_tool_result(CallToolResult(
                        content=[TextContent(type="text", text=json.dumps(CASE))]), "casefile")
                    manager.invoke_hook("post_tool_call", tool_name="mcp__casefile__research_case",
                                        args={}, result=rendered, status="ok", **ids)
                    with patch("hermes_cli.plugins._delivery_manager", return_value=manager):
                        blocked, _ = _dispatch_pre_tool_call_hooks("clarify", {"questions": []}, **ids)
                        self.assertIn("assistant text", blocked)
                        manager.invoke_hook("post_api_request", response={"assistant_message": {
                            "content": PLAN, "tool_calls": [{"function": {"name": "clarify"}}],
                        }}, **ids)
                        blocked, _ = _dispatch_pre_tool_call_hooks("clarify", {"questions": []}, **ids)
                        self.assertIsNone(blocked)
                finally:
                    clear_session_vars(tokens)
                    manager.unload()


if __name__ == "__main__":
    unittest.main()
