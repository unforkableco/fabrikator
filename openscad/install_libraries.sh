#!/usr/bin/env bash
set -euo pipefail

# Install/update common OpenSCAD community libraries into the user library path.
# You can override the destination via OPENSCAD_LIB_DIR.

LIB_DIR="${OPENSCAD_LIB_DIR:-$HOME/.local/share/OpenSCAD/libraries}"
LIST_FILE="$(dirname "$0")/libraries.txt"

echo "[libs] Installing libraries into: $LIB_DIR"
mkdir -p "$LIB_DIR"

if [ ! -f "$LIST_FILE" ]; then
  echo "[libs] libraries.txt not found at $LIST_FILE" >&2
  exit 1
fi

install_one() {
  local name="$1"; shift
  local url="$1"; shift
  local ref="${1:-}"
  local dest="$LIB_DIR/$name"

  # Ensure no interactive credential prompts (public repos)
  local GIT="git -c core.askPass= -c credential.helper= "

  if [ -d "$dest/.git" ]; then
    echo "[libs] Updating $name ..."
    $GIT -C "$dest" fetch --tags --depth=1 || true
    $GIT -C "$dest" pull --ff-only || true
  else
    echo "[libs] Cloning $name from $url ..."
    $GIT clone --depth=1 --recurse-submodules --shallow-submodules "$url" "$dest" || \
      $GIT clone --depth=1 "$url" "$dest"
  fi

  if [ -n "$ref" ]; then
    echo "[libs] Checking out $name @ $ref"
    $GIT -C "$dest" fetch --depth=1 origin "$ref" || true
    $GIT -C "$dest" checkout "$ref" || true
  fi
}

# If arguments are provided, treat them as a subset of names to install.
HAVE_ONLY=0
ONLY_LIST=""
if [ "$#" -gt 0 ]; then
  HAVE_ONLY=1
  # pad with spaces for simple membership checks
  ONLY_LIST=" $* "
fi

while read -r line; do
  # Skip comments and blank lines
  [[ -z "${line// }" ]] && continue
  [[ "$line" =~ ^# ]] && continue
  name=$(echo "$line" | awk '{print $1}')
  url=$(echo "$line" | awk '{print $2}')
  ref=$(echo "$line" | awk '{print $3}')

  if [ "$HAVE_ONLY" -eq 1 ]; then
    case "$ONLY_LIST" in
      *" $name "*) ;;
      *) continue ;;
    esac
  fi

  install_one "$name" "$url" "$ref"
done < "$LIST_FILE"

echo "[libs] Done. Installed libraries in $LIB_DIR"


