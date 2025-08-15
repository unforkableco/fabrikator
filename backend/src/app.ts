import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { projectRouter } from './modules/project/project.router';
import { materialRouter } from './modules/material/material.router';
import wiringRouter from './modules/wiring/wiring.router';
import sceneRouter from './modules/scene/scene.router';
import design3dRouter from './modules/design3d/design3d.router';
import chatRouter from './modules/chat/chat.router';
import designPreviewRouter from './modules/design-preview/design-preview.router';
import { ProjectController } from './modules/project/project.controller';

// Create Express application
const app = express();

// Global middlewares
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  'http://127.0.0.1:3000',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
// Explicitly handle preflight for all routes
app.options('*', cors());

app.use(bodyParser.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// Serve pipeline artifacts (STL/scripts) if needed
app.use('/scripts', express.static(path.join(process.cwd(), 'scripts')));

// Initialize controllers
const projectController = new ProjectController();

// Routes
app.use('/api/projects', projectRouter);
app.use('/api/materials', materialRouter);
app.use('/api/wiring', wiringRouter);
app.use('/api/scenes', sceneRouter);
app.use('/api/components3d', design3dRouter);
app.use('/api/chat', chatRouter);
app.use('/api/design-previews', designPreviewRouter);

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
