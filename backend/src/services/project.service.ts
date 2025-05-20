import { prisma } from './prisma.service';
import type { ProjectRequirements, MaterialStatus, ProjectStatus } from '../types';
import { VersionService } from './version.service';

export class ProjectService {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * Create a new project with its initial requirements, materials and conversation
   */
  async createProject(data: {
    name: string;
    description: string;
    requirements: ProjectRequirements;
    materials: Array<{
      name: string;
      type: string;
      quantity: number;
      description: string;
      requirements: Record<string, any>;
      status: MaterialStatus;
    }>;
    initialMessage: { role: 'assistant' | 'user'; content: string };
  }) {
    return prisma.$transaction(async tx => {
      // 1) Créer le projet
      const project = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          status: 'planning',
        }
      });

      // 2) Créer Requirement + première version
      const requirement = await tx.requirement.create({
        data: { projectId: project.id }
      });
      const reqVersion = await tx.reqVersion.create({
        data: {
          requirementId: requirement.id,
          versionNumber: 1,
          createdBy: 'AI',
          details: data.requirements as any,
        }
      });
      await tx.requirement.update({
        where: { id: requirement.id },
        data: { currentVersionId: reqVersion.id }
      });

      // 3) Créer les materials et leurs versions
      for (const mat of data.materials) {
        const component = await tx.component.create({
          data: {
            projectId: project.id,
          }
        });
        const compVer = await tx.compVersion.create({
          data: {
            componentId: component.id,
            versionNumber: 1,
            createdBy: 'AI',
            specs: {
              name: mat.name,
              type: mat.type,
              quantity: mat.quantity,
              description: mat.description,
              requirements: mat.requirements,
              status: mat.status
            }
          }
        });
        await tx.component.update({
          where: { id: component.id },
          data: { currentVersionId: compVer.id }
        });
      }

      // 4) Créer la conversation initiale
      const conv = await tx.conversation.create({
        data: {
          projectId: project.id,
          context: 'initial_analysis',
        }
      });
      await tx.message.create({
        data: {
          conversationId: conv.id,
          role: data.initialMessage.role,
          content: data.initialMessage.content,
        }
      });

      return project;
    });
  }

  /**
   * Get a project by ID with all related data
   */
  async getProject(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        requirements: {
          include: { currentVersion: true }
        },
        components: {
          include: { currentVersion: true }
        },
        conversations: { 
          include: { 
            messages: {
              orderBy: { createdAt: 'asc' }
            } 
          } 
        },
        wiringSchemas: { 
          include: { currentVersion: true }
        },
        product3Ds: { 
          include: { currentVersion: true }
        },
        documents: { 
          include: { currentVersion: true }
        },
        suggestions: { 
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * List all projects with basic information
   */
  async listProjects() {
    return prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            components: true,
            requirements: true,
            conversations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update project information
   */
  async updateProject(id: string, updates: Partial<{ name: string; description: string; status: ProjectStatus }>) {
    return prisma.project.update({
      where: { id },
      data: { 
        ...updates,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get project history via changelog
   */
  async getProjectHistory(id: string) {
    // Get all components, requirements, etc. for this project
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        requirements: true,
        components: true,
        product3Ds: true,
        wiringSchemas: true,
        documents: true
      }
    });

    if (!project) return null;

    // Collect all versions from each entity
    const reqIds = project.requirements.map(r => r.id);
    const compIds = project.components.map(c => c.id);
    const p3dIds = project.product3Ds.map(p => p.id);
    const wireIds = project.wiringSchemas.map(w => w.id);
    const docIds = project.documents.map(d => d.id);

    // Get all changelogs for all versions of this project's entities
    const reqVersions = await prisma.reqVersion.findMany({
      where: { requirementId: { in: reqIds } },
      select: { id: true }
    });
    const compVersions = await prisma.compVersion.findMany({
      where: { componentId: { in: compIds } },
      select: { id: true }
    });
    const p3dVersions = await prisma.p3DVersion.findMany({
      where: { product3DId: { in: p3dIds } },
      select: { id: true }
    });
    const wireVersions = await prisma.wireVersion.findMany({
      where: { wiringSchemaId: { in: wireIds } },
      select: { id: true }
    });
    const docVersions = await prisma.docVersion.findMany({
      where: { documentId: { in: docIds } },
      select: { id: true }
    });

    // Get all changelogs
    const reqVersionIds = reqVersions.map(v => v.id);
    const compVersionIds = compVersions.map(v => v.id);
    const p3dVersionIds = p3dVersions.map(v => v.id);
    const wireVersionIds = wireVersions.map(v => v.id);
    const docVersionIds = docVersions.map(v => v.id);

    const changeLogs = await prisma.changeLog.findMany({
      where: {
        OR: [
          { reqVersionId: { in: reqVersionIds } },
          { compVersionId: { in: compVersionIds } },
          { p3dVersionId: { in: p3dVersionIds } },
          { wireVersionId: { in: wireVersionIds } },
          { docVersionId: { in: docVersionIds } }
        ]
      },
      include: {
        reqVersion: true,
        compVersion: true,
        p3dVersion: true,
        wireVersion: true,
        docVersion: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return changeLogs;
  }
} 