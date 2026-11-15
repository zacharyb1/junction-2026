"""Require the sourced plan before Telegram's next-action clarification.

Pinned Hermes invokes post_api_request before staging interim assistant text and
running pre_tool_call. A matching tool request therefore establishes that the
plan reached the interim path. Telegram's native clarify flush handles transport
ordering; this guard neither claims delivery nor posts another copy of the plan.
"""
from collections import OrderedDict
import json
import re
import threading
import time
from urllib.parse import urlsplit


_MAX_TURNS = 1024
_TTL_SECONDS = 3600
_MAX_RESULT_CHARS = 256_000
_MAX_CONTENT_CHARS = 64_000
_BLOCK = (
    "Before asking next actions, emit the completed research_case plan lines verbatim "
    "(including citation numbers) and the exact Case URL as visible assistant text "
    "alongside your next tool call. Then call clarify. Do not put the plan only in "
    "tool arguments or wait for the family's reply before showing it."
)


def _normalize(text):
    return " ".join(text.translate(str.maketrans("", "", "*`_")).split())


def _case_plan(result):
    # Hermes renders MCP text as JSON {"result": "<JSON ResearchResult>"}.
    for _ in range(3):
        if isinstance(result, str):
            if len(result) > _MAX_RESULT_CHARS:
                return None
            try:
                result = json.loads(result)
            except (ValueError, TypeError):
                return None
        if not isinstance(result, dict) or result.get("error") or result.get("isError"):
            return None
        if "plan" in result:
            url, lines = result.get("url"), result.get("plan")
            if not isinstance(url, str) or len(url) > 2048:
                return None
            try:
                parsed = urlsplit(url)
            except ValueError:
                return None
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                return None
            if (not isinstance(lines, list) or not 1 <= len(lines) <= 5
                    or any(not isinstance(line, str) or not line.strip() or len(line) > 2000 for line in lines)):
                return None
            return url, tuple(_normalize(line) for line in lines)
        result = result.get("result")
    return None


def _visible(text):
    try:
        from agent.history_commentary import visible_commentary
    except ImportError:
        # Host-only checks need no Hermes install. Never count tagged reasoning.
        return "" if "<" in text else text
    return visible_commentary(text)


class PlanOrder:
    def __init__(self, ctx):
        self.ctx = ctx
        self.turns = OrderedDict()
        self.lock = threading.Lock()

    def _key(self, session_id, turn_id):
        if (not isinstance(session_id, str) or not session_id.strip()
                or not isinstance(turn_id, str) or not turn_id.strip()):
            return None
        try:
            return (session_id, turn_id) if self.ctx.session_surface() == "telegram" else None
        except Exception:
            return None

    def _prune(self):
        now = time.monotonic()
        while self.turns and next(iter(self.turns.values()))["at"] + _TTL_SECONDS <= now:
            self.turns.popitem(last=False)

    def after_tool(self, tool_name, result=None, status=None, session_id="", turn_id="", **kwargs):
        if tool_name != "mcp__casefile__research_case" or status != "ok":
            return None
        key = self._key(session_id, turn_id)
        plan = _case_plan(result) if key else None
        if not plan:
            return None
        with self.lock:
            self._prune()
            self.turns.pop(key, None)
            while len(self.turns) >= _MAX_TURNS:
                self.turns.popitem(last=False)
            self.turns[key] = {"at": time.monotonic(), "url": plan[0], "lines": plan[1],
                               "shown": False, "candidate": None}
        return None

    def after_response(self, response=None, session_id="", turn_id="", api_request_id="", **kwargs):
        key = self._key(session_id, turn_id)
        if not key or not isinstance(api_request_id, str) or not api_request_id:
            return None
        message = response.get("assistant_message") if isinstance(response, dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        with self.lock:
            self._prune()
            state = self.turns.get(key)
            if not state or state["shown"]:
                return None
            state["candidate"] = None
            if not isinstance(content, str) or len(content) > _MAX_CONTENT_CHARS or not message.get("tool_calls"):
                return None
            visible = _visible(content)
            normalized = _normalize(visible)
            # The whole URL must be present, not a different Case with this URL as a prefix.
            urls = {url.rstrip(".,;:!?)>]}") for url in re.findall(r"https?://[^\s<>\"']+", visible)}
            if state["url"] in urls and all(line in normalized for line in state["lines"]):
                state["candidate"] = api_request_id
        return None

    def before_tool(self, tool_name, session_id="", turn_id="", api_request_id="", **kwargs):
        key = self._key(session_id, turn_id)
        if not key:
            return None
        with self.lock:
            self._prune()
            state = self.turns.get(key)
            if not state:
                return None
            # A discarded response never reaches this matching tool boundary. Earlier
            # accepted commentary (e.g. beside memory) remains valid for this turn.
            if api_request_id and state["candidate"] == api_request_id:
                state["shown"] = True
            if tool_name == "clarify" and not state["shown"]:
                return {"action": "block", "message": _BLOCK}
        return None
