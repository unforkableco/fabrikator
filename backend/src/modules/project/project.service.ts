import { prisma } from '../../prisma/prisma.service';
import { ProjectStatus } from '../../types';
import {
  AccountInactiveError,
  InsufficientCreditsError,
  ProjectLimitReachedError,
  ProjectNotFoundError,
} from './project.errors';

interface ProjectCreateInput {
  name: string;
  description?: string;
  status?: string;
}

export class ProjectService {
  async getAllProjects(accountId: string) {
    try {
      return await prisma.project.findMany({
        where: { ownerId: accountId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      throw error;
    }
  }

  async createProject(accountId: string, projectData: ProjectCreateInput) {
    try {
      return await prisma.$transaction(async (tx) => {
        const account = await tx.account.findUnique({ where: { id: accountId } });
        if (!account) {
          throw new Error('ACCOUNT_NOT_FOUND');
        }

        if (account.status !== 'active') {
          throw new AccountInactiveError();
        }

        const projectCount = await tx.project.count({ where: { ownerId: accountId } });
        if (projectCount >= account.maxProjects) {
          throw new ProjectLimitReachedError();
        }

        if (account.credits <= 0) {
          throw new InsufficientCreditsError();
        }

        const project = await tx.project.create({
          data: {
            name: projectData.name,
            description: projectData.description,
            status: projectData.status || ProjectStatus.PLANNING,
            ownerId: accountId,
          },
        });

        await tx.account.update({
          where: { id: accountId },
          data: {
            credits: { decrement: 1 },
          },
        });

        await tx.accountCreditTransaction.create({
          data: {
            accountId,
            amount: -1,
            reason: `Project ${project.id} creation`,
          },
        });

        return project;
      });
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  }

  async getProjectById(accountId: string, projectId: string) {
    try {
      return await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: accountId,
        },
      });
    } catch (error) {
      console.error('Error in getProjectById:', error);
      throw error;
    }
  }

  async updateProject(accountId: string, projectId: string, projectData: ProjectCreateInput) {
    try {
      const existing = await this.getProjectById(accountId, projectId);
      if (!existing) {
        throw new ProjectNotFoundError();
      }

      return await prisma.project.update({
        where: { id: projectId },
        data: {
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
        },
      });
    } catch (error) {
      console.error('Error in updateProject:', error);
      throw error;
    }
  }

  async deleteProject(accountId: string, projectId: string) {
    try {
      const existing = await this.getProjectById(accountId, projectId);
      if (!existing) {
        throw new ProjectNotFoundError();
      }

      await prisma.changeLog.deleteMany({
        where: {
          compVersion: {
            component: {
              projectId,
            },
          },
        },
      });

      await prisma.changeLog.deleteMany({
        where: {
          wireVersion: {
            wiringSchema: {
              projectId,
            },
          },
        },
      });

      return await prisma.project.delete({
        where: { id: projectId },
      });
    } catch (error) {
      console.error('Error in deleteProject:', error);
      throw error;
    }
  }

  async addMessageToProject(
    accountId: string,
    projectId: string,
    message: {
      context: string;
      content: string;
      sender: string;
      mode: string;
      suggestions?: any;
    },
  ) {
    try {
      const project = await this.getProjectById(accountId, projectId);
      if (!project) {
        throw new ProjectNotFoundError();
      }

      return await prisma.message.create({
        data: {
          projectId,
          context: message.context,
          content: message.content,
          sender: message.sender,
          mode: message.mode,
          suggestions: message.suggestions || null,
        } as any,
      });
    } catch (error) {
      console.error('Error in addMessageToProject:', error);
      throw error;
    }
  }

  async updateMessage(accountId: string, messageId: string, updates: { suggestions?: any }) {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          project: { ownerId: accountId },
        },
      });

      if (!message) {
        throw new ProjectNotFoundError('Message not found');
      }

      return await prisma.message.update({
        where: { id: messageId },
        data: updates,
      });
    } catch (error) {
      console.error('Error in updateMessage:', error);
      throw error;
    }
  }

  async getProjectMessages(accountId: string, projectId: string, context: string, limit: number) {
    try {
      return await prisma.message.findMany({
        where: {
          projectId,
          context,
          project: { ownerId: accountId },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error in getProjectMessages:', error);
      throw error;
    }
  }

  async updateSuggestionStatus(
    accountId: string,
    projectId: string,
    messageId: string,
    suggestionId: string,
    status: 'accepted' | 'rejected',
  ) {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          projectId,
          project: { ownerId: accountId },
        },
      });

      if (!message || !message.suggestions) {
        return null;
      }

      const suggestions = Array.isArray(message.suggestions) ? message.suggestions : [];
      const updatedSuggestions = suggestions.map((suggestion: any) =>
        suggestion.id === suggestionId
          ? {
              ...suggestion,
              status,
            }
          : suggestion,
      );

      return await prisma.message.update({
        where: { id: messageId },
        data: {
          suggestions: updatedSuggestions,
        },
      });
    } catch (error) {
      console.error('Error in updateSuggestionStatus:', error);
      throw error;
    }
  }
}
