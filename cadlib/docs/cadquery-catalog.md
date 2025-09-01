### CadQuery Modeling Catalog

This document specifies the shapes, features, patterns, and core CAD operations we want our AI to compose when generating 3D-printable parts with CadQuery. Each item includes parameters, defaults, and guardrails to reduce modeling and printability errors.

---

### Conventions

- **Units**: millimeters, Z-up, right-handed coordinates.
- **Return types**: functions return `cadquery.Workplane` solids unless stated otherwise.
- **Wall thickness**: configurable wherever applicable; default 2.0–3.0 mm unless otherwise specified.
- **Tolerances**: use named fits for AI-friendly choices:
  - **Fit.TIGHT**: 0.1 mm, **Fit.SNAP**: 0.2 mm, **Fit.SLIDE**: 0.4 mm (outer diameters increase or inner diameters decrease as appropriate).
- **Validation**: all parameterized builders include schema validation (min/max ranges) and early geometry checks (non-zero volume, min feature size, manifoldness where feasible).

---

### Core CAD operations (building blocks)

- **Primitives**: box, cylinder, cone/frustum, sphere, torus.
- **Sketch ops**: lines, arcs, splines, offsets; constraints where helpful.
- **Booleans**: union/combine, subtract/cut, intersect.
- **Shelling**: inward shell with min wall thickness guardrail.
- **Fillets/Chamfers**: edge selection helpers by length/feature.
- **Draft**: apply draft angles for FDM release when needed.
- **Text**: emboss/deboss text with height/depth and font options.
- **Mirrors/Transforms**: translate/rotate/mirror with helper frames.
- **Arrays/Patterns**: linear, polar, rectangular grid with orientation control.
- **Import/Export**: STEP (design), STL (print), 3MF as needed.

---

### Rectangular enclosures

Use for electronics boxes, junctions, and general housings. All variants support ribs, bosses, cable passthroughs, and mounting features.

- **Rectangular enclosure (two-part: base + lid)**
  - **Params**: length, width, height, wall_thickness, corner_radius, draft_angle, lip_overlap, screw_pattern (optional), snap_fit (optional), hinge (optional), gasket_channel (optional).
  - **Lid types**: screw-on (with bosses), snap-fit (cantilever or latches), slide-on, hinged, friction-fit.
  - **Internal features**: mounting bosses (threaded/heat-set), PCB standoffs, internal ribs, cable channels, bulkhead openings.
  - **Guardrails**: wall_thickness ≤ min(length, width)/4; ribs ≤ 60% wall; min boss-to-wall clearance.

- **One-piece enclosure with removable panel**
  - **Params**: as above plus panel_thickness, panel_recess, fastener_type.
  - **Use**: quick-access side or end panel with captive screws or snap tabs.

- **Split enclosure (book/clam-shell)**
  - **Params**: split_plane (XY/XZ/YZ), latch_type, hinge_type, fastener_count.
  - **Use**: hinge + latch or screws around perimeter, cable reliefs.

Example param schema (illustrative):

```python
class RectEnclosureParams(BaseModel):
    length: float = Field(100, ge=20, le=500)
    width: float = Field(60, ge=20, le=500)
    height: float = Field(40, ge=10, le=300)
    wall_thickness: float = Field(2.4, ge=1.2, le=8)
    corner_radius: float = Field(3, ge=0, le=20)
    draft_angle: float = Field(0.5, ge=0, le=5)
    lid_type: Literal["screw", "snap", "slide", "hinge", "friction"] = "screw"
    screw_pattern: Optional["grid", "corner", "perimeter"] = None
    snap_fit: Optional[Literal["cantilever", "latch"]] = None
    gasket_channel: bool = False
```

---

### Circular enclosures (round/oval)

Ideal for sensor pods, beacons, and lights. Support similar features to rectangular enclosures.

- **Cylindrical enclosure (body + cap)**
  - **Params**: outer_diameter, height, wall_thickness, cap_style (threaded/snap/screw), o_ring_groove (optional), internal_bosses.
  - **Variants**: straight wall or drafted; domed cap; bayonet quarter-turn cap.
  - **Guardrails**: thread selection ensures printable pitch; min cap overlap ≥ 1.5× wall_thickness.

