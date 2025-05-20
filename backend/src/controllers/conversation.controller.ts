import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';

export class ConversationController {
  private conversationService: ConversationService;

  constructor() {
    this.conversationService = new ConversationService();
  }

  /**
   * List all conversations for a project
   */
  async listConversations(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const conversations = await this.conversationService.getProjectConversations(projectId);
      
      res.json(conversations);
    } catch (error) {
      console.error('Error listing conversations:', error);
      res.status(500).json({ error: 'Failed to list conversations' });
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { context = 'general' } = req.body;
      
      const conversation = await this.conversationService.createConversation(projectId, context);
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      
      const conversation = await this.conversationService.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const { role, content } = req.body;
      
      if (!role || !content) {
        return res.status(400).json({ error: 'Role and content are required' });
      }
      
      if (role !== 'user' && role !== 'assistant') {
        return res.status(400).json({ error: 'Role must be either "user" or "assistant"' });
      }
      
      const message = await this.conversationService.addMessage(conversationId, {
        role,
        content
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      
      const messages = await this.conversationService.getConversationMessages(conversationId);
      
      res.json(messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
} 