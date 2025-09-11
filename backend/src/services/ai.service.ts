import OpenAI from 'openai';
import axios from 'axios';
import { prompts } from '../config/prompts';
import { getModelConfig, supportsJsonMode, usesReasoningAPI } from '../config/models.config';

export interface AIProvider {
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  textVerbosity?: 'low' | 'medium' | 'high';
}

export class AIService {
  private static instance: AIService;
  private currentProvider: AIProvider;
  private providers: { [key: string]: AIProvider };
  private openaiClient: OpenAI | null = null;

  private constructor() {
    // Initialize supported providers
    this.providers = {
      openai: {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o'
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

    // Initialize OpenAI client if using OpenAI provider
    if (this.currentProvider.name === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: this.currentProvider.apiKey,
        timeout: 600000 // 10 minutes timeout for GPT-5
      });
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
   * Utility function to normalize price strings for consistent frontend parsing
   */
  public normalizePriceString(priceStr: string): string {
    if (!priceStr || typeof priceStr !== 'string') return '$0.00';
    
    // Extract the first valid price in USD if available, otherwise the first price found
    const usdMatch = priceStr.match(/\$(\d+(?:\.\d{2})?)/);
    if (usdMatch) {
      return `$${usdMatch[1]}`;
    }
    
    // If no USD found, convert GBP ranges to USD (rough conversion: £1 = $1.25)
    const gbpRangeMatch = priceStr.match(/£(\d+)[-–]£?(\d+)/);
    if (gbpRangeMatch) {
      const minPrice = parseFloat(gbpRangeMatch[1]) * 1.25;
      return `$${minPrice.toFixed(2)}`;
    }
    
    // Extract any price with currency symbol
    const currencyMatch = priceStr.match(/[£$€](\d+(?:\.\d+)?)/);
    if (currencyMatch) {
      const amount = parseFloat(currencyMatch[1]);
      const symbol = priceStr.charAt(priceStr.indexOf(currencyMatch[1]) - 1);
      
      if (symbol === '£') {
        // Convert GBP to USD
        return `$${(amount * 1.25).toFixed(2)}`;
      } else if (symbol === '€') {
        // Convert EUR to USD  
        return `$${(amount * 1.10).toFixed(2)}`;
      } else {
        return `$${amount.toFixed(2)}`;
      }
    }
    
    // Last resort: extract first number and assume USD
    const numberMatch = priceStr.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      return `$${parseFloat(numberMatch[1]).toFixed(2)}`;
    }
    
    return '$0.00';
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
        
        if (this.currentProvider.name === 'openai') {
          response = await this.callOpenAI(messages, temperature);
        } else if (this.currentProvider.name === 'claude') {
          response = await this.callClaude(messages, temperature);
        } else if (this.currentProvider.name === 'gemini') {
          response = await this.callGemini(messages, temperature);
        } else {
          throw new Error(`Unsupported AI provider: ${this.currentProvider.name}`);
        }
        
        return response;
      } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isLastAttempt = attempt === retries;
        
        if (isRateLimit && !isLastAttempt) {
          // Calculate exponential backoff delay: 2^attempt * baseDelay (in ms)
          const baseDelay = 1000; // 1 second
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
          
          console.log(`Rate limit hit (429), retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's the last attempt or not a rate limit error, throw the error
        if (isRateLimit) {
          throw new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
        }
        
        throw error;
      }
    }
    
    throw new Error('Failed to call AI service after all retry attempts');
  }

  /**
   * OpenAI-specific API call using SDK
   */
  private async callOpenAIProvider(messages: any[], temperature: number, options: AICallOptions = {}): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const modelConfig = getModelConfig(this.currentProvider.model);
    const isReasoningModel = modelConfig?.isReasoningModel || false;

    try {
      // For now, use Chat Completions API for all OpenAI models
      // TODO: Update to Responses API when available in SDK
      const requestOptions: any = {
        model: this.currentProvider.model,
        messages
      };

      // Set temperature based on model capabilities
      if (isReasoningModel) {
        // GPT-5 only supports temperature=1 (default)
        // Don't set temperature parameter to use default
        // Also don't set max_completion_tokens as it causes empty responses
      } else {
        // GPT-4 supports custom temperature and max_tokens
        requestOptions.temperature = temperature;
        // Use correct parameter for token limits
        const tokenLimit = options.maxTokens || 4096;
        requestOptions.max_tokens = tokenLimit;
      }

      // Add JSON mode if supported and requested (GPT-4 family only)
      if (options.jsonMode && supportsJsonMode(this.currentProvider.model)) {
        requestOptions.response_format = { type: 'json_object' };
      }

      // For reasoning models (GPT-5), adjust prompts to encourage better reasoning
      if (isReasoningModel) {
        // Add instruction for better reasoning in system prompt if not already present
        const systemMessage = messages.find((m: any) => m.role === 'system');
        if (systemMessage && !systemMessage.content.includes('Think step by step')) {
          systemMessage.content = `Think step by step and reason through this carefully.\n\n${systemMessage.content}`;
        }
      }

      const response = await this.openaiClient.chat.completions.create(requestOptions);
      return response.choices[0].message?.content || '';
    } catch (error: any) {
      console.error('OpenAI API Error:', error.message);
      if (error.response?.data) {
        console.error('API Response:', error.response.data);
      }
      throw error;
    }
  }

  // OpenAI helper to force JSON-only responses
  private async callOpenAIJson(messages: any[], temperature: number): Promise<string> {
    return await this.callOpenAIProvider(messages, temperature, { jsonMode: true });
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
      this.currentProvider.baseUrl || 'https://api.anthropic.com/v1/messages',
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
        return await this.callOpenAIProvider(messages, temperature);
      } finally {
        this.currentProvider.model = originalModel;
      }
    }
    
    return await this.callOpenAIProvider(messages, temperature);
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
    let systemPrompt = prompts.projectAnalysis.replace('{{description}}', prompt);
    
    const modelConfig = getModelConfig(this.currentProvider.model);
    const isReasoningModel = modelConfig?.isReasoningModel || false;
    
    // For reasoning models, enhance the prompt for better JSON output
    if (isReasoningModel) {
      systemPrompt = `You are an expert project analyst. Think through this step by step and provide a well-structured analysis.\n\n${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. Do not include any text before or after the JSON.`;
    }
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    try {
      let raw: string;
      if (this.currentProvider.name === 'openai') {
        // Use JSON mode for supported models, reasoning-enhanced prompts for others
        if (supportsJsonMode(this.currentProvider.model)) {
          raw = await this.callOpenAIJson(messages, 0.7);
        } else {
          raw = await this.callOpenAIProvider(messages, 0.7);
        }
      } else {
        raw = await this.callAI(messages, 0.7);
      }
      
      try {
        return JSON.parse(raw);
      } catch {
        const cleanedResponse = this.cleanJsonResponse(raw);
        return JSON.parse(cleanedResponse);
      }
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
    if (contextData?.materials && contextData.materials.length > 0 && contextData?.currentDiagram) {
      const historyArr = Array.isArray(contextData?.chatHistory) ? contextData.chatHistory as Array<{role: string; content: string}> : [];
      const historyText = historyArr.length > 0
        ? '\n\nConversation History (latest messages):\n' + historyArr.slice(-10).map(h => `- ${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
        : '';
      let systemPrompt = (prompts.wiringOptimalCircuit
        .replace('{{materials}}', JSON.stringify(contextData.materials, null, 2))
        .replace('{{currentDiagram}}', JSON.stringify(contextData.currentDiagram, null, 2))
        .replace('{{prompt}}', prompt)) + historyText;
      
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
      const historyArr = Array.isArray(contextData?.chatHistory) ? contextData.chatHistory as Array<{role: string; content: string}> : [];
      const historyText = historyArr.length > 0
        ? '\n\nConversation History (latest messages):\n' + historyArr.slice(-10).map(h => `- ${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
        : '';
      const systemPrompt = (prompts.wiringSuggestions
        .replace('{{prompt}}', prompt)
        .replace('{{context}}', contextData ? JSON.stringify(contextData) : '')) + historyText;
      
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
  async suggestMaterials(params: { name: string; description: string; userPrompt?: string; previousComponents?: any[]; currentMaterials?: any[]; chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }> }) {
    const { name, description, userPrompt = '', previousComponents = [], currentMaterials = [], chatHistory = [] } = params;
    
    // Simplify current materials first (now includes requirements for precision)
    const simplifiedMaterials = currentMaterials.map(material => ({
      id: material.id,
      type: material.currentVersion?.specs?.type || 'unknown',
      name: material.currentVersion?.specs?.name || 'unknown', 
      quantity: material.currentVersion?.specs?.quantity || 1,
      description: material.currentVersion?.specs?.description || '',
      status: material.currentVersion?.specs?.status || 'suggested',
      requirements: (material.currentVersion?.specs as any)?.requirements || {}
    }));
    
    // Build the system prompt by replacing variables
    const modelConfig = getModelConfig(this.currentProvider.model);
    const isReasoningModel = modelConfig?.isReasoningModel || false;
    
    let systemPrompt: string;
    
    // Use the same complex prompt for both GPT-4 and GPT-5
    // GPT-5 can handle complexity better than we thought
    systemPrompt = prompts.materialsSearch
      .replace('{{projectName}}', name)
      .replace('{{projectDescription}}', description)
      .replace('{{userPrompt}}', userPrompt);

    // Append recent chat history for context
    const truncatedHistory = chatHistory.slice(-10);
    const historyText = truncatedHistory.length > 0
      ? '\n\nConversation History (latest messages):\n' + truncatedHistory.map(h => `- ${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
      : '';
    
    // Replace all placeholders  
    const currentMaterialsJson = simplifiedMaterials.length > 0 
      ? JSON.stringify(simplifiedMaterials, null, 2)
      : '[]';
    
    const previousCompJson = previousComponents.length > 0 
      ? JSON.stringify(previousComponents.slice(0, 3))
      : '[]';

    // Build full specs payload for prompt (include entire specs object per material)
    const fullMaterialsSpecs = currentMaterials.map(material => ({
      id: material.id,
      specs: (material.currentVersion?.specs as any) || {}
    }));
    const fullMaterialsSpecsJson = fullMaterialsSpecs.length > 0
      ? JSON.stringify(fullMaterialsSpecs, null, 2)
      : '[]';
    
    systemPrompt = systemPrompt
      .replace('{{currentMaterials}}', currentMaterialsJson)
      .replace('{{previousComponents}}', previousCompJson)
      .replace('{{currentMaterialsFullSpecs}}', fullMaterialsSpecsJson)
      + historyText;
    
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
      let response: string;
      if (this.currentProvider.name === 'openai') {
        // Use JSON mode for supported models, direct call for reasoning models
        const modelConfig = getModelConfig(this.currentProvider.model);
        if (supportsJsonMode(this.currentProvider.model)) {
          response = await this.callOpenAIJson(messages, 0.7);
        } else if (modelConfig?.isReasoningModel) {
          // For GPT-5, use direct call without additional prompt modification
          response = await this.callOpenAIProvider(messages, 0.7);
        } else {
          response = await this.callOpenAIProvider(messages, 0.7);
        }
      } else {
        response = await this.callAI(messages, 0.7);
      }
      
      console.log('AI Service - Raw response received:', response);
      
      // Clean the response using the utility function
      const cleanedResponse = this.cleanJsonResponse(response);
      
      console.log('AI Service - Cleaned response for parsing:', cleanedResponse.substring(0, 500) + '...');
      
      const parsedResponse = JSON.parse(cleanedResponse);
      
      // Validate that we have components
      if (!parsedResponse.components || !Array.isArray(parsedResponse.components) || parsedResponse.components.length === 0) {
        throw new Error('No components found in AI response');
      }
      
      // Normalize price strings to prevent frontend parsing issues
      parsedResponse.components = parsedResponse.components.map((component: any) => {
        if (component.details?.productReference?.estimatedPrice) {
          const originalPrice = component.details.productReference.estimatedPrice;
          const normalizedPrice = this.normalizePriceString(originalPrice);
          component.details.productReference.estimatedPrice = normalizedPrice;
          console.log(`Price normalized: "${originalPrice}" -> "${normalizedPrice}"`);
        }
        return component;
      });

      // Post-filter: Evaluate compatibility against existing requirements
      const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
        const result: Record<string, any> = {};
        if (!obj || typeof obj !== 'object') return result;
        for (const key of Object.keys(obj)) {
          const value = obj[key];
          const path = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, path));
          } else {
            result[path] = value;
          }
        }
        return result;
      };

      const toNumber = (val: any): number | null => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const match = val.match(/([0-9]+(?:\.[0-9]+)?)/);
          if (match) return parseFloat(match[1]);
        }
        return null;
      };

      const includesAll = (needle: any, hay: any): boolean => {
        if (Array.isArray(needle)) {
          if (Array.isArray(hay)) return needle.every(n => hay.includes(n));
          if (typeof hay === 'string') return needle.every(n => hay.toLowerCase().includes(String(n).toLowerCase()));
          return false;
        }
        if (typeof needle === 'string') {
          if (Array.isArray(hay)) return hay.map(h => String(h).toLowerCase()).includes(needle.toLowerCase());
          if (typeof hay === 'string') return hay.toLowerCase().includes(needle.toLowerCase());
        }
        if (typeof needle === 'boolean') return needle === Boolean(hay);
        return true;
      };

      const compareRequirements = (requirements: any, technicalSpecs: any) => {
        const reqFlat = flattenObject(requirements || {});
        const specFlat = flattenObject(technicalSpecs || {});
        const mismatches: string[] = [];
        for (const key of Object.keys(reqFlat)) {
          const reqVal = reqFlat[key];
          const specVal = specFlat[key];
          if (specVal === undefined || specVal === null) {
            mismatches.push(`Missing key: ${key}`);
            continue;
          }
          if (typeof reqVal === 'number') {
            const specNum = toNumber(specVal);
            if (specNum === null || specNum < reqVal) {
              mismatches.push(`Key ${key}: ${specNum ?? 'N/A'} < required ${reqVal}`);
            }
            continue;
          }
          if (Array.isArray(reqVal)) {
            if (!includesAll(reqVal, specVal)) {
              mismatches.push(`Key ${key}: does not include required values`);
            }
            continue;
          }
          if (typeof reqVal === 'string') {
            // Try numeric compare if string contains number, else substring match
            const reqNum = toNumber(reqVal);
            if (reqNum !== null) {
              const specNum = toNumber(specVal);
              if (specNum === null || specNum < reqNum) {
                mismatches.push(`Key ${key}: ${specNum ?? 'N/A'} < required ${reqNum}`);
              }
            } else if (!includesAll(reqVal, specVal)) {
              mismatches.push(`Key ${key}: value not satisfied`);
            }
            continue;
          }
          if (typeof reqVal === 'boolean') {
            if (Boolean(specVal) !== reqVal) {
              mismatches.push(`Key ${key}: expected ${reqVal}`);
            }
          }
        }
        const score = mismatches.length === 0 ? 1 : Math.max(0, 1 - mismatches.length * 0.2);
        return { score, mismatches };
      };

      const findExistingByTypeOrName = (typeOrName: string) => {
        return currentMaterials.find((m: any) => {
          const specs = (m.currentVersion?.specs as any) || {};
          return specs?.type === typeOrName || specs?.name === typeOrName;
        });
      };

      parsedResponse.components = parsedResponse.components.map((component: any) => {
        try {
          const existing = findExistingByTypeOrName(component.type);
          const requirements = existing ? ((existing.currentVersion?.specs as any)?.requirements || {}) : {};
          const technicalSpecs = component.details?.technicalSpecs || {};
          const { score, mismatches } = compareRequirements(requirements, technicalSpecs);
          component.details = component.details || {};
          component.details.compatibilityScore = score;
          if (mismatches.length > 0) component.details.mismatchNotes = mismatches;
        } catch (e) {
          console.warn('Compatibility evaluation failed for component', component?.type, e);
        }
        return component;
      });

      // Strict filtering: keep only 100% compatible suggestions
      parsedResponse.components = parsedResponse.components.filter((c: any) => {
        const score = c?.details?.compatibilityScore;
        return typeof score === 'number' ? score >= 1 : true; // default keep if not computed
      });
      
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
   * Analyze cascading impact on other materials when one component changes
   */
  async reviewMaterialImpact(params: { project: any; updatedComponent: any; currentMaterials: any[] }) {
    const { project, updatedComponent, currentMaterials } = params;

    // Simplify current materials for prompt context
    const fullMaterials = currentMaterials.map(material => ({
      id: material.id,
      type: material.currentVersion?.specs?.type || 'unknown',
      name: material.currentVersion?.specs?.name || 'unknown',
      quantity: material.currentVersion?.specs?.quantity || 1,
      description: material.currentVersion?.specs?.description || '',
      status: material.currentVersion?.specs?.status || 'suggested',
      specs: material.currentVersion?.specs?.requirements || {}
    }));

    // Compose system prompt
    let systemPrompt = prompts.materialsImpactReview
      .replace('{{projectName}}', project.name || 'Unnamed Project')
      .replace('{{projectDescription}}', project.description || '')
      .replace('{{previousComponent}}', JSON.stringify(updatedComponent.previous || updatedComponent, null, 2))
      .replace('{{updatedComponent}}', JSON.stringify(updatedComponent, null, 2))
      .replace('{{currentMaterials}}', JSON.stringify(fullMaterials, null, 2));

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    try {
      let response: string;
      if (this.currentProvider.name === 'openai') {
        const modelConfig = getModelConfig(this.currentProvider.model);
        if (supportsJsonMode(this.currentProvider.model)) {
          response = await this.callOpenAIJson(messages, 0.5);
        } else if (modelConfig?.isReasoningModel) {
          response = await this.callOpenAIProvider(messages, 0.5);
        } else {
          response = await this.callOpenAIProvider(messages, 0.5);
        }
      } else {
        response = await this.callAI(messages, 0.5);
      }

      const cleanedResponse = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.components || !Array.isArray(parsed.components)) {
        throw new Error('Invalid impact response');
      }
      // Normalize prices inside productReference if present
      parsed.components = parsed.components.map((component: any) => {
        if (component.details?.productReference?.estimatedPrice) {
          const originalPrice = component.details.productReference.estimatedPrice;
          component.details.productReference.estimatedPrice = this.normalizePriceString(originalPrice);
        }
        return component;
      });
      return parsed;
    } catch (error) {
      console.error('Error in reviewMaterialImpact:', error);
      return {
        explanation: {
          summary: 'Impact analysis failed - fallback',
          reasoning: 'Could not parse AI response'
        },
        components: []
      };
    }
  }

