import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../shared/services/api';
import { DesignPreview } from '../../../shared/types';

interface EnhancedPipelineConfig {
  maxRefinementIterations: number;
  enableValidation: boolean;
  materialType: string;
  qualityTarget: 'draft' | 'standard' | 'high';
}

interface EnhancedPipelineStatus {
  generationId: string;
  status: string;
  stage: string;
  progress: number;
  pipelineType: string;
  parts: {
    total: number;
    successful: number;
    failed: number;
    processing: number;
    successRate: number;
    byIteration?: Record<string, Array<{ id: string; key: string; name: string; status: string }>>;
  };
  analysis: {
    hardwareSpecs: boolean;
    assemblyPlan: boolean;
    manufacturingConstraints: boolean;
    componentsAnalyzed: number;
    interfacesDefined: number;
  };
  validation: {
    overallStatus: string;
    totalChecks: number;
    criticalIssues: number;
    recommendations: number;
  } | null;
  refinement: {
    iterationsCompleted: number;
    lastRefinement: any;
  };
  qualityScore: number;
  startedAt: string;
  finishedAt?: string;
}

interface ValidationResults {
  validationId: string;
  overallStatus: string;
  validatedAt: string;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: number;
  };
  interfaceValidation: any[];
  assemblyValidation: any[];
  manufacturingValidation: any[];
  functionalValidation: any[];
  criticalIssues: any[];
  recommendations: any;
  partResults: any[];
}

interface UseDesignPreviewReturn {
  designPreview: DesignPreview | null;
  isLoading: boolean; // image generation/iteration loading
  isCadLoading: boolean; // CAD generation loading
  error: string | null;
  generateDesigns: () => Promise<void>;
  selectDesign: (designOptionId: string) => Promise<void>;
  tryAgain: () => Promise<void>;
  iterate: (baseDesignOptionId: string) => Promise<void>;
  
  // Enhanced CAD Pipeline
  enhancedConfig: EnhancedPipelineConfig;
  setEnhancedConfig: (config: Partial<EnhancedPipelineConfig>) => void;
  startEnhancedCad: () => Promise<void>;
  enhancedStatus: EnhancedPipelineStatus | null;
  validationResults: ValidationResults | null;
  
  // Legacy compatibility (deprecated)
  startCad: () => Promise<void>;
  latestCad: any | null;
  cadParts: any[];
  retryPart: (partId: string) => Promise<void>;
  retryingPartIds: Set<string>;
  retryErrors: Record<string, string | null>;
}

