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
    
    // Save diagram after component add
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
      // Create a new diagram using ALL available materials
      const allComponents: WiringComponent[] = [];
      
      // Create components for ALL available materials
      materials.forEach((material, index) => {
        const component = createComponentFromMaterial(material, index);
        allComponents.push(component);
      });
      
      console.log('Created all available components:', allComponents);
      
      // Map connection pins before adding
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
      
      // Create the new diagram with all components
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
      // Check if connection components already exist
      const fromExists = diagram.components.find(c => c.id === connection.fromComponent);
      const toExists = diagram.components.find(c => c.id === connection.toComponent);
      
      let updatedComponents = [...diagram.components];
      
      // Create ONLY missing components (should not happen if using all materials)
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
      
      // Map connection pins
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
      
      // Add the connection
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
    
    // Save diagram after manual connection add
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
      
      // Save diagram after update
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
      
      // Save diagram after deletion
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
      
      // Delete component and all its connections
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
      
      // Save diagram after deletion
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