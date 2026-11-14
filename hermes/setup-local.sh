#!/usr/bin/env bash
# Kaveri: install Hermes Agent inside this repository, pinned, with nothing global.
#
# Everything lands in .hermes-local/ (git-ignored):
#   .hermes-local/agent/           Hermes source and its Python environment
#   .hermes-local/home/            the Hermes home: config.yaml, .env, memories, logs, plugins
#   .hermes-local/installer-home/  a throwaway HOME for the installer, so it cannot add a
#                                  `hermes` link to ~/.local/bin or a PATH line to your shell profile
#
# Remove it all:  bash hermes/stop.sh; rm -rf .hermes-local
# Run Hermes:     hermes/bin/hermes <command>      (sets HERMES_HOME for you)
#
# The installer is Hermes' own scripts/install.sh, taken from the pinned commit and checked
# against the checksum below. It was read before first use (Fri 13 Nov 2026). Never uses sudo.
#
# Usage: bash hermes/setup-local.sh [--commit SHA]

set -euo pipefail

# Release v0.23.1 (tag v0.23.1 -> this commit).
HERMES_COMMIT="3b421578588243f920886e6fe79a6faa87ea026e"
INSTALLER_SHA256="abf338605dae6dd28d101673ac6aed7995c955745db46d47676bc591a7957209"

if [ "${1:-}" = "--commit" ] && [ -n "${2:-}" ]; then
  HERMES_COMMIT="$2"
  INSTALLER_SHA256=""   # another commit has another installer: read it yourself first
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOCAL="${KAVERI_HERMES_LOCAL:-$ROOT/.hermes-local}"
INSTALLER="$LOCAL/installer/install.sh"

mkdir -p "$LOCAL/installer" "$LOCAL/installer-home" "$LOCAL/home"

if [ "$LOCAL" = "$ROOT/.hermes-local" ] && ! git -C "$ROOT" check-ignore -q "$LOCAL/"; then
  echo "ERROR: $LOCAL is not git-ignored. Add .hermes-local/ to .gitignore first." >&2
  exit 1
fi

echo "Fetching the Hermes installer at $HERMES_COMMIT"
curl -fsSL "https://raw.githubusercontent.com/NousResearch/hermes-agent/$HERMES_COMMIT/scripts/install.sh" -o "$INSTALLER"

if [ -n "$INSTALLER_SHA256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    GOT="$(sha256sum "$INSTALLER" | cut -d' ' -f1)"
  else
    GOT="$(shasum -a 256 "$INSTALLER" | cut -d' ' -f1)"   # macOS
  fi
  if [ "$GOT" != "$INSTALLER_SHA256" ]; then
    echo "ERROR: installer checksum differs from the one that was reviewed." >&2
    echo "  expected $INSTALLER_SHA256" >&2
    echo "  got      $GOT" >&2
    exit 1
  fi
  echo "Installer checksum ok"
else
  echo "No checksum for this commit. Read $INSTALLER, then press Enter to run it (Ctrl+C to stop)."
  read -r _
fi

# HOME points into .hermes-local for the installer only. Git variables are dropped so a
# surrounding hook or alias cannot retarget the installer's git commands at this repository.
installer() {
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR -u GIT_INDEX_FILE \
    HOME="$LOCAL/installer-home" \
    HERMES_HOME="$LOCAL/home" \
    bash "$INSTALLER" \
      --dir "$LOCAL/agent" \
      --hermes-home "$LOCAL/home" \
      --commit "$HERMES_COMMIT" \
      --skip-setup --skip-browser --skip-computer-use "$@"
}

if [ "$(git -C "$LOCAL/agent" rev-parse HEAD 2>/dev/null || true)" = "$HERMES_COMMIT" ]; then
  # A rerun (for example after a dropped connection). The installer's repository stage would
  # first move the checkout to the tip of main and only then pin it, so skip that stage.
  echo "Checkout is already at $HERMES_COMMIT, continuing with the remaining stages"
  git -C "$LOCAL/agent" checkout --quiet --force --detach "$HERMES_COMMIT"
  for stage in prerequisites venv python-deps config products complete; do
    installer --stage "$stage"
  done
else
  installer
fi

echo
"$ROOT/hermes/bin/hermes" --version
echo
echo "Installed. Next: bash hermes/secrets.sh, then bash hermes/configure.sh"
