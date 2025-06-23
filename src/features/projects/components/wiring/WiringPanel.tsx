import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Card, Divider } from '@mui/material';
import CableIcon from '@mui/icons-material/Cable';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { WiringDiagram, WiringConnection, WiringComponent, WiringPin, WiringSuggestion } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';
import { useWiring } from '../../hooks/useWiring';
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
  // Utiliser le hook useWiring pour la gestion des données
  const {
    wiringDiagram: hookDiagram,
    saveWiringDiagram
  } = useWiring(projectId);

  // État local pour l'interface utilisateur
  const [diagram, setDiagram] = useState<WiringDiagram | null>(wiringDiagram || null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  
  // Chat states - Similar to MaterialsPanel
  const [messages, setMessages] = useState<WiringChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Charger le diagramme initial seulement
  useEffect(() => {
    if (hookDiagram && !diagram) {
      setDiagram(hookDiagram);
    } else if (wiringDiagram && !diagram) {
      setDiagram(wiringDiagram);
    }
  }, [hookDiagram, wiringDiagram, diagram]);

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

  // Sauvegarder les changements de suggestions dans les messages
  const updateMessageSuggestions = async (messageId: string, suggestions: WiringSuggestion[]) => {
    if (!projectId) return;
    
    try {
      // Mettre à jour le message en base avec les nouvelles suggestions
      await api.projects.sendChatMessage(projectId, {
        context: 'wiring',
        content: `Mise à jour des suggestions - Message ${messageId}`,
        sender: 'system',
        mode: 'agent',
        suggestions: suggestions
      });
    } catch (error) {
      console.error('Error updating message suggestions:', error);
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

    // Plus besoin de message de chargement car l'animation isGenerating gère l'affichage

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
          aiResponse = `Sorry, I encountered an error analyzing your wiring question. Could you rephrase it?`;
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
                  title: suggestion.type || 'Connection',
                  description: suggestion.details?.description || `${suggestion.action} connection`,
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
                  title: suggestion.title || 'Connection',
                  description: suggestion.description || `${suggestion.action} connection`,
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
            // Debug - vérifier l'état initial des suggestions
            console.log('🚀 Generated suggestions:', suggestions.map((s: any) => ({
              id: s.id,
              title: s.title,
              validated: s.validated,
              expanded: s.expanded,
              action: s.action
            })));
            
            // Debug - vérifier si les IDs sont déjà dans le localStorage
            const storageKey = `suggestions-state-wiring`;
            const savedStates = localStorage.getItem(storageKey);
            if (savedStates) {
              const parsed = JSON.parse(savedStates);
              console.log('💾 Current localStorage states:', parsed);
              suggestions.forEach((s: any) => {
                if (parsed[s.id]) {
                  console.log(`🔍 Suggestion ${s.id} already has state:`, parsed[s.id]);
                }
              });
            }
            
            // Si on a des suggestions, utiliser un message plus court
            aiResponse = `I generated ${suggestions.length} connection suggestions for your circuit.`;
          } else {
            aiResponse = 'I understood your wiring request. I am working on analyzing the appropriate connections.';
          }
        } catch (error) {
          console.error('Error with wiring agent:', error);
          aiResponse = 'Sorry, I encountered an error analyzing your wiring request. Please try again.';
        }
      }

      // Add AI response with suggestions
      const aiMessage: WiringChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        mode,
        suggestions: chatSuggestions
      };
      setMessages(prev => [...prev, aiMessage]);

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
      
      // Add error message
      const errorMessage: WiringChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        mode,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
    // Add stop message
    const stopMessage: WiringChatMessage = {
      id: (Date.now() + 1).toString(),
      content: 'Generation stopped by user.',
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    setMessages(prev => [...prev, stopMessage]);
  };

  // Fonction pour suggérer un circuit optimal automatiquement
  const handleSuggestOptimalCircuit = async () => {
    try {
      setIsGenerating(true);
    
      // Créer un diagramme avec TOUS les composants disponibles si pas de diagramme existant
      if (!diagram) {
        const allComponents: WiringComponent[] = [];
        materials.forEach((material, index) => {
          const component = createComponentFromMaterial(material, index);
          allComponents.push(component);
        });
        
        const newDiagram = {
          id: `diagram-${Date.now()}`,
          components: allComponents,
          connections: [],
          metadata: {
            title: 'Circuit Optimal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          }
        };
        setDiagram(newDiagram);
      }
      
      // Envoyer la demande de circuit optimal
      await handleSendChatMessage('Suggest me an optimal circuit', 'agent');
    } catch (error) {
      console.error('Error suggesting optimal circuit:', error);
    } finally {
      setIsGenerating(false);
    }
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

    // CORRECTION: Vérifier si la suggestion n'a pas déjà été appliquée
    if ((suggestion as any).applied || (suggestion as any).validated) {
      console.warn('⚠️ Suggestion already applied, skipping:', suggestion.id);
      return;
    }

    // Fonction pour afficher des informations de débogage détaillées
    const debugConnectionIssue = (connectionData: any) => {
      const fromComponent = diagram?.components.find(c => c.id === connectionData.fromComponent);
      const toComponent = diagram?.components.find(c => c.id === connectionData.toComponent);
      
      console.group('🔍 Analyse de la connexion');
      console.log('Connexion demandée:', connectionData);
      
      if (!fromComponent) {
        console.warn(`❌ Composant source introuvable: ${connectionData.fromComponent}`);
        console.log('Composants disponibles:', diagram?.components.map(c => ({ id: c.id, name: c.name })));
      } else {
        console.log(`✅ Composant source trouvé: ${fromComponent.name} (${fromComponent.id})`);
        console.log('Broches disponibles:', fromComponent.pins.map(p => ({ id: p.id, name: p.name, type: p.type })));
        
        const mappedFromPin = mapPinName(connectionData.fromPin, fromComponent.pins);
        if (mappedFromPin !== connectionData.fromPin) {
          console.log(`🔄 Broche source mappée: ${connectionData.fromPin} → ${mappedFromPin}`);
        }
      }
      
      if (!toComponent) {
        console.warn(`❌ Composant destination introuvable: ${connectionData.toComponent}`);
        console.log('Composants disponibles:', diagram?.components.map(c => ({ id: c.id, name: c.name })));
      } else {
        console.log(`✅ Composant destination trouvé: ${toComponent.name} (${toComponent.id})`);
        console.log('Broches disponibles:', toComponent.pins.map(p => ({ id: p.id, name: p.name, type: p.type })));
        
        const mappedToPin = mapPinName(connectionData.toPin, toComponent.pins);
        if (mappedToPin !== connectionData.toPin) {
          console.log(`🔄 Broche destination mappée: ${connectionData.toPin} → ${mappedToPin}`);
        }
      }
      console.groupEnd();
    };

    // Déterminer le diagramme à utiliser
    let currentDiagram = diagram;

    // CORRECTION: Créer un diagramme uniquement si nécessaire
    if (!currentDiagram && suggestion.connectionData) {
      console.log('Creating initial diagram with ALL available components');
      const allComponents: WiringComponent[] = [];
      
      // Créer des composants pour TOUS les matériaux disponibles
      materials.forEach((material, index) => {
        const component = createComponentFromMaterial(material, index);
        allComponents.push(component);
      });
      
      currentDiagram = {
        id: `diagram-${Date.now()}`,
        components: allComponents,
        connections: [],
        metadata: {
          title: 'Circuit Optimal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        }
      };
      
      console.log('Initial diagram created with ALL available components:', allComponents.length);
    }

    // Appliquer la suggestion selon son type
    if (suggestion.action === 'add') {
      // Ajouter une connexion
      if (suggestion.connectionData && currentDiagram) {
        console.log('Adding connection from suggestion:', suggestion.connectionData);
        
        // Afficher les informations de débogage
        debugConnectionIssue(suggestion.connectionData);
        
        // CORRECTION: Vérifier que la connexion n'existe pas déjà
        const existingConnection = currentDiagram.connections.find(c => 
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
          console.warn('⚠️ Connexion déjà existante, ignorée:', suggestion.connectionData);
          return;
        }
        
        // Vérifier que tous les composants nécessaires existent
        const requiredMaterialIds = new Set<string>();
        if (suggestion.connectionData.fromComponent) {
          requiredMaterialIds.add(suggestion.connectionData.fromComponent);
        }
        if (suggestion.connectionData.toComponent) {
          requiredMaterialIds.add(suggestion.connectionData.toComponent);
        }
        
        // Ajouter les composants manquants seulement si confirmé
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
        
        if (componentsToAdd.length > 0) {
          console.log('Adding missing components:', componentsToAdd.length);
        }
        
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

    // Marquer la suggestion comme appliquée
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? {
              ...msg,
              suggestions: msg.suggestions?.map(s => 
                s.id === suggestionId 
                  ? { ...s, validated: true, applied: true } as any
                  : s
              )
            }
          : msg
      )
    );

    // Sauvegarder le diagramme mis à jour
    if (currentDiagram || diagram) {
      const diagramToSave = currentDiagram || diagram;
      if (diagramToSave) {
        try {
          console.log('🔄 Saving wiring diagram with connections:', diagramToSave.connections.length);
          console.log('🔄 Diagram to save:', diagramToSave);
          
          await saveWiringDiagram(diagramToSave);
          console.log('✅ Wiring diagram saved successfully');
          
          // Attendre un peu avant de vérifier
          setTimeout(() => {
            console.log('🔍 Checking current diagram state after save:', diagram?.connections?.length || 0);
          }, 500);
          
        } catch (error) {
          console.error('❌ Failed to save wiring diagram:', error);
        }
      }
    }

    // Notifier de la mise à jour
    if (onWiringUpdated) {
      onWiringUpdated();
    }
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
      setDiagram(finalDiagram);
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
      setDiagram(finalDiagram);
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

  /**
   * Extrait les broches depuis les spécifications techniques d'un matériau
   */
  const extractPinsFromTechnicalSpecs = (material: any): WiringPin[] => {
    const specs = material.currentVersion?.specs || {};
    const technicalSpecs = specs.requirements || {};
    const productReference = specs.productReference || {};
    
    const pins: WiringPin[] = [];
    const componentType = (specs.type || material.type || '').toLowerCase();
    
    console.log('🔧 WiringPanel - Extracting pins from technical specs:', {
      materialName: specs.name || material.name,
      componentType,
      technicalSpecs,
      productReference: productReference.name
    });
    
    // 1. Analyser les spécifications techniques pour extraire les informations de broches
    Object.entries(technicalSpecs).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const valueStr = String(value).toLowerCase();
      
      // Chercher des patterns de broches dans les spécifications
      if (keyLower.includes('pin') || keyLower.includes('broche') || keyLower.includes('gpio')) {
        const digitalPins = valueStr.match(/(\d+)\s*digital/i);
        const analogPins = valueStr.match(/(\d+)\s*analog/i);
        const gpioPins = valueStr.match(/(\d+)\s*gpio/i);
        
        if (digitalPins) {
          const count = parseInt(digitalPins[1]);
          for (let i = 0; i < Math.min(count, 14); i++) {
            pins.push({
              id: `d${i}`,
              name: `D${i}`,
              type: 'digital',
              position: { x: i < 7 ? -60 : 60, y: -40 + (i % 7) * 12 },
              connected: false
            });
          }
        }
        
        if (analogPins) {
          const count = parseInt(analogPins[1]);
          for (let i = 0; i < Math.min(count, 8); i++) {
            pins.push({
              id: `a${i}`,
              name: `A${i}`,
              type: 'analog',
              position: { x: 0, y: -40 + i * 10 },
              connected: false
            });
          }
        }
        
        if (gpioPins) {
          const count = parseInt(gpioPins[1]);
          for (let i = 0; i < Math.min(count, 10); i++) {
            pins.push({
              id: `gpio${i}`,
              name: `GPIO${i}`,
              type: 'digital',
              position: { x: i < 5 ? -50 : 50, y: -30 + (i % 5) * 15 },
              connected: false
            });
          }
        }
      }
      
      // Interfaces de communication
      if (keyLower.includes('interface') || keyLower.includes('communication')) {
        if (valueStr.includes('i2c') || valueStr.includes('iic')) {
          pins.push(
        { id: 'sda', name: 'SDA', type: 'digital', position: { x: 40, y: -20 }, connected: false },
        { id: 'scl', name: 'SCL', type: 'digital', position: { x: 40, y: 20 }, connected: false }
          );
        }
        if (valueStr.includes('spi')) {
          pins.push(
            { id: 'mosi', name: 'MOSI', type: 'digital', position: { x: 40, y: -30 }, connected: false },
            { id: 'miso', name: 'MISO', type: 'digital', position: { x: 40, y: -10 }, connected: false },
            { id: 'sck', name: 'SCK', type: 'digital', position: { x: 40, y: 10 }, connected: false },
            { id: 'ss', name: 'SS', type: 'digital', position: { x: 40, y: 30 }, connected: false }
          );
        }
        if (valueStr.includes('uart') || valueStr.includes('serial')) {
          pins.push(
            { id: 'tx', name: 'TX', type: 'digital', position: { x: 40, y: -15 }, connected: false },
            { id: 'rx', name: 'RX', type: 'digital', position: { x: 40, y: 15 }, connected: false }
          );
        }
      }
      
      // Voltage et alimentation
      if (keyLower.includes('voltage') || keyLower.includes('power') || keyLower.includes('supply')) {
        const voltage3v3 = valueStr.includes('3.3v') || valueStr.includes('3v3');
        const voltage5v = valueStr.includes('5v');
        
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -25 }, connected: false, voltage: voltage3v3 ? 3.3 : 5.0 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 25 }, connected: false });
        
        if (voltage3v3) {
          pins.push({ id: '3v3', name: '3V3', type: 'power', position: { x: -40, y: -10 }, connected: false, voltage: 3.3 });
        }
        if (voltage5v) {
          pins.push({ id: '5v', name: '5V', type: 'power', position: { x: -40, y: 5 }, connected: false, voltage: 5.0 });
        }
      }
    });
    
    // 2. Générer des broches spécifiques basées sur le type de composant et références produit
    if (componentType.includes('arduino') || productReference.name?.toLowerCase().includes('arduino')) {
      // Arduino Uno R3 standard pinout
      if (!pins.some(p => p.name.startsWith('D'))) {
        for (let i = 0; i <= 13; i++) {
          pins.push({
            id: `d${i}`,
            name: `D${i}`,
            type: 'digital',
            position: { x: i < 7 ? -60 : 60, y: -40 + (i % 7) * 12 },
            connected: false
          });
        }
      }
      if (!pins.some(p => p.name.startsWith('A'))) {
        for (let i = 0; i <= 5; i++) {
          pins.push({
            id: `a${i}`,
            name: `A${i}`,
            type: 'analog',
            position: { x: 0, y: -30 + i * 10 },
            connected: false
          });
        }
      }
      // Broches d'alimentation et contrôle
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -25 }, connected: false, voltage: 5.0 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 25 }, connected: false });
        pins.push({ id: '3v3', name: '3V3', type: 'power', position: { x: -40, y: -10 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'reset', name: 'RESET', type: 'digital', position: { x: -40, y: 5 }, connected: false });
      }
    } else if (componentType.includes('esp32') || productReference.name?.toLowerCase().includes('esp32')) {
      // ESP32 specific pinout
      if (!pins.some(p => p.name.startsWith('GPIO'))) {
        const availableGPIOs = [0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
        availableGPIOs.forEach((gpio, index) => {
          pins.push({
            id: `gpio${gpio}`,
            name: `GPIO${gpio}`,
            type: 'digital',
            position: { x: index < 10 ? -60 : 60, y: -40 + (index % 10) * 8 },
            connected: false
          });
        });
      }
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -30 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 30 }, connected: false });
        pins.push({ id: '3v3', name: '3V3', type: 'power', position: { x: -40, y: -15 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'en', name: 'EN', type: 'digital', position: { x: -40, y: 0 }, connected: false });
      }
    } else if (componentType.includes('sensor')) {
      // Capteurs génériques
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -20 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 20 }, connected: false });
        pins.push({ id: 'data', name: 'DATA', type: 'analog', position: { x: 30, y: 0 }, connected: false });
        
        if (componentType.includes('analog')) {
          pins.push({ id: 'aout', name: 'AOUT', type: 'analog', position: { x: 30, y: -15 }, connected: false });
        }
        if (componentType.includes('digital')) {
          pins.push({ id: 'dout', name: 'DOUT', type: 'digital', position: { x: 30, y: 15 }, connected: false });
        }
      }
    } else if (componentType.includes('display') || componentType.includes('oled') || componentType.includes('lcd')) {
      // Écrans
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -30 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 30 }, connected: false });
        
        // Par défaut I2C
        if (!pins.some(p => p.id === 'sda')) {
          pins.push({ id: 'sda', name: 'SDA', type: 'digital', position: { x: 40, y: -20 }, connected: false });
          pins.push({ id: 'scl', name: 'SCL', type: 'digital', position: { x: 40, y: 20 }, connected: false });
        }
      }
    } else if (componentType.includes('relay')) {
      // Relais
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -20 }, connected: false, voltage: 5.0 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 20 }, connected: false });
        pins.push({ id: 'in', name: 'IN', type: 'digital', position: { x: 30, y: -15 }, connected: false });
        pins.push({ id: 'com', name: 'COM', type: 'power', position: { x: 30, y: 0 }, connected: false });
        pins.push({ id: 'no', name: 'NO', type: 'power', position: { x: 30, y: 15 }, connected: false });
      }
    } else if (componentType.includes('battery') || componentType.includes('power')) {
      // Batteries et alimentations
      if (!pins.some(p => p.id === 'positive')) {
        pins.push({ id: 'positive', name: '+', type: 'power', position: { x: 0, y: -25 }, connected: false, voltage: 12 });
        pins.push({ id: 'negative', name: '-', type: 'ground', position: { x: 0, y: 25 }, connected: false });
      }
    }
    
    // 3. Broches génériques si aucune trouvée
    if (pins.length === 0) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -25, y: -15 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -25, y: 15 }, connected: false },
        { id: 'signal', name: 'SIGNAL', type: 'digital', position: { x: 25, y: 0 }, connected: false }
      );
    }
    
    console.log('🔧 WiringPanel - Generated pins from technical specs:', pins.map(p => ({ id: p.id, name: p.name, type: p.type })));
    
    return pins;
  };

  // Helper function to create component from material using technical specifications
  const createComponentFromMaterial = (material: any, index: number): WiringComponent => {
    const specs = material.currentVersion?.specs || {};
    const componentType = specs.type?.toLowerCase() || 'unknown';
    
    console.log('🔧 WiringPanel - Creating component from material with technical specs:', material);
    
    // Utiliser les spécifications techniques réelles pour générer les broches
    const pins = extractPinsFromTechnicalSpecs(material);
    
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
              name: specs.name || 'Component',
      type: componentType,
      position: {
        x: startX + (col * componentSpacingX),
        y: startY + (row * componentSpacingY)
      },
      pins
    };
  };

  // Fonction pour mapper intelligemment les noms de broches (même que dans WiringEditor)
  const mapPinName = (suggestedPin: string, availablePins: any[]): string => {
    console.log('WiringPanel mapPinName - Suggested pin:', suggestedPin, 'Available pins:', availablePins.map(p => ({ id: p.id, name: p.name, type: p.type })));
    
    // Correspondance exacte d'abord
    const exactMatch = availablePins.find(pin => pin.id === suggestedPin || pin.name === suggestedPin);
    if (exactMatch) {
      console.log('Found exact match:', exactMatch.id);
      return exactMatch.id;
    }

    // Mapping intelligent basé sur les types et noms courants
    const pinMappings: { [key: string]: string[] } = {
      // Alimentation - plus de variations
      'vcc': ['vcc', 'power', '3v3', '5v', 'vin', 'v+', '+', 'positive', '3.3v'],
      'gnd': ['gnd', 'ground', '-', 'v-', 'negative', 'masse'],
      'positive': ['positive', '+', 'vcc', 'power', 'vin', 'v+'],
      'negative': ['negative', '-', 'gnd', 'ground', 'v-'],
      
      // Communication I2C
      'sda': ['sda', 'data', 'i2c_sda', 'serial_data'],
      'scl': ['scl', 'clock', 'i2c_scl', 'serial_clock'],
      
      // GPIO et signaux - plus de variations
      'gpio1': ['gpio1', 'pin1', 'd1', 'digital1', 'io1', 'd0', 'gpio0'],
      'gpio2': ['gpio2', 'pin2', 'd2', 'digital2', 'io2', 'd1'],
      'gpio3': ['gpio3', 'pin3', 'd3', 'digital3', 'io3', 'd2'],
      'gpio4': ['gpio4', 'pin4', 'd4', 'digital4', 'io4', 'd3'],
      'data': ['data', 'signal', 'out', 'output', 'analog', 'sensor'],
      
      // Broches génériques - plus de variations
      'pin1': ['pin1', 'p1', '1', 'input1', 'input', 'in'],
      'pin2': ['pin2', 'p2', '2', 'output1', 'output', 'out']
    };

    // Chercher une correspondance dans les mappings avec plus de tolérance
    for (const [pinId, aliases] of Object.entries(pinMappings)) {
      const pinExists = availablePins.find(pin => pin.id === pinId);
      if (pinExists) {
        const suggestedLower = suggestedPin.toLowerCase();
        const isMatch = aliases.some(alias => {
          const aliasLower = alias.toLowerCase();
          return suggestedLower === aliasLower || 
                 suggestedLower.includes(aliasLower) || 
                 aliasLower.includes(suggestedLower) ||
                 // Correspondance partielle pour les noms composés
                 (suggestedLower.includes(aliasLower.split('_')[0]) && aliasLower.includes('_')) ||
                 (aliasLower.includes(suggestedLower.split('_')[0]) && suggestedLower.includes('_'));
        });
        
        if (isMatch) {
          console.log('Found mapping match:', pinId, 'for suggested:', suggestedPin);
          return pinId;
        }
      }
    }

    // Si aucune correspondance, essayer de trouver par type avec plus de flexibilité
    const suggestedLower = suggestedPin.toLowerCase();
    
    // Alimentation
    if (suggestedLower.includes('power') || suggestedLower.includes('vcc') || 
        suggestedLower.includes('3v') || suggestedLower.includes('5v') || 
        suggestedLower.includes('positive') || suggestedLower.includes('+') ||
        suggestedLower.includes('vin') || suggestedLower.includes('v+')) {
      const powerPin = availablePins.find(pin => pin.type === 'power');
      if (powerPin) {
        console.log('Found power pin by type:', powerPin.id);
        return powerPin.id;
      }
    }
    
    // Masse
    if (suggestedLower.includes('gnd') || suggestedLower.includes('ground') || 
        suggestedLower.includes('negative') || suggestedLower.includes('-') ||
        suggestedLower.includes('masse') || suggestedLower.includes('v-')) {
      const groundPin = availablePins.find(pin => pin.type === 'ground');
      if (groundPin) {
        console.log('Found ground pin by type:', groundPin.id);
        return groundPin.id;
      }
    }

    // Données/Signaux
    if (suggestedLower.includes('data') || suggestedLower.includes('signal') || 
        suggestedLower.includes('analog') || suggestedLower.includes('sensor') ||
        suggestedLower.includes('out') || suggestedLower.includes('output')) {
      const dataPin = availablePins.find(pin => pin.type === 'analog' || pin.type === 'input' || pin.type === 'output');
      if (dataPin) {
        console.log('Found data/signal pin by type:', dataPin.id);
        return dataPin.id;
      }
    }

    // GPIO/Digital
    if (suggestedLower.includes('gpio') || suggestedLower.includes('digital') ||
        suggestedLower.includes('control') || suggestedLower.includes('pin')) {
      const digitalPin = availablePins.find(pin => pin.type === 'digital');
      if (digitalPin) {
        console.log('Found digital pin by type:', digitalPin.id);
        return digitalPin.id;
      }
    }

    // En dernier recours, utiliser la première broche disponible appropriée
    console.log('No specific match found, using fallback logic for:', suggestedPin);
    
    // Essayer de trouver une broche par priorité de type
    let fallbackPin = availablePins.find(pin => pin.type === 'power') || // Priorité aux broches d'alimentation
                      availablePins.find(pin => pin.type === 'ground') || // Puis masse
                      availablePins.find(pin => pin.type === 'digital') || // Puis digital
                      availablePins.find(pin => pin.type === 'analog') || // Puis analog
                      availablePins[0]; // En dernier recours, la première

    const result = fallbackPin ? fallbackPin.id : suggestedPin;
    console.log('Final result for', suggestedPin, ':', result);
    return result;
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
      setDiagram(finalDiagram);
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
      setDiagram(finalDiagram);
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
      
      setDiagram(updatedDiagram);
      
      // Sauvegarder le diagramme après mise à jour
      try {
        console.log('💾 Saving diagram after connection update...');
        await saveWiringDiagram(updatedDiagram);
        console.log('✅ Diagram saved successfully after update');
      } catch (error) {
        console.error('❌ Failed to save diagram after update:', error);
      }
      
      validateWiring(updatedDiagram);
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
      setDiagram(updatedDiagram);
      
      // Sauvegarder le diagramme après suppression
      try {
        console.log('💾 Saving diagram after connection deletion...');
        await saveWiringDiagram(updatedDiagram);
        console.log('✅ Diagram saved successfully after deletion');
        
        // Pas de message de suppression - l'utilisateur voit que c'est effectif
        
      } catch (error) {
        console.error('❌ Failed to save diagram after deletion:', error);
        setValidationResults({
          isValid: false,
          errors: [{
            id: 'delete-error',
            type: 'save_error' as const,
            message: 'Erreur lors de la sauvegarde après suppression',
            severity: 'error' as const
          }],
          warnings: []
        });
      }
      
      // Ne pas appeler validateWiring pour éviter le message de validation
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
      setDiagram(updatedDiagram);
      
      // Sauvegarder le diagramme après suppression
      try {
        console.log('💾 Saving diagram after component deletion...');
        await saveWiringDiagram(updatedDiagram);
        console.log('✅ Diagram saved successfully after component deletion');
        
        // Pas de message de suppression - l'utilisateur voit que c'est effectif
        
      } catch (error) {
        console.error('❌ Failed to save diagram after component deletion:', error);
        setValidationResults({
          isValid: false,
          errors: [{
            id: 'delete-component-error',
            type: 'save_error' as const,
            message: 'Error saving after component deletion',
            severity: 'error' as const
          }],
          warnings: []
        });
      }
      
      // Ne pas appeler validateWiring pour éviter le message de validation
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
            message: `Invalid connection: missing component`,
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
          Wiring Component - Debug
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Project ID: {projectId || 'Not defined'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Materials: {materials.length}
        </Typography>
      </Box>
    );
  }

  // Ajouter des quantités par défaut aux matériaux s'ils n'en ont pas
  const materialsWithQuantities = materials.map(material => ({
    ...material,
    quantity: material.quantity || 2 // Default 2 of each component
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
              Wiring Editor
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
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
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

        {/* Connections List - Optimisée pour le défilement et la visibilité */}
        <Card sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 400, // Hauteur minimale garantie
          maxHeight: 600, // Hauteur maximale augmentée
          flex: 1, // Prend tout l'espace disponible
          overflow: 'hidden' // Évite les débordements
        }}>
          <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
            Connections List ({diagram?.connections?.length || 0})
          </Typography>
          <Divider sx={{ mb: 2, flexShrink: 0 }} />
          <Box sx={{ 
            flex: 1, 
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ConnectionsList
              connections={diagram?.connections || []}
              components={diagram?.components || []}
              selectedConnection={selectedConnection}
              onConnectionSelect={setSelectedConnection}
              onConnectionUpdate={handleConnectionUpdate}
              onConnectionDelete={handleConnectionDelete}
            />
          </Box>
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
          projectId={projectId}
        />
      </Box>
    </Box>
  );
};

export default WiringPanel; 