#!/usr/bin/env python3
import ast
import os
import runpy
import sys
import traceback

import cadquery as cq


FORBIDDEN = {"cadquery", "cq", "build123d", "OCP", "occ", "occmodel"}


def _ensure_compound_solids_wrapper() -> None:
    """Monkeypatch cq.Compound.solids() to return an iterable with .vals().

    Some generated scripts call enclosure.solids() and then expect a Workplane-like
    object with .vals(). We normalize this to a small wrapper of Workplanes.
    """

    class _MultiSolids:
        def __init__(self, items):
            self._items = list(items)

        def __iter__(self):
            return iter(self._items)

        def __len__(self):
            return len(self._items)

        def vals(self):
            return list(self._items)

    def _compound_solids(self):  # type: ignore[override]
        try:
            wp = cq.Workplane("XY").add(self)
            sel = wp.solids()
            solids_seq = sel.vals() if hasattr(sel, "vals") else list(sel)
            wrapped = [cq.Workplane("XY").add(s) for s in solids_seq]
            return _MultiSolids(wrapped)
        except Exception:
            traceback.print_exc()
            raise

    setattr(cq.Compound, "solids", _compound_solids)


def _sanitize_name(name: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in name)
    return safe or "part"


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: run_generated_guarded.py <generated.py>")
        sys.exit(2)

    src_path = sys.argv[1]
    src = open(src_path, "r", encoding="utf-8").read()

    # Static guard: forbid forbidden imports in generated.py
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            mod = (node.names[0].name if isinstance(node, ast.Import) else node.module or "")
            if (mod.split(".")[0]) in FORBIDDEN:
                raise SystemExit(f"Forbidden import: {mod}")

    # Normalize environment: ensure repo root on sys.path, inject cq and compound solids helper
    repo_root = os.path.abspath(os.path.join(os.path.dirname(src_path), "."))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
    _ensure_compound_solids_wrapper()

    try:
        env = runpy.run_path(src_path, init_globals={"cq": cq}, run_name="__main__")
    except Exception:
        print("[runner] Exception executing generated script:")
        traceback.print_exc()
        sys.exit(1)

    # Collect outputs
    parts = None
    if callable(env.get("build")):
        try:
            parts = env["build"]()
        except Exception:
            print("build() raised; traceback:")
            traceback.print_exc()
            print("Falling back to scanning environment for outputs...")
            parts = None

    items = []  # list[(name, solid_like)]
    if isinstance(parts, dict):
        items = list(parts.items())
    elif isinstance(parts, (list, tuple)):
        for idx, it in enumerate(parts):
            if isinstance(it, (list, tuple)) and len(it) == 2:
                items.append((str(it[0]), it[1]))
            else:
                items.append((f"part{idx+1}", it))
    elif parts is not None:
        items = [("part1", parts)]

    if not items:
        # Fallback: look for top-level solids
        for k, v in env.items():
            if isinstance(v, (cq.Workplane, cq.Compound)):
                items.append((k, v))

    if not items:
        raise SystemExit("No outputs found. Define build() -> dict[str, solid] or set outputs={name: solid}.")

    out_dir = os.path.join(os.path.dirname(src_path), "out")
    os.makedirs(out_dir, exist_ok=True)

    for name, solid in items:
        # Wrap compound to Workplane; accept Workplane directly
        if isinstance(solid, cq.Workplane):
            wp = solid
        elif isinstance(solid, cq.Compound):
            wp = cq.Workplane("XY").add(solid)
        else:
            try:
                wp = cq.Workplane("XY").add(solid)
            except Exception:
                raise SystemExit(f"Output '{name}' is not a recognized cadlib solid")

        stl_path = os.path.join(out_dir, f"{_sanitize_name(name)}.stl")
        try:
            cq.exporters.export(wp, stl_path)
            print(f"Exported {stl_path}")
        except Exception:
            print(f"[runner] Export failed for {name}; traceback:")
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()


