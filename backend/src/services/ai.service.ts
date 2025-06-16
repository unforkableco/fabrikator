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
                              notes: "Main controller for the project"
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
    
    // Build complete project context
    let projectContext = `Name: ${project.name || 'Unnamed project'}\nDescription: ${project.description || 'No description available'}\nStatus: ${project.status || 'In progress'}`;
    
          // Add materials if available
      if (materials.length > 0) {
        projectContext += '\n\nProject Materials/Components:';
      materials.forEach((material: any, index: number) => {
        const specs = material.currentVersion?.specs || {};
        projectContext += `\n${index + 1}. ${specs.type || specs.name || 'Composant'} - `;
        projectContext += `Quantité: ${specs.quantity || 1}`;
        if (specs.description) projectContext += ` - ${specs.description}`;
        if (specs.status) projectContext += ` (Statut: ${specs.status})`;
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

  /**
   * Suggère des schémas de câblage pour un projet
   */
  async suggestWiring(params: { name: string; description: string; userPrompt?: string; currentWiring?: any; availableMaterials?: any[] }) {
    const { name, description, userPrompt = '', currentWiring = null, availableMaterials = [] } = params;
    
    // Simplifier les matériaux disponibles
    const simplifiedMaterials = availableMaterials.map(material => ({
      id: material.id,
      type: material.currentVersion?.specs?.type || 'unknown',
      name: material.currentVersion?.specs?.name || 'unknown',
      pins: this.extractPinsFromMaterial(material),
      voltage: material.currentVersion?.specs?.requirements?.voltage || '5V',
      description: material.currentVersion?.specs?.description || ''
    }));
    
    // Construire le contexte de câblage actuel
    let currentWiringContext = 'Aucun câblage défini';
    if (currentWiring && currentWiring.currentVersion?.wiringData?.connections) {
      const connections = currentWiring.currentVersion.wiringData.connections;
      currentWiringContext = `${connections.length} connexion(s) existante(s):`;
      connections.forEach((conn: any, index: number) => {
        currentWiringContext += `\n${index + 1}. ${conn.from} → ${conn.to}${conn.wire ? ` (${conn.wire})` : ''}`;
      });
    }
    
    const systemPrompt = prompts.wiringGeneration
      .replace('{{projectName}}', name)
      .replace('{{projectDescription}}', description)
      .replace('{{userPrompt}}', userPrompt)
      .replace('{{availableMaterials}}', JSON.stringify(simplifiedMaterials, null, 2))
      .replace('{{currentWiring}}', currentWiringContext);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    console.log('AI Service - Generating wiring suggestions...');
    console.log('Available materials count:', simplifiedMaterials.length);
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Wiring suggestions received');
    
    let parsedResponse;
    
    try {
      let cleanedResponse = response.trim();
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing wiring AI response:', error);
      console.error('Raw response:', response);
      
      // Fallback: retourner une structure par défaut
      parsedResponse = {
        connections: [],
        diagram: {
          components: [],
          wires: []
        },
        validation: {
          isValid: false,
          errors: ['Erreur lors de la génération des suggestions'],
          warnings: [],
          recommendations: ['Veuillez réessayer avec une demande plus spécifique']
        }
      };
    }

    return parsedResponse;
  }

  /**
   * Répond à une question spécifique sur le câblage
   */
  async answerWiringQuestion(params: { question: string; projectContext: any }) {
    const { question, projectContext } = params;
    
    // Construire le contexte de câblage
    let wiringContext = `PROJET: ${projectContext.name}\n`;
    wiringContext += `DESCRIPTION: ${projectContext.description}\n\n`;
    
    if (projectContext.availableMaterials && projectContext.availableMaterials.length > 0) {
      wiringContext += `MATÉRIAUX DISPONIBLES:\n`;
      projectContext.availableMaterials.forEach((material: any, index: number) => {
        const specs = material.currentVersion?.specs || {};
        wiringContext += `${index + 1}. ${specs.name || specs.type} - ${specs.description}\n`;
      });
      wiringContext += '\n';
    }
    
    if (projectContext.currentWiring && projectContext.currentWiring.currentVersion) {
      const wiringData = projectContext.currentWiring.currentVersion.wiringData || {};
      wiringContext += `CÂBLAGE ACTUEL:\n`;
      if (wiringData.connections && wiringData.connections.length > 0) {
        wiringData.connections.forEach((conn: any, index: number) => {
          wiringContext += `${index + 1}. ${conn.from} → ${conn.to}\n`;
        });
      } else {
        wiringContext += 'Aucun câblage défini\n';
      }
    }
    
    const systemPrompt = prompts.wiringQuestion
      .replace('{{projectContext}}', wiringContext)
      .replace('{{question}}', question);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    console.log('AI Service - Answering wiring question...');
    
    const response = await this.callOpenAI(messages, 0.7);
    console.log('AI Service - Wiring question response received');
    
    return response.trim();
  }

  /**
   * Extrait les pins d'un matériau basé sur son type
   */
  private extractPinsFromMaterial(material: any): string[] {
    const specs = material.currentVersion?.specs || {};
    const type = specs.type?.toLowerCase() || '';
    
    // Pins par défaut selon le type de composant
    const pinMappings: { [key: string]: string[] } = {
      'arduino': ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'VIN', '5V', '3.3V', 'GND'],
      'esp32': ['GPIO0', 'GPIO1', 'GPIO2', 'GPIO3', 'GPIO4', 'GPIO5', 'GPIO12', 'GPIO13', 'GPIO14', 'GPIO15', 'GPIO16', 'GPIO17', 'GPIO18', 'GPIO19', 'GPIO21', 'GPIO22', 'GPIO23', '3V3', 'GND', 'VIN'],
      'sensor': ['VCC', 'GND', 'OUT', 'SDA', 'SCL'],
      'dht22': ['VCC', 'GND', 'DATA'],
      'relay': ['VCC', 'GND', 'IN', 'COM', 'NO', 'NC'],
      'led': ['ANODE', 'CATHODE'],
      'resistor': ['PIN1', 'PIN2'],
      'capacitor': ['POSITIVE', 'NEGATIVE'],
      'button': ['PIN1', 'PIN2'],
      'servo': ['VCC', 'GND', 'SIGNAL']
    };
    
    // Chercher le type dans les mappings
    for (const [key, pins] of Object.entries(pinMappings)) {
      if (type.includes(key)) {
        return pins;
      }
    }
    
    // Pins génériques par défaut
    return ['VCC', 'GND', 'OUT'];
  }
}
