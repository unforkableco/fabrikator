import axios from 'axios';
import { prompts } from '../config/prompts';

export interface AIProvider {
  name: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export class AIService {
  private static instance: AIService;
  private currentProvider: AIProvider;
  private providers: { [key: string]: AIProvider };

  private constructor() {
    // Initialize supported providers
    this.providers = {
      openai: {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseUrl: 'https://api.openai.com/v1/chat/completions'
      },
      claude: {
        name: 'claude',
        apiKey: process.env.CLAUDE_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        baseUrl: 'https://api.anthropic.com/v1/messages'
      },
      gemini: {
        name: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
      }
    };

    // Set current provider based on environment variable
    const selectedProvider = process.env.AI_PROVIDER || 'openai';
    this.currentProvider = this.providers[selectedProvider];

    if (!this.currentProvider) {
      throw new Error(`Unsupported AI provider: ${selectedProvider}`);
    }

    // Validate API key
    if (!this.currentProvider.apiKey) {
      throw new Error(`API key not configured for provider: ${selectedProvider}`);
    }

    console.log(`AIService initialized with provider: ${this.currentProvider.name}, model: ${this.currentProvider.model}`);
  }

  /**
   * Get the singleton instance of AIService
   */
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * For backward compatibility - allows new AIService() to still work
   * @deprecated Use AIService.getInstance() instead
   */
  public static create(): AIService {
    return AIService.getInstance();
  }

  /**
   * Utility function to clean and extract JSON from AI response
   */
  public cleanJsonResponse(response: string): string {
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
   * Generic call to AI API with provider-specific implementation
   */
  public async callAI(messages: any[], temperature = 0.7, retries = 2): Promise<string> {
    console.log(`Calling ${this.currentProvider.name} API with model: ${this.currentProvider.model}, messages: ${messages.length}, temperature: ${temperature}`);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let response;
        
        switch (this.currentProvider.name) {
          case 'openai':
            response = await this.callOpenAIProvider(messages, temperature);
            break;
          case 'claude':
            response = await this.callClaude(messages, temperature);
            break;
          case 'gemini':
            response = await this.callGemini(messages, temperature);
            break;
          default:
            throw new Error(`Unsupported provider: ${this.currentProvider.name}`);
        }

        console.log(`${this.currentProvider.name} API call successful. Response length: ${response.length}`);
        return response;
      } catch (error: any) {
        console.error(`Error calling ${this.currentProvider.name} (attempt ${attempt + 1}):`, {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          message: error?.message,
          data: error?.response?.data
        });
        
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
    
    throw new Error('Max retries exceeded');
  }

  /**
   * OpenAI-specific API call
   */
  private async callOpenAIProvider(messages: any[], temperature: number): Promise<string> {
    const response = await axios.post(
      this.currentProvider.baseUrl,
      {
        model: this.currentProvider.model,
        messages,
        temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.currentProvider.apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Claude-specific API call
   */
  private async callClaude(messages: any[], temperature: number): Promise<string> {
    // Convert OpenAI format to Claude format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const claudePayload: any = {
      model: this.currentProvider.model,
      max_tokens: 4096,
      temperature,
      messages: userMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    };

    // Add system message if present
    if (systemMessage) {
      claudePayload.system = systemMessage.content;
    }

    const response = await axios.post(
      this.currentProvider.baseUrl,
      claudePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.currentProvider.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Gemini-specific API call
   */
  private async callGemini(messages: any[], temperature: number): Promise<string> {
    // Convert messages to Gemini format
    const contents = messages.filter(m => m.role !== 'system').map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add system instruction if present
    const systemMessage = messages.find(m => m.role === 'system');
    const geminiPayload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      }
    };

    if (systemMessage) {
      geminiPayload.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const url = `${this.currentProvider.baseUrl}/${this.currentProvider.model}:generateContent?key=${this.currentProvider.apiKey}`;
    
    const response = await axios.post(url, geminiPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.candidates[0].content.parts[0].text;
  }

  /**
   * Backward compatibility method
   */
  public async callOpenAI(messages: any[], temperature = 0.7, model?: string, retries = 2): Promise<string> {
    // Override model if provided for backward compatibility
    if (model && this.currentProvider.name === 'openai') {
      const originalModel = this.currentProvider.model;
      this.currentProvider.model = model;
      try {
        return await this.callAI(messages, temperature, retries);
      } finally {
        this.currentProvider.model = originalModel;
      }
    }
    
    return await this.callAI(messages, temperature, retries);
  }

  /**
   * Get current provider information
   */
  public getCurrentProvider(): AIProvider {
    return { ...this.currentProvider };
  }

  /**
   * Switch provider dynamically (useful for testing or fallback)
   */
  public switchProvider(providerName: string): void {
    if (!this.providers[providerName]) {
      throw new Error(`Provider ${providerName} not configured`);
    }
    
    this.currentProvider = this.providers[providerName];
    
    if (!this.currentProvider.apiKey) {
      throw new Error(`API key not configured for provider: ${providerName}`);
    }
    
    console.log(`Switched to provider: ${this.currentProvider.name}, model: ${this.currentProvider.model}`);
  }

  /**
   * Analyzes a project prompt to create its entities
   */
  async analyzeProjectPrompt(prompt: string) {
    // Use the configuration prompt by replacing variables
    const systemPrompt = prompts.projectAnalysis.replace('{{description}}', prompt);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    try {
      const response = await this.callAI(messages, 0.7);
      const cleanedResponse = this.cleanJsonResponse(response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error in analyzeProjectPrompt:', error);
      throw error;
    }
  }

  /**
   * Generate component suggestions for a project
   */
  async generateComponentSuggestions(projectId: string, description: string) {
    const systemPrompt = prompts.materialsSearch
      .replace('{{projectId}}', projectId)
      .replace('{{description}}', description);
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    try {
      const response = await this.callAI(messages, 0.7);
      const cleanedResponse = this.cleanJsonResponse(response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error in generateComponentSuggestions:', error);
      throw error;
    }
  }

  /**
   * Generate wiring suggestions
   */
  async generateWiringSuggestions(prompt: string, context?: any): Promise<any>;
  async generateWiringSuggestions(params: { prompt: string; materials: any[]; currentDiagram?: any }): Promise<any>;
  async generateWiringSuggestions(promptOrParams: string | { prompt: string; materials: any[]; currentDiagram?: any }, context?: any): Promise<any> {
    let prompt: string;
    let contextData: any;

    // Handle both old and new signature
    if (typeof promptOrParams === 'string') {
      prompt = promptOrParams;
      contextData = context;
    } else {
      prompt = promptOrParams.prompt;
      contextData = {
        materials: promptOrParams.materials,
        currentDiagram: promptOrParams.currentDiagram
      };
    }

    // Use wiringOptimalCircuit for complex wiring analysis (legacy support)
    if (contextData?.materials && contextData?.currentDiagram) {
      let systemPrompt = prompts.wiringOptimalCircuit
        .replace('{{materials}}', JSON.stringify(contextData.materials, null, 2))
        .replace('{{currentDiagram}}', JSON.stringify(contextData.currentDiagram, null, 2))
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

      try {
        const response = await this.callAI(messages, 0.7);
        console.log('AI Service - Raw wiring response:', response);
        
        let cleanedResponse = response.trim();
        
        // Extract JSON if the response contains additional text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        // Fix common JavaScript expressions in JSON
        cleanedResponse = cleanedResponse.replace(/"conn-"\+Date\.now\(\)\+"-(\d+)"/g, '"conn-$1"');
        cleanedResponse = cleanedResponse.replace(/Date\.now\(\)/g, '1234567890');
        
        console.log('AI Service - Cleaned response for parsing:', cleanedResponse.substring(0, 500) + '...');
        
        const parsedResponse = JSON.parse(cleanedResponse);
        return parsedResponse;
      } catch (error) {
        console.error('Error parsing AI wiring response:', error);
        
        // Fallback: return a default structure
        return {
          explanation: "I couldn't analyze your materials correctly at the moment.",
          suggestions: []
        };
      }
    } else {
      // Use simple wiring suggestions for new API
      const systemPrompt = prompts.wiringSuggestions
        .replace('{{prompt}}', prompt)
        .replace('{{context}}', contextData ? JSON.stringify(contextData) : '');
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      try {
        const response = await this.callAI(messages, 0.7);
        const cleanedResponse = this.cleanJsonResponse(response);
        return JSON.parse(cleanedResponse);
      } catch (error) {
        console.error('Error in generateWiringSuggestions:', error);
        throw error;
      }
    }
  }

  /**
   * Generate chat response
   */
  async generateChatResponse(message: string, context?: string) {
    let systemPrompt = prompts.chatResponse || 'You are a helpful assistant for electronics and 3D printing projects.';
    
    if (context) {
      systemPrompt = systemPrompt.replace('{{context}}', context);
    }
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message
      }
    ];

    try {
      return await this.callAI(messages, 0.7);
    } catch (error) {
      console.error('Error in generateChatResponse:', error);
      throw error;
    }
  }

  /**
   * Legacy method: Suggests hardware components for a project (backward compatibility)
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
    
    try {
      const response = await this.callAI(messages, 0.7);
      console.log('AI Service - Raw response received:', response);
      
      // Clean the response using the utility function
      const cleanedResponse = this.cleanJsonResponse(response);
      
      console.log('AI Service - Cleaned response for parsing:', cleanedResponse.substring(0, 500) + '...');
      
      const parsedResponse = JSON.parse(cleanedResponse);
      
      // Validate that we have components
      if (!parsedResponse.components || !Array.isArray(parsedResponse.components) || parsedResponse.components.length === 0) {
        throw new Error('No components found in AI response');
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Fallback: return a default structure
      return {
        explanation: {
          summary: "Error generating components - using fallback",
          reasoning: "AI response could not be parsed correctly"
        },
        components: [
          {
            type: "microcontroller",
            details: {
              action: "new",
              quantity: 1,
              notes: "Main controller for the project - Please regenerate"
            }
          }
        ]
      };
    }
  }

  /**
   * Legacy method: Answers a user question about a project (backward compatibility)
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
    
    try {
      const response = await this.callAI(messages, 0.7);
      console.log('AI Service - Question response received');
      
      // For questions, we return the response directly (no JSON parsing needed)
      return response.trim();
    } catch (error) {
      console.error('Error in answerProjectQuestion:', error);
      throw error;
    }
  }
}
