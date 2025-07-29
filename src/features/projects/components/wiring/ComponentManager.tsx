import { WiringDiagram, WiringComponent, WiringConnection } from '../../../../shared/types';
import { useComponentMapper } from '../../hooks/useComponentMapper';
import { usePinMapping } from '../../hooks/usePinMapping';
import { useWiring } from '../../hooks/useWiring';

interface ComponentManagerProps {
  diagram: WiringDiagram | null;
  materials: any[];
  projectId?: string;
  onDiagramUpdate: (diagram: WiringDiagram) => void;
  onWiringUpdated?: () => void;
}

export const useComponentManager = ({
  diagram,
  materials,
  projectId,
  onDiagramUpdate,
  onWiringUpdated
}: ComponentManagerProps) => {
  const { createComponentFromMaterial } = useComponentMapper();
  const { mapPinName } = usePinMapping();
  const { saveWiringDiagram } = useWiring(projectId);

  const handleComponentAdd = async (component: WiringComponent) => {
    console.log('➕ Adding component to diagram:', component);
    console.log('Current diagram:', diagram);
    
    let finalDiagram: WiringDiagram;
    
    if (!diagram) {
      // Create new diagram if none exists
      finalDiagram = {
        id: `diagram-${Date.now()}`,
        components: [component],
        connections: [],
        metadata: {
          title: 'New Wiring Diagram',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        }
      };
      console.log('Created new diagram:', finalDiagram);
      onDiagramUpdate(finalDiagram);
    } else {
      finalDiagram = {
        ...diagram,
        components: [...diagram.components, component],
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      console.log('Updated diagram:', finalDiagram);
      onDiagramUpdate(finalDiagram);
    }
    
    // Sauvegarder le diagramme après ajout de composant
    try {
      console.log('💾 Saving diagram after component add...');
      await saveWiringDiagram(finalDiagram);
      console.log('✅ Diagram saved successfully after component add');
    } catch (error) {
      console.error('❌ Failed to save diagram after component add:', error);
    }
    
    onWiringUpdated?.();
  };

  const handleConnectionAdd = async (connection: WiringConnection) => {
    console.log('🔌 Adding manual connection:', connection);
    console.log('Current diagram:', diagram);
    console.log('Available materials:', materials);
    
    let finalDiagram: WiringDiagram;
    
    if (!diagram) {
      // Créer un nouveau diagramme en utilisant TOUS les matériaux disponibles
      const allComponents: WiringComponent[] = [];
      
      // Créer des composants pour TOUS les matériaux disponibles
      materials.forEach((material, index) => {
        const component = createComponentFromMaterial(material, index);
        allComponents.push(component);
      });
      
      console.log('Created all available components:', allComponents);
      
      // Mapper les broches de la connexion avant de l'ajouter
      const fromComponent = allComponents.find(c => c.id === connection.fromComponent);
      const toComponent = allComponents.find(c => c.id === connection.toComponent);
      
      let mappedConnection = { ...connection };
      if (fromComponent) {
        mappedConnection.fromPin = mapPinName(connection.fromPin, fromComponent.pins);
      }
      if (toComponent) {
        mappedConnection.toPin = mapPinName(connection.toPin, toComponent.pins);
      }
      
      console.log('Mapped connection pins:', {
        original: { fromPin: connection.fromPin, toPin: connection.toPin },
        mapped: { fromPin: mappedConnection.fromPin, toPin: mappedConnection.toPin }
      });
      
      // Créer le nouveau diagramme avec tous les composants
      finalDiagram = {
        id: `diagram-${Date.now()}`,
        components: allComponents,
        connections: [mappedConnection],
        metadata: {
          title: 'Circuit Optimal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        }
      };
      
      console.log('Created new diagram with all materials:', finalDiagram);
      onDiagramUpdate(finalDiagram);
    } else {
      // Vérifier si les composants de la connexion existent déjà
      const fromExists = diagram.components.find(c => c.id === connection.fromComponent);
      const toExists = diagram.components.find(c => c.id === connection.toComponent);
      
      let updatedComponents = [...diagram.components];
      
      // Créer SEULEMENT les composants manquants (ne devrait pas arriver si on utilise tous les matériaux)
      if (!fromExists) {
        const material = materials.find(m => m.id === connection.fromComponent);
        if (material) {
          const component = createComponentFromMaterial(material, updatedComponents.length);
          updatedComponents.push(component);
          console.log('Added missing fromComponent:', component.name);
        }
      }
      
      if (!toExists) {
        const material = materials.find(m => m.id === connection.toComponent);
        if (material) {
          const component = createComponentFromMaterial(material, updatedComponents.length);
          updatedComponents.push(component);
          console.log('Added missing toComponent:', component.name);
        }
      }
      
      // Mapper les broches de la connexion
      const fromComponent = updatedComponents.find(c => c.id === connection.fromComponent);
      const toComponent = updatedComponents.find(c => c.id === connection.toComponent);
      
      let mappedConnection = { ...connection };
      if (fromComponent) {
        mappedConnection.fromPin = mapPinName(connection.fromPin, fromComponent.pins);
      }
      if (toComponent) {
        mappedConnection.toPin = mapPinName(connection.toPin, toComponent.pins);
      }
      
      console.log('Mapped connection pins:', {
        original: { fromPin: connection.fromPin, toPin: connection.toPin },
        mapped: { fromPin: mappedConnection.fromPin, toPin: mappedConnection.toPin }
      });
      
      // Ajouter la connexion
      finalDiagram = {
        ...diagram,
        components: updatedComponents,
        connections: [...diagram.connections, mappedConnection],
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      
      console.log('Updated existing diagram with connection:', finalDiagram);
      onDiagramUpdate(finalDiagram);
    }
    
    // Sauvegarder le diagramme après ajout de connexion manuelle
    try {
      console.log('💾 Saving diagram after manual connection add...');
      await saveWiringDiagram(finalDiagram);
      console.log('✅ Diagram saved successfully after manual connection add');
    } catch (error) {
      console.error('❌ Failed to save diagram after manual connection add:', error);
    }
    
    onWiringUpdated?.();
  };

  const handleConnectionUpdate = async (connectionId: string, updates: Partial<WiringConnection>) => {
    if (diagram) {
      console.log('📝 Updating connection:', connectionId, 'with:', updates);
      
      const updatedConnections = diagram.connections.map(conn =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      );
      const updatedDiagram = {
        ...diagram,
        connections: updatedConnections,
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      
      onDiagramUpdate(updatedDiagram);
      
      // Sauvegarder le diagramme après mise à jour
      try {
        console.log('💾 Saving diagram after connection update...');
        await saveWiringDiagram(updatedDiagram);
        console.log('✅ Diagram saved successfully after update');
      } catch (error) {
        console.error('❌ Failed to save diagram after update:', error);
      }
      
      onWiringUpdated?.();
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    if (diagram) {
      const connectionToDelete = diagram.connections.find(conn => conn.id === connectionId);
      console.log('🗑️ Deleting connection:', connectionToDelete);
      
      const updatedDiagram = {
        ...diagram,
        connections: diagram.connections.filter(conn => conn.id !== connectionId),
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      
      console.log('🔄 Updated diagram after deletion:', updatedDiagram.connections.length, 'connections remaining');
      onDiagramUpdate(updatedDiagram);
      
      // Sauvegarder le diagramme après suppression
      try {
        console.log('💾 Saving diagram after connection deletion...');
        await saveWiringDiagram(updatedDiagram);
        console.log('✅ Diagram saved successfully after deletion');
      } catch (error) {
        console.error('❌ Failed to save diagram after deletion:', error);
      }
      
      onWiringUpdated?.();
    }
  };

  const handleComponentDelete = async (componentId: string) => {
    if (diagram) {
      const componentToDelete = diagram.components.find(comp => comp.id === componentId);
      const connectionsToDelete = diagram.connections.filter(
        conn => conn.fromComponent === componentId || conn.toComponent === componentId
      );
      
      console.log('🗑️ Deleting component:', componentToDelete?.name);
      console.log('🗑️ This will also delete', connectionsToDelete.length, 'connections');
      
      // Supprimer le composant et toutes ses connexions
      const updatedDiagram = {
        ...diagram,
        components: diagram.components.filter(comp => comp.id !== componentId),
        connections: diagram.connections.filter(
          conn => conn.fromComponent !== componentId && conn.toComponent !== componentId
        ),
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      
      console.log('🔄 Updated diagram after component deletion:', updatedDiagram.components.length, 'components,', updatedDiagram.connections.length, 'connections');
      onDiagramUpdate(updatedDiagram);
      
      // Sauvegarder le diagramme après suppression
      try {
        console.log('💾 Saving diagram after component deletion...');
        await saveWiringDiagram(updatedDiagram);
        console.log('✅ Diagram saved successfully after component deletion');
      } catch (error) {
        console.error('❌ Failed to save diagram after component deletion:', error);
      }
      
      onWiringUpdated?.();
    }
  };

  const handleComponentUpdate = (componentId: string, updates: Partial<WiringComponent>) => {
    if (diagram) {
      const updatedComponents = diagram.components.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      );
      const updatedDiagram = {
        ...diagram,
        components: updatedComponents,
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      onDiagramUpdate(updatedDiagram);
      onWiringUpdated?.();
    }
  };

  return {
    handleComponentAdd,
    handleConnectionAdd,
    handleConnectionUpdate,
    handleConnectionDelete,
    handleComponentDelete,
    handleComponentUpdate
  };
}; 