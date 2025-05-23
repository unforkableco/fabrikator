import { Router } from 'express';
import { MaterialController } from './material.controller';

const router = Router();
const materialController = new MaterialController();

// Routes pour les matériaux
router.get('/project/:projectId', materialController.listMaterials);
router.post('/project/:projectId', materialController.createMaterial);
router.get('/:id', materialController.getMaterialById);
router.post('/:id/version', materialController.addVersion);
router.post('/:id/validate', materialController.validateVersion);
router.get('/:id/purchase-links', materialController.getPurchaseLinks);

export const materialRouter = router;
