import { Request, Response } from 'express';
import { SceneService, CreateSceneRequest, UpdateSceneRequest } from './scene.service';

export class SceneController {
  private sceneService: SceneService;

  constructor() {
    this.sceneService = new SceneService();
  }

  createScene = async (req: Request, res: Response) => {
    try {
      const { projectId, name, createdBy } = req.body;

      if (!projectId || !createdBy) {
        return res.status(400).json({ 
          error: 'Missing required fields: projectId, createdBy' 
        });
      }

      const createData: CreateSceneRequest = {
        projectId,
        name,
        createdBy
      };

      const scene = await this.sceneService.createScene(createData);
      
      res.status(201).json({
        success: true,
        data: scene
      });
    } catch (error) {
      console.error('Error creating scene:', error);
      res.status(500).json({ 
        error: 'Failed to create scene',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getScene = async (req: Request, res: Response) => {
    try {
      const { sceneId } = req.params;
      
      const scene = await this.sceneService.getScene(sceneId);
      
      if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
      }

      res.json({
        success: true,
        data: scene
      });
    } catch (error) {
      console.error('Error fetching scene:', error);
      res.status(500).json({ 
        error: 'Failed to fetch scene',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getProjectScenes = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      
      const scenes = await this.sceneService.getProjectScenes(projectId);
      
      res.json({
        success: true,
        data: scenes
      });
    } catch (error) {
      console.error('Error fetching project scenes:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project scenes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  updateScene = async (req: Request, res: Response) => {
    try {
      const { sceneId } = req.params;
      const { name, sceneGraph, createdBy } = req.body;

      if (!createdBy) {
        return res.status(400).json({ 
          error: 'Missing required field: createdBy' 
        });
      }

      // Validate scene graph if provided
      if (sceneGraph) {
        const validation = await this.sceneService.validateSceneGraph(sceneGraph);
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid scene graph',
            details: validation.errors
          });
        }
      }

      const updateData: UpdateSceneRequest = {
        name,
        sceneGraph,
        createdBy
      };

      const scene = await this.sceneService.updateScene(sceneId, updateData);
      
      res.json({
        success: true,
        data: scene
      });
    } catch (error) {
      console.error('Error updating scene:', error);
      res.status(500).json({ 
        error: 'Failed to update scene',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteScene = async (req: Request, res: Response) => {
    try {
      const { sceneId } = req.params;
      
      const success = await this.sceneService.deleteScene(sceneId);
      
      if (!success) {
        return res.status(404).json({ error: 'Scene not found or could not be deleted' });
      }

      res.json({
        success: true,
        message: 'Scene deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting scene:', error);
      res.status(500).json({ 
        error: 'Failed to delete scene',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  validateSceneGraph = async (req: Request, res: Response) => {
    try {
      const { sceneGraph } = req.body;

      if (!sceneGraph) {
        return res.status(400).json({ 
          error: 'Missing sceneGraph in request body' 
        });
      }

      const validation = await this.sceneService.validateSceneGraph(sceneGraph);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating scene graph:', error);
      res.status(500).json({ 
        error: 'Failed to validate scene graph',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}