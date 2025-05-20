import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { VersionService } from '../services/version.service';

export class WiringController {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * List all wiring schemas for a project
   */
  async listWirings(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const wirings = await prisma.wiringSchema.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(wirings);
    } catch (error) {
      console.error('Error listing wiring schemas:', error);
      res.status(500).json({ error: 'Failed to list wiring schemas' });
    }
  }

  /**
   * Create a new wiring schema with first version
   */
  async createWiring(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { wiringData, createdBy = 'User' } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the wiring schema
        const wiring = await tx.wiringSchema.create({
          data: { projectId }
        });
        
        // Create the first version
        const version = await tx.wireVersion.create({
          data: {
            wiringSchemaId: wiring.id,
            versionNumber: 1,
            createdBy,
            wiringData
          }
        });
        
        // Update the wiring schema to point to this version
        await tx.wiringSchema.update({
          where: { id: wiring.id },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'wire_versions',
          changeType: 'create',
          author: createdBy,
          wireVersionId: version.id,
          diffPayload: {
            type: 'new_wiring_schema',
            action: 'add'
          }
        });
        
        return { wiring, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating wiring schema:', error);
      res.status(500).json({ error: 'Failed to create wiring schema' });
    }
  }

  /**
   * Add a new version to an existing wiring schema
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { wiringId } = req.params;
      const { wiringData, createdBy = 'User' } = req.body;
      
      const wiring = await prisma.wiringSchema.findUnique({
        where: { id: wiringId }
      });
      
      if (!wiring) {
        return res.status(404).json({ error: 'Wiring schema not found' });
      }
      
      const result = await prisma.$transaction(async (tx) => {
        // Get the next version number
        const versionNumber = await this.versionService.getNextWiringVersion(wiringId);
        
        // Create a new version
        const version = await tx.wireVersion.create({
          data: {
            wiringSchemaId: wiringId,
            versionNumber,
            createdBy,
            wiringData
          }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'wire_versions',
          changeType: 'update',
          author: createdBy,
          wireVersionId: version.id,
          diffPayload: {
            type: 'new_wiring_version',
            action: 'add'
          }
        });
        
        return { wiring, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding wiring schema version:', error);
      res.status(500).json({ error: 'Failed to add wiring schema version' });
    }
  }

  /**
   * Validate or reject a wiring schema version
   */
  async validateVersion(req: Request, res: Response) {
    try {
      const { wiringId } = req.params;
      const { versionId, action } = req.body;
      
      if (!versionId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request. versionId and action (accept/reject) are required' });
      }
      
      const wiring = await prisma.wiringSchema.findUnique({
        where: { id: wiringId },
        include: { versions: true }
      });
      
      if (!wiring) {
        return res.status(404).json({ error: 'Wiring schema not found' });
      }
      
      const version = wiring.versions.find(v => v.id === versionId);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      
      if (action === 'accept') {
        // Update the wiring schema to use this version
        await prisma.wiringSchema.update({
          where: { id: wiringId },
          data: { currentVersionId: versionId }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'wire_versions',
          changeType: 'validate',
          author: 'User',
          wireVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'accept',
            versionNumber: version.versionNumber
          }
        });
      } else {
        // Create a changelog entry for rejection
        await this.versionService.createChangeLog({
          entity: 'wire_versions',
          changeType: 'validate',
          author: 'User',
          wireVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'reject',
            versionNumber: version.versionNumber
          }
        });
      }
      
      const updatedWiring = await prisma.wiringSchema.findUnique({
        where: { id: wiringId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(updatedWiring);
    } catch (error) {
      console.error('Error validating wiring schema version:', error);
      res.status(500).json({ error: 'Failed to validate wiring schema version' });
    }
  }
} 