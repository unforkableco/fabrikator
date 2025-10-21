from cadlib.pcb import pcb_pocket, pcb_standoffs


def main() -> None:
    pocket = pcb_pocket(100, 60, thickness=1.6, clearance=0.3, depth=2.0).translate((0, 0, 2.0))
    holes = [(-45, -25), (45, -25), (45, 25), (-45, 25)]
    standoffs = pcb_standoffs(holes, height=6.0, outer_d=7.0, hole_d=3.2)
    return {"pcb_pocket": pocket, "pcb_standoffs": standoffs}


if __name__ == "__main__":
    print(main())


