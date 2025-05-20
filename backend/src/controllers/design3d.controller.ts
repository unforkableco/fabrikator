import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { VersionService } from '../services/version.service';

export class Design3DController {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * List all 3D designs for a project
   */
  async listDesigns(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const designs = await prisma.product3D.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(designs);
    } catch (error) {
      console.error('Error listing 3D designs:', error);
      res.status(500).json({ error: 'Failed to list 3D designs' });
    }
  }

  /**
   * Create a new 3D design with first version
   */
  async createDesign(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { modelData, createdBy = 'User' } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the 3D design
        const design = await tx.product3D.create({
          data: { projectId }
        });
        
        // Create the first version
        const version = await tx.p3DVersion.create({
          data: {
            product3DId: design.id,
            versionNumber: 1,
            createdBy,
            modelData
          }
        });
        
        // Update the design to point to this version
        await tx.product3D.update({
          where: { id: design.id },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'p3d_versions',
          changeType: 'create',
          author: createdBy,
          p3dVersionId: version.id,
          diffPayload: {
            type: 'new_3d_design',
            action: 'add'
          }
        });
        
        return { design, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating 3D design:', error);
      res.status(500).json({ error: 'Failed to create 3D design' });
    }
  }

  /**
   * Add a new version to an existing 3D design
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { designId } = req.params;
      const { modelData, createdBy = 'User' } = req.body;
      
      const design = await prisma.product3D.findUnique({
        where: { id: designId }
      });
      
      if (!design) {
        return res.status(404).json({ error: '3D design not found' });
      }
      
      const result = await prisma.$transaction(async (tx) => {
        // Get the next version number
        const versionNumber = await this.versionService.getNextProduct3DVersion(designId);
        
        // Create a new version
        const version = await tx.p3DVersion.create({
          data: {
            product3DId: designId,
            versionNumber,
            createdBy,
            modelData
          }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'p3d_versions',
          changeType: 'update',
          author: createdBy,
          p3dVersionId: version.id,
          diffPayload: {
            type: 'new_design_version',
            action: 'add'
          }
        });
        
        return { design, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding 3D design version:', error);
      res.status(500).json({ error: 'Failed to add 3D design version' });
    }
  }

  /**
   * Validate or reject a 3D design version
   */
  async validateVersion(req: Request, res: Response) {
    try {
      const { designId } = req.params;
      const { versionId, action } = req.body;
      
      if (!versionId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request. versionId and action (accept/reject) are required' });
      }
      
      const design = await prisma.product3D.findUnique({
        where: { id: designId },
        include: { versions: true }
      });
      
      if (!design) {
        return res.status(404).json({ error: '3D design not found' });
      }
      
      const version = design.versions.find(v => v.id === versionId);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      
      if (action === 'accept') {
        // Update the design to use this version
        await prisma.product3D.update({
          where: { id: designId },
          data: { currentVersionId: versionId }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'p3d_versions',
          changeType: 'validate',
          author: 'User',
          p3dVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'accept',
            versionNumber: version.versionNumber
          }
        });
      } else {
        // Create a changelog entry for rejection
        await this.versionService.createChangeLog({
          entity: 'p3d_versions',
          changeType: 'validate',
          author: 'User',
          p3dVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'reject',
            versionNumber: version.versionNumber
          }
        });
      }
      
      const updatedDesign = await prisma.product3D.findUnique({
        where: { id: designId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(updatedDesign);
    } catch (error) {
      console.error('Error validating 3D design version:', error);
      res.status(500).json({ error: 'Failed to validate 3D design version' });
    }
  }
} 