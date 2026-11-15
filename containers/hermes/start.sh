#!/usr/bin/env bash
set -euo pipefail
cd /opt/kaveri
/opt/hermes/.venv/bin/python containers/hermes/state.py configure
bash hermes/configure.sh
if [ "${KAVERI_RUNTIME:-telegram}" = web ]; then
  # The instance behind the /chat page: only the API server, no Telegram group settings and no gate.
  echo "Web runtime: API server only."
else
  if [ -n "${KAVERI_TELEGRAM_CHAT_ID:-}" ]; then
    bash hermes/configure.sh --group "$KAVERI_TELEGRAM_CHAT_ID"
  else
    echo "No group ID supplied: existing group settings are retained; a fresh home is ready for DM/bootstrap only."
  fi
  if [ "${KAVERI_TELEGRAM_OPEN_GROUPS:-}" = true ]; then
    # Every group is accepted; the home group above keeps its silence and reminder settings.
    bash hermes/configure.sh --open-groups
  fi
  bash hermes/install-gate.sh
fi
hermes/bin/hermes config check
/opt/hermes/.venv/bin/python containers/hermes/state.py verify
if [ "${1:-check}" = check ]; then
  echo "AIDaddy configuration passed. No gateway, scheduler or provider call was started."
  exit 0
fi
exec /opt/hermes/bin/hermes gateway run --no-supervise
