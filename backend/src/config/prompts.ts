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
    Project: {{projectName}}
    Description: {{projectDescription}}

    Current materials in the project (with versions):
    {{currentMaterials}}

    Last three component suggestions (CompVersion JSON format):
    {{previousComponents}}

    Refinement input:
    {{userPrompt}}

    **OBJECTIVES:**
    - Generate the most comprehensive list of components, modules, tools, accessories and optional add-ons for any DIY electronics or mechanical build.
    - Highlight possible upgrades, alternative implementations, and creative extensions the user might not have considered.
    - Identify redundant or obsolete items, and recommend consolidation or removal when it enhances clarity or efficiency.

    **CORE ANALYSIS WORKFLOW:**
    1. **Assess Existing Inventory**: For each item in {{currentMaterials}}, decide "keep," "update," or "remove."
    2. **Interpret User Intent**: Parse any explicit scope changes, removals or simplifications in {{userPrompt}}.
    3. **Discover Missing Elements**: Propose new components (incl. sensors, actuators, power, enclosures, connectors, tools) to fill functional gaps.
    4. **Optimize & Consolidate**: Recommend modern, integrated or multi-purpose alternatives to reduce part count and cost.
    5. **Surface Creative Extras**: Suggest optional expansions (e.g., UI modules, add-ons, advanced sensors) to inspire further innovation.

    **OUTPUT FORMAT (CompVersion JSON):**
    {
      "explanation": {
        "summary": "string – brief, conversational summary of what was done",
        "reasoning": "string – in-depth rationale behind your choices",
        "changes": [
          {
            "type": "string – 'added'|'removed'|'updated'|'kept'",
            "component": "string – name/type of component",
            "reason": "string – why this change"
          }
        ],
        "impact": "string – overall effect of these optimizations",
        "nextSteps": "string – suggested follow-up actions or tests"
      },
      "components": [
        {
          "type": "component category",
          "details": {
            "quantity": number,
            "notes": "descriptive usage context",
            "action": "keep|update|new|remove",
            "technicalSpecs": {
              // comprehensive technical metrics: electrical, mechanical, performance, environmental, connectivity, etc.
            }
          }
        }
      ]
    }

    **KEY GUIDELINES:**
    - **No duplicates:** Don't re-suggest existing items unless upgrading.
    - **Pure specs only** in technicalSpecs.
    - **Be thorough:** Cover power, control, sensing, communication, mechanical, enclosure, and tooling needs.
    - **Allow removals** when items are obsolete, redundant or out of scope.
    - **Encourage creativity:** Offer both essential and "nice-to-have" components.
    - **ALWAYS provide meaningful notes:** Every component MUST have descriptive notes explaining its role, function, or purpose in the project (e.g., "Controls water flow based on soil moisture levels").

    **CRITICAL:** Do NOT leave "notes" empty or generic. Each component needs a specific description of what it does in THIS project.
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
