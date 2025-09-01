from enum import Enum


class Fit(Enum):
    """Discrete clearances in millimeters for AI-friendly selection.

    Applied as additive clearance to nominal dimensions (e.g., hole diameters).
    """

    TIGHT = 0.10
    SNAP = 0.20
    SLIDE = 0.40


DEFAULT_NOZZLE_DIAMETER_MM: float = 0.4
DEFAULT_LAYER_HEIGHT_MM: float = 0.2


def apply_fit_to_hole(nominal_diameter_mm: float, fit: Fit) -> float:
    """Return a hole diameter adjusted by the selected fit.

    For printed clearance holes, we expand the hole diameter.
    """

    return nominal_diameter_mm + float(fit.value)


def min_printable_wall_mm(nozzle_mm: float = DEFAULT_NOZZLE_DIAMETER_MM, line_count: int = 2) -> float:
    """Minimum practical printable wall thickness in mm for FDM.

    Uses number of perimeters (lines) multiplied by nozzle diameter.
    """

    return nozzle_mm * float(line_count)


