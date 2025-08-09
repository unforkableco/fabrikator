import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { projectRouter } from './modules/project/project.router';
import { materialRouter } from './modules/material/material.router';
import wiringRouter from './modules/wiring/wiring.router';

// Create Express application
const app = express();

// Middlewares globaux
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/projects', projectRouter);
app.use('/api/materials', materialRouter);
app.use('/api/wiring', wiringRouter);

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'fabrikator-backend' 
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Fabrikator API' });
});

export default app;
