#!/usr/bin/env bash
# AIDaddy: write our settings into the repo-local Hermes home. Safe to run again.
#
#   bash hermes/configure.sh                     the model, Part 1 of config.snippet.yaml, persona, skills
#   bash hermes/configure.sh --group <CHAT_ID>   Part 2: limit the bot to the family group (ID from /sethome)
#   bash hermes/configure.sh --open-groups       after --group: accept every group, keep the home group's settings
#   bash hermes/configure.sh --mode-b            switch to wake patterns (README, "Mode B")
#   bash hermes/configure.sh --mode-a            back to ambient mode
#
# Why each key is set: comments in hermes/config.snippet.yaml. Restart the gateway afterwards
# (bash hermes/stop.sh; bash hermes/start.sh) and send /new --yes in each chat.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
H="$ROOT/hermes/bin/hermes"
SKILLS_DIR="$ROOT/hermes/skills"
MODEL="${KAVERI_MODEL:-nvidia/nemotron-3.5-super-vl-120b-a12b}"
PROVIDER="${KAVERI_PROVIDER:-nvidia}"

# Admins are required even when everyone may chat with the bot. Validate before
# any config command so an incomplete setup cannot leave slash commands open.
# KAVERI_RUNTIME=web is the instance behind the /chat page: no Telegram, no admins, no memory, no jobs.
RUNTIME="${KAVERI_RUNTIME:-telegram}"
BOT_ENV="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}/home/.env"
OWNER=""
if [ "$RUNTIME" = web ]; then
  :
elif [ -f "$BOT_ENV" ]; then
  OWNER="$(sed -n 's/^TELEGRAM_ALLOWED_USERS=//p' "$BOT_ENV" | tail -n 1)"
fi
if [ "$RUNTIME" != web ] && [[ ! "$OWNER" =~ ^[[:space:]]*[1-9][0-9]*([[:space:]]*,[[:space:]]*[1-9][0-9]*)*[[:space:]]*$ ]]; then
  echo "ERROR: TELEGRAM_ALLOWED_USERS must contain comma-separated positive numeric Telegram user IDs. Admins are required even when TELEGRAM_ALLOW_ALL_USERS is enabled; no configuration was changed." >&2
  exit 1
fi
OWNER="$(printf '%s' "$OWNER" | tr -d '[:space:]')"

set_key() { "$H" config set "$1" "$2" >/dev/null && echo "  set $1"; }

case "${1:-}" in
  --group)
    CHAT_ID="${2:-}"
    case "$CHAT_ID" in -[0-9]*) ;; *) echo "usage: bash hermes/configure.sh --group -1001234567890" >&2; exit 2 ;; esac
    set_key platforms.telegram.gateway_restart_notification false
    set_key "platforms.telegram.channel_overrides.$CHAT_ID.allow_silence" true
    set_key telegram.allowed_chats "[\"$CHAT_ID\"]"
    set_key telegram.group_allowed_chats "[\"$CHAT_ID\"]"
    echo "Part 2 applied for chat $CHAT_ID. Restart the gateway, then send /new --yes in the group."
    exit 0 ;;
  --open-groups)
    # An empty allowed_chats is Hermes' "every group". Silence in the other groups relies on the
    # kaveri-gate hook marking unaddressed messages reply_expected=False (allow_silence is per chat ID).
    set_key telegram.allowed_chats ""
    echo "Every group is accepted. Restart the gateway."
    exit 0 ;;
  --mode-b)
    PATTERNS="[$(sed -n 's/^ *#B   - \(".*"\)$/\1/p' "$ROOT/hermes/config.snippet.yaml" | paste -sd, -)]"
    set_key telegram.mention_patterns "$PATTERNS"
    set_key telegram.require_mention true
    set_key telegram.observe_unmentioned_group_messages true
    set_key telegram.reactions true
    echo "Mode B (wake patterns) is on. Restart the gateway, then send /new --yes in the group."
    exit 0 ;;
  --mode-a)
    for key in telegram.require_mention telegram.observe_unmentioned_group_messages telegram.reactions telegram.mention_patterns; do
      "$H" config unset "$key" >/dev/null 2>&1 || true
    done
    echo "Mode A (ambient) is on. Restart the gateway, then send /new --yes in the group."
    exit 0 ;;
  "") ;;
  *) echo "usage: bash hermes/configure.sh [--group CHAT_ID | --open-groups | --mode-b | --mode-a]" >&2; exit 2 ;;
