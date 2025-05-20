import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { VersionService } from '../services/version.service';

export class DocumentController {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * List all documents for a project
   */
  async listDocuments(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const documents = await prisma.document.findMany({
        where: { projectId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(documents);
    } catch (error) {
      console.error('Error listing documents:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  }

  /**
   * Create a new document with first version
   */
  async createDocument(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { content, title, docType = 'manual', createdBy = 'User' } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the document
        const document = await tx.document.create({
          data: { projectId }
        });
        
        // Create the first version with metadata in content
        const enhancedContent = {
          ...content,
          metadata: {
            title,
            docType
          }
        };
        
        const version = await tx.docVersion.create({
          data: {
            documentId: document.id,
            versionNumber: 1,
            createdBy,
            content: enhancedContent
          }
        });
        
        // Update the document to point to this version
        await tx.document.update({
          where: { id: document.id },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'doc_versions',
          changeType: 'create',
          author: createdBy,
          docVersionId: version.id,
          diffPayload: {
            type: 'new_document',
            title,
            docType,
            action: 'add'
          }
        });
        
        return { document, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  }

  /**
   * Add a new version to an existing document
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { content, createdBy = 'User' } = req.body;
      
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const result = await prisma.$transaction(async (tx) => {
        // Get the next version number
        const versionNumber = await this.versionService.getNextDocumentVersion(documentId);
        
        // Create a new version
        const version = await tx.docVersion.create({
          data: {
            documentId,
            versionNumber,
            createdBy,
            content
          }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'doc_versions',
          changeType: 'update',
          author: createdBy,
          docVersionId: version.id,
          diffPayload: {
            type: 'new_document_version',
            action: 'add'
          }
        });
        
        return { document, version };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding document version:', error);
      res.status(500).json({ error: 'Failed to add document version' });
    }
  }

  /**
   * Validate or reject a document version
   */
  async validateVersion(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { versionId, action } = req.body;
      
      if (!versionId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request. versionId and action (accept/reject) are required' });
      }
      
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { versions: true }
      });
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const version = document.versions.find(v => v.id === versionId);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      
      if (action === 'accept') {
        // Update the document to use this version
        await prisma.document.update({
          where: { id: documentId },
          data: { currentVersionId: versionId }
        });
        
        // Create a changelog entry
        await this.versionService.createChangeLog({
          entity: 'doc_versions',
          changeType: 'validate',
          author: 'User',
          docVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'accept',
            versionNumber: version.versionNumber
          }
        });
      } else {
        // Create a changelog entry for rejection
        await this.versionService.createChangeLog({
          entity: 'doc_versions',
          changeType: 'validate',
          author: 'User',
          docVersionId: versionId,
          diffPayload: {
            type: 'validate_version',
            action: 'reject',
            versionNumber: version.versionNumber
          }
        });
      }
      
      const updatedDocument = await prisma.document.findUnique({
        where: { id: documentId },
        include: { 
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error validating document version:', error);
      res.status(500).json({ error: 'Failed to validate document version' });
    }
  }
} 