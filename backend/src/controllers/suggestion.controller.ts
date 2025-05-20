import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { SuggestionService } from '../services/suggestion.service';

export class SuggestionController {
  private suggestionService: SuggestionService;

  constructor() {
    this.suggestionService = new SuggestionService();
  }

  /**
   * List all suggestions for a project
   */
  async listSuggestions(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const suggestions = await this.suggestionService.getProjectSuggestions(projectId);
      
      res.json(suggestions);
    } catch (error) {
      console.error('Error listing suggestions:', error);
      res.status(500).json({ error: 'Failed to list suggestions' });
    }
  }

  /**
   * Create a new suggestion
   */
  async createSuggestion(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { context, promptPayload, responsePayload } = req.body;
      
      const suggestion = await this.suggestionService.createSuggestion({
        projectId,
        context,
        promptPayload,
        responsePayload
      });
      
      res.status(201).json(suggestion);
    } catch (error) {
      console.error('Error creating suggestion:', error);
      res.status(500).json({ error: 'Failed to create suggestion' });
    }
  }

  /**
   * Add an item to a suggestion
   */
  async addSuggestionItem(req: Request, res: Response) {
    try {
      const { suggestionId } = req.params;
      const { itemPayload, action } = req.body;
      
      const item = await this.suggestionService.addSuggestionItem({
        suggestionId,
        itemPayload,
        action
      });
      
      res.status(201).json(item);
    } catch (error) {
      console.error('Error adding suggestion item:', error);
      res.status(500).json({ error: 'Failed to add suggestion item' });
    }
  }

  /**
   * Get a suggestion by ID
   */
  async getSuggestion(req: Request, res: Response) {
    try {
      const { suggestionId } = req.params;
      
      const suggestion = await this.suggestionService.getSuggestion(suggestionId);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      res.json(suggestion);
    } catch (error) {
      console.error('Error getting suggestion:', error);
      res.status(500).json({ error: 'Failed to get suggestion' });
    }
  }

  /**
   * Accept a suggestion
   */
  async acceptSuggestion(req: Request, res: Response) {
    try {
      const { suggestionId } = req.params;
      
      // First check if suggestion exists
      const suggestion = await this.suggestionService.getSuggestion(suggestionId);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      const result = await this.suggestionService.acceptSuggestion(suggestionId);
      
      res.json(result);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      res.status(500).json({ error: 'Failed to accept suggestion' });
    }
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(req: Request, res: Response) {
    try {
      const { suggestionId } = req.params;
      
      // First check if suggestion exists
      const suggestion = await this.suggestionService.getSuggestion(suggestionId);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      const updatedSuggestion = await this.suggestionService.updateSuggestionStatus(
        suggestionId, 
        'rejected'
      );
      
      res.json(updatedSuggestion);
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      res.status(500).json({ error: 'Failed to reject suggestion' });
    }
  }
} 