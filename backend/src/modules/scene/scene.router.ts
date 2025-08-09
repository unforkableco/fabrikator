import { Router } from 'express';
import { SceneController } from './scene.controller';

const router = Router();
const sceneController = new SceneController();

// Scene CRUD routes
router.post('/', sceneController.createScene);
router.get('/:sceneId', sceneController.getScene);
router.put('/:sceneId', sceneController.updateScene);
router.delete('/:sceneId', sceneController.deleteScene);

// Project-specific routes
router.get('/project/:projectId', sceneController.getProjectScenes);

// Utility routes
router.post('/validate', sceneController.validateSceneGraph);

export default router;