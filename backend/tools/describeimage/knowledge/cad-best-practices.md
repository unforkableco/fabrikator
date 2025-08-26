# CadQuery Best Practices

## Core Principles
- Always start with a base workplane and build incrementally
- Use .union(), .cut(), and .intersect() for boolean operations
- Keep feature sizes reasonable - minimum 0.5mm for 3D printing
- Clamp all radii and chamfer sizes to prevent failures
- Never use len() on Workplane objects - use .size() instead

## Common Patterns
- Create parametric models using variables for dimensions
- Use .workplane() to change reference planes for complex features
- Apply .edges() and .faces() selectors carefully with size checks
- Use .shell() for hollow parts but ensure minimum wall thickness
- Add .chamfer() or .fillet() to sharp edges for better printing

## Error Prevention
- Always check if selections are empty before applying operations
- Use try/catch blocks around complex operations
- Validate dimensions are positive and reasonable
- Ensure workplane references exist before operations
- Use .val() to extract solids from Workplane objects for export