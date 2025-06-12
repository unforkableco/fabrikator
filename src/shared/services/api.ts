import axios from 'axios';
import { Project, Material, ProjectRequirements, Message } from '../types/index';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  projects: {
    getAll: async (): Promise<Project[]> => {
      const response = await apiClient.get('/projects');
      return response.data;
    },

    get: async (id: string): Promise<Project> => {
      const response = await apiClient.get(`/projects/${id}`);
      return response.data;
    },

    create: async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
      const response = await apiClient.post('/projects', project);
      return response.data;
    },

    update: async (id: string, project: Partial<Project>): Promise<Project> => {
      const response = await apiClient.put(`/projects/${id}`, project);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await apiClient.delete(`/projects/${id}`);
    },

    getMaterials: async (projectId: string): Promise<Material[]> => {
      const response = await apiClient.get(`/materials/project/${projectId}`);
      return response.data;
    },

    addMaterial: async (projectId: string, material: Omit<Material, 'id'>): Promise<Material> => {
      const response = await apiClient.post(`/materials/project/${projectId}`, material);
      return response.data;
    },

    updateMaterial: async (materialId: string, material: Partial<Material>): Promise<Material> => {
      const response = await apiClient.put(`/materials/${materialId}`, material);
      return response.data;
    },

    generateMaterialSuggestions: async (projectId: string, description: string): Promise<Material[]> => {
      const response = await apiClient.post(`/materials/project/${projectId}/suggestions`, {
        prompt: description,
      });
      return response.data;
    },

    updateMaterialStatus: async (materialId: string, status: string): Promise<Material> => {
      const response = await apiClient.put(`/materials/${materialId}`, { action: status });
      return response.data;
    },

    deleteMaterial: async (materialId: string): Promise<void> => {
      await apiClient.delete(`/materials/${materialId}`);
    },

    getMessages: async (projectId: string): Promise<Message[]> => {
      const response = await apiClient.get(`/projects/${projectId}/messages`);
      return response.data;
    },

    sendMessage: async (projectId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
      const response = await apiClient.post(`/projects/${projectId}/messages`, message);
      return response.data;
    },

    analyzeRequirements: async (description: string): Promise<ProjectRequirements> => {
      const response = await apiClient.post('/analyze-requirements', { description });
      return response.data;
    },

    processPrompt: async (projectId: string, prompt: string): Promise<{ project: Project }> => {
      const response = await apiClient.post(`/projects/${projectId}/process-prompt`, { prompt });
      return response.data;
    },

    createFromPrompt: async (prompt: string): Promise<Project> => {
      const response = await apiClient.post('/projects/create-from-prompt', { prompt });
      return response.data;
    },

    // Chat IA - Mode Ask (simple Q&A)
    sendChatMessage: async (projectId: string, message: string): Promise<any> => {
      const response = await apiClient.post(`/projects/${projectId}/messages`, {
        context: 'chat_ask',
        content: message,
        role: 'user'
      });
      return response.data;
    },

    // Chat IA - Mode Agent (avec modifications de matériaux)
    sendAgentMessage: async (projectId: string, message: string): Promise<any> => {
      const response = await apiClient.post(`/materials/project/${projectId}/suggestions`, {
        prompt: message
      });
      return response.data;
    },
  },
};

export default api; 