- **Polygonal enclosure**
  - **Params**: n_sides, circumscribed_diameter, height, wall_thickness, rounding.
  - **Use**: aesthetic or anti-rolling designs.

---

### Cylinders and tubes

General-purpose cylinders and tubes for spacers, cable conduits, and handles. Wall thickness is always configurable.

- **Solid cylinder**
  - **Params**: diameter, height, fillet_top, fillet_bottom.

- **Hollow cylinder (tube)**
  - **Params**: outer_diameter, wall_thickness, height, end_style (open/one_end_closed/both_closed), end_cap_thickness, chamfer_edges.
  - **Cable passthroughs**: optional side holes, slots, or glands.

- **Stepped/bushed cylinder**
  - **Params**: step_positions, diameters, chamfers; used as bushings or spacers.

- **Flanged tube**
  - **Params**: flange_diameter, flange_thickness, hole_pattern.

Guardrails: for printability, wall_thickness ≥ 0.8 × nozzle_diameter × 2; avoid single-extrusion walls by default.

---

### Fastener features (holes, threads, inserts)

Reusable, standardized features to ensure hardware compatibility and printability.

- **Clearance holes**
  - **Params**: standard (ISO/UNC) + size (e.g., M3, M4), fit (TIGHT/SNAP/SLIDE), through_or_blind, counterbore/countersink options.
  - **Behavior**: picks nominal diameter from a table and applies fit offset.

- **Pilot/tapping holes**
  - **Params**: standard + size; pilot depth; thread-forming vs cutting recommendations.

- **Helical threads (modeled)**
  - **Params**: standard + size + pitch; external/internal; length; start chamfer.
  - **Note**: use sparingly; prefer heat-set inserts for durability; ensure layer height/pitch compatibility.

- **Heat-set insert bosses**
  - **Params**: insert size (e.g., M3), boss_outer_diameter, insertion_depth, relief_grooves.
  - **Guardrails**: boss OD based on manufacturer datasheet with wall clearance.

- **Captive nut pockets**
  - **Params**: nut type (hex/square), across_flats, depth, lead-in chamfer.

- **Countersink/counterbore features**
  - **Params**: head_type (flat/pan/socket), head_diameter, head_height, angle (for CSK), recess depth.

- **Fastener patterns**
  - **Types**: rectangular grid, circular (bolt circle), perimeter/corner patterns for lids.
  - **Params**: count(s), spacing/radius, start_angle, symmetry options.

---

### Mounting and joinery features

- **PCB standoffs**: cylindrical/hex, with clearance or threaded or insert-ready.
- **Bosses**: standalone or integrated in enclosures; offset and gusset options.
- **Slots and keyholes**: for wall mounting and adjustable fixtures.
- **Rails and guides**: dovetail, tongue-and-groove, slide tracks.
- **Snap-fits**: cantilever, annular; parametrize beam length/thickness/hooks.
- **Hinges**: print-in-place knuckles, living hinges (for PP), pin hinges (with hole).
- **Cable glands**: simplified printable glands or openings sized to rubber grommets.

---

### Patterns and arrays

- **Linear array**: nx, dx; ny, dy; orientation vectors.
- **Circular array**: n, radius, start_angle, arc_span.
- **Grid/rectangular**: nx × ny with optional staggering.
- **Path array**: distribute features along spline/path with tangent alignment.

All patterns expose a function that accepts a `Workplane` feature factory or solid and returns a composed solid or cut pattern.

---

### Filleting, chamfering, and edge selection helpers

- **Fillet all safe edges**: exclude sharp interior corners critical to fit.
- **Chamfer holes**: small lead-in chamfer to ease screw insertion.
- **Edge queries**: by axis alignment, length thresholds, or tag labels.

---

### Text, icons, and metadata

- **Emboss/deboss text**: font, size, depth/height; align on faces.
- **Icons/arrows**: relief features for assembly and IO labeling.
- **Metadata**: version stamp and print orientation hints.

