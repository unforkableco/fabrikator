import { Request, Response } from 'express';
import { Design3DService, CreateComponent3DRequest } from './design3d.service';
import { Component3DType } from '@prisma/client';
import * as fs from 'fs';

export class Design3DController {
  private design3dService: Design3DService;

  constructor() {
    this.design3dService = new Design3DService();
  }

  createComponent = async (req: Request, res: Response) => {
    try {
      const { name, type, category, metadata, isGenerated } = req.body;

      if (!name || !type || !category) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, type, category' 
        });
      }

      // Validate type enum
      if (!Object.values(Component3DType).includes(type)) {
        return res.status(400).json({ 
          error: 'Invalid type. Must be one of: DESIGN, FUNCTIONAL, ELECTRONIC, MECHANICAL' 
        });
      }

      const createData: CreateComponent3DRequest = {
        name,
        type,
        category,
        metadata,
        isGenerated
      };

      const component = await this.design3dService.createComponent(createData);
      
      res.status(201).json({
        success: true,
        data: component
      });
    } catch (error) {
      console.error('Error creating component:', error);
      res.status(500).json({ 
        error: 'Failed to create component',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getComponent = async (req: Request, res: Response) => {
    try {
      const { componentId } = req.params;
      
      const component = await this.design3dService.getComponent(componentId);
      
      if (!component) {
        return res.status(404).json({ error: 'Component not found' });
      }

      res.json({
        success: true,
        data: component
      });
    } catch (error) {
      console.error('Error fetching component:', error);
      res.status(500).json({ 
        error: 'Failed to fetch component',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getComponents = async (req: Request, res: Response) => {
    try {
      const { type, category, isGenerated, search } = req.query;
      
      let components;
      
      if (search) {
        components = await this.design3dService.searchComponents(search as string);
      } else {
        const filters: any = {};
        if (type) filters.type = type as Component3DType;
        if (category) filters.category = category as string;
        if (isGenerated !== undefined) filters.isGenerated = isGenerated === 'true';
        
        components = await this.design3dService.getComponents(filters);
      }
      
      res.json({
        success: true,
        data: components
      });
    } catch (error) {
      console.error('Error fetching components:', error);
      res.status(500).json({ 
        error: 'Failed to fetch components',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  updateComponent = async (req: Request, res: Response) => {
    try {
      const { componentId } = req.params;
      const updateData = req.body;

      // Validate type if provided
      if (updateData.type && !Object.values(Component3DType).includes(updateData.type)) {
        return res.status(400).json({ 
          error: 'Invalid type. Must be one of: DESIGN, FUNCTIONAL, ELECTRONIC, MECHANICAL' 
        });
      }

      const component = await this.design3dService.updateComponent(componentId, updateData);
      
      res.json({
        success: true,
        data: component
      });
    } catch (error) {
      console.error('Error updating component:', error);
      res.status(500).json({ 
        error: 'Failed to update component',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteComponent = async (req: Request, res: Response) => {
    try {
      const { componentId } = req.params;
      
      const success = await this.design3dService.deleteComponent(componentId);
      
      if (!success) {
        return res.status(404).json({ error: 'Component not found or could not be deleted' });
      }

      res.json({
        success: true,
        message: 'Component deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting component:', error);
      res.status(500).json({ 
        error: 'Failed to delete component',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  uploadSTL = async (req: Request, res: Response) => {
    try {
      const { componentId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadData = {
        componentId,
        fileName: file.originalname,
        fileBuffer: file.buffer
      };

      const component = await this.design3dService.uploadSTL(uploadData);
      
      res.json({
        success: true,
        data: component,
        message: 'STL file uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading STL:', error);
      res.status(500).json({ 
        error: 'Failed to upload STL file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  downloadSTL = async (req: Request, res: Response) => {
    try {
      const { componentId } = req.params;
      
      const fileInfo = await this.design3dService.getSTLFile(componentId);
      
      if (!fileInfo) {
        return res.status(404).json({ error: 'STL file not found' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      const fileStream = fs.createReadStream(fileInfo.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading STL:', error);
      res.status(500).json({ 
        error: 'Failed to download STL file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.design3dService.getComponentStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch component statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}