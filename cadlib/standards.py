from typing import List, Tuple
import cadquery as cq


def pattern_nema17(origin: Tuple[float, float, float] = (0, 0, 0)) -> List[Tuple[float, float, float]]:
    """Return XY hole locations for NEMA17 motor mount (4 holes, 31 mm square).

    Coordinates in mm, centered on shaft.
    """

    pitch = 31.0
    half = pitch / 2.0
    ox, oy, oz = origin
    return [
        (ox - half, oy - half, oz),
        (ox + half, oy - half, oz),
        (ox + half, oy + half, oz),
        (ox - half, oy + half, oz),
    ]


def pattern_vesa(size_mm: int = 75, origin: Tuple[float, float, float] = (0, 0, 0)) -> List[Tuple[float, float, float]]:
    """Return XY hole locations for VESA 75 or 100 patterns.

    size_mm must be 75 or 100.
    """

    if size_mm not in (75, 100):
        raise ValueError("VESA size must be 75 or 100 mm")
    half = size_mm / 2.0
    ox, oy, oz = origin
    return [
        (ox - half, oy - half, oz),
        (ox + half, oy - half, oz),
        (ox + half, oy + half, oz),
        (ox - half, oy + half, oz),
    ]


def bolt_circle(n: int, radius: float, start_angle_deg: float = 0.0, origin: Tuple[float, float, float] = (0, 0, 0)) -> List[Tuple[float, float, float]]:
    from math import radians, cos, sin

    step = 360.0 / n
    ox, oy, oz = origin
    pts = []
    for i in range(n):
        ang = radians(start_angle_deg + step * i)
        x = ox + radius * cos(ang)
        y = oy + radius * sin(ang)
        pts.append((x, y, oz))
    return pts