---

### Validation and printability guardrails

- **Parameter bounds**: reject impossible or non-printable dimensions early.
- **Manifold checks**: ensure solids after booleans; fallback messages with guidance.
- **Minimums**: wall, hole diameter (≥ 2× nozzle diameter or per printer capability), bridge length limits.
- **Clearances**: fit presets applied consistently for mating parts.
- **Overhangs**: optional draft or chamfer to reduce supports.

---

### Example builder interfaces (sketch)

```python
def rectangular_enclosure(params: RectEnclosureParams) -> cq.Workplane: ...

class CylEnclosureParams(BaseModel):
    outer_diameter: float
    height: float
    wall_thickness: float
    cap_style: Literal["threaded", "snap", "screw"] = "screw"
    o_ring_groove: bool = False

def cylindrical_enclosure(p: CylEnclosureParams) -> cq.Workplane: ...

class TubeParams(BaseModel):
    outer_diameter: float
    wall_thickness: float
    height: float
    end_style: Literal["open", "one_end_closed", "both_closed"] = "open"
    end_cap_thickness: float = 2.0

def tube(p: TubeParams) -> cq.Workplane: ...

class HoleSpec(BaseModel):
    standard: Literal["ISO", "UNC"] = "ISO"
    size: Literal["M2", "M2_5", "M3", "M4", "M5", "M6"]
    fit: Literal["TIGHT", "SNAP", "SLIDE"] = "SNAP"
    through: bool = True
    counterbore: bool = False
    countersink: bool = False

def screw_hole(spec: HoleSpec) -> Callable[[cq.Workplane], cq.Workplane]: ...
```

---

### Example compositions

- Rectangular enclosure with PCB standoffs (M3 heat-set), snap-fit lid, cable gland opening.
- Cylindrical sensor pod with threaded cap and O-ring groove, wall mount slots.
- Flanged tube with bolt circle pattern and counterbored holes.
- Split shell with living hinge and cantilever snaps; internal ribs for stiffness.

---

### Additional enclosure shapes

- **Elliptical/oval (capsule/racetrack) enclosure**
  - Params: major_axis, minor_axis, height, wall_thickness, corner_radius, lid_type, snap_rail/bayonet options.
  - Use: wearables, sensors; smoother aesthetics and better pocketability.

- **D-shaped enclosure**
  - Params: diameter, flat_width, height, wall_thickness, flat_alignment.
  - Use: anti-rolling housings; oriented IO on flat.

- **Wedge/tapered enclosure**
  - Params: base_length/width, top_length/width, height, wall_thickness, draft.
  - Use: ergonomic tilts, desk controllers, display bezels.

- **Rounded-rect with domed lid**
  - Params: length, width, height, wall_thickness, dome_radius/height.
  - Use: improved strength, reduced pooling on top surfaces.

- **Multi-part polygonal enclosure**
  - Params: n_sides, circumscribed_diameter, split_plane, fastener_pattern.
  - Use: stylistic shells; anti-roll features.

Guardrails: maintain minimum lid engagement ≥ 1.5× wall_thickness; ensure snap beams satisfy thickness and beam length guidelines.

---

### Electro‑mechanical standards and hole patterns

- **NEMA motor mounts**: NEMA 14/17/23 plates and hole patterns; pilot bore and recess.
- **VESA mounts**: 75/100 mm patterns with countersinks/counterbores, slot variants for tolerance.
- **DIN‑rail clips**: 35 mm top‑hat snap/clip with printable latch geometry.
- **2020/2040 extrusion brackets**: L/T/corner brackets; T‑slot clearances and counterbores.
- **Tripod mount**: 1/4‑20 insert boss and clearance hole patterns.
- **GoPro style**: 3‑prong/2‑prong tabs with through-holes.
- **Servo mounts**: SG90/MG996R horn/ear hole patterns, pockets.
- **Bearings**: seats for 608/625/623 with chamfer/retention lip and interference presets.
- **Shaft features**: keyways, D‑flats, set‑screw bosses with threaded holes.
- **Belts and gears**: GT2 pulley skeletons (parameterized), belt clamp blocks, spur & rack gear helpers.

