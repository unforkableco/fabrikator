import { Request, Response } from 'express';
import { MaterialService } from './material.service';
import { AIService } from '../../services/ai.service';
import { prisma } from '../../prisma/prisma.service';

export class MaterialController {
  private materialService: MaterialService;
  private aiService: AIService;

  constructor() {
    this.materialService = new MaterialService();
    this.aiService = new AIService();
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
   * Récupère l'historique des versions d'un matériau
   */
  async getMaterialVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions = await this.materialService.getMaterialVersions(id);
      res.json(versions);
    } catch (error) {
      console.error('Error getting material versions:', error);
      res.status(500).json({ error: 'Failed to get material versions' });
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
   * Met à jour, approuve ou rejette un matériau
   */
  async updateMaterialStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, ...updateData } = req.body;
      
      if (!action || !['approve', 'reject', 'update'].includes(action)) {
        return res.status(400).json({ 
          error: 'Invalid action. Must be one of: approve, reject, update' 
        });
      }
      
      const result = await this.materialService.updateMaterialStatus(id, action, updateData);
      res.json(result);
    } catch (error) {
      console.error('Error updating material status:', error);
      res.status(500).json({ error: 'Failed to update material status' });
    }
  }

  /**
   * Supprime un matériau
   */
  async deleteMaterial(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.materialService.deleteMaterial(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).json({ error: 'Failed to delete material' });
    }
  }

  /**
   * Genère des suggestions de matériaux via l'IA
   */
  async generateSuggestions(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { prompt } = req.body;
      
      // Récupérer les infos du projet
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Obtenir les suggestions de l'IA
      const suggestions = await this.aiService.suggestMaterials({
        name: project.name || 'Unnamed Project',
        description: project.description || '',
        userPrompt: prompt || ''
      });
      
      if (!suggestions || !Array.isArray(suggestions.components)) {
        return res.status(500).json({ 
          error: 'Failed to generate material suggestions' 
        });
      }
      
      // Créer les matériaux suggérés
      const createdMaterials = [];
      
      for (const component of suggestions.components) {
        const materialData = {
          name: component.type,
          type: component.type,
          description: component.details?.notes || '',
          quantity: component.details?.quantity || 1,
          requirements: component.details || {},
          status: 'suggested',
          createdBy: 'AI'
        };
        
        const result = await this.materialService.createMaterial(projectId, materialData);
        createdMaterials.push(result);
      }
      
      res.status(201).json(createdMaterials);
    } catch (error) {
      console.error('Error generating material suggestions:', error);
      res.status(500).json({ error: 'Failed to generate material suggestions' });
    }
  }
}
