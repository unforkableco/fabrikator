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

    Based on all of this information, generate a NEW optimized list of components. 
    IMPORTANT INSTRUCTIONS:
    1. **ANALYZE EXISTING MATERIALS**: Review the current materials list carefully
    2. **AVOID DUPLICATES**: Do not suggest components that are already present unless they need to be replaced or updated
    3. **SMART VERSIONING**: 
       - If an existing component is still suitable, keep it as-is (same specs)
       - If an existing component needs modification, update its specs
       - Only add new components for missing functionality
       - Remove components that are no longer needed
    4. **VERSION MANAGEMENT**: The generated components will create new versions (+1) of existing components or new components as needed

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
