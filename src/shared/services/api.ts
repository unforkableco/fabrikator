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
      const response = await apiClient.put(`/materials/${materialId}`, {
        action: 'update',
        ...material
      });
      return response.data;
    },

    generateMaterialSuggestions: async (projectId: string, description: string): Promise<Material[]> => {
      const response = await apiClient.post(`/materials/project/${projectId}/suggestions`, {
        prompt: description,
      });
      return response.data;
    },

    previewMaterialSuggestions: async (projectId: string, description: string): Promise<{components: any[]}> => {
      const response = await apiClient.post(`/materials/project/${projectId}/preview-suggestions`, {
        prompt: description,
      });
      return response.data;
    },

    addMaterialFromSuggestion: async (projectId: string, suggestion: any): Promise<Material> => {
      const response = await apiClient.post(`/materials/project/${projectId}/add-from-suggestion`, {
        suggestion,
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

    // Gestion des messages de chat
    getChatMessages: async (projectId: string, context: string = 'materials', limit: number = 10): Promise<Message[]> => {
      const response = await apiClient.get(`/projects/${projectId}/messages`, {
        params: { context, limit }
      });
      return response.data;
    },

    sendChatMessage: async (projectId: string, message: {
      context: string;
      content: string;
      sender: string;
      mode: string;
      suggestions?: any;
    }): Promise<Message> => {
      const response = await apiClient.post(`/projects/${projectId}/messages`, message);
      return response.data;
    },

    updateChatMessage: async (messageId: string, updates: {
      suggestions?: any;
    }): Promise<Message> => {
      const response = await apiClient.put(`/messages/${messageId}`, updates);
      return response.data;
    },

    // Legacy method for compatibility
    getMessages: async (projectId: string): Promise<Message[]> => {
      const response = await apiClient.get(`/projects/${projectId}/messages`);
      return response.data;
    },

    sendMessage: async (projectId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
      const response = await apiClient.post(`/projects/${projectId}/messages`, message);
      return response.data;
    },

    updateSuggestionStatus: async (projectId: string, messageId: string, suggestionId: string, status: 'accepted' | 'rejected'): Promise<Message> => {
      const response = await apiClient.put(`/projects/${projectId}/messages/${messageId}/suggestions/${suggestionId}`, {
        status
      });
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
    askQuestion: async (projectId: string, question: string): Promise<{answer: string}> => {
      const response = await apiClient.post(`/projects/${projectId}/ask`, {
        question: question
      });
      return response.data;
    },

    // AI Chat - Agent Mode (with material modifications)
    sendAgentMessage: async (projectId: string, message: string): Promise<any> => {
      const response = await apiClient.post(`/materials/project/${projectId}/suggestions`, {
        prompt: message
      });
      return response.data;
    },
  },

  // Wiring API endpoints
  wiring: {
    // Get wiring diagram for a project
    getWiringForProject: async (projectId: string): Promise<any> => {
      const response = await apiClient.get(`/wiring/project/${projectId}`);
      return response.data;
    },

    // Create new wiring diagram
    createWiring: async (projectId: string, wiringData: any): Promise<any> => {
      const response = await apiClient.post(`/wiring/project/${projectId}`, wiringData);
      return response.data;
    },

    // Get wiring diagram by ID
    getWiringById: async (id: string): Promise<any> => {
      const response = await apiClient.get(`/wiring/${id}`);
      return response.data;
    },

    // Add new version to existing wiring diagram
    addVersion: async (wiringSchemaId: string, versionData: any): Promise<any> => {
      const response = await apiClient.put(`/wiring/${wiringSchemaId}`, versionData);
      return response.data;
    },

    // Get versions of a wiring diagram
    getWiringVersions: async (wiringSchemaId: string): Promise<any> => {
      const response = await apiClient.get(`/wiring/${wiringSchemaId}/versions`);
      return response.data;
    },

    // Generate wiring suggestions using AI
    generateWiringSuggestions: async (projectId: string, prompt: string, currentDiagram?: any): Promise<any> => {
      const response = await apiClient.post(`/wiring/project/${projectId}/suggestions`, {
        prompt,
        currentDiagram
      });
      return response.data;
    },

    // Validate wiring diagram
    validateWiring: async (projectId: string, diagram: any): Promise<any> => {
      const response = await apiClient.post(`/wiring/project/${projectId}/validate`, {
        diagram
      });
      return response.data;
    },
  },

  // Design Preview API endpoints
  designPreviews: {
    // Get design preview for a project
    getDesignPreview: async (projectId: string): Promise<any> => {
      const response = await apiClient.get(`/design-previews/project/${projectId}`);
      return response.data;
    },

    // Generate new design previews
    generateDesignPreviews: async (projectId: string): Promise<any> => {
      const response = await apiClient.post(`/design-previews/project/${projectId}/generate`);
      return response.data;
    },

    // Select a design option
    selectDesignOption: async (designPreviewId: string, designOptionId: string): Promise<any> => {
      const response = await apiClient.post('/design-previews/select', {
        designPreviewId,
        designOptionId
      });
      return response.data;
    },

    // Iterate upon a base design to generate 3 similar options
    iterate: async (projectId: string, baseDesignOptionId: string): Promise<any> => {
      const response = await apiClient.post('/design-previews/iterate', {
        projectId,
        baseDesignOptionId,
      });
      return response.data;
    },

    // Delete design preview
    deleteDesignPreview: async (designPreviewId: string): Promise<void> => {
      await apiClient.delete(`/design-previews/${designPreviewId}`);
    },

    // Start AI-assisted CAD generation from the selected design
    startCadGeneration: async (projectId: string): Promise<any> => {
      const response = await apiClient.post(`/design-previews/project/${projectId}/cad/generate`);
      return response.data;
    },

    // Get latest CAD generation with parts for a project
    getLatestCad: async (projectId: string): Promise<any> => {
      const response = await apiClient.get(`/design-previews/project/${projectId}/cad/latest`);
      return response.data;
    },
  },
};

// Generic API call function for custom endpoints
export const apiCall = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any, headers?: any) => {
  // Remove leading /api if present since apiClient baseURL already includes it
  const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
  
  const config: any = {
    method,
    url: cleanEndpoint,
    ...headers && { headers }
  };

  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      config.data = data;
      // Remove content-type to let browser set it for FormData
      config.headers = { ...config.headers };
      delete config.headers['Content-Type'];
    } else {
      config.data = data;
    }
  }

  const response = await apiClient(config);
  return response.data;
};

export default api; 