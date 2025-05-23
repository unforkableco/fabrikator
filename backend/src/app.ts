import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { projectRouter } from './modules/project/project.router';
import { materialRouter } from './modules/material/material.router';
import { wiringRouter } from './modules/wiring/wiring.router';

// Créer l'application Express
const app = express();

// Middlewares globaux
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/projects', projectRouter);
app.use('/api/materials', materialRouter);
app.use('/api/wiring', wiringRouter);

// Route par défaut
app.get('/', (req, res) => {
  res.json({ message: 'Fabrikator API' });
});

export default app;
