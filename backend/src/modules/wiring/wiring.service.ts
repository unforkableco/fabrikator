import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../../services/ai.service';

const prisma = new PrismaClient();

export class WiringService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Get wiring plan for a project
   */
  async getWiringForProject(projectId: string) {
    try {
      return await prisma.wiringSchema.findFirst({
        where: { projectId },
        include: {
          currentVersion: true
        }
      });
    } catch (error) {
      console.error('Error in getWiringForProject:', error);
      throw error;
    }
  }

  /**
   * Create a new wiring plan for a project
   */
  async createWiring(projectId: string, wiringData: any) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Create the wiring schema
        const wiringSchema = await tx.wiringSchema.create({
          data: { 
            id: uuidv4(),
            projectId 
          }
        });
        
        // Create the first version
        const version = await tx.wireVersion.create({
          data: {
            id: uuidv4(),
            wiringSchemaId: wiringSchema.id,
            versionNumber: 1,
            createdBy: wiringData.createdBy || 'User',
            wiringData: {
              connections: wiringData.connections || [],
              components: wiringData.components || [],
              diagram: wiringData.diagram || {},
              metadata: wiringData.metadata || {}
            }
          }
        });
        
        // Update schema to point to this version
        await tx.wiringSchema.update({
          where: { id: wiringSchema.id },
          data: { currentVersionId: version.id }
        });
        
        // Create a changelog entry
        await tx.changeLog.create({
          data: {
            id: uuidv4(),
            entity: 'wire_versions',
            changeType: 'create',
            author: wiringData.createdBy || 'User',
            wireVersionId: version.id,
            diffPayload: {
              type: 'new_wiring',
              action: 'create',
              connectionCount: wiringData.connections?.length || 0
            }
          }
        });
        
        return { 
          wiringSchema: await tx.wiringSchema.findUnique({
            where: { id: wiringSchema.id },
            include: { currentVersion: true }
          }), 
          version 
        };
      });
    } catch (error) {
      console.error('Error in createWiring:', error);
      throw error;
    }
  }

  /**
   * Get a wiring plan by ID
   */
  async getWiringById(id: string) {
    try {
      return await prisma.wiringSchema.findUnique({
        where: { id },
        include: {
          currentVersion: true
        }
      });
    } catch (error) {
      console.error('Error in getWiringById:', error);
      throw error;
    }
  }

  /**
   * Add a new version to an existing wiring plan
   */
  async addVersion(wiringSchemaId: string, versionData: any) {
    try {
      const wiringSchema = await prisma.wiringSchema.findUnique({
        where: { id: wiringSchemaId },
        include: { 
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
      
      if (!wiringSchema) {
        throw new Error('Wiring schema not found');
      }
      
      // Retry logic for finding available version number
      const maxAttempts = 5;
      
      for (let attempts = 0; attempts < maxAttempts; attempts++) {
        try {
          return await prisma.$transaction(async (tx) => {
            // Get all existing versions for this schema
            const existingVersions = await tx.wireVersion.findMany({
              where: { wiringSchemaId },
              select: { versionNumber: true },
              orderBy: { versionNumber: 'desc' }
            });
            
            // Compute next available version number
            let nextVersionNumber = 1;
            if (existingVersions.length > 0) {
              const usedNumbers = existingVersions.map(v => v.versionNumber).sort((a, b) => a - b);
              nextVersionNumber = usedNumbers[usedNumbers.length - 1] + 1;
            }
            
            // Add attempt offset to avoid collisions
            nextVersionNumber += attempts;
            
            console.log(`Creating version ${nextVersionNumber} for schema ${wiringSchemaId}`);
            
            // Create new version
            const version = await tx.wireVersion.create({
              data: {
                id: uuidv4(),
                wiringSchemaId,
                versionNumber: nextVersionNumber,
                createdBy: versionData.createdBy || 'User',
                wiringData: {
                  connections: versionData.connections || [],
                  components: versionData.components || [],
                  diagram: versionData.diagram || {},
                  metadata: versionData.metadata || {}
                }
              }
            });
            
            // Update schema to point to this version
            await tx.wiringSchema.update({
              where: { id: wiringSchemaId },
              data: { currentVersionId: version.id }
            });
            
            // Create a changelog entry
            await tx.changeLog.create({
              data: {
                id: uuidv4(),
                entity: 'wire_versions',
                changeType: 'update',
                author: versionData.createdBy || 'User',
                wireVersionId: version.id,
                diffPayload: {
                  type: 'update_wiring',
                  action: 'update',
                  versionNumber: nextVersionNumber,
                  connectionCount: versionData.connections?.length || 0
                }
              }
            });
            
            return { 
              wiringSchema: await tx.wiringSchema.findUnique({
                where: { id: wiringSchemaId },
                include: { 
                  currentVersion: true,
                  versions: {
                    orderBy: { versionNumber: 'desc' }
                  }
                }
              }), 
              version 
            };
          });
        } catch (error: any) {
          if (error.code === 'P2002' && attempts < maxAttempts - 1) {
            // Unique constraint violation, try next attempt
            console.log(`Version conflict on attempt ${attempts + 1}, retrying...`);
            continue;
          } else {
            throw error;
          }
        }
      }
      
      throw new Error('Failed to create version after multiple attempts');
    } catch (error) {
      console.error('Error in addVersion:', error);
      throw error;
    }
  }

  /**
   * Get versions of a wiring plan
   */
  async getWiringVersions(wiringSchemaId: string) {
    try {
      return await prisma.wiringSchema.findUnique({
        where: { id: wiringSchemaId },
        include: {
          currentVersion: true,
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Error in getWiringVersions:', error);
      throw error;
    }
  }

  /**
   * Generate wiring suggestions with AI
   */
  async generateWiringSuggestions(projectId: string, prompt: string, currentDiagram: any, chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>) {
    try {
      console.log('WiringService - Generating AI suggestions for:', prompt);
      
      // Fetch project materials from database
      const materials = await prisma.component.findMany({
        where: { projectId },
        include: { currentVersion: true }
      });

      // Transform materials to a simplified format for AI
      const simplifiedMaterials = materials.map(material => {
        const specs = material.currentVersion?.specs as any || {};
        return {
          id: material.id,
          name: specs.name || 'Component',
          type: specs.type || 'unknown',
          quantity: specs.quantity || 1,
          description: specs.description || '',
          specifications: specs.requirements || {}
        };
      });

      console.log('WiringService - Available materials:', simplifiedMaterials.length);
      
      // Analyze existing connections
      const existingConnections = currentDiagram?.connections || [];
      console.log('WiringService - Existing connections:', existingConnections.length);
      console.log('WiringService - Current diagram:', JSON.stringify(currentDiagram, null, 2));
      
      // Build mapping of existing connections for AI
      const existingConnectionsForAI = existingConnections.map((conn: any) => ({
        id: conn.id,
        fromComponent: conn.fromComponent,
        fromPin: conn.fromPin,
        toComponent: conn.toComponent,
        toPin: conn.toPin,
        wireType: conn.wireType,
        wireColor: conn.wireColor
      }));

      // Use AI to generate suggestions
      const aiResponse = await this.aiService.generateWiringSuggestions(
        prompt,
        { materials: simplifiedMaterials, currentDiagram, existingConnections: existingConnectionsForAI, chatHistory }
      );

      console.log('WiringService - AI response received:', aiResponse);

      // Transform AI response into frontend format
      const suggestions = aiResponse.suggestions?.map((suggestion: any, index: number) => {
        // For "remove" actions, connectionData can be null
        if (suggestion.action === 'remove') {
          if (!suggestion.existingConnectionId) {
            console.warn('Remove action without existingConnectionId:', suggestion);
            return null;
          }
          
          // Find the existing connection to remove
          const connectionToRemove = existingConnections.find((conn: any) => conn.id === suggestion.existingConnectionId);
          if (!connectionToRemove) {
            console.warn('Existing connection not found for removal:', suggestion.existingConnectionId);
            return null;
          }
          
          return {
            id: `remove-suggestion-${uuidv4()}`,
            title: suggestion.type || `Remove connection`,
            description: suggestion.description || `Remove connection ${connectionToRemove.fromComponent} → ${connectionToRemove.toComponent}`,
            action: 'remove',
            existingConnectionId: suggestion.existingConnectionId,
            connectionData: connectionToRemove,
            expanded: false,
            validated: false,
            confidence: suggestion.confidence || 0.8
          };
        }
        
        // For "add" and "update", ensure suggestion has the required connection data
        if (!suggestion.connectionData) {
          console.warn('Suggestion without connectionData:', suggestion);
          return null;
        }

        const connectionData = suggestion.connectionData;
        
        // Check duplicates for 'add' actions
        if (suggestion.action === 'add') {
          const isDuplicate = existingConnections.some((existing: any) => 
            (existing.fromComponent === connectionData.fromComponent && 
             existing.toComponent === connectionData.toComponent &&
             existing.fromPin === connectionData.fromPin &&
             existing.toPin === connectionData.toPin) ||
            (existing.fromComponent === connectionData.toComponent && 
             existing.toComponent === connectionData.fromComponent &&
             existing.fromPin === connectionData.toPin &&
             existing.toPin === connectionData.fromPin)
          );
          
          if (isDuplicate) {
            console.log('Skipping duplicate connection:', {
              from: connectionData.fromComponent,
              to: connectionData.toComponent,
              fromPin: connectionData.fromPin,
              toPin: connectionData.toPin
            });
            return null;
          }
        }
        
        // CRITICAL VALIDATION: Ensure referenced components exist
        const fromComponentExists = materials.find(m => m.id === connectionData.fromComponent);
        const toComponentExists = materials.find(m => m.id === connectionData.toComponent);
        
        if (!fromComponentExists || !toComponentExists) {
          console.error('Rejected connection - components do not exist:', {
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent,
            availableComponents: materials.map(m => {
              const specs = m.currentVersion?.specs as any || {};
              return { id: m.id, name: specs.name || 'Unknown', type: specs.type || 'unknown' };
            })
          });
          return null;
        }

        // VALIDATION: Ensure pins are appropriate based on explicit specs
        const validFromPins = this.getPinsFromSpecs(fromComponentExists) || [];
        const validToPins = this.getPinsFromSpecs(toComponentExists) || [];

        if (validFromPins.length === 0 || validToPins.length === 0) {
          console.warn('Dropping suggestion with non-electronic component(s):', {
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent
          });
          return null;
        }
        
        if (!validFromPins.includes(connectionData.fromPin) || !validToPins.includes(connectionData.toPin)) {
          console.warn('Invalid pins - rejecting suggestion (AI must provide valid pin names)', {
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent,
            fromPin: connectionData.fromPin,
            toPin: connectionData.toPin,
            validFromPins,
            validToPins
          });
          return null;
        }

        const fromSpecs = fromComponentExists.currentVersion?.specs as any || {};
        const toSpecs = toComponentExists.currentVersion?.specs as any || {};
        const fromName = fromSpecs.name || fromSpecs.type || 'Unknown';
        const toName = toSpecs.name || toSpecs.type || 'Unknown';
        const titleBase = suggestion.type || (suggestion.action || 'add');
        const title = `${titleBase}: ${fromName}.${connectionData.fromPin} → ${toName}.${connectionData.toPin}`;

        return {
          id: `wiring-suggestion-${uuidv4()}`,
          title,
          description: suggestion.description || this.getActionDescription(suggestion.action, fromName, toName, connectionData.fromPin, connectionData.toPin),
          action: suggestion.action || 'add',
          connectionData: {
            id: `conn-${uuidv4()}`,
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent,
            fromPin: connectionData.fromPin,
            toPin: connectionData.toPin,
            wireType: this.normalizeWireType(connectionData.wireType),
            wireColor: this.defaultWireColor(connectionData.wireColor, connectionData.wireType)
          },
          existingConnectionId: suggestion.existingConnectionId,
          componentData: suggestion.componentData,
          expanded: false,
          validated: false,
          confidence: suggestion.confidence || 0.8
        };
      }).filter(Boolean) || [];

      console.log('WiringService - Processed suggestions:', suggestions.length);
      console.log('WiringService - Valid suggestions:', suggestions.map((s: any) => ({
        title: s.title,
        from: s.connectionData?.fromComponent,
        to: s.connectionData?.toComponent
      })));

      // Build a minimal list of components to place (only those referenced by suggestions)
      const involvedComponentIds = new Set<string>();
      suggestions.forEach((s: any) => {
        if (s?.connectionData) {
          if (s.connectionData.fromComponent) involvedComponentIds.add(s.connectionData.fromComponent);
          if (s.connectionData.toComponent) involvedComponentIds.add(s.connectionData.toComponent);
        }
      });

      const componentsToPlace = Array.from(involvedComponentIds).map((id) => {
        const mat = materials.find(m => m.id === id);
        if (!mat) return null;
        const specs = (mat.currentVersion?.specs as any) || {};
        const pins = this.getPinsFromSpecs(mat);
        return {
          id: mat.id,
          name: specs.name || 'Component',
          type: specs.type || 'unknown',
          pins
        };
      }).filter(Boolean);

      return {
        suggestions,
        componentsToPlace,
        explanation: aiResponse.explanation || `I generated ${suggestions.length} valid connection suggestions for your circuit.`
      };

    } catch (error) {
      console.error('Error in generateWiringSuggestions:', error);
      
      // Fallback in case of AI error
      return {
        suggestions: [],
        componentsToPlace: [],
        explanation: 'Sorry, I could not generate wiring suggestions at the moment. Please try again.'
      };
    }
  }

  // Strict: read pins only from specs
  private getPinsFromSpecs(component: any): string[] | null {
    const specs: any = (component?.currentVersion?.specs as any) || {};
    // Prefer top-level specs.pins
    if (specs.pins === null) return null;
    if (Array.isArray(specs.pins)) {
      const normalized: string[] = (specs.pins as any[])
        .map((p: any) => typeof p === 'string' ? p.trim() : '')
        .filter((p: string): p is string => typeof p === 'string' && p.length > 0);
      return [...new Set(normalized)].sort();
    }
    // Fallback: many flows store pins under specs.requirements.pins
    const reqPins = specs?.requirements?.pins;
    if (reqPins === null) return null;
    if (Array.isArray(reqPins)) {
      const normalized: string[] = (reqPins as any[])
        .map((p: any) => typeof p === 'string' ? p.trim() : '')
        .filter((p: string): p is string => typeof p === 'string' && p.length > 0);
      return [...new Set(normalized)].sort();
    }
    return null;
  }

  private getActionDescription(action: string, fromName: string, toName: string, fromPin: string, toPin: string): string {
    switch (action) {
      case 'add':
        return `Connect ${fromName} (${fromPin}) to ${toName} (${toPin})`;
      case 'remove':
        return `Remove connection between ${fromName} (${fromPin}) and ${toName} (${toPin})`;
      case 'update':
        return `Update connection from ${fromName} (${fromPin}) to ${toName} (${toPin})`;
      default:
        return `Connect ${fromName} (${fromPin}) to ${toName} (${toPin})`;
    }
  }

  private normalizeWireType(wireType: string): 'data' | 'power' | 'ground' | 'analog' | 'digital' {
    const type = wireType?.toLowerCase() || 'data';
    if (type.includes('power') || type.includes('vcc') || type.includes('vdd')) return 'power';
    if (type.includes('ground') || type.includes('gnd')) return 'ground';
    if (type.includes('analog')) return 'analog';
    if (type.includes('digital') || type.includes('communication')) return 'digital';
    return 'data';
  }

  private defaultWireColor(color: string | undefined, wireType: string | undefined): string {
    if (color && typeof color === 'string' && color.trim().length > 0) return color;
    const type = (wireType || '').toLowerCase();
    if (type.includes('power') || type.includes('vcc') || type.includes('vdd')) return '#ff0000';
    if (type.includes('ground') || type.includes('gnd')) return '#000000';
    if (type.includes('analog')) return '#00ff00';
    if (type.includes('digital') || type.includes('communication') || type.includes('data')) return '#0000ff';
    return '#0000ff';
  }

  async validateWiring(diagram: any) {
    try {
      const errors: any[] = [];
      const warnings: any[] = [];
      if (diagram.components && diagram.connections) {
        for (const connection of diagram.connections) {
          const fromComponent = diagram.components.find((c: any) => c.id === connection.fromComponent);
          const toComponent = diagram.components.find((c: any) => c.id === connection.toComponent);
          if (!fromComponent || !toComponent) {
            errors.push({
              id: `error-${connection.id}`,
              type: 'invalid_connection',
              message: `Invalid connection: missing component for ${connection.id}`,
              connectionId: connection.id,
              severity: 'error'
            });
          }
          const fromPin = fromComponent?.pins?.find((p: any) => p.id === connection.fromPin);
          const toPin = toComponent?.pins?.find((p: any) => p.id === connection.toPin);
          if (fromPin && toPin && fromPin.voltage && toPin.voltage && fromPin.voltage !== toPin.voltage) {
            warnings.push({
              id: `warning-${connection.id}`,
              type: 'voltage_mismatch',
              message: `Voltage mismatch detected: ${fromPin.voltage}V vs ${toPin.voltage}V`,
              suggestion: 'Check voltage compatibility or add a converter.'
            });
          }
        }
      }
      return { isValid: errors.length === 0, errors, warnings };
    } catch (error) {
      console.error('Error in validateWiring:', error);
      throw error;
    }
  }
}
