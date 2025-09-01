from typing import Literal
import cadquery as cq
from .validators import TubeParams


def tube(params: TubeParams) -> cq.Workplane:
    """Create a cylindrical tube with configurable wall thickness and end closures.

    Geometry is centered on origin with Z-up. Height is extruded symmetrically about Z=0.
    """

    outer_radius = params.outer_diameter / 2.0
    inner_radius = max(outer_radius - params.wall_thickness, 0.0)

    # Outer body (guard against zero/negative height)
    if params.height <= 0:
        raise ValueError("height must be > 0")
    body = cq.Workplane("XY").circle(outer_radius).extrude(params.height, both=True)

    # Subtract inner void according to end style
    if inner_radius > 0:
        if params.end_style == "open":
            void = (
                cq.Workplane("XY")
                .circle(inner_radius)
                .extrude(params.height, both=True)
            )
            body = body.cut(void)
        elif params.end_style == "one_end_closed":
            # Close the bottom end; cut from z = -H/2 + cap_thickness to top
            start_offset = -params.height / 2.0 + params.end_cap_thickness
            cut_height = params.height - params.end_cap_thickness
            if cut_height > 0:
                void = (
                    cq.Workplane("XY")
                    .workplane(offset=start_offset)
                    .circle(inner_radius)
                    .extrude(cut_height)
                )
                body = body.cut(void)
        elif params.end_style == "both_closed":
            # Leave cap_thickness at both ends
            start_offset = -params.height / 2.0 + params.end_cap_thickness
            cut_height = params.height - 2.0 * params.end_cap_thickness
            if cut_height > 0:
                void = (
                    cq.Workplane("XY")
                    .workplane(offset=start_offset)
                    .circle(inner_radius)
                    .extrude(cut_height)
                )
                body = body.cut(void)

    return body