esac

echo "Model"
set_key model.provider "$PROVIDER"
set_key model.default "$MODEL"

echo "Part 1"
set_key web.backend exa
set_key mcp_servers.casefile.url '${CASEFILE_URL}'
set_key mcp_servers.casefile.headers.Authorization 'Bearer ${CASEFILE_SECRET}'
set_key mcp_servers.casefile.timeout 240
set_key mcp_servers.exa.url 'https://mcp.exa.ai/mcp?tools=web_search_advanced_exa,web_fetch_exa'
set_key mcp_servers.exa.headers.x-api-key '${EXA_API_KEY}'
set_key mcp_servers.exa.timeout 120
set_key mcp_servers.exa.supports_parallel_tool_calls true
set_key skills.external_dirs "[\"$SKILLS_DIR\"]"
set_key skills.auto_load '["life-event-butler", "letter-decoder", "deadline-keeper", "birthday-planner", "law-check", "gift-finder"]'
set_key skills.write_approval true
DISABLED='"terminal", "file", "code_execution", "browser", "computer_use", "delegation", "image_gen", "video_gen", "session_search"'
# On the web, strangers share one instance: no memory across visitors and no scheduled jobs.
[ "$RUNTIME" = web ] && DISABLED="$DISABLED, \"memory\", \"cronjob\""
set_key agent.disabled_toolsets "[$DISABLED]"
set_key agent.clarify_timeout 300
set_key agent.reasoning_effort low
set_key tools.tool_search.enabled off
set_key group_sessions_per_user false
set_key timezone Europe/Helsinki
set_key display.busy_input_mode queue
set_key display.busy_ack_enabled false
set_key display.memory_notifications off
if [ "$RUNTIME" != web ]; then
  set_key display.platforms.telegram.tool_progress off
  set_key display.platforms.telegram.interim_assistant_messages true
  set_key display.platforms.telegram.long_running_notifications false
fi
set_key auxiliary.background_review.enabled false
set_key cron.wrap_response false

if [ "$RUNTIME" = web ]; then
  # Bounds NVIDIA quota use by web visitors; the Telegram bot keeps the rest.
  set_key api_server.max_concurrent_runs 4
  # Anonymous visitors research, read and search shops; they cannot change, re-check or publish anyone's case.
  set_key mcp_servers.casefile.tools.include '["research_case", "case_get", "find_gifts"]'
else
  # Slash commands (/sethome, /new, /model ...) only for the owner. Without this every user the bot
  # answers can run them, which matters once TELEGRAM_ALLOW_ALL_USERS is on (CHECKS.md, U10).
  echo "Slash commands: admin only"
  ADMINS="[\"$(printf '%s' "$OWNER" | sed 's/,/","/g')\"]"
  set_key platforms.telegram.extra.allow_admin_from "$ADMINS"
  set_key platforms.telegram.extra.group_allow_admin_from "$ADMINS"
  set_key platforms.telegram.extra.user_allowed_commands '["start", "new"]'
  set_key platforms.telegram.extra.group_user_allowed_commands '["start", "new"]'
fi

echo "Persona"
PATH="$ROOT/hermes/bin:$PATH" bash "$ROOT/hermes/install.sh" --home "${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}/home" | sed -n '1,6p'

echo
echo "Done. Check with: hermes/bin/hermes config check && hermes/bin/hermes mcp test casefile"