  /**
   * Legacy method: Answers a user question about a project (backward compatibility)
   */
  async answerProjectQuestion(params: { project: any; materials?: any[]; wiring?: any; userQuestion: string; chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }> }) {
    const { project, materials = [], wiring = null, userQuestion, chatHistory = [] } = params;
    
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
    
    const historyText = chatHistory.length > 0
      ? '\n\nConversation History (latest messages):\n' + chatHistory.slice(-10).map(h => `- ${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') + '\n'
      : '';
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt + historyText
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

  /**
   * Generate 3D design concepts for a project
   */
  async generateDesignConcepts(projectDescription: string, materials: any[]) {
    try {
      console.log('AI Service - Generating design concepts...');
      console.log('Project description length:', projectDescription.length);
      console.log('Materials count:', materials.length);
      
      // Prepare materials context
      const materialsContext = materials.length > 0 
        ? materials.map(m => `${m.name} (${m.type})`).join(', ')
        : 'No materials specified';
      
      console.log('Materials context:', materialsContext);
      
      // Build the system prompt by replacing variables
      const systemPrompt = prompts.design3DGeneration
        .replace('{{projectDescription}}', projectDescription);
      
      console.log('System prompt length:', systemPrompt.length);
      console.log('System prompt preview:', systemPrompt.substring(0, 200) + '...');
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      console.log('AI Service - Sending prompt for design generation...');
      console.log('Using model:', this.currentProvider.model);
      
      const response = await this.callAI(messages, 0.4);
      console.log('AI Service - Design concepts response received');
      console.log('Response length:', response.length);
      console.log('Response preview:', response.substring(0, 200) + '...');
      
      // Parse the JSON response
      const cleanedResponse = this.cleanJsonResponse(response);
      console.log('Cleaned response length:', cleanedResponse.length);
      
      const parsedResponse = JSON.parse(cleanedResponse);
      console.log('Parsed response keys:', Object.keys(parsedResponse));
      
      // Validate that we have a design
      if (!parsedResponse.design) {
        throw new Error('No design found in AI response');
      }
      
      console.log('Successfully parsed design concept');
      return parsedResponse;
    } catch (error: any) {
      console.error('Error in generateDesignConcepts:', error);
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('API Response error:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Generate detailed image description for DALL-E 3
   */
  async generateImageDescription(
    projectDescription: string, 
    materials: any[], 
    description: string
  ): Promise<string> {
    try {
      console.log('AI Service - Generating image description...');
      
      // Build the system prompt by replacing variables
      const systemPrompt = prompts.designImageDescription
        .replace('{{projectDescription}}', projectDescription)
        .replace('{{description}}', description);
      
      console.log('Image description prompt length:', systemPrompt.length);
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      console.log('AI Service - Sending prompt for image description...');
      
      const response = await this.callAI(messages, 0.8);
      console.log('AI Service - Image description response received');
      
      // Clean up the response (remove quotes if wrapped)
      return response.replace(/^["']|["']$/g, '').trim();
    } catch (error: any) {
      console.error('Error in generateImageDescription:', error);
      throw error;
    }
  }

  /**
   * Generate three minimal variations based on a base image + description
   */
  async generateImageVariationsFromBase(
    projectDescription: string,
    materials: any[],
    baseDescription: string
  ): Promise<{ variants: { imagePrompt: string }[] }> {
    try {
      const systemPrompt = prompts.designImageIteration
        .replace('{{projectDescription}}', projectDescription)
        .replace('{{materials}}', materials.map(m => `${m.name} (${m.type})`).join(', '))
        .replace('{{baseDescription}}', baseDescription);

      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      const response = await this.callAI(messages, 0.2);
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);
      if (!parsed.variants || !Array.isArray(parsed.variants) || parsed.variants.length !== 3) {
        throw new Error('Invalid variants response');
      }
      return parsed;
    } catch (error) {
      console.error('Error in generateImageVariationsFromBase:', error);
      throw error;
    }
  }

  /**
   * Vision analysis of an image URL to produce a canonical prompt and features
   */
  async analyzeImageForPrompt(imageUrl: string, baseDescription?: string): Promise<any> {
    try {
      const systemPrompt = prompts.designImageVisionAnalysis;
      const userContent: any[] = [
        { type: 'text', text: baseDescription ? `Base description: ${baseDescription}` : 'Analyze the image.' },
        { type: 'image_url', image_url: { url: imageUrl } },
      ];

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent as any }
      ];

      // Prefer JSON-mode when available (OpenAI)
      let raw: string;
      if (this.currentProvider.name === 'openai') {
        raw = await this.callOpenAIJson(messages, 0.4);
      } else {
        raw = await this.callAI(messages, 0.4);
      }
      try {
        return JSON.parse(raw);
      } catch {
        const cleaned = this.cleanJsonResponse(raw);
        return JSON.parse(cleaned);
      }
    } catch (error) {
      console.error('Error in analyzeImageForPrompt:', error);
      throw error;
    }
  }

  async suggestProductReferences(params: { project: any; component: any }) {
    const { project, component } = params;

    const requirements = component.currentVersion?.specs?.requirements || {};

    // Build broader project context to improve coherence of references
    const projectMaterials = (project as any)?.components || undefined; // fallback if preloaded

    // If not present on project, we can still inject the single component context only; controller may pass others later
    const simplifiedMaterials = Array.isArray(projectMaterials) ? projectMaterials.map((m: any) => ({
      id: m.id,
      type: m.currentVersion?.specs?.type || 'unknown',
      name: m.currentVersion?.specs?.name || 'unknown',
      quantity: m.currentVersion?.specs?.quantity || 1,
      description: m.currentVersion?.specs?.description || '',
      status: m.currentVersion?.specs?.status || 'unknown',
      requirements: (m.currentVersion?.specs as any)?.requirements || {}
    })) : [];

    const fullMaterialsSpecs = Array.isArray(projectMaterials) ? projectMaterials.map((m: any) => ({
      id: m.id,
      specs: (m.currentVersion?.specs as any) || {}
    })) : [];

    const systemPrompt = prompts.productReferenceSearch
      .replace('{{projectName}}', project.name || 'Unnamed Project')
      .replace('{{projectDescription}}', project.description || '')
      .replace('{{componentType}}', component.currentVersion?.specs?.type || component.currentVersion?.specs?.name || 'Component')
      .replace('{{componentName}}', component.currentVersion?.specs?.name || component.currentVersion?.specs?.type || 'Component')
      .replace('{{requirements}}', JSON.stringify(requirements, null, 2))
      .replace('{{currentMaterials}}', JSON.stringify(simplifiedMaterials, null, 2))
      .replace('{{currentMaterialsFullSpecs}}', JSON.stringify(fullMaterialsSpecs, null, 2));

    const messages = [{ role: 'system', content: systemPrompt }];

    const ensureHttps = (url: string) => {
      if (!url) return '';
      try {
        let u = url.trim();
        if (u.startsWith('//')) u = 'https:' + u;
        if (u.startsWith('http://')) u = 'https://' + u.slice(7);
        if (!u.startsWith('http')) u = 'https://' + u;
        return u;
      } catch {
        return '';
      }
    };

    const isDomainAllowed = (u: string) => {
      try {
        const allowed = [
          'amazon.', 'adafruit.', 'sparkfun.', 'aliexpress.', 'mouser.', 'digikey.',
          'rs-online.', 'farnell.', 'element14.', 'arrow.', 'ti.com', 'st.com', 'analog.com'
        ];
        const host = new URL(u).hostname.toLowerCase();
        if (host.includes('localhost') || host.endsWith('.local')) return false;
        return allowed.some(d => host.includes(d));
      } catch {
        return false;
      }
    };

    const buildSearchUrl = (name: string, supplier?: string) => {
      const q = encodeURIComponent(name || 'electronics component');
      if (supplier) {
        const s = supplier.toLowerCase();
        if (s.includes('mouser')) return `https://www.mouser.com/c/?q=${q}`;
        if (s.includes('digikey')) return `https://www.digikey.com/en/products/result?keywords=${q}`;
        if (s.includes('adafruit')) return `https://www.adafruit.com/search?q=${q}`;
        if (s.includes('sparkfun')) return `https://www.sparkfun.com/search/results?term=${q}`;
        if (s.includes('amazon')) return `https://www.amazon.com/s?k=${q}`;
        if (s.includes('aliexpress')) return `https://www.aliexpress.com/wholesale?SearchText=${q}`;
      }
      return `https://www.google.com/search?q=${q}+buy+electronics`;
    };

    const verifyUrl = async (url: string) => {
      const u = ensureHttps(url);
      if (!u) return '';
      if (!isDomainAllowed(u)) return '';
      try {
        // Lightweight GET with timeout; treat 2xx/3xx as valid
        const res = await (await import('axios')).default.get(u, { timeout: 3000, maxRedirects: 3, validateStatus: s => s >= 200 && s < 400 });
        return res.status >= 200 && res.status < 400 ? u : '';
      } catch {
        return '';
      }
    };

    try {
      let response: string;
      if (this.currentProvider.name === 'openai' && supportsJsonMode(this.currentProvider.model)) {
        response = await this.callOpenAIJson(messages, 0.6);
      } else {
        response = await this.callAI(messages, 0.6);
      }
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);
      let refs: any[] = Array.isArray(parsed.references) ? parsed.references : [];
      // Normalize price strings
      refs.forEach((r: any) => {
        if (r.estimatedPrice) r.estimatedPrice = this.normalizePriceString(String(r.estimatedPrice));
      });
      // Sort by compatibilityScore desc if present
      refs.sort((a: any, b: any) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
      // Keep top 3
      refs = refs.slice(0, 3);
      // Verify URLs and replace bad links with search URLs
      const verified: any[] = [];
      for (const r of refs) {
        const name = r.name || '';
        const supplier = r.supplier || '';
        const goodPurchase = await verifyUrl(r.purchaseUrl || '');
        const goodDatasheet = r.datasheet ? await verifyUrl(r.datasheet) : '';
        const finalPurchase = goodPurchase || buildSearchUrl(name, supplier);
        const finalDatasheet = goodDatasheet || '';
        verified.push({
          name,
          manufacturer: r.manufacturer || '',
          purchaseUrl: finalPurchase,
          estimatedPrice: r.estimatedPrice || '$0.00',
          supplier,
          partNumber: r.partNumber || '',
          datasheet: finalDatasheet,
          compatibilityScore: r.compatibilityScore || 0,
          mismatchNotes: Array.isArray(r.mismatchNotes) ? r.mismatchNotes : []
        });
      }
      return verified;
    } catch (error) {
      console.error('Error in suggestProductReferences:', error);
      return [];
    }
  }
}
