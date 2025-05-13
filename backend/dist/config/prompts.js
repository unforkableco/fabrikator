"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prompts = void 0;
exports.prompts = {
    projectAnalysis: `
    Analyze the following project description and suggest required materials and components:
    {{description}}
    
    Please provide:
    1. A list of required material types
    2. Specific material suggestions for each type
    3. Any technical requirements or constraints
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
