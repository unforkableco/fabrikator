import { Request, Response } from 'express';
import { 
  ProjectService, 
  MaterialService, 
  ConversationService, 
  SuggestionService 
} from '../services';

export class ProjectController {
  private projectService: ProjectService;
  private materialService: MaterialService;
  private conversationService: ConversationService;
  private suggestionService: SuggestionService;

  constructor() {
    this.projectService = new ProjectService();
    this.materialService = new MaterialService();
    this.conversationService = new ConversationService();
    this.suggestionService = new SuggestionService();
  }

  /**
   * Create a new project
   */
  async createProject(req: Request, res: Response) {
    try {
      const { name, description, requirements, materials, initialMessage } = req.body;
      
      const project = await this.projectService.createProject({
        name,
        description,
        requirements,
        materials,
        initialMessage
      });

      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  /**
   * Get a project by ID
   */
  async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await this.projectService.getProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  /**
   * Update a project
   */
  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, status } = req.body;
      
      const project = await this.projectService.updateProject(id, {
        name,
        description,
        status
      });
      
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  /**
   * List all projects
   */
  async listProjects(req: Request, res: Response) {
    try {
      const projects = await this.projectService.listProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({ error: 'Failed to list projects' });
    }
  }

  /**
   * Add material to a project
   */
  async addMaterial(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, quantity, description, requirements, status } = req.body;
      
      const result = await this.materialService.addMaterial(id, {
        name,
        type,
        quantity,
        description,
        requirements,
        status,
        createdBy: 'User'
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding material:', error);
      res.status(500).json({ error: 'Failed to add material' });
    }
  }

  /**
   * Select part for a project
   */
  async selectPart(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { componentId, status } = req.body;
      
      const result = await this.materialService.updateMaterial(componentId, {
        status,
        createdBy: 'User'
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error selecting part:', error);
      res.status(500).json({ error: 'Failed to select part' });
    }
  }

  /**
   * Generate wiring plan for a project
   */
  async generateWiringPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { prompt } = req.body;
      
      // Here you would normally call an AI service
      // For now, create a suggestion as a placeholder
      const suggestion = await this.suggestionService.createSuggestion({
        projectId: id,
        context: 'wiring',
        promptPayload: { prompt },
        responsePayload: { message: 'Wiring plan generation initiated' }
      });
      
      res.json({ 
        message: 'Wiring plan generation initiated',
        suggestionId: suggestion.id
      });
    } catch (error) {
      console.error('Error generating wiring plan:', error);
      res.status(500).json({ error: 'Failed to generate wiring plan' });
    }
  }

  /**
   * Process user prompt
   */
  async processUserPrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { prompt, context } = req.body;
      
      // Create a suggestion to track this prompt processing
      const suggestion = await this.suggestionService.createSuggestion({
        projectId: id,
        context: context || 'general',
        promptPayload: { prompt },
        responsePayload: { message: 'Prompt received and processing' }
      });
      
      // Create a new conversation message
      let conversationId = req.body.conversationId;
      
      if (!conversationId) {
        // Create a new conversation if needed
        const conversation = await this.conversationService.createConversation(
          id,
          context || 'user_prompt'
        );
        conversationId = conversation.id;
      }
      
      await this.conversationService.addMessage(conversationId, {
        role: 'user',
        content: prompt
      });
      
      res.json({
        message: 'Prompt received and being processed',
        suggestionId: suggestion.id,
        conversationId
      });
    } catch (error) {
      console.error('Error processing prompt:', error);
      res.status(500).json({ error: 'Failed to process prompt' });
    }
  }

  /**
   * Get conversations for a project
   */
  async getConversations(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const conversations = await this.conversationService.getProjectConversations(id);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  /**
   * Add message to a conversation
   */
  async addMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role, content } = req.body;
      
      const message = await this.conversationService.addMessage(id, {
        role,
        content
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  }
} 