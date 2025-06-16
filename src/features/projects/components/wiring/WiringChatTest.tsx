import React, { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { ChatPanel } from '../chat';
import { WiringSuggestion } from '../../../../shared/types';

// Données de test pour les suggestions
const mockWiringSuggestions: WiringSuggestion[] = [
  {
    id: 'test-suggestion-1',
    title: 'Connexion alimentation Arduino',
    description: 'Connecter la batterie 9V à l\'entrée VIN de l\'Arduino Uno',
    action: 'add',
    connectionData: {
      id: 'conn-power-test',
      fromComponent: 'battery',
      fromPin: 'positive',
      toComponent: 'arduino',
      toPin: 'vin',
      wireType: 'power',
      wireColor: '#f44336',
      validated: false
    },
    expanded: false,
    validated: false,
    confidence: 0.95
  },
  {
    id: 'test-suggestion-2',
    title: 'Connexion capteur température',
    description: 'Connecter le capteur de température au pin analogique A0',
    action: 'add',
    connectionData: {
      id: 'conn-sensor-test',
      fromComponent: 'temp_sensor',
      fromPin: 'data',
      toComponent: 'arduino',
      toPin: 'a0',
      wireType: 'analog',
      wireColor: '#2196f3',
      validated: false
    },
    expanded: false,
    validated: false,
    confidence: 0.85
  },
  {
    id: 'test-suggestion-3',
    title: 'Connexion écran LCD',
    description: 'Connecter l\'écran LCD via I2C (SDA/SCL)',
    action: 'add',
    connectionData: {
      id: 'conn-display-test',
      fromComponent: 'lcd',
      fromPin: 'sda',
      toComponent: 'arduino',
      toPin: 'sda',
      wireType: 'digital',
      wireColor: '#4caf50',
      validated: false
    },
    expanded: false,
    validated: false,
    confidence: 0.90
  }
];

interface TestMessage {
  id: string;
  content: string;
  sender: 'ai';
  timestamp: Date;
  mode: 'agent';
  suggestions: WiringSuggestion[];
}

const WiringChatTest: React.FC = () => {
  const [messages, setMessages] = useState<TestMessage[]>([
    {
      id: 'test-message-1',
      content: 'Voici mes suggestions pour votre circuit optimal :',
      sender: 'ai',
      timestamp: new Date(),
      mode: 'agent',
      suggestions: mockWiringSuggestions
    }
  ]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendMessage = (message: string, mode: 'ask' | 'agent') => {
    console.log('Sending message:', message, mode);
    // Pour ce test, on ne simule pas de nouvelles réponses
    // Concentrons-nous sur le test des suggestions existantes
  };

  const handleAcceptSuggestion = (messageId: string, suggestionId: string) => {
    console.log('✅ Suggestion acceptée:', { messageId, suggestionId });
    
    // Ici, normalement on ajouterait la connexion au diagramme
    alert(`Suggestion ${suggestionId} acceptée ! Elle serait ajoutée au schéma de câblage.`);
  };

  const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
    console.log('❌ Suggestion refusée:', { messageId, suggestionId });
    
    // Ici, on marquerait juste la suggestion comme refusée
    alert(`Suggestion ${suggestionId} refusée.`);
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
  };

  const addTestMessage = () => {
    const testMessage = {
      id: `test-${Date.now()}`,
      content: 'Message de test avec nouvelles suggestions',
      sender: 'ai' as const,
      timestamp: new Date(),
      mode: 'agent' as const,
      suggestions: [
        {
          id: `test-new-${Date.now()}`,
          title: 'Test suggestion',
          description: 'Ceci est une suggestion de test pour vérifier les états visuels',
          action: 'add' as const,
          connectionData: {
            id: `conn-test-${Date.now()}`,
            fromComponent: 'test_comp',
            fromPin: 'test_pin',
            toComponent: 'target_comp',
            toPin: 'target_pin',
            wireType: 'data' as const,
            wireColor: '#ff9800',
            validated: false
          },
          expanded: false,
          validated: false,
          confidence: 0.80
        }
      ]
    };
    
    setMessages(prev => [...prev, testMessage]);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
          <Typography variant="h5" gutterBottom>
            🧪 Test des suggestions de chat
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Test des fonctionnalités :</strong>
          </Typography>
          <ul>
            <li>✅ États visuels des suggestions (accepté/refusé)</li>
            <li>🎨 Couleurs et badges d'état</li>
            <li>🚫 Texte barré pour les suggestions refusées</li>
            <li>🔗 Intégration avec les données de connexion</li>
          </ul>
          <Button 
            variant="outlined" 
            onClick={addTestMessage}
            sx={{ mt: 1 }}
          >
            Ajouter message de test
          </Button>
        </Paper>
      </Box>
      
      <Box sx={{ flex: 1, height: '100vh' }}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          isGenerating={isGenerating}
        />
      </Box>
    </Box>
  );
};

export default WiringChatTest; 