export const useDesignPreview = (projectId: string): UseDesignPreviewReturn => {
  const [designPreview, setDesignPreview] = useState<DesignPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false); // image ops
  const [isCadLoading, setIsCadLoading] = useState(false); // CAD ops
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced pipeline state
  const [enhancedConfig, setEnhancedConfigState] = useState<EnhancedPipelineConfig>({
    maxRefinementIterations: 3,
    enableValidation: true,
    materialType: 'PLA',
    qualityTarget: 'standard'
  });
  const [enhancedStatus, setEnhancedStatus] = useState<EnhancedPipelineStatus | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [enhancedPollTimer, setEnhancedPollTimer] = useState<any>(null);
  
  // Legacy state (for compatibility)
  const [latestCad, setLatestCad] = useState<any | null>(null);
  const [cadPollTimer, setCadPollTimer] = useState<any>(null);
  const [designPollTimer, setDesignPollTimer] = useState<any>(null);
  const [retryingPartIds, setRetryingPartIds] = useState<Set<string>>(new Set());
  const [retryErrors, setRetryErrors] = useState<Record<string, string | null>>({});

  const setEnhancedConfig = useCallback((config: Partial<EnhancedPipelineConfig>) => {
    setEnhancedConfigState(prev => ({ ...prev, ...config }));
  }, []);

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

  // Generate new design previews (enqueue + poll)
  const generateDesigns = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Start async job (202 expected)
      await api.designPreviews.generateDesignPreviews(projectId);

      // Poll preview until designs are available or status changes
      const poll = async () => {
        try {
          const data = await api.designPreviews.getDesignPreview(projectId);
          setDesignPreview(data);
          const done = (Array.isArray(data?.designs) && data.designs.length >= 3) || data?.status === 'success' || data?.status === 'failed';
          if (done) {
            if (designPollTimer) {
              clearInterval(designPollTimer);
              setDesignPollTimer(null);
            }
            setIsLoading(false);
          }
        } catch (_) {
          // ignore transient errors during polling
        }
      };

      await poll();
      const t = setInterval(poll, 2000);
      setDesignPollTimer(t);
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
      setIsLoading(false);
      throw err;
    }
  }, [projectId, designPollTimer]);

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
      
      // Generate new ones (will enqueue + poll)
      await generateDesigns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate design previews');
      throw err;
    } finally {
      // generateDesigns will manage isLoading as it polls
    }
  }, [designPreview, generateDesigns]);

  // Iterate upon latest selected design (sync response for now)
  const iterate = useCallback(async (baseDesignOptionId: string) => {
    if (!projectId) return;
    try {
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

  // Enhanced CAD pipeline generation
  const startEnhancedCad = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsCadLoading(true);
      setError(null);
      await api.designPreviews.startEnhancedCadGeneration(projectId, enhancedConfig);

      const pollEnhanced = async () => {
        try {
          const statusData = await api.designPreviews.getEnhancedPipelineStatus(projectId);
          setEnhancedStatus(statusData);
          
          // Also try to get validation results if available
          try {
            const validationData = await api.designPreviews.getValidationResults(projectId);
            setValidationResults(validationData);
          } catch {
            // Validation results might not be available yet
          }

          // Check if pipeline is complete
          if (statusData?.status && !['pending', 'processing'].includes(statusData.status)) {
            if (enhancedPollTimer) {
              clearInterval(enhancedPollTimer);
              setEnhancedPollTimer(null);
            }
            setIsCadLoading(false);
          }
        } catch {
          // ignore transient errors
        }
      };

      await pollEnhanced();
      const t = setInterval(pollEnhanced, 2000);
      setEnhancedPollTimer(t);
    } catch (err: any) {
      let errorMessage = 'Failed to start enhanced CAD generation';
      
      if (err.response?.status === 429) {
        errorMessage = 'System is currently busy. Please wait a moment and try again.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid configuration. Please check your settings and try again.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      setIsCadLoading(false);
      throw err;
    }
  }, [projectId, enhancedConfig, enhancedPollTimer]);

  // Legacy CAD generation (deprecated but kept for compatibility)
  const startCad = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsCadLoading(true);
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
            setIsCadLoading(false);
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
      setIsCadLoading(false);
      throw err;
    }
  }, [projectId, cadPollTimer]);

  // Retry a single CAD part with per-part loading and polling until it finishes
  const retryPart = useCallback(async (partId: string) => {
    if (!partId) return;
    try {
      setRetryErrors(prev => ({ ...prev, [partId]: null }));
      setRetryingPartIds(prev => new Set([...Array.from(prev), partId]));
      await api.designPreviews.retryCadPart(partId);

      const pollOnce = async () => {
        const data = await api.designPreviews.getLatestCad(projectId);
        setLatestCad(data);
        const found = Array.isArray(data?.parts) ? data.parts.find((p: any) => p.id === partId) : null;
        return found && found.status !== 'processing';
      };

      // Initial check
      let done = false;
      try { done = await pollOnce(); } catch {
        // ignore
      }
      if (done) {
        setRetryingPartIds(prev => { const n = new Set(Array.from(prev)); n.delete(partId); return n; });
        return;
      }

      // Poll until status leaves 'processing' or timeout ~30s
      const start = Date.now();
      const interval = 1200;
      const maxMs = 30000;
      await new Promise<void>((resolve) => {
        const t = setInterval(async () => {
          try {
            const finished = await pollOnce();
            if (finished || Date.now() - start > maxMs) {
              clearInterval(t);
              resolve();
            }
          } catch {
            // ignore transient
          }
        }, interval);
      });
    } catch (err: any) {
      setRetryErrors(prev => ({ ...prev, [partId]: err?.response?.data?.error || 'Retry failed' }));
    } finally {
      setRetryingPartIds(prev => { const n = new Set(Array.from(prev)); n.delete(partId); return n; });
      // Refresh once more
      try {
        const data = await api.designPreviews.getLatestCad(projectId);
        setLatestCad(data);
      } catch {}
    }
  }, [projectId]);

  // Load design preview, enhanced status, and legacy CAD on mount
  useEffect(() => {
    loadDesignPreview();
    
    // Load enhanced pipeline status
    (async () => {
      try {
        const statusData = await api.designPreviews.getEnhancedPipelineStatus(projectId);
        setEnhancedStatus(statusData);
        
        // Also load validation results if available
        try {
          const validationData = await api.designPreviews.getValidationResults(projectId);
          setValidationResults(validationData);
        } catch {
          // No validation results yet
        }
      } catch {
        // No enhanced pipeline data yet
      }
    })();
    
    // Load legacy CAD for compatibility
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
      if (designPollTimer) clearInterval(designPollTimer);
      if (enhancedPollTimer) clearInterval(enhancedPollTimer);
    };
  }, [loadDesignPreview, projectId, cadPollTimer, designPollTimer, enhancedPollTimer]);

  return {
    designPreview,
    isLoading,
    isCadLoading,
    error,
    generateDesigns,
    selectDesign,
    tryAgain,
    iterate,
    
    // Enhanced pipeline
    enhancedConfig,
    setEnhancedConfig,
    startEnhancedCad,
    enhancedStatus,
    validationResults,
    
    // Legacy compatibility
    startCad,
    latestCad,
    cadParts: Array.isArray(latestCad?.parts) ? latestCad.parts : [],
    retryPart,
    retryingPartIds,
    retryErrors,
  };
};
