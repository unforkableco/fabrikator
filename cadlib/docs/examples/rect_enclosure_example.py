from cadlib.validators import RectEnclosureParams
from cadlib.enclosures import rectangular_enclosure_base_and_lid


def main() -> None:
    p = RectEnclosureParams(length=100, width=60, height=30, wall_thickness=2.4, lid_height=6.0, lid_clearance=0.2, corner_radius=4)
    comp = rectangular_enclosure_base_and_lid(p)
    return {"rect_enclosure": comp}


if __name__ == "__main__":
    print(main())


