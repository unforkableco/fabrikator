import { prisma } from '../../prisma/prisma.service';
import { Scene3D, SceneVersion, Component3DType } from '@prisma/client';

export interface CreateSceneRequest {
  projectId: string;
  name?: string;
  createdBy: string;
}

export interface UpdateSceneRequest {
  name?: string;
  sceneGraph?: any;
  createdBy: string;
}

export interface SceneGraphNode {
  id: string;
  name: string;
  type: Component3DType;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  componentId?: string;
  children: SceneGraphNode[];
  metadata?: any;
}

export class SceneService {
  async createScene(data: CreateSceneRequest): Promise<Scene3D> {
    // Create scene with initial version
    const scene = await prisma.scene3D.create({
      data: {
        projectId: data.projectId,
        name: data.name || 'New Scene',
        versions: {
          create: {
            versionNumber: 1,
            sceneGraph: {
              root: {
                id: 'root',
                name: 'Scene Root',
                type: 'FUNCTIONAL',
                transform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  scale: [1, 1, 1]
                },
                children: []
              }
            },
            createdBy: data.createdBy
          }
        }
      },
      include: {
        versions: true,
        currentVersion: true
      }
    });

    // Set current version to the newly created version
    const updatedScene = await prisma.scene3D.update({
      where: { id: scene.id },
      data: { currentVersionId: scene.versions[0].id },
      include: {
        currentVersion: true,
        versions: true
      }
    });

    return updatedScene;
  }

  async getScene(sceneId: string): Promise<Scene3D | null> {
    return prisma.scene3D.findUnique({
      where: { id: sceneId },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5 // Last 5 versions
        },
        project: true
      }
    });
  }

  async getProjectScenes(projectId: string): Promise<Scene3D[]> {
    return prisma.scene3D.findMany({
      where: { projectId },
      include: {
        currentVersion: true
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async updateScene(sceneId: string, data: UpdateSceneRequest): Promise<Scene3D> {
    const scene = await prisma.scene3D.findUnique({
      where: { id: sceneId },
      include: { currentVersion: true }
    });
    
    if (!scene) {
      throw new Error('Scene not found');
    }

    // If sceneGraph is updated, create a new version
    if (data.sceneGraph) {
      const nextVersion = (scene.currentVersion?.versionNumber || 0) + 1;
      
      const newVersion = await prisma.sceneVersion.create({
        data: {
          scene3dId: sceneId,
          versionNumber: nextVersion,
          sceneGraph: data.sceneGraph,
          createdBy: data.createdBy
        }
      });

      // Update current version pointer
      await prisma.scene3D.update({
        where: { id: sceneId },
        data: { 
          currentVersionId: newVersion.id,
          updatedAt: new Date()
        }
      });
    }

    // Update scene metadata
    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;

    return prisma.scene3D.update({
      where: { id: sceneId },
      data: updateData,
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5
        }
      }
    });
  }

  async deleteScene(sceneId: string): Promise<boolean> {
    try {
      await prisma.scene3D.delete({
        where: { id: sceneId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting scene:', error);
      return false;
    }
  }

  async validateSceneGraph(sceneGraph: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!sceneGraph || !sceneGraph.root) {
      errors.push('Scene graph must have a root node');
    }

    const validateNode = (node: any, path: string) => {
      if (!node.id) errors.push(`Node at ${path} missing id`);
      if (!node.name) errors.push(`Node at ${path} missing name`);
      if (!node.type) errors.push(`Node at ${path} missing type`);
      
      if (!node.transform) {
        errors.push(`Node at ${path} missing transform`);
      } else {
        const { position, rotation, scale } = node.transform;
        if (!Array.isArray(position) || position.length !== 3) {
          errors.push(`Node at ${path} has invalid position`);
        }
        if (!Array.isArray(rotation) || rotation.length !== 3) {
          errors.push(`Node at ${path} has invalid rotation`);
        }
        if (!Array.isArray(scale) || scale.length !== 3) {
          errors.push(`Node at ${path} has invalid scale`);
        }
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any, index: number) => {
          validateNode(child, `${path}.children[${index}]`);
        });
      }
    };

    if (sceneGraph.root) {
      validateNode(sceneGraph.root, 'root');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}