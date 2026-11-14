#!/usr/bin/env bash
# Kaveri: start the bot. One command, everything in the background, logs in .hermes-local/run/.
#
#   bash hermes/start.sh     engine (only when the bot is pointed at localhost), gate model (only when
#                            the gate plugin is installed), then the Hermes gateway
#   bash hermes/stop.sh      stop all three
#
# ONE POLLER PER BOT TOKEN: Telegram lets a single process poll a bot. If a teammate's copy is
# running with the same TELEGRAM_BOT_TOKEN, stop it first or one of the two fails.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOCAL="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}"
RUN="$LOCAL/run"
BOT_ENV="$LOCAL/home/.env"
ENGINE_DIR="${KAVERI_ENGINE_DIR:-$ROOT}"
ENGINE_PORT="${KAVERI_ENGINE_PORT:-3000}"
PNPM_VERSION="$(sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' "$ROOT/package.json")"
mkdir -p "$RUN"

alive() { [ -f "$RUN/$1.pid" ] && kill -0 "$(cat "$RUN/$1.pid")" 2>/dev/null; }
pnpm() { npm_config_cache="$LOCAL/npm-cache" NEXT_TELEMETRY_DISABLED=1 npx --yes "pnpm@$PNPM_VERSION" "$@"; }

[ -x "$LOCAL/agent/.hermes/bin/hermes" ] || { echo "Run bash hermes/setup-local.sh first." >&2; exit 1; }
grep -Eq '^TELEGRAM_BOT_TOKEN=[^[:space:]#]' "$BOT_ENV" 2>/dev/null || { echo "No TELEGRAM_BOT_TOKEN. Run bash hermes/secrets.sh" >&2; exit 1; }

# 1. Engine, only when CASEFILE_URL points at this machine.
if grep -Eq '^CASEFILE_URL=http://(localhost|127\.0\.0\.1)' "$BOT_ENV"; then
  # The engine stores cases relative to its working directory. Preserve the old
  # engine's files before a directory switch, even when a service is already up.
  node "$ROOT/hermes/preserve-cases.mjs" prepare "$ROOT" "$LOCAL" "$ENGINE_DIR"
  if alive engine; then
    echo "engine: already running (pid $(cat "$RUN/engine.pid"))"
  else
    [ -f "$ROOT/.env.local" ] || { echo "No .env.local. Run bash hermes/secrets.sh --local-engine" >&2; exit 1; }
    [ "$ENGINE_DIR" = "$ROOT" ] || cp "$ROOT/.env.local" "$ENGINE_DIR/.env.local"
    if [ ! -d "$ENGINE_DIR/node_modules" ]; then
      echo "engine: installing dependencies with pnpm $PNPM_VERSION"
      (cd "$ENGINE_DIR" && pnpm install --frozen-lockfile --store-dir "$LOCAL/pnpm-store") > "$RUN/engine-build.log" 2>&1
    fi
    if [ ! -f "$ENGINE_DIR/.next/BUILD_ID" ]; then
      echo "engine: building (about a minute)"
      (cd "$ENGINE_DIR" && pnpm build) >> "$RUN/engine-build.log" 2>&1 || { echo "engine build failed, see $RUN/engine-build.log" >&2; exit 1; }
    fi
    (cd "$ENGINE_DIR" && NEXT_TELEMETRY_DISABLED=1 exec nohup node node_modules/next/dist/bin/next start -p "$ENGINE_PORT" > "$RUN/engine.log" 2>&1 < /dev/null) &
    echo $! > "$RUN/engine.pid"
    for _ in $(seq 1 30); do curl -fsS -o /dev/null --max-time 2 "http://localhost:$ENGINE_PORT/" 2>/dev/null && break; sleep 1; done
    curl -fsS -o /dev/null --max-time 5 "http://localhost:$ENGINE_PORT/" || { echo "engine did not start, see $RUN/engine.log" >&2; exit 1; }
    printf '%s\n' "$(cd "$ENGINE_DIR" && pwd -P)" > "$RUN/engine-dir"
    echo "engine: http://localhost:$ENGINE_PORT (pid $(cat "$RUN/engine.pid"), log $RUN/engine.log)"
  fi
else
  echo "engine: using $(sed -n 's/^CASEFILE_URL=//p' "$BOT_ENV" | tail -n 1)"
fi

# 2. Gate model, only when the gate plugin is installed. If it fails the gate uses the wake patterns.
if [ -d "$LOCAL/home/plugins/kaveri-gate" ]; then
  bash "$ROOT/hermes/gate.sh" start || echo "gate: local model not available, the gate falls back to the wake patterns"
else
  echo "gate: not installed (bash hermes/install-gate.sh)"
fi

# 3. Gateway.
if alive gateway; then
  echo "gateway: already running (pid $(cat "$RUN/gateway.pid"))"
else
  nohup "$ROOT/hermes/bin/hermes" gateway run > "$RUN/gateway.log" 2>&1 < /dev/null &
  echo $! > "$RUN/gateway.pid"
  sleep 8
  if alive gateway; then
    echo "gateway: running (pid $(cat "$RUN/gateway.pid"), log $RUN/gateway.log)"
  else
    echo "gateway stopped right away. Last lines of $RUN/gateway.log:" >&2
    tail -n 15 "$RUN/gateway.log" >&2
    exit 1
  fi
fi
echo "Stop with: bash hermes/stop.sh"
