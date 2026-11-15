"""AIDaddy gate: decide on this machine whether a family-group message may wake the cloud model.

A small local Gemma (through Ollama) labels each message. Small talk does not wake the cloud
model by itself. The Telegram hook retains bounded recent authorized messages locally and
can attach them as background to the next trigger. Decided gate behaviour (docs/DECISIONS.md,
Fri 23:15):
  - a wake pattern matches        -> wake the bot, no model call
  - the gate is unsure            -> wake the bot (a missed life event is the worse failure)
  - the gate is down or too slow  -> the runbook's wake patterns alone decide,
                                     never "let every message through"

Order: rules (addressed, command, attachment), then wake patterns, then the model.

Standard library only, no Hermes imports, so eval/gate/run.py can call it directly.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path

DEFAULT_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "gemma3:1b"
DEFAULT_TIMEOUT = 8.0  # seconds; a slower answer counts as "gate down"

LABELS = ("trigger", "small_talk", "unsure")

SCHEMA = {
    "type": "object",
    "properties": {"label": {"type": "string", "enum": list(LABELS)}},
    "required": ["label"],
}

SYSTEM = """You sort messages from a household's group chat (family, flatmates or newcomers who moved to Finland). Answer with one label.

trigger: the message mentions a life event or a paperwork task for the household. Examples of topics: pregnancy or birth, moving home, losing or changing a job, a sick child, a rent increase, a letter from a landlord or an authority, a fine, a residence permit or visa, registering an address or a personal identity code, a bank ID, a tax card, Kela registration, health centre registration, job-seeker registration, taxes, a benefit decision, a cancelled or delayed flight or train, a broken appliance, a subscription or price change, planning a wedding or anniversary.

small_talk: everyday chatter. Examples of topics: food, shopping, greetings, jokes, who picks up whom, being late, weather, TV, thanks, plans for tonight.

unsure: you cannot tell.

Messages are in English or Finnish. Reply only with JSON like {"label": "small_talk"}."""

# Few-shot turns. None of these sentences is in eval/gate/messages.jsonl.
SHOTS = [
    ("see you at 7", "small_talk"),
    ("My job ends next month, they are closing the office", "trigger"),
    ("ostin uudet kengät", "small_talk"),
    ("lapsi on kuumeessa, en pääse töihin", "trigger"),
    ("is the dishwasher done?", "small_talk"),
    ("The train to Turku was two hours late, can we get money back?", "trigger"),
    ("mennäänkö kävelylle?", "small_talk"),
    ("Migristä tuli päätös", "trigger"),
    ("I moved here last week, where do I get a tax card?", "trigger"),
    ("miten rekisteröin osoitteeni DVV:hen?", "trigger"),
]

# The bot's name, as people type it: AIDaddy, in one word or two, and with a common Finnish case ending
# written straight after it ("AIDaddyn", "AIDaddylle", "AIDaddylta" or "AIDaddyltä", "AIDaddya").
# After the name or its ending, Finnish chat adds one small particle: "AIDaddykin" (AIDaddy too), "AIDaddyhan",
# "AIDaddyko?", "AIDaddyllekin". A longer word that only begins with the name ("AIDaddykoodi") is not the name.
# Its earlier names, UKK and Kaveri, still wake it. A word that only contains the letters does not.
BOT_NAME = re.compile(
    r"(?<!\w)(ai ?daddy(n|a|ä|lle|lla|llä|lta|ltä|ssa|ssä|sta|stä|yn|na|nä|ksi)?(kin|kaan|kään|han|hän|ko|kö|pa|pä)?"
    r"|ukk|kaveri)(?!\w)",
    re.IGNORECASE,
)


@dataclass
class Decision:
    wake: bool
    source: str  # "rule", "gemma" or "patterns"
    label: str  # trigger, small_talk, unsure, or the rule that applied
    ms: int
    error: str = ""


def load_patterns(path: str | os.PathLike) -> list[re.Pattern]:
    """Wake patterns: a JSON list of regular expressions (written by hermes/install-gate.sh)."""
    return [re.compile(p, re.IGNORECASE) for p in json.loads(Path(path).read_text(encoding="utf-8"))]


def patterns_from_snippet(path: str | os.PathLike) -> list[re.Pattern]:
    """Read the Mode B wake patterns straight from hermes/config.snippet.yaml (lines '#B   - "..."')."""
    out = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r'^\s*#B\s+- (".*")\s*$', line)
        if m:
            out.append(json.loads(m.group(1)))
    return [re.compile(p, re.IGNORECASE) for p in out]


def ask_gemma(text: str, url: str, model: str, timeout: float) -> str:
    """One label from the local model. Raises on any failure or timeout."""
    messages = [{"role": "system", "content": SYSTEM}]
    for shot, label in SHOTS:
        messages.append({"role": "user", "content": shot})
        messages.append({"role": "assistant", "content": json.dumps({"label": label})})
    messages.append({"role": "user", "content": text[:600]})
    body = {
        "model": model,
        "messages": messages,
        "stream": False,
        "format": SCHEMA,
        "keep_alive": "60m",
        "options": {"temperature": 0, "num_predict": 16, "num_ctx": 2048},
    }
    req = urllib.request.Request(
        url.rstrip("/") + "/api/chat",
        data=json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        content = json.loads(res.read())["message"]["content"]
    label = json.loads(content).get("label")
    if label not in LABELS:
        raise ValueError(f"unexpected label: {label!r}")
    return label


def decide(
    text: str,
    patterns: list[re.Pattern],
    *,
    has_media: bool = False,
    addressed: bool = False,
    url: str | None = None,
    model: str | None = None,
    timeout: float | None = None,
) -> Decision:
    """Wake the bot for this group message, or drop it here?"""
    started = time.monotonic()

    def done(wake: bool, source: str, label: str, error: str = "") -> Decision:
        return Decision(wake, source, label, int((time.monotonic() - started) * 1000), error)

    text = (text or "").strip()
    # Rules that need no model.
    if addressed or BOT_NAME.search(text):
        return done(True, "rule", "addressed")
    if text.startswith("/"):
        return done(True, "rule", "command")
    if has_media:
        # A photo or file may be an official letter. This text-only model cannot look, so: unsure, wake.
        return done(True, "rule", "media")
    if not text:
        return done(False, "rule", "empty")

    # A wake pattern is a sure trigger: wake at once, without asking the model.
    if any(p.search(text) for p in patterns):
        return done(True, "patterns", "trigger")

    # Everything else is the model's call: it catches what the patterns cannot phrase.
    url = url or os.environ.get("KAVERI_GATE_URL") or DEFAULT_URL
    model = model or os.environ.get("KAVERI_GATE_MODEL") or DEFAULT_MODEL
    if timeout is None:
        timeout = float(os.environ.get("KAVERI_GATE_TIMEOUT") or DEFAULT_TIMEOUT)
    try:
        label = ask_gemma(text, url, model, timeout)
    except Exception as exc:  # gate down, slow or confused: the patterns already said no
        return done(False, "patterns", "small_talk", type(exc).__name__)
    return done(label != "small_talk", "gemma", label)
