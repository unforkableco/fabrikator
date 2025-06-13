import { Request, Response } from 'express';
import { MaterialService } from './material.service';
import { AIService } from '../../services/ai.service';
import { prisma } from '../../prisma/prisma.service';
import { prompts } from '../../config/prompts';

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
      const currentMaterials = await this.materialService.listMaterials(projectId);
      
      const suggestions = await this.aiService.suggestMaterials({
        name: project.name || 'Unnamed Project',
        description: project.description || '',
        userPrompt: prompt || '',
        currentMaterials: currentMaterials
      });
      
      if (!suggestions || !Array.isArray(suggestions.components)) {
        return res.status(500).json({ 
          error: 'Failed to generate material suggestions' 
        });
      }
      
      // Traiter les suggestions selon leur action
      const processedMaterials = [];
      
      for (const component of suggestions.components) {
        const action = component.details?.action || 'new';
        
        if (action === 'new') {
          // Nouveau composant
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
          processedMaterials.push(result);
        } else if (action === 'update' || action === 'keep') {
          // Mettre à jour un composant existant (nouvelle version +1)
          const existingComponent = currentMaterials.find(m => {
            const specs = m.currentVersion?.specs as any;
            return specs?.type === component.type || specs?.name === component.type;
          });
          
          if (existingComponent) {
            const updateData = {
              name: component.type,
              type: component.type,
              description: component.details?.notes || '',
              quantity: component.details?.quantity || 1,
              requirements: component.details || {},
              status: 'suggested',
              createdBy: 'AI'
            };
            
            const result = await this.materialService.updateMaterialStatus(
              existingComponent.id, 
              'update', 
              updateData
            );
            processedMaterials.push(result);
          }
        } else if (action === 'remove') {
          // Supprimer un composant existant (changer son statut à "rejected")
          const existingComponent = currentMaterials.find(m => {
            const specs = m.currentVersion?.specs as any;
            return specs?.type === component.type || specs?.name === component.type;
          });
          
          if (existingComponent) {
            // Marquer le composant comme rejeté au lieu de le supprimer physiquement
            const result = await this.materialService.updateMaterialStatus(
              existingComponent.id, 
              'reject', 
              { 
                notes: component.details?.notes || `Composant supprimé par l'IA: ${component.type}`,
                removedBy: 'AI'
              }
            );
            processedMaterials.push(result);
          }
        }
      }
      
      res.status(201).json(processedMaterials);
    } catch (error) {
      console.error('Error generating material suggestions:', error);
      res.status(500).json({ error: 'Failed to generate material suggestions' });
    }
  }

  /**
   * Prévisualise les suggestions de matériaux sans les appliquer
   */
  async previewSuggestions(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { prompt } = req.body;
      
      console.log('Preview suggestions request:', { projectId, prompt });
      
      // Récupérer les infos du projet
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Obtenir les suggestions de l'IA sans les créer
      const currentMaterials = await this.materialService.listMaterials(projectId);
      console.log('Current materials count:', currentMaterials.length);
      
      console.log('Calling AI service with prepared prompt...');
      const suggestions = await this.aiService.suggestMaterials({
        name: project.name || 'Unnamed Project',
        description: project.description || '',
        userPrompt: prompt || '',
        currentMaterials: currentMaterials
      });
      
      console.log('AI suggestions received:', suggestions);
      
      if (!suggestions || !Array.isArray(suggestions.components)) {
        return res.status(500).json({ 
          error: 'Failed to generate material suggestions preview' 
        });
      }
      
      // Retourner les suggestions avec l'explication complète sans les appliquer
      res.json(suggestions);
    } catch (error) {
      console.error('Error previewing material suggestions:', error);
      res.status(500).json({ error: 'Failed to preview material suggestions' });
    }
  }
}
