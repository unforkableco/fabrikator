import React, { useState, useCallback } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { Material } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';
import { ChatPanel, ChatMessage, BaseSuggestion, MaterialSuggestionDiff } from '../chat';
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
  const [showSuggestionDiff, setShowSuggestionDiff] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Les matériaux rejetés sont maintenant filtrés automatiquement côté backend
  const activeMaterials = materials;

  // Charger les messages au démarrage
  const loadChatMessages = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoadingMessages(true);
      const dbMessages = await api.projects.getChatMessages(projectId, 'materials', 10);
      
      // Convertir les messages de la BD vers le format ChatMessage
      const chatMessages: ChatMessage[] = dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.createdAt),
        mode: msg.mode as 'ask' | 'agent',
        suggestions: msg.suggestions ? msg.suggestions as BaseSuggestion[] : undefined
      }));
      
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [projectId]);

  // Charger les messages au démarrage du composant
  React.useEffect(() => {
    loadChatMessages();
  }, [projectId, loadChatMessages]);

  // Sauvegarder un message dans la BD et retourner le message avec son vrai ID
  const saveChatMessage = async (message: ChatMessage): Promise<ChatMessage | null> => {
    if (!projectId) return null;
    
    try {
      const savedMessage = await api.projects.sendChatMessage(projectId, {
        context: 'materials',
        content: message.content,
        sender: message.sender,
        mode: message.mode,
        suggestions: message.suggestions || null
      });
      
      // Retourner le message avec l'ID de la BD et les autres données originales
      return {
        ...message,
        id: savedMessage.id // Utiliser l'ID de la BD
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
      // Utiliser l'API directement pour mettre à jour le matériau
      await api.projects.updateMaterial(materialId, updatedMaterial);
      setShowEditDialog(false);
      setEditingMaterial(null);
      onMaterialsUpdated?.();
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
    
    // Sauvegarder le message utilisateur dans la BD et récupérer l'ID réel
    const savedUserMessage = await saveChatMessage(userMessage);
    if (savedUserMessage) {
      // Mettre à jour le message avec l'ID de la BD
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? savedUserMessage : msg
      ));
    }
      
      setIsGenerating(true);

    try {
      let aiResponse: string;
      
      if (mode === 'ask') {
        // Mode Ask - Utiliser l'IA pour répondre aux questions sur le projet
        console.log('Sending ask question:', message);
        
        try {
          const response = await api.projects.askQuestion(projectId, message);
          aiResponse = response.answer;
        } catch (error) {
          console.error('Error asking question:', error);
          aiResponse = `Sorry, I encountered an error trying to answer your question. Could you rephrase or try again?`;
        }
      } else {
        // Mode Agent - Génération de suggestions de matériaux
        console.log('Sending agent message:', message);
        
        // Récupérer d'abord les suggestions sans les appliquer
        const response = await api.projects.previewMaterialSuggestions(projectId, message);
        console.log('Agent response:', response);
        
        if (response && response.components && Array.isArray(response.components)) {
          const responseWithExplanation = response as any; // Type assertion pour accéder à explanation
          // Transformer les suggestions pour le diff
          const suggestions = response.components.map((component: any) => ({
            action: component.details?.action || 'new',
            type: component.type,
            details: component.details,
            currentMaterial: activeMaterials.find(m => {
              const specs = m.currentVersion?.specs as any;
              return specs?.type === component.type || specs?.name === component.type;
            })
          }));
          
          // Stocker les suggestions et afficher le diff
          setPendingSuggestions(suggestions);
          setShowSuggestionDiff(true);
          
          // Utiliser l'explication détaillée de l'IA si disponible
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
              explanationText += `Recommandations : ${responseWithExplanation.explanation.nextSteps}`;
            }
            
            aiResponse = explanationText;
          } else {
            // Fallback au message générique si pas d'explication détaillée
          const materialCount = suggestions.length;
          aiResponse = `J'ai analysé votre demande et préparé ${materialCount === 1 ? '1 suggestion' : `${materialCount} suggestions`} de modifications. Veuillez examiner les changements proposés ci-dessous et choisir d'accepter ou de rejeter les modifications.`;
          }
        } else {
                      aiResponse = 'I understand your component modification request. I am working on analyzing your needs and will suggest appropriate components.';
        }
      }

      // Préparer les suggestions pour le nouveau format de ChatPanel
      let chatSuggestions: BaseSuggestion[] | undefined;
      
      if (mode === 'agent' && pendingSuggestions.length > 0) {
        chatSuggestions = pendingSuggestions.map((suggestion, index) => ({
          id: `suggestion-${Date.now()}-${index}`,
          title: suggestion.type,
          description: suggestion.details?.notes || `${suggestion.action} ${suggestion.type}`,
          code: suggestion.details?.code || '',
          action: suggestion.action === 'new' ? 'add' : 
                 suggestion.action === 'update' ? 'modify' : 'remove',
          expanded: false,
          // Stocker les données originales de la suggestion dans le champ code
          originalData: JSON.stringify(suggestion)
        }));
        
        // Ne plus afficher le diff séparé car les suggestions sont dans le message
        setShowSuggestionDiff(false);
        // Ne pas vider pendingSuggestions ici pour pouvoir les réutiliser
      }

      // Ajouter la réponse de l'IA avec les suggestions intégrées
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        mode,
        suggestions: chatSuggestions
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Sauvegarder le message IA dans la BD et récupérer l'ID réel
      const savedAiMessage = await saveChatMessage(aiMessage);
      if (savedAiMessage) {
        // Mettre à jour le message avec l'ID de la BD
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? savedAiMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Message d'erreur pour l'utilisateur
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        mode,
      };

      setMessages(prev => [...prev, errorMessage]);
      
      // Sauvegarder le message d'erreur dans la BD
      const savedErrorMessage = await saveChatMessage(errorMessage);
      if (savedErrorMessage) {
        // Mettre à jour le message avec l'ID de la BD
        setMessages(prev => prev.map(msg => 
          msg.id === errorMessage.id ? savedErrorMessage : msg
        ));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptSuggestions = async () => {
    if (!projectId || pendingSuggestions.length === 0) return;
    
    try {
      setIsGenerating(true);
      
      // Créer une structure compatible avec l'API suggestions
      const componentsData = {
        components: pendingSuggestions.map(suggestion => ({
          type: suggestion.type,
          details: suggestion.details
        }))
      };
      
      // Simuler un prompt qui va déclencher l'application des suggestions
      const response = await api.projects.generateMaterialSuggestions(projectId, JSON.stringify(componentsData));
      
      if (Array.isArray(response) && response.length > 0) {
        // Ajouter un message de confirmation
        const confirmMessage: ChatMessage = {
          id: Date.now().toString(),
          content: `✅ Suggestions accepted! ${response.length} component(s) have been updated in your project.`,
          sender: 'ai',
          timestamp: new Date(),
          mode: 'agent',
        };
        
              setMessages(prev => [...prev, confirmMessage]);
      
      // Sauvegarder le message de confirmation dans la BD
      const savedConfirmMessage = await saveChatMessage(confirmMessage);
      if (savedConfirmMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === confirmMessage.id ? savedConfirmMessage : msg
        ));
      }
        
        // Rafraîchir la liste des matériaux
        if (onMaterialsUpdated) {
          onMaterialsUpdated();
        }
      }
      
      // Réinitialiser l'état des suggestions
      setPendingSuggestions([]);
      setShowSuggestionDiff(false);
      
    } catch (error) {
      console.error('Error accepting suggestions:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `❌ Erreur lors de l'application des suggestions: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        sender: 'ai',
        timestamp: new Date(),
        mode: 'agent',
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRejectSuggestions = () => {
    // Ajouter un message de rejet
    const rejectMessage: ChatMessage = {
      id: Date.now().toString(),
              content: `❌ Suggestions rejected. No changes have been made to your components.`,
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    
    setMessages(prev => [...prev, rejectMessage]);
    
    // Réinitialiser l'état des suggestions
    setPendingSuggestions([]);
    setShowSuggestionDiff(false);
  };

  const handleStopGeneration = async () => {
    setIsGenerating(false);
    
    // Ajouter un message indiquant l'arrêt
    const stopMessage: ChatMessage = {
      id: Date.now().toString(),
      content: '⏹️ Génération arrêtée par l\'utilisateur.',
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    
              setMessages(prev => [...prev, stopMessage]);
    
    // Sauvegarder le message d'arrêt dans la BD
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
      
      // Trouver la suggestion dans les messages
      const message = messages.find(m => m.id === messageId);
      const suggestion = message?.suggestions?.find(s => s.id === suggestionId);
      
      if (!suggestion) return;
      
      // Récupérer les données de la suggestion originale
      let originalSuggestion;
      
      if (suggestion.originalData) {
        // Utiliser les données stockées dans la suggestion
        originalSuggestion = JSON.parse(suggestion.originalData);
      } else {
        // Fallback: chercher dans pendingSuggestions
        originalSuggestion = pendingSuggestions.find(s => s.type === suggestion.title);
      }
      
      if (!originalSuggestion) {
        throw new Error('Données de suggestion originale non trouvées');
      }
      
      console.log('Adding material from suggestion:', originalSuggestion);
      
      // Ajouter le matériau directement via l'API (sans appel IA)
      const addedMaterial = await api.projects.addMaterialFromSuggestion(projectId, originalSuggestion);
      
      console.log('Material added successfully:', addedMaterial);
      
      // Ajouter un message de confirmation
      const confirmMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `✅ Suggestion acceptée : "${suggestion.title}" a été ajouté à votre projet sans nouvel appel IA.`,
        sender: 'ai',
        timestamp: new Date(),
        mode: 'agent',
      };
      
      setMessages(prev => [...prev, confirmMessage]);
      
      // Sauvegarder le message de confirmation
      await saveChatMessage(confirmMessage);
      
      // Rafraîchir la liste des matériaux
      if (onMaterialsUpdated) {
        onMaterialsUpdated();
      }
      
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `❌ Erreur lors de l'ajout du matériau : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
    // Trouver la suggestion dans les messages
    const message = messages.find(m => m.id === messageId);
    const suggestion = message?.suggestions?.find(s => s.id === suggestionId);
    
    if (!suggestion) return;
    
    // Ajouter un message de rejet
    const rejectMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `❌ Suggestion rejetée : "${suggestion.title}" n'a pas été appliquée.`,
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    
    setMessages(prev => [...prev, rejectMessage]);
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
      {/* Materials List - Left Side */}
      <Box sx={{ flex: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Required Components
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlaylistAddIcon />}
            onClick={() => setShowAddDialog(true)}
            sx={{ textTransform: 'none' }}
          >
            Add Component
          </Button>
        </Box>

        {/* Status Legend */}
        <StatusLegend />

        {/* Materials List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activeMaterials.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No components added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add components to your project to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlaylistAddIcon />}
                onClick={() => setShowAddDialog(true)}
              >
                Add First Component
              </Button>
            </Card>
          ) : (
            activeMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onEdit={handleEditMaterial}
                onApprove={onApproveSelected}
                onReject={onRejectSelected}
              />
            ))
          )}
        </Box>
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
        
        {/* Material Suggestions Diff */}
        {showSuggestionDiff && pendingSuggestions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <MaterialSuggestionDiff
              suggestions={pendingSuggestions}
              onAccept={handleAcceptSuggestions}
              onReject={handleRejectSuggestions}
              isProcessing={isGenerating}
            />
          </Box>
        )}
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
      />
    </Box>
  );
};

export default MaterialsPanel; 