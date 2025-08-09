import { AIService } from '../../services/ai.service';
import { Design3DService } from '../design3d/design3d.service';
import { SceneService } from '../scene/scene.service';
import { prompts } from '../../config/prompts';

interface Component3DSuggestion {
  id: string;
  type: 'create' | 'modify' | 'generate';
  title: string;
  description: string;
  componentType: 'DESIGN' | 'FUNCTIONAL' | 'ELECTRONIC' | 'MECHANICAL';
  parameters?: any;
  prompt?: string;
}

interface Chat3DParams {
  message: string;
  projectId: string;
  context: string;
  sceneState?: any;
  selectedComponents?: string[];
}

export class ChatService {
  private aiService: AIService;
  private design3dService: Design3DService;
  private sceneService: SceneService;

  constructor() {
    this.aiService = AIService.getInstance();
    this.design3dService = new Design3DService();
    this.sceneService = new SceneService();
  }

  async handle3DDesignChat(params: Chat3DParams) {
    const { message, projectId, sceneState, selectedComponents } = params;

    try {
      // Build context for the AI
      const contextInfo = await this.build3DContext(projectId, sceneState, selectedComponents);
      
      // Generate AI response with component suggestions
      const aiResponse = await this.generate3DResponse(message, contextInfo);
      
      return {
        id: `ai_${Date.now()}`,
        content: aiResponse.content,
        componentSuggestions: aiResponse.suggestions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in 3D design chat:', error);
      throw new Error('Failed to process 3D design request');
    }
  }

  private async build3DContext(projectId: string, sceneState: any, selectedComponents: string[] = []) {
    let context = `Project ID: ${projectId}\n`;
    
    // Add scene information
    if (sceneState) {
      const objectCount = sceneState.children?.length || 0;
      context += `Current scene: ${objectCount} objects\n`;
      
      if (sceneState.children && sceneState.children.length > 0) {
        context += 'Scene objects:\n';
        sceneState.children.forEach((node: any, index: number) => {
          context += `- ${node.name || 'Unnamed'} (${node.type || 'unknown type'})\n`;
        });
      }
    }
    
    // Add selection information
    if (selectedComponents.length > 0) {
      context += `Selected components: ${selectedComponents.length}\n`;
    }
    
    // Get available components from database
    try {
      const availableComponents = await this.design3dService.getComponents({
        category: 'all'
      });
      
      if (availableComponents.length > 0) {
        context += '\nAvailable 3D components:\n';
        availableComponents.slice(0, 10).forEach((comp: any) => {
          context += `- ${comp.name} (${comp.type})\n`;
        });
      }
    } catch (error: any) {
      console.log('Could not fetch available components:', error?.message || 'Unknown error');
    }
    
    return context;
  }

  private async generate3DResponse(message: string, context: string) {
    console.log('=== GENERATE 3D RESPONSE START ===');
    console.log('Message:', message);
    console.log('Context:', context);
    
    // Build the system prompt using the configured template
    const systemPrompt = prompts.design3DChat
      .replace('{{context}}', context)
      .replace('{{message}}', message);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    console.log('AI Service - Generating 3D design response...');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Messages array:', JSON.stringify(messages, null, 2));
    
    try {
      console.log('Calling OpenAI API...');
      const response = await this.aiService.callOpenAI(messages, 0.7);
      console.log('AI Service - Raw 3D response received:', response);
      
      // Clean and parse the response
      const cleanedResponse = this.aiService.cleanJsonResponse(response);
      console.log('AI Service - Cleaned response for parsing:', cleanedResponse.substring(0, 500) + '...');
      
      const parsedResponse = JSON.parse(cleanedResponse);
      console.log('AI Service - Parsed response:', parsedResponse);
      
      // Validate the response structure
      const result = {
        content: parsedResponse.content || 'I can help you with 3D design. What would you like to create?',
        suggestions: Array.isArray(parsedResponse.suggestions) ? parsedResponse.suggestions : []
      };
      
      console.log('AI Service - Final result:', result);
      return result;
    } catch (error: any) {
      console.error('=== ERROR IN 3D RESPONSE GENERATION ===');
      console.error('Error type:', error?.constructor?.name || 'Unknown');
      console.error('Error message:', error?.message || 'Unknown error');
      console.error('Error stack:', error?.stack || 'No stack trace');
      console.error('=== END ERROR ===');
      
      // Fallback to basic suggestions
      const fallbackSuggestions = this.generateComponentSuggestions(message);
      const fallbackResult = {
        content: `I'm here to help with your 3D design! I can assist with creating custom components, optimizing designs for 3D printing, and suggesting best practices for your maker project. What specific component would you like to work on?`,
        suggestions: fallbackSuggestions
      };
      
      console.log('Using fallback result:', fallbackResult);
      return fallbackResult;
    }
  }

  private generateComponentSuggestions(message: string): Component3DSuggestion[] {
    const suggestions: Component3DSuggestion[] = [];
    
    // Analyze message and generate relevant suggestions
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('optimize')) {
      suggestions.push({
        id: `opt_${Date.now()}`,
        type: 'modify',
        title: 'Optimize for 3D Printing',
        description: 'Reduce overhangs and add support structures',
        componentType: 'DESIGN'
      });
    }
    
    if (lowerMessage.includes('bracket') || lowerMessage.includes('mount')) {
      suggestions.push({
        id: `bracket_${Date.now()}`,
        type: 'create',
        title: 'Custom Mounting Bracket',
        description: 'Adjustable bracket for component mounting',
        componentType: 'MECHANICAL'
      });
    }
    
    return suggestions;
  }
}