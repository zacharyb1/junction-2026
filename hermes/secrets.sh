#!/usr/bin/env bash
# Kaveri: fill the git-ignored env files from the team's private keys repo.
# Values are never printed, logged, passed on a command line or written into this repository's history.
#
#   bash hermes/secrets.sh                  pull the keys repo, copy its values, offer to enter missing ones
#   bash hermes/secrets.sh --local-engine   the same, and point the bot at an engine on this machine (sticks)
#   bash hermes/secrets.sh --production     the same, and point the bot back at the deployed engine
#   bash hermes/secrets.sh --status         show which names are set, change nothing
#
# Keys repo: $KAVERI_KEYS, else a folder junction-2026-keys next to this checkout (or next to the
# main checkout when this is a git worktree). Its bot.env goes to the Hermes home .env, its app.env
# to .env.local. A missing value is entered with the keys repo's own ./put, which asks with hidden
# input, commits there and pushes, so teammates get it with the next run of this script.
# Without a keys repo the script asks for each value and keeps it on this machine only.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOCAL="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}"
BOT_ENV="$LOCAL/home/.env"
APP_ENV="$ROOT/.env.local"
ENGINE_PORT="${KAVERI_ENGINE_PORT:-3000}"
PROD_URL="https://junction-2026.vercel.app/api/mcp"
BOT_REQUIRED="NVIDIA_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_USERS EXA_API_KEY CASEFILE_URL CASEFILE_SECRET"
APP_REQUIRED="EXA_API_KEY CASEFILE_SECRET DEMO_ACCESS_CODE"

MODE="${1:-}"
case "$MODE" in ""|--status|--local-engine|--production) ;; *) echo "usage: bash hermes/secrets.sh [--local-engine|--production|--status]" >&2; exit 2 ;; esac
# The engine choice sticks: after --local-engine a plain run keeps the bot on the local engine.
# --production switches back to the URL and secret from the keys repo.
if [ -z "$MODE" ] && grep -q '^KAVERI_ENGINE=local' "$BOT_ENV" 2>/dev/null; then MODE="--local-engine"; fi

find_keys() {
  local main
  if [ -n "${KAVERI_KEYS:-}" ]; then printf '%s' "$KAVERI_KEYS"; return; fi
  if [ -d "$ROOT/../junction-2026-keys" ]; then (cd "$ROOT/../junction-2026-keys" && pwd -P); return; fi
  main="$(cd "$ROOT" && cd "$(git rev-parse --git-common-dir 2>/dev/null)/.." 2>/dev/null && pwd -P || true)"
  if [ -n "$main" ] && [ -d "$main/../junction-2026-keys" ]; then (cd "$main/../junction-2026-keys" && pwd -P); fi
}
KEYS="$(find_keys)"
if [ -n "$KEYS" ] && [ ! -f "$KEYS/bot.env" ]; then echo "No bot.env in $KEYS" >&2; exit 1; fi

