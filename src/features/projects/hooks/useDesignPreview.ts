import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../shared/services/api';
import { DesignPreview } from '../../../shared/types';

interface UseDesignPreviewReturn {
  designPreview: DesignPreview | null;
  isLoading: boolean;
  error: string | null;
  generateDesigns: () => Promise<void>;
  selectDesign: (designOptionId: string) => Promise<void>;
  tryAgain: () => Promise<void>;
  iterate: (baseDesignOptionId: string) => Promise<void>;
  startCad: () => Promise<void>;
  latestCad: any | null;
  cadParts: any[];
}

export const useDesignPreview = (projectId: string): UseDesignPreviewReturn => {
  const [designPreview, setDesignPreview] = useState<DesignPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestCad, setLatestCad] = useState<any | null>(null);
  const [cadPollTimer, setCadPollTimer] = useState<any>(null);

  // Load existing design preview
  const loadDesignPreview = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await api.designPreviews.getDesignPreview(projectId);
      setDesignPreview(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No design preview exists yet, this is normal
        setDesignPreview(null);
      } else {
        setError(err.response?.data?.error || 'Failed to load design preview');
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Generate new design previews
  const generateDesigns = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.designPreviews.generateDesignPreviews(projectId);
      setDesignPreview(response.designPreview);
    } catch (err: any) {
      let errorMessage = 'Failed to generate design previews';
      
      if (err.response?.status === 429) {
        errorMessage = 'OpenAI is currently busy. Please wait a moment and try again.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid request. Please try with a simpler project description.';
      } else if (err.response?.status === 401) {
        errorMessage = 'OpenAI API configuration issue. Please check your API key.';
      } else if (err.response?.status === 403) {
        errorMessage = 'OpenAI API access denied. Please check your account status.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Select a design option
  const selectDesign = useCallback(async (designOptionId: string) => {
    if (!designPreview) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.designPreviews.selectDesignOption(
        designPreview.id,
        designOptionId
      );
      setDesignPreview(response.designPreview);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to select design option');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [designPreview]);

  // Try again - delete existing and regenerate
  const tryAgain = useCallback(async () => {
    if (!designPreview) {
      return generateDesigns();
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Delete existing design preview
      await api.designPreviews.deleteDesignPreview(designPreview.id);
      setDesignPreview(null);
      
      // Generate new ones
      await generateDesigns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate design previews');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [designPreview, generateDesigns]);

  // Iterate upon latest selected design
  const iterate = useCallback(async (baseDesignOptionId: string) => {
    if (!projectId) return;
    try {
      // Keep the current selection visible and only show loading placeholders in the proposals area
      setIsLoading(true);
      setError(null);
      const updated = await api.designPreviews.iterate(projectId, baseDesignOptionId);
      setDesignPreview(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to iterate designs');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Start CAD generation (async + polling)
  const startCad = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      await api.designPreviews.startCadGeneration(projectId);

      const poll = async () => {
        try {
          const data = await api.designPreviews.getLatestCad(projectId);
          setLatestCad(data);
          if (data?.status && data.status !== 'pending') {
            if (cadPollTimer) {
              clearInterval(cadPollTimer);
              setCadPollTimer(null);
            }
          }
        } catch {
          // ignore transient errors
        }
      };

      await poll();
      const t = setInterval(poll, 2000);
      setCadPollTimer(t);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start CAD generation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, cadPollTimer]);

  // Load design preview and latest CAD on mount
  useEffect(() => {
    loadDesignPreview();
    (async () => {
      try {
        const data = await api.designPreviews.getLatestCad(projectId);
        setLatestCad(data);
      } catch {
        // no CAD yet
      }
    })();
    return () => {
      if (cadPollTimer) clearInterval(cadPollTimer);
    };
  }, [loadDesignPreview, projectId, cadPollTimer]);

  return {
    designPreview,
    isLoading,
    error,
    generateDesigns,
    selectDesign,
    tryAgain,
    iterate,
    startCad,
    latestCad,
    cadParts: Array.isArray(latestCad?.parts) ? latestCad.parts : [],
  };
};
