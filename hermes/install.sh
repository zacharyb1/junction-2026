#!/usr/bin/env bash
# AIDaddy: install the persona into the Hermes home and print what to do next.
#
# Safe to run again. This script
#   - copies SOUL.md into the Hermes home (the old one is kept as SOUL.md.bak-<timestamp>),
#   - reads .env and config.yaml only to tell you what is still missing,
#   - never edits config.yaml or .env, and never starts or restarts Hermes.
#
# Usage:  bash hermes/install.sh [--home DIR] [--dry-run]
#   --home DIR   Hermes home to install into (default: $HERMES_HOME, else ~/.hermes)
#   --dry-run    show what would happen, change nothing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SOUL_SRC="$SCRIPT_DIR/SOUL.md"
SKILLS_DIR="$SCRIPT_DIR/skills"
SKILL_NAMES="life-event-butler letter-decoder deadline-keeper"
ENV_NAMES="TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_USERS EXA_API_KEY CASEFILE_URL CASEFILE_SECRET"

TARGET_HOME=""
DRY_RUN=0

say()  { printf '%s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  say "Usage: bash hermes/install.sh [--home DIR] [--dry-run]"
  say "  --home DIR   Hermes home to install into (default: \$HERMES_HOME, else ~/.hermes)"
  say "  --dry-run    show what would happen, change nothing"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --home)
      [ "$#" -ge 2 ] || die "--home needs a directory"
      TARGET_HOME="$2"
      shift 2
      ;;
    --home=*)
      TARGET_HOME="${1#--home=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown option: $1"
      ;;
  esac
done

# --- 1. Hermes must be installed -------------------------------------------------------------
if ! command -v hermes >/dev/null 2>&1; then
  say "hermes is not on PATH."
  say "Install it, reload your shell, then run this script again:"
  say "  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  say "  source ~/.bashrc    # or: source ~/.zshrc"
  exit 1
fi

# --- 2. The files this script installs or points at ------------------------------------------
[ -f "$SOUL_SRC" ] || die "missing $SOUL_SRC"
for name in $SKILL_NAMES; do
  [ -f "$SKILLS_DIR/butler/$name/SKILL.md" ] || die "missing $SKILLS_DIR/butler/$name/SKILL.md"
done

# --- 3. Which Hermes home ---------------------------------------------------------------------
if [ -z "$TARGET_HOME" ]; then
  TARGET_HOME="${HERMES_HOME:-$HOME/.hermes}"
fi
case "$TARGET_HOME" in
  "~"|"~/"*) TARGET_HOME="$HOME${TARGET_HOME#\~}" ;;
esac
if [ ! -d "$TARGET_HOME" ]; then
  say "The Hermes home $TARGET_HOME does not exist yet."
  say "Run 'hermes model' once so Hermes creates it, or pass --home DIR."
  exit 1
fi
TARGET_HOME="$(cd "$TARGET_HOME" && pwd -P)"

