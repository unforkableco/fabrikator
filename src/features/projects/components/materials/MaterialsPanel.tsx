import React, { useState, useCallback, startTransition } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { Material } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';
import { ChatPanel, ChatMessage, BaseSuggestion } from '../chat';
import { AddMaterialDialog, MaterialCard, StatusLegend, EditMaterialDialog } from './';

interface MaterialsPanelProps {
  materials: Material[];
  isLoading?: boolean;
  projectId?: string;
  onAddMaterial?: (material: Omit<Material, 'id'>) => Promise<void>;
  onEditMaterial?: (material: Material) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onApproveSelected?: (materialId: string) => void;
  onRejectSelected?: (materialId: string) => void;
  onMaterialsUpdated?: () => void;
}

const MaterialsPanel: React.FC<MaterialsPanelProps> = ({
  materials,
  isLoading,
  projectId,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onApproveSelected,
  onRejectSelected,
  onMaterialsUpdated,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState<boolean>(false);

  // Local view state for immediate UI updates
  const [displayMaterials, setDisplayMaterials] = useState<Material[]>(materials);
  const [lastEditedAtById, setLastEditedAtById] = useState<Record<string, number>>({});
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const OPTIMISTIC_HOLD_MS = 1200;

  React.useEffect(() => {
    if (materials && materials.length >= 0) {
      setIsInitialLoaded(true);
    }
  }, [materials]);

  React.useEffect(() => {
    const now = Date.now();
    setDisplayMaterials(prev => {
      const prevById = new Map(prev.map(m => [m.id, m]));
      return materials.map(incoming => {
        const editedAt = lastEditedAtById[incoming.id];
        if (editedAt && (now - editedAt) < OPTIMISTIC_HOLD_MS) {
          const optimistic = prevById.get(incoming.id) || incoming;
          return {
            ...incoming,
            name: optimistic.name,
            type: optimistic.type,
            description: optimistic.description,
            requirements: optimistic.requirements,
          } as Material;
        }
        return incoming;
      });
    });
  }, [materials, lastEditedAtById]);

  // Rejected materials are now automatically filtered on the backend
  const activeMaterials = displayMaterials;

  const handleToggleExpanded = (id: string, expanded: boolean) => {
    setExpandedById(prev => ({ ...prev, [id]: expanded }));
  };

  // Load messages on startup
  const loadChatMessages = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoadingMessages(true);
      console.log('Loading chat messages for project:', projectId);
      const dbMessages = await api.projects.getChatMessages(projectId, 'materials', 10);
      
      console.log('Raw DB messages:', dbMessages);
      
      // Convert database messages to ChatMessage format
      const chatMessages: ChatMessage[] = dbMessages.map(msg => {
        console.log('Processing message:', {
          id: msg.id,
          sender: msg.sender,
          content: msg.content.substring(0, 50) + '...',
          suggestions: msg.suggestions,
          suggestionsType: typeof msg.suggestions
        });
        
        return {
          id: msg.id,
          content: msg.content,
          sender: msg.sender as 'user' | 'ai',
          timestamp: new Date(msg.createdAt),
          mode: msg.mode as 'ask' | 'agent',
          suggestions: msg.suggestions ? msg.suggestions as BaseSuggestion[] : undefined
        };
      });
      
      setMessages(chatMessages);
      
      console.log('Loaded chat messages:', chatMessages.length);
      
      // Find the latest message with unapplied suggestions
      const messagesWithSuggestions = chatMessages
        .filter(msg => msg.sender === 'ai' && msg.suggestions && msg.suggestions.length > 0);
      
      console.log('Messages with suggestions:', messagesWithSuggestions.length);
      messagesWithSuggestions.forEach(msg => {
        console.log('Message with suggestions:', {
          id: msg.id,
          content: msg.content.substring(0, 50) + '...',
          suggestionsCount: msg.suggestions?.length,
          timestamp: msg.timestamp
        });
      });
      
      const lastAiMessageWithSuggestions = messagesWithSuggestions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (lastAiMessageWithSuggestions && lastAiMessageWithSuggestions.suggestions) {
        console.log('Restoring suggestions from message:', lastAiMessageWithSuggestions.id);
        // Restaurer les suggestions depuis le message
        const suggestions = lastAiMessageWithSuggestions.suggestions.map(suggestion => {
          try {
            console.log('Processing suggestion:', {
              id: suggestion.id,
              title: suggestion.title,
              hasOriginalData: !!suggestion.originalData
            });
            
            // Retrieve original data stored in the originalData field
            const originalData = suggestion.originalData ? JSON.parse(suggestion.originalData) : null;
            if (originalData) {
              console.log('Using originalData:', originalData);
              return originalData;
            } else {
              // Fallback: build from suggestion data
              const fallbackData = {
                action: suggestion.action === 'add' ? 'new' : 
                       suggestion.action === 'modify' ? 'update' : 
                       suggestion.action === 'remove' ? 'remove' : 'new',
                type: suggestion.title,
                details: {
                  notes: suggestion.description,
                  code: suggestion.code
                }
              };
              console.log('Using fallback data:', fallbackData);
              return fallbackData;
            }
          } catch (error) {
            console.error('Error parsing suggestion originalData:', error);
            return null;
          }
        }).filter(Boolean);
        
        console.log('Restored suggestions:', suggestions);
        
        if (suggestions.length > 0) {
          console.log('Setting pending suggestions - RESTORED FROM DB');
          setPendingSuggestions(suggestions);
        } else {
          console.log('No suggestions to restore');
        }
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [projectId]);

  // Load messages when component starts
  React.useEffect(() => {
    loadChatMessages();
  }, [projectId, loadChatMessages]);

  // Save a message to the database and return the message with its real ID
  const saveChatMessage = async (message: ChatMessage): Promise<ChatMessage | null> => {
    if (!projectId) return null;
    
    try {
      console.log('Saving message to DB:', {
        content: message.content.substring(0, 50) + '...',
        sender: message.sender,
        mode: message.mode,
        hasSuggestions: !!message.suggestions,
        suggestionsCount: message.suggestions?.length || 0,
        suggestions: message.suggestions
      });
      
      const savedMessage = await api.projects.sendChatMessage(projectId, {
        context: 'materials',
        content: message.content,
        sender: message.sender,
        mode: message.mode,
        suggestions: message.suggestions || null
      });
      
      console.log('Message saved to DB:', {
        id: savedMessage.id,
        hasSuggestions: !!savedMessage.suggestions,
        suggestionsCount: Array.isArray(savedMessage.suggestions) ? savedMessage.suggestions.length : 'not array'
      });
      
      // Return the message with the database ID and other original data
      return {
        ...message,
        id: savedMessage.id // Use the database ID
      };
    } catch (error) {
      console.error('Error saving chat message:', error);
      return null;
    }
  };


  const handleAddMaterial = async (material: Omit<Material, 'id'>) => {
    try {
      await onAddMaterial?.(material);
      setShowAddDialog(false);
      onMaterialsUpdated?.();
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setShowEditDialog(true);
  };

  const handleSaveEditedMaterial = async (materialId: string, updatedMaterial: Partial<Material>) => {
    try {
      // Optimistic update
      setDisplayMaterials(prev => prev.map(m => {
        if (m.id !== materialId) return m;
        return {
          ...m,
          name: updatedMaterial.name ?? m.name,
          type: updatedMaterial.type ?? m.type,
          description: updatedMaterial.description ?? m.description,
          requirements: updatedMaterial.requirements ?? m.requirements,
        } as Material;
      }));
      setLastEditedAtById(prev => ({ ...prev, [materialId]: Date.now() }));

      setShowEditDialog(false);
      setEditingMaterial(null);

      // Persist in background
      api.projects.updateMaterial(materialId, updatedMaterial)
        .catch((err) => console.error('Failed to persist material update:', err));

      // Transition non bloquante pour le refresh serveur
      setTimeout(() => {
        startTransition(() => {
      onMaterialsUpdated?.();
        });
      }, 350);
    } catch (error) {
      console.error('Error updating material:', error);
    }
  };

  const handleSendChatMessage = async (message: string, mode: 'ask' | 'agent') => {
    if (!projectId) {
      console.error('Project ID is required for chat');
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

              setMessages(prev => [...prev, userMessage]);
    
    // Save user message to database and get the real ID
    const savedUserMessage = await saveChatMessage(userMessage);
    if (savedUserMessage) {
      // Update the message with the database ID
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? savedUserMessage : msg
      ));
    }
      
      setIsGenerating(true);

    try {
      let aiResponse: string;
      
      if (mode === 'ask') {
        // Ask Mode - Use AI to answer questions about the project
        console.log('Sending ask question:', message);
        
        try {
          const response = await api.projects.askQuestion(projectId, message);
          aiResponse = response.answer;
        } catch (error) {
          console.error('Error asking question:', error);
          aiResponse = `Sorry, I encountered an error trying to answer your question. Could you rephrase or try again?`;
        }
      } else {
        // Agent Mode - Generate material suggestions
        console.log('Sending agent message:', message);
        
        // First retrieve suggestions without applying them
        const response = await api.projects.previewMaterialSuggestions(projectId, message);
        console.log('Agent response:', response);
        
        if (response && response.components && Array.isArray(response.components)) {
          const responseWithExplanation = response as any; // Type assertion pour accéder à explanation
          // Transform suggestions for the diff
          const suggestions = response.components.map((component: any) => ({
            action: component.details?.action || 'new',
            type: component.type,
            details: component.details,
            currentMaterial: activeMaterials.find(m => {
              const specs = m.currentVersion?.specs as any;
              return specs?.type === component.type || specs?.name === component.type;
            })
          }));
          
          // Store the suggestions 
          console.log('Setting NEW suggestions from AI response');
          setPendingSuggestions(suggestions);
          
          // Immediately create chatSuggestions to save them with the message
          // Filter 'keep' suggestions that are not useful for the user
          const filteredSuggestions = suggestions.filter(s => s.action !== 'keep');
          
          const newChatSuggestions = filteredSuggestions.map((suggestion, index) => {
            // Create an informative title with action and details
            let title = suggestion.type;
            let description = '';
            
            if (suggestion.action === 'new') {
              title = `➕ Add ${suggestion.type}`;
              description = suggestion.details?.notes || `New component: ${suggestion.type}`;
              if (suggestion.details?.quantity) {
                description += ` (Qty: ${suggestion.details.quantity})`;
              }
            } else if (suggestion.action === 'update') {
              title = `🔄 Update ${suggestion.type}`;
              description = suggestion.details?.notes || `Modify existing: ${suggestion.type}`;
              if (suggestion.currentMaterial?.name) {
                description += ` (Current: ${suggestion.currentMaterial.name})`;
              }
            } else if (suggestion.action === 'remove') {
              title = `❌ Remove ${suggestion.type}`;
              description = suggestion.details?.notes || `Remove component: ${suggestion.type}`;
              if (suggestion.currentMaterial?.name) {
                description += ` (${suggestion.currentMaterial.name})`;
              }
            }
            
            return {
              id: `suggestion-${Date.now()}-${index}`,
              title,
              description,
              code: suggestion.details?.code || JSON.stringify(suggestion.details || {}, null, 2),
              action: suggestion.action === 'new' ? 'add' : 
                     suggestion.action === 'update' ? 'modify' : 'remove',
              expanded: false,
              originalData: JSON.stringify(suggestion)
            };
          });
          
          // Store chatSuggestions for later use
          (window as any).tempChatSuggestions = newChatSuggestions;
          
          // Use detailed AI explanation if available
          if (responseWithExplanation.explanation) {
            let explanationText = `${responseWithExplanation.explanation.summary}\n\n`;
            
            if (responseWithExplanation.explanation.reasoning) {
              explanationText += `${responseWithExplanation.explanation.reasoning}\n\n`;
            }
            
            if (responseWithExplanation.explanation.changes && responseWithExplanation.explanation.changes.length > 0) {
              explanationText += 'Changes made:\n';
              responseWithExplanation.explanation.changes.forEach((change: any, index: number) => {
                const emoji = change.type === 'added' ? '✅' : 
                            change.type === 'removed' ? '❌' : 
                            change.type === 'updated' ? '🔄' : '⚪';
                explanationText += `${emoji} ${change.component} - ${change.reason}\n`;
              });
              explanationText += '\n';
            }
            
            if (responseWithExplanation.explanation.impact) {
              explanationText += `Impact: ${responseWithExplanation.explanation.impact}\n\n`;
            }
            
            if (responseWithExplanation.explanation.nextSteps) {
              explanationText += `Recommendations: ${responseWithExplanation.explanation.nextSteps}`;
            }
            
            aiResponse = explanationText;
          } else {
            // Fallback to generic message if no detailed explanation
          const materialCount = suggestions.length;
          aiResponse = `I have analyzed your request and prepared ${materialCount === 1 ? '1 suggestion' : `${materialCount} suggestions`} for modifications. Please review the proposed changes below and choose to accept or reject the modifications.`;
          }
        } else {
                      aiResponse = 'I understand your component modification request. I am working on analyzing your needs and will suggest appropriate components.';
        }
      }

      // Prepare suggestions for the new ChatPanel format
      let chatSuggestions: BaseSuggestion[] | undefined;
      
      // Retrieve chatSuggestions created earlier if available
      if (mode === 'agent' && (window as any).tempChatSuggestions) {
        chatSuggestions = (window as any).tempChatSuggestions;
        console.log('Using stored chatSuggestions:', chatSuggestions?.length || 0);
        // Clean up temporary variable
        delete (window as any).tempChatSuggestions;
      } else if (mode === 'agent' && pendingSuggestions.length > 0) {
        // Fallback if temporary suggestions are not available
        // Filtrer les suggestions 'keep' qui ne sont pas utiles pour l'utilisateur
        const filteredPendingSuggestions = pendingSuggestions.filter(s => s.action !== 'keep');
        
        chatSuggestions = filteredPendingSuggestions.map((suggestion, index) => {
          // Create an informative title with action and details (same logic as above)
          let title = suggestion.type;
          let description = '';
          
          if (suggestion.action === 'new') {
            title = `➕ Add ${suggestion.type}`;
            description = suggestion.details?.notes || `New component: ${suggestion.type}`;
            if (suggestion.details?.quantity) {
              description += ` (Qty: ${suggestion.details.quantity})`;
            }
          } else if (suggestion.action === 'update') {
            title = `🔄 Update ${suggestion.type}`;
            description = suggestion.details?.notes || `Modify existing: ${suggestion.type}`;
            if (suggestion.currentMaterial?.name) {
              description += ` (Current: ${suggestion.currentMaterial.name})`;
            }
          } else if (suggestion.action === 'remove') {
            title = `❌ Remove ${suggestion.type}`;
            description = suggestion.details?.notes || `Remove component: ${suggestion.type}`;
            if (suggestion.currentMaterial?.name) {
              description += ` (${suggestion.currentMaterial.name})`;
            }
          }
          
          return {
            id: `suggestion-${Date.now()}-${index}`,
            title,
            description,
            code: suggestion.details?.code || JSON.stringify(suggestion.details || {}, null, 2),
            action: suggestion.action === 'new' ? 'add' : 
                   suggestion.action === 'update' ? 'modify' : 'remove',
            expanded: false,
            originalData: JSON.stringify(suggestion)
          };
        });
        console.log('Using fallback chatSuggestions:', chatSuggestions?.length || 0);
      }

      // Add AI response with integrated suggestions
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        mode,
        suggestions: chatSuggestions
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message to database and get the real ID
      const savedAiMessage = await saveChatMessage(aiMessage);
      if (savedAiMessage) {
        // Update the message with the database ID
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? savedAiMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Error message for the user
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        mode,
      };

      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message to database
      const savedErrorMessage = await saveChatMessage(errorMessage);
      if (savedErrorMessage) {
        // Update the message with the database ID
        setMessages(prev => prev.map(msg => 
          msg.id === errorMessage.id ? savedErrorMessage : msg
        ));
      }
    } finally {
      setIsGenerating(false);
    }
  };


  const handleStopGeneration = async () => {
    setIsGenerating(false);
    
    // Add a message indicating the stop
    const stopMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '⏹️ Generation stopped by user.',
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    
              setMessages(prev => [...prev, stopMessage]);
    
    // Save stop message to database
    const savedStopMessage = await saveChatMessage(stopMessage);
    if (savedStopMessage) {
      setMessages(prev => prev.map(msg => 
        msg.id === stopMessage.id ? savedStopMessage : msg
      ));
    }
  };

  const handleAcceptSuggestion = async (messageId: string, suggestionId: string) => {
    if (!projectId) return;
    
    try {
      setIsGenerating(true);
      
      // Find the suggestion in messages
      const message = messages.find(m => m.id === messageId);
      const suggestion = message?.suggestions?.find(s => s.id === suggestionId);
      
      if (!suggestion) return;
      
      // Retrieve original suggestion data
      let originalSuggestion;
      
      if (suggestion.originalData) {
        // Use data stored in the suggestion
        originalSuggestion = JSON.parse(suggestion.originalData);
      } else {
        // Fallback: search in pendingSuggestions
        originalSuggestion = pendingSuggestions.find(s => s.type === suggestion.title);
      }
      
      if (!originalSuggestion) {
        throw new Error('Original suggestion data not found');
      }
      
      console.log('Processing material suggestion:', originalSuggestion);
      
      // Process the material suggestion directly via API (without AI call)
      const result = await api.projects.addMaterialFromSuggestion(projectId, originalSuggestion);
      
      console.log('Material suggestion processed successfully:', result);
      
      // No automatic message - visual action is sufficient
      
      // Refresh the materials list
      if (onMaterialsUpdated) {
        onMaterialsUpdated();
      }
      
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `❌ Error processing suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'ai',
        timestamp: new Date(),
        mode: 'agent',
      };
      
      setMessages(prev => [...prev, errorMessage]);
      const savedErrorMessage2 = await saveChatMessage(errorMessage);
      if (savedErrorMessage2) {
        setMessages(prev => prev.map(msg => 
          msg.id === errorMessage.id ? savedErrorMessage2 : msg
        ));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
    // No automatic message - visual state of suggestion is sufficient
    console.log(`Suggestion ${suggestionId} rejected for message ${messageId}`);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Materials</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StatusLegend />
              <Button
                variant="contained"
                startIcon={<PlaylistAddIcon />}
                onClick={() => setShowAddDialog(true)}
              >
              Add Material
              </Button>
          </Box>
        </Box>

        {(!isInitialLoaded && isLoading) ? (
          <Card sx={{ p: 2 }}>Loading materials...</Card>
          ) : (
            activeMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onEdit={handleEditMaterial}
                onApprove={onApproveSelected}
                onReject={onRejectSelected}
                onDelete={onDeleteMaterial}
                expanded={expandedById[material.id] ?? false}
                onExpandedChange={(exp) => handleToggleExpanded(material.id, exp)}
              />
            ))
          )}
      </Box>

      {/* Chat Panel - Right Side */}
      <Box sx={{ flex: 1, minWidth: 350 }}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendChatMessage}
          onStopGeneration={handleStopGeneration}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          isGenerating={isGenerating || isLoadingMessages}
          projectId={projectId}
        />
        
      </Box>

      {/* Add Material Dialog */}
      <AddMaterialDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddMaterial}
      />

      {/* Edit Material Dialog */}
      <EditMaterialDialog
        open={showEditDialog}
        material={editingMaterial}
        onClose={() => {
          setShowEditDialog(false);
          setEditingMaterial(null);
        }}
        onSave={handleSaveEditedMaterial}
        onRefetch={onMaterialsUpdated}
      />
    </Box>
  );
};

export default MaterialsPanel; 