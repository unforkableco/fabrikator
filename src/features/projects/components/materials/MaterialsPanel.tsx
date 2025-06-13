import React, { useState } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Material } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';
import { ChatPanel, ChatMessage, MaterialSuggestion, MaterialSuggestionDiff } from '../chat';
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
  const loadChatMessages = async () => {
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
        suggestions: msg.suggestions ? msg.suggestions as MaterialSuggestion[] : undefined
      }));
      
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Charger les messages au démarrage du composant
  React.useEffect(() => {
    loadChatMessages();
  }, [projectId]);

  // Sauvegarder un message dans la BD
  const saveChatMessage = async (message: ChatMessage) => {
    if (!projectId) return;
    
    try {
      await api.projects.sendChatMessage(projectId, {
        context: 'materials',
        content: message.content,
        sender: message.sender,
        mode: message.mode,
        suggestions: message.suggestions || null
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
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
      
      // Sauvegarder le message utilisateur dans la BD
      await saveChatMessage(userMessage);
      
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
          aiResponse = `Désolé, j'ai rencontré une erreur en essayant de répondre à votre question. Pouvez-vous reformuler ou réessayer ?`;
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
              explanationText += 'Modifications apportées :\n';
              responseWithExplanation.explanation.changes.forEach((change: any, index: number) => {
                const emoji = change.type === 'added' ? '✅' : 
                            change.type === 'removed' ? '❌' : 
                            change.type === 'updated' ? '🔄' : '⚪';
                explanationText += `${emoji} ${change.component} - ${change.reason}\n`;
              });
              explanationText += '\n';
            }
            
            if (responseWithExplanation.explanation.impact) {
              explanationText += `Impact : ${responseWithExplanation.explanation.impact}\n\n`;
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
          aiResponse = 'Je comprends votre demande de modifications de composants. Je travaille sur l\'analyse de vos besoins et vais suggérer les composants appropriés.';
        }
      }

      // Préparer les suggestions pour le nouveau format de ChatPanel
      let chatSuggestions: MaterialSuggestion[] | undefined;
      
      if (mode === 'agent' && pendingSuggestions.length > 0) {
        chatSuggestions = pendingSuggestions.map((suggestion, index) => ({
          id: `suggestion-${Date.now()}-${index}`,
          title: suggestion.type,
          description: suggestion.details?.notes || `${suggestion.action} ${suggestion.type}`,
          code: suggestion.details?.code || '',
          action: suggestion.action === 'new' ? 'add' : 
                 suggestion.action === 'update' ? 'modify' : 'remove',
          expanded: false
        }));
        
        // Ne plus afficher le diff séparé car les suggestions sont dans le message
        setShowSuggestionDiff(false);
        setPendingSuggestions([]);
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
      
      // Sauvegarder le message IA dans la BD
      await saveChatMessage(aiMessage);
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
      await saveChatMessage(errorMessage);
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
          content: `✅ Suggestions acceptées ! ${response.length} composant(s) ont été mis à jour dans votre projet.`,
          sender: 'ai',
          timestamp: new Date(),
          mode: 'agent',
        };
        
        setMessages(prev => [...prev, confirmMessage]);
        
        // Sauvegarder le message de confirmation dans la BD
        await saveChatMessage(confirmMessage);
        
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
      content: `❌ Suggestions rejetées. Aucune modification n'a été apportée à vos composants.`,
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
      await saveChatMessage(stopMessage);
  };

  const handleAcceptSuggestion = async (messageId: string, suggestionId: string) => {
    if (!projectId) return;
    
    try {
      setIsGenerating(true);
      
      // Trouver la suggestion dans les messages
      const message = messages.find(m => m.id === messageId);
      const suggestion = message?.suggestions?.find(s => s.id === suggestionId);
      
      if (!suggestion) return;
      
      // Simuler l'application de la suggestion
      // TODO: Implémenter l'application réelle selon votre logique métier
      
      // Ajouter un message de confirmation
      const confirmMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `✅ Suggestion acceptée : "${suggestion.title}" a été appliquée à votre projet.`,
        sender: 'ai',
        timestamp: new Date(),
        mode: 'agent',
      };
      
      setMessages(prev => [...prev, confirmMessage]);
      
      // Rafraîchir la liste des matériaux si nécessaire
      if (onMaterialsUpdated) {
        onMaterialsUpdated();
      }
      
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `❌ Erreur lors de l'application de la suggestion : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        sender: 'ai',
        timestamp: new Date(),
        mode: 'agent',
      };
      
      setMessages(prev => [...prev, errorMessage]);
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
            startIcon={<AddIcon />}
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
                startIcon={<AddIcon />}
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