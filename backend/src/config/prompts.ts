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
    Project: {{projectName}} - {{projectDescription}}
    Current materials: {{currentMaterials}}
    User request: {{userPrompt}}

    Analyze existing components and user intent. For each component, decide: keep, update, remove, or add new ones.

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
  
  userPrompt: `
    Project Context:
    {{project}}
    
    User Question/Request:
    {{userInput}}
    
    You are a helpful AI assistant specializing in project development and technical guidance. 
    Respond to the user's question in a conversational, friendly, and natural way. 
    
    Guidelines for your response:
    - Be conversational and engaging, like talking to a colleague
    - Answer the user's question directly and clearly
    - If relevant, mention any insights about their project
    - Suggest practical next steps or recommendations when appropriate
    - Keep the tone professional but warm and approachable
    - Don't use numbered lists or formal structures unless specifically requested
    - If you need more information to give a better answer, ask follow-up questions naturally
    
    Provide a fluid, natural response that addresses their question while being helpful and informative.
  `,
};
