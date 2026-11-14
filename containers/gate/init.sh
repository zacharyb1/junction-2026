#!/bin/sh
# One-shot Compose service, using the same Ollama image as the server.
# Model downloads live in the server's volume; this client needs no volume.
set -eu

export OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
MODEL="${KAVERI_GATE_MODEL:-gemma3:1b}"
READY_TIMEOUT="${KAVERI_GATE_READY_TIMEOUT:-60}"
PULL_TIMEOUT="${KAVERI_GATE_PULL_TIMEOUT:-1800}"
WARM_TIMEOUT="${KAVERI_GATE_WARM_TIMEOUT:-300}"

fail() { printf 'Gate setup failed: %s\n' "$*" >&2; exit 1; }
for seconds in "$READY_TIMEOUT" "$PULL_TIMEOUT" "$WARM_TIMEOUT"; do
  case "$seconds" in ''|*[!0-9]*|0*) fail "Timeouts must be positive whole seconds without leading zeros." ;; esac
done
case "$MODEL" in ''|-*) fail "Set a model name, for example gemma3:1b." ;; esac

printf 'Waiting for the local Ollama service...\n'
if ! timeout --kill-after=5s "$READY_TIMEOUT" /bin/sh -c \
  'until ollama list >/dev/null 2>&1; do sleep 1; done'; then
  fail "Ollama did not become ready within ${READY_TIMEOUT}s. Check the ollama service logs."
fi

if timeout --kill-after=5s 10 ollama show "$MODEL" >/dev/null 2>&1; then
  printf 'Using cached gate model %s.\n' "$MODEL"
else
  printf 'Downloading gate model %s into the Ollama volume...\n' "$MODEL"
  if ! timeout --kill-after=5s "$PULL_TIMEOUT" ollama pull "$MODEL"; then
    fail "Could not download ${MODEL} within ${PULL_TIMEOUT}s. Check connectivity and free disk space."
  fi
fi

# An empty prompt preloads the model without generating or sending any chat text.
if ! timeout --kill-after=5s "$WARM_TIMEOUT" \
  ollama run "$MODEL" "" --keepalive 60m </dev/null >/dev/null; then
  fail "Could not load ${MODEL} within ${WARM_TIMEOUT}s. Check the Ollama logs and available memory."
fi
printf 'Gate model %s is loaded.\n' "$MODEL"
