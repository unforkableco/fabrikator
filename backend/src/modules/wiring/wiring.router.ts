import { Router } from 'express';
import { WiringController } from './wiring.controller';

const router = Router();
const wiringController = new WiringController();

// Routes pour les plans de câblage
router.get('/project/:projectId', wiringController.getWiringForProject.bind(wiringController));
router.post('/project/:projectId', wiringController.createWiring.bind(wiringController));
router.get('/:id', wiringController.getWiringById.bind(wiringController));
router.post('/:id/versions', wiringController.addVersion.bind(wiringController));
router.get('/:id/versions', wiringController.getWiringVersions.bind(wiringController));

// Nouvelles routes pour l'IA et la validation
router.post('/project/:projectId/suggestions', wiringController.generateSuggestions.bind(wiringController));
router.post('/project/:projectId/chat', wiringController.handleChatMessage.bind(wiringController));
router.post('/project/:projectId/validate', wiringController.validateWiring.bind(wiringController));

export default router;
