from cadlib.inserts import insert_boss
from cadlib.enclosures import elliptical_enclosure, d_shaped_enclosure


def main() -> None:
    comp = elliptical_enclosure(length=100, width=60, height=30, wall_thickness=2.4, lid_height=6)
    comp2 = d_shaped_enclosure(diameter=80, flat_width=50, height=30, wall_thickness=2.4, lid_height=6)
    boss = insert_boss(size="M3", height=6.0)
    return {"elliptical_enclosure": comp, "d_shaped_enclosure": comp2, "insert_boss": boss}


if __name__ == "__main__":
    print(main())