---

### PCB‑centric features and connector cutouts

- **PCB outline import**: STEP/DXF to generate pockets, rails, and keep‑out zones.
- **Standoffs/rails**: datum‑based arrays with height, fillet, insert options.
- **Clip‑in tabs**: flex catches sized to board thickness with lead‑ins.
- **Connector cutouts library**:
  - USB‑C, Micro‑USB, RJ45, DC barrel (5.5×2.1), JST‑XH/PH, HDMI, SMA/MCX.
  - Params: panel_thickness, nut_capture (for SMA), relief fillets, keep‑out cones.

---

### Human interface and acoustics

- **Buttons/encoders**: cylindrical bosses and panel cutouts with flats and anti‑rotation features.
- **Rocker/toggle switch cutouts**: common series with corner radii and snap tabs.
- **LED windows/light pipes**: prisms/tunnels with polishing allowance and diffusion caps.
- **Speaker/microphone grills**: hex/slot/spiral patterns with ribbing, tuned open‑area.
- **Display windows**: bezel/lens recess, screw/snap frames, gasket options.

---

### Sealing, vents, and environmental features

- **O‑ring glands (AS568)**: face and radial glands with compression control and stop beads.
- **Gasket channels**: rectangular/lipped with fastener spacing helpers.
- **Labyrinth/drip‑edge seals**: stepped overlaps for splash resistance.
- **Louvres/vents**: self‑supporting slats ≤ 45°; rain‑shed orientations.

---

### Cable management and strain relief

- **Cable clips/tie mounts**: sizes by cable OD; adhesive pads or screw holes.
- **Zip‑tie slots**: chamfered entries and anti‑slip teeth options.
- **Strain‑relief boots**: printable clamps with living hinges.
- **Grommet seats**: ISO panel hole sizes and filleted seats.
- **Gland cutouts**: PG/NPT series with flats for anti‑rotation.

---

### Expanded fasteners and alignment

- **Tables**: full metric/imperial clearance and pilot diameters (close/normal/loose).
- **Self‑tapping pilots**: plastics‑specific pilots for thread‑forming screws.
- **Heat‑set insert families**: M2–M6 with datasheet‑driven bosses and relief grooves.
- **Captive nut pockets**: hex/square with lead‑ins, orientation control.
- **Locating pins**: round/diamond pairs for repeatable alignment.

---

### Joinery methods

- **Bayonet/twist‑lock**: ramps and stops with insertion angle and clearance.
- **Dovetail slides**: single/double with retention nibs.
- **Tongue‑and‑groove**: perimeter joinery for split shells.
- **Ultrasonic welding energy directors**: triangular beads on mating faces.
- **Snap‑fit generators**: cantilever beams with hook profiles and stress guards.

---

### Thermal and airflow

- **Heatsink fins**: parametric fin pitch/height with base thickness.
- **Chimney vents**: vertical channels promoting convection.
- **Fan mounts**: 40/60/80/92/120 mm patterns, countersunk/counterbored, guards (grid/honeycomb).

---

### Printability and material profiles

- **Material presets**: PLA/PETG/ABS mapping to fit offsets and min wall/bridge guidelines.
- **Overhang advisor**: auto draft/chamfer > 45° where possible.
- **Thin‑feature detector**: flags walls < 2 × nozzle_diameter and holes < 2 × nozzle.
- **Layer‑snapper**: suggests wall multiples aligned to layer height and nozzle.

---

### Standard hole patterns (library)

- **NEMA 14/17/23**, **VESA 75/100**, **2020/2040 T‑slot**, **servo horns**, common bolt circles.
- Expose as reusable pattern builders returning points/workplanes for composition.

---

### Next steps

1. Review and amend this catalog to ensure coverage for your target parts.
2. Prioritize feature builders to implement first (likely: enclosures, tube, screw holes, insert bosses, patterns).
3. Implement validated parameter models and CadQuery builders per section.
4. Add golden examples and snapshot tests to lock behavior.


