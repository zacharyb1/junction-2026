"""Kaveri gate, the Hermes side: a pre_gateway_dispatch hook around gate.decide().

Group messages only. Direct messages always reach the bot. Install with hermes/install-gate.sh.

Settings (environment, for example in the Hermes home .env):
  KAVERI_GATE_URL           Ollama address, default http://127.0.0.1:11434
  KAVERI_GATE_MODEL         default gemma3:1b
  KAVERI_GATE_TIMEOUT       seconds before the wake patterns decide instead, default 8
  KAVERI_GATE_OPEN_SECONDS  after a wake, the chat stays open to the bot this long, so answers
                            to its questions reach it. Default 180. 0 switches it off.
  KAVERI_GATE_LOG_TEXT      1 writes message text into the gate log (debugging only)

Log: <HERMES_HOME>/logs/kaveri-gate.jsonl, one line per group message: decision, source, label
and time taken. Message text is not logged unless asked for.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from pathlib import Path

from . import gate

logger = logging.getLogger("kaveri.gate")

_HERE = Path(__file__).resolve().parent
_PATTERNS = None
_OPEN_UNTIL: dict[str, float] = {}


def _patterns():
    global _PATTERNS
    if _PATTERNS is None:
        try:
            _PATTERNS = gate.load_patterns(_HERE / "wake_patterns.json")
        except Exception as exc:
            # No patterns means the fallback wakes on nothing. Say so loudly, once.
            logger.error("kaveri-gate: cannot load wake_patterns.json (%s). Run hermes/install-gate.sh", exc)
            _PATTERNS = []
    return _PATTERNS


def _log(entry: dict) -> None:
    try:
        home = Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes")
        path = home / "logs" / "kaveri-gate.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


async def _on_message(event, gateway=None, session_store=None, **kwargs):
    source = getattr(event, "source", None)
    if source is None or getattr(source, "chat_type", "dm") == "dm":
        return None
    chat = str(getattr(source, "chat_id", ""))
    text = getattr(event, "text", "") or ""
    now = time.time()
    open_seconds = float(os.environ.get("KAVERI_GATE_OPEN_SECONDS") or 180)

    if _OPEN_UNTIL.get(chat, 0) > now:
        decision = gate.Decision(True, "rule", "open_window", 0)
    else:
        decision = await asyncio.to_thread(
            gate.decide,
            text,
            _patterns(),
            has_media=bool(getattr(event, "media_urls", None)),
            addressed=bool(getattr(event, "reply_to_is_own_message", False)),
        )
    if decision.wake and decision.label != "open_window" and open_seconds > 0:
        _OPEN_UNTIL[chat] = now + open_seconds

    entry = {
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "chat": chat,
        "wake": decision.wake,
        "source": decision.source,
        "label": decision.label,
        "ms": decision.ms,
        "chars": len(text),
    }
    if decision.error:
        entry["error"] = decision.error
    if os.environ.get("KAVERI_GATE_LOG_TEXT") == "1":
        entry["text"] = text
    _log(entry)

    if decision.wake:
        return None
    return {"action": "skip", "reason": f"kaveri-gate:{decision.source}:{decision.label}"}


def register(ctx) -> None:
    ctx.register_hook("pre_gateway_dispatch", _on_message)
