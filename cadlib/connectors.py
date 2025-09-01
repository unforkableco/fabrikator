import cadquery as cq


def cutout_usb_c(panel_thickness: float, clearance: float = 0.2) -> cq.Workplane:
    """Return a solid to cut a USB-C receptacle panel opening.

    Approx opening: 9.0 × 6.0 mm with corner radii; oversized by clearance.
    Depth equals panel_thickness.
    """

    w = 9.0 + 2 * clearance
    h = 6.0 + 2 * clearance
    r = 0.8
    # Build rectangle then fillet vertical edges after extrude to get rounded corners
    return cq.Workplane("XY").rect(w, h).extrude(panel_thickness).edges("|Z").fillet(r)


def cutout_rj45(panel_thickness: float, clearance: float = 0.3) -> cq.Workplane:
    """Return a solid to cut an RJ45 jack panel opening.

    Approx opening: 14.5 × 12.5 mm; depth equals panel_thickness.
    """

    w = 14.5 + 2 * clearance
    h = 12.5 + 2 * clearance
    return cq.Workplane("XY").rect(w, h).extrude(panel_thickness)


def cutout_dc_barrel(panel_thickness: float, clearance: float = 0.2) -> cq.Workplane:
    """Return a solid to cut a DC barrel jack (panel mount) opening.

    Uses 8 mm diameter round hole; depth equals panel_thickness.
    """

    d = 8.0 + 2 * clearance
    return cq.Workplane("XY").circle(d / 2.0).extrude(panel_thickness)


