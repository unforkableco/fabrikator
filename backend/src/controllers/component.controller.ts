import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { VersionService } from '../services/version.service';
import { MaterialStatus } from '../types';

export class ComponentController {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * List all components for a project
   */
  async listComponents(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const components = await prisma.component.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(components);
    } catch (error) {
      console.error('Error listing components:', error);
      res.status(500).json({ error: 'Failed to list components' });
    }
  }

  /**
   * Create a new component with first version
   */
  async createComponent(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { 
        name, 
        type, 
        quantity, 
        description, 
        requirements, 
        status = MaterialStatus.SUGGESTED,
        createdBy = 'User' 
      } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the component
        const component = await tx.component.create({
          data: { projectId }
        });
        
        // Create the first version
        const version = await tx.compVersion.create({
          data: {
            componentId: component.id,
            versionNumber: 1,
            createdBy,
            specs: {
              name,
              type,
              quantity,
              description,
              requirements,
              status
            }
          }
        });
        
        // Update the component to point to this version
        await tx.component.update({
          where: { id: component.id },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'comp_version',
          changeType: 'create',
          author: createdBy,
          compVersionId: version.id,
          diffPayload: {
            type: 'new_component',
            name,
            action: 'add'
          }
        });
        
        return { component, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating component:', error);
      res.status(500).json({ error: 'Failed to create component' });
    }
  }

  /**
   * Add a new version to an existing component
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { componentId } = req.params;
      const { 
        name, 
        type, 
        quantity, 
        description, 
        requirements, 
        status,
        createdBy = 'User' 
      } = req.body;
      
      const component = await prisma.component.findUnique({
        where: { id: componentId },
        include: { currentVersion: true }
      });
      
      if (!component || !component.currentVersion) {
        return res.status(404).json({ error: 'Component or current version not found' });
      }
      
      const result = await prisma.$transaction(async (tx) => {
        // Get the next version number
        const versionNumber = await this.versionService.getNextComponentVersion(componentId);
        
        // Get current specs to update only the provided fields
        const currentSpecs = component.currentVersion?.specs as any || {};
        const newSpecs = {
          ...currentSpecs,
          name: name ?? currentSpecs.name,
          type: type ?? currentSpecs.type,
          quantity: quantity ?? currentSpecs.quantity,
          description: description ?? currentSpecs.description,
          requirements: requirements ?? currentSpecs.requirements,
          status: status ?? currentSpecs.status
        };
        
        // Create a new version
        const version = await tx.compVersion.create({
          data: {
            componentId,
            versionNumber,
            createdBy,
            specs: newSpecs
          }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'comp_version',
          changeType: 'update',
          author: createdBy,
          compVersionId: version.id,
          diffPayload: {
            type: 'component_update',
            name: newSpecs.name,
            changes: { name, type, quantity, description, requirements, status },
            action: 'update'
          }
        });
        
        return { component, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding component version:', error);
      res.status(500).json({ error: 'Failed to add component version' });
    }
  }

  /**
   * Validate or reject a component version
   */
  async validateVersion(req: Request, res: Response) {
    try {
      const { componentId } = req.params;
      const { versionId, action } = req.body;
      
      if (!versionId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request. versionId and action (accept/reject) are required' });
      }
      
      const component = await prisma.component.findUnique({
        where: { id: componentId },
        include: { versions: true }
      });
      
      if (!component) {
        return res.status(404).json({ error: 'Component not found' });
      }
      
      const version = component.versions.find(v => v.id === versionId);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      
      if (action === 'accept') {
        // Update the component to use this version
        await prisma.component.update({
          where: { id: componentId },
          data: { currentVersionId: versionId }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'comp_version',
          changeType: 'validate',
          author: 'User',
          compVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'accept',
            versionNumber: version.versionNumber
          }
        });
      } else {
        // Create a changelog entry for rejection
        await this.versionService.createChangeLog({
          entity: 'comp_version',
          changeType: 'validate',
          author: 'User',
          compVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'reject',
            versionNumber: version.versionNumber
          }
        });
      }
      
      const updatedComponent = await prisma.component.findUnique({
        where: { id: componentId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(updatedComponent);
    } catch (error) {
      console.error('Error validating component version:', error);
      res.status(500).json({ error: 'Failed to validate component version' });
    }
  }
} 