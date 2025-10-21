# Minimal example: bottom shell using cadlib only
from cadlib import RectEnclosureParams, rectangular_enclosure_base_and_lid, pcb_standoffs


def build():
    p = RectEnclosureParams(length=112, width=112, height=15, wall_thickness=2.6, lid_height=4.0, lid_clearance=0.2)
    comp = rectangular_enclosure_base_and_lid(p)
    # Return base and bosses for composition by caller
    bosses = pcb_standoffs([(46,46),(-46,46),(46,-46),(-46,-46)], height=12, outer_d=8, hole_d=2.6)
    return {"enclosure": comp, "pcb_bosses": bosses}


if __name__ == "__main__":
    print(build())


