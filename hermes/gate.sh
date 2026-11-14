#!/usr/bin/env bash
# Kaveri: the local model behind the gate. Ollama in a container, model data inside .hermes-local/.
#
#   bash hermes/gate.sh start    start Ollama (podman or docker), download the model once, warm it up
#   bash hermes/gate.sh stop     stop the container
#   bash hermes/gate.sh status
#
# If something already answers on the Ollama port (for example the Ollama app on macOS), that one is
# used and no container is started. Remove everything: stop, rm -rf .hermes-local/ollama, and
# `podman rmi docker.io/ollama/ollama:0.40.16` for the image (3.4 GB, kept in podman's own storage).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOCAL="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}"
IMAGE="docker.io/ollama/ollama:0.40.16"
NAME="kaveri-gate-ollama"
MODEL="${KAVERI_GATE_MODEL:-gemma3:1b}"
URL="${KAVERI_GATE_URL:-http://127.0.0.1:11434}"
PORT="${URL##*:}"

engine() {
  if command -v podman >/dev/null 2>&1; then echo podman
  elif command -v docker >/dev/null 2>&1; then echo docker
  else echo ""; fi
}
up() { curl -fsS --max-time 2 "$URL/api/version" >/dev/null 2>&1; }

case "${1:-}" in
  start)
    if up; then
      echo "Ollama already answers on $URL"
    else
      E="$(engine)"
      [ -n "$E" ] || { echo "Need podman or docker, or a running Ollama on $URL." >&2; exit 1; }
      mkdir -p "$LOCAL/ollama"
      VOL="$LOCAL/ollama:/root/.ollama"
      [ "$(uname -s)" = Linux ] && VOL="$VOL:Z"
      "$E" run -d --rm --name "$NAME" -p "127.0.0.1:$PORT:11434" -v "$VOL" "$IMAGE" >/dev/null
      for _ in $(seq 1 30); do up && break; sleep 1; done
      up || { echo "Ollama did not start. See: $E logs $NAME" >&2; exit 1; }
      echo "Started Ollama in $E container $NAME on $URL"
    fi
    echo "Getting $MODEL (downloaded once, then kept in .hermes-local/ollama)"
    curl -fsS "$URL/api/pull" -d "{\"model\":\"$MODEL\",\"stream\":false}" >/dev/null
    curl -fsS --max-time 300 "$URL/api/generate" -d "{\"model\":\"$MODEL\",\"prompt\":\"hi\",\"stream\":false,\"keep_alive\":\"60m\",\"options\":{\"num_predict\":1}}" >/dev/null
    echo "Gate model $MODEL is loaded."
    ;;
  stop)
    E="$(engine)"
    if [ -n "$E" ] && "$E" stop "$NAME" >/dev/null 2>&1; then echo "Stopped $NAME"; else echo "No $NAME container was running."; fi
    ;;
  status)
    if up; then
      echo "Ollama answers on $URL. Models:"
      curl -fsS "$URL/api/tags" | tr ',' '\n' | sed -n 's/.*"name":"\([^"]*\)".*/  \1/p'
    else
      echo "Nothing answers on $URL. The gate falls back to the wake patterns."
    fi
    ;;
  *) echo "usage: bash hermes/gate.sh start|stop|status" >&2; exit 2 ;;
esac
