import { prisma } from './prisma.service';
import { MaterialStatus } from '../types';
import { VersionService } from './version.service';

export class MaterialService {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * Add a new material to an existing project
   */
  async addMaterial(projectId: string, data: {
    name: string;
    type: string;
    quantity: number;
    description: string;
    requirements: Record<string, any>;
    status: MaterialStatus;
    createdBy: 'AI' | 'User';
  }) {
    return prisma.$transaction(async tx => {
      // Create a new component
      const component = await tx.component.create({
        data: {
          projectId: projectId,
        }
      });

      // Get the next version number
      const versionNumber = 1; // First version is always 1

      // Create component version
      const compVersion = await tx.compVersion.create({
        data: {
          componentId: component.id,
          versionNumber,
          createdBy: data.createdBy,
          specs: {
            name: data.name,
            type: data.type,
            quantity: data.quantity,
            description: data.description,
            requirements: data.requirements,
            status: data.status
          }
        }
      });

      // Update the component to point to this version
      await tx.component.update({
        where: { id: component.id },
        data: { currentVersionId: compVersion.id }
      });

      // Create a changelog entry
      const changeLog = await tx.changeLog.create({
        data: {
          entity: 'comp_version',
          changeType: 'create',
          author: data.createdBy,
          compVersionId: compVersion.id,
          diffPayload: {
            type: 'new_material',
            name: data.name,
            action: 'add'
          }
        }
      });

      return {
        component,
        version: compVersion,
        changeLog
      };
    });
  }

  /**
   * Update an existing material
   */
  async updateMaterial(componentId: string, data: {
    name?: string;
    type?: string;
    quantity?: number;
    description?: string;
    requirements?: Record<string, any>;
    status?: MaterialStatus;
    createdBy: 'AI' | 'User';
  }) {
    return prisma.$transaction(async tx => {
      // Get the current version
      const component = await tx.component.findUnique({
        where: { id: componentId },
        include: { currentVersion: true }
      });

      if (!component || !component.currentVersion) {
        throw new Error('Component or current version not found');
      }

      // Get the next version number
      const versionNumber = await this.versionService.getNextComponentVersion(componentId);

      // Create a new version based on the current one with updates
      const currentSpecs = component.currentVersion.specs as any;
      const newSpecs = {
        ...currentSpecs,
        name: data.name ?? currentSpecs.name,
        type: data.type ?? currentSpecs.type,
        quantity: data.quantity ?? currentSpecs.quantity,
        description: data.description ?? currentSpecs.description,
        requirements: data.requirements ?? currentSpecs.requirements,
        status: data.status ?? currentSpecs.status
      };

      // Create the new version
      const compVersion = await tx.compVersion.create({
        data: {
          componentId,
          versionNumber,
          createdBy: data.createdBy,
          specs: newSpecs
        }
      });

      // Update the component to point to this version
      await tx.component.update({
        where: { id: componentId },
        data: { currentVersionId: compVersion.id }
      });

      // Create a changelog entry
      const changeLog = await tx.changeLog.create({
        data: {
          entity: 'comp_version',
          changeType: 'update',
          author: data.createdBy,
          compVersionId: compVersion.id,
          diffPayload: {
            type: 'material_update',
            name: newSpecs.name,
            changes: { ...data },
            action: 'update'
          }
        }
      });

      return {
        component,
        version: compVersion,
        changeLog
      };
    });
  }

  /**
   * Get all materials for a project
   */
  async getProjectMaterials(projectId: string) {
    const components = await prisma.component.findMany({
      where: { projectId },
      include: { currentVersion: true }
    });

    return components;
  }

  /**
   * Get material history (all versions)
   */
  async getMaterialHistory(componentId: string) {
    const versions = await prisma.compVersion.findMany({
      where: { componentId },
      orderBy: { versionNumber: 'desc' },
      include: {
        changeLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return versions;
  }
} 