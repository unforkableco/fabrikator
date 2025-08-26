export interface AnalysisResult {
  canonicalPrompt: string;
  visibleComponents: string[];
  shape: string;
  finish: string;
  notes: string;
}

export interface Part {
  key: string;
  name: string;
  role: string | null;
  geometry_hint: string | null;
  approx_dims_mm: Record<string, number> | null;
  features: string[];
  appearance: { color_hex?: string } | null;
}

export interface PartsDocument {
  parts: Part[];
}

export interface RetryAttempt {
  attempt: number;
  strategy: 'initial' | 'error_fix' | 'simplified' | 'primitive';
  success: boolean;
  error?: string;
}

export interface GenerationResult {
  part: Part;
  scriptPath: string;
  stlPath: string;
  success: boolean;
  attempts: RetryAttempt[];
  finalError?: string;
}