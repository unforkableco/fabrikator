import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { projectRouter } from './modules/project/project.router';
import { materialRouter } from './modules/material/material.router';
import wiringRouter from './modules/wiring/wiring.router';
import sceneRouter from './modules/scene/scene.router';
import design3dRouter from './modules/design3d/design3d.router';
import chatRouter from './modules/chat/chat.router';

// Create Express application
const app = express();

// Middlewares globaux
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/projects', projectRouter);
app.use('/api/materials', materialRouter);
app.use('/api/wiring', wiringRouter);
app.use('/api/scenes', sceneRouter);
app.use('/api/components3d', design3dRouter);
app.use('/api/chat', chatRouter);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Fabrikator API' });
});

export default app;
