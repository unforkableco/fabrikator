import { prisma } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export class WiringService {
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
              diagram: wiringData.diagram || {}
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
              diagram: versionData.diagram || {}
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
   * Valide une configuration de câblage
   */
  async validateWiring(projectId: string, wiringData: { connections: any[]; diagram: any }) {
    try {
      const { connections, diagram } = wiringData;
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Récupérer les matériaux du projet pour validation
      const materials = await prisma.component.findMany({
        where: { projectId },
        include: { currentVersion: true }
      });

      // Créer un map des composants par ID pour validation
      const componentMap = new Map();
      materials.forEach(material => {
        const specs = (material.currentVersion?.specs as any) || {};
        componentMap.set(material.id, {
          id: material.id,
          name: specs.name || 'Unknown',
          type: specs.type || 'unknown',
          pins: this.getComponentPins(specs.type)
        });
      });

      // Valider chaque connexion
      connections.forEach((connection, index) => {
        const connIndex = index + 1;
        
        // Vérifier que les composants existent
        if (!componentMap.has(connection.from)) {
          errors.push(`Connexion ${connIndex}: Composant source '${connection.from}' non trouvé`);
        }
        
        if (!componentMap.has(connection.to)) {
          errors.push(`Connexion ${connIndex}: Composant destination '${connection.to}' non trouvé`);
        }

        // Vérifier les pins si les composants existent
        if (componentMap.has(connection.from) && connection.fromPin) {
          const sourceComponent = componentMap.get(connection.from);
          if (!sourceComponent.pins.includes(connection.fromPin)) {
            warnings.push(`Connexion ${connIndex}: Pin '${connection.fromPin}' non reconnue sur ${sourceComponent.name}`);
          }
        }

        if (componentMap.has(connection.to) && connection.toPin) {
          const destComponent = componentMap.get(connection.to);
          if (!destComponent.pins.includes(connection.toPin)) {
            warnings.push(`Connexion ${connIndex}: Pin '${connection.toPin}' non reconnue sur ${destComponent.name}`);
          }
        }

        // Vérifier les connexions de tension
        if (connection.voltage) {
          if (connection.fromPin?.includes('3V') && connection.voltage !== '3.3V') {
            warnings.push(`Connexion ${connIndex}: Tension incohérente - Pin 3V avec tension ${connection.voltage}`);
          }
          if (connection.fromPin?.includes('5V') && connection.voltage !== '5V') {
            warnings.push(`Connexion ${connIndex}: Tension incohérente - Pin 5V avec tension ${connection.voltage}`);
          }
        }

        // Recommandations de couleur de câble
        if (connection.wire) {
          if (connection.fromPin?.includes('GND') && connection.wire !== 'noir') {
            recommendations.push(`Connexion ${connIndex}: Utilisez un câble noir pour les connexions GND`);
          }
          if (connection.fromPin?.includes('5V') && connection.wire !== 'rouge') {
            recommendations.push(`Connexion ${connIndex}: Utilisez un câble rouge pour les connexions 5V`);
          }
          if (connection.fromPin?.includes('3V') && connection.wire !== 'orange') {
            recommendations.push(`Connexion ${connIndex}: Utilisez un câble orange pour les connexions 3.3V`);
          }
        }
      });

      // Vérifications générales
      const powerConnections = connections.filter(conn => 
        conn.fromPin?.includes('5V') || conn.fromPin?.includes('3V') || conn.fromPin?.includes('VIN')
      );
      const groundConnections = connections.filter(conn => 
        conn.fromPin?.includes('GND') || conn.toPin?.includes('GND')
      );

      if (powerConnections.length === 0) {
        warnings.push('Aucune connexion d\'alimentation détectée');
      }

      if (groundConnections.length === 0) {
        warnings.push('Aucune connexion de masse (GND) détectée');
      }

      if (powerConnections.length > 0 && groundConnections.length === 0) {
        errors.push('Connexions d\'alimentation sans connexions de masse - Circuit incomplet');
      }

      // Vérifier les conflits de pins
      const pinUsage = new Map();
      connections.forEach(connection => {
        const fromKey = `${connection.from}:${connection.fromPin}`;
        const toKey = `${connection.to}:${connection.toPin}`;
        
        if (pinUsage.has(fromKey)) {
          warnings.push(`Pin ${connection.fromPin} du composant ${connection.from} utilisée plusieurs fois`);
        } else {
          pinUsage.set(fromKey, true);
        }
        
        if (pinUsage.has(toKey)) {
          warnings.push(`Pin ${connection.toPin} du composant ${connection.to} utilisée plusieurs fois`);
        } else {
          pinUsage.set(toKey, true);
        }
      });

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        warnings,
        recommendations,
        connectionCount: connections.length,
        componentCount: componentMap.size,
        summary: isValid 
          ? `Câblage valide avec ${connections.length} connexion(s)`
          : `${errors.length} erreur(s) détectée(s) dans le câblage`
      };

    } catch (error) {
      console.error('Error in validateWiring:', error);
      throw error;
    }
  }

  /**
   * Obtient les pins disponibles pour un type de composant
   */
  private getComponentPins(type?: string): string[] {
    const componentType = type?.toLowerCase() || '';
    
    const pinMappings: { [key: string]: string[] } = {
      'arduino': ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'VIN', '5V', '3.3V', 'GND'],
      'esp32': ['GPIO0', 'GPIO1', 'GPIO2', 'GPIO3', 'GPIO4', 'GPIO5', 'GPIO12', 'GPIO13', 'GPIO14', 'GPIO15', 'GPIO16', 'GPIO17', 'GPIO18', 'GPIO19', 'GPIO21', 'GPIO22', 'GPIO23', '3V3', 'GND', 'VIN'],
      'sensor': ['VCC', 'GND', 'OUT', 'SDA', 'SCL'],
      'dht22': ['VCC', 'GND', 'DATA'],
      'relay': ['VCC', 'GND', 'IN', 'COM', 'NO', 'NC'],
      'led': ['ANODE', 'CATHODE'],
      'resistor': ['PIN1', 'PIN2'],
      'capacitor': ['POSITIVE', 'NEGATIVE'],
      'button': ['PIN1', 'PIN2'],
      'servo': ['VCC', 'GND', 'SIGNAL']
    };
    
    for (const [key, pins] of Object.entries(pinMappings)) {
      if (componentType.includes(key)) {
        return pins;
      }
    }
    
    return ['VCC', 'GND', 'OUT'];
  }
}
