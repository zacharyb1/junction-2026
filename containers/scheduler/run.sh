#!/bin/sh
# The watched-page trigger (issue #27): once a day, ask the Engine to re-read the cited pages of
# recent cases (GET /api/cron/recheck). Vercel's cron used to do this; on the server this container does.
# Each re-check is logged on its case, and a quote that disappeared shows as "A watched page changed".
#   sh run.sh        run daily at KAVERI_RECHECK_HOUR_UTC (default 01, which is 03 or 04 in Helsinki)
#   sh run.sh once   run one re-check now
set -eu
URL="${KAVERI_RECHECK_URL:-http://web:3000/api/cron/recheck}"
HOUR="${KAVERI_RECHECK_HOUR_UTC:-01}"

recheck() {
  curl -fsS -m 300 -H "Authorization: Bearer $CRON_SECRET" "$URL" | head -c 600
  echo
}

if [ -z "${CRON_SECRET:-}" ]; then
  echo "scheduler: CRON_SECRET is not set, so no page is re-checked." >&2
  while :; do sleep 3600; done
fi

if [ "${1:-}" = once ]; then
  recheck
  exit 0
fi

last=""
while :; do
  today=$(date -u +%F)
  if [ "$(date -u +%H)" = "$HOUR" ] && [ "$last" != "$today" ]; then
    echo "scheduler: $(date -u +%FT%TZ) re-checking watched pages"
    recheck || echo "scheduler: the re-check failed; it runs again tomorrow" >&2
    last=$today
  fi
  sleep 300
done
