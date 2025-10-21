#!/usr/bin/env python3
import sys, json
try:
    import trimesh
except Exception as e:
    print(json.dumps({"error": f"import trimesh failed: {e}"}))
    sys.exit(1)

if len(sys.argv) < 2:
    print(json.dumps({"error": "usage: scad_measure.py <stl>"}))
    sys.exit(2)

path = sys.argv[1]
mesh = trimesh.load(path, force='mesh')
if mesh is None:
    print(json.dumps({"error": "failed to load mesh"}))
    sys.exit(3)

bbox = mesh.bounds.tolist()
center = mesh.center_mass.tolist() if hasattr(mesh, 'center_mass') else [0,0,0]
vol = float(mesh.volume) if hasattr(mesh, 'volume') else 0.0

print(json.dumps({
    "path": path,
    "bbox": bbox,
    "center": center,
    "volume": vol
}))
