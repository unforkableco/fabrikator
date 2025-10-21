from typing import Dict
import cadquery as cq


HEAT_SET_INSERTS_MM: Dict[str, Dict[str, float]] = {
    "M2": {"od": 3.0, "len": 3.0},
    "M2_5": {"od": 3.5, "len": 4.0},
    "M3": {"od": 4.6, "len": 5.0},
    "M4": {"od": 6.0, "len": 6.0},
}


def insert_boss(size: str = "M3", height: float = 6.0, wall: float = 1.2, through_hole: bool = True) -> cq.Workplane:
    """Create a cylindrical boss for a heat-set insert with relief.

    - size: key into HEAT_SET_INSERTS_MM
    - height: boss height
    - wall: radial wall thickness around insert OD
    - through_hole: if True, create a through hole; else blind
    """

    spec = HEAT_SET_INSERTS_MM[size]
    od = spec["od"] + 2 * wall
    boss = cq.Workplane("XY").circle(od / 2.0).extrude(height)
    hole_d = spec["od"] - 0.2  # slightly undersized for press fit with heat
    if through_hole:
        boss = boss.hole(hole_d)
    else:
        boss = boss.hole(hole_d, depth=height - 0.8)
    # Add small relief groove near top to ease insertion
    groove = (
        cq.Workplane("XY")
        .workplane(offset=height * 0.6)
        .circle(od / 2.0)
        .circle((od / 2.0) - 0.3)
        .extrude(0.6)
    )
    return boss.cut(groove)


