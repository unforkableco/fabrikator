### cadlib API Reference

This reference documents the public functions and data models in `cadlib` for building 3D‑printable parts. It is optimized for code generation by AI and manual use.

---

### Conventions

- Units: millimeters; coordinate frame Z‑up.
- Returns: all builders return solids that can be composed and exported by the caller. Some functions return composite solids for convenience.
- Printability: defaults target FDM printing; wall thicknesses are expressed in mm.

---

### Top‑level import

Recommended import for codegen:

```python
from cadlib import *
```

This exposes the key builders and parameter models.

---

### utils

- Fit
  - Enum of clearance presets (mm): `TIGHT=0.10`, `SNAP=0.20`, `SLIDE=0.40`.

- apply_fit_to_hole(nominal_diameter_mm: float, fit: Fit) -> float
  - Returns a hole diameter adjusted by the fit (nominal + clearance).

- min_printable_wall_mm(nozzle_mm: float = 0.4, line_count: int = 2) -> float
  - Returns the minimum recommended printable wall thickness as nozzle × line_count.

---

### validators (parameter models)

- TubeParams
  - Fields: `outer_diameter` [2..1000], `wall_thickness` [0.8..100], `height` [1..2000], `end_style` {open|one_end_closed|both_closed}, `end_cap_thickness` [0.8..20].
  - Validation: enforces `2×wall_thickness < outer_diameter`.

- HoleSpec
  - Fields: `standard` {ISO|UNC}, `size` {M2,M2_5,M3,M4,M5,M6}, `fit` {TIGHT|SNAP|SLIDE}, `through` bool, `depth` (required if blind), `counterbore` bool, `countersink` bool, `head_type` {flat|pan|socket}.

- RectEnclosureParams
  - Fields: `length` [20..1000], `width` [20..1000], `height` [10..1000], `wall_thickness` [1.2..10], `lid_height` [2..30], `lid_clearance` [0.05..1.0], `corner_radius` [0..min(length,width)/2].
  - Validation: `lid_height < height`.

---

### cylinders

- tube(params: TubeParams) -> Solid
  - Builds a cylindrical tube (Z‑symmetric extrude). `end_style` controls internal void at ends; `end_cap_thickness` leaves material at closed ends. Raises ValueError if `height <= 0`.

---

### fasteners

- apply_screw_holes(target: Solid, locations_xyz_mm: list[(x,y,z)], spec: HoleSpec) -> Solid
  - Applies through/blind holes with optional counterbore/countersink at absolute XYZ locations (workplane transforms are used per location).
  - Uses internal ISO clearance table and `Fit` for sizing; countersink uses flat head angle; counterbore sizes for pan/socket heads.

Notes: Internal tables include `ISO_CLEARANCE_DIAMETERS_MM` and approximate `HEAD_DIMENSIONS_MM`.

---

### patterns

- linear_array(solid: Solid, n: int, dx: float = 0, dy: float = 0, dz: float = 0) -> Solid
  - Duplicates and fuses `solid` along a vector step.

- grid_array(solid: Solid, nx: int, ny: int, dx: float, dy: float, centered: bool = True) -> Solid
  - Places `nx×ny` instances on a grid; optionally centered about origin.

- circular_array(solid: Solid, n: int, radius: float, start_angle_deg: float = 0, arc_span_deg: float = 360) -> Solid
  - Distributes instances around a circle or arc and fuses.

---

### standards

- pattern_nema17(origin: (x,y,z)=(0,0,0)) -> list[(x,y,z)]
  - Returns 4 hole centers on a 31 mm square about origin.

- pattern_vesa(size_mm: int, origin=(0,0,0)) -> list[(x,y,z)]
  - Returns VESA 75 or 100 mm square hole centers. Raises on invalid size.

- bolt_circle(n: int, radius: float, start_angle_deg: float = 0, origin=(0,0,0)) -> list[(x,y,z)]
  - Returns points on an `n`‑hole bolt circle.

---

### pcb

- pcb_pocket(board_length: float, board_width: float, thickness: float, clearance: float = 0.2, depth: float | None = None) -> Solid
  - Returns a rectangular pocket solid to cut; size includes XY clearance; default depth = thickness.