has() { [ -f "$1" ] && grep -Eq "^${2}=[^[:space:]#]" "$1"; }      # has FILE NAME
get() { sed -n "s/^${2}=//p" "$1" | tail -n 1; }                    # for copying between files only
put() {                                                             # put FILE NAME VALUE
  local file="$1" name="$2" value="$3" tmp
  touch "$file"; chmod 600 "$file"
  tmp="$(mktemp "${file}.XXXXXX")"; chmod 600 "$tmp"
  grep -v "^${name}=" "$file" > "$tmp" || true
  printf '%s=%s\n' "$name" "$value" >> "$tmp"
  mv "$tmp" "$file"
}
names_in() { grep -E '^[A-Z0-9_]+=' "$1" | cut -d= -f1; }
random() { od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'; }

status() {
  local name
  echo "Keys repo:    ${KEYS:-not found (set KAVERI_KEYS or clone it next to this checkout)}"
  echo "Hermes home:  $BOT_ENV"
  for name in $BOT_REQUIRED; do
    if has "$BOT_ENV" "$name"; then echo "  [set]     $name"
    elif [ "$name" = TELEGRAM_ALLOWED_USERS ] && has "$BOT_ENV" TELEGRAM_ALLOW_ALL_USERS; then echo "  [optional] $name (the bot is open to everyone)"
    else echo "  [missing] $name"; fi
  done
  for name in TELEGRAM_ALLOW_ALL_USERS ELEVENLABS_API_KEY; do
    if has "$BOT_ENV" "$name"; then echo "  [set]     $name"; else echo "  [optional] $name"; fi
  done
  echo "Local engine: $APP_ENV"
  for name in $APP_REQUIRED; do
    if has "$APP_ENV" "$name"; then echo "  [set]     $name"; else echo "  [missing] $name"; fi
  done
}

if [ "$MODE" = "--status" ]; then status; exit 0; fi
[ -d "$LOCAL/home" ] || { echo "Run bash hermes/setup-local.sh first." >&2; exit 1; }
touch "$BOT_ENV"; chmod 600 "$BOT_ENV"

copy_from_keys() {
  local name
  for name in $(names_in "$KEYS/bot.env"); do
    if has "$KEYS/bot.env" "$name"; then put "$BOT_ENV" "$name" "$(get "$KEYS/bot.env" "$name")"; fi
  done
  for name in $(names_in "$KEYS/app.env"); do
    if has "$KEYS/app.env" "$name"; then put "$APP_ENV" "$name" "$(get "$KEYS/app.env" "$name")"; fi
  done
}

ask_local() {  # ask_local NAME: hidden prompt, kept on this machine only
  local value=""
  printf '  %s (input is hidden, Enter skips): ' "$1"
  IFS= read -rs value || true; echo
  value="$(printf '%s' "$value" | tr -d '[:space:]')"
  if [ -n "$value" ]; then put "$BOT_ENV" "$1" "$value"; fi
}

if [ -n "$KEYS" ]; then
  git -C "$KEYS" pull --quiet --rebase 2>/dev/null || echo "Could not pull $KEYS, using what is there."
  copy_from_keys
  MISSING=""
  for name in NVIDIA_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_USERS EXA_API_KEY; do
    has "$KEYS/bot.env" "$name" || MISSING="$MISSING $name"
  done
  if [ "$MODE" != "--local-engine" ] && ! has "$KEYS/bot.env" CASEFILE_SECRET; then MISSING="$MISSING CASEFILE_SECRET"; fi
  if [ -n "$MISSING" ] && [ -t 0 ]; then
    echo "Missing in the keys repo:$MISSING"
    echo "Enter them now? Each goes through $KEYS/put: hidden input, committed there and pushed to the team."
    printf '[y/N] '
    IFS= read -r answer || true
    if [ "$answer" = y ] || [ "$answer" = Y ]; then
      for name in $MISSING; do
        case "$name" in EXA_API_KEY|CASEFILE_SECRET) where=both ;; *) where=bot ;; esac
        "$KEYS/put" "$name" "$where" || true
      done
      copy_from_keys
    fi
  fi
else
  echo "No keys repo found. Values you enter stay on this machine."
  for name in NVIDIA_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_USERS EXA_API_KEY; do
    has "$BOT_ENV" "$name" || ask_local "$name"
  done
  if [ "$MODE" != "--local-engine" ]; then
    has "$BOT_ENV" CASEFILE_SECRET || ask_local CASEFILE_SECRET
    has "$BOT_ENV" CASEFILE_URL || put "$BOT_ENV" CASEFILE_URL "$PROD_URL"
  fi
fi

if [ "$MODE" = "--production" ]; then
  tmp="$(mktemp "${BOT_ENV}.XXXXXX")"; chmod 600 "$tmp"; grep -v '^KAVERI_ENGINE=' "$BOT_ENV" > "$tmp" || true; mv "$tmp" "$BOT_ENV"
  has "$BOT_ENV" CASEFILE_URL || put "$BOT_ENV" CASEFILE_URL "$PROD_URL"
fi

if [ "$MODE" = "--local-engine" ]; then
  # The engine runs on this machine. Its secret and demo code are made here when the keys repo has none.
  has "$BOT_ENV" EXA_API_KEY || { echo "The local engine needs EXA_API_KEY." >&2; status; exit 1; }
  has "$APP_ENV" EXA_API_KEY || put "$APP_ENV" EXA_API_KEY "$(get "$BOT_ENV" EXA_API_KEY)"
  has "$APP_ENV" CASEFILE_SECRET || put "$APP_ENV" CASEFILE_SECRET "$(random 24)"
  has "$APP_ENV" DEMO_ACCESS_CODE || put "$APP_ENV" DEMO_ACCESS_CODE "$(random 4)"
  put "$APP_ENV" PUBLIC_BASE_URL "http://localhost:$ENGINE_PORT"
  put "$BOT_ENV" CASEFILE_SECRET "$(get "$APP_ENV" CASEFILE_SECRET)"
  put "$BOT_ENV" CASEFILE_URL "http://localhost:$ENGINE_PORT/api/mcp"
  put "$BOT_ENV" KAVERI_ENGINE local
  echo "The bot is pointed at a local engine on port $ENGINE_PORT. Case links open only on this machine."
fi

echo
status
