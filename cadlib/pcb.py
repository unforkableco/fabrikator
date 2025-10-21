from typing import List, Tuple
import cadquery as cq


def pcb_pocket(board_length: float, board_width: float, thickness: float, clearance: float = 0.2, depth: float = None) -> cq.Workplane:
    """Create a rectangular PCB pocket in XY, extruded in +Z by depth (defaults to thickness).

    The pocket is oversized by `clearance` on length/width.
    """

    depth = thickness if depth is None else depth
    L = board_length + 2 * clearance
    W = board_width + 2 * clearance
    return cq.Workplane("XY").rect(L, W).extrude(depth)


def pcb_standoffs(
    hole_locations_xy: List[Tuple[float, float]],
    height: float,
    outer_d: float = 6.0,
    hole_d: float = 3.2,
    fillet: float = 0.8,
) -> cq.Workplane:
    """Generate cylindrical standoffs at PCB hole locations.

    Returns fused solid of all standoffs.
    """

    shapes = []
    for (x, y) in hole_locations_xy:
        standoff = (
            cq.Workplane("XY")
            .workplane(offset=0)
            .center(x, y)
            .circle(outer_d / 2.0)
            .extrude(height)
            .faces("<Z").workplane().hole(hole_d)
        )
        if fillet > 0:
            try:
                standoff = standoff.edges("|Z").fillet(fillet)
            except Exception:
                # If fillet fails due to small geometry, skip fillet
                pass
        shapes.append(standoff.val())
    comp = cq.Compound.makeCompound(shapes)
    return cq.Workplane("XY").add(comp).combine()


