# 3D Printing Constraints

## Hard Limits
- **Wall**: ≥1.0mm (0.8mm PLA only)
- **Hole**: ≥0.5mm diameter  
- **Gap**: ≥0.2mm clearance
- **Text**: ≥2mm height, ≥0.6mm depth
- **Overhang**: ≤45° without support
- **Bridge**: ≤5mm unsupported

## Design Rules
- Add 1-3° draft to tall vertical walls
- Round internal corners: `fillet(0.3)`
- Taper vertical holes: add 0.1mm per 10mm height
- Orient to minimize supports (flat base preferred)

## Material Limits (Corrected)
- **PLA**: Max 60°C ✓
- **PETG**: Max 80°C ✓ (not 70°C)
- **ABS**: Max 100°C ✓ (not 80°C)
- **TPU**: Flexible, min 2mm walls

## Fix Common Issues
```python
# Prevent warping - round corners
if area > 400:  # 20x20mm
    edges = part.edges("|Z")
    part = edges.fillet(2.0)

# Support-free design
if overhang_angle < 45:
    # Add support structure or redesign

# Clearance for moving parts  
clearance = 0.2  # minimum
hole_dia = shaft_dia + clearance

# Printable text
text_height = max(2.0, requested_height)
text_depth = max(0.6, requested_depth)
```

## Quick Rules for Generation
1. Check all walls ≥1mm
2. Check all holes ≥0.5mm
3. Check overhangs ≤45°
4. Add 0.2mm to all clearances
5. Fillet corners if part >20x20mm