import { Router } from 'express';
import { MaterialController } from './material.controller';

const router = Router();
const materialController = new MaterialController();

// Routes for materials
router.get('/project/:projectId', materialController.listMaterials.bind(materialController));
router.post('/project/:projectId', materialController.createMaterial.bind(materialController));
router.post('/project/:projectId/suggestions', materialController.generateSuggestions.bind(materialController));
router.post('/project/:projectId/preview-suggestions', materialController.previewSuggestions.bind(materialController));
router.post('/project/:projectId/add-from-suggestion', materialController.addMaterialFromSuggestion.bind(materialController));
router.get('/:id', materialController.getMaterialById.bind(materialController));
router.get('/:id/versions', materialController.getMaterialVersions.bind(materialController));
router.put('/:id', materialController.updateMaterialStatus.bind(materialController));
router.delete('/:id', materialController.deleteMaterial.bind(materialController));

export const materialRouter = router;
