import { Project, Message, ProjectChange, MaterialType, Material, WiringPlan, MaterialStatus } from '../types';
import { prompts } from '../config/prompts';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from the backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface MaterialSuggestion {
  type: string;
  details: Record<string, any>;
  newDetails?: Record<string, any>;
}

interface AIAnalysisResponse {
  requirements: MaterialType[];
  suggestedMaterials: Material[];
  response: string;
}

interface ProjectPromptResponse {
  name: string;
  description: string;
  requirements: any[];
  components: any[];
  product3D?: any;
  wiringSchema?: any;
  documents?: any[];
  response: string;
}

export class AIService {
  private readonly projectAnalysisApiKey: string;
  private readonly projectAnalysisApiEndpoint: string;
  private readonly materialsSearchApiKey: string;
  private readonly materialsSearchApiEndpoint: string;
  private readonly wiringGenerationApiKey: string;
  private readonly wiringGenerationApiEndpoint: string;
  private readonly prompts: {
    projectAnalysis: string;
  };

  constructor() {
    // Project Analysis API
    this.projectAnalysisApiKey = process.env.PROJECT_ANALYSIS_API_KEY || '';
    this.projectAnalysisApiEndpoint = process.env.PROJECT_ANALYSIS_API_ENDPOINT || '';
    
    // Materials Search API
    this.materialsSearchApiKey = process.env.MATERIALS_SEARCH_API_KEY || '';
    this.materialsSearchApiEndpoint = process.env.MATERIALS_SEARCH_API_ENDPOINT || '';
    
    // Wiring Generation API
    this.wiringGenerationApiKey = process.env.WIRING_GENERATION_API_KEY || '';
    this.wiringGenerationApiEndpoint = process.env.WIRING_GENERATION_API_ENDPOINT || '';

    // Log the loaded environment variables (for debugging)
    console.log('Loaded environment variables:', {
      projectAnalysisApiKey: this.projectAnalysisApiKey ? '***' : 'missing',
      projectAnalysisApiEndpoint: this.projectAnalysisApiEndpoint,
      materialsSearchApiKey: this.materialsSearchApiKey ? '***' : 'missing',
      materialsSearchApiEndpoint: this.materialsSearchApiEndpoint,
      wiringGenerationApiKey: this.wiringGenerationApiKey ? '***' : 'missing',
      wiringGenerationApiEndpoint: this.wiringGenerationApiEndpoint,
    });

    this.prompts = {
      projectAnalysis: `Analyze the following project and provide a detailed breakdown of required components and technical considerations:

Project Name: {projectName}
Description: {projectDescription}

Please provide your analysis in the following JSON format:
{
  "summary": "Brief summary of the project",
  "technicalRequirements": [
    "List of technical requirements"
  ],
  "challenges": [
    "List of potential challenges"
  ],
  "recommendations": [
    "List of recommendations"
  ],
  "components": [
    {
      "type": "Component Type",
      "details": {
        "powerInput": "Power requirements",
        "size": "Physical dimensions",
        "quantity": 1,
        "notes": "Additional notes"
      }
    }
  ]
}

For each component, provide:
- type: The type of component (e.g., "Microcontroller", "Sensor", "Motor")
- details.powerInput: Power requirements (e.g., "5V DC", "12V AC")
- details.size: Physical dimensions (e.g., "20mm x 30mm", "Standard Arduino size")
- details.quantity: Number of units needed
- details.notes: Any additional specifications or considerations

Ensure the response is a valid JSON object with no additional text.`
    };

    this.validateConfig();
  }

  private validateConfig() {
    const missingConfigs = [];
    
    if (!this.projectAnalysisApiKey || !this.projectAnalysisApiEndpoint) {
      missingConfigs.push('Project Analysis API');
    }
    if (!this.materialsSearchApiKey || !this.materialsSearchApiEndpoint) {
      missingConfigs.push('Materials Search API');
    }
    if (!this.wiringGenerationApiKey || !this.wiringGenerationApiEndpoint) {
      missingConfigs.push('Wiring Generation API');
    }

    if (missingConfigs.length > 0) {
      console.warn(`Missing configuration for: ${missingConfigs.join(', ')}`);
    }
  }

  private async callAI(
    prompt: string,
    context: any,
    apiKey: string,
    apiEndpoint: string
  ): Promise<string> {
    if (!apiKey || !apiEndpoint) {
      throw new Error('AI API configuration missing');
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that analyzes project requirements and suggests materials."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API request failed: ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling AI service:', error);
      throw error;
    }
  }

