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
      
      // Transform components to materials (legacy structure)
      const materials = components.map(component => {
        const specs = component.currentVersion?.specs as any || {};
        return {
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
      });
      
      res.json(materials);
    } catch (error) {
      console.error('Error listing materials:', error);
      res.status(500).json({ error: 'Failed to list materials' });
    }
  }

  /**
   * Get the version history of a material
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
   * Create a new material with its first version
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
   * Get a material by its ID
   */
  async getMaterialById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const component = await this.materialService.getMaterialById(id);
      
      if (!component) {
        return res.status(404).json({ error: 'Material not found' });
      }
      
      // Transform component to material (legacy)
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
   * Update, approve or reject a material
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

      // Get component BEFORE update for impact analysis
      const componentBeforeUpdate = await this.materialService.getMaterialById(id);
      const previousSpecs = componentBeforeUpdate?.currentVersion?.specs || {};
      
      const result = await this.materialService.updateMaterialStatus(id, action, updateData);
      
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
        
        const responseWithAction: any = {
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

        // If update, run impact review via AI and attach suggestions
        if (action === 'update') {
          try {
            const project = await prisma.project.findUnique({ where: { id: result.component.projectId } });
            const currentMaterials = await this.materialService.listMaterials(result.component.projectId);
            
            console.log('Impact analysis - Previous specs:', JSON.stringify(previousSpecs, null, 2));
            console.log('Impact analysis - Updated specs:', JSON.stringify(specs, null, 2));
            
            const impact = await this.aiService.reviewMaterialImpact({
              project: project || { name: '', description: '' },
              updatedComponent: {
                id: result.component.id,
                specs: transformedMaterial,
                previous: previousSpecs
              },
              currentMaterials
            });

            console.log('Impact analysis result:', JSON.stringify(impact, null, 2));

            // Normalize impact: prefer details.specs over details.technicalSpecs
            if (impact && Array.isArray(impact.components)) {
              impact.components = impact.components.map((c: any) => {
                if (c?.details) {
                  const specs = c.details.specs || c.details.technicalSpecs || {};
                  return { ...c, details: { ...c.details, specs } };
                }
                return c;
              });
            }

            (responseWithAction as any)['impactSuggestions'] = impact;
          } catch (impactError) {
            console.warn('Impact review failed:', impactError);
          }
        }
        
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
   * Delete a material
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
      
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const currentMaterials = await this.materialService.listMaterials(projectId);
      const suggestions = await this.aiService.suggestMaterials({
        name: project.name || 'Unnamed Project',
        description: project.description || '',
        userPrompt: prompt || '',
        currentMaterials
      });
      
      if (!suggestions || !Array.isArray(suggestions.components)) {
        return res.status(500).json({ error: 'Failed to generate material suggestions' });
      }
      
      const processedMaterials: any[] = [];
      for (const component of suggestions.components) {
        const action = component.details?.action || 'new';
        if (action === 'new') {
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
          processedMaterials.push({ ...result, action: 'add', actionDetails: { type: 'add', description: `New component added: ${component.type}`, component: component.type } });
        } else if (action === 'update' || action === 'keep') {
          const existingComponent = currentMaterials.find(m => {
            const specs = (m.currentVersion?.specs as any);
            return (specs?.type === component.type) || (specs?.name === component.type);
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
            const result = await this.materialService.updateMaterialStatus(existingComponent.id, 'update', updateData);
            processedMaterials.push({ ...result, action: 'modified', actionDetails: { type: 'modified', description: `Component modified: ${component.type}`, component: component.type, previousVersion: existingComponent.currentVersion?.versionNumber || 1 } });
          }
        } else if (action === 'remove') {
          const existingComponent = currentMaterials.find(m => {
            const specs = (m.currentVersion?.specs as any);
            return (specs?.type === component.type) || (specs?.name === component.type);
          });
          if (existingComponent) {
            const result = await this.materialService.updateMaterialStatus(existingComponent.id, 'reject', { notes: component.details?.notes || `Component removed by AI: ${component.type}`, removedBy: 'AI' });
            processedMaterials.push({ ...result, action: 'remove', actionDetails: { type: 'remove', description: `Component removed: ${component.type}`, component: component.type, reason: component.details?.notes || 'Component not necessary' } });
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
   * Preview material suggestions without applying them
   */
  async previewSuggestions(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { prompt, language } = req.body;
      
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const currentMaterials = await this.materialService.listMaterials(projectId);

      // Retrieve recent chat history for materials context
      const history = await prisma.message.findMany({
        where: { projectId, context: 'materials' },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      const chatHistory = history.map((m: any): { role: 'user' | 'assistant'; content: string } => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: String(m.content || ''),
      }));

      const suggestions = await this.aiService.suggestMaterials({
        name: project.name || 'Unnamed Project',
        description: project.description || '',
        userPrompt: prompt || '',
        currentMaterials,
        language,
        chatHistory
      });
      
      if (!suggestions || !Array.isArray(suggestions.components)) {
        return res.status(500).json({ error: 'Failed to generate material suggestions preview' });
      }
      
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
      
      if (!suggestion) return res.status(400).json({ error: 'Invalid suggestion data' });
      
      const action = suggestion.action || 'new';
      const currentMaterials = await this.materialService.listMaterials(projectId);
      
      if (action === 'new') {
        const baseSpecs = suggestion.details?.specs || suggestion.details?.technicalSpecs || {};
        const materialData = {
          name: suggestion.type || suggestion.title,
          type: suggestion.type || suggestion.title,
          description: suggestion.details?.notes || suggestion.description || '',
          quantity: suggestion.details?.quantity || 1,
          requirements: baseSpecs,
          productReference: suggestion.details?.productReference || null,
          status: 'suggested',
          createdBy: 'AI'
        };
        const result = await this.materialService.createMaterial(projectId, materialData);
        const specs = (result.component?.currentVersion?.specs as any) || {};
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
          actionDetails: { type: 'add', description: `New component added: ${materialData.type}`, component: materialData.type }
        };
        return res.status(201).json(transformedMaterial);
      } else if (action === 'update') {
        const existingComponent = currentMaterials.find(m => {
          const specs = (m.currentVersion?.specs as any);
          return (specs?.type === suggestion.type) || (specs?.name === suggestion.type);
        });
        if (!existingComponent) return res.status(404).json({ error: 'Material to update not found' });

        const currentSpecs = (existingComponent.currentVersion?.specs as any) || {};
        const currentReqs = currentSpecs.requirements || {};
        const patch = suggestion.details?.specsPatch;
        const incomingSpecs = suggestion.details?.specs || suggestion.details?.technicalSpecs || {};

        let mergedRequirements = { ...currentReqs };
        if (patch && (patch.set || patch.remove)) {
          const deletePathsFromSet: string[] = [];
          const collectDeletePaths = (obj: any, basePath: string[] = []) => {
            Object.entries(obj).forEach(([k, v]) => {
              const path = [...basePath, k];
              if (v && typeof v === 'object' && !Array.isArray(v)) {
                collectDeletePaths(v, path);
              } else if (v === null || v === '__DELETE__') {
                deletePathsFromSet.push(path.join('.'));
              }
            });
          };
          const deepMerge = (target: any, src: any) => {
            Object.entries(src).forEach(([k, v]) => {
              if (v === null || v === '__DELETE__') return;
              if (v && typeof v === 'object' && !Array.isArray(v)) {
                target[k] = deepMerge(target[k] || {}, v);
              } else {
                target[k] = v;
              }
            });
            return target;
          };
          if (patch.set && typeof patch.set === 'object') {
            collectDeletePaths(patch.set);
            mergedRequirements = deepMerge({ ...mergedRequirements }, patch.set);
          }
          const deleteByPath = (obj: any, path: string) => {
            const parts = path.split('.');
            const last = parts.pop();
            let ref = obj;
            for (const p of parts) {
              if (ref == null) return;
              const idx = Number.isInteger(+p) ? parseInt(p, 10) : NaN;
              if (!isNaN(idx) && Array.isArray(ref)) {
                ref = ref[idx];
              } else {
                ref = ref[p];
              }
            }
            if (last == null || ref == null) return;
            const idx = Number.isInteger(+last) ? parseInt(last, 10) : NaN;
            if (!isNaN(idx) && Array.isArray(ref)) {
              ref.splice(idx, 1);
            } else {
              delete ref[last];
            }
          };
          const toRemove: string[] = [];
          if (Array.isArray(patch.remove)) toRemove.push(...patch.remove);
          toRemove.push(...deletePathsFromSet);
          toRemove.forEach((p: string) => deleteByPath(mergedRequirements, p));
          const pruneEmpty = (obj: any) => {
            if (obj && typeof obj === 'object') {
              Object.keys(obj).forEach((k) => {
                const v = obj[k];
                if (v && typeof v === 'object') {
                  pruneEmpty(v);
                  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) delete obj[k];
                  if (Array.isArray(v) && v.length === 0) delete obj[k];
                } else if (v === undefined) {
                  delete obj[k];
                }
              });
            }
          };
          pruneEmpty(mergedRequirements as any);
        } else {
          mergedRequirements = { ...mergedRequirements, ...incomingSpecs };
        }
        
        const updateData = {
          name: suggestion.type || suggestion.title,
          type: suggestion.type || suggestion.title,
          description: suggestion.details?.notes || suggestion.description || '',
          quantity: suggestion.details?.quantity || 1,
          requirements: mergedRequirements,
          productReference: suggestion.details?.productReference || null,
          status: 'suggested',
          createdBy: 'AI'
        };
        const result = await this.materialService.updateMaterialStatus(existingComponent.id, 'update', updateData);
        const specs = (result.component?.currentVersion?.specs as any) || {};
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
          actionDetails: { type: 'modified', description: `Component updated: ${suggestion.type}`, component: suggestion.type }
        };
        return res.status(200).json(transformedMaterial);
      } else if (action === 'remove') {
        const existingComponent = currentMaterials.find(m => {
          const specs = (m.currentVersion?.specs as any);
          return (specs?.type === suggestion.type) || (specs?.name === suggestion.type);
        });
        if (!existingComponent) return res.status(404).json({ error: 'Material to remove not found' });
        await this.materialService.deleteMaterial(existingComponent.id);
        return res.status(200).json({
          action: 'removed',
          actionDetails: { type: 'removed', description: `Component removed: ${suggestion.type}`, component: suggestion.type, reason: suggestion.details?.notes || 'Component removed as requested' },
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

  /**
   * Suggest purchase references for an approved component (no persistence)
   */
  async suggestPurchaseReferences(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const component = await this.materialService.getMaterialById(id);
      if (!component) return res.status(404).json({ error: 'Material not found' });

      // Optional: only for APPROVED
      const specs = component.currentVersion?.specs as any || {};
      if (specs.status !== 'approved') {
        return res.status(400).json({ error: 'Material must be approved before suggesting references' });
      }

      // Load the project with all materials for full context
      const project = await prisma.project.findUnique({ 
        where: { id: component.projectId },
        include: { components: { include: { currentVersion: true } } }
      });
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const refs = await this.aiService.suggestProductReferences({ project, component });
      res.json({ references: refs });
    } catch (error) {
      console.error('Error suggesting purchase references:', error);
      res.status(500).json({ error: 'Failed to suggest purchase references' });
    }
  }
}
