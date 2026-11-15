#!/usr/bin/env python3
"""Rehearse Telegram context with the real gate hook and pinned Hermes model.

The classifier, Engine tools and Telegram delivery are synthetic fixtures. This
checks that suppressed messages reach the real agent and that its research,
proposal and approval sequence uses them. It never starts a gateway or sends to
Telegram. Run in the pinned Hermes image with NVIDIA_API_KEY only.
"""
from __future__ import annotations

import argparse
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from types import SimpleNamespace
from unittest.mock import patch


CHAT = "-100101"
CASE_ID = "TESTTELEGRAMCONTEXT"
CASE_URL = "https://aidaddy.example/c/" + CASE_ID
CONTEXT = ["Home for us is Helsinki, Finland.", "It's just me and my partner, no children."]
TRIGGER = "We're moving to Tampere on 1 December 2026 and haven't checked what paperwork needs doing."
PLAN = "Prepare a written notice for your current landlord and review it before sending. [1]"


def not_now_response(questions: list[dict]) -> dict:
    """Answer a real offered choice; never invent an approval response."""
    assert questions, "The clarification has no questions."
    answers = {}
    for question in questions:
        labels = question.get("choices", [])
        offered = question.get("choices_offered", labels)
        assert isinstance(labels, list) and isinstance(offered, list), "Clarification choices must be lists."
        for label in labels + offered:
            assert isinstance(label, str), "Clarification choice is not text."
            assert not re.search(r"\b(?:send|sending|submit|submitting|pay|paying|book|booking|purchase|buy)\b|(?:^|\band\s+)file\b|^(?:email|contact|call|cancel|delete)\b", label, re.I), "Clarification offered an irreversible action."
        matches = [label for label in offered
                   if re.sub(r"\s*\(recommended\)\s*$", "", label, flags=re.I).strip().casefold() == "not now"]
        assert len(matches) == 1, "Clarification did not offer exactly one Not now choice."
        qid = question.get("qid")
        assert isinstance(qid, str) and qid and qid not in answers, "Clarification question IDs are missing or duplicated."
        answers[qid] = matches[0]
    return {"outcome": "submitted", "answers": answers}


