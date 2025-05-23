import { prisma } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export class WiringService {
  /**
   * Récupère le plan de câblage pour un projet
   */
  async getWiringForProject(projectId: string) {
    try {
      return await prisma.wiringSchema.findFirst({
        where: { projectId },
        include: {
          currentVersion: true
        }
      });
    } catch (error) {
      console.error('Error in getWiringForProject:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau plan de câblage pour un projet
   */
  async createWiring(projectId: string, wiringData: any) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Créer le schéma de câblage
        const wiringSchema = await tx.wiringSchema.create({
          data: { 
            id: uuidv4(),
            projectId 
          }
        });
        
        // Créer la première version
        const version = await tx.wireVersion.create({
          data: {
            id: uuidv4(),
            wiringSchemaId: wiringSchema.id,
            versionNumber: 1,
            createdBy: wiringData.createdBy || 'User',
            wiringData: {
              connections: wiringData.connections || [],
              diagram: wiringData.diagram || {}
            }
          }
        });
        
        // Mettre à jour le schéma pour pointer vers cette version
        await tx.wiringSchema.update({
          where: { id: wiringSchema.id },
          data: { currentVersionId: version.id }
        });
        
        // Créer une entrée de changelog
        await tx.changeLog.create({
          data: {
            id: uuidv4(),
            entity: 'wire_versions',
            changeType: 'create',
            author: wiringData.createdBy || 'User',
            wireVersionId: version.id,
            diffPayload: {
              type: 'new_wiring',
              action: 'create',
              connectionCount: wiringData.connections?.length || 0
            }
          }
        });
        
        return { 
          wiringSchema: await tx.wiringSchema.findUnique({
            where: { id: wiringSchema.id },
            include: { currentVersion: true }
          }), 
          version 
        };
      });
    } catch (error) {
      console.error('Error in createWiring:', error);
      throw error;
    }
  }

  /**
   * Récupère un plan de câblage par son ID
   */
  async getWiringById(id: string) {
    try {
      return await prisma.wiringSchema.findUnique({
        where: { id },
        include: {
          currentVersion: true
        }
      });
    } catch (error) {
      console.error('Error in getWiringById:', error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle version à un plan de câblage existant
   */
  async addVersion(wiringSchemaId: string, versionData: any) {
    try {
      const wiringSchema = await prisma.wiringSchema.findUnique({
        where: { id: wiringSchemaId },
        include: { 
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      if (!wiringSchema) {
        throw new Error('Wiring schema not found');
      }
      
      return await prisma.$transaction(async (tx) => {
        // Obtenir le numéro de la prochaine version
        const nextVersionNumber = wiringSchema.versions.length > 0 
          ? wiringSchema.versions[0].versionNumber + 1 
          : 1;
        
        // Créer une nouvelle version
        const version = await tx.wireVersion.create({
          data: {
            id: uuidv4(),
            wiringSchemaId,
            versionNumber: nextVersionNumber,
            createdBy: versionData.createdBy || 'User',
            wiringData: {
              connections: versionData.connections || [],
              diagram: versionData.diagram || {}
            }
          }
        });
        
        // Mettre à jour le schéma pour pointer vers cette version
        await tx.wiringSchema.update({
          where: { id: wiringSchemaId },
          data: { currentVersionId: version.id }
        });
        
        // Créer une entrée de changelog
        await tx.changeLog.create({
          data: {
            id: uuidv4(),
            entity: 'wire_versions',
            changeType: 'update',
            author: versionData.createdBy || 'User',
            wireVersionId: version.id,
            diffPayload: {
              type: 'update_wiring',
              action: 'update',
              versionNumber: nextVersionNumber,
              connectionCount: versionData.connections?.length || 0
            }
          }
        });
        
        return { 
          wiringSchema: await tx.wiringSchema.findUnique({
            where: { id: wiringSchemaId },
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
   * Récupère les versions d'un plan de câblage
   */
  async getWiringVersions(wiringSchemaId: string) {
    try {
      return await prisma.wiringSchema.findUnique({
        where: { id: wiringSchemaId },
        include: {
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Error in getWiringVersions:', error);
      throw error;
    }
  }
}
