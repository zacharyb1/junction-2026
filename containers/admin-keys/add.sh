#!/bin/sh
# One-shot Compose service (profile public, so only the server runs it). Adds the public keys in keys.pub to the
# server's root login, so the operator can reach the server and set private values in .env.local.
#
# It only ever appends. Existing lines, including the deploy key with its forced command, are never rewritten,
# and a key that is already there is skipped, so a later deploy changes nothing. Plain sh, no other tools, so a
# missing program in the image cannot make it write the wrong thing.
set -eu
target="${AUTHORIZED_KEYS:-/host-ssh/authorized_keys}"
keys="${KEYS_FILE:-/kaveri/keys.pub}"

if [ ! -f "$target" ]; then
  echo "admin-keys: $target does not exist; nothing changed." >&2
  exit 1
fi

present() {
  while IFS= read -r existing || [ -n "$existing" ]; do
    case "$existing" in *"$1"*) return 0 ;; esac
  done <"$target"
  return 1
}

added=0
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    "" | "#"*) continue ;;
    "ssh-ed25519 "*) ;;
    *) echo "admin-keys: skipped a line that is not an ed25519 public key" >&2; continue ;;
  esac
  # shellcheck disable=SC2086 # split the line into type, key and comment
  set -- $line
  body=$2
  if present "$body"; then continue; fi
  # The leading newline keeps the key on its own line even when the file does not end with one. sshd ignores
  # the blank line this can leave.
  printf '\n%s\n' "$line" >>"$target"
  added=$((added + 1))
done <"$keys"
echo "admin-keys: added $added key(s) to $target"
