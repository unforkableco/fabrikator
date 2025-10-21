from cadlib.fasteners import apply_screw_holes
from cadlib.validators import HoleSpec
from cadlib.cylinders import tube
from cadlib.validators import TubeParams


def main() -> None:
    base = tube(TubeParams(outer_diameter=60, wall_thickness=2, height=5, end_style="both_closed", end_cap_thickness=1))
    spec = HoleSpec(size="M3", fit="SNAP", through=True, counterbore=True, head_type="socket")
    holes = [(-20, -10, 2.5), (20, -10, 2.5), (-20, 10, 2.5), (20, 10, 2.5)]
    result = apply_screw_holes(base, holes, spec)
    return {"plate_with_holes": result}


if __name__ == "__main__":
    print(main())