- pcb_standoffs(hole_locations_xy: list[(x,y)], height: float, outer_d: float = 6.0, hole_d: float = 3.2, fillet: float = 0.8) -> Solid
  - Returns fused cylindrical standoffs with through holes. Fillet may be skipped if geometry is too small.

---

### connectors

- cutout_usb_c(panel_thickness: float, clearance: float = 0.2) -> Solid
  - Rounded rectangle panel opening solid to cut; extrusion depth equals panel thickness.

- cutout_rj45(panel_thickness: float, clearance: float = 0.3) -> Solid
  - Rectangular opening solid to cut (common RJ45 panel size).

- cutout_dc_barrel(panel_thickness: float, clearance: float = 0.2) -> Solid
  - Circular opening solid to cut (~8 mm nominal + clearance).

---

### sealing

- o_ring_gland_face(diameter: float, cross_section: float, squeeze: float = 0.15, groove_depth_factor: float = 0.85) -> Solid
  - Face seal gland ring to cut; returns a thin ring solid extruded by groove depth. Parameters control compression and depth.

- gasket_channel_rect(length: float, width: float, channel_width: float, depth: float, corner_radius: float = 1.0) -> Solid
  - Rectangular gasket channel ring solid (outer minus inner extrusion). Optional vertical edge fillet for softening.

---

### vents

- louvre_panel(length: float, width: float, thickness: float, slot_width: float, slot_pitch: float, tilt_deg: float = 35.0) -> Solid
  - Creates a solid panel and subtracts tilted slots for self‑supporting louvres. `slot_pitch` controls row spacing.

---

### inserts

- insert_boss(size: str = "M3", height: float = 6.0, wall: float = 1.2, through_hole: bool = True) -> Solid
  - Heat‑set insert boss with internal relief. Supported sizes: M2, M2_5, M3, M4. Hole is slightly undersized to account for insertion.

---

### enclosures

- rectangular_enclosure_base_and_lid(params: RectEnclosureParams) -> Composite
  - Two solids (base + lid) with an internal lip/recess interface. Outer dims are `length×width×height` for base; lid height given by `lid_height`.
  - Corner rounding: honors `corner_radius` by filleting the rectangle profile before extrude for both base and lid.
  - Hollowing strategy: base is shelled inward from the open top face (`faces(">Z").shell(-wall_thickness)`); lid is shelled inward from the bottom face (`faces("<Z").shell(-wall_thickness)`) to avoid collapse.

- elliptical_enclosure(length: float, width: float, height: float, wall_thickness: float, lid_height: float) -> Composite
  - Capsule‑shaped (racetrack) enclosure base + lid using a slot profile. Returns a compound with two solids.

- d_shaped_enclosure(diameter: float, flat_width: float, height: float, wall_thickness: float, lid_height: float) -> Composite
  - D‑profile enclosure (circle + flat). Returns compound with base and lid solids.

---

### Quick usage examples

```python
from cadlib import TubeParams, tube, HoleSpec, apply_screw_holes

# Tube with one end closed
tp = TubeParams(outer_diameter=30, wall_thickness=2.4, height=60, end_style="one_end_closed", end_cap_thickness=3)
tube_part = tube(tp)

# Plate with M3 counterbored holes
spec = HoleSpec(size="M3", fit="SNAP", through=True, counterbore=True, head_type="socket")
plate = apply_screw_holes(tube_part, [(-20,-10,2.5),(20,10,2.5)], spec)
```

```python
from cadlib import RectEnclosureParams, rectangular_enclosure_base_and_lid

p = RectEnclosureParams(
    length=100,
    width=60,
    height=30,
    wall_thickness=2.4,
    lid_height=6.0,
    lid_clearance=0.2,
    corner_radius=4.0,
)
enclosure = rectangular_enclosure_base_and_lid(p)
# Export handled by caller utilities
```

---

### Notes

- All solids are modeled Z‑up and centered unless noted. Some features use absolute coordinates for convenience.
- For mating parts, prefer `Fit.SNAP` or `Fit.SLIDE` depending on material and printer calibration.


