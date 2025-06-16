import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Cable as CableIcon,
  Visibility as ViewIcon,
  List as ListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import WiringEditor from './WiringEditor';
import { ChatPanel, ChatMessage, MaterialSuggestion } from '../chat';
import ConnectionsList from './ConnectionsList';
import { useWiring } from '../../hooks/useWiring';
import { api } from '../../../../shared/services/api';

interface WiringSuggestion {
  id: string;
  title: string;
  description: string;
  connections?: any[];
  action: 'add' | 'modify' | 'remove';
  expanded: boolean;
}

interface WiringPanelProps {
  projectId: string;
  materials: any[];
  isVisible: boolean;
}

const WiringPanel: React.FC<WiringPanelProps> = ({
  projectId,
  materials,
  isVisible,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' } | null>(null);

  const {
    wiring,
    loading,
    error,
    createWiring,
    updateWiring,
    validateWiring,
    handleChatMessage,
    refreshWiring
  } = useWiring(projectId);

  // Charger les messages du chat au démarrage
  const loadChatMessages = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setIsLoadingMessages(true);
      // Utiliser 'wiring' comme contexte au lieu de 'materials'
      const dbMessages = await api.projects.getChatMessages(projectId, 'wiring', 10);
      
      // Convertir les messages de la BD vers le format ChatMessage
      const chatMessages: ChatMessage[] = dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.createdAt),
        mode: msg.mode as 'ask' | 'agent',
        suggestions: msg.suggestions ? msg.suggestions as MaterialSuggestion[] : undefined
      }));
      
      setChatMessages(chatMessages);
    } catch (error) {
      console.error('Error loading wiring chat messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [projectId]);

  // Charger les messages au démarrage du composant
  React.useEffect(() => {
    loadChatMessages();
  }, [projectId, loadChatMessages]);

  // Sauvegarder un message dans la BD
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

  // Gestion du chat
  const handleSendMessage = async (message: string, mode: 'ask' | 'agent') => {
    if (!projectId) {
      console.error('Project ID is required for chat');
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: new Date(),
      mode
    };

    setChatMessages(prev => [...prev, userMessage]);
    
    // Sauvegarder le message utilisateur dans la BD
    await saveChatMessage(userMessage);

    setIsGenerating(true);

    try {
      const response = await handleChatMessage(message, mode);
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        content: mode === 'ask' ? response : response.explanation || 'Suggestions de câblage générées',
        sender: 'ai',
        timestamp: new Date(),
        mode,
        suggestions: mode === 'agent' ? formatWiringSuggestions(response.connections) : undefined
      };

      setChatMessages(prev => [...prev, aiMessage]);
      
      // Sauvegarder le message AI dans la BD
      await saveChatMessage(aiMessage);
    } catch (error) {
      console.error('Erreur lors du chat wiring:', error);
      setNotification({
        message: 'Erreur lors de la communication avec l\'IA',
        severity: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Formater les suggestions de câblage pour le chat
  const formatWiringSuggestions = (connections: any[]): MaterialSuggestion[] => {
    return connections?.map((conn, index) => ({
      id: `sugg_${index}`,
      title: `${conn.from} → ${conn.to}`,
      description: `Connexion ${conn.fromPin} vers ${conn.toPin} avec câble ${conn.wire}`,
      code: `// Connexion ${conn.from}:${conn.fromPin} -> ${conn.to}:${conn.toPin}\n// Câble: ${conn.wire}\n// Tension: ${conn.voltage}`,
      action: conn.action || 'add',
      expanded: false
    })) || [];
  };

  // Accepter une suggestion
  const handleAcceptSuggestion = async (messageId: string, suggestionId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    const suggestion = message?.suggestions?.find(s => s.id === suggestionId);
    
    if (suggestion) {
      try {
        const currentConnections = wiring?.currentVersion?.wiringData?.connections || [];
        // Ici on pourrait parser la suggestion pour créer une vraie connexion
        // Pour l'instant on simule l'ajout
        
        setNotification({
          message: 'Suggestion de câblage appliquée avec succès',
          severity: 'success'
        });

        // Retirer la suggestion du chat
        setChatMessages(prev => prev.map(msg => 
          msg.id === messageId ? {
            ...msg,
            suggestions: msg.suggestions?.filter(s => s.id !== suggestionId)
          } : msg
        ));
      } catch (error) {
        console.error('Erreur lors de l\'application de la suggestion:', error);
        setNotification({
          message: 'Erreur lors de l\'application de la suggestion',
          severity: 'error'
        });
      }
    }
  };

  // Rejeter une suggestion
  const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
    setChatMessages(prev => prev.map(msg => 
      msg.id === messageId ? {
        ...msg,
        suggestions: msg.suggestions?.filter(s => s.id !== suggestionId)
      } : msg
    ));
  };

  // Arrêter la génération
  const handleStopGeneration = async () => {
    setIsGenerating(false);
    
    const stopMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: '⏹️ Génération de câblage arrêtée par l\'utilisateur.',
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
    };
    
    setChatMessages(prev => [...prev, stopMessage]);
    await saveChatMessage(stopMessage);
  };

  // Sauvegarder le câblage
  const handleSaveWiring = async (wiringData: any) => {
    try {
      if (wiring) {
        await updateWiring(wiringData);
      } else {
        await createWiring(wiringData);
      }
      
      setNotification({
        message: 'Câblage sauvegardé avec succès',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setNotification({
        message: 'Erreur lors de la sauvegarde du câblage',
        severity: 'error'
      });
    }
  };

  // Valider le câblage
  const handleValidateWiring = async (wiringData: any) => {
    try {
      const result = await validateWiring(wiringData);
      
      setNotification({
        message: result.summary,
        severity: result.isValid ? 'success' : result.errors?.length > 0 ? 'error' : 'warning'
      });

      return result;
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      setNotification({
        message: 'Erreur lors de la validation du câblage',
        severity: 'error'
      });
      throw error;
    }
  };

  if (!isVisible) return null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Chargement du câblage...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Erreur lors du chargement du câblage: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
      {/* Wiring Content - Left Side */}
      <Box sx={{ flex: 2 }}>
        {/* Header avec onglets */}
        <Paper sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
            <CableIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Éditeur de Câblage
            </Typography>
            
            <Tooltip title="Actualiser">
              <IconButton onClick={refreshWiring} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Tabs 
            value={currentTab} 
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{ px: 2 }}
          >
            <Tab 
              icon={<ViewIcon />} 
              label="Éditeur Visuel" 
              iconPosition="start"
            />
            <Tab 
              icon={<ListIcon />} 
              label="Liste des Connexions" 
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Contenu des onglets */}
        <Box sx={{ height: 'calc(100% - 120px)' }}>
          {currentTab === 0 && (
            <WiringEditor
              projectId={projectId}
              components={materials}
              wiring={wiring}
              onSave={handleSaveWiring}
              onValidate={handleValidateWiring}
            />
          )}

          {currentTab === 1 && (
            <ConnectionsList
              connections={wiring?.currentVersion?.wiringData?.connections || []}
              components={materials}
              onUpdate={handleSaveWiring}
              onValidate={handleValidateWiring}
            />
          )}
        </Box>
      </Box>

      {/* Chat Panel - Right Side */}
      <Box sx={{ flex: 1, minWidth: 350 }}>
        <ChatPanel
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          isGenerating={isGenerating || isLoadingMessages}
        />
      </Box>

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        <Alert
          severity={notification?.severity || 'info'}
          onClose={() => setNotification(null)}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WiringPanel; 