#!/usr/bin/env bash
# Deploys one commit of this repository on the production server.
#
# Installed on the server as /usr/local/sbin/kaveri-deploy and used as the forced command of the
# GitHub Actions deploy key (see docs/DEPLOYMENT.md#automatic-deployment). The key can run nothing else.
#
# Input: the command "deploy <40-character commit SHA>" (SSH_ORIGINAL_COMMAND, or the arguments when
# run by hand) and a git bundle containing that commit on stdin. The server needs no GitHub access.
#
# Steps: check out the commit, build, restart what changed, then require the web app to report the
# new commit and the bot to stay up. If that fails, the previous commit is deployed again.
set -euo pipefail

APP_DIR=${KAVERI_APP_DIR:-/opt/kaveri}
PROFILES=(--profile public --profile bot)
HEALTH_TIMEOUT=${KAVERI_HEALTH_TIMEOUT:-360}
BOT_STABLE_SECONDS=30

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
compose() { docker compose --env-file .env.local "${PROFILES[@]}" "$@"; }

request=${SSH_ORIGINAL_COMMAND:-$*}
read -r verb sha extra <<<"$request" || true
if [[ $verb != deploy || ! $sha =~ ^[0-9a-f]{40}$ || -n ${extra:-} ]]; then
  echo "usage: deploy <40-character commit sha>, with a git bundle on stdin" >&2
  exit 2
fi

exec 9>/run/lock/kaveri-deploy.lock
flock -w 900 9 || { log "another deploy is still running"; exit 1; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cat >"$work/in.bundle"

cd "$APP_DIR"
git bundle verify -q "$work/in.bundle" >/dev/null
git fetch -q "$work/in.bundle" '+refs/heads/*:refs/remotes/deploy/*'
git cat-file -e "$sha^{commit}" || { log "commit $sha is not in the bundle"; exit 1; }

previous=$(git rev-parse HEAD)

set_commit() {
  # Recorded for /api/health. Not a secret; the rest of .env.local is left as it is.
  if grep -q '^KAVERI_COMMIT=' .env.local; then
    sed -i "s/^KAVERI_COMMIT=.*/KAVERI_COMMIT=$1/" .env.local
  else
    printf 'KAVERI_COMMIT=%s\n' "$1" >>.env.local
  fi
}

deploy_commit() {
  log "deploying $1"
  git checkout -q --detach "$1"
  set_commit "$1"
  compose build --quiet
  compose up -d
}

healthy() {
  local want=${1:0:7} port deadline restarts
  port=$(sed -n 's/^KAVERI_HTTP_PORT=//p' .env.local | tail -n1)
  port=${port:-3000}
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  until curl -fsS -m 5 "http://127.0.0.1:$port/api/health" 2>/dev/null | grep -q "\"commit\":\"$want\""; do
    if ((SECONDS > deadline)); then
      log "web did not report commit $want within ${HEALTH_TIMEOUT}s"
      return 1
    fi
    sleep 3
  done
  # The bot configures itself for about 80 s after a restart; "up" means connected to Telegram.
  local bot started
  bot=$(compose ps -q hermes)
  started=$(docker inspect -f '{{.State.StartedAt}}' "$bot")
  until docker logs --since "$started" "$bot" 2>&1 | grep -q "Connected to Telegram"; do
    if ((SECONDS > deadline)); then
      log "the bot did not connect to Telegram within ${HEALTH_TIMEOUT}s"
      return 1
    fi
    sleep 3
  done
  # The /ukk instance answers its own health endpoint once its API server is up.
  until [[ $(docker inspect -f '{{.State.Health.Status}}' "$(compose ps -q hermes-web)" 2>/dev/null) == healthy ]]; do
    if ((SECONDS > deadline)); then
      log "the web chat instance did not become healthy within ${HEALTH_TIMEOUT}s"
      return 1
    fi
    sleep 3
  done
  restarts=$(docker inspect -f '{{.RestartCount}}' "$bot")
  sleep "$BOT_STABLE_SECONDS"
  if [[ $(docker inspect -f '{{.State.Status}} {{.RestartCount}}' "$(compose ps -q hermes)") != "running $restarts" ]]; then
    log "the bot is not staying up"
    return 1
  fi
  [[ $(docker inspect -f '{{.State.Status}}' "$(compose ps -q proxy)") == running ]] || { log "the proxy is not running"; return 1; }
}

if deploy_commit "$sha" && healthy "$sha"; then
  log "deployed $sha (previous $previous)"
  docker image prune -f >/dev/null
  exit 0
fi

log "deploy of $sha failed; rolling back to $previous"
if [[ $previous != "$sha" ]] && deploy_commit "$previous" && healthy "$previous"; then
  log "rolled back to $previous"
else
  log "ROLLBACK FAILED: production needs attention"
fi
exit 1
