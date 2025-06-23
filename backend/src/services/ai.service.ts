import axios from 'axios';
import { prompts } from '../config/prompts';

export class AIService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Utility function to clean and extract JSON from AI response
   */
  private cleanJsonResponse(response: string): string {
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.includes('```json')) {
      const jsonStart = cleanedResponse.indexOf('```json') + 7;
      const jsonEnd = cleanedResponse.indexOf('```', jsonStart);
      if (jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd).trim();
      }
    } else if (cleanedResponse.includes('```')) {
      // Fallback for generic code blocks
      const jsonStart = cleanedResponse.indexOf('```') + 3;
      const jsonEnd = cleanedResponse.indexOf('```', jsonStart);
      if (jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd).trim();
      }
    }
    
    // Extract JSON if the response contains additional text
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }
    
    // Remove only trailing commas before closing braces/brackets (safer approach)
    cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix JavaScript expressions that AI sometimes generates
    cleanedResponse = cleanedResponse.replace(/"conn-"\s*\+\s*Date\.now\(\)\s*\+\s*"-(\d+)"/g, '"conn-1234567890-$1"');
    cleanedResponse = cleanedResponse.replace(/Date\.now\(\)/g, '1234567890');
    
    return cleanedResponse;
  }

  /**
   * Generic call to OpenAI API with retry logic
   */
  private async callOpenAI(messages: any[], temperature = 0.7, model = 'gpt-4', retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          this.apiUrl,
          {
            model,
            messages,
            temperature
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`
            }
          }
        );

        return response.data.choices[0].message.content;
      } catch (error: any) {
        console.error(`Error calling OpenAI (attempt ${attempt + 1}):`, error?.response?.status, error?.message);
        
        // If it's a 429 error (rate limiting) and there are remaining attempts
        if (error?.response?.status === 429 && attempt < retries) {
          const retryAfter = error?.response?.headers['retry-after'] || 10;
          console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        throw error;
      }
    }
  }

  /**
   * Analyzes a project prompt to create its entities
   */
  async analyzeProjectPrompt(prompt: string) {
    // Utiliser le prompt de configuration en remplaçant les variables
    const systemPrompt = prompts.projectAnalysis.replace('{{description}}', prompt);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    const response = await this.callOpenAI(messages, 0.5);
    let parsedResponse = {};
    
    try {
      // Clean the response using the utility function
      const cleanedResponse = this.cleanJsonResponse(response);
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', response);
      
      // Fallback: return a default structure
      parsedResponse = {
        name: "New Project",
                  description: "Automatically generated description",
        analysis: {
                      summary: "Analysis in progress...",
                      technicalRequirements: ["To be defined"],
            challenges: ["To be analyzed"],
            recommendations: ["To be determined"]
        }
      };
    }

    return parsedResponse;
  }

  /**
   * Suggests hardware components for a project
   */
  async suggestMaterials(params: { name: string; description: string; userPrompt?: string; previousComponents?: any[]; currentMaterials?: any[] }) {
    const { name, description, userPrompt = '', previousComponents = [], currentMaterials = [] } = params;
    
    // Build the system prompt by replacing variables
    let systemPrompt = prompts.materialsSearch
      .replace('{{projectName}}', name)
      .replace('{{projectDescription}}', description)
      .replace('{{userPrompt}}', userPrompt);
    
    // Simplify current materials to reduce prompt size
    const simplifiedMaterials = currentMaterials.map(material => ({
      id: material.id,
      type: material.currentVersion?.specs?.type || 'unknown',
      name: material.currentVersion?.specs?.name || 'unknown', 
      quantity: material.currentVersion?.specs?.quantity || 1,
      description: material.currentVersion?.specs?.description || '',
      status: material.currentVersion?.specs?.status || 'suggested'
    }));
    
    const currentMaterialsJson = simplifiedMaterials.length > 0 
      ? JSON.stringify(simplifiedMaterials, null, 2)
      : '[]';
    
    systemPrompt = systemPrompt.replace('{{currentMaterials}}', currentMaterialsJson);
    
    // Add previous components to prompt if available
    const previousCompJson = previousComponents.length > 0 
      ? JSON.stringify(previousComponents.slice(0, 3)) // Limit to 3 components
      : '[]';
    
    systemPrompt = systemPrompt.replace('{{previousComponents}}', previousCompJson);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    console.log('AI Service - Sending prompt for materials suggestion...');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Simplified materials count:', simplifiedMaterials.length);
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Raw response received:', response);
    
    let parsedResponse;
    
    try {
      // Clean the response using the utility function
      const cleanedResponse = this.cleanJsonResponse(response);
      
      console.log('AI Service - Cleaned response for parsing:', cleanedResponse.substring(0, 500) + '...');
      
      parsedResponse = JSON.parse(cleanedResponse);
      
      // Validate that we have components
      if (!parsedResponse.components || !Array.isArray(parsedResponse.components) || parsedResponse.components.length === 0) {
        throw new Error('No components found in AI response');
      }
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', response);
      console.error('Cleaned response length:', this.cleanJsonResponse(response).length);
      
      // Try to extract components manually from the raw response as a last resort
      try {
        const componentMatches = response.match(/"type":\s*"[^"]+"/g);
        if (componentMatches && componentMatches.length > 1) {
          console.log('Found multiple components in raw response, trying manual extraction...');
          
          // Try to re-request with simpler format
          parsedResponse = {
            explanation: {
              summary: "Composants générés pour le projet",
              reasoning: "Réponse partiellement récupérée après erreur de parsing"
            },
            components: [
              {
                type: "microcontroller",
                details: {
                  action: "new",
                  quantity: 1,
                  notes: "Contrôleur principal - Veuillez regénérer pour obtenir tous les composants"
                }
              }
            ]
          };
        } else {
          // Single component fallback
          parsedResponse = {
            components: [
              {
                type: "microcontroller",
                details: {
                  action: "new",
                  quantity: 1,
                  notes: "Contrôleur principal pour le projet"
                }
              }
            ]
          };
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        parsedResponse = {
          components: [
            {
              type: "microcontroller",
              details: {
                action: "new",
                quantity: 1,
                notes: "Contrôleur principal pour le projet"
              }
            }
          ]
        };
      }
    }

    return parsedResponse;
  }

  /**
   * Answers a user question about a project
   */
  async answerProjectQuestion(params: { project: any; materials?: any[]; wiring?: any; userQuestion: string }) {
    const { project, materials = [], wiring = null, userQuestion } = params;
    
    // Build complete project context
    let projectContext = `Name: ${project.name || 'Unnamed project'}\nDescription: ${project.description || 'No description available'}\nStatus: ${project.status || 'In progress'}`;
    
          // Add materials if available
      if (materials.length > 0) {
        projectContext += '\n\nProject Materials/Components:';
      materials.forEach((material: any, index: number) => {
        const specs = material.currentVersion?.specs || {};
        projectContext += `\n${index + 1}. ${specs.type || specs.name || 'Component'} - `;
        projectContext += `Quantity: ${specs.quantity || 1}`;
        if (specs.description) projectContext += ` - ${specs.description}`;
        if (specs.status) projectContext += ` (Status: ${specs.status})`;
      });
    }
    
    // Add wiring information if available
    if (wiring && wiring.currentVersion) {
      const wiringData = wiring.currentVersion.wiringData || {};
      projectContext += '\n\nProject Wiring:';
      if (wiringData.connections && wiringData.connections.length > 0) {
                  projectContext += `\n- ${wiringData.connections.length} connection(s) defined`;
        wiringData.connections.forEach((conn: any, index: number) => {
          if (conn.from && conn.to) {
            projectContext += `\n  ${index + 1}. ${conn.from} → ${conn.to}`;
          }
        });
      } else {
        projectContext += '\n- Wiring diagram in progress';
      }
    }
    
    // Build the prompt using the userPrompt template
    const systemPrompt = prompts.userPrompt
      .replace('{{project}}', projectContext)
      .replace('{{userInput}}', userQuestion);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    console.log('AI Service - Answering project question...');
    console.log('Question:', userQuestion);
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Question response received');
    
    // For questions, we return the response directly (no JSON parsing needed)
    return response.trim();
  }

  /**
   * Generates wiring suggestions with AI
   */
  async generateWiringSuggestions(params: { prompt: string; materials: any[]; currentDiagram?: any }) {
    const { prompt, materials, currentDiagram } = params;
    
    // Simplify materials to reduce prompt size
    const simplifiedMaterials = materials.map(material => ({
      id: material.id,
      name: material.name,
      type: material.type,
      quantity: material.quantity || 1,
      description: material.description || ''
    }));
    
    // Simplify current diagram to reduce prompt size
    let simplifiedDiagram = {};
    if (currentDiagram && currentDiagram.components) {
      simplifiedDiagram = {
        components: currentDiagram.components.map((comp: any) => ({
          id: comp.id,
          name: comp.name,
          type: comp.type,
          pins: comp.pins?.map((pin: any) => ({
            id: pin.id,
            name: pin.name,
            type: pin.type,
            voltage: pin.voltage
          })) || []
        })),
        connections: (currentDiagram.connections || []).map((conn: any) => ({
          id: conn.id,
          fromComponent: conn.fromComponent,
          fromPin: conn.fromPin,
          toComponent: conn.toComponent,
          toPin: conn.toPin,
          wireType: conn.wireType
        }))
      };
    }
    
    // Build the system prompt by replacing variables
    let systemPrompt = prompts.wiringOptimalCircuit
      .replace('{{materials}}', JSON.stringify(simplifiedMaterials, null, 2))
      .replace('{{currentDiagram}}', JSON.stringify(simplifiedDiagram, null, 2))
      .replace('{{prompt}}', prompt);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    console.log('AI Service - Generating wiring suggestions...');
    console.log('Materials count:', materials.length);
    console.log('System prompt length:', systemPrompt.length);
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Raw wiring response:', response);
    
    let parsedResponse;
    let cleanedResponse = '';
    
    try {
      // Clean the response in case of additional content
      cleanedResponse = response.trim();
      
      // Extract JSON if the response contains additional text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      // Fix common JavaScript expressions in JSON
      cleanedResponse = cleanedResponse.replace(/"conn-"\+Date\.now\(\)\+"-(\d+)"/g, '"conn-$1"');
      cleanedResponse = cleanedResponse.replace(/Date\.now\(\)/g, '1234567890');
      
      console.log('AI Service - Cleaned response for parsing:', cleanedResponse.substring(0, 500) + '...');
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing AI wiring response:', error);
      console.error('Raw response:', response);
      console.error('Cleaned response:', cleanedResponse);
      
      // Fallback: return a default structure
      parsedResponse = {
        explanation: "I couldn't analyze your materials correctly at the moment.",
        suggestions: []
      };
    }

    return parsedResponse;
  }
}
