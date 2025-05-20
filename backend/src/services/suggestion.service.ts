import { prisma } from './prisma.service';
import { VersionService } from './version.service';

/**
 * Service for managing AI suggestions and interactions
 */
export class SuggestionService {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * Create a new suggestion
   */
  async createSuggestion(data: {
    projectId: string;
    context: string;
    promptPayload: Record<string, any>;
    responsePayload: Record<string, any>;
  }) {
    const suggestion = await prisma.suggestion.create({
      data: {
        projectId: data.projectId,
        context: data.context,
        status: 'pending',
        promptPayload: data.promptPayload,
        responsePayload: data.responsePayload
      }
    });

    return suggestion;
  }

  /**
   * Add a suggestion item
   */
  async addSuggestionItem(data: {
    suggestionId: string;
    itemPayload: Record<string, any>;
    action: string;
  }) {
    const item = await prisma.suggestionItem.create({
      data: {
        suggestionId: data.suggestionId,
        itemPayload: data.itemPayload,
        action: data.action
      }
    });

    return item;
  }

  /**
   * Update suggestion status
   */
  async updateSuggestionStatus(id: string, status: string) {
    const suggestion = await prisma.suggestion.update({
      where: { id },
      data: { status }
    });

    return suggestion;
  }

  /**
   * Get suggestion by ID with its items
   */
  async getSuggestion(id: string) {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    return suggestion;
  }

