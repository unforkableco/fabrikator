import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Project, Material, SelectedPart, ProjectStatus, MaterialStatus, PartStatus } from '../types';
import { AIService } from '../services/ai.service';
import { StorageService } from '../services/storage.service';

const storageService = new StorageService();
const aiService = new AIService();

export class ProjectController {
  async createProject(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
      }

      // Analyze project with AI
      const analysis = await aiService.analyzeProject(description);

      const newProject: Project = {
        id: uuidv4(),
        name,
        description,
        requirements: {
          needsMaterials: true,
          materialTypes: analysis.requirements,
          needs3DEditor: false,
          needsWiringCircuit: false,
          needsSoftwareCode: false,
        },
        materials: analysis.suggestedMaterials.map(m => ({
          ...m,
          id: uuidv4(),
          status: MaterialStatus.SUGGESTED,
        })),
        selectedParts: [],
        conversations: [{
          id: uuidv4(),
          messages: [{
            id: uuidv4(),
            role: 'assistant',
            content: `Initial project analysis:\n\n${analysis.response}`,
            timestamp: new Date().toISOString(),
          }],
          context: 'initial_analysis',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        status: ProjectStatus.PLANNING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdProject = storageService.createProject(newProject);
      res.status(201).json(createdProject);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async getProject(req: Request, res: Response) {
    const project = storageService.getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  }

  async updateProject(req: Request, res: Response) {
    const updatedProject = storageService.updateProject(req.params.id, req.body);
    
    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(updatedProject);
  }

  async addMaterial(req: Request, res: Response) {
    const project = storageService.getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const material: Material = {
      ...req.body,
      id: uuidv4(),
      status: MaterialStatus.APPROVED,
    };

    project.materials.push(material);
    project.updatedAt = new Date().toISOString();

    const updatedProject = storageService.updateProject(project.id, project);
    res.json(updatedProject);
  }

  async selectPart(req: Request, res: Response) {
    const project = storageService.getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const part: SelectedPart = {
      ...req.body,
      id: uuidv4(),
      status: PartStatus.SELECTED,
    };

    project.selectedParts.push(part);
    project.updatedAt = new Date().toISOString();

    const updatedProject = storageService.updateProject(project.id, project);
    res.json(updatedProject);
  }

  async generateWiringPlan(req: Request, res: Response) {
    const project = storageService.getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    try {
      const wiringPlan = await aiService.generateWiringPlan(project);
      const updatedProject = storageService.updateProject(project.id, {
        ...project,
        wiringPlan,
        updatedAt: new Date().toISOString(),
      });

      res.json(updatedProject);
    } catch (error) {
      console.error('Error generating wiring plan:', error);
      res.status(500).json({ error: 'Failed to generate wiring plan' });
    }
  }

  async processUserPrompt(req: Request, res: Response) {
    const project = storageService.getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    try {
      const { userInput } = req.body;
      const { message, changes } = await aiService.processUserPrompt(project, userInput);

      // Create new conversation or add to existing one
      if (!project.conversations.length) {
        project.conversations.push({
          id: uuidv4(),
          messages: [message],
          context: 'general',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        project.conversations[project.conversations.length - 1].messages.push(message);
        project.conversations[project.conversations.length - 1].updatedAt = new Date().toISOString();
      }

      // Apply any changes suggested by AI
      changes.forEach(change => {
        switch (change.type) {
          case 'material':
            if (change.action === 'add') {
              project.materials.push({
                ...change.data,
                id: uuidv4(),
                status: MaterialStatus.SUGGESTED,
              });
            }
            break;
          // Handle other change types...
        }
      });

      const updatedProject = storageService.updateProject(project.id, {
        ...project,
        updatedAt: new Date().toISOString(),
      });

      res.json({
        message,
        changes,
        project: updatedProject,
      });
    } catch (error) {
      console.error('Error processing user prompt:', error);
      res.status(500).json({ error: 'Failed to process user prompt' });
    }
  }

  async listProjects(req: Request, res: Response) {
    const projects = storageService.getAllProjects();
    res.json(projects);
  }
} 