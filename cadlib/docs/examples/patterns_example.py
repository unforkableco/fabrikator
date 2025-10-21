from cadlib.patterns import grid_array, linear_array, circular_array
from cadlib.cylinders import tube
from cadlib.validators import TubeParams


def main() -> None:
    peg = tube(TubeParams(outer_diameter=6, wall_thickness=1, height=10, end_style="both_closed", end_cap_thickness=1))
    peg_grid = grid_array(peg, nx=3, ny=2, dx=20, dy=20)
    peg_line = linear_array(peg, n=5, dx=12)
    peg_ring = circular_array(peg, n=8, radius=30)
    return {"peg_grid": peg_grid, "peg_line": peg_line, "peg_ring": peg_ring}


if __name__ == "__main__":
    print(main())


