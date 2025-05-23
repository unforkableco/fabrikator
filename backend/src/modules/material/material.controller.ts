import { Request, Response } from 'express';
import { MaterialService } from './material.service';

export class MaterialController {
  private materialService: MaterialService;

  constructor() {
    this.materialService = new MaterialService();
  }

  /**
   * Liste tous les matériaux d'un projet
   */
  async listMaterials(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const materials = await this.materialService.listMaterials(projectId);
      res.json(materials);
    } catch (error) {
      console.error('Error listing materials:', error);
      res.status(500).json({ error: 'Failed to list materials' });
    }
  }

  /**
   * Crée un nouveau matériau avec sa première version
   */
  async createMaterial(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const materialData = req.body;
      const result = await this.materialService.createMaterial(projectId, materialData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating material:', error);
      res.status(500).json({ error: 'Failed to create material' });
    }
  }

  /**
   * Récupère un matériau par son ID
   */
  async getMaterialById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const material = await this.materialService.getMaterialById(id);
      
      if (!material) {
        return res.status(404).json({ error: 'Material not found' });
      }
      
      res.json(material);
    } catch (error) {
      console.error('Error getting material:', error);
      res.status(500).json({ error: 'Failed to get material' });
    }
  }

  /**
   * Ajoute une nouvelle version à un matériau existant
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versionData = req.body;
      const result = await this.materialService.addVersion(id, versionData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding material version:', error);
      res.status(500).json({ error: 'Failed to add material version' });
    }
  }

  /**
   * Valide ou rejette une version d'un matériau
   */
  async validateVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { versionId, action } = req.body;
      
      if (!versionId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request. versionId and action (accept/reject) are required' });
      }
      
      const result = await this.materialService.validateVersion(id, versionId, action);
      res.json(result);
    } catch (error) {
      console.error('Error validating material version:', error);
      res.status(500).json({ error: 'Failed to validate material version' });
    }
  }

  /**
   * Récupère les liens d'achat pour un matériau
   */
  async getPurchaseLinks(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const purchaseInfo = await this.materialService.getPurchaseLinks(id);
      
      if (!purchaseInfo) {
        return res.status(404).json({ error: 'Material or version not found' });
      }
      
      res.json(purchaseInfo);
    } catch (error) {
      console.error('Error fetching purchase links:', error);
      res.status(500).json({ error: 'Failed to fetch purchase links' });
    }
  }
}
