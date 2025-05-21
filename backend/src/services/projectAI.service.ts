import { prisma } from '../services/prisma.service';
import { AIService } from './ai.service';
import { v4 as uuidv4 } from 'uuid';

export class ProjectAIService {
  private ai = new AIService();

  /**
   * Crée un projet ENTIER depuis un prompt IA, avec versionning.
   */
  async createProjectFromPrompt(userPrompt: string, createdBy = 'AI') {
    // 1) Appeler l'IA pour analyser le projet
    const aiResult = await this.ai.analyzeProjectPrompt(userPrompt);
    // aiResult doit retourner par ex :
    // { name, description, requirements:[{ name, description, details }], components:[{ type, details }], ... }

    return await prisma.$transaction(async tx => {
      // 2) Créer le projet
      const project = await tx.project.create({
        data: {
          id: uuidv4(),
          name: aiResult.name,
          description: aiResult.description,
          status: 'planning',
        }
      });

      // 3) Créer la conversation initiale
      const conv = await tx.conversation.create({
        data: {
          id: uuidv4(),
          projectId: project.id,
          context: 'initial_analysis',
        }
      });
      await tx.message.create({
        data: {
          id: uuidv4(),
          conversationId: conv.id,
          role: 'assistant',
          content: aiResult.response,      
        }
      });

      // 4) Ingest Requirements + versions
      for (const req of aiResult.requirements) {
        const requirement = await tx.requirement.create({
          data: {
            id: uuidv4(),
            projectId: project.id,
          }
        });
        const version = await tx.reqVersion.create({
          data: {
            id: uuidv4(),
            requirementId: requirement.id,
            versionNumber: 1,
            createdBy,
            details: req,        // JSONB
          }
        });
        // set currentVersionId
        await tx.requirement.update({
          where: { id: requirement.id },
          data: { currentVersionId: version.id }
        });
      }

      // 5) Ingest Components (matériels) + versions
      for (const comp of aiResult.components) {
        const component = await tx.component.create({
          data: { id: uuidv4(), projectId: project.id }
        });
        const version = await tx.compVersion.create({
          data: {
            id: uuidv4(),
            componentId: component.id,
            versionNumber: 1,
            createdBy,
            specs: comp.details,  // JSONB
          }
        });
        await tx.component.update({
          where: { id: component.id },
          data: { currentVersionId: version.id }
        });
      }

      // 6) Similairement pour Product3D, WiringSchema, Document
      if (aiResult.product3D) {
        const product3D = await tx.product3D.create({
          data: { id: uuidv4(), projectId: project.id }
        });
        const version = await tx.p3DVersion.create({
          data: {
            id: uuidv4(),
            product3DId: product3D.id,
            versionNumber: 1,
            createdBy,
            modelData: aiResult.product3D,  // JSONB
          }
        });
        await tx.product3D.update({
          where: { id: product3D.id },
          data: { currentVersionId: version.id }
        });
      }

      if (aiResult.wiringSchema) {
        const wiringSchema = await tx.wiringSchema.create({
          data: { id: uuidv4(), projectId: project.id }
        });
        const version = await tx.wireVersion.create({
          data: {
            id: uuidv4(),
            wiringSchemaId: wiringSchema.id,
            versionNumber: 1,
            createdBy,
            wiringData: aiResult.wiringSchema,  // JSONB
          }
        });
        await tx.wiringSchema.update({
          where: { id: wiringSchema.id },
          data: { currentVersionId: version.id }
        });
      }

      if (aiResult.documents) {
        for (const doc of aiResult.documents) {
          const document = await tx.document.create({
            data: { id: uuidv4(), projectId: project.id }
          });
          const version = await tx.docVersion.create({
            data: {
              id: uuidv4(),
              documentId: document.id,
              versionNumber: 1,
              createdBy,
              content: doc,  // JSONB
            }
          });
          await tx.document.update({
            where: { id: document.id },
            data: { currentVersionId: version.id }
          });
        }
      }

      return project;
    });
  }
} 