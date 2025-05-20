import { prisma } from './prisma.service';

/**
 * Service for handling version incrementation across different entity types
 */
export class VersionService {
  /**
   * Get the next version number for a requirement
   */
  async getNextRequirementVersion(requirementId: string): Promise<number> {
    const highestVersion = await prisma.reqVersion.findFirst({
      where: { requirementId },
      orderBy: { versionNumber: 'desc' }
    });
    
    return highestVersion ? highestVersion.versionNumber + 1 : 1;
  }
  
  /**
   * Get the next version number for a component
   */
  async getNextComponentVersion(componentId: string): Promise<number> {
    const highestVersion = await prisma.compVersion.findFirst({
      where: { componentId },
      orderBy: { versionNumber: 'desc' }
    });
    
    return highestVersion ? highestVersion.versionNumber + 1 : 1;
  }
  
  /**
   * Get the next version number for a wiring schema
   */
  async getNextWiringVersion(wiringSchemaId: string): Promise<number> {
    const highestVersion = await prisma.wireVersion.findFirst({
      where: { wiringSchemaId },
      orderBy: { versionNumber: 'desc' }
    });
    
    return highestVersion ? highestVersion.versionNumber + 1 : 1;
  }
  
  /**
   * Get the next version number for a 3D model
   */
  async getNextProduct3DVersion(product3DId: string): Promise<number> {
    const highestVersion = await prisma.p3DVersion.findFirst({
      where: { product3DId },
      orderBy: { versionNumber: 'desc' }
    });
    
    return highestVersion ? highestVersion.versionNumber + 1 : 1;
  }
  
  /**
   * Get the next version number for a document
   */
  async getNextDocumentVersion(documentId: string): Promise<number> {
    const highestVersion = await prisma.docVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' }
    });
    
    return highestVersion ? highestVersion.versionNumber + 1 : 1;
  }
  
  /**
   * Create a changelog entry
   */
  async createChangeLog(data: {
    entity: string;
    changeType: 'create' | 'update' | 'delete' | 'validate';
    author: 'AI' | 'User';
    reqVersionId?: string;
    compVersionId?: string;
    p3dVersionId?: string;
    wireVersionId?: string;
    docVersionId?: string;
    diffPayload: Record<string, any>;
  }) {
    return prisma.changeLog.create({
      data
    });
  }
} 