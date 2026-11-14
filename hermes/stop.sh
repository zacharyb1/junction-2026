#!/usr/bin/env bash
# AIDaddy: stop the gateway, the local engine and the gate model started by hermes/start.sh.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOCAL="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}"
RUN="$LOCAL/run"

stop_one() {
  local name="$1" pid
  [ -f "$RUN/$name.pid" ] || { echo "$name: not running"; return; }
  pid="$(cat "$RUN/$name.pid")"
  if kill -0 "$pid" 2>/dev/null; then
    pkill -TERM -P "$pid" 2>/dev/null
    kill -TERM "$pid" 2>/dev/null
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null
    echo "$name: stopped"
  else
    echo "$name: not running"
  fi
  rm -f "$RUN/$name.pid"
}

stop_one gateway
stop_one engine
# Snapshot after the writer stops, before an operator moves or removes its checkout.
ENGINE_DIR="${KAVERI_ENGINE_DIR:-$ROOT}"
[ ! -f "$RUN/engine-dir" ] || ENGINE_DIR="$(cat "$RUN/engine-dir")"
stop_failed=0
if [ -f "$RUN/engine-dir" ] || [ -d "$ENGINE_DIR/.data/cases" ] || [ -d "$ROOT/.data/cases" ] || [ -d "$LOCAL/engine/.data/cases" ]; then
  node "$ROOT/hermes/preserve-cases.mjs" backup "$ROOT" "$LOCAL" "$ENGINE_DIR" || stop_failed=1
fi
if [ "${1:-}" != "--keep-gate" ]; then
  bash "$ROOT/hermes/gate.sh" stop || stop_failed=1
fi
exit "$stop_failed"
