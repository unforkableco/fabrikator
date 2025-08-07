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
    this.aiService = AIService.getInstance();
  }

  /**
   * List all materials for a project
   */
  async listMaterials(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const components = await this.materialService.listMaterials(projectId);
      
      // Transform components to materials 
      const materials = components.map(component => {
        const specs = component.currentVersion?.specs as any || {};
        return {
          ...component,
          name: specs.name,
          type: specs.type,
          quantity: specs.quantity,
          description: specs.description,
          status: specs.status,
          requirements: specs.requirements || {}, // Now contains only technical specifications
          productReference: specs.productReference || null,
          aiSuggested: specs.createdBy === 'AI'
        };
      });
      
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
      const component = await this.materialService.getMaterialById(id);
      
      if (!component) {
        return res.status(404).json({ error: 'Material not found' });
      }
      
      // Transformer le composant en matériau avec spécifications techniques filtrées
      const specs = component.currentVersion?.specs as any || {};
      const material = {
        ...component,
        name: specs.name,
        type: specs.type,
        quantity: specs.quantity,
        description: specs.description,
        status: specs.status,
        requirements: specs.requirements || {},
        productReference: specs.productReference || null,
        aiSuggested: specs.createdBy === 'AI'
      };
      
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
      
      // Transformer le résultat pour filtrer les spécifications techniques
      if (result.component) {
        const specs = result.component.currentVersion?.specs as any || {};
        const transformedMaterial = {
          ...result.component,
          name: specs.name,
          type: specs.type,
          quantity: specs.quantity,
          description: specs.description,
          status: specs.status,
          requirements: specs.requirements || {},
          productReference: specs.productReference || null,
          aiSuggested: specs.createdBy === 'AI'
        };
        
        // Ajouter l'information d'action
        const responseWithAction = {
          ...result,
          component: transformedMaterial,
          action: action === 'update' ? 'modified' : action === 'reject' ? 'remove' : action,
          actionDetails: {
            type: action === 'update' ? 'modified' : action === 'reject' ? 'remove' : action,
            description: action === 'update' ? `Component modified: ${specs.type}` :
                        action === 'reject' ? `Component removed: ${specs.type}` :
                        action === 'approve' ? `Component approved: ${specs.type}` : 
                        `Action ${action} sur: ${specs.type}`,
            component: specs.type,
            previousVersion: action === 'update' ? (result.version?.versionNumber || 1) - 1 : undefined
          }
        };
        
        res.json(responseWithAction);
      } else {
        res.json(result);
      }
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
   * Generate material suggestions via AI
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
          console.log('AI Component structure:', JSON.stringify(component, null, 2));
          
          const materialData = {
            name: component.type,
            type: component.type,
            description: component.details?.notes || component.notes || '',
            quantity: component.details?.quantity || 1,
            requirements: component.details?.technicalSpecs || {},
            productReference: component.details?.productReference || null,
            status: 'suggested',
            createdBy: 'AI'
          };
          
          const result = await this.materialService.createMaterial(projectId, materialData);
          processedMaterials.push({
            ...result,
            action: 'add',
            actionDetails: {
              type: 'add',
              description: `New component added: ${component.type}`,
              component: component.type
            }
          });
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
              requirements: component.details?.technicalSpecs || {},
              productReference: component.details?.productReference || null,
              status: 'suggested',
              createdBy: 'AI'
            };
            
            const result = await this.materialService.updateMaterialStatus(
              existingComponent.id, 
              'update', 
              updateData
            );
            processedMaterials.push({
              ...result,
              action: 'modified',
              actionDetails: {
                type: 'modified',
                description: `Component modified: ${component.type}`,
                component: component.type,
                previousVersion: existingComponent.currentVersion?.versionNumber || 1
              }
            });
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
                notes: component.details?.notes || `Component removed by AI: ${component.type}`,
                removedBy: 'AI'
              }
            );
            processedMaterials.push({
              ...result,
              action: 'remove',
              actionDetails: {
                type: 'remove',
                description: `Component removed: ${component.type}`,
                component: component.type,
                reason: component.details?.notes || 'Component not necessary'
              }
            });
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

  /**
   * Process a material suggestion (add, update, or remove)
   */
  async addMaterialFromSuggestion(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { suggestion } = req.body;
      
      console.log('Processing material suggestion:', { projectId, suggestion });
      
      if (!suggestion) {
        return res.status(400).json({ error: 'Invalid suggestion data' });
      }
      
      const action = suggestion.action || 'new';
      
      // Get current materials to find existing ones
      const currentMaterials = await this.materialService.listMaterials(projectId);
      
      if (action === 'new') {
        // Create new material
        const materialData = {
          name: suggestion.type || suggestion.title,
          type: suggestion.type || suggestion.title,
          description: suggestion.details?.notes || suggestion.description || '',
          quantity: suggestion.details?.quantity || 1,
          requirements: suggestion.details?.technicalSpecs || {},
          productReference: suggestion.details?.productReference || null,
          status: 'suggested',
          createdBy: 'AI'
        };
        
        console.log('Creating new material with data:', materialData);
        
        const result = await this.materialService.createMaterial(projectId, materialData);
        
        // Transform result for frontend
        const specs = result.component?.currentVersion?.specs as any || {};
        const transformedMaterial = {
          ...result.component,
          name: specs.name,
          type: specs.type,
          quantity: specs.quantity,
          description: specs.description,
          status: specs.status,
          requirements: specs.requirements || {},
          productReference: specs.productReference || null,
          aiSuggested: specs.createdBy === 'AI',
          action: 'add',
          actionDetails: {
            type: 'add',
            description: `New component added: ${materialData.type}`,
            component: materialData.type
          }
        };
        
        return res.status(201).json(transformedMaterial);
        
      } else if (action === 'update') {
        // Update existing material
        const existingComponent = currentMaterials.find(m => {
          const specs = m.currentVersion?.specs as any;
          return specs?.type === suggestion.type || specs?.name === suggestion.type;
        });
        
        if (!existingComponent) {
          return res.status(404).json({ error: 'Material to update not found' });
        }
        
        const updateData = {
          name: suggestion.type || suggestion.title,
          type: suggestion.type || suggestion.title,
          description: suggestion.details?.notes || suggestion.description || '',
          quantity: suggestion.details?.quantity || 1,
          requirements: suggestion.details?.technicalSpecs || {},
          productReference: suggestion.details?.productReference || null,
          status: 'suggested',
          createdBy: 'AI'
        };
        
        console.log('Updating material:', existingComponent.id, updateData);
        
        const result = await this.materialService.updateMaterialStatus(
          existingComponent.id, 
          'update', 
          updateData
        );
        
        // Transform result for frontend
        const specs = result.component?.currentVersion?.specs as any || {};
        const transformedMaterial = {
          ...result.component,
          name: specs.name,
          type: specs.type,
          quantity: specs.quantity,
          description: specs.description,
          status: specs.status,
          requirements: specs.requirements || {},
          productReference: specs.productReference || null,
          aiSuggested: specs.createdBy === 'AI',
          action: 'modified',
          actionDetails: {
            type: 'modified',
            description: `Component updated: ${suggestion.type}`,
            component: suggestion.type
          }
        };
        
        return res.status(200).json(transformedMaterial);
        
      } else if (action === 'remove') {
        // Remove existing material by deleting it completely
        const existingComponent = currentMaterials.find(m => {
          const specs = m.currentVersion?.specs as any;
          return specs?.type === suggestion.type || specs?.name === suggestion.type;
        });
        
        if (!existingComponent) {
          return res.status(404).json({ error: 'Material to remove not found' });
        }
        
        console.log('Deleting material:', existingComponent.id);
        
        // Delete the material completely
        await this.materialService.deleteMaterial(existingComponent.id);
        
        return res.status(200).json({
          action: 'removed',
          actionDetails: {
            type: 'removed',
            description: `Component removed: ${suggestion.type}`,
            component: suggestion.type,
            reason: suggestion.details?.notes || 'Component removed as requested'
          },
          materialId: existingComponent.id
        });
        
      } else {
        return res.status(400).json({ error: `Unsupported action: ${action}` });
      }
      
    } catch (error) {
      console.error('Error processing material suggestion:', error);
      res.status(500).json({ error: 'Failed to process material suggestion' });
    }
  }
}
