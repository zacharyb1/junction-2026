#!/usr/bin/env bash
# AIDaddy: install the gate plugin into the Hermes home and enable it.
# Hermes' gateway does not load plugins from a project folder, so the source in
# hermes/plugins/kaveri-gate/ is copied to <HERMES_HOME>/plugins/kaveri-gate/.
# The fallback wake patterns are taken from hermes/config.snippet.yaml (the "#B   - " lines).
# Run it again after changing the plugin or the patterns, then restart the gateway.
#
#   bash hermes/install-gate.sh            install and enable
#   bash hermes/install-gate.sh --remove   disable and remove
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
H="$ROOT/hermes/bin/hermes"
HOME_DIR="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}/home"
DST="$HOME_DIR/plugins/kaveri-gate"
[ -d "$HOME_DIR" ] || { echo "Run bash hermes/setup-local.sh first." >&2; exit 1; }

if [ "${1:-}" = "--remove" ]; then
  "$H" plugins disable kaveri-gate || true
  rm -rf "$DST"
  echo "Removed the gate. Restart the gateway."
  exit 0
fi

mkdir -p "$DST"
cp "$ROOT"/hermes/plugins/kaveri-gate/{plugin.yaml,__init__.py,gate.py} "$DST/"
{
  printf '[\n'
  sed -n 's/^ *#B   - \(".*"\)$/\1/p' "$ROOT/hermes/config.snippet.yaml" | sed '$!s/$/,/'
  printf ']\n'
} > "$DST/wake_patterns.json"
COUNT="$(grep -c '^"' "$DST/wake_patterns.json" || true)"
[ "$COUNT" -ge 1 ] || { echo "ERROR: no wake patterns found in hermes/config.snippet.yaml" >&2; exit 1; }
echo "Installed kaveri-gate into $DST with $COUNT wake patterns"
"$H" plugins enable kaveri-gate
echo "Enabled. Start the local model with: bash hermes/gate.sh start. Then restart the gateway."
