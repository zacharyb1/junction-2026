"""Best-effort Telegram research starts; the sourced reply is the completion notice.

Hermes v0.23.1 supplies stable session/turn IDs to pre_tool_call and routes
ctx.post_message only to that hook's bound conversation. No chat ID or secret is
read here. Delivery must not hold the research tool behind a slow Telegram send.
"""
from collections import OrderedDict
import contextvars
import logging
import threading
import time

from .plan_order import PlanOrder


logger = logging.getLogger("kaveri.lifecycle")
_WAIT_SECONDS = 1.0
_MAX_PENDING = 4
_MAX_TURNS = 1024
_TURN_TTL_SECONDS = 3600
_MESSAGES = {
    "mcp__casefile__research_case": (
        "I’m checking the official sources. I’ll post the plan here.",
        "Tarkistan viralliset lähteet. Lähetän suunnitelman tähän keskusteluun.",
    ),
    "mcp__casefile__find_products": (
        "I’m checking products and prices. I’ll post what I find here.",
        "Tarkistan tuotteet ja hinnat. Lähetän tulokset tähän keskusteluun.",
    ),
    "mcp__casefile__case_recheck": (
        "I’m checking whether the case’s sources have changed. I’ll report back here.",
        "Tarkistan, ovatko asian lähteet muuttuneet. Kerron tulokset tässä keskustelussa.",
    ),
}


class _Notices:
    def __init__(self, ctx):
        self.ctx = ctx
        self.turns = OrderedDict()
        self.lock = threading.Lock()
        self.pending = threading.BoundedSemaphore(_MAX_PENDING)
        self.plan_order = PlanOrder(ctx)

    def before_tool(self, tool_name, args=None, session_id="", turn_id="", **kwargs):
        directive = self.plan_order.before_tool(tool_name, session_id=session_id, turn_id=turn_id, **kwargs)
        if directive is not None:
            return directive
        if tool_name not in _MESSAGES:
            return None
        if not isinstance(session_id, str) or not session_id.strip() or not isinstance(turn_id, str) or not turn_id.strip():
            return None
        try:
            if self.ctx.session_surface() != "telegram":
                return None
        except Exception:
            return None
        key, now = (session_id, turn_id), time.monotonic()
        with self.lock:
            while self.turns and next(iter(self.turns.values())) + _TURN_TTL_SECONDS <= now:
                self.turns.popitem(last=False)
            if key in self.turns:
                return None
            while len(self.turns) >= _MAX_TURNS:
                self.turns.popitem(last=False)
            # Claim the attempt, including ambiguous failures: never retry a late send.
            self.turns[key] = now
        if not self.pending.acquire(blocking=False):
            logger.warning("Research start notice skipped: delivery workers are occupied")
            return None

        message = _MESSAGES[tool_name][1 if isinstance(args, dict) and args.get("language") == "fi" else 0]
        finished = threading.Event()
        context = contextvars.copy_context()

        def send():
            try:
                result = self.ctx.post_message(message)
                if getattr(result, "ok", True) is False:
                    logger.warning("Research start notice was not confirmed delivered")
            except Exception:
                # Do not log the exception: a transport error can include private route data.
                logger.warning("Research start notice could not be delivered")
            finally:
                self.pending.release()
                finished.set()

        try:
            threading.Thread(target=context.run, args=(send,), name="aidaddy-research-notice", daemon=True).start()
        except Exception:
            self.pending.release()
            logger.warning("Research start notice worker could not start")
            return None
        # Usually delivery completes first. Past this bound the tool proceeds anyway;
        # Hermes owns its pending delivery and the plugin never declares it successful.
        finished.wait(_WAIT_SECONDS)
        return None


def register(ctx):
    notices = _Notices(ctx)
    ctx.register_hook("pre_tool_call", notices.before_tool)
    ctx.register_hook("post_tool_call", notices.plan_order.after_tool)
    ctx.register_hook("post_api_request", notices.plan_order.after_response)
