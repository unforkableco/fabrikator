import { Router } from 'express';
import { ProjectController } from './project.controller';

const router = Router();
const projectController = new ProjectController();

// Routes pour les projets
router.get('/', projectController.getAllProjects.bind(projectController));
router.post('/', projectController.createProject.bind(projectController));
router.post('/from-prompt', projectController.createFromPrompt.bind(projectController));
router.get('/:id', projectController.getProjectById.bind(projectController));
router.put('/:id', projectController.updateProject.bind(projectController));
router.delete('/:id', projectController.deleteProject.bind(projectController));
router.post('/:id/messages', projectController.addMessageToProject.bind(projectController));
router.post('/:id/ask', projectController.askProjectQuestion.bind(projectController));

export const projectRouter = router;
