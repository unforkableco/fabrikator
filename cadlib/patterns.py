from math import radians, cos, sin
from typing import Iterable

import cadquery as cq


def _fuse_shapes(shapes: Iterable[cq.Shape]) -> cq.Workplane:
    comp = cq.Compound.makeCompound(list(shapes))
    return cq.Workplane("XY").add(comp).combine()


def linear_array(solid: cq.Workplane, n: int, dx: float = 0.0, dy: float = 0.0, dz: float = 0.0) -> cq.Workplane:
    """Duplicate `solid` n times along a vector (dx, dy, dz) and fuse.

    The first instance is placed at the origin offset (0,0,0).
    """

    base_shape = solid.val()
    shapes = []
    for i in range(n):
        loc = cq.Location(cq.Vector(dx * i, dy * i, dz * i))
        shapes.append(base_shape.located(loc))
    return _fuse_shapes(shapes)


def grid_array(solid: cq.Workplane, nx: int, ny: int, dx: float, dy: float, centered: bool = True) -> cq.Workplane:
    """Create an nx by ny grid of `solid` spaced by dx, dy and fuse.

    If centered, the grid is centered around the origin.
    """

    base_shape = solid.val()
    shapes = []
    x0 = -((nx - 1) * dx) / 2.0 if centered else 0.0
    y0 = -((ny - 1) * dy) / 2.0 if centered else 0.0
    for ix in range(nx):
        for iy in range(ny):
            x = x0 + ix * dx
            y = y0 + iy * dy
            loc = cq.Location(cq.Vector(x, y, 0))
            shapes.append(base_shape.located(loc))
    return _fuse_shapes(shapes)


def circular_array(solid: cq.Workplane, n: int, radius: float, start_angle_deg: float = 0.0, arc_span_deg: float = 360.0) -> cq.Workplane:
    """Distribute `solid` around a circle or arc of given radius and fuse.

    start_angle_deg defines the first instance angle; arc_span_deg defines total arc.
    """

    base_shape = solid.val()
    shapes = []
    step = arc_span_deg / max(n - 1, 1) if arc_span_deg < 360 else 360.0 / n
    for i in range(n):
        ang = start_angle_deg + step * i
        x = radius * cos(radians(ang))
        y = radius * sin(radians(ang))
        loc = cq.Location(cq.Vector(x, y, 0))
        shapes.append(base_shape.located(loc))
    return _fuse_shapes(shapes)


