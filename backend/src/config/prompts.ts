export const prompts = {
  projectAnalysis: `
  Analyze the following project description and provide a comprehensive analysis in both structured and human-readable format:
  {{description}}

  **IMPORTANT: This is for Forge, a DIY/homemade electronics and tech project builder. All solutions must prioritize DIY, homemade, and self-built approaches.**

  Generate only:
  1. A concise, impactful "name" for the project
  2. A detailed "description" that restates and enriches the idea with DIY/homemade focus

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

  materialsSearch: `
    Project: {{projectName}} - {{projectDescription}}
    Current materials: {{currentMaterials}}
    User request: {{userPrompt}}

    **FORGE DIY PHILOSOPHY: Prioritize homemade, DIY, and self-built solutions. Favor components that can be assembled, modified, or built from scratch rather than pre-made commercial solutions.**

    Analyze existing components and user intent. For each component, decide: keep, update, remove, or add new ones.
    Always prioritize:
    - Components that can be built from basic parts
    - Open-source hardware alternatives
    - Breadboard/prototype-friendly solutions
    - Parts that encourage learning and customization
    - DIY sensors and modules over pre-built ones

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
          "type": "component category",
          "details": {
            "quantity": number,
            "notes": "specific role and function in this project",
            "action": "keep|update|new|remove",
            "technicalSpecs": {
              // COMPREHENSIVE technical specifications relevant to this component type
              // Include ALL applicable: electrical, mechanical, performance, interface, environmental specs
            }
          }
        }
      ]
    }

    **GUIDELINES:**
    - Provide EXHAUSTIVE technical specifications for each component
    - Include electrical, mechanical, performance, connectivity, and environmental specs when relevant
    - Don't duplicate existing components unless upgrading
    - Always include meaningful usage notes
    - Be thorough in component selection and specifications
`,

  wiringGeneration: `
    Generate a wiring plan for the following components:
    {{components}}
    
    Please provide:
    1. Component connections
    2. Connection types
    3. Any safety considerations
    4. Power requirements
  `,

  wiringOptimalCircuit: `
    **CONTEXT:** DIY project with available materials
    
    **AVAILABLE MATERIALS IN THE PROJECT:**
    {{materials}}
    
    **CURRENT WIRING DIAGRAM:**
    {{currentDiagram}}
    
    **FORGE DIY PHILOSOPHY: Priority to homemade and self-built solutions**
    
    **MISSION:** Generate connections for ALL components in the materials list above. Create a complete circuit that connects every component.
    
    **ABSOLUTE RULES (VIOLATION = FAILURE):**
    1. ✅ COPY THE EXACT ID STRINGS from the materials list above - they look like UUIDs (e.g.: "3d16b272-c0b5-489e-855e-10ac19b5821c")
    2. ✅ NEVER generate fake IDs like "comp-1234567" or "comp-micro-456" 
    3. ✅ NEVER use generic names like "microcontroller", "sensor", etc.
    4. ✅ Verify that fromComponent AND toComponent exist in the materials list
    5. ✅ NEVER use "Unknown" or non-existent components
    6. ✅ Use only standard pins according to component type
    7. ✅ CONNECT ALL COMPONENTS - don't leave any component unconnected
    8. ✅ Every sensor must be connected to the microcontroller
    9. ✅ Every component must have power (VCC) and ground (GND) connections
    
    **STANDARD PINS BY COMPONENT TYPE:**
    - microcontroller/arduino → vcc, gnd, gpio1, gpio2, gpio3, gpio4, d0, d1, d2, d3, d4, d5, d6, d7, a0, a1
    - sensor (generic) → vcc, gnd, data, signal, out
    - moisture sensor → vcc, gnd, data, signal, analog
    - temperature sensor → vcc, gnd, data, signal, analog
    - light sensor → vcc, gnd, data, signal, analog
    - speech/audio → vcc, gnd, data, signal, pin1, pin2
    - display/screen/lcd/oled → vcc, gnd, sda, scl, cs, dc, rst
    - battery → positive, negative
    - power supply → positive, negative, vcc, gnd
    - button → pin1, pin2, signal, gnd
    - pump → vcc, gnd, signal, control
    - valve → vcc, gnd, signal, control
    - motor → vcc, gnd, signal, control
    
    **BEFORE CREATING A CONNECTION, VERIFY:**
    1. Does the source component exist in {{materials}}?
    2. Does the destination component exist in {{materials}}?
    3. Does the source pin match the component type?
    4. Does the destination pin match the component type?
    
    **STRICT JSON RESPONSE FORMAT:**
    {
      "explanation": "Proposed circuit with [NUMBER] connections between existing components: [LIST OF NAMES]",
      "suggestions": [
        {
          "action": "add",
          "type": "Connection [SOURCE_TYPE] to [DESTINATION_TYPE]",
          "description": "Connect [SOURCE_NAME].[SOURCE_PIN] to [DESTINATION_NAME].[DESTINATION_PIN] for [REASON]",
          "connectionData": {
            "id": "conn-[timestamp]-[index]",
            "fromComponent": "[EXACT_SOURCE_MATERIAL_ID]",
            "fromPin": "[standard_pin_according_to_type]",
            "toComponent": "[EXACT_DESTINATION_MATERIAL_ID]",
            "toPin": "[standard_pin_according_to_type]",
            "wireType": "power|ground|data|analog|digital",
            "wireColor": "#[color_according_to_type]",
            "validated": false
          },
          "confidence": 0.9
        }
      ]
    }
    
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
    
    **CONNECTION STRATEGY - CONNECT ALL COMPONENTS:**
    
    **STEP 1: Power connections (MANDATORY for all components)**
    - Connect power source (battery/power supply) VCC to ALL components VCC
    - Connect power source GND to ALL components GND
    
    **STEP 2: Sensor connections (connect ALL sensors to microcontroller)**
    - Moisture sensors → microcontroller analog pins (a0, a1, etc.)
    - Temperature sensors → microcontroller analog pins (a2, a3, etc.)
    - Light sensors → microcontroller analog pins (a4, a5, etc.)
    - Digital sensors → microcontroller digital pins (d0, d1, etc.)
    
    **STEP 3: Output device connections**
    - Displays → microcontroller (SDA, SCL for I2C or specific pins)
    - Motors/pumps → microcontroller GPIO pins for control
    - Speakers/buzzers → microcontroller GPIO pins
    - LEDs → microcontroller GPIO pins
    
    **STEP 4: Communication modules**
    - WiFi/Bluetooth modules → microcontroller UART/SPI pins
    - Speech synthesizers → microcontroller UART or GPIO pins
    
    **MANDATORY: Every component in the materials list MUST appear in at least one connection**
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
};
