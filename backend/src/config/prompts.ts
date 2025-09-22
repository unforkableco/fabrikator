export const prompts = {
  // Simplified prompt for GPT-5 reasoning models
  materialsSearchSimple: `For project "{{projectName}}" ({{projectDescription}}), user wants: {{userPrompt}}

List needed electronics components in JSON format:
{"explanation": {"summary": "brief", "reasoning": "why"}, "components": [{"type": "name", "details": {"quantity": 1, "notes": "use", "action": "new", "technicalSpecs": {}}}]}`,
  projectAnalysis: `
  Analyze the following project description and provide a comprehensive analysis in both structured and human-readable format:
  {{description}}

  Generate only:
  1. A concise, impactful "name" for the project
  2. A detailed "description" that rephrases and enriches the provided description

  **LANGUAGE REQUIREMENT (MANDATORY):**
  - Use English only for ALL output fields (name, description, analysis).
  - No other language is allowed anywhere in the JSON or text.

  **DIY-FIRST POLICY (MANDATORY):**
  - This project must be approached as DIY (do-it-yourself). Prefer self-built, modular solutions over buying pre-assembled kits.
  - Do NOT recommend pre-assembled kits or pre-built chassis/frames for any product category (e.g., RC cars, drones, robots). Instead, outline modular subassemblies and commodity parts (e.g., motors, ESCs, servos, bearings, springs, shafts, fasteners, aluminum extrusions, sheets, rods).
  - Assume 3D-printable parts (mounts, brackets, enclosures, plates) will be designed and printed; exclude them from sourcing recommendations unless they are not realistically 3D-printable at required strength/tolerance.
  - Only include metal load-bearing structures when strictly necessary and not 3D-printable (e.g., coil springs, steel shafts, bearings, aluminum profiles). Justify necessity clearly.

  **Your response must be strictly a JSON object**:
  {
    "name": "string",
    "description": "string",
    "analysis": {
      "summary": "string",
      "technicalRequirements": ["string"],
      "challenges": ["string"],
      "recommendations": ["string"]
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

    **OUTPUT JSON (STRICT ENGLISH ONLY):**
    - All fields and values MUST be in English.
    - Respond with valid JSON only (no prose, no markdown).
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

    IMPORTANT: When choosing fromPin/toPin, you MUST read pin names from the materials' specs ("pins" in technicalSpecs or requirements.pins provided by the materials phase) and use those exact canonical short names.
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
  Current materials (full specs): {{currentMaterialsFullSpecs}}
  User request: {{userPrompt}}

  Analyze and suggest the most elegant, minimal solution.
  Consider what's truly needed vs what's over-engineered.

  **LANGUAGE REQUIREMENT (MANDATORY):**
  - Use English only for ALL output. No other language is allowed.
  - All JSON fields, values, and prose inside the JSON must be in English.

  **DIY-FIRST POLICY (MANDATORY):**
  - Do NOT include pre-assembled kits or pre-built chassis/frames (across all product types, e.g., RC cars, drones, robots). Break them down into modular, commodity parts instead (motors, ESCs, servos, bearings, springs, shafts, fasteners, aluminum extrusions, rods, sheets).
  - Prefer self-built structures. Assume 3D-printable mounts, brackets, plates, and enclosures will be designed and printed later (exclude from materials).
  - Include metal load-bearing elements only when not realistically 3D-printable at required strength/tolerance (e.g., coil springs, steel shafts, bearings, aluminum profiles). Justify necessity in notes.

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

  **TECHNICAL CONSTRAINTS (MUST MATCH):**
  - Align ALL suggested technical specs with the corresponding "requirements" fields found in Current materials.
  - Use explicit, measurable values with units (e.g., 5V, 2A, 1080p, 60Hz, 100x50x20 mm).
  - If a requirement key exists (e.g., ports.hdmi.count, power.total_W, interfaces.usb.type, dimensions.width_mm), your technicalSpecs MUST include that key with a compatible or greater value.
  - If a requirement cannot be satisfied, set the component action to "remove" or propose an "update" to another component that unlocks feasibility, and explain explicitly why.

  **PINS ENRICHMENT (MANDATORY):**
  - For EACH electronic component, add "pins" inside technicalSpecs as a canonical list of pin names (string[]), or set it to null ONLY for non-electronic components.
  - Pins MUST use short, standard denominations (no long names, no vendor-specific aliases):
    - Power: VCC, GND, 3V3, 5V, VIN
    - I2C: SDA, SCL
    - SPI: MOSI, MISO, SCK, CS (or SS)
    - UART/Serial: TX, RX
    - Analog inputs: A0, A1, A2, ...
    - Digital GPIO (arduino-like): D0, D1, D2, ...
    - MCU GPIO (esp32-like): GPIO0, GPIO1, ... (use real available numbers when known)
    - Sensors (generic): VCC, GND, DATA (or SIGNAL)
    - Relays: IN, COM, NO, NC
    - Speakers: SPK+, SPK-
  - Choose pins that match the component type and its technical capabilities. Do NOT invent non-existing pins.
  - If the component does not require power or is non-electronic (mechanical/structural), set pins to null.
  - STRICT REQUIREMENT: any electronic/electrical component MUST include a non-empty pins[] derived from its technical specifications and standard interfaces. Do not hardcode examples; infer pins implicitly from the component's type and specs (e.g., power sources expose positive/negative terminals; actuators expose power/control as applicable; regulators expose input/output/ground; communication-capable devices expose their bus pins). Use the canonical short names above where they apply.

  (Product reference suggestions are handled by a dedicated sourcing step; do not include purchasing info here.)

  **STRICTLY FORBIDDEN IN technicalSpecs:**
  - Any URLs or links (purchase, manual, datasheet, documentation) and any fields named or containing: link, links, url, purchase, buy, manual, datasheet.
  - Do NOT embed purchase information inside technicalSpecs. Keep technicalSpecs purely technical.

  **3D PRINTING POLICY (MANDATORY):**
  - Do NOT add 3D-printable mechanical parts to materials (e.g., base/stand/socle, mounts, brackets, spacers, plates, frames, enclosures/housings, cable guides, knobs, cosmetic covers). These belong to the 3D design and printing phase, not sourcing.
  - Exception: Include metal chassis or load-bearing structural parts that are not realistically 3D-printed at the required strength/tolerances. Prefer standard profiles (e.g., aluminum extrusions) or steel parts only when strictly necessary.
  - When a support/mount/enclosure is needed, assume it will be designed and 3D-printed; do not list it as a material component.

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
            // COMPREHENSIVE technical specifications, using measurable fields and units
            // MUST satisfy corresponding requirements keys from current materials when present
            // Must be one key and one value for each requirement key from current materials
            // No URLs/links or purchasing info allowed here
            // PINS ENRICHMENT (MANDATORY):
            //   Include a key "pins" with value:
            //   - string[] of canonical short pin names (see conventions above), or
            //   - null for non-electronic components
            // Examples: ["VCC","GND","SDA","SCL"] or ["VCC","GND","TX","RX"] or ["D0","D1","A0","A1"] or ["GPIO0","GPIO2","3V3","GND"], or null
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
    - Do NOT include purchase links or datasheet/manual URLs in technicalSpecs
    - Don't duplicate existing components unless upgrading
    - Always include meaningful usage notes
    - Be thorough in component selection and specifications
    - Prefer products that are widely available and well-documented
    - Use explicit numeric comparisons (>=, ==) when mapping to requirement keys and state these in notes
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
    10. ✅ WHEN MULTIPLE IDENTICAL COMPONENTS EXIST (e.g., two analog joysticks), YOU MUST USE DISTINCT IDS for each physical instance. Do NOT reuse the same component id to represent two separate physical devices. Select different ids from the materials list for each instance.
    
    **STRICT COMPONENT ELIGIBILITY:**
    - NEVER connect non-electronic components (mechanical/structural parts such as "enclosure", "mount", "bracket", "plate", "frame", "cover", fasteners).
    - Only electronic components (power, MCUs, sensors, displays, relays, drivers, modules) can have pins.

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
       - Arduino Uno: D0-D13, A0-A5, VCC, GND, 3V3, 5V
       - ESP32: GPIO0-GPIO39 (excluding flash pins 6-11), VCC, GND, 3V3, EN
       - Sensors: Usually VCC, GND, DATA/SIGNAL/OUT
       - Displays: VCC, GND, plus communication pins (SDA/SCL for I2C, or SPI pins)
       - Relays: VCC, GND, IN, COM, NO, NC
    
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
    
    **STRICT JSON RESPONSE FORMAT (MUST BE VALID JSON - NO JAVASCRIPT EXPRESSIONS, ENGLISH ONLY):**
    - All fields and values MUST be in English.
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
    - DIY approach and practical solutions
    - Generate 1-2 relevant component suggestions
  `,

  design3DGeneration: `
    Generate a single design concept for this device: {{projectDescription}}
    
    Requirements:
    - Generate ONE design concept that represents the device
    - Keep the design simple and practical with minimal parts
    - All parts of the device must be made of plastic
    
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
    Design Description: {{description}}
    
    Your task is to create a detailed, descriptive image prompt that will generate a high-quality 3D-style preview of the device.
    
    Guidelines:
    - The design must look like a minimalistic, clean and marketable product
    - Isolated packshot: plain seamless studio background (white or light gray), no environment or props
    - Single object only: render ONLY the device itself. Do NOT include phones, plants, soil, cables, hands, text, logos, or any accessories
    - The entire device must be fully visible in frame, centered with a small margin around it; do not crop or cut off edges
    - Use a 3/4 perspective (slightly above eye level) that shows two faces and top surface
    - Focus on the visual appearance; avoid deep technical jargon
    - Do not include anything apart from the device, the background and the camera angle, for example if the device is a phone stand, do not include the phone
    - Make sure the prompt you generate specifies the device must be entirely visible in the frame, centered with a small margin around it
    - The device must be made of plastic
    
    Example style: "A [device] on a plain background, full device centered with margin (no crop), shown from a slightly high three-quarter view; visible features: [components]."
    
    Output a short paragraph suitable to send directly to DALL-E 3.
  `,

  designImageIteration: `
    You are an expert product designer. Produce three extremely similar image descriptions to iterate on the same device with only tiny tweaks.
    
    Context:
    - Project: {{projectDescription}}
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

    STRICT JSON OUTPUT ONLY (no prose, no markdown):
    {
      "canonicalPrompt": "One paragraph to re-render the image faithfully (concise, descriptive).",
      "geometry": {
        "overall_shape": "cylindrical|rectangular|...",
        "notes": "salient geometric cues"
      },
      "approx_dimensions_mm": { "width": number, "depth": number, "height": number },
      "visible_components": [ { "type": string, "position_hint": string } ],
      "features": [ "filleted rim", "top recess", "side port cutout" ],
      "split_lines": "how parts likely separate",
      "colors_finishes": [ "matte black body", "satin top" ],
      "material_inference": { "shell": "PLA|PETG", "flex": "TPU|none" }
    }
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
    - Choose base primitive by dims:
      - If dims has diameter: start with circle(diameter/2).extrude(height)
      - Else if dims has length/width: start with rect(length,width).extrude(height)
    - For shells: preserve a bottom thickness >= wall_thickness:
      - Create outer solid; then cut inner profile with depth = height - wall_thickness (do NOT remove the bottom)
    - Never use a standalone workplane for boolean ops without a solid.
    - Only call cutThruAll/cutBlind on workplanes derived from a solid's face.
    - Prefer .hole/.cut on face-scoped workplanes over raw cutThruAll when suitable
    - DO NOT call .fillet() or .chamfer() directly on selections; only via helpers. Use valid edge selectors (e.g., '|Z' for vertical edges) when passing to helpers.
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
    - When creating a workplane from a face, reduce to a single planar face first (largest_planar_face pattern).
    - Ensure build_part returns a valid non-empty solid/shape; if impossible, return a minimal placeholder primitive sized by dims_mm
    - ENCLOSURE RULE: If the part is a shell or enclosure base, it MUST have a bottom of at least wall_thickness. Inner cut depth MUST be height - wall_thickness (not full height).
    - WATERTIGHTNESS CHECK: Ensure the final result is a closed solid suitable for STL export; avoid operations that leave open faces.
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

  // Enhanced Pipeline Prompts

  // Hardware Analysis: Extract precise component specifications
  hardwareSpecsExtraction: `
    You are an expert electronics engineer analyzing components for 3D mechanical integration.

    **PROJECT CONTEXT:**
    Project: {{projectDescription}}
    Components List: {{components}}

    **TASK:**
    For each component, extract precise technical specifications needed for mechanical design:

    1. **Physical Dimensions** (in millimeters):
       - Length, width, height
       - PCB thickness if applicable
       - Component clearance zones

    2. **Port and Interface Locations**:
       - USB-C, micro-USB, power jacks
       - Button positions and sizes
       - LED positions and orientations
       - Audio jacks, SD card slots
       - Coordinate positions relative to component edges

    3. **Mounting Requirements**:
       - Mounting hole patterns (diameter, spacing)
       - Standoff heights and types
       - Screw specifications (M2, M3, etc.)
       - Heat sink or cooling requirements

    4. **Electrical Clearances**:
       - Minimum clearances from metal parts
       - Keep-out zones around antennas
       - Thermal considerations

    **OUTPUT JSON SCHEMA (REFERENCE ONLY — NOT AN EXAMPLE):**
    - Return ONE JSON object with key "components": Array<{
        id: string,
        name: string,
        dimensions: { length_mm: number, width_mm: number, height_mm: number, pcb_thickness_mm?: number },
        ports: Array<{ type: string, position: { x_mm: number, y_mm: number, z_mm?: number }, orientation?: string, dimensions?: { width_mm?: number, height_mm?: number, depth_mm?: number } }>,
        mounting: { holes: Array<{ diameter_mm: number, position: { x_mm: number, y_mm: number, z_mm?: number } }>, standoff_height_mm?: number, screw_type?: string },
        clearances: { top_mm?: number, sides_mm?: number, bottom_mm?: number, thermal_zone_mm?: number }
      }>

    **IMPORTANT:**
    - Use standard component datasheets when possible
    - For unknown components, make reasonable engineering estimates
    - Always include mounting hole patterns
    - Consider real-world assembly constraints

    **STRICT OUTPUT RULES:**
    - Return ONLY a single JSON object conforming to the schema above.
    - Do NOT include prose, markdown, or code fences.
    - The first character must be { and the last character must be }.
    - All IDs/names MUST come from inputs; do NOT copy literals from examples.
  `,

  // Assembly Planning: Define how parts fit together
  assemblyArchitecturePlanning: `
    You are an expert mechanical engineer planning assembly architecture for electronic devices.

    **INPUTS:**
    Project Description: {{projectDescription}}
    Hardware Specifications: {{hardwareSpecs}}
    Design Image Analysis: {{designAnalysis}}
    Geometry Hints (from vision, MUST BE HONORED): {{geometryHints}}

    **TASK:**
    Plan how the device should be assembled, defining part relationships and connection methods.

    **CONTENT-ORIGIN RULES (CRITICAL):
    - Use ONLY the provided inputs (Project Description, Hardware Specifications, Design Analysis).
    - NEVER introduce brands/models/components unless they explicitly exist in Hardware Specifications.
    - When referencing components, ALWAYS use the exact component IDs/names from Hardware Specifications.
    - Treat any example as SCHEMA ONLY. Do NOT copy values, names, or brands from examples.

    **ANALYSIS REQUIREMENTS:**

    1. **Overall Assembly Strategy**:
       - How the enclosure splits (top/bottom, front/back, multi-piece)
       - Main structural elements and their roles
       - Assembly sequence and dependencies

    2. **Part Interface Definition**:
       - How each part connects to others
       - Connection methods (screws, clips, press-fits, snap-fits)
       - Interface features needed (tabs, grooves, alignment pins)

    3. **Hardware Integration**:
       - How electronic components mount inside
       - Access requirements for ports and buttons
       - Cable routing and strain relief

    4. **Manufacturing Considerations**:
       - Part orientation for optimal 3D printing
       - Support minimization
       - Post-processing requirements

    **OUTPUT JSON SCHEMA (REFERENCE ONLY — NOT AN EXAMPLE):**
    - Return ONE JSON object with these keys/types; populate values ONLY from inputs:
      - assemblyStrategy: {
          splitMethod: string,
          mainParts: string[],
          assemblySequence: string[]
        }
      - partInterfaces: Array<{
          partA: string,
          partB: string,
          connectionType: "screw"|"clip"|"press-fit"|"snap"|"slide"|"adhesive",
          interfaceFeatures: { screwHoles?: number, screwType?: string, alignmentPins?: number, sealingLip?: boolean, snapFits?: number, clips?: number },
          tolerances: { fit_type: "clearance"|"interference"|"transition", gap_mm: number, tolerance_class?: string },
          assemblyOrder?: number,
          toolsRequired?: string[],
          notes?: string
        }>
      - hardwareIntegration: Array<{
          component: string,
          mountingMethod: "standoffs"|"direct_mount"|"clips"|"adhesive",
          position: { x_mm: number, y_mm: number, z_mm: number },
          accessRequired: string[],
          features: string[]
        }>
      - manufacturingNotes: { printOrientation: string, supportMinimization: string, postProcessing: string[] }
      - planMetadata: { createdBy: string, planningMethod: string, confidence: number, timestamp: string (ISO 8601) }

    **CRITICAL REQUIREMENTS:**
    - mainParts MUST be canonical part keys in snake_case (e.g., base_enclosure, top_cover, phone_cradle, back_support). No product phrases or brand/model names.
    - mainParts MUST include at least two distinct structural parts (2–6 typical). If design suggests a single body, decompose into at least base and cover consistent with Geometry Hints.
    - Every part must have a clear connection method to at least one other part
    - Electronic components must be properly supported and accessible
    - Assembly must be feasible with common tools
    - Consider serviceability and repairability
    - If Geometry Hints indicate a cylindrical/circular form, the main enclosure parts MUST be cylindrical (use diameter/height instead of length/width)
    
    **STRICT OUTPUT RULES:**
    - Return ONLY a single JSON object conforming to the schema above.
    - Do NOT include prose, markdown, or code fences.
    - The first character must be { and the last character must be }.
    - All part and component identifiers MUST come from inputs or canonical part keys. Do NOT copy literals from examples.
  `,

  // Manufacturing Constraints: 3D printing optimization
  manufacturingOptimization: `
    You are an expert in 3D printing design optimization and manufacturing constraints.

    **INPUTS:**
    Parts List: {{partsList}}
    Assembly Plan: {{assemblyPlan}}
    Material Type: {{materialType}} (default: PLA)

    **TASK:**
    Define manufacturing constraints and optimizations for 3D printing each part.

    **ANALYSIS AREAS:**

    1. **Print Orientation Optimization**:
       - Best orientation for each part
       - Surface finish requirements
       - Strength considerations

    2. **Support Requirements**:
       - Support-free design modifications
       - Unavoidable support areas
       - Support removal accessibility

    3. **Tolerance and Fit Specifications**:
       - Clearance fits for moving parts
       - Interference fits for assemblies
       - Material-specific shrinkage compensation

    4. **Feature Constraints**:
       - Minimum wall thickness
       - Minimum hole diameter
       - Maximum overhang angles
       - Bridge limitations

    **OUTPUT JSON SCHEMA (REFERENCE ONLY — NOT AN EXAMPLE):**
    - Return ONE JSON object with these keys/types; populate values ONLY from inputs and material:
      - materialProperties: { type: string, shrinkage_factor: number, layer_height_mm: number, nozzle_diameter_mm: number }
      - partConstraints: Array<{
          partKey: string,
          printOrientation: { optimal_face: string, rotation: { x: number, y: number, z: number }, reason: string },
          supportRequirements: { support_free: boolean, critical_overhangs: string[], support_removal_access: "poor"|"fair"|"good" },
          geometryConstraints: { min_wall_thickness_mm: number, min_hole_diameter_mm: number, max_overhang_angle_deg: number, max_bridge_span_mm: number },
          tolerances: { general_tolerance_mm: number, fit_tolerances: { clearance_fit_mm: number, loose_fit_mm: number, press_fit_mm: number } }
        }>
      - assemblyTolerances: Array<{ interface: string, tolerance_type: "clearance"|"interference"|"transition", gap_mm: number, compensation?: string }>
      - qualityRequirements: { surface_finish: "draft"|"standard"|"high", dimensional_accuracy: string, critical_features: string[] }

    **DESIGN RULES:**
    - Always prioritize support-free printing when possible
    - Consider post-processing requirements (drilling, tapping)
    - Account for material shrinkage in critical dimensions
    - Design for common FDM printer capabilities

    **STRICT OUTPUT RULES:**
    - Return ONLY a single JSON object conforming to the schema above.
    - Do NOT include prose, markdown, or code fences.
    - The first character must be { and the last character must be }.
    - All part keys and interfaces MUST come from inputs; do NOT copy literals from examples.
  `,

  // Enhanced Parts Specification with full context
  contextualPartSpecification: `
    You are an expert mechanical designer creating detailed 3D printable parts with full assembly context.

    **COMPLETE CONTEXT:**
    Project: {{projectDescription}}
    Hardware Specs: {{hardwareSpecs}}
    Assembly Plan: {{assemblyPlan}}
    Manufacturing Constraints: {{manufacturingConstraints}}
    Design Analysis: {{designAnalysis}}
    Geometry Hints (MUST BE HONORED): {{geometryHints}}
    Required Parts (MUST INCLUDE): {{requiredParts}}

    **TASK:**
    Generate comprehensive part specifications that work together as a complete assembly.

    **CONTENT-ORIGIN RULES (CRITICAL):**
    - Use ONLY the provided inputs (Project, Hardware Specs, Assembly Plan, Manufacturing Constraints, Design Analysis).
    - NEVER introduce brands/models/components unless they explicitly exist in Hardware Specs.
    - When referencing components or parts, ALWAYS use the exact IDs/names from inputs.
    - Treat any examples as SCHEMA ONLY. Do NOT copy example values into the output.

    **ENHANCED REQUIREMENTS:**
    - Normalize part keys to canonical snake_case (e.g., base_enclosure, top_cover, phone_cradle, back_support). If assemblyPlan mainParts contain product phrases, decompose into canonical parts consistent with Geometry Hints.
    - Use Geometry Hints to choose shape primitives: cylindrical shapes MUST specify diameter/height; rectangular shells MUST specify length/width/height; always include wall_thickness for shells.
    - Cross-part coordination: ensure interface dims match across mating parts and reference the same coordinate frame.

    **OUTPUT JSON SCHEMA (REFERENCE ONLY — NOT AN EXAMPLE):**
    - Return ONE JSON object with these keys/types; populate values ONLY from inputs:
      - assemblyReferenceFrame: {
          origin: string,
          units: "millimeters",
          coordinate_system: string
        }
      - parts: Array<{
          key: string,
          name: string,
          role: string,
          geometry_hint: string,
          dims_mm: { length?: number, width?: number, height?: number, diameter?: number, wall_thickness?: number },
          hardware_integration: Array<{
            component: string,
            mounting_method: string,
            position: { x: number, y: number, z: number },
            features: Array<{ type: string, position: { x: number, y: number, z: number }, diameter_mm?: number, height_mm?: number, pilot_hole_mm?: number, thread?: string }>
          }>,
          port_cutouts: Array<{
            component: string,
            port_type: string,
            position: { x: number, y: number, z: number },
            dimensions: { width: number, height: number, depth: number },
            chamfer_mm?: number, tolerance_mm?: number
          }>,
          interfaces: Array<{
            connects_to: string,
            interface_type: string,
            features: Array<{ type: string, position: { x: number, y: number, z: number }, outer_diameter_mm?: number, inner_diameter_mm?: number, height_mm?: number, thread?: string }>,
            mating_features: Array<{ type: string, diameter_mm?: number, countersink?: boolean, depth_mm?: number }>
          }>,
          features: Array<{ type: string, where: string, radius_mm?: number, size_mm?: number, depth_mm?: number, width_mm?: number }>,
          cable_management: Array<{ type: string, path: string, width_mm: number, depth_mm: number, radius_mm: number }>,
          manufacturing: { print_orientation: string, support_required: boolean, critical_surfaces: string[], post_processing?: string[] },
          appearance: { color_hex: string }
        }>
      - assembly_validation: { critical_interfaces: string[], clearance_checks: string[], strength_requirements: string[] }
      - specificationMetadata: { generatedBy: string, context_sources: string[], confidence: number, timestamp: string (ISO 8601) }

    **CRITICAL REQUIREMENTS:**
    - MUST include every part listed in Required Parts; if Required Parts contain product phrases, map to canonical parts (e.g., base_enclosure/top_cover/phone_cradle) and include them.
    - HONOR Geometry Hints: pick cylindrical vs rectangular dims correctly; do NOT output rectangular dims for cylindrical shells.
    - All interface dimensions MUST match between mating parts; coordinate system MUST be consistent across all parts.

    **STRICT OUTPUT RULES:**
    - Return ONLY a single JSON object conforming to the schema above.
    - Do NOT include prose, markdown, or code fences.
    - The first character must be { and the last character must be }.
    - All IDs/names MUST come from inputs or canonical part keys. Do NOT copy literals from examples.
  `,

  // Assembly Validation: Check fitment and assembly
  assemblyValidationAnalysis: `
    You are an expert assembly validation engineer analyzing 3D models for manufacturing and assembly issues.

    **INPUTS:**
    Parts Specifications: {{partsSpecs}}
    Assembly Plan: {{assemblyPlan}}
    Generated STL Analysis: {{stlAnalysis}}
    Manufacturing Constraints: {{manufacturingConstraints}}

    **VALIDATION TASKS:**

    1. **Geometric Compatibility**:
       - Interface dimension matching
       - Clearance verification
       - Interference detection

    2. **Assembly Feasibility**:
       - Tool access for fasteners
       - Assembly sequence validation
       - Component installation clearances

    3. **Manufacturing Quality**:
       - Feature printability assessment
       - Tolerance stack-up analysis
       - Support requirement validation

    4. **Functional Requirements**:
       - Port accessibility
       - Button operation clearances
       - Thermal management adequacy

    5. **Enclosure Integrity (CRITICAL)**:
       - Shells/enclosures MUST preserve a bottom or explicit base thickness; flag if inner cuts remove the bottom
       - Check for watertight/closed solids suitable for STL export; flag open surfaces

    **OUTPUT JSON SCHEMA (REFERENCE ONLY — NOT AN EXAMPLE):**
    - Return ONE JSON object with these keys and types; populate values ONLY from the inputs:
      - overallStatus: "passed" | "failed" | "warning"
      - validationSummary: { total_checks: number; passed: number; failed: number; warnings: number }
      - interfaceValidation: Array<{ interface: string; status: "passed"|"failed"|"warning"; checks: Record<string, boolean>; measurements?: Record<string, number>; issues?: string[]; recommendations?: string[] }>
      - assemblyValidation: Array<{ component: string; status: "passed"|"failed"|"warning"; issues: string[]; recommendations: string[] }>
      - manufacturingValidation: Array<{ part: string; printability: "passed"|"failed"|"warning"; issues: string[]; recommendations: string[] }>
      - functionalValidation: Array<{ function: string; status: "passed"|"failed"|"warning"; details?: Record<string, number|string> }>
      - criticalIssues: Array<{ severity: "high"|"medium"|"low"; category: "assembly"|"manufacturing"|"functional"; description: string; affected_parts: string[]; fix_required: boolean }>
      - recommendations: { immediate_fixes: string[]; optimizations: string[] }
      - validationMetadata: { validatedBy: string; validationTime: string (ISO 8601); confidence: number }

    **STRICT OUTPUT RULES:**
    - Return ONLY a single JSON object conforming to the schema above.
    - Do NOT include prose, markdown, or code fences.
    - The first character must be { and the last character must be }.
    - All identifiers (parts, components, interfaces) MUST come from the inputs.

    CONTENT-ORIGIN RULES (CRITICAL):
    - Use ONLY the provided inputs
    - Do NOT invent parts; use exact part keys and names from inputs
    - Treat any JSON shown above as SCHEMA ONLY. Do NOT copy numeric values, strings, component names, or example measurements.
    - All identifiers like component, part, interface MUST come from inputs. If unknown, omit or use generic labels derived from inputs.
    - If enclosure integrity fails (missing bottom or open shell), mark overallStatus as failed and include a high-severity critical issue
  `,

  // Refinement: Iterative improvement based on validation
  refinementPlanning: `
    You are an expert design refinement engineer improving 3D models based on validation feedback.

    **INPUTS:**
    Validation Results: {{validationResults}}
    Current Part Specifications: {{currentSpecs}}
    Failed Parts List: {{failedParts}}
    Iteration History: {{previousIterations}}

    **TASK:**
    Plan specific refinements to address validation failures and improve overall design quality.

    **SCOPE CORRECTION (CRITICAL):**
    - If assemblyPlan lists parts not present in currentSpecs.parts, your first action is to ADD minimal specifications for EACH missing part before changing existing ones.
    - Restrict modifications primarily to parts implicated by validation criticalIssues and their directly connected interface partners.
    - Do not repeatedly add the same feature; avoid redundant alignment_pin additions.

    **REFINEMENT STRATEGY:**

    1. **Issue Prioritization**:
       - Critical failures that prevent assembly
       - Manufacturing issues that cause print failures
       - Quality improvements for better functionality

    2. **Root Cause Analysis**:
       - Why each issue occurred
       - Upstream design decisions that led to problems
       - System-level changes needed

    3. **Targeted Improvements**:
       - Specific parameter adjustments
       - Feature additions or modifications
       - Interface redesigns

    4. **Validation Planning**:
       - How to verify fixes work
       - What new issues might be introduced
       - Regression testing requirements

    **OUTPUT FORMAT (strict JSON):**
    {
      "refinementPlan": {
        "iteration_number": 2,
        "primary_objectives": [
          "Fix mounting post height issues",
          "Improve port accessibility",
          "Optimize print orientation"
        ],
        "expected_outcomes": [
          "Eliminate assembly interferences",
          "Achieve 95% printability score",
          "Reduce assembly time by 20%"
        ]
      },
      "partModifications": [
        {
          "part_key": "base_shell",
          "modification_type": "dimensional_adjustment",
          "changes": [
            {
              "feature": "mounting_post_rpi_1",
              "parameter": "height_mm",
              "current_value": 9.8,
              "new_value": 11.0,
              "reason": "Insufficient clearance for component mounting"
            },
            {
              "feature": "usb_cutout",
              "parameter": "width_mm",
              "current_value": 10.0,
              "new_value": 12.0,
              "reason": "Inadequate access clearance"
            }
          ],
          "validation_checks": [
            "Verify new mounting height with component thickness",
            "Confirm expanded cutout doesn't weaken structure"
          ]
        }
      ],
      "newFeatures": [
        {
          "part_key": "base_shell",
          "feature_type": "alignment_pin",
          "specification": {
            "diameter_mm": 2.0,
            "height_mm": 3.0,
            "position": {"x": 60, "y": 40, "z": 22},
            "mating_hole_tolerance": 0.1
          },
          "purpose": "Improve assembly alignment and reduce user error"
        }
      ],
      "interfaceUpdates": [
        {
          "interface": "base_to_cover",
          "update_type": "tolerance_adjustment",
          "current_gap_mm": 0.1,
          "new_gap_mm": 0.2,
          "affected_parts": ["base_shell", "top_cover"],
          "reason": "Manufacturing tolerance stack-up causing tight fit"
        }
      ],
      "validationPlan": {
        "critical_checks": [
          "Assembly interference analysis",
          "Component mounting verification",
          "Print orientation validation"
        ],
        "success_criteria": {
          "zero_assembly_failures": true,
          "all_ports_accessible": true,
          "printable_without_supports": true
        },
        "regression_tests": [
          "Previous iteration's passing tests",
          "Overall assembly sequence validation"
        ]
      },
      "riskAssessment": {
        "potential_new_issues": [
          "Enlarged cutouts may reduce structural strength",
          "Higher mounting posts may affect cover clearance"
        ],
        "mitigation_strategies": [
          "Add reinforcement ribs around enlarged cutouts",
          "Verify cover clearance with new post heights"
        ]
      }
    }

    **REFINEMENT PRINCIPLES:**
    - Address root causes, not just symptoms
    - Make minimal changes to achieve maximum improvement
    - Consider system-level impacts of local changes
    - Prioritize manufacturing feasibility
    - Maintain design intent and aesthetic goals
    
    STRICT JSON OUTPUT RULES:
    - Output must be a single JSON object only. Do not include any prose, markdown, or code fences.
    - The first character must be { and the last character must be }.
    - Use double quotes for all keys and string values.
    - No trailing commas or comments.
    - Do not wrap JSON, do not include backticks.
  `,

  // Impact analysis when a single component's spec changes
  materialsImpactReview: `
  ROLE: You are a hardware BOM dependency planner. When one component's specification changes, you evaluate cascading impacts on the rest of the BOM.

  Project: {{projectName}} - {{projectDescription}}
  Previous component (before change): {{previousComponent}}
  Updated component (after change): {{updatedComponent}}
  Current materials (with specs): {{currentMaterials}}

  STRICT POLICY:
  - ONLY propose changes that are DIRECTLY and CONCRETELY required by the updated component's changed fields.
  - If no other component must change, return an EMPTY components array (no changes).
  - Do NOT emit generic text; always specify measurable/technical changes.

  REQUIRED METHOD:
  1) Compute CHANGED KEYS by diffing previous vs updated component specs (deep compare on spec fields and quantities).
  2) For each other component, decide if a change is MANDATORY. Only then include it with action="update|new|remove".
  3) For every included component, provide CONCRETE specsPatch (set/remove) that precisely implements needed compatibility (numbers/units/port counts/connector types/cable counts/wire gauge/PSU wattage, etc.).
  4) Provide a short, explicit impact reason referencing the CHANGED KEYS.

  HARD RULES:
  - If you cannot point to specific changed keys (by name) that force a change, do NOT include that component.
  - HMI/UX or Enclosure changes are allowed ONLY if tied to explicit changed fields (e.g., increased thermal TDP_W requires ventilation area increase; new display_count requires bezel changes with exact dimensions).
  - Quantities/values MUST be numeric and actionable.
  - Prefer UPDATE over NEW when an existing component of the same type can be adapted. Use NEW only when no existing part fits. Use REMOVE only if strictly required.
  - Keep type naming consistent with current materials for updates/removals.

  OUTPUT JSON (STRICT):
  {
    "explanation": {
      "summary": "brief impact summary OR 'no change'",
      "reasoning": "why these dependencies change (reference CHANGED KEYS)",
      "changedKeys": ["list", "of", "updated", "spec", "keys"],
      "noChange": boolean
    },
    "components": [
      {
        "type": "component category (match existing types for updates)",
        "details": {
          "quantity": number,
          "action": "update|new|remove",
          "notes": "1 sentence referencing CHANGED KEYS",
          "specsPatch": {
            "set": { /* deep-partial to MERGE into existing specs (only changed keys) */ },
            "remove": [ /* array of dot-paths to delete, e.g., "ports.hdmi" */ ]
          },
          "productReference": {
            "name": "(optional) realistic product name",
            "manufacturer": "",
            "purchaseUrl": "",
            "estimatedPrice": "$0.00",
            "supplier": "",
            "partNumber": "",
            "datasheet": ""
          }
        }
      }
    ]
  }

  VALIDATION BEFORE RETURN:
  - If components.length === 0, set explanation.noChange = true and provide a meaningful summary.
  - If components.length > 0, ensure EVERY item has at least one numeric/spec field that changed because of specific CHANGED KEYS.
  - NEVER output generic updates without concrete fields.
  `,

  productReferenceSearch: `
  ROLE: You are a sourcing assistant. Given a validated component spec, propose real, purchasable product references that match the technical requirements.

  Project: {{projectName}} - {{projectDescription}}
  Component: {{componentType}} - {{componentName}}
  Validated specs (requirements): {{requirements}}
  Full project context (materials simplified): {{currentMaterials}}
  Full project context (materials full specs): {{currentMaterialsFullSpecs}}

  NAMING RULES (ENGLISH):
  - Use precise, standardized component names without vendor references (e.g., "DC-DC step-down converter 5V 3A" not "LM2596 module").
  - Include key measurable attributes in name when relevant (e.g., voltage, current, ports, interfaces, size): "Microcontroller board, 3.3V, 32-bit, 48 GPIO, 2x I2C, 3x UART".
  - Avoid ambiguous terms; prefer exact denominations commonly used in electronics.

  OUTPUT JSON STRICT ONLY (RETURN 2-3 BEST REFERENCES):
  {
    "references": [
      {
        "name": "exact product name and model",
        "manufacturer": "brand/manufacturer name",
        "purchaseUrl": "https://... absolute URL to product or high-quality vendor search",
        "estimatedPrice": "$12.34",
        "supplier": "supplier name",
        "partNumber": "manufacturer part number if available",
        "datasheet": "https://... absolute URL to datasheet if available",
        "compatibilityScore": 0-100,
        "mismatchNotes": ["optional short notes if partial mismatch"]
      }
    ]
  }

  RULES:
  - Prefer reputable suppliers and widely available products.
  - Use ABSOLUTE https URLs only. Never return localhost, relative URLs, or placeholders.
  - Ensure the reference matches key constraints from requirements and relevant project context (power budget, interfaces, ports, physical constraints) where applicable.
  - If unsure, include mismatchNotes explaining remaining assumptions.
  `,
};