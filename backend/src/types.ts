export interface Project {
  id: string;
  name: string;
  description: string;
  requirements: ProjectRequirements;
  materials: Material[];
  selectedParts: SelectedPart[];
  wiringPlan?: WiringPlan;
  conversations: Conversation[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRequirements {
  needsMaterials: boolean;
  materialTypes: MaterialType[];
  needs3DEditor: boolean;
  needsWiringCircuit: boolean;
  needsSoftwareCode: boolean;
}

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
  name: string;
  type: string;
  quantity: number;
  requirements: {
    [key: string]: string | number;
  };
  description: string;
  aiSuggested?: boolean;
  suggestedAlternatives?: SelectedPart[];
  status: MaterialStatus;
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
  materialRequirementId?: string; // Links to the original AI-suggested material requirement
  status: PartStatus;
}

export interface Connection {
  from: string;
  to: string;
  type: string;
}

export interface Component {
  id: string;
  type: string;
  connections: Connection[];
}

export interface WiringPlan {
  components: Component[];
  aiGenerated: boolean;
  version: number;
}

export interface Conversation {
  id: string;
  messages: Message[];
  context: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  relatedChanges?: ProjectChange[];
}

export interface ProjectChange {
  type: 'material' | 'requirement' | 'wiring' | 'part';
  action: 'add' | 'update' | 'remove';
  data: any;
  timestamp: string;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  GATHERING_MATERIALS = 'gathering_materials',
  ASSEMBLING = 'assembling',
  TESTING = 'testing',
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