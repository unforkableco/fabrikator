import { Request, Response } from 'express';
import { ProjectService } from './project.service';
import { AIService } from '../../services/ai.service';
import { MaterialService } from '../material/material.service';
import { WiringService } from '../wiring/wiring.service';

export class ProjectController {
  private projectService: ProjectService;
  private aiService: AIService;
  private materialService: MaterialService;
  private wiringService: WiringService;

  constructor() {
    this.projectService = new ProjectService();
    this.aiService = new AIService();
    this.materialService = new MaterialService();
    this.wiringService = new WiringService();
  }

  /**
   * Récupérer tous les projets
   */
  async getAllProjects(req: Request, res: Response) {
    try {
      const projects = await this.projectService.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error getting all projects:', error);
      res.status(500).json({ error: 'Failed to get projects' });
    }
  }

  /**
   * Créer un nouveau projet
   */
  async createProject(req: Request, res: Response) {
    try {
      const projectData = req.body;
      const project = await this.projectService.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  /**
   * Récupérer un projet par son ID
   */
  async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await this.projectService.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error getting project by ID:', error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projectData = req.body;
      
      const project = await this.projectService.updateProject(id, projectData);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  /**
   * Supprimer un projet
   */
  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.projectService.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  /**
   * Créer un projet à partir d'un prompt utilisateur
   */
  async createFromPrompt(req: Request, res: Response) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Le prompt est requis' });
      }
      
      // Analyser le prompt avec l'IA
      const analysisResult = await this.aiService.analyzeProjectPrompt(prompt);
      
      // Extraire les données pour créer le projet
      let projectName = 'Nouveau projet';
      let projectDescription = prompt;
      
      try {
        if (analysisResult && typeof analysisResult === 'object') {
          if ('name' in analysisResult && typeof analysisResult.name === 'string') {
            projectName = analysisResult.name;
          }
          
          if ('description' in analysisResult && typeof analysisResult.description === 'string') {
            projectDescription = analysisResult.description;
          }
        }
      } catch (parseError) {
        console.warn('Error parsing AI response:', parseError);
        // Continuer avec les valeurs par défaut
      }
      
      // Créer le projet
      const projectData = {
        name: projectName,
        description: projectDescription,
        status: 'planning'
      };
      
      const project = await this.projectService.createProject(projectData);
      
      // Retourner le projet créé
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project from prompt:', error);
      res.status(500).json({ error: 'Failed to create project from prompt' });
    }
  }

  /**
   * Ajouter un message à un projet
   */
  async addMessageToProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { context, content, sender, mode, suggestions } = req.body;
      
      if (!content || !sender || !mode) {
        return res.status(400).json({ error: 'Le contenu, sender et mode du message sont requis' });
      }
      
      const message = await this.projectService.addMessageToProject(id, {
        context: context || 'materials',
        content,
        sender,
        mode,
        suggestions
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error adding message to project:', error);
      res.status(500).json({ error: 'Failed to add message to project' });
    }
  }

  /**
   * Récupérer les messages d'un projet (chat)
   */
  async getProjectMessages(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { context = 'materials', limit = 10 } = req.query;
      
      const messages = await this.projectService.getProjectMessages(id, context as string, Number(limit));
      
      // Trier par ordre chronologique (plus anciens en premier) pour l'affichage
      const sortedMessages = messages.reverse();
      
      res.json(sortedMessages);
    } catch (error) {
      console.error('Error getting project messages:', error);
      res.status(500).json({ error: 'Failed to get project messages' });
    }
  }

  /**
   * Répondre à une question sur un projet (mode Ask)
   */
  async askProjectQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'La question est requise' });
      }
      
      // Récupérer les informations complètes du projet
      const project = await this.projectService.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Récupérer les matériaux du projet
      let materials: any[] = [];
      try {
        materials = await this.materialService.listMaterials(id);
      } catch (error) {
        console.warn('No materials found for project:', id);
      }

      // Récupérer le câblage du projet
      let wiring = null;
      try {
        wiring = await this.wiringService.getWiringForProject(id);
      } catch (error) {
        console.warn('No wiring found for project:', id);
      }
      
      // Demander à l'IA de répondre à la question avec le contexte complet
      const answer = await this.aiService.answerProjectQuestion({
        project: project,
        materials: materials,
        wiring: wiring,
        userQuestion: question
      });
      
      res.json({ answer });
    } catch (error) {
      console.error('Error answering project question:', error);
      res.status(500).json({ error: 'Failed to answer project question' });
    }
  }
}
