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
      
      return await prisma.$transaction(async (tx) => {
        // Obtenir le numéro de la prochaine version
        const nextVersionNumber = wiringSchema.versions.length > 0 
          ? wiringSchema.versions[0].versionNumber + 1 
          : 1;
        
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

      // Utiliser l'IA pour générer les suggestions
      const aiResponse = await this.aiService.generateWiringSuggestions({
        prompt,
        materials: simplifiedMaterials,
        currentDiagram
      });

      console.log('WiringService - AI response received:', aiResponse);

      // Transformer la réponse IA en format attendu par le frontend
      const suggestions = aiResponse.suggestions?.map((suggestion: any, index: number) => {
        // Vérifier que la suggestion a les données de connexion nécessaires
        if (!suggestion.connectionData) {
          console.warn('Suggestion without connectionData:', suggestion);
          return null;
        }

        const connectionData = suggestion.connectionData;
        
        // VALIDATION CRITIQUE: Vérifier que les composants référencés existent
        const fromComponentExists = simplifiedMaterials.find(m => m.id === connectionData.fromComponent);
        const toComponentExists = simplifiedMaterials.find(m => m.id === connectionData.toComponent);
        
        if (!fromComponentExists || !toComponentExists) {
          console.error('❌ CONNEXION REJETÉE - Composants inexistants:', {
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent,
            availableComponents: simplifiedMaterials.map(m => ({ id: m.id, name: m.name, type: m.type }))
          });
          return null;
        }

        // VALIDATION: Vérifier que les broches sont appropriées pour le type de composant
        const validPins = this.getValidPinsForComponentType(fromComponentExists.type);
        const validToPins = this.getValidPinsForComponentType(toComponentExists.type);
        
        if (!validPins.includes(connectionData.fromPin) || !validToPins.includes(connectionData.toPin)) {
          console.warn('⚠️ BROCHES INVALIDES - Connexion ajustée:', {
            from: `${fromComponentExists.name}(${fromComponentExists.type}).${connectionData.fromPin}`,
            to: `${toComponentExists.name}(${toComponentExists.type}).${connectionData.toPin}`,
            validFromPins: validPins,
            validToPins: validToPins
          });
          
          // Ajuster les broches si nécessaire
          if (!validPins.includes(connectionData.fromPin)) {
            connectionData.fromPin = validPins[0] || 'pin1';
          }
          if (!validToPins.includes(connectionData.toPin)) {
            connectionData.toPin = validToPins[0] || 'pin1';
          }
        }

        return {
          id: connectionData.id || `wiring-suggestion-${Date.now()}-${index}`,
          title: suggestion.type || `Connexion ${fromComponentExists.name} → ${toComponentExists.name}`,
          description: suggestion.description || `Connecter ${fromComponentExists.name} (${connectionData.fromPin}) à ${toComponentExists.name} (${connectionData.toPin})`,
          action: suggestion.action || 'add',
          connectionData: {
            ...connectionData,
            wireType: this.normalizeWireType(connectionData.wireType),
            // S'assurer que les IDs sont corrects
            fromComponent: connectionData.fromComponent,
            toComponent: connectionData.toComponent
          },
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
   * Retourne les broches valides pour un type de composant donné
   */
  private getValidPinsForComponentType(componentType: string): string[] {
    const type = componentType?.toLowerCase() || '';
    
    if (type.includes('microcontroller') || type.includes('arduino')) {
      return ['vcc', 'gnd', 'gpio1', 'gpio2', 'gpio3', 'gpio4', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'a0', 'a1'];
    } else if (type.includes('sensor') || type.includes('capteur')) {
      return ['vcc', 'gnd', 'data', 'signal', 'out'];
    } else if (type.includes('display') || type.includes('écran')) {
      return ['vcc', 'gnd', 'sda', 'scl', 'cs', 'dc', 'rst'];
    } else if (type.includes('battery') || type.includes('batterie')) {
      return ['positive', 'negative'];
    } else if (type.includes('power') || type.includes('alimentation')) {
      return ['positive', 'negative', 'vcc', 'gnd'];
    } else if (type.includes('button') || type.includes('bouton')) {
      return ['pin1', 'pin2', 'signal', 'gnd'];
    } else if (type.includes('pump') || type.includes('pompe')) {
      return ['vcc', 'gnd', 'signal', 'control'];
    } else if (type.includes('valve')) {
      return ['vcc', 'gnd', 'signal', 'control'];
    } else if (type.includes('moisture') || type.includes('humidité') || type.includes('water')) {
      return ['vcc', 'gnd', 'data', 'signal', 'analog'];
    }
    
    // Par défaut pour composants génériques
    return ['pin1', 'pin2', 'vcc', 'gnd'];
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
