#!/usr/bin/env python3
"""Live-model smoke checks in a fresh Hermes home; never starts a gateway.

Run with the pinned Hermes image and NVIDIA_API_KEY only. Cases and phone calls below
are synthetic fixtures: this checks agent/tool sequencing, not Exa, Telegram delivery
or telephony. --repo may point to a candidate checkout to test its current persona.
"""
import argparse
import json
import os
from pathlib import Path
import tempfile
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scenario", choices=["routine", "specialist", "call", "collection"])
    parser.add_argument("--repo", type=Path, default=Path("/workspace"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if any(key.startswith("TELEGRAM_") and value for key, value in os.environ.items()):
        parser.error("Use only the model credential, never Telegram configuration.")
    if not os.environ.get("NVIDIA_API_KEY"):
        parser.error("NVIDIA_API_KEY is required.")
    home = Path(tempfile.mkdtemp(prefix="aidaddy-capability-"))
    os.environ["HERMES_HOME"] = str(home)
    os.environ["HERMES_NO_AUTO_UPDATE"] = "1"
    os.environ["HERMES_DISABLE_PORTAL"] = "1"
    calling = args.scenario in ("call", "collection")
    auto_load = [] if calling else ["routine-maker" if args.scenario == "routine" else "legal-desk"]
    config = {
        "model": {"provider": "nvidia", "default": "nvidia/nemotron-3.5-super-vl-120b-a12b"},
        "skills": {"external_dirs": [str(args.repo / "hermes/skills")], "auto_load": auto_load, "write_approval": True},
        "auxiliary": {"background_review": {"enabled": False}},
        "agent": {"reasoning_effort": "low"},
        "tools": {"tool_search": {"enabled": "off"}},
    }
    (home / "config.yaml").write_text(json.dumps(config))
    (home / "SOUL.md").write_text((args.repo / "hermes/SOUL.md").read_text())
    (home / "memories").mkdir()
    seed = [
        "Household -100101: Espoo, Finland. Privacy note posted.",
        "Legal -100101: deposit dispute with landlord, objection drafted, case TESTLEGAL",
        "Legal -100202: faulty purchase from shop, case OTHERCHAT",
        "Travel -100101: Helsinki trip, case TESTTRAVEL",
    ]
    if args.scenario == "routine":
        seed.append("Routines -100101: weekly lunch menu check 2")
    if calling:
        seed += ["Preferences -100101: usual dinner is vegetarian mushroom pizza, no olives, up to 15 euros.",
                 "Preferences -100202: usual dinner is pepperoni, up to 30 euros."]
    from tools.memory_tool_store import ENTRY_DELIMITER
    (home / "memories/MEMORY.md").write_text(ENTRY_DELIMITER.join(seed) + "\n")
    (home / "memories/USER.md").write_text("")
    questions, calls = [], []
    phase = ["proposal"]

    def clarify(items):
        questions.extend(items)
        return {"outcome": "submitted", "answers": {q["qid"]: "Yes, learn it." for q in items}}

    from run_agent import AIAgent
    if calling:
        from tools.registry import registry
        from toolsets import create_custom_toolset
        identifier = "DEMOabcdefghijklmnopqrst"
        proposal = {}
        notice = "Demo: the phone conversation is real. Any purchase, booking or payment discussed is simulated."

        def tool(name, payload):
            calls.append({"turn": phase[0], "tool": name, "input": payload})
            if name == "prepare_demo_call":
                proposal.update(payload)
                return json.dumps({**proposal, "id": identifier, "status": "proposed", "recipient": "our test recipient", "phoneEnding": "0101", "notice": notice,
                    "next": "Show this task and preferences, explain the demo, and wait for the person's confirmation. Do not start the call in this turn."})
            if name == "start_demo_call":
                assert phase[0] == "confirmed", "Agent tried to dial before a subsequent confirmation turn."
                assert payload.get("id") == identifier and payload.get("confirmed") is True
                return json.dumps({**proposal, "id": identifier, "status": "in_progress", "notice": notice,
                    "next": "Report actual status and use get_demo_call for the result."})
            assert payload.get("id") == identifier
            return json.dumps({**proposal, "id": identifier, "status": "finished", "outcome": "success", "notice": notice,
                "summary": "The test recipient accepted the requested details in the role-play. No purchase, booking or payment was made."})

        specs = [
            ("prepare_demo_call", "Prepare a real phone call to the configured test recipient for any everyday task or important update. Purchases/bookings/payments are role-play. Pass preferences from this chat. This does not dial. Wait for the person's next reply confirming the proposal; do not start in this turn.", {"task": {"type": "string"}, "preferences": {"type": "string"}}, ["task"]),
            ("start_demo_call", "Use only after the person replied Yes to the exact prepare_demo_call proposal in a subsequent turn. An initial request to call is not confirmation. Purchases/payments remain simulated.", {"id": {"type": "string"}, "confirmed": {"type": "boolean"}}, ["id", "confirmed"]),
            ("get_demo_call", "Read the provider status and conversation summary. After starting acknowledge dialing then call this with wait_seconds=60. Report finished only when returned. Explain that purchases/payments were simulated.", {"id": {"type": "string"}, "wait_seconds": {"type": "integer", "minimum": 0, "maximum": 60}}, ["id"]),
        ]
        names = []
        for name, description, properties, required in specs:
            full = "mcp__casefile__" + name
            names.append(full)
            registry.register(name=full, toolset="casefile_fixture", schema={"name": full, "description": description,
                "parameters": {"type": "object", "properties": properties, "required": required}},
                handler=lambda payload, name=name, **kw: tool(name, payload), check_fn=lambda: True)
        create_custom_toolset("casefile_fixture", "Synthetic demo-call test tools", tools=names)

    agent = AIAgent(
        provider="nvidia", base_url="https://integrate.api.nvidia.com/v1", api_key=os.environ["NVIDIA_API_KEY"],
        model=config["model"]["default"], enabled_toolsets=["skills", "memory", "clarify"] + (["casefile_fixture"] if calling else []),
        max_iterations=9, quiet_mode=True, skip_context_files=True, load_soul_identity=True, skip_background_review=True,
        platform="telegram", chat_id="-100101", chat_type="group", user_id="111111", user_name="Test Person",
        clarify_callback=clarify if not calling else None, reasoning_config={"effort": "low"}, run_budget_seconds=120,
        cwd=str(args.repo),
    )
    if args.scenario == "routine":
        message = "AIDaddy, thanks, that weekly lunch menu check is finished."
        history = [{"role": "user", "content": "AIDaddy, check the school lunch menu for next week as usual."},
                   {"role": "assistant", "content": "I checked the menu. Monday is vegetable soup, Tuesday is pasta. The weekly lunch menu check is complete."}]
        system = "Controlled test household. The previous assistant response describes a completed task with a successful web search, not a one-line answer. This is the third weekly lunch menu check for Telegram chat -100101. Follow routine-maker now; the callback represents the test person answering your question."
    elif args.scenario == "specialist":
        message = "AIDaddy, the landlord returned my deposit. This legal matter is finished. Remove the legal desk memory for this chat."
        history = []
        system = "Controlled test household. The legal case has already been closed and its open-case entry removed by the test fixture. Only the legal desk memory remains to be cleaned up. This is Telegram chat -100101."
    else:
        message = "AIDaddy, call and order my usual dinner." if args.scenario == "call" else "AIDaddy, call and arrange collection of my broken washing machine for Friday morning."
        history = []
        system = "This is the controlled test household's Telegram chat -100101. The phone tools are available for a demo call."
    started = time.monotonic()
    result = agent.run_conversation(message, system_message=system, conversation_history=history)
    turns = [result]
    if calling:
        assert [c["tool"] for c in calls] == ["prepare_demo_call"], calls
        if args.scenario == "call":
            preference = calls[0]["input"].get("preferences", "").lower()
            assert "mushroom" in preference and "15" in preference and "pepperoni" not in preference, preference
        phase[0] = "confirmed"
        result = agent.run_conversation("Yes, call with those details.", system_message=system, conversation_history=result["messages"])
        turns.append(result)
    memory = (home / "memories/MEMORY.md").read_text()
    pending = list((home / "pending/skills").glob("*.json"))
    active = list((home / "skills").rglob("SKILL.md"))
    replies = [r.get("final_response", "") for r in turns]
    tool_names = [[t.get("function", {}).get("name") for m in r.get("messages", []) for t in m.get("tool_calls", [])] for r in turns]
    report = {"scenario": args.scenario, "seconds": round(time.monotonic() - started, 1), "replies": replies,
              "tools": tool_names, "tool_inputs": [[t.get("function", {}) for m in r.get("messages", []) for t in m.get("tool_calls", [])] for r in turns],
              "calls": calls, "questions": questions, "memory": memory,
              "pending_count": len(pending), "active_skill_count": len(active)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    assert all(r.get("completed") for r in turns), "Agent did not complete."
    assert "Legal -100202: faulty purchase from shop, case OTHERCHAT" in memory
    assert "Travel -100101: Helsinki trip, case TESTTRAVEL" in memory
    assert all("OTHERCHAT" not in reply and "-100202" not in reply for reply in replies), "Reply exposed another chat's memory."
    if args.scenario == "routine":
        assert len(questions) == 1 and len(pending) == 1 and not active
        assert "weekly lunch menu check sent" in memory
        assert "operator" in replies[-1].lower()
    elif args.scenario == "specialist":
        assert "Legal -100101:" not in memory
        assert "TESTTRAVEL" not in replies[-1]
    else:
        assert [c["tool"] for c in calls] == ["prepare_demo_call", "start_demo_call", "get_demo_call"], calls
        assert calls[-1]["input"].get("wait_seconds") == 60
        assert any(word in replies[-1].lower() for word in ("simulat", "role-play", "rehearsal")), replies[-1]
    print(json.dumps({"scenario": args.scenario, "passed": True, "seconds": report["seconds"], "tool_calls": tool_names, "fixture_calls": calls}))


if __name__ == "__main__":
    main()
