#!/usr/bin/env python3
"""Rehearse a bot scenario without typing into Telegram.

Feeds one message through the repo-local Hermes (same model, persona, skills and engine as the
Telegram bot) several times and records, per run: the reply, the seconds it took, the tools
called, and whether research_case was among them. Use it to see what varies between runs.

    python3 eval/bot/rehearse.py "I'm pregnant, due in May. We both work full time."
    python3 eval/bot/rehearse.py -n 3 "Our flight to London tomorrow got cancelled"
    python3 eval/bot/rehearse.py -f eval/bot/scenarios.txt        # one message per line, # for comments
    python3 eval/bot/rehearse.py --memory "" "hello"              # start with an empty memory

What it is not: a group test. This is Hermes' local chat, which counts as a direct chat, so the
bot always answers and the silence rule and the gate are not exercised. A question the bot asks
with buttons cannot be answered here, so the household is seeded into memory by default.

Runs use a Hermes profile of their own ("rehearse", inside .hermes-local/home/profiles/) whose
memory is reset before every run, so runs share nothing with each other or with the live bot.
It may run while the bot is running. The profile holds no Telegram token.
Results: eval/results/rehearse-<time>.json. Needs: hermes/setup-local.sh, secrets and configure done,
and the engine reachable (bash hermes/start.sh starts a local one).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCAL = Path(os.environ.get("KAVERI_HERMES_LOCAL") or ROOT / ".hermes-local")
HOME = LOCAL / "home"
BIN = LOCAL / "agent" / ".hermes" / "bin" / "hermes"
DEFAULT_MEMORY = (
    "Local chat household: lives in Espoo, Finland. Two adults, Anna and Mikko, both employees, "
    "both residents of Finland. Privacy note already posted in this chat."
)


PROFILE = "rehearse"
PROFILE_HOME = HOME / "profiles" / PROFILE
WRAPPER = ROOT / "hermes" / "bin" / "hermes"


def prepare_profile() -> None:
    """A Hermes profile of its own: same config, persona and keys, separate memory and sessions."""
    if not PROFILE_HOME.exists():
        subprocess.run([str(WRAPPER), "profile", "create", PROFILE, "--clone"], check=True, capture_output=True, stdin=subprocess.DEVNULL)
    for name in ("config.yaml", "SOUL.md"):
        shutil.copy2(HOME / name, PROFILE_HOME / name)
    # Keys without the Telegram lines: only one process may poll a bot token, and it is the live bot.
    lines = (HOME / ".env").read_text(encoding="utf-8").splitlines()
    env_file = PROFILE_HOME / ".env"
    env_file.write_text("\n".join(ln for ln in lines if not ln.startswith("TELEGRAM_")) + "\n", encoding="utf-8")
    os.chmod(env_file, 0o600)


def run_once(message: str, memory: str, timeout: int) -> dict:
    (PROFILE_HOME / "memories").mkdir(parents=True, exist_ok=True)
    (PROFILE_HOME / "memories" / "MEMORY.md").write_text((memory + "\n") if memory else "", encoding="utf-8")

    started = time.monotonic()
    output, error = "", ""
    try:
        proc = subprocess.run(
            [str(WRAPPER), "-p", PROFILE, "chat", "--oneshot", "-q", message],
            env={**os.environ, "NO_COLOR": "1"}, capture_output=True, text=True, timeout=timeout, stdin=subprocess.DEVNULL,
        )
        output = proc.stdout
        if proc.returncode != 0:
            error = f"exit {proc.returncode}: {proc.stderr.strip()[-300:]}"
    except subprocess.TimeoutExpired as exc:
        output = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        error = f"timed out after {timeout} s"
    seconds = round(time.monotonic() - started, 1)

    reply, tools = "", []
    found = re.search(r"^Session:\s+(\S+)", output, flags=re.M)
    if found:
        try:
            db = sqlite3.connect(f"file:{PROFILE_HOME / 'state.db'}?mode=ro", uri=True)
            rows = db.execute(
                "select role, content, tool_name from messages where session_id = ? order by rowid", (found.group(1),)
            ).fetchall()
            db.close()
            tools = [name for role, _, name in rows if role == "tool" and name]
            texts = [content for role, content, _ in rows if role == "assistant" and content and str(content).strip()]
            reply = "\n\n".join(str(t).strip() for t in texts)
        except sqlite3.Error as exc:
            error = error or f"cannot read the session: {exc}"
    elif not error:
        error = "no session id in the output"

    result = {
        "message": message,
        "seconds": seconds,
        "researchCase": any(t.endswith("research_case") for t in tools),
        "tools": tools,
        "planLines": len(re.findall(r"\[\d+\]\s*$", reply, flags=re.M)),
        "caseLink": bool(re.search(r"https?://\S+/c/[\w-]+", reply)),
        "offersToSend": bool(re.search(r"\b(send (it|the \w+) for you|shall i send|want me to send|send the (letter|notice|email)\b(?! yoursel))", reply, flags=re.I)),
        "reply": reply,
        "error": error,
    }
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Rehearse bot scenarios through the repo-local Hermes.")
    ap.add_argument("message", nargs="*", help="the message to send (or use -f)")
    ap.add_argument("-f", "--file", help="file with one message per line")
    ap.add_argument("-n", "--runs", type=int, default=3, help="runs per message (default 3)")
    ap.add_argument("--memory", default=DEFAULT_MEMORY, help="what the bot already knows; '' for nothing")
    ap.add_argument("--timeout", type=int, default=240, help="seconds per run")
    args = ap.parse_args()

    if not BIN.exists():
        print("Hermes is not installed. Run: bash hermes/setup-local.sh", file=sys.stderr)
        return 1
    messages = [" ".join(args.message)] if args.message else []
    if args.file:
        lines = Path(args.file).read_text(encoding="utf-8").splitlines()
        messages += [ln.strip() for ln in lines if ln.strip() and not ln.lstrip().startswith("#")]
    if not messages:
        ap.error("give a message or -f FILE")

    prepare_profile()
    results = []
    for message in messages:
        print(f"\n== {message}")
        for i in range(args.runs):
            r = run_once(message, args.memory, args.timeout)
            results.append({"run": i + 1, **r})
            flags = [
                "research_case" if r["researchCase"] else "NO research_case",
                f"{r['planLines']} plan lines",
                "case link" if r["caseLink"] else "no case link",
            ]
            if r["offersToSend"]:
                flags.append("OFFERS TO SEND")
            if r["error"]:
                flags.append("ERROR " + r["error"])
            print(f"  run {i + 1}: {r['seconds']:6.1f} s  " + ", ".join(flags))
            first = r["reply"].strip().splitlines()[0] if r["reply"].strip() else "(no reply)"
            print(f"         first line: {first[:110]}")

    out = ROOT / "eval" / "results" / f"rehearse-{time.strftime('%Y%m%dT%H%M%S')}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
