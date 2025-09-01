import os
import tempfile

import cadquery as cq
import pytest
from hypothesis import given, strategies as st, assume

from cadlib import (
    Fit,
    TubeParams,
    HoleSpec,
    RectEnclosureParams,
    tube,
    apply_screw_holes,
    linear_array,
    grid_array,
    circular_array,
)


def _export_stl(solid: cq.Workplane, path: str) -> None:
    cq.exporters.export(solid, path)
    assert os.path.exists(path) and os.path.getsize(path) > 0


@given(
    outer_diameter=st.floats(min_value=10.0, max_value=120.0),
    wall=st.floats(min_value=0.8, max_value=6.0),
    height=st.floats(min_value=5.0, max_value=200.0),
    end_style=st.sampled_from(["open", "one_end_closed", "both_closed"]),
    cap=st.floats(min_value=0.8, max_value=6.0),
)
def test_tube_property(outer_diameter, wall, height, end_style, cap):
    assume(wall * 2.0 < outer_diameter)
    params = TubeParams(
        outer_diameter=outer_diameter,
        wall_thickness=wall,
        height=height,
        end_style=end_style,
        end_cap_thickness=cap,
    )
    solid = tube(params)
    assert solid.val().Volume() > 0
    with tempfile.TemporaryDirectory() as td:
        _export_stl(solid, os.path.join(td, "tube.stl"))


def test_screw_holes_export():
    plate = cq.Workplane("XY").rect(60, 40).extrude(5)
    spec = HoleSpec(size="M3", fit="SNAP", through=True, counterbore=True, head_type="socket")
    pts = [(-20, -10, 2.5), (20, -10, 2.5), (-20, 10, 2.5), (20, 10, 2.5)]
    result = apply_screw_holes(plate, pts, spec)
    with tempfile.TemporaryDirectory() as td:
        _export_stl(result, os.path.join(td, "plate.stl"))


def test_patterns_fuse():
    peg = cq.Workplane("XY").circle(3).extrude(10)
    grid = grid_array(peg, nx=2, ny=2, dx=12, dy=12)
    ring = circular_array(peg, n=6, radius=20)
    line = linear_array(peg, n=3, dx=8)
    assert grid.val().Volume() > 0
    assert ring.val().Volume() > 0
    assert line.val().Volume() > 0


