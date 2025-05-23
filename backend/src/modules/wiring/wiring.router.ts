import { Router } from 'express';
import { WiringController } from './wiring.controller';

const router = Router();
const wiringController = new WiringController();

// Routes pour le câblage
router.get('/project/:projectId', wiringController.getWiringForProject);
router.post('/project/:projectId', wiringController.createWiring);
router.get('/:id', wiringController.getWiringById);
router.post('/:id/version', wiringController.addVersion);
router.get('/:id/versions', wiringController.getWiringVersions);

export const wiringRouter = router;
