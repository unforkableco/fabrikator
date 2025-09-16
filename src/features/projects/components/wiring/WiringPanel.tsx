import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CableIcon from '@mui/icons-material/Cable';
import { WiringDiagram, WiringSuggestion, WiringConnection } from '../../../../shared/types';
import { useWiring } from '../../hooks/useWiring';
import { useWiringChat } from '../../hooks/useWiringChat';
import { useWiringValidation } from '../../hooks/useWiringValidation';
import { useComponentManager } from './ComponentManager';
import { useComponentMapper } from '../../hooks/useComponentMapper';
import { usePinMapping } from '../../hooks/usePinMapping';
import { ChatPanel } from '../chat';
import WiringCanvas from './WiringCanvas';
import ConnectionManager from './ConnectionManager';
import ValidationPanel from './ValidationPanel';

interface WiringPanelProps {
  wiringDiagram?: WiringDiagram | null;
  isLoading?: boolean;
  projectId?: string;
  materials?: any[];
  onWiringUpdated?: () => void;
}

const WiringPanel: React.FC<WiringPanelProps> = ({
  wiringDiagram,
  projectId,
  materials = [],
  onWiringUpdated,
}) => {
  // Main state
  const [diagram, setDiagram] = useState<WiringDiagram | null>(wiringDiagram || null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Hooks
  const { wiringDiagram: hookDiagram, saveWiringDiagram, refreshWiring } = useWiring(projectId);
  const { createComponentFromMaterial } = useComponentMapper();
  const { mapPinName } = usePinMapping();
  
  // Chat hook
  const {
    messages,
    isGenerating,
    isLoadingMessages,
    handleSendChatMessage,
    handleStopGeneration,
    updateMessageSuggestions,
    componentsToPlaceIds,
    componentsToPlaceById
  } = useWiringChat({ 
    projectId: projectId || '', // ✅ Assurer que projectId n'est pas undefined
    diagram 
  });

  // Validation hook
  const { 
    isValidating, 
    validationResults, 
    addValidationError 
  } = useWiringValidation();

  // Component manager hook
  const {
    handleComponentAdd,
    handleConnectionAdd,
    handleConnectionUpdate,
    handleConnectionDelete,
    handleComponentDelete,
    handleComponentUpdate
  } = useComponentManager({
    diagram,
    materials,
    projectId,
    onDiagramUpdate: setDiagram,
    onWiringUpdated
  });

  // Sync local diagram with hook when hook updates to a newer version
  useEffect(() => {
    const incoming = hookDiagram || wiringDiagram || null;
    if (!incoming) return;
    if (!diagram) {
      setDiagram(incoming);
      return;
    }
    const localUpdatedAt = new Date(diagram.metadata?.updatedAt || 0).getTime();
    const incomingUpdatedAt = new Date(incoming.metadata?.updatedAt || 0).getTime();
    if (incomingUpdatedAt > localUpdatedAt) {
      setDiagram(incoming);
    }
  }, [hookDiagram, wiringDiagram, diagram]);

  // Handle suggestion operations
  const handleAcceptSuggestion = async (messageId: string, suggestionId: string) => {
    console.log('Accepting suggestion:', { messageId, suggestionId });

    // Find suggestion in messages
    const message = messages.find(m => m.id === messageId);
    const suggestion = message?.suggestions?.find(s => s.id === suggestionId) as WiringSuggestion;

    if (!suggestion) {
      console.error('Suggestion not found:', { messageId, suggestionId });
      return;
    }

    // Already accepted?
    if (suggestion.status === 'accepted') {
      console.warn('⚠️ Suggestion already accepted, skipping:', suggestion.id);
      return;
    }

    let diagramToSave: WiringDiagram | null = null;

    if (suggestion.action === 'add' && suggestion.connectionData) {
      const conn = suggestion.connectionData as WiringConnection;
      console.log('Adding connection from suggestion:', suggestion.connectionData);

      // Compute using latest state to avoid stale diagram during batch accept
      setDiagram(prev => {
        let currentDiagram = prev || null;

        // If no diagram exists yet, create minimal one with only required components
        const requiredMaterialIds = new Set([conn.fromComponent, conn.toComponent]);

        if (!currentDiagram) {
          const minimalComponents = materials
            .filter(material => requiredMaterialIds.has(material.id))
            .map((material, index) => {
              const preset = componentsToPlaceById[material.id]?.pins;
              return createComponentFromMaterial(
                material,
                index,
                { presetPins: (Array.isArray(preset) || preset === null) ? preset : undefined }
              );
            });
          currentDiagram = {
            id: `diagram-${Date.now()}`,
            components: minimalComponents,
            connections: [],
            metadata: {
              title: 'Wiring Diagram',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1
            }
          };
        }

        // Skip if connection already exists
        const exists = (currentDiagram.connections || []).some(c =>
          (c.fromComponent === conn.fromComponent &&
           c.toComponent === conn.toComponent &&
           c.fromPin === conn.fromPin &&
           c.toPin === conn.toPin) ||
          (c.fromComponent === conn.toComponent &&
           c.toComponent === conn.fromComponent &&
           c.fromPin === conn.toPin &&
           c.toPin === conn.fromPin)
        );
        if (exists) {
          console.warn('⚠️ Connection already exists, ignoring:', suggestion.connectionData);
          diagramToSave = currentDiagram;
          return currentDiagram;
        }

        const existingComponentIds = new Set(currentDiagram.components.map(c => c.id));
        const componentsToAdd: any[] = [];
        let addIndex = 0;
        for (const compId of Array.from(requiredMaterialIds)) {
          if (existingComponentIds.has(compId)) continue;
          let material = materials.find(m => m.id === compId);
          let preset = componentsToPlaceById[compId]?.pins;
          if (!material && componentsToPlaceById[compId]) {
            // Synthétiser un material placeholder à partir des suggestions
            const meta = componentsToPlaceById[compId];
            material = {
              id: compId,
              currentVersion: { specs: { name: meta.name || 'Component', type: meta.type || 'unknown', pins: Array.isArray(meta.pins) ? meta.pins : (meta.pins === null ? null : []) } }
            } as any;
          }
          if (material) {
            componentsToAdd.push(
              createComponentFromMaterial(
                material,
                currentDiagram!.components.length + addIndex,
                { presetPins: (Array.isArray(preset) || preset === null) ? preset : undefined }
              )
            );
            addIndex += 1;
          }
        }

        // Map pins
        const fromComponent = [...currentDiagram.components, ...componentsToAdd]
          .find(c => c.id === conn.fromComponent);
        const toComponent = [...currentDiagram.components, ...componentsToAdd]
          .find(c => c.id === conn.toComponent);

        const mappedConnection: WiringConnection = {
          id: conn.id || `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fromComponent: conn.fromComponent,
          fromPin: conn.fromPin,
          toComponent: conn.toComponent,
          toPin: conn.toPin,
          wireType: conn.wireType || 'data',
          wireColor: conn.wireColor,
          label: conn.label,
          validated: conn.validated,
          error: conn.error
        };
        if (fromComponent) {
          mappedConnection.fromPin = mapPinName(conn.fromPin, fromComponent.pins);
        }
        if (toComponent) {
          mappedConnection.toPin = mapPinName(conn.toPin, toComponent.pins);
        }

        const nextDiagram: WiringDiagram = {
          ...currentDiagram,
          components: [...currentDiagram.components, ...componentsToAdd],
          connections: [...currentDiagram.connections, mappedConnection],
          metadata: {
            ...currentDiagram.metadata,
            updatedAt: new Date().toISOString()
          }
        };

        diagramToSave = nextDiagram;
        return nextDiagram;
      });

      // Persist after state computed
      if (diagramToSave) {
        try {
          await saveWiringDiagram(diagramToSave);
          await refreshWiring();
          console.log('✅ Wiring diagram saved successfully');
        } catch (error) {
          console.error('❌ Failed to save wiring diagram:', error);
          addValidationError({
            id: 'save-error',
            type: 'save_error',
            message: 'Failed to save wiring diagram',
            severity: 'error'
          });
        }
      }
    }

    // Update suggestion status
    updateMessageSuggestions(messageId, suggestionId, 'accepted');
    onWiringUpdated?.();
  };

  const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
    console.log('Rejecting suggestion:', { messageId, suggestionId });
    updateMessageSuggestions(messageId, suggestionId, 'rejected');
  };

  const handleAcceptAllSuggestions = async (messageId: string, suggestionIds: string[]) => {
    // Construire un diagramme cumulé en mémoire et persister une seule fois
    let nextDiagram = diagram;
    for (const sid of suggestionIds) {
      const message = messages.find(m => m.id === messageId);
      let suggestion: WiringSuggestion | undefined = undefined;
      if (message && Array.isArray(message.suggestions)) {
        for (const s of message.suggestions) {
          if (s.id === sid) { suggestion = s as WiringSuggestion; break; }
        }
      }
      if (!suggestion || suggestion.status === 'accepted' || suggestion.action !== 'add' || !suggestion.connectionData) continue;

      // Appliquer comme dans handleAcceptSuggestion mais sur nextDiagram
      if (!nextDiagram) {
        const ids = new Set([suggestion.connectionData.fromComponent, suggestion.connectionData.toComponent]);
        const minimal: any[] = [];
        let idx = 0;
        for (const m of materials) {
          if (ids.has(m.id)) {
            const preset = componentsToPlaceById[m.id]?.pins;
            minimal.push(createComponentFromMaterial(m, idx, { presetPins: (Array.isArray(preset) || preset === null) ? preset : undefined }));
            idx += 1;
          }
        }
        nextDiagram = {
          id: `diagram-${Date.now()}`,
          components: minimal,
          connections: [],
          metadata: { title: 'Wiring Diagram', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 }
        };
      }

      let exists = false;
      for (const c of (nextDiagram.connections || [])) {
        if ((c.fromComponent === suggestion.connectionData!.fromComponent && c.toComponent === suggestion.connectionData!.toComponent && c.fromPin === suggestion.connectionData!.fromPin && c.toPin === suggestion.connectionData!.toPin) ||
            (c.fromComponent === suggestion.connectionData!.toComponent && c.toComponent === suggestion.connectionData!.fromComponent && c.fromPin === suggestion.connectionData!.toPin && c.toPin === suggestion.connectionData!.fromPin)) {
          exists = true; break;
        }
      }
      if (exists) continue;

      const existingIds = new Set(nextDiagram.components.map(c => c.id));
      const toAdd: any[] = [];
      const baseIndex = nextDiagram.components.length;
      let addedIdx = 0;
      for (const compId of [suggestion.connectionData!.fromComponent, suggestion.connectionData!.toComponent]) {
        if (!existingIds.has(compId)) {
          let material = materials.find(m => m.id === compId);
          let preset = componentsToPlaceById[compId]?.pins;
          if (!material && componentsToPlaceById[compId]) {
            const meta = componentsToPlaceById[compId];
            material = {
              id: compId,
              currentVersion: { specs: { name: meta.name || 'Component', type: meta.type || 'unknown', pins: Array.isArray(meta.pins) ? meta.pins : (meta.pins === null ? null : []) } }
            } as any;
          }
          if (material) {
            toAdd.push(createComponentFromMaterial(material, baseIndex + addedIdx, { presetPins: (Array.isArray(preset) || preset === null) ? preset : undefined }));
            addedIdx += 1;
          }
        }
      }

      let fromComp: any = undefined;
      let toComp: any = undefined;
      for (const c of [...nextDiagram.components, ...toAdd]) {
        if (!fromComp && c.id === suggestion.connectionData!.fromComponent) fromComp = c;
        if (!toComp && c.id === suggestion.connectionData!.toComponent) toComp = c;
        if (fromComp && toComp) break;
      }
      const conn: WiringConnection = {
        id: suggestion.connectionData.id || `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromComponent: suggestion.connectionData.fromComponent!,
        fromPin: fromComp ? mapPinName(suggestion.connectionData.fromPin!, fromComp.pins) : suggestion.connectionData.fromPin!,
        toComponent: suggestion.connectionData.toComponent!,
        toPin: toComp ? mapPinName(suggestion.connectionData.toPin!, toComp.pins) : suggestion.connectionData.toPin!,
        wireType: suggestion.connectionData.wireType || 'data',
        wireColor: suggestion.connectionData.wireColor,
        label: suggestion.connectionData.label,
        validated: suggestion.connectionData.validated,
        error: suggestion.connectionData.error
      };

      nextDiagram = {
        ...nextDiagram,
        components: [...nextDiagram.components, ...toAdd],
        connections: [...nextDiagram.connections, conn],
        metadata: { ...nextDiagram.metadata, updatedAt: new Date().toISOString() }
      };
    }

    if (nextDiagram) {
      setDiagram(nextDiagram);
      try {
        await saveWiringDiagram(nextDiagram);
        await refreshWiring();
      } catch (e) {
        console.error('Failed to persist batch accept', e);
      }
    }

    // Mettre à jour les statuts côté messages (optimiste, le ChatPanel a aussi persisté)
    suggestionIds.forEach(sid => updateMessageSuggestions(messageId, sid, 'accepted'));
    onWiringUpdated?.();
  };

  const handleRejectAllSuggestions = async (messageId: string, suggestionIds: string[]) => {
    for (const sid of suggestionIds) {
      await Promise.resolve(handleRejectSuggestion(messageId, sid));
    }
  };

  // Handle optimal circuit suggestion
  const handleSuggestOptimalCircuit = async () => {
    try {
      // 🧹 Nettoyer localStorage pour éviter les collisions d'état des suggestions
      const storageKey = `suggestions-${projectId}`;
      localStorage.removeItem(storageKey);
      console.log('🧹 Cleared suggestion states for new optimal circuit generation');
      
      // 🧹 Force le nettoyage des états de suggestions dans ChatPanel
      // We will send a special message to trigger cleanup
      window.dispatchEvent(new CustomEvent('clearSuggestionStates', { 
        detail: { projectId, context: 'wiring' } 
      }));
      
      // Ne pas créer de diagramme exhaustif à l'avance;
      // attendre la réponse de l'IA (componentsToPlaceIds) pour n'ajouter que l'essentiel
      
      // Send optimal circuit request
      await handleSendChatMessage('Suggest me an optimal circuit', 'agent');
    } catch (error) {
      console.error('Error suggesting optimal circuit:', error);
    }
  };

  // Debug fallback
  if (!projectId) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Wiring Component - Debug</Typography>
        <Typography variant="body2" color="text.secondary">
          Project ID: {projectId || 'Not defined'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Materials: {materials.length}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100%', 
      gap: 2,
      maxWidth: '100%',
      mx: 'auto',
      px: 1
    }}>
      {/* Main Wiring Section - Left Side */}
      <Box sx={{ 
        flex: 4,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        minWidth: 0
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CableIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Wiring Editor
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<CableIcon />}
              onClick={handleSuggestOptimalCircuit}
              disabled={isGenerating}
            >
              Optimal Circuit
            </Button>
          </Box>
        </Box>

        {/* Wiring Canvas */}
        <WiringCanvas
            diagram={diagram}
          materials={componentsToPlaceIds.length > 0 ? materials.filter(m => componentsToPlaceIds.includes(m.id)) : (isGenerating ? [] : materials)}
            selectedConnection={selectedConnection}
            selectedComponent={selectedComponent}
          isValidating={isValidating}
            onComponentAdd={handleComponentAdd}
            onConnectionAdd={handleConnectionAdd}
            onConnectionUpdate={handleConnectionUpdate}
            onConnectionDelete={handleConnectionDelete}
            onComponentDelete={handleComponentDelete}
            onComponentUpdate={handleComponentUpdate}
          onSelectionChange={(connectionId, componentId) => {
              setSelectedConnection(connectionId);
              setSelectedComponent(componentId);
            }}
          />

        {/* Validation Results */}
        {validationResults && (
          <ValidationPanel
            validationResults={validationResults}
            onFixError={(errorId: string) => console.log('Fix error:', errorId)}
          />
        )}

        {/* Connections Manager */}
        <ConnectionManager
              connections={diagram?.connections || []}
              components={diagram?.components || []}
              selectedConnection={selectedConnection}
              onConnectionSelect={setSelectedConnection}
              onConnectionUpdate={handleConnectionUpdate}
              onConnectionDelete={handleConnectionDelete}
            />
      </Box>

      {/* Chat Panel - Right Side */}
      <Box sx={{ 
        flex: 1, 
        minWidth: 320,
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendChatMessage}
          onStopGeneration={handleStopGeneration}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onAcceptAllSuggestions={handleAcceptAllSuggestions}
          onRejectAllSuggestions={handleRejectAllSuggestions}
          isGenerating={isGenerating || isLoadingMessages}
          context="wiring"
          projectId={projectId}
        />
      </Box>
    </Box>
  );
};

export default WiringPanel; 