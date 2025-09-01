import cadquery as cq


def o_ring_gland_face(diameter: float, cross_section: float, squeeze: float = 0.15, groove_depth_factor: float = 0.85) -> cq.Workplane:
    """Create a circular face-seal O-ring gland pocket as a solid to cut.

    - diameter: nominal O-ring diameter (centerline)
    - cross_section: cord diameter
    - squeeze: target compression ratio (0.1–0.3)
    - groove_depth_factor: fraction of cross_section used as groove depth
    Returns a thin ring extruded by groove depth.
    """

    groove_depth = cross_section * groove_depth_factor
    inner = diameter - cross_section * (1 - squeeze)
    outer = diameter + cross_section * (1 - squeeze)
    wp = cq.Workplane("XY").circle(outer / 2.0).circle(inner / 2.0)
    return wp.extrude(groove_depth)


def gasket_channel_rect(length: float, width: float, channel_width: float, depth: float, corner_radius: float = 1.0) -> cq.Workplane:
    """Create a rectangular gasket channel solid to cut.

    Channel path follows a rounded rectangle; width and depth parametrize the cut.
    """

    # Build ring by extruding an outer rectangle and subtracting an inner rectangle
    outer = cq.Workplane("XY").rect(length, width).extrude(depth)
    inner = cq.Workplane("XY").rect(length - 2 * channel_width, width - 2 * channel_width).extrude(depth + 1e-6)
    ring = outer.cut(inner)
    # Optional corner softening on vertical edges if requested
    if corner_radius > 0:
        try:
            ring = ring.edges("|Z").fillet(min(corner_radius, channel_width * 0.9))
        except Exception:
            pass
    return ring


