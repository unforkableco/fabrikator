from typing import Dict, Tuple, List
import cadquery as cq
from .validators import HoleSpec
from .utils import Fit, apply_fit_to_hole


ISO_CLEARANCE_DIAMETERS_MM: Dict[str, float] = {
    # Close/normal clearance approximations; will be adjusted by Fit
    "M2": 2.4,
    "M2_5": 3.0,
    "M3": 3.4,
    "M4": 4.5,
    "M5": 5.5,
    "M6": 6.6,
}


HEAD_DIMENSIONS_MM: Dict[str, Dict[str, Dict[str, float]]] = {
    # Approximate head diameter/height for common screws
    "M3": {
        "pan": {"d": 6.0, "h": 2.4},
        "socket": {"d": 5.5, "h": 3.0},
        "flat": {"d": 6.0, "angle": 90.0},
    },
    "M4": {
        "pan": {"d": 8.0, "h": 3.1},
        "socket": {"d": 7.0, "h": 4.0},
        "flat": {"d": 8.5, "angle": 90.0},
    },
}


def _hole_diameter_for_spec(spec: HoleSpec) -> float:
    base = ISO_CLEARANCE_DIAMETERS_MM[spec.size]
    # Map text fit to enum for numbers
    fit_enum = Fit[spec.fit]
    return apply_fit_to_hole(base, fit_enum)


def apply_screw_holes(
    target: cq.Workplane,
    locations_xyz_mm: List[Tuple[float, float, float]],
    spec: HoleSpec,
) -> cq.Workplane:
    """Apply screw holes (through or blind) at given locations on the target solid.

    For through holes without counterbore/countersink we use `hole`.
    For counterbore: `cboreHole` with head dimensions.
    For countersink: `cskHole` with angle.
    Depth must be provided for blind holes.
    """

    hole_d = _hole_diameter_for_spec(spec)
    result = target

    # If head features requested, fetch dimensions (only for sizes we know)
    head_dims = HEAD_DIMENSIONS_MM.get(spec.size, {})
    head = head_dims.get(spec.head_type or "", {}) if (spec.counterbore or spec.countersink) else {}

    for (x, y, z) in locations_xyz_mm:
        wp = result.workplane(offset=0).transformed(offset=(x, y, z))
        if spec.countersink and spec.head_type == "flat" and "angle" in head:
            angle = float(head["angle"])  # typically 90 deg
            depth = None if spec.through else float(spec.depth)
            # cskHole signature: (d, cskDiameter, cskAngle, depth=None)
            # Estimate cskDiameter using head diameter if available, else ~2× hole
            csk_d = float(head.get("d", hole_d * 2.0))
            wp = wp.cskHole(hole_d, csk_d, angle, depth)
        elif spec.counterbore and spec.head_type in ("pan", "socket") and "d" in head and "h" in head:
            cbore_d = float(head["d"]) + 0.2  # small clearance
            cbore_h = float(head["h"]) + 0.3
            depth = None if spec.through else float(spec.depth)
            wp = wp.cboreHole(hole_d, cbore_d, cbore_h, depth)
        else:
            if spec.through:
                wp = wp.hole(hole_d)
            else:
                wp = wp.hole(hole_d, depth=float(spec.depth))
        result = wp

    return result


