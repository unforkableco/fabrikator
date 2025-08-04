import { Request, Response } from 'express';
import { ChatService } from './chat.service';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  async handle3DChat(req: Request, res: Response) {
    try {
      const { message, projectId, context, sceneState, selectedComponents } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const response = await this.chatService.handle3DDesignChat({
        message: message.trim(),
        projectId,
        context: context || '3d',
        sceneState,
        selectedComponents: selectedComponents || []
      });

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