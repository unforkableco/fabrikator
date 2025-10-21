#!/usr/bin/env bash
set -euo pipefail

echo "[install] Updating apt index..."
sudo apt-get update -y

echo "[install] Installing OpenSCAD and dependencies..."
sudo apt-get install -y openscad git python3-venv python3-dev build-essential wget unzip

echo "[install] Ensuring OpenSCAD user library path exists..."
SCAD_LIB_DIR="$HOME/.local/share/OpenSCAD/libraries"
mkdir -p "$SCAD_LIB_DIR"

echo "[install] Installing BOSL2 library..."
if [ ! -d "$SCAD_LIB_DIR/BOSL2" ]; then
  git clone --depth=1 https://github.com/BelfrySCAD/BOSL2.git "$SCAD_LIB_DIR/BOSL2"
else
  echo "[install] BOSL2 already present, pulling latest..."
  git -C "$SCAD_LIB_DIR/BOSL2" pull --ff-only || true
fi

echo "[install] Setting up Python virtualenv..."
cd "$(dirname "$0")"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "[install] Running smoke test..."
mkdir -p out
cat > smoke.scad <<'SCAD'
// Simple smoke test: cube and sphere union
union() {
  cube([20,20,20], center=true);
  translate([10,10,10]) sphere(r=8);
}
SCAD
openscad -o out/smoke.stl smoke.scad
# Older OpenSCAD builds may not accept --render for PNG; use preview instead
openscad -o out/smoke.png --imgsize=600,400 --viewall --autocenter --projection=perspective --preview=throwntogether smoke.scad || true
echo "[install] Done. Artifacts in openscad/out/."


