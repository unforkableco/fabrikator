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
          specifications: specs.technicalSpecs || {}
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
            id: `remove-suggestion-${uuidv4()}`, // Always generate a unique UUID
            title: suggestion.type || `Remove connection`,
            description: suggestion.description || `Remove connection ${connectionToRemove.fromComponent} → ${connectionToRemove.toComponent}`,
            action: 'remove',
            existingConnectionId: suggestion.existingConnectionId,
            connectionData: connectionToRemove, // Include existing connection data for reference
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

        // VALIDATION: Ensure pins are appropriate based on technical specifications
        const validFromPins = this.getValidPinsForComponent(fromComponentExists);
        const validToPins = this.getValidPinsForComponent(toComponentExists);
        
        if (!validFromPins.includes(connectionData.fromPin) || !validToPins.includes(connectionData.toPin)) {
          const fromSpecs = fromComponentExists.currentVersion?.specs as any || {};
          const toSpecs = toComponentExists.currentVersion?.specs as any || {};
          
          console.warn('Invalid pins - Adjusted connection (based on technical specifications):', {
            from: `${fromSpecs.name || 'Unknown'}(${fromSpecs.type || 'Unknown'}).${connectionData.fromPin}`,
            to: `${toSpecs.name || 'Unknown'}(${toSpecs.type || 'Unknown'}).${connectionData.toPin}`,
            validFromPins: validFromPins,
            validToPins: validToPins,
            fromComponentSpecs: fromSpecs.requirements || {},
            toComponentSpecs: toSpecs.requirements || {}
          });
          
          // Adjust pins if needed, preferring appropriate pins
          if (!validFromPins.includes(connectionData.fromPin)) {
            // Choose an appropriate pin based on the wire type
            if (connectionData.wireType === 'power') {
              connectionData.fromPin = validFromPins.find(p => ['VCC', '5V', '3V3', 'POSITIVE', 'OUT+'].includes(p)) || validFromPins[0];
            } else if (connectionData.wireType === 'ground') {
              connectionData.fromPin = validFromPins.find(p => ['GND', 'NEGATIVE', 'OUT-'].includes(p)) || validFromPins[0];
            } else {
              connectionData.fromPin = validFromPins.find(p => !['VCC', 'GND', '5V', '3V3'].includes(p)) || validFromPins[0];
            }
          }
          
          if (!validToPins.includes(connectionData.toPin)) {
            // Choose an appropriate pin based on the wire type
            if (connectionData.wireType === 'power') {
              connectionData.toPin = validToPins.find(p => ['VCC', '5V', '3V3', 'POSITIVE'].includes(p)) || validToPins[0];
            } else if (connectionData.wireType === 'ground') {
              connectionData.toPin = validToPins.find(p => ['GND', 'NEGATIVE'].includes(p)) || validToPins[0];
            } else {
              connectionData.toPin = validToPins.find(p => !['VCC', 'GND', '5V', '3V3'].includes(p)) || validToPins[0];
            }
          }
          
          console.log('Adjusted pins:', {
            fromPin: connectionData.fromPin,
            toPin: connectionData.toPin
          });
        }

        const fromSpecs = fromComponentExists.currentVersion?.specs as any || {};
        const toSpecs = toComponentExists.currentVersion?.specs as any || {};

        return {
          id: `wiring-suggestion-${uuidv4()}`, // Always generate a unique UUID in the backend
          title: suggestion.type || `${suggestion.action || 'add'} ${fromSpecs.name || 'Unknown'} → ${toSpecs.name || 'Unknown'}`,
          description: suggestion.description || this.getActionDescription(suggestion.action, fromSpecs.name || 'Unknown', toSpecs.name || 'Unknown', connectionData.fromPin, connectionData.toPin),
          action: suggestion.action || 'add',
          connectionData: {
            // Always generate a unique UUID for connectionData
            id: `conn-${uuidv4()}`,
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent,
            fromPin: connectionData.fromPin,
            toPin: connectionData.toPin,
            wireType: this.normalizeWireType(connectionData.wireType),
            wireColor: connectionData.wireColor || '#0000ff'
            // Do NOT include 'validated' here - it belongs at the suggestion level
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
        from: s.connectionData.fromComponent,
        to: s.connectionData.toComponent
      })));

      return {
        suggestions,
        explanation: aiResponse.explanation || `I generated ${suggestions.length} valid connection suggestions for your circuit.`
      };

    } catch (error) {
      console.error('Error in generateWiringSuggestions:', error);
      
      // Fallback in case of AI error
      return {
        suggestions: [],
        explanation: 'Sorry, I could not generate wiring suggestions at the moment. Please try again.'
      };
    }
  }

  /**
   * Extract pins from a component's technical specifications
   */
  private extractPinsFromTechnicalSpecs(component: any): string[] {
    const specs = component.currentVersion?.specs || {};
    const technicalSpecs = specs.requirements || {};
    const productReference = specs.productReference || {};
    
    console.log(`Extracting pins for component: ${specs.type || component.type}`);
    console.log(`Technical specs:`, technicalSpecs);
    
    // Collect all pins mentioned in the specifications
    const pins: string[] = [];
    
    // 1. Search specs for mentions of pins
    Object.entries(technicalSpecs).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const valueStr = String(value).toLowerCase();
      
      // Common pins
      if (keyLower.includes('pin') || keyLower.includes('broche') || keyLower.includes('gpio')) {
        // Extract patterns like "14 digital pins", "6 analog pins"
        const digitalPins = valueStr.match(/(\d+)\s*digital/i);
        const analogPins = valueStr.match(/(\d+)\s*analog/i);
        const gpioPins = valueStr.match(/(\d+)\s*gpio/i);
        
        if (digitalPins) {
          const count = parseInt(digitalPins[1]);
          // No artificial limitation - use actual number of pins
          for (let i = 0; i < Math.min(count, 60); i++) { // Reasonable limit to avoid errors
            pins.push(`D${i}`);
          }
        }
        
        if (analogPins) {
          const count = parseInt(analogPins[1]);
          // No artificial limitation - use actual number of pins
          for (let i = 0; i < Math.min(count, 20); i++) { // Reasonable limit to avoid errors
            pins.push(`A${i}`);
          }
        }
        
        if (gpioPins) {
          const count = parseInt(gpioPins[1]);
          // No artificial limitation - use actual number of pins
          for (let i = 0; i < Math.min(count, 40); i++) { // Reasonable limit to avoid errors
            pins.push(`GPIO${i}`);
          }
        }
      }
      
      // Communication interfaces
      if (keyLower.includes('interface') || keyLower.includes('communication')) {
        if (valueStr.includes('i2c') || valueStr.includes('iic')) {
          pins.push('SDA', 'SCL');
        }
        if (valueStr.includes('spi')) {
          pins.push('MOSI', 'MISO', 'SCK', 'SS');
        }
        if (valueStr.includes('uart') || valueStr.includes('serial')) {
          pins.push('TX', 'RX');
        }
      }
      
      // Voltage and power
      if (keyLower.includes('voltage') || keyLower.includes('power') || keyLower.includes('supply')) {
        pins.push('VCC', 'GND');
        if (valueStr.includes('3.3v') || valueStr.includes('3v3')) {
          pins.push('3V3');
        }
        if (valueStr.includes('5v')) {
          pins.push('5V');
        }
      }
    });
    
    // 2. Detect component type and add specific pins
    const componentType = (specs.type || component.type || '').toLowerCase();
    
    if (componentType.includes('arduino') || componentType.includes('microcontroller')) {
      // Arduino pinout - detect model to adjust pins
      pins.push('VCC', 'GND', '3V3', '5V', 'VIN', 'RESET');
      
      if (componentType.includes('mega') || technicalSpecs['Digital I/O Pins']?.toString().includes('54')) {
        // Arduino Mega - 54 digital, 16 analog
        if (!pins.some(p => p.startsWith('D'))) {
          for (let i = 0; i <= 53; i++) pins.push(`D${i}`);
        }
        if (!pins.some(p => p.startsWith('A'))) {
          for (let i = 0; i <= 15; i++) pins.push(`A${i}`);
        }
      } else {
        // Arduino Uno/Nano standard - 14 digital, 6 analog
        if (!pins.some(p => p.startsWith('D'))) {
          for (let i = 0; i <= 13; i++) pins.push(`D${i}`);
        }
        if (!pins.some(p => p.startsWith('A'))) {
          for (let i = 0; i <= 5; i++) pins.push(`A${i}`);
        }
      }
    } else if (componentType.includes('esp32')) {
      // ESP32 specific pins - use real available pins
      pins.push('VCC', 'GND', '3V3', 'EN', 'VP', 'VN');
      // ESP32 has 36 GPIOs (0-39 but some are reserved)
      const esp32Pins = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
      esp32Pins.forEach(i => pins.push(`GPIO${i}`));
      // Also add specific analog pins
      [36, 39, 34, 35, 32, 33, 25, 26, 27, 14, 12, 13, 4, 0, 2, 15].forEach(i => pins.push(`A${esp32Pins.indexOf(i) >= 0 ? esp32Pins.indexOf(i) : i}`));
    } else if (componentType.includes('esp8266')) {
      pins.push('VCC', 'GND', '3V3', 'RST', 'CH_PD', 'A0');
      // ESP8266 usable pins
      [0, 2, 4, 5, 12, 13, 14, 15, 16].forEach(i => pins.push(`GPIO${i}`));
    } else if (componentType.includes('sensor')) {
      // Generic sensors
      pins.push('VCC', 'GND', 'DATA', 'SIGNAL', 'OUT');
      if (componentType.includes('analog') || componentType.includes('analogue')) {
        pins.push('AOUT', 'ANALOG');
      }
      if (componentType.includes('digital')) {
        pins.push('DOUT', 'DIGITAL');
      }
    } else if (componentType.includes('display') || componentType.includes('lcd') || componentType.includes('oled')) {
      pins.push('VCC', 'GND', 'SDA', 'SCL', 'CS', 'DC', 'RST', 'MOSI', 'SCK');
    } else if (componentType.includes('relay')) {
      pins.push('VCC', 'GND', 'IN', 'SIGNAL', 'COM', 'NO', 'NC');
    } else if (componentType.includes('motor') || componentType.includes('servo')) {
      pins.push('VCC', 'GND', 'SIGNAL', 'PWM', 'DIR1', 'DIR2');
    } else if (componentType.includes('battery') || componentType.includes('power')) {
      pins.push('POSITIVE', 'NEGATIVE', 'VCC', 'GND', 'OUT+', 'OUT-');
    }
    
    // 3. If nothing found, use generic pins
    if (pins.length === 0) {
      pins.push('VCC', 'GND', 'SIGNAL', 'DATA');
    }
    
    // 4. Return unique, sorted pins
    const uniquePins = [...new Set(pins)];
    console.log(`Extracted pins for ${specs.type || component.type}:`, uniquePins);
    return uniquePins.sort();
  }

  /**
   * Return valid pins for a component (based on its technical specs)
   */
  private getValidPinsForComponent(component: any): string[] {
    // Use the component's real technical specifications
    return this.extractPinsFromTechnicalSpecs(component);
  }

  /**
   * DEPRECATED: Old function kept for compatibility
   * Use getValidPinsForComponent() instead
   */
  private getValidPinsForComponentType(componentType: string): string[] {
    console.warn('getValidPinsForComponentType() is deprecated. Use getValidPinsForComponent() instead.');
    
    const type = componentType?.toLowerCase() || '';
    
    if (type.includes('microcontroller') || type.includes('arduino')) {
      return ['VCC', 'GND', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'A0', 'A1'];
    } else if (type.includes('sensor')) {
      return ['VCC', 'GND', 'DATA', 'SIGNAL', 'OUT'];
    } else if (type.includes('display')) {
      return ['VCC', 'GND', 'SDA', 'SCL', 'CS', 'DC', 'RST'];
    } else if (type.includes('relay')) {
      return ['VCC', 'GND', 'IN', 'COM', 'NO', 'NC'];
    }
    
    return ['VCC', 'GND', 'SIGNAL', 'DATA'];
  }

  /**
   * Generate action description based on action type
   */
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

  /**
   * Normalize wire types to expected categories
   */
  private normalizeWireType(wireType: string): 'data' | 'power' | 'ground' | 'analog' | 'digital' {
    const type = wireType?.toLowerCase() || 'data';
    
    if (type.includes('power') || type.includes('vcc') || type.includes('vdd')) {
      return 'power';
    } else if (type.includes('ground') || type.includes('gnd')) {
      return 'ground';
    } else if (type.includes('analog')) {
      return 'analog';
    } else if (type.includes('digital') || type.includes('communication')) {
      return 'digital';
    }
    
    return 'data';
  }

  /**
   * Validate a wiring diagram
   */
  async validateWiring(projectId: string, diagram: any) {
    try {
      const errors: any[] = [];
      const warnings: any[] = [];

      // Basic validation - extend with more sophisticated rules
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

          // Check voltage mismatch
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

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error in validateWiring:', error);
      throw error;
    }
  }
}
