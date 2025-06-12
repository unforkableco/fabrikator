import { prisma } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MaterialStatus } from '../../types';

export class MaterialService {
  /**
   * Liste tous les matériaux d'un projet
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
      return components;
    } catch (error) {
      console.error('Error in listMaterials:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des versions d'un matériau
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
   * Crée un nouveau matériau avec sa première version
   */
  async createMaterial(projectId: string, materialData: any) {
    try {
      const { 
        name, 
        type, 
        quantity, 
        description, 
        requirements, 
        status = MaterialStatus.SUGGESTED,
        createdBy = 'User' 
      } = materialData;

      return await prisma.$transaction(async (tx) => {
        // Créer le composant
        const component = await tx.component.create({
          data: { 
            projectId 
          }
        });
        
        // Créer la première version
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
        
        // Mettre à jour le composant pour pointer vers cette version
        await tx.component.update({
          where: { id: component.id },
          data: { currentVersionId: version.id }
        });
        
        // Créer une entrée de changelog
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
   * Récupère un matériau par son ID
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
   * Approuve, rejette ou met à jour un matériau
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
      
      // Si c'est une mise à jour, créer une nouvelle version
      if (action === 'update' && updateData) {
        return await this.addVersion(componentId, updateData);
      }
      
      // Pour approve/reject, on met à jour le statut dans la version actuelle
      const currentSpecs = component.currentVersion?.specs as any || {};
      const newStatus = action === 'approve' ? MaterialStatus.APPROVED : MaterialStatus.REJECTED;
      
      return await prisma.$transaction(async (tx) => {
        // Créer une nouvelle version avec le statut mis à jour
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
        
        // Mettre à jour le composant pour pointer vers cette version
        await tx.component.update({
          where: { id: componentId },
          data: { currentVersionId: version.id }
        });
        
        // Créer une entrée de changelog
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
   * Ajoute une nouvelle version à un matériau existant
   */
  private async addVersion(componentId: string, versionData: any) {
    try {
      const { 
        name, 
        type, 
        quantity, 
        description, 
        requirements, 
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
        // Obtenir le numéro de la prochaine version
        const lastVersion = await tx.compVersion.findFirst({
          where: { componentId },
          orderBy: { versionNumber: 'desc' }
        });
        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
        
        // Obtenir les spécifications actuelles pour ne mettre à jour que les champs fournis
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
        
        // Créer une nouvelle version
        const version = await tx.compVersion.create({
          data: {
            componentId,
            versionNumber: nextVersionNumber,
            createdBy,
            specs: newSpecs
          }
        });
        
        // Mettre à jour le composant pour pointer vers cette version
        await tx.component.update({
          where: { id: componentId },
          data: { currentVersionId: version.id }
        });
        
        // Créer une entrée de changelog
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
   * Supprimer un matériau et toutes ses versions
   */
  async deleteMaterial(componentId: string) {
    try {
      // Prisma va automatiquement supprimer les versions liées grâce aux relations
      return await prisma.component.delete({
        where: { id: componentId }
      });
    } catch (error) {
      console.error('Error in deleteMaterial:', error);
      throw error;
    }
  }
}
