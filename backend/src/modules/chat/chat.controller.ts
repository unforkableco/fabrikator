import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ProjectService } from '../project/project.service';

export class ChatController {
  private chatService: ChatService;
  private projectService: ProjectService;

  constructor() {
    this.chatService = new ChatService();
    this.projectService = new ProjectService();
  }

  async handle3DChat(req: Request, res: Response) {
    try {
      const { message, projectId, context, sceneState, selectedComponents, language } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Persist user message (Ask in 3D context)
      try {
        await this.projectService.addMessageToProject(projectId, {
          context: context || '3d',
          content: message.trim(),
          sender: 'user',
          mode: 'ask',
          suggestions: null
        });
      } catch (e) {
        console.warn('Failed to persist 3D user message:', e);
      }

      const response = await this.chatService.handle3DDesignChat({
        message: message.trim(),
        projectId,
        context: context || '3d',
        sceneState,
        selectedComponents: selectedComponents || [],
        language
      });

      // Persist AI response (Agent in 3D context). Include suggestions if available
      try {
        await this.projectService.addMessageToProject(projectId, {
          context: context || '3d',
          content: response.content,
          sender: 'ai',
          mode: 'agent',
          suggestions: response.componentSuggestions || null
        });
      } catch (e) {
        console.warn('Failed to persist 3D AI message:', e);
      }

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Error in 3D chat:', error);
      res.status(500).json({ 
        error: 'Failed to process 3D chat request',
        details: error.message 
      });
    }
  }
}