import { prisma } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MaterialStatus } from '../../types';

export class MaterialService {
  /**
   * List all materials of a project (returns all statuses)
   */
  async listMaterials(projectId: string) {
    try {
      const components = await prisma.component.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: true // Include all versions
        }
      });
      
      // Do not filter REJECTED anymore; return everything
      return components;
    } catch (error) {
      console.error('Error in listMaterials:', error);
      throw error;
    }
  }

  /**
   * Get the version history of a material
   */
  async getMaterialVersions(componentId: string) {
    try {
      return await prisma.compVersion.findMany({
        where: { componentId },
        orderBy: { versionNumber: 'desc' }
      });
    } catch (error) {
      console.error('Error in getMaterialVersions:', error);
      throw error;
    }
  }

  /**
   * Create a new material with its first version
   */
  async createMaterial(projectId: string, materialData: any) {
    try {
      const { 
        name, 
        type, 
        quantity, 
        description, 
        requirements, 
        productReference,
        estimatedUnitCost,
        status = MaterialStatus.SUGGESTED,
        createdBy = 'User' 
      } = materialData;

      return await prisma.$transaction(async (tx) => {
        // Create the component
        const component = await tx.component.create({
          data: { 
            projectId 
          }
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
              productReference,
              estimatedUnitCost,
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
        await tx.changeLog.create({
          data: {
            entity: 'CompVersion',
            changeType: 'create',
            author: createdBy,
            compVersionId: version.id,
            diffPayload: {
              action: 'create',
              componentId: component.id,
              versionNumber: 1
            }
          }
        });
        
        return { 
          component: await tx.component.findUnique({
            where: { id: component.id },
            include: { currentVersion: true }
          }),
          version 
        };
      });
    } catch (error) {
      console.error('Error in createMaterial:', error);
      throw error;
    }
  }

  /**
   * Get a material by its ID
   */
  async getMaterialById(id: string) {
    try {
      return await prisma.component.findUnique({
        where: { id },
        include: { 
          currentVersion: true
        }
      });
    } catch (error) {
      console.error('Error in getMaterialById:', error);
      throw error;
    }
  }

  /**
   * Approve, reject, or update a material
   */
  async updateMaterialStatus(componentId: string, action: 'approve' | 'reject' | 'update', updateData?: any) {
    try {
      const component = await prisma.component.findUnique({
        where: { id: componentId },
        include: { currentVersion: true }
      });
      
      if (!component || !component.currentVersion) {
        throw new Error('Component or current version not found');
      }
      
      // If it's an update, create a new version
      if (action === 'update' && updateData) {
        return await this.addVersion(componentId, updateData);
      }
      
      // For approve/reject, update the status in the current version
      const currentSpecs = component.currentVersion?.specs as any || {};
      const newStatus = action === 'approve' ? MaterialStatus.APPROVED : MaterialStatus.REJECTED;
      
      return await prisma.$transaction(async (tx) => {
        // Create a new version with updated status
        const nextVersionNumber = (component.currentVersion?.versionNumber || 0) + 1;
        const newSpecs = { ...currentSpecs, status: newStatus };
        
        const version = await tx.compVersion.create({
          data: {
            componentId,
            versionNumber: nextVersionNumber,
            createdBy: 'User',
            specs: newSpecs
          }
        });
        
        // Update the component to point to this version
        await tx.component.update({
          where: { id: componentId },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await tx.changeLog.create({
          data: {
            entity: 'CompVersion',
            changeType: action,
            author: 'User',
            compVersionId: version.id,
            diffPayload: {
              action,
              previousStatus: currentSpecs.status,
              newStatus
            }
          }
        });
        
        return { 
          component: await tx.component.findUnique({
            where: { id: componentId },
            include: { currentVersion: true }
          }),
          version 
        };
      });
    } catch (error) {
      console.error(`Error in updateMaterialStatus (${action}):`, error);
      throw error;
    }
  }

  /**
   * Add a new version to an existing material
   */
  private async addVersion(componentId: string, versionData: any) {
    try {
      const { 
        name, 
        type, 
        quantity, 
        description, 
        requirements, 
        productReference,
        estimatedUnitCost,
        status,
        createdBy = 'User' 
      } = versionData;
      
      const component = await prisma.component.findUnique({
        where: { id: componentId },
        include: { currentVersion: true }
      });
      
      if (!component || !component.currentVersion) {
        throw new Error('Component or current version not found');
      }
      
      return await prisma.$transaction(async (tx) => {
        // Get the next version number
        const lastVersion = await tx.compVersion.findFirst({
          where: { componentId },
          orderBy: { versionNumber: 'desc' }
        });
        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
        
        // Get current specifications to update only provided fields
        const currentSpecs = component.currentVersion?.specs as any || {};
        const newSpecs = {
          ...currentSpecs,
          name: name ?? currentSpecs.name,
          type: type ?? currentSpecs.type,
          quantity: quantity ?? currentSpecs.quantity,
          description: description ?? currentSpecs.description,
          requirements: requirements ?? currentSpecs.requirements,
          productReference: productReference ?? currentSpecs.productReference,
          estimatedUnitCost: estimatedUnitCost ?? currentSpecs.estimatedUnitCost,
          status: status ?? currentSpecs.status
        };
        
        // Create a new version
        const version = await tx.compVersion.create({
          data: {
            componentId,
            versionNumber: nextVersionNumber,
            createdBy,
            specs: newSpecs
          }
        });
        
        // Update the component to point to this version
        await tx.component.update({
          where: { id: componentId },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await tx.changeLog.create({
          data: {
            entity: 'CompVersion',
            changeType: 'update',
            author: createdBy,
            compVersionId: version.id,
            diffPayload: {
              action: 'update',
              versionNumber: nextVersionNumber,
              changedFields: Object.keys(versionData).filter(k => 
                k !== 'createdBy' && versionData[k] !== undefined
              )
            }
          }
        });
        
        return { 
          component: await tx.component.findUnique({
            where: { id: componentId },
            include: { currentVersion: true }
          }), 
          version 
        };
      });
    } catch (error) {
      console.error('Error in addVersion:', error);
      throw error;
    }
  }

  /**
   * Delete a material and all its versions
   */
  async deleteMaterial(componentId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        // First, retrieve all component versions
        const versions = await tx.compVersion.findMany({
          where: { componentId }
        });

        // Delete all ChangeLogs associated with versions
        for (const version of versions) {
          await tx.changeLog.deleteMany({
            where: { compVersionId: version.id }
          });
        }

        // Now we can delete the component (and its versions thanks to onDelete: Cascade)
        return await tx.component.delete({
          where: { id: componentId }
        });
      });
    } catch (error) {
      console.error('Error in deleteMaterial:', error);
      throw error;
    }
  }
}
