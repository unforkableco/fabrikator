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

// Message related types
export interface MessageInput {
  projectId: string;
  context: string;
  content: string;
}

// Version related types
export interface VersionData {
  versionNumber: number;
  createdBy: 'AI' | 'User';
}

export interface VersionedEntity {
  id: string;
  projectId: string;
  currentVersionId: string | null;
  versions: any[];
  currentVersion: any;
}

export interface Component extends VersionedEntity {
  versions: CompVersion[];
  currentVersion: CompVersion | null;
}

export interface CompVersion {
  id: string;
  componentId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: Date;
  specs: any;
  component?: Component;
  currentFor?: Component[];
}

export interface Requirement extends VersionedEntity {
  versions: ReqVersion[];
  currentVersion: ReqVersion | null;
}

export interface ReqVersion {
  id: string;
  requirementId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: Date;
  details: any;
  requirement?: Requirement;
  currentFor?: Requirement[];
}

export interface Document extends VersionedEntity {
  versions: DocVersion[];
  currentVersion: DocVersion | null;
}

export interface DocVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: Date;
  content: any;
  document?: Document;
  currentFor?: Document[];
}

export interface Product3D extends VersionedEntity {
  versions: P3DVersion[];
  currentVersion: P3DVersion | null;
}

export interface P3DVersion {
  id: string;
  product3DId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: Date;
  modelData: any;
  product3D?: Product3D;
  currentFor?: Product3D[];
}

export interface WiringSchema extends VersionedEntity {
  versions: WireVersion[];
  currentVersion: WireVersion | null;
}

export interface WireVersion {
  id: string;
  wiringSchemaId: string;
  versionNumber: number;
  createdBy: string;
  createdAt: Date;
  wiringData: any;
  wiringSchema?: WiringSchema;
  currentFor?: WiringSchema[];
} 