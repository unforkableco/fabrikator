import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Card, Divider } from '@mui/material';
import CableIcon from '@mui/icons-material/Cable';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { WiringDiagram, WiringConnection, WiringComponent, WiringSuggestion } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';
import { ChatPanel, ChatMessage } from '../chat';
import WiringEditor from './WiringEditor';
import ConnectionsList from './ConnectionsList';
import WiringValidationPanel from './WiringValidationPanel';

interface WiringPanelProps {
  wiringDiagram?: WiringDiagram | null;
  isLoading?: boolean;
  projectId?: string;
  materials?: any[]; // Available materials to use as components
  onWiringUpdated?: () => void;
}

// Type étendu pour les messages de wiring avec suggestions spécialisées
interface WiringChatMessage extends Omit<ChatMessage, 'suggestions'> {
  suggestions?: WiringSuggestion[];
  isLoading?: boolean;
}

const WiringPanel: React.FC<WiringPanelProps> = ({
  wiringDiagram,
  isLoading,
  projectId,
  materials = [],
  onWiringUpdated,
}) => {
  const [diagram, setDiagram] = useState<WiringDiagram | null>(wiringDiagram || null);
    const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResults, setValidationResults] = useState<any>(null);
    
    // Chat states - Similar to MaterialsPanel
    const [messages, setMessages] = useState<WiringChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Load chat messages on startup
    const loadChatMessages = useCallback(async () => {
      if (!projectId) return;
      
      try {
        setIsLoadingMessages(true);
        const dbMessages = await api.projects.getChatMessages(projectId, 'wiring', 10);
        
        // Convert DB messages to ChatMessage format
        const chatMessages: WiringChatMessage[] = dbMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender as 'user' | 'ai',
          timestamp: new Date(msg.createdAt),
          mode: msg.mode as 'ask' | 'agent',
          suggestions: msg.suggestions ? msg.suggestions as WiringSuggestion[] : undefined
        }));
        
        setMessages(chatMessages);
      } catch (error) {
        console.error('Error loading wiring chat messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    }, [projectId]);

    useEffect(() => {
      loadChatMessages();
    }, [projectId, loadChatMessages]);

    // Save chat message to database
    const saveChatMessage = async (message: ChatMessage) => {
      if (!projectId) return;
      
      try {
        await api.projects.sendChatMessage(projectId, {
          context: 'wiring',
          content: message.content,
          sender: message.sender,
          mode: message.mode,
          suggestions: message.suggestions || null
        });
      } catch (error) {
        console.error('Error saving wiring chat message:', error);
      }
    };

    // Handle chat messages with wiring-specific AI agent
    const handleSendChatMessage = async (message: string, mode: 'ask' | 'agent') => {
      if (!projectId) {
        console.error('Project ID is required for wiring chat');
        return;
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message,
        sender: 'user',
        timestamp: new Date(),
        mode,
      };

      setMessages(prev => [...prev, userMessage as WiringChatMessage]);
      await saveChatMessage(userMessage);
      setIsGenerating(true);

      // Add loading message with animation
      const loadingMessage: WiringChatMessage = {
        id: `loading-${Date.now()}`,
        content: mode === 'agent' ? 'Génération du câblage en cours...' : 'Analyse en cours...',
        sender: 'ai',
        timestamp: new Date(),
        mode,
        isLoading: true
      };
      setMessages(prev => [...prev, loadingMessage]);

      try {
        let aiResponse: string;
        let chatSuggestions: WiringSuggestion[] | undefined;
        
        if (mode === 'ask') {
          // Ask mode - Answer questions about wiring
          try {
            const response = await api.projects.askQuestion(projectId, `[WIRING CONTEXT] ${message}`);
            aiResponse = response.answer;
          } catch (error) {
            console.error('Error asking wiring question:', error);
            aiResponse = `Désolé, j'ai rencontré une erreur en analysant votre question de câblage. Pourriez-vous reformuler ?`;
          }
        } else {
          // Agent mode - Generate wiring suggestions and modifications
          console.log('Sending wiring agent message:', message);
          
          try {
            // Use wiring-specific API endpoint for suggestions
            const response = await api.wiring.generateWiringSuggestions(projectId, message, diagram);
            console.log('Wiring agent response:', response);
            
            if (response && response.suggestions && Array.isArray(response.suggestions)) {
              // Adapter les suggestions pour gérer l'ancien et le nouveau format
              const suggestions = response.suggestions.map((suggestion: any, index: number) => {
                // Si c'est l'ancien format (type/details), convertir vers le nouveau
                if (suggestion.type && suggestion.details) {
                  return {
                    id: `wiring-suggestion-${Date.now()}-${index}`,
                    title: suggestion.type || 'Connexion',
                    description: suggestion.details?.description || `${suggestion.action} connexion`,
                    action: suggestion.action || 'add',
                    connectionData: suggestion.connectionData,
                    componentData: suggestion.componentData,
                    expanded: false,
                    validated: false,
                    confidence: suggestion.confidence || 0.8
                  };
                }
                // Si c'est déjà le nouveau format, utiliser tel quel
                else {
                  return {
                    id: suggestion.id || `wiring-suggestion-${Date.now()}-${index}`,
                    title: suggestion.title || 'Connexion',
                    description: suggestion.description || `${suggestion.action} connexion`,
                    action: suggestion.action || 'add',
                    connectionData: suggestion.connectionData,
                    componentData: suggestion.componentData,
                    expanded: suggestion.expanded || false,
                    validated: suggestion.validated || false,
                    confidence: suggestion.confidence || 0.8
                  };
                }
              });
              
              chatSuggestions = suggestions;
              // Si on a des suggestions, utiliser un message plus court
              aiResponse = `J'ai généré ${suggestions.length} suggestions de connexions pour votre circuit.`;
            } else {
              aiResponse = 'J\'ai compris votre demande de câblage. Je travaille sur l\'analyse des connexions appropriées.';
            }
          } catch (error) {
            console.error('Error with wiring agent:', error);
            aiResponse = 'Désolé, j\'ai rencontré une erreur en analysant votre demande de câblage. Veuillez réessayer.';
          }
        }

        // Remove loading message and add AI response with suggestions
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
          const aiMessage: WiringChatMessage = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            sender: 'ai',
            timestamp: new Date(),
            mode,
            suggestions: chatSuggestions
          };
          return [...withoutLoading, aiMessage];
        });

        // Save the final AI message
        const finalAiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
          mode,
          suggestions: chatSuggestions as any
        };
        await saveChatMessage(finalAiMessage);

      } catch (error) {
        console.error('Error sending wiring chat message:', error);
        
        // Remove loading message and add error message
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
          const errorMessage: WiringChatMessage = {
            id: (Date.now() + 1).toString(),
            content: `Désolé, j'ai rencontré une erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Veuillez réessayer.`,
            sender: 'ai',
            timestamp: new Date(),
            mode,
          };
          return [...withoutLoading, errorMessage];
        });
      } finally {
        setIsGenerating(false);
      }
    };

    const handleStopGeneration = () => {
      setIsGenerating(false);
      // Add stop message
      const stopMessage: WiringChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Génération arrêtée par l\'utilisateur.',
        sender: 'ai',
        timestamp: new Date(),
        mode: 'agent',
      };
      setMessages(prev => [...prev, stopMessage]);
    };

    // Fonction pour suggérer un circuit optimal automatiquement
    const handleSuggestOptimalCircuit = async () => {
      if (!projectId) return;
      
      // Envoyer automatiquement le prompt pour un circuit optimal
      await handleSendChatMessage("Suggère-moi un circuit optimal", 'agent');
    };

    const handleAcceptSuggestion = async (messageId: string, suggestionId: string) => {
      console.log('Accepting suggestion:', { messageId, suggestionId });
      
      // Trouver la suggestion dans les messages
      const message = messages.find(m => m.id === messageId);
      const suggestion = message?.suggestions?.find(s => s.id === suggestionId) as WiringSuggestion;
      
      if (!suggestion) {
        console.error('Suggestion not found:', { messageId, suggestionId });
        return;
      }

      console.log('Found suggestion:', suggestion);

      // Déterminer le diagramme à utiliser
      let currentDiagram = diagram;

      // Si c'est la première suggestion et qu'il n'y a pas de diagramme, créer seulement les composants nécessaires
      if (!currentDiagram && suggestion.connectionData) {
        console.log('Creating initial diagram with required components only');
        const requiredComponents: WiringComponent[] = [];
        const requiredMaterialIds = new Set<string>();
        
        // Identifier les matériaux nécessaires pour cette connexion
        if (suggestion.connectionData.fromComponent) {
          requiredMaterialIds.add(suggestion.connectionData.fromComponent);
        }
        if (suggestion.connectionData.toComponent) {
          requiredMaterialIds.add(suggestion.connectionData.toComponent);
        }
        
        // Créer seulement les composants nécessaires
        let componentIndex = 0;
        materials.forEach((material) => {
          if (requiredMaterialIds.has(material.id)) {
            const component = createComponentFromMaterial(material, componentIndex);
            requiredComponents.push(component);
            componentIndex++;
          }
        });
        
        currentDiagram = {
          id: `diagram-${Date.now()}`,
          components: requiredComponents,
          connections: [],
          metadata: {
            title: 'Circuit Optimal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          }
        };
        
        console.log('Initial diagram created with required components only:', requiredComponents.length);
      }

      // Appliquer la suggestion selon son type
      if (suggestion.action === 'add') {
        // Ajouter une connexion
        if (suggestion.connectionData && currentDiagram) {
          console.log('Adding connection from suggestion:', suggestion.connectionData);
          
          // Vérifier que tous les composants nécessaires existent
          const requiredMaterialIds = new Set<string>();
          if (suggestion.connectionData.fromComponent) {
            requiredMaterialIds.add(suggestion.connectionData.fromComponent);
          }
          if (suggestion.connectionData.toComponent) {
            requiredMaterialIds.add(suggestion.connectionData.toComponent);
          }
          
          // Ajouter les composants manquants
          const existingComponentIds = new Set(currentDiagram.components.map(c => c.id));
          const componentsToAdd: WiringComponent[] = [];
          let componentIndex = currentDiagram.components.length;
          
          materials.forEach((material) => {
            if (requiredMaterialIds.has(material.id) && !existingComponentIds.has(material.id)) {
              const component = createComponentFromMaterial(material, componentIndex);
              componentsToAdd.push(component);
              componentIndex++;
            }
          });
          
          const updatedDiagram = {
            ...currentDiagram,
            components: [...currentDiagram.components, ...componentsToAdd],
            connections: [...currentDiagram.connections, suggestion.connectionData],
            metadata: {
              ...currentDiagram.metadata,
              updatedAt: new Date().toISOString()
            }
          };
          setDiagram(updatedDiagram);
          currentDiagram = updatedDiagram;
          
          if (componentsToAdd.length > 0) {
            console.log('Added missing components:', componentsToAdd.length);
          }
        }
        
        // Ajouter un composant (si nécessaire)
        if (suggestion.componentData) {
          console.log('Adding component from suggestion:', suggestion.componentData);
          handleComponentAdd(suggestion.componentData);
        }
      } else if (suggestion.action === 'modify') {
        // Modifier une connexion existante
        if (suggestion.connectionData && currentDiagram) {
          const existingConnection = currentDiagram.connections.find(c => 
            c.fromComponent === suggestion.connectionData!.fromComponent &&
            c.toComponent === suggestion.connectionData!.toComponent
          );
          if (existingConnection) {
            console.log('Updating connection from suggestion:', suggestion.connectionData);
            handleConnectionUpdate(existingConnection.id, suggestion.connectionData);
          }
        }
      } else if (suggestion.action === 'remove') {
        // Supprimer une connexion
        if (suggestion.connectionData && currentDiagram) {
          const existingConnection = currentDiagram.connections.find(c => 
            c.fromComponent === suggestion.connectionData!.fromComponent &&
            c.toComponent === suggestion.connectionData!.toComponent
          );
          if (existingConnection) {
            console.log('Removing connection from suggestion');
            handleConnectionDelete(existingConnection.id);
          }
        }
      }

      // Si on a créé un nouveau diagramme, le définir
      if (!diagram && currentDiagram) {
        setDiagram(currentDiagram);
      }

      // Marquer la suggestion comme validée dans le message
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map(s => 
              s.id === suggestionId 
                ? { ...s, validated: true, expanded: false }
                : s
            )
          };
        }
        return msg;
      }));

      // Déclencher la mise à jour des composants disponibles
      onWiringUpdated?.();

      console.log('Suggestion applied successfully');
    };

    const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
      console.log('Rejecting suggestion:', { messageId, suggestionId });
      
      // Marquer la suggestion comme refusée dans le message
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.suggestions) {
          return {
            ...msg,
            suggestions: msg.suggestions.map(s => 
              s.id === suggestionId 
                ? { ...s, validated: false, expanded: false }
                : s
            )
          };
        }
        return msg;
      }));

      console.log('Suggestion rejected');
    };

    // Wiring diagram operations
    const handleComponentAdd = (component: WiringComponent) => {
      console.log('Adding component to diagram:', component);
      console.log('Current diagram:', diagram);
      
      if (!diagram) {
        // Create new diagram if none exists
        const newDiagram: WiringDiagram = {
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
        console.log('Created new diagram:', newDiagram);
        setDiagram(newDiagram);
      } else {
        const updatedDiagram = {
          ...diagram,
          components: [...diagram.components, component],
          metadata: {
            ...diagram.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        console.log('Updated diagram:', updatedDiagram);
        setDiagram(updatedDiagram);
      }
      onWiringUpdated?.();
    };

    // Helper function to create component from material with better pin positioning
    const createComponentFromMaterial = (material: any, index: number): WiringComponent => {
      const specs = material.currentVersion?.specs || {};
      const componentType = specs.type?.toLowerCase() || 'unknown';
      
      // Créer les broches avec un positionnement esthétique autour du composant
      let pins: any[] = [];
      
      if (componentType.includes('microcontroller') || componentType.includes('arduino')) {
        pins = [
          { id: 'vcc', name: 'VCC', type: 'power', position: { x: -25, y: -15 }, connected: false, voltage: 3.3 },
          { id: 'gnd', name: 'GND', type: 'ground', position: { x: -25, y: 15 }, connected: false },
          { id: 'gpio1', name: 'GPIO1', type: 'digital', position: { x: 25, y: -15 }, connected: false },
          { id: 'gpio2', name: 'GPIO2', type: 'digital', position: { x: 25, y: 0 }, connected: false },
          { id: 'gpio3', name: 'GPIO3', type: 'digital', position: { x: 25, y: 15 }, connected: false },
          { id: 'gpio4', name: 'GPIO4', type: 'digital', position: { x: 0, y: 25 }, connected: false }
        ];
      } else if (componentType.includes('sensor') || componentType.includes('capteur')) {
        pins = [
          { id: 'vcc', name: 'VCC', type: 'power', position: { x: -15, y: -10 }, connected: false, voltage: 3.3 },
          { id: 'gnd', name: 'GND', type: 'ground', position: { x: -15, y: 10 }, connected: false },
          { id: 'data', name: 'DATA', type: 'analog', position: { x: 15, y: 0 }, connected: false }
        ];
      } else if (componentType.includes('display') || componentType.includes('écran')) {
        pins = [
          { id: 'vcc', name: 'VCC', type: 'power', position: { x: -20, y: -15 }, connected: false, voltage: 3.3 },
          { id: 'gnd', name: 'GND', type: 'ground', position: { x: -20, y: 15 }, connected: false },
          { id: 'sda', name: 'SDA', type: 'digital', position: { x: 20, y: -10 }, connected: false },
          { id: 'scl', name: 'SCL', type: 'digital', position: { x: 20, y: 10 }, connected: false }
        ];
      } else if (componentType.includes('battery') || componentType.includes('batterie') || componentType.includes('power')) {
        pins = [
          { id: 'positive', name: '+', type: 'power', position: { x: 0, y: -20 }, connected: false, voltage: 3.7 },
          { id: 'negative', name: '-', type: 'ground', position: { x: 0, y: 20 }, connected: false }
        ];
      } else {
        // Composant générique
        pins = [
          { id: 'pin1', name: 'Pin1', type: 'input', position: { x: -20, y: 0 }, connected: false },
          { id: 'pin2', name: 'Pin2', type: 'output', position: { x: 20, y: 0 }, connected: false }
        ];
      }
      
      // Disposition en grille compacte
      const componentsPerRow = 3;
      const componentSpacingX = 150;
      const componentSpacingY = 100;
      const startX = 150;
      const startY = 100;
      
      const row = Math.floor(index / componentsPerRow);
      const col = index % componentsPerRow;
      
      return {
        id: material.id,
        name: specs.name || 'Composant',
        type: componentType,
        position: {
          x: startX + (col * componentSpacingX),
          y: startY + (row * componentSpacingY)
        },
        pins
      };
    };

    const handleConnectionAdd = (connection: WiringConnection) => {
      console.log('Adding connection:', connection);
      console.log('Current diagram:', diagram);
      console.log('Available materials:', materials);
      
      if (!diagram) {
        // Créer un nouveau diagramme en utilisant TOUS les matériaux disponibles
        const allComponents: WiringComponent[] = [];
        
        // Créer des composants pour tous les matériaux disponibles
        materials.forEach((material, index) => {
          const component = createComponentFromMaterial(material, index);
          allComponents.push(component);
        });
        
        console.log('Created all available components:', allComponents);
        
        // Créer le nouveau diagramme avec tous les composants
        const newDiagram: WiringDiagram = {
          id: `diagram-${Date.now()}`,
          components: allComponents,
          connections: [connection],
          metadata: {
            title: 'Circuit Optimal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          }
        };
        
        console.log('Created new diagram with all materials:', newDiagram);
        setDiagram(newDiagram);
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
        
        // Ajouter la connexion
        const updatedDiagram = {
          ...diagram,
          components: updatedComponents,
          connections: [...diagram.connections, connection],
          metadata: {
            ...diagram.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        
        console.log('Updated existing diagram with connection:', updatedDiagram);
        setDiagram(updatedDiagram);
      }
      
      onWiringUpdated?.();
    };

    const handleConnectionUpdate = (connectionId: string, updates: Partial<WiringConnection>) => {
      if (diagram) {
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
        setDiagram(updatedDiagram);
        validateWiring(updatedDiagram);
        onWiringUpdated?.();
      }
    };

    const handleConnectionDelete = (connectionId: string) => {
      if (diagram) {
        const updatedDiagram = {
          ...diagram,
          connections: diagram.connections.filter(conn => conn.id !== connectionId),
          metadata: {
            ...diagram.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        setDiagram(updatedDiagram);
        validateWiring(updatedDiagram);
        onWiringUpdated?.();
      }
    };

    const handleComponentDelete = (componentId: string) => {
      if (diagram) {
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
        setDiagram(updatedDiagram);
        validateWiring(updatedDiagram);
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
        setDiagram(updatedDiagram);
        onWiringUpdated?.();
      }
    };

    const validateWiring = async (diagramToValidate: WiringDiagram) => {
      setIsValidating(true);
      try {
        // Simulate validation - replace with actual validation logic
        const errors: any[] = [];
        const warnings: any[] = [];
        
        // Basic validation checks
        for (const connection of diagramToValidate.connections) {
          const fromComponent = diagramToValidate.components.find(c => c.id === connection.fromComponent);
          const toComponent = diagramToValidate.components.find(c => c.id === connection.toComponent);
          
          if (!fromComponent || !toComponent) {
            errors.push({
              id: `error-${connection.id}`,
              type: 'invalid_connection' as const,
              message: `Connexion invalide: composant manquant`,
              connectionId: connection.id,
              severity: 'error' as const
            });
          }
        }
        
        const results = {
          isValid: errors.length === 0,
          errors,
          warnings
        };
        
        setValidationResults(results);
        
        // Update diagram with validation results
        setDiagram({
          ...diagramToValidate,
          validation: results
        });
      } catch (error) {
        console.error('Error validating wiring:', error);
      } finally {
        setIsValidating(false);
      }
    };

    // Debug: Simple fallback if no projectId
    if (!projectId) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">
            Composant Wiring - Debug
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Projet ID: {projectId || 'Non défini'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Matériaux: {materials.length}
          </Typography>
        </Box>
      );
    }

    // Ajouter des quantités par défaut aux matériaux s'ils n'en ont pas
    const materialsWithQuantities = materials.map(material => ({
      ...material,
      quantity: material.quantity || 2 // Par défaut 2 de chaque composant
    }));

    return (
      <Box sx={{ 
        display: 'flex', 
        height: '100%', 
        gap: 2,
        maxWidth: '100%',
        mx: 'auto', // Centrage horizontal
        px: 1 // Padding horizontal pour éviter les bords
      }}>
        {/* Main Wiring Editor - Left Side */}
        <Box sx={{ 
          flex: 4, // Encore plus d'espace pour l'éditeur (4/5 de l'espace total)
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2,
          minWidth: 0 // Permet la réduction si nécessaire
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
                Éditeur de Câblage
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={isValidating ? <StopIcon /> : <PlayArrowIcon />}
                onClick={() => diagram && validateWiring(diagram)}
                disabled={!diagram || isValidating}
              >
                {isValidating ? 'Validation...' : 'Valider'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<CableIcon />}
                onClick={handleSuggestOptimalCircuit}
                disabled={isGenerating}
              >
                Circuit Optimal
              </Button>
            </Box>
          </Box>

          {/* Wiring Editor Canvas */}
          <Card sx={{ 
            flex: 1, 
            p: 1, // Padding réduit pour plus d'espace
            minHeight: 500, // Hauteur minimale augmentée
            overflow: 'hidden' // Évite les débordements
          }}>
            <WiringEditor
              diagram={diagram}
              materials={materialsWithQuantities}
              selectedConnection={selectedConnection}
              selectedComponent={selectedComponent}
              onComponentAdd={handleComponentAdd}
              onConnectionAdd={handleConnectionAdd}
              onConnectionUpdate={handleConnectionUpdate}
              onConnectionDelete={handleConnectionDelete}
              onComponentDelete={handleComponentDelete}
              onComponentUpdate={handleComponentUpdate}
              onSelectionChange={(connectionId: string | null, componentId: string | null) => {
                setSelectedConnection(connectionId);
                setSelectedComponent(componentId);
              }}
              isValidating={isValidating}
            />
          </Card>

          {/* Validation Panel */}
          {validationResults && (
            <WiringValidationPanel
              validationResults={validationResults}
              onFixError={(errorId: string) => console.log('Fix error:', errorId)}
            />
          )}

          {/* Connections List */}
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Liste des Connexions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ConnectionsList
              connections={diagram?.connections || []}
              components={diagram?.components || []}
              selectedConnection={selectedConnection}
              onConnectionSelect={setSelectedConnection}
              onConnectionUpdate={handleConnectionUpdate}
              onConnectionDelete={handleConnectionDelete}
            />
          </Card>
        </Box>

        {/* Chat Panel - Right Side */}
        <Box sx={{ 
          flex: 1, 
          minWidth: 320, // Largeur minimale pour le chat
          maxWidth: 400, // Largeur maximale pour éviter qu'il prenne trop de place
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
          />
        </Box>
      </Box>
    );
};

export default WiringPanel; 