# Advisory only: ask Hermes where its config lives and say so if it disagrees with the directory
# chosen above. Read-only; does not start the gateway.
REPORTED_CFG="$(hermes config path </dev/null 2>/dev/null | tail -n 1 || true)"
case "$REPORTED_CFG" in
  /*config.yaml)
    REPORTED_HOME="$(cd "$(dirname "$REPORTED_CFG")" 2>/dev/null && pwd -P || true)"
    if [ -n "$REPORTED_HOME" ] && [ "$REPORTED_HOME" != "$TARGET_HOME" ]; then
      warn "'hermes config path' points at $REPORTED_HOME, but this script uses $TARGET_HOME."
      warn "If the bot runs from $REPORTED_HOME, run again with: --home \"$REPORTED_HOME\""
    fi
    ;;
esac

SOUL_DST="$TARGET_HOME/SOUL.md"
ENV_FILE="$TARGET_HOME/.env"
CONFIG_FILE="$TARGET_HOME/config.yaml"

say "Hermes home: $TARGET_HOME"
say "Skills dir:  $SKILLS_DIR"
say ""

# --- 4. SOUL.md: back up, then install --------------------------------------------------------
if [ -f "$SOUL_DST" ] && cmp -s "$SOUL_SRC" "$SOUL_DST"; then
  say "[ok] SOUL.md is already installed and identical. Nothing to do."
elif [ "$DRY_RUN" -eq 1 ]; then
  if [ -e "$SOUL_DST" ]; then
    say "[dry-run] would back up $SOUL_DST to $SOUL_DST.bak-<timestamp>"
  fi
  say "[dry-run] would copy $SOUL_SRC to $SOUL_DST"
else
  if [ -e "$SOUL_DST" ]; then
    BACKUP="$SOUL_DST.bak-$(date +%Y%m%d-%H%M%S)"
    cp -p "$SOUL_DST" "$BACKUP"
    say "[ok] backed up the previous SOUL.md to $BACKUP"
  fi
  cp "$SOUL_SRC" "$SOUL_DST"
  say "[ok] installed SOUL.md into $TARGET_HOME"
fi

# --- 5. Read-only checks: what is still missing ----------------------------------------------
MISSING_ENV=""
if [ -f "$ENV_FILE" ]; then
  for name in $ENV_NAMES; do
    if ! grep -Eq "^[[:space:]]*(export[[:space:]]+)?${name}=[^[:space:]#]" "$ENV_FILE"; then
      MISSING_ENV="$MISSING_ENV $name"
    fi
  done
else
  MISSING_ENV=" $ENV_NAMES"
fi

CONFIG_NOTES=""
if [ -f "$CONFIG_FILE" ]; then
  grep -Fq "$SKILLS_DIR" "$CONFIG_FILE" || CONFIG_NOTES="${CONFIG_NOTES}
     - skills.external_dirs does not list $SKILLS_DIR yet"
  grep -q "casefile" "$CONFIG_FILE" || CONFIG_NOTES="${CONFIG_NOTES}
     - mcp_servers.casefile is not there yet"
  if grep -q "ABSOLUTE/PATH/TO" "$CONFIG_FILE"; then
    CONFIG_NOTES="${CONFIG_NOTES}
     - the placeholder /ABSOLUTE/PATH/TO is still in config.yaml: replace it with $SKILLS_DIR"
  fi
  if grep -q "FAMILYCHATID" "$CONFIG_FILE"; then
    CONFIG_NOTES="${CONFIG_NOTES}
     - the placeholder -100FAMILYCHATID is still in config.yaml: the bot ignores every group until you replace it"
  fi
else
  CONFIG_NOTES="
     - $CONFIG_FILE does not exist yet: run 'hermes model' first"
fi

case "$SKILLS_DIR" in
  *\'*|*\"*|*\\*) warn "the skills path contains a quote or a backslash: type it into config.yaml by hand instead of using the command in step 2." ;;
esac

# --- 6. Next steps ------------------------------------------------------------------------------
say ""
say "Next steps (details and doc references: $SCRIPT_DIR/README.md)"
say ""
say "  1. Secrets. Add the lines from $SCRIPT_DIR/env.example to $ENV_FILE"
if [ -n "$MISSING_ENV" ]; then
  say "     Still missing or empty:$MISSING_ENV"
else
  say "     All five required names are present."
fi
say ""
say "  2. Config. Apply Part 1 of $SCRIPT_DIR/config.snippet.yaml (README step 8)."
say "     The skills line for this machine is:"
say "       hermes config set skills.external_dirs '[\"$SKILLS_DIR\"]'"
if [ -n "$CONFIG_NOTES" ]; then
  say "     Found in config.yaml:$CONFIG_NOTES"
fi
say ""
say "  3. Check before starting:"
say "       hermes config check"
say "       hermes doctor"
say "       hermes mcp test casefile"
say "       hermes mcp test exa"
say "       hermes skills list | grep -E 'life-event-butler|letter-decoder|deadline-keeper'"
say ""
say "  4. Start it yourself (this script starts nothing):"
say "       hermes gateway run        # foreground, logs in this terminal"
say "     or, if the gateway already runs as a service:"
say "       hermes gateway restart"
say ""
say "  5. In every Telegram chat that already talked to the bot, send:  /new --yes"
say "     A running conversation keeps its old persona, skills and tools until then."
say ""
say "  6. Group setup, /sethome and Part 2 of the config: README steps 11 and 12."
