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
    this.aiService = AIService.getInstance();
    this.materialService = new MaterialService();
    this.wiringService = new WiringService();
  }

  /**
   * Get all projects
   */
  async getAllProjects(_: Request, res: Response) {
    try {
      const projects = await this.projectService.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error getting all projects:', error);
      res.status(500).json({ error: 'Failed to get projects' });
    }
  }

  /**
   * Get a project by its ID
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
   * Update a project
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
   * Delete a project
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
   * Create a project from a user prompt
   */
  async createFromPrompt(req: Request, res: Response) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      // Analyze the prompt with AI
      const analysisResult = await this.aiService.analyzeProjectPrompt(prompt);
      
      // Extract data to create the project
      let projectName = 'New project';
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
        // Continue with default values
      }
      
      // Create the project
      const projectData = {
        name: projectName,
        description: projectDescription,
        status: 'planning'
      };
      
      const project = await this.projectService.createProject(projectData);
      
      // Return the created project
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project from prompt:', error);
      res.status(500).json({ error: 'Failed to create project from prompt' });
    }
  }

  /**
   * Add a message to a project
   */
  async addMessageToProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { context, content, sender, mode, suggestions } = req.body;
      
      if (!content || !sender || !mode) {
        return res.status(400).json({ error: 'Message content, sender and mode are required' });
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
   * Update a message
   */
  async updateMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const updates = req.body;
      
      const updatedMessage = await this.projectService.updateMessage(messageId, updates);
      
      if (!updatedMessage) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({ error: 'Failed to update message' });
    }
  }

  /**
   * Get project messages (chat)
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
   * Answer a question about a project (Ask mode)
   */
  async askProjectQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { question, context: reqContext, persist } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }
      
      // Retrieve complete project information
      const project = await this.projectService.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Retrieve project materials
      let materials: any[] = [];
      try {
        materials = await this.materialService.listMaterials(id);
      } catch (error) {
        console.warn('No materials found for project:', id);
      }

      // Retrieve project wiring
      let wiring = null;
      try {
        wiring = await this.wiringService.getWiringForProject(id);
      } catch (error) {
        console.warn('No wiring found for project:', id);
      }
      
      const context = typeof reqContext === 'string' && reqContext.trim() ? reqContext : 'materials';

      // Retrieve recent chat history for Ask context
      const history = await this.projectService.getProjectMessages(id, context, 20);
      const chatHistory = history
        .reverse() // oldest first
        .map((m: any): { role: 'user' | 'assistant'; content: string } => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: String(m.content || '')
        }));
      
      // Ask AI to answer the question with complete context
      const answer = await this.aiService.answerProjectQuestion({
        project: project,
        materials: materials,
        wiring: wiring,
        userQuestion: question,
        chatHistory
      });
      
      // Optional persistence of Ask conversation
      // persist can be 'ai' or 'both'; context defaults to 'materials' if not provided
      if (persist === 'both') {
        try {
          await this.projectService.addMessageToProject(id, {
            context,
            content: question,
            sender: 'user',
            mode: 'ask',
            suggestions: null
          });
        } catch (e) {
          console.warn('Failed to persist user Ask message:', e);
        }
      }

      if (persist === 'ai' || persist === 'both') {
        try {
          await this.projectService.addMessageToProject(id, {
            context,
            content: answer,
            sender: 'ai',
            mode: 'ask',
            suggestions: null
          });
        } catch (e) {
          console.warn('Failed to persist AI Ask message:', e);
        }
      }
      
      res.json({ answer });
    } catch (error) {
      console.error('Error answering project question:', error);
      res.status(500).json({ error: 'Failed to answer project question' });
    }
  }

  /**
   * Update the status of a suggestion in a message
   */
  async updateSuggestionStatus(req: Request, res: Response) {
    try {
      const { id, messageId, suggestionId } = req.params;
      const { status } = req.body;
      
      if (!status || !['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "accepted" or "rejected"' });
      }
      
      console.log(`Updating suggestion ${suggestionId} in message ${messageId} to status: ${status}`);
      
      const updatedMessage = await this.projectService.updateSuggestionStatus(
        id, 
        messageId, 
        suggestionId, 
        status
      );
      
      if (!updatedMessage) {
        return res.status(404).json({ error: 'Message or suggestion not found' });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error updating suggestion status:', error);
      res.status(500).json({ error: 'Failed to update suggestion status' });
    }
  }
}
