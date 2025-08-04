import { useState, useEffect, useCallback } from 'react';
import { Scene3D } from '../../../shared/types';
import { apiCall } from '../../../shared/services/api';

export interface SceneGraphNode {
  id: string;
  name: string;
  type: 'DESIGN' | 'FUNCTIONAL' | 'ELECTRONIC' | 'MECHANICAL';
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  componentId?: string;
  children: SceneGraphNode[];
  metadata?: any;
}

export interface Scene3DState {
  scene: Scene3D | null;
  sceneGraph: SceneGraphNode | null;
  selectedNodes: string[];
  isLoading: boolean;
  error: string | null;
}

export const useScene3D = (projectId: string) => {
  const [state, setState] = useState<Scene3DState>({
    scene: null,
    sceneGraph: null,
    selectedNodes: [],
    isLoading: false,
    error: null
  });

  const loadProjectScenes = useCallback(async () => {
    if (!projectId) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiCall(`/api/scenes/project/${projectId}`, 'GET');
      const scenes = response.data;
      
      // Load the first scene or create one if none exists
      if (scenes.length > 0) {
        await loadScene(scenes[0].id);
      } else {
        await createScene('Main Scene');
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load project scenes' 
      }));
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadScene = useCallback(async (sceneId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiCall(`/api/scenes/${sceneId}`, 'GET');
      const scene = response.data;
      
      setState(prev => ({
        ...prev,
        scene,
        sceneGraph: scene.currentVersion?.sceneGraph?.root || null,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load scene' 
      }));
    }
  }, []);

  const createScene = useCallback(async (name: string) => {
    if (!projectId) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiCall('/api/scenes', 'POST', {
        projectId,
        name,
        createdBy: 'user' // TODO: Get from auth context
      });
      
      const scene = response.data;
      setState(prev => ({
        ...prev,
        scene,
        sceneGraph: scene.currentVersion?.sceneGraph?.root || null,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to create scene' 
      }));
    }
  }, [projectId]);

  const updateSceneGraph = useCallback(async (newSceneGraph: SceneGraphNode) => {
    if (!state.scene) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiCall(`/api/scenes/${state.scene.id}`, 'PUT', {
        sceneGraph: { root: newSceneGraph },
        createdBy: 'user' // TODO: Get from auth context
      });
      
      const updatedScene = response.data;
      setState(prev => ({
        ...prev,
        scene: updatedScene,
        sceneGraph: newSceneGraph,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to update scene' 
      }));
    }
  }, [state.scene]);

  const addNodeToScene = useCallback((node: Omit<SceneGraphNode, 'id'>, parentId?: string) => {
    if (!state.sceneGraph) return;
    
    const newNode: SceneGraphNode = {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const addToParent = (current: SceneGraphNode): SceneGraphNode => {
      if (!parentId || current.id === parentId) {
        return {
          ...current,
          children: [...current.children, newNode]
        };
      }
      
      return {
        ...current,
        children: current.children.map(addToParent)
      };
    };
    
    const newSceneGraph = addToParent(state.sceneGraph);
    updateSceneGraph(newSceneGraph);
  }, [state.sceneGraph, updateSceneGraph]);

  const updateNode = useCallback((nodeId: string, updates: Partial<SceneGraphNode>) => {
    if (!state.sceneGraph) return;
    
    const updateInTree = (current: SceneGraphNode): SceneGraphNode => {
      if (current.id === nodeId) {
        return { ...current, ...updates };
      }
      
      return {
        ...current,
        children: current.children.map(updateInTree)
      };
    };
    
    const newSceneGraph = updateInTree(state.sceneGraph);
    updateSceneGraph(newSceneGraph);
  }, [state.sceneGraph, updateSceneGraph]);

  const removeNode = useCallback((nodeId: string) => {
    if (!state.sceneGraph) return;
    
    const removeFromTree = (current: SceneGraphNode): SceneGraphNode => {
      return {
        ...current,
        children: current.children
          .filter(child => child.id !== nodeId)
          .map(removeFromTree)
      };
    };
    
    const newSceneGraph = removeFromTree(state.sceneGraph);
    updateSceneGraph(newSceneGraph);
    
    // Remove from selection if selected
    setState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.filter(id => id !== nodeId)
    }));
  }, [state.sceneGraph, updateSceneGraph]);

  const selectNode = useCallback((nodeId: string, multiSelect = false) => {
    setState(prev => ({
      ...prev,
      selectedNodes: multiSelect 
        ? prev.selectedNodes.includes(nodeId)
          ? prev.selectedNodes.filter(id => id !== nodeId)
          : [...prev.selectedNodes, nodeId]
        : [nodeId]
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedNodes: [] }));
  }, []);

  // Load scenes on mount
  useEffect(() => {
    loadProjectScenes();
  }, [loadProjectScenes]);

  return {
    ...state,
    loadScene,
    createScene,
    updateSceneGraph,
    addNodeToScene,
    updateNode,
    removeNode,
    selectNode,
    clearSelection
  };
};