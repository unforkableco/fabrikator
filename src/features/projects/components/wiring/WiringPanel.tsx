import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CableIcon from '@mui/icons-material/Cable';
import { WiringDiagram, WiringSuggestion } from '../../../../shared/types';
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
  const { wiringDiagram: hookDiagram, saveWiringDiagram } = useWiring(projectId);
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

  // Load initial diagram
  useEffect(() => {
    if (hookDiagram && !diagram) {
      setDiagram(hookDiagram);
    } else if (wiringDiagram && !diagram) {
      setDiagram(wiringDiagram);
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

    // Check if already applied
    // ✅ Vérifier le vrai statut de la suggestion au lieu des champs techniques
    if (suggestion.status === 'accepted') {
      console.warn('⚠️ Suggestion already accepted, skipping:', suggestion.id);
      return;
    }

    // Determine current diagram to use
    let currentDiagram = diagram;

        // Apply suggestion based on action
    if (suggestion.action === 'add' && suggestion.connectionData) {
        console.log('Adding connection from suggestion:', suggestion.connectionData);
        
      // Check if connection already exists
        const existingConnection = (currentDiagram?.connections || []).find(c => 
          (c.fromComponent === suggestion.connectionData!.fromComponent && 
           c.toComponent === suggestion.connectionData!.toComponent &&
           c.fromPin === suggestion.connectionData!.fromPin &&
           c.toPin === suggestion.connectionData!.toPin) ||
          (c.fromComponent === suggestion.connectionData!.toComponent && 
           c.toComponent === suggestion.connectionData!.fromComponent &&
           c.fromPin === suggestion.connectionData!.toPin &&
           c.toPin === suggestion.connectionData!.fromPin)
        );
        
        if (existingConnection) {
        console.warn('⚠️ Connection already exists, ignoring:', suggestion.connectionData);
          return;
        }
        
      // Add missing components if needed (only the ones involved in the connection)
      const requiredMaterialIds = new Set([
        suggestion.connectionData.fromComponent,
        suggestion.connectionData.toComponent
      ]);

      // If no diagram exists yet, create a minimal one with only required components
      if (!currentDiagram) {
        const minimalComponents = materials
          .filter(material => requiredMaterialIds.has(material.id))
          .map((material, index) => {
            const preset = componentsToPlaceById[material.id]?.pins;
            return createComponentFromMaterial(material, index, { presetPins: (Array.isArray(preset) || preset === null) ? preset : undefined });
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
        setDiagram(currentDiagram);
      }
      
        const existingComponentIds = new Set(currentDiagram.components.map(c => c.id));
      const componentsToAdd = materials
        .filter(material => requiredMaterialIds.has(material.id) && !existingComponentIds.has(material.id))
        .map((material, index) => {
          const preset = componentsToPlaceById[material.id]?.pins;
          return createComponentFromMaterial(
            material,
            currentDiagram!.components.length + index,
            { presetPins: (Array.isArray(preset) || preset === null) ? preset : undefined }
          );
        });
      
      // Map pins correctly
      const fromComponent = [...(currentDiagram?.components || []), ...componentsToAdd]
        .find(c => c.id === suggestion.connectionData!.fromComponent);
      const toComponent = [...(currentDiagram?.components || []), ...componentsToAdd]
        .find(c => c.id === suggestion.connectionData!.toComponent);
      
      let mappedConnection = { ...suggestion.connectionData };
      if (fromComponent) {
        mappedConnection.fromPin = mapPinName(suggestion.connectionData.fromPin, fromComponent.pins);
      }
      if (toComponent) {
        mappedConnection.toPin = mapPinName(suggestion.connectionData.toPin, toComponent.pins);
        }
        
        const updatedDiagram = currentDiagram ? {
          ...currentDiagram,
          components: [...currentDiagram.components, ...componentsToAdd],
          connections: [...currentDiagram.connections, mappedConnection],
          metadata: {
            ...currentDiagram.metadata,
            updatedAt: new Date().toISOString()
          }
        } : {
          id: `diagram-${Date.now()}`,
          components: componentsToAdd,
          connections: [mappedConnection],
          metadata: {
            title: 'Wiring Diagram',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          }
        };
      
        setDiagram(updatedDiagram);
      
      // Save diagram
      try {
        await saveWiringDiagram(updatedDiagram);
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

    // Update suggestion status
    updateMessageSuggestions(messageId, suggestionId, 'accepted');
    onWiringUpdated?.();
  };

  const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
    console.log('Rejecting suggestion:', { messageId, suggestionId });
    updateMessageSuggestions(messageId, suggestionId, 'rejected');
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
          isGenerating={isGenerating || isLoadingMessages}
          context="wiring"
          projectId={projectId}
        />
      </Box>
    </Box>
  );
};

export default WiringPanel; 