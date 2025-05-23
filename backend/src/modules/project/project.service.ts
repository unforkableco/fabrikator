import { prisma } from '../../prisma/prisma.service';
import { ProjectStatus } from '../../types';

export class ProjectService {
  /**
   * Récupérer tous les projets
   */
  async getAllProjects() {
    try {
      return await prisma.project.findMany();
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau projet
   */
  async createProject(projectData: { name: string; description?: string; status?: string }) {
    try {
      return await prisma.project.create({
        data: {
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
        where: { id }
      });
    } catch (error) {
      console.error('Error in getProjectById:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(id: string, projectData: { name?: string; description?: string; status?: string }) {
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
      // Using the simplified form based on schema
      return await prisma.$queryRaw`
        INSERT INTO "Message" ("projectId", "context", "content", "createdAt")
        VALUES (${projectId}, ${message.context}, ${message.content}, NOW())
        RETURNING *
      `;
    } catch (error) {
      console.error('Error in addMessageToProject:', error);
      throw error;
    }
  }
}
