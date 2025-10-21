# CadQuery Errors and Solutions

## Selection Errors
- **Error**: Empty selection causes operation failure
- **Fix**: `if selected.size() > 0:` before any operation
- **Never**: Use `len()` on Workplane - always `.size()`

## Geometry Errors  
- **Error**: Invalid geometry from operations
- **Fix**: Clamp radii to `min(radius, smallest_dimension/4)`
- **Fix**: Shell thickness must be `< min_dimension/2`, use negative values: `shell(-2.0)`

## Dimension Issues
- **Error**: Negative/zero dimensions
- **Fix**: `width = max(abs(width), 1.0)` for all dimensions
- **Fix**: Minimum feature size = 0.5mm, minimum wall = 1.0mm

## Export Errors
- **Error**: Cannot export Workplane directly  
- **Fix**: Use `part.val()` or `part.export(filename)`
- **Pattern**: `cq.exporters.export(part.val(), STL_PATH)`

## Quick Fixes
1. `workplane.size()` not `len(workplane)`  ✓
2. Check selection: `if edges.size() > 0:`  ✓
3. Clamp radius: `min(max(r, 0.1), dim/4)`  ✓
4. Safe selectors: `"|Z"`, `">Z"`, `"<Z"`  ✓
5. **Python uses `try/except` not `try/catch`**  ❌ (corrected)

## Safe Patterns for Generation
```python
# Selection check
faces = part.faces(">Z")
if faces.size() > 0:
    part = faces.workplane()

# Dimension validation  
w = max(dims[0], 1.0)
h = max(dims[1], 1.0)
d = max(dims[2], 1.0)

# Safe fillet
if edges.size() > 0:
    r = min(radius, min_edge/4)
    part = edges.fillet(r)

# Export
result.export(STL_PATH)  # or
cq.exporters.export(result.val(), STL_PATH)
```