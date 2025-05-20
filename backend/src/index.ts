import express from 'express';
import cors from 'cors';
import { ProjectController } from './controllers/project.controller';
import { RequirementController } from './controllers/requirement.controller';
import { ComponentController } from './controllers/component.controller';
import { Design3DController } from './controllers/design3d.controller';
import { WiringController } from './controllers/wiring.controller';
import { DocumentController } from './controllers/document.controller';
import { SuggestionController } from './controllers/suggestion.controller';
import { ConversationController } from './controllers/conversation.controller';
import { prisma } from './services/prisma.service';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize controllers
const projectController = new ProjectController();
const requirementController = new RequirementController();
const componentController = new ComponentController();
const design3DController = new Design3DController();
const wiringController = new WiringController();
const documentController = new DocumentController();
const suggestionController = new SuggestionController();
const conversationController = new ConversationController();

// Project routes
app.post('/api/projects', projectController.createProject.bind(projectController));
app.get('/api/projects/:id', projectController.getProject.bind(projectController));
app.put('/api/projects/:id', projectController.updateProject.bind(projectController));
app.get('/api/projects', projectController.listProjects.bind(projectController));

// Requirement routes
app.get('/api/projects/:projectId/requirements', requirementController.listRequirements.bind(requirementController));
app.post('/api/projects/:projectId/requirements', requirementController.createRequirement.bind(requirementController));
app.post('/api/requirements/:requirementId/versions', requirementController.addVersion.bind(requirementController));
app.put('/api/requirements/:requirementId/validate', requirementController.validateVersion.bind(requirementController));

// Component routes
app.get('/api/projects/:projectId/components', componentController.listComponents.bind(componentController));
app.post('/api/projects/:projectId/components', componentController.createComponent.bind(componentController));
app.post('/api/components/:componentId/versions', componentController.addVersion.bind(componentController));
app.put('/api/components/:componentId/validate', componentController.validateVersion.bind(componentController));

// 3D Design routes
app.get('/api/projects/:projectId/designs3d', design3DController.listDesigns.bind(design3DController));
app.post('/api/projects/:projectId/designs3d', design3DController.createDesign.bind(design3DController));
app.post('/api/designs3d/:designId/versions', design3DController.addVersion.bind(design3DController));
app.put('/api/designs3d/:designId/validate', design3DController.validateVersion.bind(design3DController));

// Wiring routes
app.get('/api/projects/:projectId/wirings', wiringController.listWirings.bind(wiringController));
app.post('/api/projects/:projectId/wirings', wiringController.createWiring.bind(wiringController));
app.post('/api/wirings/:wiringId/versions', wiringController.addVersion.bind(wiringController));
app.put('/api/wirings/:wiringId/validate', wiringController.validateVersion.bind(wiringController));

// Document routes
app.get('/api/projects/:projectId/documents', documentController.listDocuments.bind(documentController));
app.post('/api/projects/:projectId/documents', documentController.createDocument.bind(documentController));
app.post('/api/documents/:documentId/versions', documentController.addVersion.bind(documentController));
app.put('/api/documents/:documentId/validate', documentController.validateVersion.bind(documentController));

// Suggestion routes
app.get('/api/projects/:projectId/suggestions', suggestionController.listSuggestions.bind(suggestionController));
app.post('/api/projects/:projectId/suggestions', suggestionController.createSuggestion.bind(suggestionController));
app.get('/api/suggestions/:suggestionId', suggestionController.getSuggestion.bind(suggestionController));
app.put('/api/suggestions/:suggestionId/accept', suggestionController.acceptSuggestion.bind(suggestionController));
app.put('/api/suggestions/:suggestionId/reject', suggestionController.rejectSuggestion.bind(suggestionController));
app.post('/api/suggestions/:suggestionId/items', suggestionController.addSuggestionItem.bind(suggestionController));

// Conversation routes
app.get('/api/projects/:projectId/conversations', conversationController.listConversations.bind(conversationController));
app.post('/api/projects/:projectId/conversations', conversationController.createConversation.bind(conversationController));
app.get('/api/conversations/:conversationId', conversationController.getConversation.bind(conversationController));
app.post('/api/conversations/:conversationId/messages', conversationController.addMessage.bind(conversationController));
app.get('/api/conversations/:conversationId/messages', conversationController.getMessages.bind(conversationController));

// AI interaction routes (using suggestion controller)
app.post('/api/projects/:id/wiring', projectController.generateWiringPlan.bind(projectController));
app.post('/api/projects/:id/prompt', projectController.processUserPrompt.bind(projectController));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Proper shutdown handling
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await prisma.$disconnect();
  console.log('Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await prisma.$disconnect();
  console.log('Database connections closed');
  process.exit(0);
}); 