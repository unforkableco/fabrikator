import { useState, useEffect, useCallback } from 'react';
import { Material, MaterialStatus } from '../../../shared/types';
import { api } from '../../../shared/services/api';

// Function to transform backend data to Material format
const transformBackendToMaterial = (backendComponent: any): Material => {
  const specs = backendComponent.currentVersion?.specs || {};
  
  return {
    id: backendComponent.id,
    name: specs.name || 'Unnamed Component',
    type: specs.type || 'Component',
    quantity: specs.quantity || 1,
    description: specs.description || '',
    requirements: specs.requirements || {},
    status: specs.status || MaterialStatus.SUGGESTED,
    projectId: backendComponent.projectId,
    currentVersionId: backendComponent.currentVersionId,
    currentVersion: backendComponent.currentVersion,
    versions: backendComponent.versions,
    aiSuggested: specs.createdBy === 'AI',
  };
};

export const useMaterials = (projectId?: string) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const backendComponents = await api.projects.getMaterials(projectId);
      
      // Transform backend data to Material format
      const transformedMaterials = backendComponents.map(transformBackendToMaterial);
      
      setMaterials(transformedMaterials);
      setError(null);
    } catch (materialError) {
      console.warn('Could not load materials:', materialError);
      setError('Failed to load materials');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchMaterials();
    }
  }, [projectId, fetchMaterials]);

  const generateInsights = async (description: string) => {
    if (!projectId) return;
    
    setIsGeneratingInsights(true);
    try {
      const suggestions = await api.projects.generateMaterialSuggestions(projectId, description);
      
      // Transform suggestions if necessary
      const transformedSuggestions = Array.isArray(suggestions) 
        ? suggestions.map((s: any) => s.component ? transformBackendToMaterial(s.component) : transformBackendToMaterial(s))
        : [];
      
      setMaterials(transformedSuggestions);
      setError(null);
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError('Failed to generate insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const addMaterial = async (material: Omit<Material, 'id'>) => {
    if (!projectId) return;
    
    try {
      await api.projects.addMaterial(projectId, material);
      await fetchMaterials(); // Refresh the list
      setError(null);
    } catch (err) {
      console.error('Failed to add material:', err);
      setError('Failed to add material');
    }
  };

  const approveMaterial = async (materialId: string) => {
    try {
      await api.projects.updateMaterialStatus(materialId, 'approve');
      await fetchMaterials(); // Refresh the list
      setError(null);
    } catch (err) {
      console.error('Failed to approve material:', err);
      setError('Failed to approve material');
    }
  };

  const rejectMaterial = async (materialId: string) => {
    try {
      await api.projects.updateMaterialStatus(materialId, 'reject');
      await fetchMaterials(); // Refresh the list
      setError(null);
    } catch (err) {
      console.error('Failed to reject material:', err);
      setError('Failed to reject material');
    }
  };

  const deleteMaterial = async (materialId: string) => {
    try {
      await api.projects.deleteMaterial(materialId);
      await fetchMaterials(); // Refresh the list
      setError(null);
    } catch (err) {
      console.error('Failed to delete material:', err);
      setError('Failed to delete material');
    }
  };

  const updateMaterial = async (materialId: string, material: Partial<Material>) => {
    try {
      await api.projects.updateMaterial(materialId, material);
      await fetchMaterials(); // Refresh the list
      setError(null);
    } catch (err) {
      console.error('Failed to update material:', err);
      setError('Failed to update material');
    }
  };

  return {
    materials,
    isGeneratingInsights,
    isLoading,
    error,
    generateInsights,
    addMaterial,
    approveMaterial,
    rejectMaterial,
    deleteMaterial,
    updateMaterial,
    refreshMaterials: fetchMaterials,
  };
}; 