from cadlib.validators import TubeParams
from cadlib.cylinders import tube


def main() -> None:
    params = TubeParams(outer_diameter=30.0, wall_thickness=2.4, height=60.0, end_style="one_end_closed", end_cap_thickness=3.0)
    part = tube(params)
    return {"tube": part}


if __name__ == "__main__":
    print(main())


