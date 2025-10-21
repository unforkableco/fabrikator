export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  components?: Component[];
  wiringSchemas?: WiringSchema[];
  messages?: Message[];
  scenes3d?: Scene3D[];
  designThumbnailUrl?: string; // latest picked design image
}

export interface ProjectRequirements {
  needsMaterials: boolean;
  materialTypes: string[];
  needs3DEditor: boolean;
  needsWiringCircuit: boolean;
  needsSoftwareCode: boolean;
  [key: string]: any;
}

export interface Component {
  id: string;
  projectId: string;
  currentVersionId?: string;
  versions: CompVersion[];
  currentVersion?: CompVersion;
}

export interface CompVersion {
  id: string;
  componentId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
  specs: any;
}

export interface WiringSchema {
  id: string;
  projectId: string;
  currentVersionId?: string;
  versions: WireVersion[];
  currentVersion?: WireVersion;
}

export interface WireVersion {
  id: string;
  wiringSchemaId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
  wiringData: any;
}

export interface Message {
  id: string;
  projectId: string;
  context: string;
  content: string;
  sender: string; // 'user' or 'ai'
  mode: string; // 'ask' or 'agent'
  suggestions?: any; // Suggestions attached to the message
  createdAt: string;
  role?: string; // For compatibility
  timestamp?: string; // For compatibility
  relatedChanges?: ProjectChange[];
}

export interface ProjectChange {
  type: 'material' | 'requirement' | 'wiring' | 'part';
  action: 'add' | 'update' | 'remove';
  data: any;
  timestamp: string;
}

// Legacy interfaces for backward compatibility
export interface MaterialType {
  name: string;
  description: string;
  suggestedOptions?: string[];
  requirements?: {
    [key: string]: string | number;
  };
}

export interface ProductReference {
  name: string;
  manufacturer: string;
  purchaseUrl: string;
  estimatedPrice: string;
  supplier: string;
  partNumber?: string;
  datasheet?: string;
}

