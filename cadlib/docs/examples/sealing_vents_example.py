from cadlib.sealing import o_ring_gland_face
from cadlib.vents import louvre_panel


def main() -> None:
    gland = o_ring_gland_face(diameter=60, cross_section=2.5, squeeze=0.15)
    panel = louvre_panel(length=100, width=60, thickness=3, slot_width=3, slot_pitch=8)
    return {"o_ring_gland": gland, "louvre_panel": panel}


if __name__ == "__main__":
    print(main())


