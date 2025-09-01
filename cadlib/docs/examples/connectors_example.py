from cadlib.connectors import cutout_usb_c, cutout_rj45, cutout_dc_barrel
from cadlib.patterns import grid_array


def main() -> None:
    # Example: purely using cadlib feature solids; export handled by caller
    usb = cutout_usb_c(panel_thickness=4).translate((-20, 0, 0))
    rj = cutout_rj45(panel_thickness=4)
    dc = cutout_dc_barrel(panel_thickness=4).translate((20, 0, 0))
    # Return these features for composition in a higher-level script
    return {"usb_cutout": usb, "rj45_cutout": rj, "dc_cutout": dc}


if __name__ == "__main__":
    print(main())


