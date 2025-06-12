import { useState, useEffect } from 'react';
import { Project } from '../../../shared/types';
import { api } from '../../../shared/services/api';

export const useProject = (projectId?: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        const data = await api.projects.get(projectId);
        setProject(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const updateProject = async (updatedProject: Project) => {
    if (!projectId) return;
    
    try {
      const data = await api.projects.update(projectId, updatedProject);
      setProject(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const refetch = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      const data = await api.projects.get(projectId);
      setProject(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    project,
    isLoading,
    error,
    updateProject,
    refetch,
  };
}; 