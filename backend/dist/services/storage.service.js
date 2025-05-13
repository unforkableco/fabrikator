"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class StorageService {
    constructor() {
        this.projects = [];
        this.dataPath = path_1.default.join(__dirname, '../../data');
        this.ensureDataDirectory();
        this.loadProjects();
    }
    ensureDataDirectory() {
        if (!fs_1.default.existsSync(this.dataPath)) {
            fs_1.default.mkdirSync(this.dataPath, { recursive: true });
        }
    }
    loadProjects() {
        const filePath = path_1.default.join(this.dataPath, 'projects.json');
        if (fs_1.default.existsSync(filePath)) {
            const data = fs_1.default.readFileSync(filePath, 'utf-8');
            this.projects = JSON.parse(data);
        }
    }
    saveProjects() {
        const filePath = path_1.default.join(this.dataPath, 'projects.json');
        fs_1.default.writeFileSync(filePath, JSON.stringify(this.projects, null, 2));
    }
    getAllProjects() {
        return [...this.projects];
    }
    getProject(id) {
        return this.projects.find(p => p.id === id);
    }
    createProject(project) {
        this.projects.push(project);
        this.saveProjects();
        return project;
    }
    updateProject(id, updates) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index === -1)
            return undefined;
        const updatedProject = {
            ...this.projects[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        this.projects[index] = updatedProject;
        this.saveProjects();
        return updatedProject;
    }
    deleteProject(id) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index === -1)
            return false;
        this.projects.splice(index, 1);
        this.saveProjects();
        return true;
    }
}
exports.StorageService = StorageService;
