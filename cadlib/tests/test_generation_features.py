import os
import tempfile

import cadquery as cq
import pytest
from hypothesis import given, strategies as st

from cadlib import (
    RectEnclosureParams,
    rectangular_enclosure_base_and_lid,
    elliptical_enclosure,
    d_shaped_enclosure,
    pcb_pocket,
    pcb_standoffs,
    cutout_usb_c,
    cutout_rj45,
    cutout_dc_barrel,
    o_ring_gland_face,
    louvre_panel,
    insert_boss,
    pattern_nema17,
)


def _export_stl(solid: cq.Workplane, path: str) -> None:
    cq.exporters.export(solid, path)
    assert os.path.exists(path) and os.path.getsize(path) > 0


def test_rect_enclosure_export():
    p = RectEnclosureParams(length=100, width=60, height=30, wall_thickness=2.4, lid_height=6.0, lid_clearance=0.2)
    comp = rectangular_enclosure_base_and_lid(p)
    wp = cq.Workplane("XY").add(comp)
    solids = wp.solids().vals()
    assert len(solids) >= 2 and all(s.Volume() > 0 for s in solids)
    with tempfile.TemporaryDirectory() as td:
        cq.exporters.export(cq.Workplane("XY").add(comp), os.path.join(td, "enclosure.step"))


@given(
    L=st.floats(min_value=60.0, max_value=200.0),
    W=st.floats(min_value=40.0, max_value=160.0),
    t=st.floats(min_value=1.2, max_value=6.0),
    d=st.floats(min_value=1.0, max_value=3.0),
)
def test_pcb_features_property(L, W, t, d):
    base = cq.Workplane("XY").rect(L + 20, W + 20).extrude(8)
    pocket = pcb_pocket(L, W, thickness=t, clearance=0.2, depth=d)
    base = base.cut(pocket.translate((0, 0, 4 - d / 2.0)))
    holes = [(-L/2 + 5, -W/2 + 5), (L/2 - 5, -W/2 + 5), (L/2 - 5, W/2 - 5), (-L/2 + 5, W/2 - 5)]
    standoffs = pcb_standoffs(holes, height=6.0)
    base = base.union(standoffs)
    assert base.val().Volume() > 0


def test_connector_cutouts_and_sealing_and_vents():
    panel = cq.Workplane("XY").rect(120, 60).extrude(4)
    panel = panel.cut(cutout_usb_c(4).translate((-30, 0, 0)))
    panel = panel.cut(cutout_rj45(4).translate((0, 0, 0)))
    panel = panel.cut(cutout_dc_barrel(4).translate((30, 0, 0)))
    gland = o_ring_gland_face(diameter=60, cross_section=2.5)
    panel = panel.cut(gland.translate((0, 0, 0)))
    vent = louvre_panel(length=100, width=60, thickness=3, slot_width=3, slot_pitch=8)
    panel = panel.union(vent.translate((0, 0, 5)))
    assert panel.val().Volume() > 0
    with tempfile.TemporaryDirectory() as td:
        _export_stl(panel, os.path.join(td, "panel.stl"))


def test_insert_boss_and_standards():
    boss = insert_boss(size="M3", height=6.0)
    assert boss.val().Volume() > 0
    pts = pattern_nema17()
    assert len(pts) == 4


def test_additional_enclosures_generate():
    comp1 = elliptical_enclosure(length=100, width=60, height=30, wall_thickness=2.4, lid_height=6.0)
    comp2 = d_shaped_enclosure(diameter=80, flat_width=50, height=30, wall_thickness=2.4, lid_height=6.0)
    wp1 = cq.Workplane("XY").add(comp1)
    wp2 = cq.Workplane("XY").add(comp2)
    assert len(wp1.solids().vals()) >= 2
    assert len(wp2.solids().vals()) >= 2


