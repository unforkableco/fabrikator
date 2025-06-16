import { Request, Response } from 'express';
import { WiringService } from './wiring.service';
import { AIService } from '../../services/ai.service';
import { prisma } from '../../prisma/prisma.service';

export class WiringController {
  private wiringService: WiringService;
  private aiService: AIService;

  constructor() {
    this.wiringService = new WiringService();
    this.aiService = new AIService();
  }

  /**
   * Récupère le plan de câblage pour un projet
   */
  async getWiringForProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const wiring = await this.wiringService.getWiringForProject(projectId);
      res.json(wiring);
    } catch (error) {
      console.error('Error getting wiring for project:', error);
      res.status(500).json({ error: 'Failed to get wiring plan' });
    }
  }

  /**
   * Crée un nouveau plan de câblage pour un projet
   */
  async createWiring(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const wiringData = req.body;
      const wiring = await this.wiringService.createWiring(projectId, wiringData);
      res.status(201).json(wiring);
    } catch (error) {
      console.error('Error creating wiring plan:', error);
      res.status(500).json({ error: 'Failed to create wiring plan' });
    }
  }

  /**
   * Récupère un plan de câblage par son ID
   */
  async getWiringById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const wiring = await this.wiringService.getWiringById(id);
      
      if (!wiring) {
        return res.status(404).json({ error: 'Wiring plan not found' });
      }
      
      res.json(wiring);
    } catch (error) {
      console.error('Error getting wiring plan:', error);
      res.status(500).json({ error: 'Failed to get wiring plan' });
    }
  }

  /**
   * Ajoute une nouvelle version à un plan de câblage existant
   */
  async addVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versionData = req.body;
      const result = await this.wiringService.addVersion(id, versionData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding wiring version:', error);
      res.status(500).json({ error: 'Failed to add wiring version' });
    }
  }

  /**
   * Récupère les versions d'un plan de câblage
   */
  async getWiringVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions = await this.wiringService.getWiringVersions(id);
      
      if (!versions) {
        return res.status(404).json({ error: 'Wiring plan not found' });
      }
      
      res.json(versions);
    } catch (error) {
      console.error('Error getting wiring versions:', error);
      res.status(500).json({ error: 'Failed to get wiring versions' });
    }
  }

  /**
   * Génère des suggestions de câblage via l'IA
   */
  async generateSuggestions(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { prompt } = req.body;
      
      // Récupérer les infos du projet
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Obtenir le câblage actuel et les matériaux
      const currentWiring = await this.wiringService.getWiringForProject(projectId);
      const materials = await prisma.component.findMany({
        where: { projectId },
        include: { currentVersion: true }
      });
      
      const suggestions = await this.aiService.suggestWiring({
        name: project.name || 'Unnamed Project',
        description: project.description || '',
        userPrompt: prompt || '',
        currentWiring: currentWiring,
        availableMaterials: materials
      });
      
      if (!suggestions || !Array.isArray(suggestions.connections)) {
        return res.status(500).json({ 
          error: 'Failed to generate wiring suggestions' 
        });
      }
      
      res.json(suggestions);
    } catch (error) {
      console.error('Error generating wiring suggestions:', error);
      res.status(500).json({ error: 'Failed to generate wiring suggestions' });
    }
  }

  /**
   * Traite les réponses du chat pour le câblage
   */
  async handleChatMessage(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { message, mode } = req.body;
      
      // Récupérer le contexte du projet
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const currentWiring = await this.wiringService.getWiringForProject(projectId);
      const materials = await prisma.component.findMany({
        where: { projectId },
        include: { currentVersion: true }
      });
      
      let response;
      
      if (mode === 'agent') {
        // Mode agent - génère des suggestions concrètes
        response = await this.aiService.suggestWiring({
          name: project.name || 'Unnamed Project',
          description: project.description || '',
          userPrompt: message,
          currentWiring: currentWiring,
          availableMaterials: materials
        });
      } else {
        // Mode ask - répond aux questions sur le câblage
        response = await this.aiService.answerWiringQuestion({
          question: message,
          projectContext: {
            name: project.name || 'Unnamed Project',
            description: project.description || '',
            currentWiring: currentWiring,
            availableMaterials: materials
          }
        });
      }
      
      res.json(response);
    } catch (error) {
      console.error('Error handling wiring chat message:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  }

  /**
   * Valide une configuration de câblage
   */
  async validateWiring(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { connections, diagram } = req.body;
      
      const validation = await this.wiringService.validateWiring(projectId, {
        connections,
        diagram
      });
      
      res.json(validation);
    } catch (error) {
      console.error('Error validating wiring:', error);
      res.status(500).json({ error: 'Failed to validate wiring' });
    }
  }
}
