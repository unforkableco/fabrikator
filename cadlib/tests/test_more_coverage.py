import os
import tempfile

import cadquery as cq

from cadlib import (
    pattern_vesa,
    bolt_circle,
    apply_screw_holes,
    HoleSpec,
    gasket_channel_rect,
    insert_boss,
)


def _export_stl(solid: cq.Workplane, path: str) -> None:
    cq.exporters.export(solid, path)
    assert os.path.exists(path) and os.path.getsize(path) > 0


def test_vesa_and_bolt_circle_patterns():
    plate = cq.Workplane("XY").rect(160, 160).extrude(6)
    # VESA 100
    holes = [(x, y, 3.0) for (x, y, _) in pattern_vesa(100)]
    spec = HoleSpec(size="M4", fit="SNAP", through=True)
    plate = apply_screw_holes(plate, holes, spec)
    # VESA 75
    holes75 = [(x, y, 3.0) for (x, y, _) in pattern_vesa(75)]
    plate = apply_screw_holes(plate, holes75, spec)

    # Add a 6-hole bolt circle cut
    bc_pts = bolt_circle(6, radius=50)
    plate = apply_screw_holes(plate, [(x, y, 3.0) for (x, y, _) in bc_pts], spec)
    with tempfile.TemporaryDirectory() as td:
        _export_stl(plate, os.path.join(td, "vesa_bolt_circle_plate.stl"))


def test_gasket_channel_rect_cut():
    cover = cq.Workplane("XY").rect(120, 80).extrude(4)
    channel = gasket_channel_rect(length=100, width=60, channel_width=3.0, depth=1.5, corner_radius=2.0)
    cover = cover.cut(channel.translate((0, 0, 0)))
    with tempfile.TemporaryDirectory() as td:
        _export_stl(cover, os.path.join(td, "gasket_cover.stl"))


def test_countersink_screw_holes():
    plate = cq.Workplane("XY").rect(60, 40).extrude(5)
    spec = HoleSpec(size="M3", fit="SNAP", through=True, countersink=True, head_type="flat")
    holes = [(-20, -10, 2.5), (20, 10, 2.5)]
    result = apply_screw_holes(plate, holes, spec)
    with tempfile.TemporaryDirectory() as td:
        _export_stl(result, os.path.join(td, "csk_plate.stl"))


def test_insert_boss_size_sweep():
    sizes = ["M2", "M3", "M4"]
    for s in sizes:
        boss = insert_boss(size=s, height=6.0)
        assert boss.val().Volume() > 0


