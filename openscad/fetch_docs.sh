#!/usr/bin/env bash
set -euo pipefail

# Fetch/copy documentation for libraries listed in libraries.txt
# Priority: use already-cloned libs in the user's OpenSCAD library path; otherwise shallow-clone.

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIST_FILE="$ROOT_DIR/libraries.txt"
LIB_DIR="${OPENSCAD_LIB_DIR:-$HOME/.local/share/OpenSCAD/libraries}"
CACHE_DIR="$ROOT_DIR/.cache/libs"
DEST_DIR="$ROOT_DIR/docs"

mkdir -p "$DEST_DIR" "$CACHE_DIR"

copy_docs() {
  local name="$1"; shift
  local src="$1"; shift
  local url="$1"; shift

  local dest="$DEST_DIR/$name"
  mkdir -p "$dest"

  # Write a small index pointing to upstream
  echo "# $name\n\nSource: $url\n" > "$dest/UPSTREAM.md"

  # Copy common doc files at repo root (case-insensitive variants)
  for f in README.md README.MD Readme.md REFERENCE.md LICENSE LICENSE.txt; do
    if [ -f "$src/$f" ]; then cp -f "$src/$f" "$dest/"; fi
  done

  # Copy known doc directories if they exist (keep shallow structure)
  for d in docs documentation tutorial tutorials examples gallery img docpix; do
    if [ -d "$src/$d" ]; then
      mkdir -p "$dest/$d"
      cp -r "$src/$d"/* "$dest/$d"/ 2>/dev/null || true
    fi
  done
}

ensure_repo() {
  local name="$1"; shift
  local url="$1"; shift
  local ref="${1:-}"

  local local_path="$LIB_DIR/$name"
  if [ -d "$local_path/.git" ] || [ -d "$local_path" ]; then
    echo "$local_path"
    return 0
  fi
  local cache_path="$CACHE_DIR/$name"
  if [ ! -d "$cache_path/.git" ]; then
    echo "[docs] Cloning $name for docs ..."
    git -c core.askPass= -c credential.helper=  clone --depth=1 "$url" "$cache_path" >/dev/null 2>&1 || true
  else
    git -C "$cache_path" -c core.askPass= -c credential.helper=  pull --ff-only >/dev/null 2>&1 || true
  fi
  echo "$cache_path"
}

echo "[docs] Collecting docs into $DEST_DIR"

while read -r line; do
  [[ -z "${line// }" ]] && continue
  [[ "$line" =~ ^# ]] && continue
  name=$(echo "$line" | awk '{print $1}')
  url=$(echo "$line" | awk '{print $2}')
  ref=$(echo "$line" | awk '{print $3}')

  src_dir=$(ensure_repo "$name" "$url" "$ref")
  copy_docs "$name" "$src_dir" "$url"
done < "$LIST_FILE"

echo "[docs] Done. See $DEST_DIR/<Library>/"


