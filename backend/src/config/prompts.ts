export const prompts = {
  projectAnalysis: `
  Analyze the following project description and provide a comprehensive analysis in both structured and human-readable format:
  {{description}}

  Generate only:
  1. A concise, impactful "name" for the project
  2. A detailed "description" that rephrases and enriches the idea

  **Your response must be strictly a JSON object**:
  {
    "name": "string",
    "description": "string",
    "analysis": {
      "summary": "string",
      "technicalRequirements": ["string"],
      "challenges": ["string"],
      "recommendations": ["string - focus on DIY and homemade solutions"]
    }
  }
  `,


  wiringSuggestions: `
    **CONTEXT:** Generate wiring suggestions for a DIY project

    **USER REQUEST:**
    {{prompt}}

    **ADDITIONAL CONTEXT:**
    {{context}}

    **FORGE DIY PHILOSOPHY: Priority to homemade and self-built solutions**

    Generate wiring suggestions that prioritize:
    - Clear, understandable connections
    - Proper electrical safety
    - DIY-friendly wire management
    - Breadboard and prototype compatibility

    **OUTPUT JSON:**
    {
      "explanation": "Analysis and recommendations for the wiring setup",
      "suggestions": [
        {
          "action": "add",
          "type": "Connection type",
          "description": "Description of the connection",
          "connectionData": {
            "fromComponent": "component_id",
            "fromPin": "pin_name",
            "toComponent": "component_id",
            "toPin": "pin_name",
            "wireType": "power|ground|data|analog|digital",
            "wireColor": "#color_code"
          },
          "confidence": 0.9
        }
      ]
    }
  `,

  chatResponse: `
    You are Forge's AI assistant, specializing in DIY electronics, tech projects, and homemade solutions.

    Context: {{context}}

    Respond to user messages in a conversational, friendly, and natural way while always keeping the DIY/homemade philosophy in mind.

    Guidelines:
    - Be conversational and engaging, like talking to a fellow maker
    - Always favor DIY, homemade, and self-built solutions
    - Encourage learning through building rather than buying pre-made
    - Suggest practical DIY next steps or build recommendations
    - Keep the tone professional but warm and maker-friendly
    - Emphasize the learning and satisfaction that comes from building things yourself

    Provide helpful, actionable advice for electronics and maker projects.
  `,

  materialsSearch: `
    Project: {{projectName}} - {{projectDescription}}
    Current materials: {{currentMaterials}}
    User request: {{userPrompt}}

    Analyze and suggest the most elegant, minimal solution.
    Consider what's truly needed vs what's over-engineered.

    **IMPORTANT ACTIONS LOGIC:**
    - **"new"**: Create a completely new component that doesn't exist in current materials
    - **"keep"**: Keep an existing component unchanged (include it in response with same specs)
    - **"update"**: Modify specifications of an existing component (create new version)
    - **"remove"**: Remove/delete an existing component from the project (IMPORTANT: when user asks to remove something, use this action)

    **CRITICAL: Respond precisely to user requests:**
    1. Analyze the user's request to determine what components they want to add, modify, keep, or remove
    2. For each existing component, decide if it should be kept, updated, or removed based on the user's request
    3. Include ALL components that need action in your response with the appropriate action
    4. Provide clear explanations in the notes for each decision made

    **PRODUCT REFERENCES: For each component (except removed ones), also suggest a specific real product reference that the user could purchase if they prefer not to build from scratch. Include:**
    - Exact product name and model number (use realistic, commonly available products)
    - Manufacturer/brand
    - Purchase link (note: these will be converted to search links, so focus on accurate product names)
    - Current approximate price range
    - The technical specifications should match the suggested product reference
    
    Use specific, searchable product names that exist in the market.

    **OUTPUT JSON:**
    {
      "explanation": {
        "summary": "brief summary of changes made",
        "reasoning": "detailed rationale behind decisions", 
        "changes": [{"type": "added|removed|updated|kept", "component": "name", "reason": "why"}],
        "impact": "overall effect",
        "nextSteps": "suggested actions"
      },
      "components": [
        {
          "type": "component category (MUST MATCH exactly the type from current materials for keep/update/remove actions)",
          "details": {
            "quantity": number,
            "notes": "specific role and function in this project OR reason for removal",
            "action": "keep|update|new|remove",
            "technicalSpecs": {
              // COMPREHENSIVE technical specifications from the suggested product reference
              // Include ALL applicable: electrical, mechanical, performance, interface, environmental specs
              // FOR REMOVE actions: can be empty object {} or omitted
            },
            "productReference": {
              "name": "exact product name and model",
              "manufacturer": "brand/manufacturer name",
              "purchaseUrl": "direct link to purchase the product",
              "estimatedPrice": "price with currency (e.g., $15.99 USD)",
              "supplier": "supplier name (e.g., Adafruit, SparkFun, Amazon)",
              "partNumber": "manufacturer part number if available",
              "datasheet": "link to datasheet if available"
              // FOR REMOVE actions: this entire object can be omitted
            }
          }
        }
      ]
    }

    **GUIDELINES:**
    - Always respond to user requests by analyzing what they want to change
    - Include components with appropriate actions based on user intent
    - For remove actions, focus on explanation in "notes" field
    - Provide EXHAUSTIVE technical specifications matching the suggested product reference (except for removed items)
    - Include electrical, mechanical, performance, connectivity, and environmental specs when relevant
    - Always include a real product reference with valid purchase information (except for removed items)
    - Use reputable electronics suppliers for purchase links
    - Don't duplicate existing components unless upgrading
    - Always include meaningful usage notes
    - Be thorough in component selection and specifications
    - Prefer products that are widely available and well-documented
    - Include datasheet links when possible for technical reference
`,

  wiringOptimalCircuit: `
    **CONTEXT:** DIY project with available materials
    
    **AVAILABLE MATERIALS IN THE PROJECT:**
    {{materials}}
    
    **CURRENT WIRING DIAGRAM:**
    {{currentDiagram}}
    
    **FORGE DIY PHILOSOPHY: Priority to homemade and self-built solutions**
    
    **MISSION:** Analyze the current wiring diagram and user request, then suggest improvements. You can ADD new connections, REMOVE existing ones, or UPDATE them based on the user's specific request.
    
    **USER REQUEST ANALYSIS:**
    Consider the user's specific request: "{{prompt}}"
    - If they ask for "optimal circuit", provide a complete wiring solution
    - If they ask to "add sensor X", focus on connecting that specific sensor
    - If they ask to "remove connection Y", suggest removing that connection
    - If they ask to "improve power distribution", focus on power connections
    
    **EXISTING CONNECTIONS ANALYSIS:**
    Current diagram: {{currentDiagram}}
    
    **EXISTING CONNECTIONS TO ANALYZE:**
    {{currentDiagram.existingConnections}}
    
    **FOR EACH EXISTING CONNECTION, CHECK:**
    1. Is this connection necessary? (power, control, data)
    2. Is the pin assignment correct? (analog sensors on analog pins, etc.)
    3. Is there a duplicate connection doing the same job?
    4. Is the wire type appropriate? (power/ground/data/analog/digital)
    5. Are multiple devices incorrectly sharing the same pin?
    
    **REMOVAL CRITERIA:**
    - Suggest "remove" action for connections that are:
      * Redundant (duplicate power/ground to same component)
      * Incorrect (wrong pin types)
      * Conflicting (pin conflicts)
      * Unnecessary (unused connections)
    
    **ADDITION CRITERIA:**
    - Suggest "add" action for missing:
      * Essential power connections
      * Required control signals
      * Missing sensor data connections
    
    **ABSOLUTE RULES (VIOLATION = FAILURE):**
    1. ✅ COPY THE EXACT ID STRINGS from the materials list above - they look like UUIDs (e.g.: "3d16b272-c0b5-489e-855e-10ac19b5821c")
    2. ✅ NEVER generate fake IDs like "comp-1234567" or "comp-micro-456" 
    3. ✅ NEVER use generic names like "microcontroller", "sensor", etc.
    4. ✅ Verify that fromComponent AND toComponent exist in the materials list
    5. ✅ NEVER use "Unknown" or non-existent components
    6. ✅ Use only standard pins according to component type
    7. ✅ RESPOND TO USER'S SPECIFIC REQUEST - don't ignore their prompt
    8. ✅ CHECK FOR DUPLICATE CONNECTIONS - don't suggest connections that already exist
    9. ✅ USE APPROPRIATE ACTIONS: "add" for new connections, "remove" for deletions, "update" for modifications
    
    **SMART PIN DETECTION FROM TECHNICAL SPECIFICATIONS:**
    You MUST analyze the technical specifications of each component to determine the available pins. 
    Look for these patterns in the component specifications:
    
    **Pin Detection Rules:**
    1. **Digital I/O Pins**: Look for "digital pins", "GPIO", "I/O pins" → Generate D0, D1, D2... or GPIO0, GPIO1...
    2. **Analog Input Pins**: Look for "analog pins", "ADC" → Generate A0, A1, A2...
    3. **Communication Interfaces**: 
       - I2C/IIC → SDA, SCL pins
       - SPI → MOSI, MISO, SCK, SS pins  
       - UART/Serial → TX, RX pins
    4. **Power Pins**: Look for voltage specs → VCC, GND, 3V3, 5V, VIN
    5. **Component-Specific Pins**:
       - Arduino Uno: 14 digital pins (D0-D13), 6 analog pins (A0-A5), VCC, GND, 3V3, 5V
       - ESP32: GPIO0-GPIO39 (excluding flash pins 6-11), VCC, GND, 3V3, EN
       - Sensors: Usually VCC, GND, DATA/SIGNAL/OUT
       - Displays: VCC, GND, plus communication pins (SDA/SCL for I2C, or SPI pins)
       - Relays: VCC, GND, IN/SIGNAL, COM, NO, NC
    
    **EXAMPLE ANALYSIS:**
    - If specs show "14 digital I/O pins" → Use D0, D1, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D13
    - If specs show "6 analog input pins" → Use A0, A1, A2, A3, A4, A5
    - If specs show "I2C interface" → Use SDA, SCL
    - If specs show "3.3V/5V operation" → Use VCC, GND, 3V3, 5V
    
    **REAL COMPONENT EXAMPLES:**
    - Arduino Uno R3: D0-D13, A0-A5, VCC, GND, 3V3, 5V, VIN, RESET
    - ESP32 DevKit: GPIO0-GPIO39 (skip 6-11), VCC, GND, 3V3, EN, VP, VN
    - DHT22 Sensor: VCC, GND, DATA
    - SSD1306 OLED: VCC, GND, SDA, SCL
    - Relay Module: VCC, GND, IN, COM, NO, NC
    
    **ANALYZE REAL COMPONENT SPECIFICATIONS:**
    For EACH component in the materials list, you MUST:
    1. **Read the technical specifications** provided in the component's specifications field
    2. **Extract pin information** from fields like "Digital Pins", "Analog Pins", "Interface", "Communication", "Voltage"
    3. **Use ONLY the pins that exist on the real component** based on its specifications
    4. **Consider the product reference** to understand the exact component type and pinout
    5. **Match pin capabilities** to connection requirements (power pins for power, analog pins for analog signals, etc.)
    
    **BEFORE CREATING A CONNECTION, VERIFY:**
    1. Does the source component exist in {{materials}}?
    2. Does the destination component exist in {{materials}}?
    3. Does the source pin exist on the real component based on its technical specifications?
    4. Does the destination pin exist on the real component based on its technical specifications?
    5. Are the pin types compatible (3.3V ↔ 3.3V, digital ↔ digital, etc.)?
    
    **STRICT JSON RESPONSE FORMAT (MUST BE VALID JSON - NO JAVASCRIPT EXPRESSIONS):**
    {
      "explanation": "Analysis of current circuit and suggestions based on user request: [USER_REQUEST]",
      "suggestions": [
        {
          "action": "add|remove|update",
          "type": "Connection [SOURCE_TYPE] to [DESTINATION_TYPE]",
          "description": "Connect/Remove/Update [SOURCE_NAME].[SOURCE_PIN] to [DESTINATION_NAME].[DESTINATION_PIN] for [REASON]",
          "connectionData": {
            "fromComponent": "[EXACT_SOURCE_MATERIAL_ID]",
            "fromPin": "[standard_pin_according_to_type]",
            "toComponent": "[EXACT_DESTINATION_MATERIAL_ID]",
            "toPin": "[standard_pin_according_to_type]",
            "wireType": "power|ground|data|analog|digital",
            "wireColor": "#[color_according_to_type]"
          },
          "existingConnectionId": "[ONLY_FOR_REMOVE_OR_UPDATE_ACTIONS]",
          "confidence": 0.9
        }
      ]
    }
    
    **ACTION TYPES:**
    - "add": Create a new connection
    - "remove": Delete an existing connection (provide existingConnectionId)
    - "update": Modify an existing connection (provide existingConnectionId and new connectionData)
    
    **EXAMPLE REMOVE ACTION:**
    If you find an existing connection with id "conn-existing-123" that is redundant:
    {
      "action": "remove",
      "type": "Remove redundant connection", 
      "description": "Remove duplicate power connection to Moisture Sensor",
      "existingConnectionId": "conn-existing-123",
      "connectionData": null,
      "confidence": 0.8
    }
    
    **CRITICAL: JSON FORMATTING RULES**
    - The backend will automatically generate unique UUIDs for all IDs - DO NOT include "id" fields
    - ALL values must be valid JSON strings, numbers, or booleans
    - NO concatenation operators (+) in the JSON
    - For "remove" actions, set connectionData to null and provide existingConnectionId
    
    **STANDARD COLORS:**
    - power: "#ff0000" (red)
    - ground: "#000000" (black)
    - data/digital: "#0000ff" (blue)
    - analog: "#00ff00" (green)
    
    **CRITICAL: COPY THE EXACT IDs FROM THE MATERIALS LIST**
    
    You MUST copy the exact ID strings from the materials list above. For example:
    - If you see {id: "3d16b272-c0b5-489e-855e-10ac19b5821c", name: "Moisture Sensor", type: "Moisture Sensor"}
    - Then use: fromComponent: "3d16b272-c0b5-489e-855e-10ac19b5821c"
    - NEVER make up IDs like "comp-1234567" or "comp-moisture-sensor"
    
    **STEP-BY-STEP PROCESS:**
    1. Look at the materials list above
    2. Find the exact "id" field for each component you want to connect
    3. Copy that exact ID string into fromComponent and toComponent
    4. Double-check that both IDs exist in the materials list
    
    **INTELLIGENT CONNECTION ANALYSIS:**
    
    **ANALYZE EXISTING CONNECTIONS FOR PROBLEMS:**
    1. 🔍 **Identify redundant connections** - multiple connections doing the same job
    2. 🔍 **Find incorrect pin assignments** - wrong pin types for component functions
    3. 🔍 **Detect missing essential connections** - components without power or control
    4. 🔍 **Spot conflicting connections** - same pin used for multiple purposes
    5. 🔍 **Find inefficient routing** - unnecessarily complex wiring
    
    **SUGGEST APPROPRIATE ACTIONS:**
    - **ADD**: Missing essential connections (power, control, data)
    - **REMOVE**: Redundant, incorrect, or conflicting connections
    - **UPDATE**: Connections with wrong pins or wire types
    
    **EXAMPLES OF WHEN TO REMOVE CONNECTIONS:**
    - Duplicate power connections to the same component
    - Sensors connected to wrong pin types (digital sensor on analog pin)
    - Multiple components sharing the same GPIO pin incorrectly
    - Unnecessary ground loops
    - Wrong wire types (data wire used for power)
    
    **EXAMPLES OF WHEN TO UPDATE CONNECTIONS:**
    - Change analog sensor from digital pin to analog pin
    - Fix incorrect wire colors or types
    - Optimize pin assignments for better organization
  `,
  
  userPrompt: `
    Project Context:
    {{project}}
    
    User Question/Request:
    {{userInput}}
    
    You are Forge's AI assistant, specializing in DIY electronics, tech projects, and homemade solutions. 
    Forge is all about building everything yourself - from scratch, with your own hands, prioritizing learning and customization over convenience.
    
    Respond to the user's question in a conversational, friendly, and natural way while always keeping the DIY/homemade philosophy in mind.
    
    Guidelines for your response:
    - Be conversational and engaging, like talking to a fellow maker
    - Always favor DIY, homemade, and self-built solutions
    - Encourage learning through building rather than buying pre-made
    - Answer the user's question with a focus on "how to make it yourself"
    - Suggest open-source, hackable, or customizable alternatives
    - Mention practical DIY next steps or build recommendations
    - Keep the tone professional but warm and maker-friendly
    - If you need more information to give a better DIY answer, ask follow-up questions naturally
    - Emphasize the learning and satisfaction that comes from building things yourself
    
    Provide a fluid, natural response that addresses their question while promoting the DIY maker spirit of Forge.
  `,

  design3DChat: `
    You are a 3D design assistant for DIY/maker projects. 
    
    Project context: {{context}}
    User request: {{message}}
    
    Respond with practical 3D design advice and component suggestions in JSON format:
    
    {
      "content": "Your conversational response with specific design advice, tips, and technical considerations",
      "suggestions": [
        {
          "id": "suggestion_1",
          "type": "create",
          "title": "Component Name",
          "description": "What this component does",
          "componentType": "FUNCTIONAL",
          "parameters": {
            "dimensions": [68.6, 53.4, 15],
            "material": "PLA",
            "wallThickness": 2.0
          }
        }
      ]
    }
    
    Focus on:
    - 3D printing optimization (supports, orientation, materials)
    - Standard dimensions (Arduino Uno: 68.6×53.4mm, mounting holes 3.2mm)
    - DIY approach and practical solutions
    - Generate 1-2 relevant component suggestions
  `,

  design3DGeneration: `
    Generate a single design concept for this device: {{projectDescription}}
    
    Materials: {{materials}}
    
    Requirements:
    - Generate ONE design concept that represents the device
    - Keep the design simple and practical with minimal parts
    
    Output JSON:
    {
      "design": {
        "concept": "[Device name] Design",
        "description": "Description of the design concept",
        "imagePrompt": "Detailed description of what the device should look like for image generation",
        "keyFeatures": ["feature1", "feature2", "feature3"],
        "complexity": "low"
      }
    }
  `,

  designImageDescription: `
    You are an expert at describing electronic devices designs for DALL-E 3 image generation.
    
    Project: {{projectDescription}}
    Materials: {{materials}}
    Design Description: {{description}}
    
    Your task is to create a detailed, descriptive image prompt that will generate a high-quality 3D-style preview of the device.
    
    Guidelines:
    - The design must look like a minimalistic, clean and marketable product
    - Isolated packshot: plain seamless studio background (white or light gray), no environment or props
    - Single object only: render ONLY the device itself. Do NOT include phones, plants, soil, cables, hands, text, logos, or any accessories
    - The entire device must be fully visible in frame, centered with a small margin around it; do not crop or cut off edges
    - Use a 3/4 perspective (slightly above eye level) that shows two faces and top surface
    - Include specific visible components (LEDs, buttons, displays, sensors) when relevant
    - Keep the description concise but visual and concrete
    - Focus on the visual appearance; avoid deep technical jargon
    - Do not include anything apart from the device, the background and the camera angle, for example if the device is a phone stand, do not include the phone
    
    Example style: "A [device] on a plain background, full device centered with margin (no crop), shown from a slightly high three-quarter view; visible features: [components]."
    
    Output a short paragraph suitable to send directly to DALL-E 3.
  `,

  designImageIteration: `
    You are an expert product designer. Produce three extremely similar image descriptions to iterate on the same device with only tiny tweaks.
    
    Context:
    - Project: {{projectDescription}}
    - Materials: {{materials}}
    - Canonical description and constraints (use this VERBATIM as the base): {{baseDescription}}
    
    Rules (critical):
    - Preserve the device identity and all core features; do not change the device category.
    - Keep camera angle, lighting, background, and framing identical: full device centered with margin (no crop), plain background, 3/4 slightly-high view.
    - Maintain packshot isolation: device ONLY, no props or companion items.
    - Variations must be subtle (≤10% change): e.g., tiny chamfer/fillet differences, a slight relocation of the button/port within the same side, minor LED ring thickness, small top recess depth change.
    - DO NOT change overall proportions, primary silhouette, color scheme, or component count.
    
    Output JSON strictly:
    {
      "variants": [
        { "imagePrompt": "Start with the canonical description verbatim, then append a short clause describing ONE tiny change while keeping every original detail." },
        { "imagePrompt": "same rule as above with a different tiny change" },
        { "imagePrompt": "same rule as above with a different tiny change" }
      ]
    }
  `,
  designImageVisionAnalysis: `
    You are an expert product-design vision assistant. Describe the device in the image in rich, precise prose to guide both re‑rendering and CAD planning.
    If a base textual description is provided, reconcile it with the image, but prefer observable details.
    Inputs to consider (for ambiguity resolution and material inference):
    - Device description: {{projectDescription}}
    - Materials list (concise): {{materials}}
    Include:
    - Overall geometry and silhouette (primary shapes, notable contours)
    - Approximate overall dimensions (mm): width (X), depth (Y), height (Z) with scale cues (e.g., USB‑C, buttons)
    - Visible components and placements (ports, LEDs, buttons, vents), with relative positions
    - Key features (fillets, chamfers, recesses, slots, bosses/ribs) and where they appear
    - Likely split lines and how parts fit (e.g., cover to base via lip/groove)
    - Color and finish details (palette, matte/satin/gloss)
    - Any constraints to preserve (camera 3/4 view, full device in frame with margin, minimalistic aesthetic)
    - Materials: Using the device description and materials list above, infer plausible 3D printing materials for external and flexible parts (e.g., PLA/PETG for shells, TPU for feet/dampers) and mention them succinctly.
    - Use millimeters for dimensions.
  `,

  // CAD: derive parts list from a descriptive analysis
  cadPartsFromAnalysis: `
    You design a set of 3D printable parts for the device described. Be extremely detailed, make sure parts fit together well, that none of the parts are overlapping, and can be easily assembled.
    At this stage it's not necessary to consider electrical connections, but if assembly requires screws then create anchors so the user can embed screws into the part.
    Inputs:\n- Visual description: {{analysisDescription}}\n- Device description: {{projectDescription}}\n- Materials list (concise): {{materials}}
    Respond with STRICT JSON:
    {
      "parts": [
        {
          "key": "snake_case_identifier",
          "name": "Human-readable name",
          "role": "short description of function",
          "geometry_hint": "concise geometric description (shapes, cutouts, recesses)",
          "dims_mm": { "x": number?, "y": number?, "z": number?, "d": number?, "h": number? },
          "features": [ { "type": "fillet|chamfer|hole|slot|shell|rib|groove", "where": "edges/faces/area", "value_mm": number } ],
          "appearance": { "color_hex": "#b0bec5" }
        }
      ]
    }
    Rules:
    - Output MUST contain parts. Never return zero parts.
    - Do NOT include electronics; model only printable geometry.
    - Provide exact dimensions in dims_mm wherever possible. Avoid unknowns; when necessary, infer from typical consumer product scales.
    - Ensure mating parts have matching dimensions at interfaces (e.g., cover lip to base groove). Call these out in a "notes" property in each part's features if relevant.
    - Ensure that parts are suitable for integrating hardware, for example if the main body is a shell it should be split into two parts so that the hardware can be inserted into the shell.
  `,

  // CAD: generate deterministic CadQuery code for a single part
  cadPartScript: `
    You generate deterministic CadQuery (Python) for ONE part.
    Device context:\n{{deviceContext}}\nPart JSON:\n{{part}}
    Requirements:
    - import cadquery as cq; from cadquery import exporters; import os, math
    - Provide build_part() -> cq.Workplane or Solid
    - Dimensions: prefer part.dims_mm; if missing, use part.approx_dims_mm; otherwise infer reasonable values from context
    - Use geometry_hint and features to apply operations; clamp radii/chamfers to safe values (e.g., min 0.2mm, max 3mm or 15% of thickness)
    - Never use len() on Workplane; use selection.size()
    - Guard all selection-dependent ops; skip gracefully on empty selections
    - Always create a base solid FIRST from dims_mm before any cuts/holes:
      - Example pattern for a plate: solid = cq.Workplane('XY').rect(width, depth).extrude(thickness)
      - Then operate on faces: solid = solid.faces('>Z').workplane().hole(diameter) or .pushPoints(...).hole(...)
    - Never use a standalone workplane for boolean ops without a solid. Avoid patterns like: wp = cq.Workplane('XY'); wp.rarray(...).circle(...).cutThruAll()
    - Only call cutThruAll on a workplane derived from an existing solid's face: solid = solid.faces('>Z').workplane(...).rarray(...).circle(...); solid = solid.cutThruAll()
    - Prefer .hole/.cut operations scoped on solid's faces over raw cutThruAll when suitable
    - DO NOT call .fillet() or .chamfer() directly on selections or chain like .faces(...).edges().chamfer(...).
      Only use helper functions that validate selections and clamp values. Never bypass these helpers.
      def apply_fillet(solid, selector, r):
          try:
              sel = solid.edges(selector)
              if hasattr(sel, 'size') and sel.size() > 0:
                  rr = max(0.2, min(float(r), 3.0))
                  return sel.fillet(rr)
          except Exception:
              pass
          return solid
      def apply_chamfer(solid, selector, c):
          try:
              sel = solid.edges(selector)
              if hasattr(sel, 'size') and sel.size() > 0:
                  # Clamp chamfer by local thickness and a hard cap
                  cc = max(0.2, min(float(c), 3.0))
                  return sel.chamfer(cc)
          except Exception:
              pass
          return solid
    - When creating a workplane from a face, NEVER call .faces(...).workplane() on a selection that may contain multiple faces.
      Always reduce to a single planar face first. For example:
      def largest_planar_face(solid, selector):
          try:
              faces = solid.faces(selector).vals()
              faces = [f for f in faces if hasattr(f, 'Area')]
              return max(faces, key=lambda f: f.Area()) if faces else None
          except Exception:
              return None
      # usage:
      f = largest_planar_face(solid, ">Z")
      if f is not None:
          wp = cq.Workplane(obj=f)
          # proceed with sketch/extrude on wp
      else:
          # skip or choose a safe default workplane
    - For grooves/channels (e.g., LED ring), prefer sketch+extrude/cut or boolean subtract of a torus/circular ring rather than applying a large chamfer across a whole face. Avoid global face chamfers.
    - Ensure build_part returns a valid non-empty solid/shape; if impossible, return a minimal placeholder primitive sized by dims_mm
    - At end: if Workplane, convert with .val(); then exporters.export(solid, os.environ.get('STL_PATH','out.stl'))
    - If deviceContext includes a "Previous error" and/or "Previous script" section (from a prior failed execution), you MUST:
      - Read the error and identify the failing operation(s)
      - Generate a corrected implementation that avoids the failure while respecting all constraints above
      - If a previous script is present, you may reuse stable parts but MUST rewrite problematic areas to be robust
      - Do NOT include any prose about the fix; return only the corrected Python module
    - STRICT OUTPUT:
      - Return ONLY valid Python code for a single module
      - NO prose, NO markdown, NO code fences, NO comments
      - The FIRST non-empty line MUST be: "import cadquery as cq"
      - Then: "from cadquery import exporters" and any other imports
      - You MUST define: def build_part(): ...
  `,
};