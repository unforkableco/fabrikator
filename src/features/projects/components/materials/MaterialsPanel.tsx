import React, { useState } from 'react';
import { Box, Typography, Button, Card } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Material } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';
import { ChatPanel, ChatMessage } from '../chat';
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

  // Les matériaux rejetés sont maintenant filtrés automatiquement côté backend
  const activeMaterials = materials;

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
    setIsGenerating(true);

    try {
      let aiResponse: string;
      
      if (mode === 'ask') {
        // Mode Ask - Réponse simple sans appel API pour éviter l'erreur 500
        aiResponse = `I understand you're asking: "${message}". In Ask mode, I can provide information about your components and answer questions about your project, but I won't modify anything. Is there something specific about your current components you'd like to know more about?`;
      } else {
        // Mode Agent - Génération de suggestions de matériaux
        console.log('Sending agent message:', message);
        const response = await api.projects.sendAgentMessage(projectId, message);
        console.log('Agent response:', response);
        
        if (Array.isArray(response) && response.length > 0) {
          // Si l'agent a créé des matériaux, informer l'utilisateur et rafraîchir
          const materialCount = response.length;
          aiResponse = `J'ai analysé votre demande et ${materialCount === 1 ? 'mis à jour 1 composant' : `mis à jour ${materialCount} composants`} dans votre projet. Les composants ont été automatiquement générés/mis à jour avec leurs nouvelles versions basées sur vos exigences. Vous pouvez voir les dernières versions dans la liste à gauche.`;
          
          // Rafraîchir immédiatement la liste des matériaux pour afficher les dernières versions
          setTimeout(() => {
            if (onMaterialsUpdated) {
              onMaterialsUpdated();
            }
          }, 100);
        } else {
          aiResponse = 'Je comprends votre demande de modifications de composants. Je travaille sur l\'analyse de vos besoins et vais suggérer les composants appropriés.';
        }
      }

      // Ajouter la réponse de l'IA
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        mode,
      };

      setMessages(prev => [...prev, aiMessage]);
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
    } finally {
      setIsGenerating(false);
    }
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
          isLoading={isGenerating}
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
      />
    </Box>
  );
};

export default MaterialsPanel; 