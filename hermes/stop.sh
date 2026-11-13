#!/usr/bin/env bash
# Kaveri: stop the gateway, the local engine and the gate model started by hermes/start.sh.
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
[ "${1:-}" = "--keep-gate" ] || bash "$ROOT/hermes/gate.sh" stop
