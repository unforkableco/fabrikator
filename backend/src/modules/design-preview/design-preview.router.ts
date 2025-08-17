import { Router } from 'express';
import { DesignPreviewController } from './design-preview.controller';
import { startCadGeneration, retryCadPart } from './design-preview_cad.controller';

const router = Router();
const designPreviewController = new DesignPreviewController();

// Get design preview for a project
router.get('/project/:projectId', designPreviewController.getDesignPreview.bind(designPreviewController));

// Generate new design previews
router.post('/project/:projectId/generate', designPreviewController.generateDesignPreviews.bind(designPreviewController));

// Select a design option
router.post('/select', designPreviewController.selectDesignOption.bind(designPreviewController));

// Iterate upon a base design to propose 3 similar options
router.post('/iterate', designPreviewController.iterate.bind(designPreviewController));

// Delete design preview
router.delete('/:designPreviewId', designPreviewController.deleteDesignPreview.bind(designPreviewController));

// Start AI-assisted CAD generation from the selected design
router.post('/project/:projectId/cad/generate', startCadGeneration);

// Get latest CAD generation + parts
router.get('/project/:projectId/cad/latest', designPreviewController.getLatestCad.bind(designPreviewController));

// Serve STL for a part (DB-first)
router.get('/cad/parts/:partId/stl', designPreviewController.getPartStl.bind(designPreviewController));

// Retry a single CAD part generation (include previous error in prompt)
router.post('/cad/parts/:partId/retry', retryCadPart);

export default router;
