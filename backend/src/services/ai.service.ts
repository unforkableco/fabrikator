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
      // Clean the response in case of additional content
      let cleanedResponse = response.trim();
      
      // Extract JSON if the response contains additional text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
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
      // Clean the response in case of additional content
      let cleanedResponse = response.trim();
      
      // Extract JSON if the response contains additional text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', response);
      
      // Fallback: return a default structure
      parsedResponse = {
        components: [
          {
            type: "microcontroller",
            details: {
              action: "new",
              quantity: 1,
                              notes: "Main controller for the project"
            }
          }
        ]
      };
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
    
    // Build the system prompt by replacing variables
    let systemPrompt = prompts.wiringOptimalCircuit
      .replace('{{materials}}', JSON.stringify(materials, null, 2))
      .replace('{{currentDiagram}}', JSON.stringify(currentDiagram || {}, null, 2))
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
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Raw wiring response:', response);
    
    let parsedResponse;
    
    try {
      // Clean the response in case of additional content
      let cleanedResponse = response.trim();
      
      // Extract JSON if the response contains additional text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing AI wiring response:', error);
      console.error('Raw response:', response);
      
      // Fallback: return a default structure
      parsedResponse = {
        explanation: "I couldn't analyze your materials correctly at the moment.",
        suggestions: []
      };
    }

    return parsedResponse;
  }
}
