#!/usr/bin/env bash
# Root bootstrap only; upstream drops the actual CLI/gateway to its hermes user.
set -euo pipefail
case "${1:-run}" in
  run|check) ;;
  *) echo "Usage: container [run|check]" >&2; exit 2 ;;
esac
MODE="${1:-run}"
if [ "$MODE" = run ] && [ "$$" -eq 1 ]; then
  echo "Start this image with --init (Compose already sets init: true)." >&2
  exit 2
fi
export PATH="/command:/package/admin/s6/command:$PATH"
mkdir -p "$HERMES_HOME"
# Keep FD 9 inherited through exec and privilege drop for the gateway's full lifetime.
# This excludes other containers sharing this volume, not hosts with separate volumes.
exec 9>"$HERMES_HOME/.kaveri-runtime.lock"
flock -n 9 || { echo "This Hermes home is already in use by another container." >&2; exit 1; }
/opt/hermes/.venv/bin/python /opt/kaveri/containers/hermes/state.py preflight
if [ "$MODE" = check ]; then
  # Never invoke /init or profile reconciliation: checks must not restore a saved gateway/job.
  /opt/hermes/docker/stage2-hook.sh
  exec /opt/hermes/docker/main-wrapper.sh /opt/kaveri/containers/hermes/start.sh check
fi
# Under --init the upstream dispatcher uses its direct bootstrap path, not s6 autostart.
exec /opt/hermes/docker/entrypoint-dispatch.sh /opt/kaveri/containers/hermes/start.sh run
