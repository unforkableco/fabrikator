export const prompts = {
  projectAnalysis: `
    Analyze the following project description and provide a comprehensive analysis in both structured and human-readable format:
    {{description}}
    
    You must respond with a valid JSON object. Do not include any text before or after the JSON.
    The JSON should have this exact structure:
    {
      "components": [
        {
          "type": "string",
          "details": {
            "key1": "value1",
            "key2": "value2",
            "quantity": number,
            "notes": "string"
          }
        }
      ],
      "analysis": {
        "summary": "string",
        "technicalRequirements": ["string"],
        "challenges": ["string"],
        "recommendations": ["string"]
      }
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
    - Use broad categories rather than specific models
    - Common categories include: microcontroller, water control (valve/pump), casing, solar panel, 
      power transformer, LED display, speaker, sensor, motor, battery, etc.
    - For each component, provide relevant specifications directly in the details object:
      * For Power components (solar panels, batteries, power supplies):
        - voltage: "X V" (e.g., "12V", "24V")
        - current: "X A" (e.g., "5A", "10A")
        - power: "X W" (e.g., "100W", "200W")
        - capacity: "X Ah" (for batteries)
        - efficiency: "X%" (for solar panels)
      * For electronics: powerInput, protocols, size, etc.
      * For enclosures: ipRating, dimensions, material, etc.
      * For mechanical parts: dimensions, material, loadCapacity, etc.
      * For sensors: measurementRange, accuracy, interfaceType, etc.
    - Focus on functional requirements rather than specific brands or models

    Remember: Your response must be a valid JSON object with no additional text.
  `,
  
  materialsSearch: `
    Based on the following project requirements, suggest specific materials and components:
    {{requirements}}
    
    For each material, provide:
    1. Detailed specifications
    2. Estimated price range
    3. Alternative options
    4. Important considerations for selection
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