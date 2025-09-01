from cadlib.standards import pattern_nema17
from cadlib.validators import HoleSpec
from cadlib.fasteners import apply_screw_holes
from cadlib.cylinders import tube
from cadlib.validators import TubeParams


def main() -> None:
    base = tube(TubeParams(outer_diameter=80, wall_thickness=2, height=6, end_style="both_closed", end_cap_thickness=1))
    holes = [(x, y, 3) for (x, y, _) in pattern_nema17()]
    spec = HoleSpec(size="M3", fit="SNAP", through=True)
    plate = apply_screw_holes(base, holes, spec)
    return {"nema17_plate": plate}


if __name__ == "__main__":
    print(main())


