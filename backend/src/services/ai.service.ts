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
   * Appel générique à l'API OpenAI
   */
  private async callOpenAI(messages: any[], temperature = 0.7, model = 'gpt-4') {
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
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }

  /**
   * Analyse un prompt de projet pour créer ses entités
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
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Invalid response format from AI service');
    }

    return parsedResponse;
  }

  /**
   * Suggère des composants matériels pour un projet
   */
  async suggestMaterials(params: { name: string; description: string; userPrompt?: string; previousComponents?: any[] }) {
    const { name, description, userPrompt = '', previousComponents = [] } = params;
    
    // Construire le système prompt en remplaçant les variables
    let systemPrompt = prompts.materialsSearch
      .replace('{{projectName}}', name)
      .replace('{{projectDescription}}', description)
      .replace('{{userPrompt}}', userPrompt);
    
    // Ajouter les composants précédents au prompt si disponibles
    const previousCompJson = previousComponents.length > 0 
      ? JSON.stringify(previousComponents.slice(0, 3)) // Limiter à 3 composants
      : '[]';
    
    systemPrompt = systemPrompt.replace('{{previousComponents}}', previousCompJson);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    const response = await this.callOpenAI(messages, 0.7);
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Invalid response format from AI service');
    }

    return parsedResponse;
  }
}
