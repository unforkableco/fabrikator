"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const project_controller_1 = require("./controllers/project.controller");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize controllers
const projectController = new project_controller_1.ProjectController();
// Project routes
app.post('/api/projects', projectController.createProject.bind(projectController));
app.get('/api/projects/:id', projectController.getProject.bind(projectController));
app.put('/api/projects/:id', projectController.updateProject.bind(projectController));
app.get('/api/projects', projectController.listProjects.bind(projectController));
// Material routes
app.post('/api/projects/:id/materials', projectController.addMaterial.bind(projectController));
app.post('/api/projects/:id/parts', projectController.selectPart.bind(projectController));
// AI interaction routes
app.post('/api/projects/:id/wiring', projectController.generateWiringPlan.bind(projectController));
app.post('/api/projects/:id/prompt', projectController.processUserPrompt.bind(projectController));
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
