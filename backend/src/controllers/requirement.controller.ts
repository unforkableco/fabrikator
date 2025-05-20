import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { VersionService } from '../services/version.service';

export class RequirementController {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * List all requirements for a project
   */
  async listRequirements(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const requirements = await prisma.requirement.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(requirements);
    } catch (error) {
      console.error('Error listing requirements:', error);
      res.status(500).json({ error: 'Failed to list requirements' });
    }
  }

  /**
   * Create a new requirement with first version
   */
  async createRequirement(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { details, createdBy = 'User' } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the requirement
        const requirement = await tx.requirement.create({
          data: { projectId }
        });
        
        // Create the first version
        const version = await tx.reqVersion.create({
          data: {
            requirementId: requirement.id,
            versionNumber: 1,
            createdBy,
            details: details as any
          }
        });
        
        // Update the requirement to point to this version
        await tx.requirement.update({
          where: { id: requirement.id },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'req_version',
          changeType: 'create',
          author: createdBy,
          reqVersionId: version.id,
          diffPayload: {
            type: 'new_requirement',
            action: 'add'
          }
        });
        
        return { requirement, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating requirement:', error);
      res.status(500).json({ error: 'Failed to create requirement' });
    }
  }

  /**
   * Add a new version to an existing requirement
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { requirementId } = req.params;
      const { details, createdBy = 'User' } = req.body;
      
      const requirement = await prisma.requirement.findUnique({
        where: { id: requirementId }
      });
      
      if (!requirement) {
        return res.status(404).json({ error: 'Requirement not found' });
      }
      
      const result = await prisma.$transaction(async (tx) => {
        // Get the next version number
        const versionNumber = await this.versionService.getNextRequirementVersion(requirementId);
        
        // Create a new version
        const version = await tx.reqVersion.create({
          data: {
            requirementId,
            versionNumber,
            createdBy,
            details: details as any
          }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'req_version',
          changeType: 'update',
          author: createdBy,
          reqVersionId: version.id,
          diffPayload: {
            type: 'new_version',
            action: 'add'
          }
        });
        
        return { requirement, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding requirement version:', error);
      res.status(500).json({ error: 'Failed to add requirement version' });
    }
  }

  /**
   * Validate or reject a requirement version
   */
  async validateVersion(req: Request, res: Response) {
    try {
      const { requirementId } = req.params;
      const { versionId, action } = req.body;
      
      if (!versionId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request. versionId and action (accept/reject) are required' });
      }
      
      const requirement = await prisma.requirement.findUnique({
        where: { id: requirementId },
        include: { versions: true }
      });
      
      if (!requirement) {
        return res.status(404).json({ error: 'Requirement not found' });
      }
      
      const version = requirement.versions.find(v => v.id === versionId);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      
      if (action === 'accept') {
        // Update the requirement to use this version
        await prisma.requirement.update({
          where: { id: requirementId },
          data: { currentVersionId: versionId }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'req_version',
          changeType: 'validate',
          author: 'User',
          reqVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'accept',
            versionNumber: version.versionNumber
          }
        });
      } else {
        // Create a changelog entry for rejection
        await this.versionService.createChangeLog({
          entity: 'req_version',
          changeType: 'validate',
          author: 'User',
          reqVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'reject',
            versionNumber: version.versionNumber
          }
        });
      }
      
      const updatedRequirement = await prisma.requirement.findUnique({
        where: { id: requirementId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(updatedRequirement);
    } catch (error) {
      console.error('Error validating requirement version:', error);
      res.status(500).json({ error: 'Failed to validate requirement version' });
    }
  }
} 