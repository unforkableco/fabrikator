import { prisma } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ProjectStatus } from '../../types';

export class ProjectService {
  /**
   * Récupérer tous les projets
   */
  async getAllProjects() {
    try {
      return await prisma.project.findMany({
        include: {
          components: {
            include: {
              currentVersion: true
            }
          },
          requirements: {
            include: {
              currentVersion: true
            }
          },
          wiringSchemas: {
            include: {
              currentVersion: true
            }
          },
          product3Ds: {
            include: {
              currentVersion: true
            }
          },
          documents: {
            include: {
              currentVersion: true
            }
          },
          messages: true
        }
      });
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau projet
   */
  async createProject(projectData: any) {
    try {
      return await prisma.project.create({
        data: {
          id: uuidv4(),
          name: projectData.name,
          description: projectData.description,
          status: projectData.status || ProjectStatus.PLANNING
        }
      });
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  }

  /**
   * Récupérer un projet par son ID
   */
  async getProjectById(id: string) {
    try {
      return await prisma.project.findUnique({
        where: { id },
        include: {
          components: {
            include: {
              currentVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' }
              }
            }
          },
          requirements: {
            include: {
              currentVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' }
              }
            }
          },
          wiringSchemas: {
            include: {
              currentVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' }
              }
            }
          },
          product3Ds: {
            include: {
              currentVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' }
              }
            }
          },
          documents: {
            include: {
              currentVersion: true,
              versions: {
                orderBy: { versionNumber: 'desc' }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    } catch (error) {
      console.error('Error in getProjectById:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(id: string, projectData: any) {
    try {
      return await prisma.project.update({
        where: { id },
        data: {
          name: projectData.name,
          description: projectData.description,
          status: projectData.status
        }
      });
    } catch (error) {
      console.error('Error in updateProject:', error);
      throw error;
    }
  }

  /**
   * Supprimer un projet
   */
  async deleteProject(id: string) {
    try {
      return await prisma.project.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error in deleteProject:', error);
      throw error;
    }
  }

  /**
   * Ajouter un message à un projet
   */
  async addMessageToProject(projectId: string, message: { context: string, content: string }) {
    try {
      return await prisma.message.create({
        data: {
          id: uuidv4(),
          projectId,
          context: message.context,
          content: message.content
        }
      });
    } catch (error) {
      console.error('Error in addMessageToProject:', error);
      throw error;
    }
  }
}
