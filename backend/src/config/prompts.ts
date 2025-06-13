export const prompts = {
  projectAnalysis: `
  Analyze the following project description and provide a comprehensive analysis in both structured and human-readable format:
  {{description}}

  Generate only:
  1. A concise, impactful "name" for the project
  2. A detailed "description" that restates and enriches the idea

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
  materialsSearch: `
    Project:
    Name: {{projectName}}
    Description: {{projectDescription}}

    Current materials in the project (with their latest versions):
    {{currentMaterials}}

    Last three component suggestions (CompVersion JSON format):
    {{previousComponents}}

    Refine your search with this user input:
    {{userPrompt}}

    **CRITICAL ANALYSIS REQUIREMENTS:**
    1. **CURRENT STATE ANALYSIS**: Look at each existing component in {{currentMaterials}}
    2. **USER REQUEST ANALYSIS**: Parse {{userPrompt}} for explicit removal requests (e.g., "remove all except", "delete", "only keep", "simplify to")
    3. **MANDATORY COMPONENT REVIEW**: For EVERY existing component, decide: keep, update, or REMOVE

    Based on all of this information, generate a NEW optimized list of components. 
    
    **REMOVAL IS MANDATORY** - You MUST include "remove" actions when:
    - User explicitly asks to "remove", "delete", "only keep X", "simplify"
    - Components are redundant or obsolete
    - User changes project scope (removing features)
    - User wants only specific components (remove all others)
    
    **WHEN USER SAYS "only keep X" or "remove everything except X":**
    - Add "remove" action for ALL components except X
    - Only keep/update the requested components
    - Be aggressive about removal - don't keep unnecessary components

    IMPORTANT INSTRUCTIONS:
    1. **ANALYZE EXISTING MATERIALS**: Review the current materials list carefully
    2. **AVOID DUPLICATES**: Do not suggest components that are already present unless they need to be replaced or updated
    3. **SMART VERSIONING**: 
       - If an existing component is still suitable, keep it as-is (same specs)
       - If an existing component needs modification, update its specs
       - Only add new components for missing functionality
       - **ACTIVELY REMOVE** components that are no longer needed, redundant, or obsolete
       - **REPLACE** components with better alternatives when appropriate
    4. **VERSION MANAGEMENT**: The generated components will create new versions (+1) of existing components or new components as needed
    5. **OPTIMIZATION FOCUS**: 
       - Remove redundant or duplicate functionality
       - Replace outdated components with modern alternatives
       - Remove components that don't fit the current requirements
       - Simplify the design by removing unnecessary complexity

    Adhere **exactly** to this JSON structure (CompVersion):

          {
        "components": [
          {
            "type": "string",
            "details": {
              "key1": "value1",
              "key2": "value2",
              "quantity": number,
              "notes": "string",
              "action": "keep|update|new|remove"
            }
          }
        ]
      }
      
      ACTION EXAMPLES:
      - "action": "new" → Add missing component
      - "action": "keep" → Component stays unchanged  
      - "action": "update" → Modify existing component specs
      - "action": "remove" → Delete component (with notes explaining why)
      
      **MANDATORY**: When user requests removal/simplification, you MUST include multiple "action": "remove" entries!

    Guidelines for analysis:
    1. Power Requirements:
      - Consider both day and night operation
      - For solar-powered systems, include battery backup requirements
      - Calculate power consumption and storage needs
      - Consider power efficiency and sleep modes

    2. Water Control:
      - Analyze whether a pump or valve is more appropriate
      - Consider water pressure requirements
      - Evaluate flow control mechanisms
      - Assess water conservation methods

    3. Sensing and Control:
      - Specify sensor types and requirements
      - Define control logic and timing requirements
      - Consider environmental factors (weather, soil type)
      - Plan for calibration and maintenance

    4. System Integration:
      - Consider communication protocols
      - Plan for system monitoring
      - Evaluate reliability and redundancy
      - Consider maintenance and serviceability

    Guidelines for component types:
    - Use broad categories rather than specific models (e.g., microcontroller, valve, pump, sensor, battery, etc.)
    - For each component, include in "details":
      * Power components (solar panels, batteries, power supplies): voltage, current, power, capacity, efficiency
      * Electronics: powerInput, protocols, dimensions, interfaces
      * Mechanical parts: dimensions, material, load capacity
      * Sensors: measurement range, accuracy, interface type
      * **action**: "keep" (component unchanged), "update" (component modified), "new" (new component), "remove" (component no longer needed)
    - Focus on functional requirements rather than brand names.
    
    **REMOVAL SCENARIOS** - You MUST suggest "remove" when:
    - User says "only keep X" (remove everything else)
    - User says "remove all except X" (remove everything else)
    - User says "delete X" (remove X specifically)
    - User says "simplify" (remove complex/redundant components)
    - User switches from manual to automatic system (remove manual controls)
    - User changes power source (remove old power components)  
    - User simplifies the design (remove complex sensors for basic ones)
    - Components become redundant (multiple sensors measuring the same thing)
    - User changes the project scope (remove features no longer needed)
    
    REPLACEMENT EXAMPLES - Consider replacing components when:
    - User asks for "better", "more efficient", "cheaper" alternatives
    - Technology upgrade is needed (Arduino → ESP32)
    - User changes requirements (small pump → large pump)
    - Integration opportunities (separate modules → integrated solution)

    **Return ONLY the JSON object**, with no extra text.
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
  
  userPrompt: `
    Project Context:
    {{project}}
    
    User Question/Request:
    {{userInput}}
    
    Please provide:
    1. Direct answer to the user's question
    2. Any suggested changes to the project
    3. Next steps or recommendations
  `,
};
