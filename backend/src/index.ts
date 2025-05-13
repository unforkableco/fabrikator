import express from 'express';
import cors from 'cors';
import { ProjectController } from './controllers/project.controller';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize controllers
const projectController = new ProjectController();

// Project routes
app.post('/api/projects', projectController.createProject.bind(projectController));
app.get('/api/projects/:id', projectController.getProject.bind(projectController));
app.put('/api/projects/:id', projectController.updateProject.bind(projectController));
app.get('/api/projects', projectController.listProjects.bind(projectController));

// Material routes
app.post('/api/projects/:id/materials', projectController.addMaterial.bind(projectController));
app.post('/api/projects/:id/parts', projectController.selectPart.bind(projectController));

// AI interaction routes
app.post('/api/projects/:id/wiring', projectController.generateWiringPlan.bind(projectController));
app.post('/api/projects/:id/prompt', projectController.processUserPrompt.bind(projectController));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 