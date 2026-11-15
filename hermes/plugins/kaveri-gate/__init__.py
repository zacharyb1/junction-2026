"""AIDaddy gate, the Hermes side: a pre_gateway_dispatch hook around gate.decide().

Group messages only. Direct messages always reach the bot. Install with hermes/install-gate.sh.
The next Telegram trigger receives bounded recent authorized context from its own chat/topic;
the pending buffer stays in memory, while delivered context joins normal conversation history.

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

from . import context, gate, lifecycle

logger = logging.getLogger("kaveri.gate")

_HERE = Path(__file__).resolve().parent
_PATTERNS = None
_OPEN_UNTIL: dict[context.Scope, float] = {}
_RECENT = context.RecentContext()


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
    if getattr(event, "internal", False):
        return None
    if context.is_bot(event):
        return {"action": "skip", "reason": "kaveri-gate:rule:bot"}
    can_collect = context.authorized(event, gateway)
    if gateway is not None and not can_collect:
        # This hook runs before Hermes authorizes native Telegram messages. Let the gateway
        # refuse them; they must not alter a family's pending context or its open window.
        return None
    chat = str(getattr(source, "chat_id", ""))
    scope = context.scope_for(source)
    text = getattr(event, "text", "") or ""
    now = time.monotonic()
    open_seconds = float(os.environ.get("KAVERI_GATE_OPEN_SECONDS") or 180)
    for key, until in list(_OPEN_UNTIL.items()):
        if until <= now:
            del _OPEN_UNTIL[key]
    command = context.control(text)
    if scope and command in {"reset", "forget"}:
        _RECENT.clear(scope, whole_chat=command == "forget")
        for key in list(_OPEN_UNTIL):
            if key == scope or (command == "forget" and key[:3] == scope[:3]):
                del _OPEN_UNTIL[key]

    receipt = None
    if can_collect and scope and scope[0] == "telegram" and not command:
        receipt = _RECENT.observe(scope, text, context.speaker_for(event), now,
                                  getattr(event, "message_id", None))

    if command == "forget":
        # The privacy request must reach the bot even when the local classifier is unavailable.
        decision = gate.Decision(True, "rule", "forget", 0)
    elif _OPEN_UNTIL.get(scope, 0) > now:
        decision = gate.Decision(True, "rule", "open_window", 0)
    else:
        decision = await asyncio.to_thread(
            gate.decide,
            text,
            _patterns(),
            has_media=bool(getattr(event, "media_urls", None)),
            # Telegram resolves actual bot mentions into this trusted event flag.
            addressed=(getattr(event, "reply_expected", None) is True
                       or bool(getattr(event, "reply_to_is_own_message", False))),
        )
    if decision.wake and decision.label != "open_window" and not command and open_seconds > 0 and scope:
        _OPEN_UNTIL[scope] = now + open_seconds
        while len(_OPEN_UNTIL) > context.MAX_SCOPES:
            del _OPEN_UNTIL[next(iter(_OPEN_UNTIL))]

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
        if scope and receipt is not None:
            previous = _RECENT.take_before(scope, receipt, time.monotonic())
            if previous:
                # Native Hermes field for history backfill: the trigger text, its sender, command
                # routing and approval response stay intact. Existing adapter context is preserved.
                existing = getattr(event, "channel_context", None)
                event.channel_context = f"{existing}\n\n{previous}" if existing else previous
        # Hermes drops a [SILENT] reply in a group only when reply_expected is False or the chat has
        # allow_silence. Telegram leaves an unaddressed question ("?") at None, which would turn a silent
        # decision into a visible notice in any group without allow_silence. Nobody addressed the bot,
        # so silence is a valid answer; the model still replies to a real trigger.
        if decision.label == "emergency":
            # An emergency must be answered: silence is not a valid reply, so Hermes posts what the model says.
            event.reply_expected = True
        elif getattr(event, "reply_expected", None) is None:
            event.reply_expected = False
        return None
    return {"action": "skip", "reason": f"kaveri-gate:{decision.source}:{decision.label}"}


def register(ctx) -> None:
    ctx.register_hook("pre_gateway_dispatch", _on_message)
    lifecycle.register(ctx)
