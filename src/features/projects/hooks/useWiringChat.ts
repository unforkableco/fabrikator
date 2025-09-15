import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import { ChatMessage } from '../components/chat/ChatPanel';
import { WiringSuggestion, WiringDiagram } from '../../../shared/types';
import { generateTempId } from '../../../shared/utils/uuid';

interface UseWiringChatProps {
  projectId: string;
  diagram?: WiringDiagram | null; // ✅ Ajouter le diagramme actuel
}

export const useWiringChat = ({ projectId, diagram }: UseWiringChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [componentsToPlaceIds, setComponentsToPlaceIds] = useState<string[]>([]);
  const [componentsToPlaceById, setComponentsToPlaceById] = useState<Record<string, { id: string; name: string; type: string; pins: string[] | null }>>({});

  // No language detection on frontend

  // Load chat messages on startup
  const loadChatMessages = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoadingMessages(true);
      const dbMessages = await api.projects.getChatMessages(projectId, 'wiring', 100);
      
      // Convert DB messages to ChatMessage format
      const chatMessages: ChatMessage[] = dbMessages.map(msg => ({
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
  const saveChatMessage = async (message: ChatMessage): Promise<ChatMessage | null> => {
    if (!projectId) return null;
    
    try {
      const savedMessage = await api.projects.sendChatMessage(projectId, {
        context: 'wiring',
        content: message.content,
        sender: message.sender,
        mode: message.mode,
        suggestions: message.suggestions || null
      });
      
      // Return the message with the real UUID from database
      return {
        id: savedMessage.id,
        content: savedMessage.content,
        sender: savedMessage.sender as 'user' | 'ai',
        timestamp: new Date(savedMessage.createdAt),
        mode: savedMessage.mode as 'ask' | 'agent',
        suggestions: savedMessage.suggestions ? savedMessage.suggestions as WiringSuggestion[] : undefined
      };
    } catch (error) {
      console.error('Error saving wiring chat message:', error);
      return null;
    }
  };

  // Handle chat messages with wiring-specific AI agent
  const handleSendChatMessage = async (message: string, mode: 'ask' | 'agent') => {
    if (!projectId) {
      console.error('Project ID is required for wiring chat');
      return;
    }

    // Add user message with temporary ID
    const userMessage: ChatMessage = {
      id: generateTempId(), // Temporary ID
      content: message,
      sender: 'user',
      timestamp: new Date(),
      mode,
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Save message and get real UUID
    const savedUserMessage = await saveChatMessage(userMessage);
    if (savedUserMessage) {
      // Update the message with the real UUID from database
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? savedUserMessage : msg
      ));
    }
    
    setIsGenerating(true);
    // Reset components to place while generating a new response
    setComponentsToPlaceIds([]);

    try {
      let aiResponse: string;
      let chatSuggestions: WiringSuggestion[] | undefined;
      
      if (mode === 'ask') {
        // Ask mode - Answer questions about wiring
        try {
          const askRes = await api.projects.askQuestion(projectId, `[WIRING CONTEXT] ${message}`, 'wiring', 'ai');
          aiResponse = askRes.answer;
        } catch (error) {
          console.error('Error asking wiring question:', error);
          aiResponse = `Sorry, I encountered an error analyzing your wiring question. Could you rephrase it?`;
        }
      } else {
        // Agent mode - Generate wiring suggestions and modifications
        console.log('Sending wiring agent message:', message);
        
        try {
          // Use wiring-specific API endpoint for suggestions
          // ✅ Transmettre le diagramme actuel à l'IA pour analyse des connexions existantes
          const response = await api.wiring.generateWiringSuggestions(projectId, message, diagram);
          console.log('Wiring agent response:', response);
          
          // Capture components to place (ids only) for toolbar filtering
          if (response && Array.isArray(response.componentsToPlace)) {
            const ids = response.componentsToPlace
              .map((c: any) => c && typeof c.id === 'string' ? c.id : null)
              .filter((id: any): id is string => Boolean(id));
            setComponentsToPlaceIds(ids);
            const byId: Record<string, { id: string; name: string; type: string; pins: string[] | null }> = {};
            response.componentsToPlace.forEach((c: any) => {
              if (c && c.id) {
                byId[c.id] = { id: c.id, name: c.name, type: c.type, pins: Array.isArray(c.pins) ? c.pins : (c.pins === null ? null : []) };
              }
            });
            setComponentsToPlaceById(byId);
          }

          if (response && response.suggestions && Array.isArray(response.suggestions)) {
            // Adapt suggestions to handle old and new formats
            const suggestions = response.suggestions.map((suggestion: any, index: number) => {
              // ✅ Le backend génère maintenant toujours des connectionData propres avec des UUIDs uniques
              // Plus besoin de nettoyage manuel
              
              // Si c'est l'ancien format (type/details), convertir vers le nouveau
              if (suggestion.type && suggestion.details) {
                return {
                  id: suggestion.id, // ✅ Backend génère toujours un UUID unique
                  title: suggestion.type || 'Connection',
                  description: suggestion.details?.description || `${suggestion.action} connection`,
                  action: suggestion.action || 'add',
                  connectionData: suggestion.connectionData,
                  componentData: suggestion.componentData,
                  expanded: false,
                  validated: false, // ✅ Force false for new suggestions
                  confidence: suggestion.confidence || 0.8,
                  // ✅ S'assurer qu'aucun status résiduel n'est gardé
                  status: undefined
                };
              }
              // If it's already the new format, use as is
              else {
                return {
                  id: suggestion.id, // ✅ Backend génère toujours un UUID unique
                  title: suggestion.title || 'Connection',
                  description: suggestion.description || `${suggestion.action} connection`,
                  action: suggestion.action || 'add',
                  connectionData: suggestion.connectionData,
                  componentData: suggestion.componentData,
                  expanded: suggestion.expanded || false,
                  validated: false, // ✅ Force false pour nouvelles suggestions
                  confidence: suggestion.confidence || 0.8,
                  // ✅ S'assurer qu'aucun status résiduel n'est gardé
                  status: undefined
                };
              }
            });
            
            chatSuggestions = suggestions;
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
      const aiMessage: ChatMessage = {
        id: generateTempId(), // Temporary ID
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        mode,
        suggestions: chatSuggestions
      };
      setMessages(prev => [...prev, aiMessage]);

      // Persist AI message only when not Ask (Ask AI message is persisted by backend)
      if (mode !== 'ask') {
        const savedAiMessage = await saveChatMessage(aiMessage);
        if (savedAiMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessage.id ? savedAiMessage : msg
          ));
        }
      }

    } catch (error) {
      console.error('Error sending wiring chat message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateTempId(),
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
    const stopMessage: ChatMessage = {
      id: generateTempId(),
      content: 'Generation stopped by user.',
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    setMessages(prev => [...prev, stopMessage]);
  };

  // Update message suggestions after they are applied
  const updateMessageSuggestions = (messageId: string, suggestionId: string, status: 'accepted' | 'rejected') => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? {
              ...msg,
              suggestions: msg.suggestions?.map(s => 
                s.id === suggestionId 
                  ? { ...s, status } // ✅ Modifier seulement le status, pas validated
                  : s
              )
            }
          : msg
      )
    );
  };

  return {
    messages,
    isGenerating,
    isLoadingMessages,
    handleSendChatMessage,
    handleStopGeneration,
    updateMessageSuggestions,
    loadChatMessages,
    componentsToPlaceIds,
    componentsToPlaceById
  };
}; 