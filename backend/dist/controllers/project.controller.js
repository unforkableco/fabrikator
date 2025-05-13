"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
const ai_service_1 = require("../services/ai.service");
const storage_service_1 = require("../services/storage.service");
const storageService = new storage_service_1.StorageService();
const aiService = new ai_service_1.AIService();
class ProjectController {
    async createProject(req, res) {
        try {
            const { name, description } = req.body;
            if (!name || !description) {
                return res.status(400).json({ error: 'Name and description are required' });
            }
            // Analyze project with AI
            const analysis = await aiService.analyzeProject(description);
            const newProject = {
                id: (0, uuid_1.v4)(),
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
                    status: types_1.MaterialStatus.SUGGESTED,
                })),
                selectedParts: [],
                conversations: [],
                status: types_1.ProjectStatus.PLANNING,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const createdProject = storageService.createProject(newProject);
            res.status(201).json(createdProject);
        }
        catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: 'Failed to create project' });
        }
    }
    async getProject(req, res) {
        const project = storageService.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    }
    async updateProject(req, res) {
        const updatedProject = storageService.updateProject(req.params.id, req.body);
        if (!updatedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(updatedProject);
    }
    async addMaterial(req, res) {
        const project = storageService.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const material = {
            ...req.body,
            id: (0, uuid_1.v4)(),
            status: types_1.MaterialStatus.APPROVED,
        };
        project.materials.push(material);
        project.updatedAt = new Date().toISOString();
        const updatedProject = storageService.updateProject(project.id, project);
        res.json(updatedProject);
    }
    async selectPart(req, res) {
        const project = storageService.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const part = {
            ...req.body,
            id: (0, uuid_1.v4)(),
            status: types_1.PartStatus.SELECTED,
        };
        project.selectedParts.push(part);
        project.updatedAt = new Date().toISOString();
        const updatedProject = storageService.updateProject(project.id, project);
        res.json(updatedProject);
    }
    async generateWiringPlan(req, res) {
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
        }
        catch (error) {
            console.error('Error generating wiring plan:', error);
            res.status(500).json({ error: 'Failed to generate wiring plan' });
        }
    }
    async processUserPrompt(req, res) {
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
                    id: (0, uuid_1.v4)(),
                    messages: [message],
                    context: 'general',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
            else {
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
                                id: (0, uuid_1.v4)(),
                                status: types_1.MaterialStatus.SUGGESTED,
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
        }
        catch (error) {
            console.error('Error processing user prompt:', error);
            res.status(500).json({ error: 'Failed to process user prompt' });
        }
    }
    async listProjects(req, res) {
        const projects = storageService.getAllProjects();
        res.json(projects);
    }
}
exports.ProjectController = ProjectController;
