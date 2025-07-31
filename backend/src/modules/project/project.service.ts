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
      // Cascade deletion of related relationships
      // 1. Supprimer les changeLogs liés aux versions des composants
      await prisma.changeLog.deleteMany({
        where: {
          compVersion: {
            component: {
              projectId: id
            }
          }
        }
      });

      // 2. Supprimer les changeLogs liés aux versions des schémas de câblage
      await prisma.changeLog.deleteMany({
        where: {
          wireVersion: {
            wiringSchema: {
              projectId: id
            }
          }
        }
      });

      // 3. Supprimer le projet (les autres relations en cascade se feront automatiquement)
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
  async addMessageToProject(projectId: string, message: { 
    context: string, 
    content: string, 
    sender: string, 
    mode: string,
    suggestions?: any 
  }) {
    try {
      return await prisma.message.create({
        data: {
          projectId,
          context: message.context,
          content: message.content,
          sender: message.sender,
          mode: message.mode,
          suggestions: message.suggestions || null
        } as any
      });
    } catch (error) {
      console.error('Error in addMessageToProject:', error);
      throw error;
    }
  }

  /**
   * Récupérer les messages d'un projet (chat)
   */
  async getProjectMessages(projectId: string, context: string, limit: number) {
    try {
      return await prisma.message.findMany({
        where: { 
          projectId,
          context 
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Error in getProjectMessages:', error);
      throw error;
    }
  }

  /**
   * Update the status of a suggestion in a message
   */
  async updateSuggestionStatus(projectId: string, messageId: string, suggestionId: string, status: 'accepted' | 'rejected') {
    try {
      // Retrieve the message with its suggestions
      const message = await prisma.message.findFirst({
        where: { 
          id: messageId,
          projectId 
        }
      });

      if (!message || !message.suggestions) {
        return null;
      }

      // Parse the suggestions
      const suggestions = Array.isArray(message.suggestions) ? message.suggestions : [];
      
      // Find and update the suggestion
      const updatedSuggestions = suggestions.map((suggestion: any) => {
        if (suggestion.id === suggestionId) {
          return {
            ...suggestion,
            status: status
          };
        }
        return suggestion;
      });

      // Update the message with the new suggestions
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          suggestions: updatedSuggestions
        }
      });

      return updatedMessage;
    } catch (error) {
      console.error('Error in updateSuggestionStatus:', error);
      throw error;
    }
  }
}
