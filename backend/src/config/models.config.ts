/**
 * AI Model Configuration
 * Simple configuration for different AI models and their capabilities
 */

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'claude' | 'gemini';
  apiModel: string;
  supportsJsonMode: boolean;
  supportsVision: boolean;
  isReasoningModel: boolean; // GPT-5 family uses Responses API
  maxTokens: number;
  notes?: string;
}

export const MODELS: { [key: string]: ModelConfig } = {
  // GPT-5 family (reasoning models)
  'gpt-5': {
    name: 'GPT-5',
    provider: 'openai',
    apiModel: 'gpt-5',
    supportsJsonMode: false, // Uses reasoning instead
    supportsVision: true,
    isReasoningModel: true,
    maxTokens: 32768,
    notes: 'Best for complex reasoning and code generation'
  },
  
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    provider: 'openai', 
    apiModel: 'gpt-5-mini',
    supportsJsonMode: false,
    supportsVision: true,
    isReasoningModel: true,
    maxTokens: 32768,
    notes: 'Cost-optimized reasoning model'
  },
  
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    provider: 'openai',
    apiModel: 'gpt-5-nano', 
    supportsJsonMode: false,
    supportsVision: false,
    isReasoningModel: true,
    maxTokens: 16384,
    notes: 'High-throughput simple tasks'
  },
  
  // GPT-4 family (chat completions)
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    apiModel: 'gpt-4o',
    supportsJsonMode: true,
    supportsVision: true,
    isReasoningModel: false,
    maxTokens: 128000,
    notes: 'Most balanced model for general tasks'
  },
  
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    apiModel: 'gpt-4o-mini',
    supportsJsonMode: true,
    supportsVision: true,
    isReasoningModel: false,
    maxTokens: 128000,
    notes: 'Faster and more cost-effective'
  }
};

export function getModelConfig(modelName: string): ModelConfig | null {
  return MODELS[modelName] || null;
}

export function supportsJsonMode(modelName: string): boolean {
  const config = getModelConfig(modelName);
  return config?.supportsJsonMode ?? false;
}

export function usesReasoningAPI(modelName: string): boolean {
  const config = getModelConfig(modelName);
  return config?.isReasoningModel ?? false;
}