import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../../services/ai.service';

const prisma = new PrismaClient();

export class WiringService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Récupère le plan de câblage pour un projet
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
   * Crée un nouveau plan de câblage pour un projet
   */
  async createWiring(projectId: string, wiringData: any) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Créer le schéma de câblage
        const wiringSchema = await tx.wiringSchema.create({
          data: { 
            id: uuidv4(),
            projectId 
          }
        });
        
        // Créer la première version
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
        
        // Mettre à jour le schéma pour pointer vers cette version
        await tx.wiringSchema.update({
          where: { id: wiringSchema.id },
          data: { currentVersionId: version.id }
        });
        
        // Créer une entrée de changelog
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
   * Récupère un plan de câblage par son ID
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
   * Ajoute une nouvelle version à un plan de câblage existant
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
            // Obtenir toutes les versions existantes pour ce schéma
            const existingVersions = await tx.wireVersion.findMany({
              where: { wiringSchemaId },
              select: { versionNumber: true },
              orderBy: { versionNumber: 'desc' }
            });
            
            // Calculer le prochain numéro de version disponible
            let nextVersionNumber = 1;
            if (existingVersions.length > 0) {
              const usedNumbers = existingVersions.map(v => v.versionNumber).sort((a, b) => a - b);
              nextVersionNumber = usedNumbers[usedNumbers.length - 1] + 1;
            }
            
            // Ajouter l'offset des tentatives pour éviter les collisions
            nextVersionNumber += attempts;
            
            console.log(`Creating version ${nextVersionNumber} for schema ${wiringSchemaId}`);
            
            // Créer une nouvelle version
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
            
            // Mettre à jour le schéma pour pointer vers cette version
            await tx.wiringSchema.update({
              where: { id: wiringSchemaId },
              data: { currentVersionId: version.id }
            });
            
            // Créer une entrée de changelog
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
            // Unique constraint violation, try with next attempt
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
   * Récupère les versions d'un plan de câblage
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
   * Génère des suggestions de câblage avec l'IA
   */
  async generateWiringSuggestions(projectId: string, prompt: string, currentDiagram: any) {
    try {
      console.log('WiringService - Generating AI suggestions for:', prompt);
      
      // Récupérer les matériaux du projet depuis la base de données
      const materials = await prisma.component.findMany({
        where: { projectId },
        include: { currentVersion: true }
      });

      // Transformer les matériaux en format simple pour l'IA
      const simplifiedMaterials = materials.map(material => {
        const specs = material.currentVersion?.specs as any || {};
        return {
          id: material.id,
          name: specs.name || 'Composant',
          type: specs.type || 'unknown',
          quantity: specs.quantity || 1,
          description: specs.description || '',
          specifications: specs.technicalSpecs || {}
        };
      });

      console.log('WiringService - Available materials:', simplifiedMaterials.length);
      
      // Analyser les connexions existantes
      const existingConnections = currentDiagram?.connections || [];
      console.log('WiringService - Existing connections:', existingConnections.length);
      console.log('WiringService - Current diagram:', JSON.stringify(currentDiagram, null, 2));
      
      // Créer un mapping des connexions existantes pour l'IA
      const existingConnectionsForAI = existingConnections.map((conn: any) => ({
        id: conn.id,
        fromComponent: conn.fromComponent,
        fromPin: conn.fromPin,
        toComponent: conn.toComponent,
        toPin: conn.toPin,
        wireType: conn.wireType,
        wireColor: conn.wireColor
      }));

      // Utiliser l'IA pour générer les suggestions
      const aiResponse = await this.aiService.generateWiringSuggestions({
        prompt,
        materials: simplifiedMaterials,
        currentDiagram: {
          ...currentDiagram,
          existingConnections: existingConnectionsForAI
        }
      });

      console.log('WiringService - AI response received:', aiResponse);

      // Transformer la réponse IA en format attendu par le frontend
      const suggestions = aiResponse.suggestions?.map((suggestion: any, index: number) => {
        // Pour les actions "remove", connectionData peut être null
        if (suggestion.action === 'remove') {
          if (!suggestion.existingConnectionId) {
            console.warn('Remove action without existingConnectionId:', suggestion);
            return null;
          }
          
          // Trouver la connexion existante à supprimer
          const connectionToRemove = existingConnections.find((conn: any) => conn.id === suggestion.existingConnectionId);
          if (!connectionToRemove) {
            console.warn('Existing connection not found for removal:', suggestion.existingConnectionId);
            return null;
          }
          
          return {
            id: `remove-suggestion-${Date.now()}-${index}`,
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
        
        // Pour les actions "add" et "update", vérifier que la suggestion a les données de connexion nécessaires
        if (!suggestion.connectionData) {
          console.warn('Suggestion without connectionData:', suggestion);
          return null;
        }

        const connectionData = suggestion.connectionData;
        
        // Vérifier si cette connexion existe déjà pour les actions 'add'
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
            console.log('⚠️ Skipping duplicate connection:', {
              from: connectionData.fromComponent,
              to: connectionData.toComponent,
              fromPin: connectionData.fromPin,
              toPin: connectionData.toPin
            });
            return null;
          }
        }
        
        // VALIDATION CRITIQUE: Vérifier que les composants référencés existent
        const fromComponentExists = materials.find(m => m.id === connectionData.fromComponent);
        const toComponentExists = materials.find(m => m.id === connectionData.toComponent);
        
        if (!fromComponentExists || !toComponentExists) {
          console.error('❌ CONNEXION REJETÉE - Composants inexistants:', {
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent,
            availableComponents: materials.map(m => {
              const specs = m.currentVersion?.specs as any || {};
              return { id: m.id, name: specs.name || 'Unknown', type: specs.type || 'unknown' };
            })
          });
          return null;
        }

        // VALIDATION: Vérifier que les broches sont appropriées basées sur les spécifications techniques
        const validFromPins = this.getValidPinsForComponent(fromComponentExists);
        const validToPins = this.getValidPinsForComponent(toComponentExists);
        
        if (!validFromPins.includes(connectionData.fromPin) || !validToPins.includes(connectionData.toPin)) {
          const fromSpecs = fromComponentExists.currentVersion?.specs as any || {};
          const toSpecs = toComponentExists.currentVersion?.specs as any || {};
          
          console.warn('⚠️ BROCHES INVALIDES - Connexion ajustée (basée sur spécifications techniques):', {
            from: `${fromSpecs.name || 'Unknown'}(${fromSpecs.type || 'Unknown'}).${connectionData.fromPin}`,
            to: `${toSpecs.name || 'Unknown'}(${toSpecs.type || 'Unknown'}).${connectionData.toPin}`,
            validFromPins: validFromPins,
            validToPins: validToPins,
            fromComponentSpecs: fromSpecs.requirements || {},
            toComponentSpecs: toSpecs.requirements || {}
          });
          
          // Ajuster les broches si nécessaire en privilégiant les broches appropriées
          if (!validFromPins.includes(connectionData.fromPin)) {
            // Choisir une broche appropriée selon le type de connexion
            if (connectionData.wireType === 'power') {
              connectionData.fromPin = validFromPins.find(p => ['VCC', '5V', '3V3', 'POSITIVE', 'OUT+'].includes(p)) || validFromPins[0];
            } else if (connectionData.wireType === 'ground') {
              connectionData.fromPin = validFromPins.find(p => ['GND', 'NEGATIVE', 'OUT-'].includes(p)) || validFromPins[0];
            } else {
              connectionData.fromPin = validFromPins.find(p => !['VCC', 'GND', '5V', '3V3'].includes(p)) || validFromPins[0];
          }
          }
          
          if (!validToPins.includes(connectionData.toPin)) {
            // Choisir une broche appropriée selon le type de connexion
            if (connectionData.wireType === 'power') {
              connectionData.toPin = validToPins.find(p => ['VCC', '5V', '3V3', 'POSITIVE'].includes(p)) || validToPins[0];
            } else if (connectionData.wireType === 'ground') {
              connectionData.toPin = validToPins.find(p => ['GND', 'NEGATIVE'].includes(p)) || validToPins[0];
            } else {
              connectionData.toPin = validToPins.find(p => !['VCC', 'GND', '5V', '3V3'].includes(p)) || validToPins[0];
            }
          }
          
          console.log('🔧 BROCHES AJUSTÉES:', {
            fromPin: connectionData.fromPin,
            toPin: connectionData.toPin
          });
          }

        const fromSpecs = fromComponentExists.currentVersion?.specs as any || {};
        const toSpecs = toComponentExists.currentVersion?.specs as any || {};

        return {
          id: connectionData.id || `wiring-suggestion-${Date.now()}-${index}`,
          title: suggestion.type || `${suggestion.action || 'add'} ${fromSpecs.name || 'Unknown'} → ${toSpecs.name || 'Unknown'}`,
          description: suggestion.description || this.getActionDescription(suggestion.action, fromSpecs.name || 'Unknown', toSpecs.name || 'Unknown', connectionData.fromPin, connectionData.toPin),
          action: suggestion.action || 'add',
          connectionData: {
            ...connectionData,
            wireType: this.normalizeWireType(connectionData.wireType),
            // S'assurer que les IDs sont corrects
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent
          },
          existingConnectionId: suggestion.existingConnectionId,
          componentData: suggestion.componentData,
          expanded: false,
          validated: false,
          confidence: suggestion.confidence || 0.8
        };
      }).filter(Boolean) || []; // Filtrer les suggestions nulles

      console.log('WiringService - Processed suggestions:', suggestions.length);
      console.log('WiringService - Valid suggestions:', suggestions.map((s: any) => ({
        title: s.title,
        from: s.connectionData.fromComponent,
        to: s.connectionData.toComponent
      })));

      return {
        suggestions,
        explanation: aiResponse.explanation || `J'ai généré ${suggestions.length} suggestions de connexions valides pour votre circuit.`
      };

    } catch (error) {
      console.error('Error in generateWiringSuggestions:', error);
      
      // Fallback en cas d'erreur IA
      return {
        suggestions: [],
        explanation: 'Désolé, je n\'ai pas pu générer de suggestions de câblage pour le moment. Veuillez réessayer.'
      };
    }
  }

  /**
   * Extrait les broches depuis les spécifications techniques d'un composant
   */
  private extractPinsFromTechnicalSpecs(component: any): string[] {
    const specs = component.currentVersion?.specs || {};
    const technicalSpecs = specs.requirements || {};
    const productReference = specs.productReference || {};
    
    console.log(`🔍 Extracting pins for component: ${specs.type || component.type}`);
    console.log(`📋 Technical specs:`, technicalSpecs);
    
    // Collecter toutes les broches mentionnées dans les spécifications
    const pins: string[] = [];
    
    // 1. Chercher dans les spécifications techniques pour des mentions de broches/pins
    Object.entries(technicalSpecs).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const valueStr = String(value).toLowerCase();
      
      // Broches communes
      if (keyLower.includes('pin') || keyLower.includes('broche') || keyLower.includes('gpio')) {
        // Extraire des patterns comme "14 digital pins", "6 analog pins"
        const digitalPins = valueStr.match(/(\d+)\s*digital/i);
        const analogPins = valueStr.match(/(\d+)\s*analog/i);
        const gpioPins = valueStr.match(/(\d+)\s*gpio/i);
        
        if (digitalPins) {
          const count = parseInt(digitalPins[1]);
          // Pas de limitation artificielle - utiliser le vrai nombre de broches
          for (let i = 0; i < Math.min(count, 60); i++) { // Limite raisonnable pour éviter les erreurs
            pins.push(`D${i}`);
          }
        }
        
        if (analogPins) {
          const count = parseInt(analogPins[1]);
          // Pas de limitation artificielle - utiliser le vrai nombre de broches
          for (let i = 0; i < Math.min(count, 20); i++) { // Limite raisonnable pour éviter les erreurs
            pins.push(`A${i}`);
          }
        }
        
        if (gpioPins) {
          const count = parseInt(gpioPins[1]);
          // Pas de limitation artificielle - utiliser le vrai nombre de broches
          for (let i = 0; i < Math.min(count, 40); i++) { // Limite raisonnable pour éviter les erreurs
            pins.push(`GPIO${i}`);
          }
        }
      }
      
      // Interfaces de communication
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
      
      // Voltage et alimentation
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
    
    // 2. Détecter le type de composant et ajouter des broches spécifiques
    const componentType = (specs.type || component.type || '').toLowerCase();
    
    if (componentType.includes('arduino') || componentType.includes('microcontroller')) {
      // Arduino pinout - détecter le modèle pour ajuster les broches
      pins.push('VCC', 'GND', '3V3', '5V', 'VIN', 'RESET');
      
      if (componentType.includes('mega') || technicalSpecs['Digital I/O Pins']?.toString().includes('54')) {
        // Arduino Mega - 54 broches numériques, 16 analogiques
        if (!pins.some(p => p.startsWith('D'))) {
          for (let i = 0; i <= 53; i++) pins.push(`D${i}`);
        }
        if (!pins.some(p => p.startsWith('A'))) {
          for (let i = 0; i <= 15; i++) pins.push(`A${i}`);
        }
      } else {
        // Arduino Uno/Nano standard - 14 broches numériques, 6 analogiques
        if (!pins.some(p => p.startsWith('D'))) {
          for (let i = 0; i <= 13; i++) pins.push(`D${i}`);
        }
        if (!pins.some(p => p.startsWith('A'))) {
          for (let i = 0; i <= 5; i++) pins.push(`A${i}`);
        }
      }
    } else if (componentType.includes('esp32')) {
      // ESP32 specific pins - Utiliser les vraies broches disponibles
      pins.push('VCC', 'GND', '3V3', 'EN', 'VP', 'VN');
      // ESP32 a 36 GPIO (0-39 mais certaines sont réservées)
      const esp32Pins = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
      esp32Pins.forEach(i => pins.push(`GPIO${i}`));
      // Ajouter aussi les broches analogiques spécifiques
      [36, 39, 34, 35, 32, 33, 25, 26, 27, 14, 12, 13, 4, 0, 2, 15].forEach(i => pins.push(`A${esp32Pins.indexOf(i) >= 0 ? esp32Pins.indexOf(i) : i}`));
    } else if (componentType.includes('esp8266')) {
      pins.push('VCC', 'GND', '3V3', 'RST', 'CH_PD', 'A0');
      // ESP8266 broches utilisables
      [0, 2, 4, 5, 12, 13, 14, 15, 16].forEach(i => pins.push(`GPIO${i}`));
    } else if (componentType.includes('sensor')) {
      // Capteurs génériques
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
    
    // 3. Si aucune broche n'a été trouvée, utiliser des broches génériques
    if (pins.length === 0) {
      pins.push('VCC', 'GND', 'SIGNAL', 'DATA');
    }
    
    // 4. Retourner les broches uniques, triées
    const uniquePins = [...new Set(pins)];
    console.log(`📌 Extracted pins for ${specs.type || component.type}:`, uniquePins);
    return uniquePins.sort();
  }

  /**
   * Retourne les broches valides pour un composant donné (basé sur ses spécifications techniques)
   */
  private getValidPinsForComponent(component: any): string[] {
    // Utiliser les spécifications techniques réelles du composant
    return this.extractPinsFromTechnicalSpecs(component);
  }

  /**
   * DEPRECATED: Ancienne fonction gardée pour compatibilité
   * Utiliser getValidPinsForComponent() à la place
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
   * Normalise les types de fils pour correspondre aux types attendus
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
   * Valide un schéma de câblage
   */
  async validateWiring(projectId: string, diagram: any) {
    try {
      const errors: any[] = [];
      const warnings: any[] = [];

      // Validation basique - à étendre avec une logique de validation plus sophistiquée
      if (diagram.components && diagram.connections) {
        for (const connection of diagram.connections) {
          const fromComponent = diagram.components.find((c: any) => c.id === connection.fromComponent);
          const toComponent = diagram.components.find((c: any) => c.id === connection.toComponent);

          if (!fromComponent || !toComponent) {
            errors.push({
              id: `error-${connection.id}`,
              type: 'invalid_connection',
              message: `Connexion invalide: composant manquant pour ${connection.id}`,
              connectionId: connection.id,
              severity: 'error'
            });
          }

          // Vérifier les incompatibilités de tension
          const fromPin = fromComponent?.pins?.find((p: any) => p.id === connection.fromPin);
          const toPin = toComponent?.pins?.find((p: any) => p.id === connection.toPin);

          if (fromPin && toPin && fromPin.voltage && toPin.voltage && fromPin.voltage !== toPin.voltage) {
            warnings.push({
              id: `warning-${connection.id}`,
              type: 'voltage_mismatch',
              message: `Différence de tension détectée: ${fromPin.voltage}V vs ${toPin.voltage}V`,
              suggestion: 'Vérifiez la compatibilité des tensions ou ajoutez un convertisseur.'
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
