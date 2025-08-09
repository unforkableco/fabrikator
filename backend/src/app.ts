import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { projectRouter } from './modules/project/project.router';
import { materialRouter } from './modules/material/material.router';
import wiringRouter from './modules/wiring/wiring.router';
import sceneRouter from './modules/scene/scene.router';
import design3dRouter from './modules/design3d/design3d.router';
import chatRouter from './modules/chat/chat.router';
import { ProjectController } from './modules/project/project.controller';

// Create Express application
const app = express();

// Global middlewares
app.use(cors());
app.use(bodyParser.json());

// Initialize controllers
const projectController = new ProjectController();

// Routes
app.use('/api/projects', projectRouter);
app.use('/api/materials', materialRouter);
app.use('/api/wiring', wiringRouter);
app.use('/api/scenes', sceneRouter);
app.use('/api/components3d', design3dRouter);
app.use('/api/chat', chatRouter);

// Direct message routes
app.put('/api/messages/:messageId', projectController.updateMessage.bind(projectController));

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'fabrikator-backend' 
  });
});

// Default route
app.get('/', (_, res) => {
  res.json({ message: 'Fabrikator API' });
});

export default app;
