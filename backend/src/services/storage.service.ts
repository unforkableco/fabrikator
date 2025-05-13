import fs from 'fs';
import path from 'path';
import { Project } from '../types';

export class StorageService {
  private readonly dataPath: string;
  private projects: Project[] = [];

  constructor() {
    this.dataPath = path.join(__dirname, '../../data');
    this.ensureDataDirectory();
    this.loadProjects();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  private loadProjects() {
    const filePath = path.join(this.dataPath, 'projects.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      this.projects = JSON.parse(data);
    }
  }

  private saveProjects() {
    const filePath = path.join(this.dataPath, 'projects.json');
    fs.writeFileSync(filePath, JSON.stringify(this.projects, null, 2));
  }

  getAllProjects(): Project[] {
    return [...this.projects];
  }

  getProject(id: string): Project | undefined {
    return this.projects.find(p => p.id === id);
  }

  createProject(project: Project): Project {
    this.projects.push(project);
    this.saveProjects();
    return project;
  }

  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    const updatedProject = {
      ...this.projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.projects[index] = updatedProject;
    this.saveProjects();
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.projects.splice(index, 1);
    this.saveProjects();
    return true;
  }
} 