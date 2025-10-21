from cadlib import RectEnclosureParams, rectangular_enclosure_base_and_lid, cutout_usb_c, louvre_panel


def build():
    p = RectEnclosureParams(length=112, width=112, height=4.0, wall_thickness=2.6, lid_height=4.0, lid_clearance=0.2)
    comp = rectangular_enclosure_base_and_lid(p)
    usb = cutout_usb_c(panel_thickness=4.0).translate((0, 54, 0))
    vents = louvre_panel(80, 40, 3, slot_width=3, slot_pitch=8).translate((0, 0, 5))
    return {"enclosure": comp, "usb_cutout": usb, "vents": vents}


if __name__ == "__main__":
    print(build())


