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
   * Appel générique à l'API OpenAI avec retry logic
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
        
        // Si c'est une erreur 429 (rate limiting) et qu'il reste des tentatives
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
      // Nettoyer la réponse en cas de contenu supplémentaire
      let cleanedResponse = response.trim();
      
      // Extraire le JSON si la réponse contient du texte supplémentaire
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', response);
      
      // Fallback: retourner une structure par défaut
      parsedResponse = {
        name: "Nouveau Projet",
        description: "Description générée automatiquement",
        analysis: {
          summary: "Analyse en cours...",
          technicalRequirements: ["À définir"],
          challenges: ["À analyser"],
          recommendations: ["À déterminer"]
        }
      };
    }

    return parsedResponse;
  }

  /**
   * Suggère des composants matériels pour un projet
   */
  async suggestMaterials(params: { name: string; description: string; userPrompt?: string; previousComponents?: any[]; currentMaterials?: any[] }) {
    const { name, description, userPrompt = '', previousComponents = [], currentMaterials = [] } = params;
    
    // Construire le système prompt en remplaçant les variables
    let systemPrompt = prompts.materialsSearch
      .replace('{{projectName}}', name)
      .replace('{{projectDescription}}', description)
      .replace('{{userPrompt}}', userPrompt);
    
    // Simplifier les matériaux actuels pour réduire la taille du prompt
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

    console.log('AI Service - Sending prompt for materials suggestion...');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Simplified materials count:', simplifiedMaterials.length);
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Raw response received:', response);
    
    let parsedResponse;
    
    try {
      // Nettoyer la réponse en cas de contenu supplémentaire
      let cleanedResponse = response.trim();
      
      // Extraire le JSON si la réponse contient du texte supplémentaire
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', response);
      
      // Fallback: retourner une structure par défaut
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

    return parsedResponse;
  }

  /**
   * Répond à une question utilisateur concernant un projet
   */
  async answerProjectQuestion(params: { project: any; materials?: any[]; wiring?: any; userQuestion: string }) {
    const { project, materials = [], wiring = null, userQuestion } = params;
    
    // Construire le contexte complet du projet
    let projectContext = `Nom: ${project.name || 'Projet sans nom'}\nDescription: ${project.description || 'Aucune description disponible'}\nStatut: ${project.status || 'En cours'}`;
    
    // Ajouter les matériaux si disponibles
    if (materials.length > 0) {
      projectContext += '\n\nMatériaux/Composants du projet:';
      materials.forEach((material: any, index: number) => {
        const specs = material.currentVersion?.specs || {};
        projectContext += `\n${index + 1}. ${specs.type || specs.name || 'Composant'} - `;
        projectContext += `Quantité: ${specs.quantity || 1}`;
        if (specs.description) projectContext += ` - ${specs.description}`;
        if (specs.status) projectContext += ` (Statut: ${specs.status})`;
      });
    }
    
    // Ajouter les informations de câblage si disponibles
    if (wiring && wiring.currentVersion) {
      const wiringData = wiring.currentVersion.wiringData || {};
      projectContext += '\n\nCâblage du projet:';
      if (wiringData.connections && wiringData.connections.length > 0) {
        projectContext += `\n- ${wiringData.connections.length} connexion(s) définies`;
        wiringData.connections.forEach((conn: any, index: number) => {
          if (conn.from && conn.to) {
            projectContext += `\n  ${index + 1}. ${conn.from} → ${conn.to}`;
          }
        });
      } else {
        projectContext += '\n- Schéma de câblage en cours de définition';
      }
    }
    
    // Construire le prompt en utilisant le prompt userPrompt
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
    
    // Pour les questions, on retourne la réponse directement (pas de parsing JSON nécessaire)
    return response.trim();
  }
}
