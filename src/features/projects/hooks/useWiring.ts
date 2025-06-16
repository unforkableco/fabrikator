import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface WiringData {
  connections: any[];
  diagram: any;
}

interface UseWiringReturn {
  wiring: any;
  loading: boolean;
  error: Error | null;
  createWiring: (wiringData: WiringData) => Promise<void>;
  updateWiring: (wiringData: WiringData) => Promise<void>;
  validateWiring: (wiringData: WiringData) => Promise<any>;
  generateSuggestions: (prompt: string) => Promise<any>;
  handleChatMessage: (message: string, mode: 'ask' | 'agent') => Promise<any>;
  refreshWiring: () => Promise<void>;
}

export const useWiring = (projectId: string): UseWiringReturn => {
  const [wiring, setWiring] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Charger le câblage pour un projet
  const loadWiring = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/wiring/project/${projectId}`);
      setWiring(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Pas de câblage existant, ce n'est pas une erreur
        setWiring(null);
      } else {
        console.error('Erreur lors du chargement du câblage:', err);
        setError(new Error(err.response?.data?.error || 'Erreur lors du chargement du câblage'));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Charger le câblage au montage
  useEffect(() => {
    loadWiring();
  }, [loadWiring]);

  // Créer un nouveau câblage
  const createWiring = useCallback(async (wiringData: WiringData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/wiring/project/${projectId}`, {
        ...wiringData,
        createdBy: 'User'
      });
      
      setWiring(response.data.wiringSchema);
    } catch (err: any) {
      console.error('Erreur lors de la création du câblage:', err);
      setError(new Error(err.response?.data?.error || 'Erreur lors de la création du câblage'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Mettre à jour le câblage
  const updateWiring = useCallback(async (wiringData: WiringData) => {
    if (!wiring?.id) {
      return createWiring(wiringData);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/wiring/${wiring.id}/versions`, {
        ...wiringData,
        createdBy: 'User'
      });
      
      setWiring(response.data.wiringSchema);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du câblage:', err);
      setError(new Error(err.response?.data?.error || 'Erreur lors de la mise à jour du câblage'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wiring?.id, createWiring]);

  // Valider le câblage
  const validateWiring = useCallback(async (wiringData: WiringData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/wiring/project/${projectId}/validate`, wiringData);
      return response.data;
    } catch (err: any) {
      console.error('Erreur lors de la validation du câblage:', err);
      throw new Error(err.response?.data?.error || 'Erreur lors de la validation du câblage');
    }
  }, [projectId]);

  // Générer des suggestions IA
  const generateSuggestions = useCallback(async (prompt: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/wiring/project/${projectId}/suggestions`, {
        prompt
      });
      return response.data;
    } catch (err: any) {
      console.error('Erreur lors de la génération de suggestions:', err);
      throw new Error(err.response?.data?.error || 'Erreur lors de la génération de suggestions');
    }
  }, [projectId]);

  // Gérer les messages de chat
  const handleChatMessage = useCallback(async (message: string, mode: 'ask' | 'agent') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/wiring/project/${projectId}/chat`, {
        message,
        mode
      });
      return response.data;
    } catch (err: any) {
      console.error('Erreur lors du chat:', err);
      throw new Error(err.response?.data?.error || 'Erreur lors de la communication avec l\'IA');
    }
  }, [projectId]);

  // Actualiser le câblage
  const refreshWiring = useCallback(async () => {
    await loadWiring();
  }, [loadWiring]);

  return {
    wiring,
    loading,
    error,
    createWiring,
    updateWiring,
    validateWiring,
    generateSuggestions,
    handleChatMessage,
    refreshWiring
  };
}; 