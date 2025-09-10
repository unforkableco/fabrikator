import { Request, Response } from 'express';
import { WiringService } from './wiring.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WiringController {
  private wiringService: WiringService;

  constructor() {
    this.wiringService = new WiringService();
  }

  /**
   * Get wiring plan for a project
   */
  async getWiringForProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const wiring = await this.wiringService.getWiringForProject(projectId);
      res.json(wiring);
    } catch (error) {
      console.error('Error getting wiring for project:', error);
      res.status(500).json({ error: 'Failed to get wiring plan' });
    }
  }

  /**
   * Create a new wiring plan for a project
   */
  async createWiring(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const wiringData = req.body;
      const wiring = await this.wiringService.createWiring(projectId, wiringData);
      res.status(201).json(wiring);
    } catch (error) {
      console.error('Error creating wiring plan:', error);
      res.status(500).json({ error: 'Failed to create wiring plan' });
    }
  }

  /**
   * Get a wiring plan by its ID
   */
  async getWiringById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const wiring = await this.wiringService.getWiringById(id);
      
      if (!wiring) {
        return res.status(404).json({ error: 'Wiring plan not found' });
      }
      
      res.json(wiring);
    } catch (error) {
      console.error('Error getting wiring plan:', error);
      res.status(500).json({ error: 'Failed to get wiring plan' });
    }
  }

  /**
   * Add a new version to an existing wiring plan
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versionData = req.body;
      const result = await this.wiringService.addVersion(id, versionData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding wiring version:', error);
      res.status(500).json({ error: 'Failed to add wiring version' });
    }
  }

  /**
   * Get versions of a wiring plan
   */
  async getWiringVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions = await this.wiringService.getWiringVersions(id);
      
      if (!versions) {
        return res.status(404).json({ error: 'Wiring plan not found' });
      }
      
      res.json(versions);
    } catch (error) {
      console.error('Error getting wiring versions:', error);
      res.status(500).json({ error: 'Failed to get wiring versions' });
    }
  }

  /**
   * Generate wiring suggestions with AI
   */
  async generateWiringSuggestions(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { prompt, currentDiagram, language } = req.body;
      
      // Retrieve recent chat history for wiring context
      const history = await prisma.message.findMany({
        where: { projectId, context: 'wiring' },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      const chatHistory = history.map((m: any): { role: 'user' | 'assistant'; content: string } => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: String(m.content || ''),
      }));

      const suggestions = await this.wiringService.generateWiringSuggestions(projectId, prompt, currentDiagram, language, chatHistory);
      res.json(suggestions);
    } catch (error) {
      console.error('Error generating wiring suggestions:', error);
      res.status(500).json({ error: 'Failed to generate wiring suggestions' });
    }
  }

  /**
   * Validate a wiring diagram
   */
  async validateWiring(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { diagram } = req.body;
      
      const validationResult = await this.wiringService.validateWiring(projectId, diagram);
      res.json(validationResult);
    } catch (error) {
      console.error('Error validating wiring:', error);
      res.status(500).json({ error: 'Failed to validate wiring' });
    }
  }
}
