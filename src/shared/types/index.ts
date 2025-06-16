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
  suggestions?: any; // Suggestions attachées au message
  createdAt: string;
  role?: string; // Pour compatibilité
  timestamp?: string; // Pour compatibilité
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
  // New backend structure support
  projectId?: string;
  currentVersionId?: string;
  currentVersion?: CompVersion;
  versions?: CompVersion[];
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