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
      // silent
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
      // silent
      onDiagramUpdate(finalDiagram);
    }
    
    // Save diagram after component add
    try {
      // silent
      await saveWiringDiagram(finalDiagram);
      // silent
    } catch (error) {
      // silent
    }
    
    onWiringUpdated?.();
  };

  const handleConnectionAdd = async (connection: WiringConnection) => {
    // silent
    
    let finalDiagram: WiringDiagram;
    
    if (!diagram) {
      // Create a new diagram using ALL available materials
      const allComponents: WiringComponent[] = [];
      
      // Create components for ALL available materials
      materials.forEach((material, index) => {
        const component = createComponentFromMaterial(material, index);
        allComponents.push(component);
      });
      
      // silent
      
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
      
      // silent
      
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
      
      // silent
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
          // silent
        }
      }
      
      if (!toExists) {
        const material = materials.find(m => m.id === connection.toComponent);
        if (material) {
          const component = createComponentFromMaterial(material, updatedComponents.length);
          updatedComponents.push(component);
          // silent
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
      
      // silent
      
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
      
      // silent
      onDiagramUpdate(finalDiagram);
    }
    
    // Save diagram after manual connection add
    try {
      // silent
      await saveWiringDiagram(finalDiagram);
      // silent
    } catch (error) {
      // silent
    }
    
    onWiringUpdated?.();
  };

  const handleConnectionUpdate = async (connectionId: string, updates: Partial<WiringConnection>) => {
    if (diagram) {
      // silent
      
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
        // silent
        await saveWiringDiagram(updatedDiagram);
        // silent
      } catch (error) {
        // silent
      }
      
      onWiringUpdated?.();
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    if (diagram) {
      
      const updatedDiagram = {
        ...diagram,
        connections: diagram.connections.filter(conn => conn.id !== connectionId),
        metadata: {
          ...diagram.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      
      // silent
      onDiagramUpdate(updatedDiagram);
      
      // Save diagram after deletion
      try {
        // silent
        await saveWiringDiagram(updatedDiagram);
        // silent
      } catch (error) {
        // silent
      }
      
      onWiringUpdated?.();
    }
  };

  const handleComponentDelete = async (componentId: string) => {
    if (diagram) {
      
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
      
      // silent
      onDiagramUpdate(updatedDiagram);
      
      // Save diagram after deletion
      try {
        // silent
        await saveWiringDiagram(updatedDiagram);
        // silent
      } catch (error) {
        // silent
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