def assert_move_facts(details: str) -> None:
    """Check semantic direction and the supplied date, including contradictions."""
    origin = r"\bfrom\s+helsinki\b|\b(?:current|present|existing|old|origin)(?:\s+(?:home|city|address|residence))?\s*(?:is|:|in)?\s*helsinki\b|\b(?:live|living|based|reside)\s+in\s+helsinki\b"
    destination = r"\bto\s+tampere\b|\b(?:destination|new)(?:\s+(?:home|city|place))?\s*(?:is|:|in)?\s*tampere\b"
    arrow = r"\bhelsinki\s*(?:→|->|to)\s*tampere\b"
    assert (re.search(origin, details) and re.search(destination, details)) or re.search(arrow, details), "Research lost the origin/destination roles."
    assert not re.search(r"\bfrom\s+tampere\b|\bto\s+helsinki\b|\btampere\s*(?:→|->)\s*helsinki\b", details), "Research contradicted the move direction."
    months = {name: index for index, name in enumerate(
        "january february march april may june july august september october november december".split(), 1)}
    months.update({name[:3]: number for name, number in list(months.items())})
    month_pattern = "|".join(months)
    dates = []
    for day, month, year in re.findall(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({month_pattern})\s+(\d{{4}})\b", details):
        dates.append((int(year), months[month], int(day)))
    for month, day, year in re.findall(rf"\b({month_pattern})\s+(\d{{1,2}})(?:st|nd|rd|th)?[,]?\s+(\d{{4}})\b", details):
        dates.append((int(year), months[month], int(day)))
    dates += [(int(year), int(month), int(day)) for year, month, day in re.findall(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b", details)]
    dates += [(int(year), int(month), int(day)) for day, month, year in re.findall(r"\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b", details)]
    assert dates and all(date == (2026, 12, 1) for date in dates), "Research omitted or changed the supplied move date."


def attached_drafts(event: dict) -> list:
    """A rejected malformed attempt is not proof that a draft was attached."""
    if event.get("kind") != "tool" or event.get("name") != "case_update" or event.get("succeeded") is False:
        return []
    payload = event.get("input")
    if not isinstance(payload, dict) or payload.get("id") != CASE_ID:
        return []
    changes = payload.get("patch")
    if not isinstance(changes, dict) or not set(changes) <= {"drafts", "log"}:
        return []
    logs, drafts = changes.get("log", []), changes.get("drafts", [])
    if not isinstance(logs, list) or not all(isinstance(item, dict) and item.get("kind") in ("read", "draft") for item in logs):
        return []
    if not isinstance(drafts, list) or not all(isinstance(item, dict) and item.get("kind") in ("letter", "email", "checklist")
            and isinstance(item.get("title"), str) and isinstance(item.get("body"), str) for item in drafts):
        return []
    return drafts


def assert_rehearsal(report: dict) -> None:
    """Reject evidence that only looks complete in a final transcript."""
    assert report["completed"], "The model did not complete the turn."
    assert all(message in report["trigger_prompt"] for message in CONTEXT), "Suppressed context was not delivered."
    assert report["gate_results"][:2] == ["skip", "skip"], "Earlier context was not suppressed."
    assert report["gate_results"][2] == "wake", "The ordinary moving message did not wake the bot."
    timeline = report["timeline"]
    research_at = next((i for i, event in enumerate(timeline)
                        if event["kind"] == "tool" and event["name"] == "research_case"), None)
    assert research_at is not None, "The agent never researched the life event."
    assert any(event["kind"] == "notification" for event in timeline[:research_at]), "Start notification arrived after research began."
    assert not any(event["kind"] == "interim" and event["text"].strip() for event in timeline[:research_at]), "The model duplicated the runtime's start acknowledgement."
    request = timeline[research_at]["input"]
    assert request.get("country", "").casefold() == "finland", "Country was not recovered from earlier context."
    details = " ".join(request.get(key, "") for key in ("situation", "region", "household")).casefold()
    assert "helsinki" in details and "tampere" in details, "Research omitted the earlier city or new destination."
    assert_move_facts(details)
    assert re.search(r"\b(partner|couple|(?:two|2) adults)\b", details), "Research omitted the household."
    assert re.search(r"\b(no|zero|0) (?:dependent )?(?:children|kids)\b|\bwithout children\b|\bchildless\b", details), "Research lost the no-children detail."
    unsupported_tenure = (
        r"\bfirst\s+(?:(?:one|two|\d+)\s+)?(?:years?|months?)\b"
        r"|\b(?:newcomers?|new arrivals?|recent arrivals?)\b"
        r"|\b(?:recently|newly)\s+(?:arrived|moved|immigrated|relocated)\b"
        r"|\b(?:arrived|immigrated)\s+(?:in|to)\s+finland\b"
        r"|\b(?:moved|relocated)\s+to\s+finland\b|\bnew\s+to\s+finland\b"
        r"|\b(?:lived|living|resided|residing|been)\s+in\s+finland\s+for\b"
        r"|\b(?:one|two|three|four|\d+)\s+(?:years?|months?)\s+in\s+finland\b"
    )
    assert not re.search(unsupported_tenure, details), "Research invented arrival or residency tenure not supplied by the household."
    assert len(report["drafts"]) == 1, "The unsolicited draft was not prepared exactly once."
    draft = report["drafts"][0]
    assert isinstance(draft, dict) and draft.get("kind") in ("letter", "email") \
        and isinstance(draft.get("title"), str) and isinstance(draft.get("body"), str) \
        and "landlord" in (draft["title"] + draft["body"]).casefold(), "The saved landlord draft is malformed."
    clarify_at = next((i for i, event in enumerate(timeline) if event["kind"] == "clarify"), None)
    assert clarify_at is not None, "The household was not offered a next action."
    for event in timeline:
        if event["kind"] == "clarify":
            not_now_response(event["questions"])
            assert not event.get("validation_error"), "Clarification could not be answered from its actual choices."
    assert not any(event["kind"] == "clarify" for event in timeline[:research_at]), "The agent asked for facts already in context."
    assert not report["premature_questions"], "The agent asked before preparing and presenting its proposal."
    # Older saved reports have no succeeded flag; their final fixture state still
    # proves a matching valid draft was saved. New reports record success explicitly.
    assert any(draft in attached_drafts(event) for event in timeline[research_at:clarify_at]), "The draft was not attached before the approval question."
    presented = "\n".join(event["text"] for event in timeline[:clarify_at] if event["kind"] == "interim")
    assert PLAN in presented and CASE_URL in presented, "The sourced Plan and Case link were not presented before the approval question."
    announcements = [event["text"].replace(PLAN, "").casefold() for event in timeline[:clarify_at]
                     if event["kind"] == "interim" and "draft" in event["text"].casefold()]
    assert any(re.search(r"\bsend(?:ing)?\b", text) and re.search(r"\b(wait|waits|review|approval|click)\b", text)
               for text in announcements), "The draft was not presented as awaiting review before sending."
    visible = presented + "\n" + report["final_response"]
    assert not re.search(r"\b(?:i(?:'ve| have)?|we(?:'ve| have)?|aidaddy)\s+(?:already\s+)?(?:sent|submitted|filed)\b|\b(?:draft|notice|letter|it)\s+(?:(?:was|has been)\s+)?(?:sent|submitted|filed)\b", visible.casefold()), "The agent claimed an irreversible action."
    assert report["final_response"].strip().casefold().rstrip(".! ") in ("okay", "ok"), "Not now was not acknowledged briefly."
    entries = report["memory"].split(report["memory_delimiter"])
    owned = [entry for entry in entries if f"Open case {CASE_ID}" in entry]
    assert len(owned) == 1 and CHAT in owned[0], "The new case lacks its own chat ownership label."


def load_plugin(repo: Path):
    path = repo / "hermes/plugins/kaveri-gate"
    spec = importlib.util.spec_from_file_location("telegram_context_rehearsal_gate", path / "__init__.py",
                                                submodule_search_locations=[str(path)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path("/workspace"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if any(key.startswith("TELEGRAM_") and value for key, value in os.environ.items()):
        parser.error("Use only the model credential, never Telegram configuration.")
    if not os.environ.get("NVIDIA_API_KEY"):
        parser.error("NVIDIA_API_KEY is required.")
    stamp = Path("/opt/hermes/install-stamp.json")
    if not stamp.is_file() or json.loads(stamp.read_text()).get("commit") != "3b421578588243f920886e6fe79a6faa87ea026e":
        parser.error("Run this rehearsal in the project's pinned Hermes v0.23.1 image.")
    home = Path(tempfile.mkdtemp(prefix="aidaddy-telegram-context-"))
    os.environ.update(HERMES_HOME=str(home), HERMES_NO_AUTO_UPDATE="1", HERMES_DISABLE_PORTAL="1")
    config = {
        "model": {"provider": "nvidia", "default": "nvidia/nemotron-3.5-super-vl-120b-a12b"},
        "skills": {"external_dirs": [str(args.repo / "hermes/skills")], "auto_load": ["life-event-butler"], "write_approval": True},
        "auxiliary": {"background_review": {"enabled": False}},
        "agent": {"reasoning_effort": "low"},
        "tools": {"tool_search": {"enabled": "off"}},
    }
    (home / "config.yaml").write_text(json.dumps(config))
    (home / "SOUL.md").write_text((args.repo / "hermes/SOUL.md").read_text())
    (home / "memories").mkdir()
    # Deliberately no country, city or household facts in persistent memory.
    (home / "memories/MEMORY.md").write_text(f"Privacy note already posted in Telegram chat {CHAT}.\n")
    (home / "memories/USER.md").write_text("")

    from gateway.config import Platform
    from gateway.platforms.event import MessageEvent
    from gateway.run_inbound import GatewayInboundMixin
    from gateway.session import SessionSource
    from run_agent import AIAgent
    from tools.memory_tool_store import ENTRY_DELIMITER
    from tools.registry import registry
    from toolsets import create_custom_toolset

    timeline, drafts, premature_questions = [], [], []
    hooks = {}

    class PluginContext:
        def register_hook(self, name, callback, **kwargs):
            hooks[name] = callback

        def session_surface(self):
            return "telegram"

        def post_message(self, text):
            timeline.append({"kind": "notification", "text": text})
            return SimpleNamespace(ok=True, pending=False, error=None)

    plugin = load_plugin(args.repo)
    plugin.register(PluginContext())
    plugin._PATTERNS = plugin.gate.patterns_from_snippet(args.repo / "hermes/config.snippet.yaml")
    source = SessionSource(platform=Platform.TELEGRAM, chat_id=CHAT, chat_type="group", thread_id="101",
                           user_id="111111", user_name="Test Person")
    gateway = SimpleNamespace(_is_user_authorized_for_source=lambda source: True,
                              config=SimpleNamespace(group_sessions_per_user=False, thread_sessions_per_user=False))

    async def build_trigger():
        results = []
        for i, text in enumerate(CONTEXT + [TRIGGER]):
            event = MessageEvent(text=text, source=source, message_id=str(i + 1), reply_expected=False,
                                 raw_message=SimpleNamespace(from_user=SimpleNamespace(is_bot=False)))
            with patch.object(plugin.gate, "ask_gemma", return_value="small_talk"):
                result = await hooks["pre_gateway_dispatch"](event, gateway=gateway)
            results.append("skip" if result and result.get("action") == "skip" else "wake")
        prompt = GatewayInboundMixin._prefix_inbound_sender_context(gateway, event, source, event.text)
        return results, prompt

    gate_results, prompt = asyncio.run(build_trigger())
    assert gate_results == ["skip", "skip", "wake"], gate_results
    assert all(message in prompt for message in CONTEXT), "The real gate hook did not retain prior context."
    evidence = [{"n": 1, "url": "https://authority.example/notice", "title": "Synthetic tenancy source",
                 "quote": "Give written notice to your landlord.", "verification": "verified"}]
    case = {"id": CASE_ID, "title": "Moving from Helsinki to Tampere", "summary": "Two adults without children move on 1 December 2026.",
            "steps": [{"title": "Give written notice to the current landlord", "detail": "Review the notice before sending.", "evidence": [1]}],
            "evidence": evidence, "drafts": drafts}
    research = {"id": CASE_ID, "url": CASE_URL, "title": case["title"], "plan": [PLAN], "evidence": evidence,
                "evidenceTotal": 1, "evidenceVerified": 1, "unverified": [], "openQuestions": []}

    def tool(name, payload):
        full = "mcp__casefile__" + name
        hooks["pre_tool_call"](tool_name=full, args=payload, session_id="synthetic-telegram-session",
                               turn_id="context-turn", tool_call_id=f"fixture-call-{len(timeline)}",
                               task_id="synthetic-telegram-task", api_request_id="synthetic-request", conversation_id=CHAT)
        entry = {"kind": "tool", "name": name, "input": payload, "succeeded": False}
        timeline.append(entry)
        if name == "research_case":
            entry["succeeded"] = True
            return json.dumps(research)
        assert payload.get("id") == CASE_ID, "The agent used an unrelated case."
        if name == "case_get":
            entry["succeeded"] = True
            return json.dumps(case)
        changes = payload.get("patch", {})
        assert isinstance(changes, dict), "The Case patch must be an object."
        assert set(changes) <= {"drafts", "log"}, "Unexpected Case modification."
        logs, proposed = changes.get("log", []), changes.get("drafts", [])
        assert isinstance(logs, list) and all(isinstance(item, dict) and item.get("kind") in ("read", "draft") for item in logs), "An irreversible action or malformed log was supplied."
        assert isinstance(proposed, list) and all(isinstance(item, dict) and item.get("kind") in ("letter", "email", "checklist")
            and isinstance(item.get("title"), str) and isinstance(item.get("body"), str) for item in proposed), "The draft must contain its title, kind and body."
        drafts.extend(proposed)
        entry["succeeded"] = True
        return json.dumps({"id": CASE_ID, "url": CASE_URL, "evidenceTotal": 1, "evidenceVerified": 1, "failed": []})

    specs = [
        ("research_case", "Research a life event and return a finished Case: sourced chat-ready plan, verified quotes and Case URL. Include the household's own words and context.",
         {"situation": {"type": "string"}, "country": {"type": "string"}, "region": {"type": "string"}, "language": {"type": "string"}, "household": {"type": "string"}}, ["situation", "country"]),
        ("case_get", "Read a stored Case including its verified sources.", {"id": {"type": "string"}}, ["id"]),
        ("case_update", "Attach a prepared draft or record reading/drafting on a Case. This never sends the draft.",
         {"id": {"type": "string"}, "patch": {"type": "object", "properties": {
             "drafts": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "kind": {"type": "string", "enum": ["email", "letter", "checklist"]}, "body": {"type": "string"}}, "required": ["title", "kind", "body"]}},
             "log": {"type": "array", "items": {"type": "object", "properties": {"kind": {"type": "string", "enum": ["read", "draft"]}, "trigger": {"type": "string", "enum": ["message"]}, "summary": {"type": "string"}}, "required": ["kind", "trigger", "summary"]}}
         }}}, ["id", "patch"]),
    ]
    names = []
    for name, description, properties, required in specs:
        full = "mcp__casefile__" + name
        names.append(full)
        registry.register(name=full, toolset="telegram_context_fixture", schema={"name": full, "description": description,
                          "parameters": {"type": "object", "properties": properties, "required": required}},
                          handler=lambda payload, name=name, **kwargs: tool(name, payload), check_fn=lambda: True)
    create_custom_toolset("telegram_context_fixture", "Synthetic Case tools for the Telegram context rehearsal", tools=names)

    def interim(text, **kwargs):
        timeline.append({"kind": "interim", "text": text})

    def clarify(questions):
        shown = "\n".join(item["text"] for item in timeline if item["kind"] == "interim")
        if not drafts or PLAN not in shown or CASE_URL not in shown:
            premature_questions.extend(questions)
        event = {"kind": "clarify", "questions": questions}
        timeline.append(event)
        try:
            response = not_now_response(questions)
        except AssertionError as error:
            event["validation_error"] = str(error)
            return {"outcome": "cancelled"}
        event.update(answer="Not now", answers=response["answers"])
        return response

    agent = AIAgent(provider="nvidia", base_url="https://integrate.api.nvidia.com/v1", api_key=os.environ["NVIDIA_API_KEY"],
                    model=config["model"]["default"], enabled_toolsets=["skills", "memory", "clarify", "telegram_context_fixture"],
                    max_iterations=9, quiet_mode=True, skip_context_files=True, load_soul_identity=True, skip_background_review=True,
                    platform="telegram", chat_id=CHAT, chat_type="group", user_id="111111", user_name="Test Person",
                    clarify_callback=clarify, interim_assistant_callback=interim, reasoning_config={"effort": "low"},
                    run_budget_seconds=120, cwd=str(args.repo))
    started = time.monotonic()
    result = agent.run_conversation(prompt, system_message=f"This is the controlled test household's Telegram chat {CHAT}.", conversation_history=[])
    report = {"scenario": "telegram-context", "limits": "Real gate-hook plumbing and Hermes model; synthetic gate classification, Engine results and Telegram delivery. No live Telegram or Exa claim.",
              "hermes_commit": json.loads(stamp.read_text())["commit"],
              "seconds": round(time.monotonic() - started, 1), "input_messages": CONTEXT + [TRIGGER], "gate_results": gate_results,
              "trigger_prompt": prompt, "timeline": timeline, "drafts": drafts, "premature_questions": premature_questions,
              "completed": bool(result.get("completed")), "final_response": result.get("final_response", ""),
              "memory": (home / "memories/MEMORY.md").read_text(), "memory_delimiter": ENTRY_DELIMITER}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    assert_rehearsal(report)
    report["passed"] = True
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"scenario": "telegram-context", "passed": True, "seconds": report["seconds"], "gate_results": gate_results,
                      "tools": [item["name"] for item in timeline if item["kind"] == "tool"], "output": str(args.output)}))


if __name__ == "__main__":
    main()