// Normalized technical specification for a material/component
export interface MaterialSpec {
  id?: string;
  componentId?: string;
  name?: string;
  type?: string;
  description?: string;
  quantity?: number;
  requirements?: { [key: string]: string | number };
  // Nouveau: description des broches déclarées par l'IA ou l'utilisateur
  // - null: non électronique / pas d'alimentation requise
  // - string[]: liste des noms de broches disponibles
  pins?: string[] | null;
  estimatedUnitCost?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Normalized procurement reference (1-n per component)
export interface PurchaseReference {
  id: string;
  componentId: string;
  name: string;
  manufacturer: string;
  supplier: string;
  purchaseUrl: string;
  estimatedPrice: string;
  partNumber?: string;
  datasheet?: string;
  status: 'suggested' | 'selected' | 'ordered' | 'received';
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  name?: string;
  type?: string;
  quantity?: number;
  requirements?: {
    [key: string]: string | number;
  };
  description?: string;
  aiSuggested?: boolean;
  suggestedAlternatives?: SelectedPart[];
  status?: MaterialStatus;
  productReference?: ProductReference; // legacy single reference for backward compatibility
  // New backend structure support
  projectId?: string;
  currentVersionId?: string;
  currentVersion?: CompVersion;
  versions?: CompVersion[];
  // Normalized fields
  materialSpec?: MaterialSpec | null;
  purchaseReferences?: PurchaseReference[];
  estimatedUnitCost?: string;
}

export interface SelectedPart {
  id: string;
  name: string;
  type: string;
  specifications: {
    [key: string]: string | number;
  };
  price: number;
  source: string;
  materialRequirementId?: string;
  status: PartStatus;
}

export interface Connection {
  from: string;
  to: string;
  type: string;
}

export interface WiringPlan {
  components: Component[];
  aiGenerated: boolean;
  version: number;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  DESIGN = 'design',
  PROTOTYPE = 'prototype',
  TESTING = 'testing',
  PRODUCTION = 'production',
  COMPLETED = 'completed'
}

export enum MaterialStatus {
  SUGGESTED = 'suggested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ORDERED = 'ordered',
  RECEIVED = 'received'
}

export enum PartStatus {
  SUGGESTED = 'suggested',
  SELECTED = 'selected',
  ORDERED = 'ordered',
  RECEIVED = 'received'
}

export interface AccountSummary {
  id: string;
  email: string;
  credits: number;
  maxProjects: number;
  status: string;
  role: string;
  projectsUsed: number;
  projectsRemaining: number;
}

export interface LoginResponse {
  token: string;
  account: AccountSummary;
}

// Wiring specific interfaces
export interface WiringConnection {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
  wireType: 'data' | 'power' | 'ground' | 'analog' | 'digital';
  wireColor?: string;
  label?: string;
  validated?: boolean;
  error?: string;
}

export interface WiringComponent {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  pins: WiringPin[];
  specifications?: any;
  materialId?: string; // Reference to material component
}

export interface WiringPin {
  id: string;
  name: string;
  type: 'input' | 'output' | 'power' | 'ground' | 'analog' | 'digital';
  position: { x: number; y: number };
  connected: boolean;
  voltage?: number;
  current?: number;
}

export interface WiringSuggestion {
  id: string;
  title: string;
  description: string;
  action: 'add' | 'modify' | 'remove';
  connectionData?: WiringConnection;
  componentData?: WiringComponent;
  expanded: boolean;
  validated?: boolean;
  confidence?: number;
  status?: 'pending' | 'accepted' | 'rejected'; // ✅ Add status like in BaseSuggestion
}

export interface WiringValidationResult {
  isValid: boolean;
  errors: WiringValidationError[];
  warnings: WiringValidationWarning[];
}

export interface WiringValidationError {
  id: string;
  type: 'voltage_mismatch' | 'current_overload' | 'invalid_connection' | 'missing_connection';
  message: string;
  connectionId?: string;
  componentId?: string;
  severity: 'error' | 'warning';
}

export interface WiringValidationWarning {
  id: string;
  type: 'optimization' | 'best_practice' | 'redundancy';
  message: string;
  suggestion?: string;
}

export interface WiringDiagram {
  id: string;
  components: WiringComponent[];
  connections: WiringConnection[];
  metadata: {
    title?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  validation?: WiringValidationResult;
}

// 3D Scene related types
export interface Scene3D {
  id: string;
  projectId: string;
  name: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
  versions: SceneVersion[];
  currentVersion?: SceneVersion;
  project?: Project;
}

export interface SceneVersion {
  id: string;
  scene3dId: string;
  versionNumber: number;
  sceneGraph: {
    root: SceneGraphNode;
  };
  createdBy: string;
  createdAt: string;
}

export interface SceneGraphNode {
  id: string;
  name: string;
  type: Component3DType;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  componentId?: string;
  children: SceneGraphNode[];
  metadata?: any;
}

export interface Component3D {
  id: string;
  name: string;
  type: Component3DType;
  category: string;
  filePath?: string;
  fileSize?: number;
  metadata: any;
  isGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Component3DType = 'DESIGN' | 'FUNCTIONAL' | 'ELECTRONIC' | 'MECHANICAL';

// Design Preview types
export interface DesignPreview {
  id: string;
  projectId: string;
  designs: DesignOption[];
  selectedDesignId?: string;
  selectedDesign?: DesignOption;
  // async generation tracking
  status?: 'pending' | 'success' | 'failed';
  stage?: string;
  progress?: number;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
}

// New CAD generation types
export interface ProjectCadGeneration {
  id: string;
  projectId: string;
  designOptionId?: string;
  outputDir: string;
  status: 'pending' | 'success' | 'failed';
  logText?: string;
  stage?: string;
  progress?: number;
  totalParts?: number;
  completedParts?: number;
  failedParts?: number;
  analysisJson?: any;
  partsJson?: any;
  designImagePath?: string;
  createdAt: string;
  parts?: ProjectCadPart[];
}

export interface ProjectCadPart {
  id: string;
  cadGenerationId: string;
  key: string;
  name: string;
  description?: string;
  geometryHint?: string;
  approxDims?: any;
  features?: any;
  appearance?: any;
  scriptCode?: string;
  scriptPath?: string;
  stlPath?: string;
  status: 'success' | 'failed';
  errorLog?: string;
  createdAt: string;
}

export interface DesignOption {
  id: string;
  designPreviewId: string;
  concept: string;
  description: string;
  imagePrompt: string;
  imageUrl: string;
  keyFeatures: string[];
  complexity: 'low' | 'medium' | 'high';
  // printability and technicalSpecs removed from the AI contract and UI
  parentDesignOptionId?: string; // iteration chain
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
} 
