import axios from 'axios';
import { prisma } from '../prisma/prisma.service';
import { prompts } from '../config/prompts';
import { v4 as uuidv4 } from 'uuid';

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

    return {
      ...parsedResponse,
      response
    };
  }

  /**
   * Suggère des composants matériels pour un projet
   */
  async suggestMaterials(project: any) {
    // Extraire les exigences du projet pour le prompt
    const requirements = JSON.stringify({
      name: project.name,
      description: project.description,
      requirements: project.requirements
    });
    
    const systemPrompt = prompts.materialsSearch.replace('{{requirements}}', requirements);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    const response = await this.callOpenAI(messages, 0.5);
    let parsedResponse = [];
    
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Invalid response format from AI service');
    }

    return parsedResponse;
  }

  /**
   * Génère un plan de câblage pour un projet
   */
  async generateWiringPlan(projectId: string) {
    // Récupérer les données du projet et les composants
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        components: {
          include: {
            currentVersion: true
          }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Formater les composants pour l'IA
    const components = project.components.map(comp => {
      const specs = comp.currentVersion?.specs as Record<string, any> || {};
      return {
        id: comp.id,
        name: specs.name || specs.type || 'Unknown component',
        type: specs.type,
        specs
      };
    });
    
    const componentsStr = JSON.stringify(components);
    const systemPrompt = prompts.wiringGeneration.replace('{{components}}', componentsStr);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    const response = await this.callOpenAI(messages, 0.7);
    let parsedResponse = { connections: [], diagram: {} };
    
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Invalid response format from AI service');
    }

    return parsedResponse;
  }

  /**
   * Traite un prompt utilisateur dans le contexte d'un projet
   */
  async processUserPrompt(projectId: string, userInput: string) {
    // Récupérer les données du projet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        components: {
          include: { currentVersion: true }
        },
        requirements: {
          include: { currentVersion: true }
        },
        wiringSchemas: {
          include: { currentVersion: true }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Formater le projet pour le prompt
    const projectContext = JSON.stringify({
      name: project.name,
      description: project.description,
      components: project.components.map(c => ({
        id: c.id,
        specs: c.currentVersion?.specs
      })),
      requirements: project.requirements.map(r => ({
        id: r.id,
        details: r.currentVersion?.details
      })),
      wiringSchemas: project.wiringSchemas.map(w => ({
        id: w.id,
        data: w.currentVersion?.wiringData
      }))
    });

    const systemPrompt = prompts.userPrompt
      .replace('{{project}}', projectContext)
      .replace('{{userInput}}', userInput);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    const response = await this.callOpenAI(messages, 0.7);
    
    return {
      messageId: uuidv4(),
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      changes: []
    };
  }
}
