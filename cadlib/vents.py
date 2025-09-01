import cadquery as cq


def louvre_panel(length: float, width: float, thickness: float, slot_width: float, slot_pitch: float, tilt_deg: float = 35.0) -> cq.Workplane:
    """Generate a vented panel with angled louvres (self-supporting for FDM).

    Creates a rectangular plate and subtracts tilted slots.
    """

    plate = cq.Workplane("XY").rect(length, width).extrude(thickness)
    n_slots = int((width - slot_pitch) // slot_pitch)
    if n_slots <= 0:
        return plate
    y0 = -((n_slots - 1) * slot_pitch) / 2.0
    for i in range(n_slots):
        y = y0 + i * slot_pitch
        slot = (
            cq.Workplane("XY")
            .workplane(offset=thickness / 2.0)
            .transformed(rotate=(tilt_deg, 0, 0))
            .center(0, y)
            .rect(length * 0.8, slot_width)
            .extrude(thickness)
        )
        plate = plate.cut(slot)
    return plate


