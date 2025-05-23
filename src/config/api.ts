import { Project, Material, SelectedPart, Message, ProjectChange } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const api = {
  projects: {
    create: async (data: { name: string; description: string }): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      return response.json();
    },

    get: async (id: string): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      return response.json();
    },

    update: async (id: string, data: Partial<Project>): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      return response.json();
    },

    list: async (): Promise<Project[]> => {
      const response = await fetch(`${API_BASE_URL}/api/projects`);

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      return response.json();
    },

    addMaterial: async (projectId: string, material: Partial<Material>): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(material),
      });

      if (!response.ok) {
        throw new Error('Failed to add material');
      }

      return response.json();
    },

    selectPart: async (projectId: string, part: Partial<SelectedPart>): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(part),
      });

      if (!response.ok) {
        throw new Error('Failed to select part');
      }

      return response.json();
    },

    generateWiringPlan: async (projectId: string): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/wiring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate wiring plan');
      }

      return response.json();
    },

    processPrompt: async (projectId: string, userInput: string): Promise<{
      message: Message;
      project: Project;
    }> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          context: 'user',
          content: userInput 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      // Get updated project after adding the message
      const updateResponse = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
      if (!updateResponse.ok) {
        throw new Error('Failed to fetch updated project');
      }
      
      const message = await response.json();
      const project = await updateResponse.json();
      
      return { message, project };
    },
  },
}; 