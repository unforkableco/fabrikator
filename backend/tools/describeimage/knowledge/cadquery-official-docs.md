# CadQuery Essential Reference Documentation - (scraped with context7)

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Workplane Fundamentals](#workplane-fundamentals)
3. [Selection Operations](#selection-operations)
4. [2D Operations](#2d-operations)
5. [3D Operations](#3d-operations)
6. [Error Prevention](#error-prevention)
7. [Export Operations](#export-operations)
8. [Common Patterns](#common-patterns)

## Core Concepts

### The Workplane Object
The Workplane is the fundamental building block in CadQuery. It represents a 2D coordinate system in 3D space where you can create sketches and perform operations.

```python
import cadquery as cq

# Create initial workplane
part = cq.Workplane("XY")  # XY, XZ, or YZ planes
```

### The Stack
Each CadQuery operation returns a new Workplane object containing the result. This creates a chain or "stack" of operations:

```python
# Each operation returns a new Workplane
result = (cq.Workplane("XY")
    .box(10, 10, 10)      # Returns new Workplane with box
    .faces(">Z")          # Returns new Workplane with selected face
    .workplane()          # Returns new Workplane on selected face
    .circle(3)            # Returns new Workplane with circle
    .extrude(5))          # Returns new Workplane with extruded cylinder
```

### Context Solid
The first solid created becomes the "context solid". Subsequent operations automatically combine with it unless `combine=False` is specified:

```python
# Automatic combination (default)
part = cq.Workplane("XY").box(10, 10, 10).faces(">Z").hole(5)

# Prevent combination
part = cq.Workplane("XY").box(10, 10, 10).faces(">Z").hole(5, combine=False)
```

## Workplane Fundamentals

### Creating Workplanes

```python
# Standard planes
wp = cq.Workplane("XY")  # XY plane at origin
wp = cq.Workplane("XZ")  # XZ plane at origin  
wp = cq.Workplane("YZ")  # YZ plane at origin

# From selected face
wp = part.faces(">Z").workplane()

# With offset
wp = part.faces(">Z").workplane(offset=5)

# With specific origin
wp = cq.Workplane("XY", origin=(10, 20, 30))

# Transformed workplane
wp = part.workplane().transformed(
    offset=cq.Vector(0, -1.5, 1.0),
    rotate=cq.Vector(60, 0, 0)
)
```

### Workplane Methods

```python
# Movement and positioning
.center(x, y)           # Move to center point
.moveTo(x, y)          # Move to absolute position
.move(x, y)            # Move relative to current position

# Transformation
.translate(Vector(x, y, z))
.rotate(axis_vector, center_vector, angle_degrees)
.rotateAboutCenter(axis_vector, angle_degrees)
.mirror(mirrorPlane)
```

## Selection Operations

### Face Selection

```python
# Directional selectors
.faces(">Z")   # Face with center furthest in +Z direction
.faces("<Z")   # Face with center furthest in -Z direction
.faces("|Z")   # Faces parallel to Z axis
.faces("#Z")   # Faces perpendicular to Z axis
.faces(">>Z")  # The single face furthest in +Z direction

# Multiple conditions
.faces(">Z and >X")
.faces(">Z or <X")
```

### Edge Selection

```python
.edges("|Z")       # Edges parallel to Z axis
.edges("#Z")       # Edges perpendicular to Z axis
.edges(">Z")       # Edges with center furthest in +Z
.edges("%Circle")  # Circular edges
.edges("%Line")    # Linear edges
```

### Vertex Selection

```python
.vertices(">Z")      # Vertices furthest in +Z
.vertices("<XY")     # Vertex furthest in -X and -Y
.vertices()          # All vertices
```

### Selection Safety

```python
# CRITICAL: Always check selection size
selection = part.faces(">Z")
if selection.size() > 0:
    part = selection.workplane()
    # Continue operations
    
# NEVER use len() on Workplane
# WRONG: if len(part.faces(">Z")) > 0:
# CORRECT: if part.faces(">Z").size() > 0:
```

## 2D Operations

### Basic Shapes

```python
# Rectangle
.rect(width, height, centered=True, forConstruction=False)

# Circle  
.circle(radius)

# Ellipse
.ellipse(x_radius, y_radius)

# Regular polygon
.polygon(nSides, diameter)

# Slot
.slot2D(width, length)
```

### Lines and Curves

```python
# Line operations
.lineTo(x, y)              # Draw line to absolute position
.line(xDist, yDist)        # Draw line relative distances
.hLine(length)             # Horizontal line
.vLine(length)             # Vertical line
.hLineTo(x)                # Horizontal line to x coordinate
.vLineTo(y)                # Vertical line to y coordinate
.polarLine(distance, angle) # Line using polar coordinates

# Arcs
.threePointArc(point1, point2)  # Arc through 3 points
.sagittaArc(endPoint, sag)      # Arc with specified sag
.radiusArc(endPoint, radius)    # Arc with specified radius
.tangentArcPoint(endpoint, relative=True)

# Advanced curves
.spline(pointList, includeCurrent=True)
.polyline(points)
.close()  # Close current wire
```

### Arrays and Patterns

```python
# Rectangular array
.rarray(xSpacing, ySpacing, xCount, yCount)

# Polar array
.polarArray(radius, startAngle, angle, count)

# Push points for operations
.pushPoints([(x1, y1), (x2, y2), ...])
```

## 3D Operations

### Primitive Creation

```python
# Box
.box(length, width, height, centered=(True, True, True))

# Cylinder
.cylinder(height, radius, centered=(True, True, True))

# Sphere
.sphere(radius)

# Wedge
.wedge(xmin, ymin, zmin, xmax, ymax, zmax)

# Text (3D)
.text(txt, fontsize, distance, cut=True, combine=True, font="Arial")
```

### Extrusion and Revolution

```python
# Linear extrusion
.extrude(distance, both=False, taper=0)

# Cut operations
.cutBlind(distance)        # Cut to specified depth
.cutThruAll()             # Cut through entire solid

# Revolution
.revolve(angleDegrees=360, axisStart=None, axisEnd=None)

# Sweep along path
.sweep(path, multisection=False, transition='right', normal=None, auxSpine=None)

# Loft between wires
.loft(ruled=False, combine=True)
```

### Holes

```python
# Simple hole
.hole(diameter, depth=None)

# Counterbore hole
.cboreHole(diameter, cboreDiameter, cboreDepth)

# Countersink hole
.cskHole(diameter, cskDiameter, cskAngle=82)
```

### Boolean Operations

```python
# Union (add)
.union(toUnion, clean=True, glue=False, tol=None)

# Cut (subtract)
.cut(toCut, clean=True, tol=None)

# Intersect
.intersect(toIntersect, clean=True, tol=None)

# Combine parameter in operations
.box(10, 10, 10, combine='cut')  # or 'union', 'intersect'
```

### Filleting and Chamfering

```python
# Fillet edges
edges = part.edges("|Z")
if edges.size() > 0:
    safe_radius = min(requested_radius, max_safe)
    part = edges.fillet(safe_radius)

# Chamfer edges
edges = part.edges(">Z")
if edges.size() > 0:
    part = edges.chamfer(length, length2=None)

# Shell (hollow out solid)
.shell(thickness, kind='arc')
```

### Each Operations

```python
# Apply operation at each point
.eachpoint(callback, useLocalCoordinates=False, combine='union')

# Example with lambda
.eachpoint(lambda loc: cq.Workplane().sphere(1))
```

## Error Prevention

### Common Issues and Solutions

```python
# 1. Empty selection handling
def safe_face_operation(part):
    faces = part.faces(">Z")
    if faces.size() == 0:
        return part  # Return unchanged if no faces
    return faces.workplane().circle(5).extrude(10)

# 2. Radius clamping for features
def safe_fillet(part, requested_radius, max_dimension):
    safe_radius = min(requested_radius, max_dimension * 0.4)
    edges = part.edges()
    if edges.size() > 0:
        return edges.fillet(safe_radius)
    return part

# 3. Dimension validation
def build_part(dims):
    # Ensure positive dimensions
    width = max(dims[0], 1.0)
    height = max(dims[1], 1.0)
    depth = max(dims[2], 1.0)
    
    return cq.Workplane("XY").box(width, height, depth)

# 4. Safe hole creation
def add_hole(part, diameter, face_size):
    # Ensure hole fits on face
    safe_diameter = min(diameter, face_size * 0.8)
    return part.hole(safe_diameter)
```

### Selection Validation Pattern

```python
def robust_operation(part):
    # Step 1: Select
    selection = part.faces(">Z")
    
    # Step 2: Validate
    if selection.size() == 0:
        print("Warning: No faces selected")
        return part
    
    # Step 3: Get single item if needed
    if selection.size() > 1:
        selection = selection.first()
    
    # Step 4: Proceed with operation
    return selection.workplane().circle(5).extrude(10)
```

## Export Operations

### STL Export

```python
import cadquery as cq

# Basic export
cq.exporters.export(part, "output.stl")

# With tolerance control
cq.exporters.export(part, "output.stl", tolerance=0.001, angularTolerance=0.1)

# Using Workplane method
part.export("output.stl")
```

### STEP Export

```python
# Basic STEP export
cq.exporters.export(part, "output.step")

# With options
part.export("output.step", opt={"write_pcurves": False})
```

### DXF Export (2D sections)

```python
# Export cross-section
section = part.section()
cq.exporters.export(section, "output.dxf")
```

### Other Formats

```python
# VRML
part.export("output.vrml")

# SVG (2D projection)
cq.exporters.export(part, "output.svg", opt={
    "width": 300,
    "height": 300,
    "strokeWidth": 2.0,
    "strokeColor": (255, 0, 0),
    "hiddenColor": (0, 0, 255),
    "showHidden": True
})
```

## Common Patterns

### Basic Part with Features

```python
import cadquery as cq

def build_part():
    # Base solid
    part = cq.Workplane("XY").box(100, 80, 20)
    
    # Add central hole
    faces = part.faces(">Z")
    if faces.size() > 0:
        part = faces.workplane().hole(22)
    
    # Add corner holes
    faces = part.faces(">Z")
    if faces.size() > 0:
        part = (faces.workplane()
                .rect(88, 68, forConstruction=True)
                .vertices()
                .cboreHole(2.4, 4.4, 2.1))
    
    # Fillet edges
    edges = part.edges("|Z")
    if edges.size() > 0:
        part = edges.fillet(2.0)
    
    return part
```

### Workplane on Face Pattern

```python
def face_based_feature(part):
    # Select face
    selected = part.faces(">Z")
    
    # Validate selection
    if selected.size() == 0:
        return part
    
    # Create workplane on face
    wp = selected.workplane()
    
    # Add feature
    return wp.circle(10).extrude(5)
```

### Safe Dimension Handling

```python
def create_parametric_part(width, height, depth, hole_size):
    # Validate dimensions
    w = max(width, 10.0)  # Minimum width
    h = max(height, 10.0)  # Minimum height
    d = max(depth, 5.0)   # Minimum depth
    
    # Create base
    part = cq.Workplane("XY").box(w, h, d)
    
    # Validate hole size
    max_hole = min(w, h) * 0.8
    safe_hole_size = min(hole_size, max_hole)
    
    # Add hole if valid
    if safe_hole_size > 0:
        faces = part.faces(">Z")
        if faces.size() > 0:
            part = faces.workplane().hole(safe_hole_size)
    
    return part
```

### Assembly Pattern

```python
import cadquery as cq

def create_assembly():
    # Create components
    base = cq.Workplane("XY").box(100, 100, 10)
    pin = cq.Workplane("XY").circle(5).extrude(30)
    
    # Create assembly
    assy = cq.Assembly()
    assy.add(base, name="base", color=cq.Color(1, 0, 0))
    assy.add(pin, loc=cq.Location(cq.Vector(25, 25, 0)), 
             name="pin", color=cq.Color(0, 1, 0))
    
    return assy
```

## Best Practices Summary

1. **Always validate selections** before operations
2. **Use `.size()` not `len()`** for checking selection counts
3. **Clamp feature sizes** to prevent impossible geometry
4. **Handle empty selections gracefully** - return unchanged part
5. **Chain operations** when possible for cleaner code
6. **Use construction geometry** for reference (forConstruction=True)
7. **Validate dimensions** before creating geometry
8. **Test edge cases** - zero selections, extreme dimensions
9. **Use defensive programming** - anticipate failures
10. **Export with appropriate tolerance** for intended use