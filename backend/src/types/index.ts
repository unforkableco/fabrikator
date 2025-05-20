// Project related types
export enum ProjectStatus {
  PLANNING = 'planning',
  DESIGN = 'design',
  PROTOTYPE = 'prototype',
  TESTING = 'testing',
  PRODUCTION = 'production',
  COMPLETED = 'completed'
}

export interface ProjectRequirements {
  needsMaterials: boolean;
  materialTypes: string[];
  needs3DEditor: boolean;
  needsWiringCircuit: boolean;
  needsSoftwareCode: boolean;
  [key: string]: any; // Allow additional properties
}

// Material related types
export enum MaterialStatus {
  SUGGESTED = 'suggested',
  APPROVED = 'approved',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  REJECTED = 'rejected'
}

// Suggestion related types
export enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PARTIAL = 'partial'
}

export interface SuggestionInput {
  projectId: string;
  context: string;
  promptPayload: Record<string, any>;
  responsePayload: Record<string, any>;
}

export interface SuggestionItemInput {
  suggestionId: string;
  itemPayload: Record<string, any>;
  action: string;
}

// Version related types
export interface VersionData {
  versionNumber: number;
  createdBy: 'AI' | 'User';
} 