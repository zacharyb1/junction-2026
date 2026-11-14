#!/usr/bin/env bash
set -euo pipefail
cd /opt/kaveri
/opt/hermes/.venv/bin/python containers/hermes/state.py configure
bash hermes/configure.sh
if [ -n "${KAVERI_TELEGRAM_CHAT_ID:-}" ]; then
  bash hermes/configure.sh --group "$KAVERI_TELEGRAM_CHAT_ID"
else
  echo "No group ID supplied: existing group settings are retained; a fresh home is ready for DM/bootstrap only."
fi
bash hermes/install-gate.sh
hermes/bin/hermes config check
/opt/hermes/.venv/bin/python containers/hermes/state.py verify
if [ "${1:-check}" = check ]; then
  echo "Kaveri configuration passed. No gateway, scheduler or provider call was started."
  exit 0
fi
exec /opt/hermes/bin/hermes gateway run --no-supervise