  /**
   * Get all suggestions for a project
   */
  async getProjectSuggestions(projectId: string) {
    const suggestions = await prisma.suggestion.findMany({
      where: { projectId },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return suggestions;
  }

  /**
   * Accept a suggestion and create version entries
   */
  async acceptSuggestion(id: string) {
    // First update the suggestion status
    await this.updateSuggestionStatus(id, 'accepted');

    // Get the suggestion with items
    const suggestion = await this.getSuggestion(id);
    if (!suggestion) return null;

    return prisma.$transaction(async tx => {
      // Process each suggestion item and create the appropriate version entries
      const results = [];
      for (const item of suggestion.items) {
        // Different handling based on action and context
        switch (suggestion.context) {
          case 'materials':
            if (item.action === 'add') {
              // Create a new material requirement
              const result = await this.processMaterialSuggestion(tx, suggestion.projectId, item.itemPayload);
              results.push(result);
            }
            break;
          case '3d':
            if (item.action === 'add') {
              // Create a new 3D model version
              const result = await this.process3DSuggestion(tx, suggestion.projectId, item.itemPayload);
              results.push(result);
            }
            break;
          case 'wiring':
            if (item.action === 'add') {
              // Create a new wiring schema version
              const result = await this.processWiringSuggestion(tx, suggestion.projectId, item.itemPayload);
              results.push(result);
            }
            break;
          case 'doc':
            if (item.action === 'add') {
              // Create a new document version
              const result = await this.processDocSuggestion(tx, suggestion.projectId, item.itemPayload);
              results.push(result);
            }
            break;
        }
      }

      return {
        suggestion,
        results
      };
    });
  }

  /**
   * Process material suggestion
   */
  private async processMaterialSuggestion(tx: any, projectId: string, itemPayload: any) {
    // Check if a requirement already exists for this project
    let requirement = await tx.requirement.findFirst({
      where: { projectId }
    });

    // If not, create a new requirement root
    if (!requirement) {
      requirement = await tx.requirement.create({
        data: { projectId }
      });
    }

    // Get the next version number
    const versionNumber = requirement.currentVersionId 
      ? await this.versionService.getNextRequirementVersion(requirement.id)
      : 1;

    // Create a new version
    const reqVersion = await tx.reqVersion.create({
      data: {
        requirementId: requirement.id,
        versionNumber,
        createdBy: 'AI',
        details: itemPayload
      }
    });

    // Update the requirement to point to this version as current
    await tx.requirement.update({
      where: { id: requirement.id },
      data: { currentVersionId: reqVersion.id }
    });

    // Create a changelog entry
    const changeLog = await this.versionService.createChangeLog({
      entity: 'req_versions',
      changeType: 'create',
      author: 'AI',
      reqVersionId: reqVersion.id,
      diffPayload: { type: 'new_version', payload: itemPayload }
    });

    return {
      requirement,
      reqVersion,
      changeLog
    };
  }

  /**
   * Process 3D model suggestion
   */
  private async process3DSuggestion(tx: any, projectId: string, itemPayload: any) {
    // Check if a 3D model already exists for this project
    let product3D = await tx.product3D.findFirst({
      where: { projectId }
    });

    // If not, create a new 3D model root
    if (!product3D) {
      product3D = await tx.product3D.create({
        data: { projectId }
      });
    }

    // Get the next version number
    const versionNumber = product3D.currentVersionId
      ? await this.versionService.getNextProduct3DVersion(product3D.id)
      : 1;

    // Create a new version
    const p3dVersion = await tx.p3DVersion.create({
      data: {
        product3DId: product3D.id,
        versionNumber,
        createdBy: 'AI',
        modelData: itemPayload
      }
    });

    // Update the 3D model to point to this version as current
    await tx.product3D.update({
      where: { id: product3D.id },
      data: { currentVersionId: p3dVersion.id }
    });

    // Create a changelog entry
    const changeLog = await this.versionService.createChangeLog({
      entity: 'p3d_versions',
      changeType: 'create',
      author: 'AI',
      p3dVersionId: p3dVersion.id,
      diffPayload: { type: 'new_version', payload: itemPayload }
    });

    return {
      product3D,
      p3dVersion,
      changeLog
    };
  }

  /**
   * Process wiring suggestion
   */
  private async processWiringSuggestion(tx: any, projectId: string, itemPayload: any) {
    // Check if a wiring schema already exists for this project
    let wiringSchema = await tx.wiringSchema.findFirst({
      where: { projectId }
    });

    // If not, create a new wiring schema root
    if (!wiringSchema) {
      wiringSchema = await tx.wiringSchema.create({
        data: { projectId }
      });
    }

    // Get the next version number
    const versionNumber = wiringSchema.currentVersionId
      ? await this.versionService.getNextWiringVersion(wiringSchema.id)
      : 1;

    // Create a new version
    const wireVersion = await tx.wireVersion.create({
      data: {
        wiringSchemaId: wiringSchema.id,
        versionNumber,
        createdBy: 'AI',
        wiringData: itemPayload
      }
    });

    // Update the wiring schema to point to this version as current
    await tx.wiringSchema.update({
      where: { id: wiringSchema.id },
      data: { currentVersionId: wireVersion.id }
    });

    // Create a changelog entry
    const changeLog = await this.versionService.createChangeLog({
      entity: 'wire_versions',
      changeType: 'create',
      author: 'AI',
      wireVersionId: wireVersion.id,
      diffPayload: { type: 'new_version', payload: itemPayload }
    });

    return {
      wiringSchema,
      wireVersion,
      changeLog
    };
  }

  /**
   * Process document suggestion
   */
  private async processDocSuggestion(tx: any, projectId: string, itemPayload: any) {
    // Check if a document already exists for this project
    let document = await tx.document.findFirst({
      where: { projectId }
    });

    // If not, create a new document root
    if (!document) {
      document = await tx.document.create({
        data: { projectId }
      });
    }

    // Get the next version number
    const versionNumber = document.currentVersionId
      ? await this.versionService.getNextDocumentVersion(document.id)
      : 1;

    // Create a new version
    const docVersion = await tx.docVersion.create({
      data: {
        documentId: document.id,
        versionNumber,
        createdBy: 'AI',
        content: itemPayload
      }
    });

    // Update the document to point to this version as current
    await tx.document.update({
      where: { id: document.id },
      data: { currentVersionId: docVersion.id }
    });

    // Create a changelog entry
    const changeLog = await this.versionService.createChangeLog({
      entity: 'doc_versions',
      changeType: 'create',
      author: 'AI',
      docVersionId: docVersion.id,
      diffPayload: { type: 'new_version', payload: itemPayload }
    });

    return {
      document,
      docVersion,
      changeLog
    };
  }
} 