  async analyzeProject(project: Project): Promise<AIAnalysisResponse> {
    try {
      const prompt = this.prompts.projectAnalysis
        .replace('{projectName}', project.name)
        .replace('{projectDescription}', project.description);

      const response = await this.callAI(
        prompt,
        { project },
        this.projectAnalysisApiKey,
        this.projectAnalysisApiEndpoint
      );

      console.log('Raw AI response:', response);

      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      const jsonStr = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonStr);

      // Format the response to match the expected interface
      return {
        requirements: parsedResponse.technicalRequirements.map((req: string) => ({
          name: req,
          description: `Required for ${req.toLowerCase()}`,
          suggestedOptions: [],
          requirements: {}
        })),
        suggestedMaterials: parsedResponse.components.map((comp: any) => ({
          id: uuidv4(),
          type: comp.type,
          name: comp.type,
          description: comp.details.notes || '',
          quantity: comp.details.quantity || 1,
          status: MaterialStatus.SUGGESTED,
          requirements: {
            powerInput: comp.details.powerInput || '',
            size: comp.details.size || '',
          }
        })),
        response: `Project Analysis Summary:\n${parsedResponse.summary}\n\nTechnical Requirements:\n${parsedResponse.technicalRequirements.map((req: string) => `- ${req}`).join('\n')}\n\nPotential Challenges:\n${parsedResponse.challenges.map((challenge: string) => `- ${challenge}`).join('\n')}\n\nRecommendations:\n${parsedResponse.recommendations.map((rec: string) => `- ${rec}`).join('\n')}`
      };
    } catch (error) {
      console.error('Error in AI analysis:', error);
      throw error;
    }
  }

  async getSuggestions(prompt: string, context: { messages: Message[], currentMaterials: any[] }): Promise<MaterialSuggestion[]> {
    try {
      const systemPrompt = `You are an expert in electronics and IoT project analysis. 
      Analyze the current project state and provide suggestions for improvements.
      For each material, include both current details and suggested new details.
      If suggesting new materials, include them in the same format.`;

      const userPrompt = `Current project state:
      ${JSON.stringify(context.currentMaterials, null, 2)}
      
      User request: ${prompt}
      
      Provide suggestions in the following JSON format:
      {
        "suggestions": [
          {
            "type": "Component Type",
            "details": {
              "current": "details"
            },
            "newDetails": {
              "suggested": "details"
            }
          }
        ]
      }`;

      const response = await this.callAI(
        userPrompt,
        { messages: context.messages, currentMaterials: context.currentMaterials },
        this.projectAnalysisApiKey,
        this.projectAnalysisApiEndpoint
      );

      console.log('Raw AI response:', response);

      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      const jsonStr = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonStr);
      return parsedResponse.suggestions;
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      throw error;
    }
  }

  async suggestMaterials(project: Project): Promise<Material[]> {
    const prompt = prompts.materialsSearch.replace('{{requirements}}', JSON.stringify(project.requirements));
    const response = await this.callAI(
      prompt,
      { project },
      this.materialsSearchApiKey,
      this.materialsSearchApiEndpoint
    );
    
    // TODO: Parse AI response and extract suggested materials
    return [];
  }

  async generateWiringPlan(project: Project): Promise<WiringPlan> {
    const prompt = prompts.wiringGeneration.replace('{{components}}', JSON.stringify(project.selectedParts));
    const response = await this.callAI(
      prompt,
      { project },
      this.wiringGenerationApiKey,
      this.wiringGenerationApiEndpoint
    );
    
    // TODO: Parse AI response and create wiring plan
    return {
      components: [],
      aiGenerated: true,
      version: 1,
    };
  }

  async processUserPrompt(project: Project, userInput: string): Promise<{
    message: Message;
    changes: ProjectChange[];
  }> {
    // For user prompts, we'll use the project analysis API as it's the most general-purpose
    const prompt = prompts.userPrompt
      .replace('{{project}}', JSON.stringify(project))
      .replace('{{userInput}}', userInput);
    
    const response = await this.callAI(
      prompt,
      { project, userInput },
      this.projectAnalysisApiKey,
      this.projectAnalysisApiEndpoint
    );
    
    // TODO: Parse AI response and extract changes
    return {
      message: {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      },
      changes: [],
    };
  }

  async analyzeProjectPrompt(prompt: string): Promise<ProjectPromptResponse> {
    try {
      const projectPromptTemplate = `
        Analyze the following project prompt and generate a structured project specification:
        
        Prompt: ${prompt}
        
        Please provide your analysis in the following JSON format:
        {
          "name": "Project name",
          "description": "Detailed project description",
          "requirements": [
            {
              "name": "Requirement name",
              "description": "Requirement description",
              "details": {
                "priority": "high/medium/low",
                "category": "functional/technical/performance/etc",
                "notes": "Additional notes"
              }
            }
          ],
          "components": [
            {
              "type": "Component type",
              "details": {
                "powerInput": "Power requirements",
                "size": "Physical dimensions",
                "quantity": 1,
                "notes": "Additional notes"
              }
            }
          ]
        }
        
        Ensure the response is a valid JSON object with no additional text.
      `;

      const response = await this.callAI(
        projectPromptTemplate,
        { prompt },
        this.projectAnalysisApiKey,
        this.projectAnalysisApiEndpoint
      );

      console.log('Raw AI response:', response);

      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      const jsonStr = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonStr);

      // Add the original response text
      return {
        ...parsedResponse,
        response
      };
    } catch (error) {
      console.error('Error in analyzeProjectPrompt:', error);
      throw error;
    }
  }
} 