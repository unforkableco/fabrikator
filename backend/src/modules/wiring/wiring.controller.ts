import { Request, Response } from 'express';
import { WiringService } from './wiring.service';

export class WiringController {
  private wiringService: WiringService;

  constructor() {
    this.wiringService = new WiringService();
  }

  /**
   * Récupère le plan de câblage pour un projet
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
   * Crée un nouveau plan de câblage pour un projet
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
   * Récupère un plan de câblage par son ID
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
   * Ajoute une nouvelle version à un plan de câblage existant
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
   * Récupère les versions d'un plan de câblage
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
}
