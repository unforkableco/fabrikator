# 3D Printing Materials Guidelines

## Material Selection Rules

### PLA
- **Use for**: Prototypes, decorative parts, indoor use
- **Temperature limit**: 60°C (deforms above this)
- **Min wall**: 0.8mm
- **Design notes**: Best detail, minimal warping, brittle

### PETG  
- **Use for**: Functional parts, outdoor use, containers
- **Temperature limit**: 80°C ✓ (corrected from 70°C)
- **Min wall**: 1.0mm
- **Design notes**: Strong, chemical resistant, can string

### ABS
- **Use for**: Automotive, tools, heat exposure
- **Temperature limit**: 100°C ✓ (corrected from 80°C)
- **Min wall**: 1.2mm
- **Design notes**: Add 5° draft angles, round corners (warping prevention)

### TPU
- **Use for**: Seals, gaskets, flexible parts
- **Flexibility**: Shore A 85-95 ✓
- **Min wall**: 2.0mm
- **Design notes**: No sharp corners, thick features only

## Quick Material Rules for Code Generation

```python
# Material-specific minimums
material_constraints = {
    "PLA":  {"min_wall": 0.8, "min_feature": 0.4, "draft_angle": 0},
    "PETG": {"min_wall": 1.0, "min_feature": 0.5, "draft_angle": 0},
    "ABS":  {"min_wall": 1.2, "min_feature": 0.6, "draft_angle": 5},
    "TPU":  {"min_wall": 2.0, "min_feature": 1.0, "draft_angle": 0}
}

# Apply constraints
if material == "ABS":
    # Add draft angles to vertical walls
    taper_angle = 5  # degrees
if material == "TPU":
    # Increase all radii for flexibility
    radius = max(radius, 1.0)
```

## Default Assumptions
- If material not specified: assume **PLA** constraints
- If temperature environment specified >60°C: use **PETG** minimums
- If flexibility needed: use **TPU** minimums
- If high strength needed: use **PETG** or **ABS** minimums