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

    **PRODUCT REFERENCES: For each component, also suggest a specific real product reference that the user could purchase if they prefer not to build from scratch. Include:**
    - Exact product name and model number (use realistic, commonly available products)
    - Manufacturer/brand (use well-known manufacturers like Arduino, Adafruit, SparkFun, ESP32, etc.)
    - Purchase link (note: these will be converted to search links, so focus on accurate product names)
    - Current approximate price range
    - The technical specifications should match the suggested product reference
    
    **IMPORTANT FOR PRODUCT NAMES: Use specific, searchable product names that exist in the market:**
    - For microcontrollers: "Arduino Uno R3", "ESP32 DevKit V1", "Raspberry Pi Pico"
    - For sensors: "DHT22 Temperature Humidity Sensor", "HC-SR04 Ultrasonic Sensor"
    - For displays: "SSD1306 OLED Display 128x64", "16x2 LCD Display"
    - For power: "18650 Li-ion Battery", "TP4056 Charging Module"

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
              // COMPREHENSIVE technical specifications from the suggested product reference
              // Include ALL applicable: electrical, mechanical, performance, interface, environmental specs
            },
            "productReference": {
              "name": "exact product name and model",
              "manufacturer": "brand/manufacturer name",
              "purchaseUrl": "direct link to purchase the product",
              "estimatedPrice": "price with currency (e.g., $15.99 USD)",
              "supplier": "supplier name (e.g., Adafruit, SparkFun, Amazon)",
              "partNumber": "manufacturer part number if available",
              "datasheet": "link to datasheet if available"
            }
          }
        }
      ]
    }

    **GUIDELINES:**
    - Provide EXHAUSTIVE technical specifications matching the suggested product reference
    - Include electrical, mechanical, performance, connectivity, and environmental specs when relevant
    - Always include a real product reference with valid purchase information
    - Use reputable electronics suppliers for purchase links
    - Don't duplicate existing components unless upgrading
    - Always include meaningful usage notes
    - Be thorough in component selection and specifications
    - Prefer products that are widely available and well-documented
    - Include datasheet links when possible for technical reference
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
};
