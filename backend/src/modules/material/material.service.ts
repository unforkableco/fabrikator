import { prisma } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MaterialStatus } from '../../types';

export class MaterialService {
  /**
   * Liste tous les matériaux d'un projet
   */
  async listMaterials(projectId: string) {
    try {
      return await prisma.component.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Error in listMaterials:', error);
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
            id: uuidv4(),
            projectId 
          }
        });
        
        // Créer la première version
        const version = await tx.compVersion.create({
          data: {
            id: uuidv4(),
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
            id: uuidv4(),
            entity: 'comp_versions',
            changeType: 'create',
            author: createdBy,
            compVersionId: version.id,
            diffPayload: {
              type: 'new_component',
              name,
              action: 'add'
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
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Error in getMaterialById:', error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle version à un matériau existant
   */
  async addVersion(componentId: string, versionData: any) {
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
            id: uuidv4(),
            componentId,
            versionNumber: nextVersionNumber,
            createdBy,
            specs: newSpecs
          }
        });
        
        // Créer une entrée de changelog
        await tx.changeLog.create({
          data: {
            id: uuidv4(),
            entity: 'comp_versions',
            changeType: 'update',
            author: createdBy,
            compVersionId: version.id,
            diffPayload: {
              type: 'component_update',
              name: newSpecs.name,
              changes: { name, type, quantity, description, requirements, status },
              action: 'update'
            }
          }
        });
        
        return { 
          component: await tx.component.findUnique({
            where: { id: componentId },
            include: { 
              currentVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' }
              }
            }
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
   * Valide ou rejette une version d'un matériau
   */
  async validateVersion(componentId: string, versionId: string, action: 'accept' | 'reject') {
    try {
      const component = await prisma.component.findUnique({
        where: { id: componentId },
        include: { versions: true }
      });
      
      if (!component) {
        throw new Error('Component not found');
      }
      
      const version = component.versions.find(v => v.id === versionId);
      if (!version) {
        throw new Error('Version not found');
      }
      
      if (action === 'accept') {
        // Mettre à jour le composant pour utiliser cette version
        await prisma.component.update({
          where: { id: componentId },
          data: { currentVersionId: versionId }
        });
        
        // Créer une entrée de changelog
        await prisma.changeLog.create({
          data: {
            id: uuidv4(),
            entity: 'comp_versions',
            changeType: 'validate',
            author: 'User',
            compVersionId: versionId,
            diffPayload: {
              type: 'validate_version',
              action: 'accept',
              versionNumber: version.versionNumber
            }
          }
        });
      } else {
        // Créer une entrée de changelog pour le rejet
        await prisma.changeLog.create({
          data: {
            id: uuidv4(),
            entity: 'comp_versions',
            changeType: 'validate',
            author: 'User',
            compVersionId: versionId,
            diffPayload: {
              type: 'validate_version',
              action: 'reject',
              versionNumber: version.versionNumber
            }
          }
        });
      }
      
      return await prisma.component.findUnique({
        where: { id: componentId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Error in validateVersion:', error);
      throw error;
    }
  }

  /**
   * Récupère les liens d'achat pour un matériau
   */
  async getPurchaseLinks(componentId: string) {
    try {
      const component = await prisma.component.findUnique({
        where: { id: componentId },
        include: {
          currentVersion: true,
        },
      });

      if (!component || !component.currentVersion) {
        return null;
      }

      // Extraire les liens d'achat du JSON specs
      const specs = component.currentVersion.specs as Record<string, any>;
      const purchaseLinks = specs.purchaseLinks || [];
      
      return {
        id: component.id,
        name: specs.modelNumber || specs.type || 'Component',
        manufacturer: specs.manufacturer,
        estimatedCost: specs.estimatedCost,
        datasheet: specs.datasheet,
        purchaseLinks: purchaseLinks
      };
    } catch (error) {
      console.error('Error in getPurchaseLinks:', error);
      throw error;
    }
  }
}
