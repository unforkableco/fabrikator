import cadquery as cq
from .validators import RectEnclosureParams


def rectangular_enclosure_base_and_lid(params: RectEnclosureParams) -> cq.Compound:
    """Create a simple rectangular enclosure (base + lid) with a mating lip.

    - Outer dims: length × width × height.
    - Wall thickness configurable; interior shelled.
    - Lid has internal recess with clearance for a slip fit.
    Returns a `cq.Compound` with two solids: base and lid.
    """

    L = params.length
    W = params.width
    H = params.height
    t = params.wall_thickness
    lid_h = params.lid_height
    clearance = params.lid_clearance

    # Base body with optional rounded corners
    r = getattr(params, "corner_radius", 0) or 0
    max_r = max(0.0, min(L, W) / 2.0 - 0.1)
    cr = min(r, max_r)
    base_profile = cq.Workplane("XY").rect(L, W)
    if cr > 0:
        base_profile = base_profile.vertices().fillet(cr)
    base_outer = base_profile.extrude(H)
    # Hollow the base by opening the top face and offsetting inward by wall thickness
    base = base_outer.faces(">Z").shell(-t)

    # Create mating lip on base
    lip_h = min(lid_h * 0.6, max(2.0, lid_h - 1.0))
    lip_offset = clearance
    inner_lip_L = L - 2 * (t + lip_offset)
    inner_lip_W = W - 2 * (t + lip_offset)

    lip = (
        cq.Workplane("XY")
        .workplane(offset=H - lip_h)
        .rect(inner_lip_L, inner_lip_W)
        .extrude(lip_h)
    )
    # Cut lip volume from base interior to leave a standing lip
    base = base.cut(lip)

    # Lid body with optional rounded corners
    lid_profile = cq.Workplane("XY").rect(L, W)
    if cr > 0:
        lid_profile = lid_profile.vertices().fillet(cr)
    lid = lid_profile.extrude(lid_h)
    # Shell inward to create lid wall; open the bottom face so thickness does not collide
    lid = lid.faces("<Z").shell(-t)

    # Create recess to accept the base lip with clearance
    recess_L = inner_lip_L + 2 * clearance
    recess_W = inner_lip_W + 2 * clearance
    recess = (
        cq.Workplane("XY")
        .workplane(offset=0.0)
        .rect(recess_L, recess_W)
        .extrude(lip_h)
    )
    lid = lid.cut(recess)

    return cq.Compound.makeCompound([b.val() for b in (base, lid)])


def elliptical_enclosure(length: float, width: float, height: float, wall_thickness: float, lid_height: float) -> cq.Compound:
    """Simple oval enclosure (capsule shape) base + lid.

    Uses rounded rectangle profile as an approximation to ellipse for printable stability.
    """

    # Rounded rectangle profile extruded
    # Build a 2D capsule (racetrack) using slot2D for robust rounded ends
    # slot2D requires straight section > 0; when length <= width, fall back to a circle
    if length <= width:
        r = width / 2.0
        profile_base = cq.Workplane("XY").circle(r)
    else:
        profile_base = cq.Workplane("XY").slot2D(length, width)
    base_outer = profile_base.extrude(height)
    base = base_outer.shell(-wall_thickness)

    if length <= width:
        profile_lid = cq.Workplane("XY").circle(width / 2.0)
    else:
        profile_lid = cq.Workplane("XY").slot2D(length, width)
    lid_outer = profile_lid.extrude(lid_height)
    lid = lid_outer.shell(-wall_thickness)
    return cq.Compound.makeCompound([base.val(), lid.val()])


def d_shaped_enclosure(diameter: float, flat_width: float, height: float, wall_thickness: float, lid_height: float) -> cq.Compound:
    """D-shaped enclosure base + lid.

    Constructed by union of a circle and a rectangle to form a D profile.
    """

    r = diameter / 2.0
    rect_w = flat_width
    rect_l = diameter
    # Build 3D solids first, then union
    base_cyl = cq.Workplane("XY").circle(r).extrude(height)
    base_rect = cq.Workplane("XY").rect(rect_l, rect_w).translate((0, -rect_w / 2.0, 0)).extrude(height)
    base_outer = base_cyl.union(base_rect)
    base = base_outer.shell(-wall_thickness)

    lid_cyl = cq.Workplane("XY").circle(r).extrude(lid_height)
    lid_rect = cq.Workplane("XY").rect(rect_l, rect_w).translate((0, -rect_w / 2.0, 0)).extrude(lid_height)
    lid_outer = lid_cyl.union(lid_rect)
    lid = lid_outer.shell(-wall_thickness)
    return cq.Compound.makeCompound([base.val(), lid.val()])


