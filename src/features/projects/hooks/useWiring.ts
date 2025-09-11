import { useState, useEffect, useCallback } from 'react';
import { WiringDiagram, WiringConnection, WiringComponent } from '../../../shared/types';
import { api } from '../../../shared/services/api';

export const useWiring = (projectId?: string) => {
  const [wiringDiagram, setWiringDiagram] = useState<WiringDiagram | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWiringDiagram = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const response = await api.wiring.getWiringForProject(projectId);
      if (response) {
        // Transform backend data to frontend format
        const diagram: WiringDiagram = {
          id: response.id,
          components: response.currentVersion?.wiringData?.components || [],
          connections: response.currentVersion?.wiringData?.connections || [],
          metadata: {
            title: 'Wiring Diagram',
            description: 'Project wiring diagram',
            createdAt: response.currentVersion?.createdAt || new Date().toISOString(),
            updatedAt: response.currentVersion?.createdAt || new Date().toISOString(),
            version: response.currentVersion?.versionNumber || 1
          }
        };
        setWiringDiagram(diagram);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching wiring diagram:', err);
      setError('Failed to load wiring diagram');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchWiringDiagram();
    }
  }, [projectId, fetchWiringDiagram]);

  const saveWiringDiagram = async (diagram: WiringDiagram) => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      
      const wiringData = {
        components: diagram.components,
        connections: diagram.connections,
        diagram: {
          components: diagram.components,
          connections: diagram.connections,
          metadata: diagram.metadata
        },
        createdBy: 'User'
      };



      if (wiringDiagram) {
        // Update existing diagram
        const result = await api.wiring.addVersion(wiringDiagram.id, wiringData);
        
        // Update local diagram with new data
        if (result?.wiringSchema?.currentVersion) {
          const updatedDiagram: WiringDiagram = {
            id: result.wiringSchema.id,
            components: result.wiringSchema.currentVersion.wiringData?.components || diagram.components,
            connections: result.wiringSchema.currentVersion.wiringData?.connections || diagram.connections,
            metadata: {
              title: 'Wiring Diagram',
              description: 'Project wiring diagram',
              createdAt: result.wiringSchema.currentVersion.createdAt || new Date().toISOString(),
              updatedAt: result.wiringSchema.currentVersion.createdAt || new Date().toISOString(),
              version: result.wiringSchema.currentVersion.versionNumber || 1
            }
          };
          setWiringDiagram(updatedDiagram);
        }
      } else {
        // Create new diagram
        await api.wiring.createWiring(projectId, wiringData);
        
        // Refresh only during creation
        await fetchWiringDiagram();
      }
      
      setError(null);
    } catch (err) {
      console.error('Error saving wiring diagram:', err);
      setError('Failed to save wiring diagram');
    } finally {
      setIsLoading(false);
    }
  };

  const addComponent = async (component: WiringComponent) => {
    if (!wiringDiagram) return;
    
    const updatedDiagram = {
      ...wiringDiagram,
      components: [...wiringDiagram.components, component],
      metadata: {
        ...wiringDiagram.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    setWiringDiagram(updatedDiagram);
    await saveWiringDiagram(updatedDiagram);
  };

  const updateComponent = async (componentId: string, updates: Partial<WiringComponent>) => {
    if (!wiringDiagram) return;
    
    const updatedDiagram = {
      ...wiringDiagram,
      components: wiringDiagram.components.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      ),
      metadata: {
        ...wiringDiagram.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    setWiringDiagram(updatedDiagram);
    await saveWiringDiagram(updatedDiagram);
  };

  const deleteComponent = async (componentId: string) => {
    if (!wiringDiagram) return;
    
    const updatedDiagram = {
      ...wiringDiagram,
      components: wiringDiagram.components.filter(comp => comp.id !== componentId),
      connections: wiringDiagram.connections.filter(conn => 
        conn.fromComponent !== componentId && conn.toComponent !== componentId
      ),
      metadata: {
        ...wiringDiagram.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    setWiringDiagram(updatedDiagram);
    await saveWiringDiagram(updatedDiagram);
  };

  const addConnection = async (connection: WiringConnection) => {
    if (!wiringDiagram) return;
    
    const updatedDiagram = {
      ...wiringDiagram,
      connections: [...wiringDiagram.connections, connection],
      metadata: {
        ...wiringDiagram.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    setWiringDiagram(updatedDiagram);
    await saveWiringDiagram(updatedDiagram);
  };

  const updateConnection = async (connectionId: string, updates: Partial<WiringConnection>) => {
    if (!wiringDiagram) return;
    
    const updatedDiagram = {
      ...wiringDiagram,
      connections: wiringDiagram.connections.map(conn =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      ),
      metadata: {
        ...wiringDiagram.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    setWiringDiagram(updatedDiagram);
    await saveWiringDiagram(updatedDiagram);
  };

  const deleteConnection = async (connectionId: string) => {
    if (!wiringDiagram) return;
    
    const updatedDiagram = {
      ...wiringDiagram,
      connections: wiringDiagram.connections.filter(conn => conn.id !== connectionId),
      metadata: {
        ...wiringDiagram.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    setWiringDiagram(updatedDiagram);
    await saveWiringDiagram(updatedDiagram);
  };

  return {
    wiringDiagram,
    isLoading,
    error,
    refreshWiring: fetchWiringDiagram,
    addComponent,
    updateComponent,
    deleteComponent,
    addConnection,
    updateConnection,
    deleteConnection,
    saveWiringDiagram
  };
}; 