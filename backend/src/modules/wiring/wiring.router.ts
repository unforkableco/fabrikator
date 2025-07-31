import { Router } from 'express';
import { WiringController } from './wiring.controller';

const router = Router();
const wiringController = new WiringController();

// Routes for wiring
router.get('/project/:projectId', wiringController.getWiringForProject.bind(wiringController));
router.post('/project/:projectId', wiringController.createWiring.bind(wiringController));
router.get('/:id', wiringController.getWiringById.bind(wiringController));
router.put('/:id', wiringController.addVersion.bind(wiringController));
router.get('/:id/versions', wiringController.getWiringVersions.bind(wiringController));

// Routes for AI suggestions and validation
router.post('/project/:projectId/suggestions', wiringController.generateWiringSuggestions.bind(wiringController));
router.post('/project/:projectId/validate', wiringController.validateWiring.bind(wiringController));

export default router;
