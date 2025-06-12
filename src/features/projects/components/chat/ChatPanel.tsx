import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  TextField,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import { TypingAnimation } from './';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  mode: 'ask' | 'agent';
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode: 'ask' | 'agent') => void;
  isLoading?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<'ask' | 'agent'>('ask');
  const [generatingMode, setGeneratingMode] = useState<'ask' | 'agent' | null>(null);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setGeneratingMode(chatMode); // Démarrer l'animation pour le mode actuel
      onSendMessage(inputMessage.trim(), chatMode);
      setInputMessage('');
    }
  };

  // Arrêter l'animation quand isLoading devient false
  React.useEffect(() => {
    if (!isLoading) {
      setGeneratingMode(null);
    }
  }, [isLoading]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Paper 
      sx={{ 
        height: '80vh', // Hauteur fixe
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI Assistant
          </Typography>
        </Box>
        
        {/* Mode Toggle */}
        <ToggleButtonGroup
          value={chatMode}
          exclusive
          onChange={(e, newMode) => newMode && setChatMode(newMode)}
          size="small"
          fullWidth
          disabled={isLoading} // Désactiver pendant la génération
        >
          <ToggleButton value="ask" sx={{ textTransform: 'none' }}>
            <PsychologyIcon sx={{ mr: 1 }} />
            Ask
          </ToggleButton>
          <ToggleButton value="agent" sx={{ textTransform: 'none' }}>
            <AutoFixHighIcon sx={{ mr: 1 }} />
            Agent
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {chatMode === 'ask' 
            ? 'Simple Q&A - No modifications will be made'
            : 'Agent mode - Can modify your components'
          }
        </Typography>
      </Box>

      {/* Chat Messages */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        p: 1,
        minHeight: 0, // Important pour permettre le scroll
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.length === 0 && !generatingMode ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <SmartToyIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">
              Start a conversation with the AI assistant
            </Typography>
            <Typography variant="caption">
              Choose "Ask" for questions or "Agent" for component modifications
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  mb: 2,
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                    ml: message.sender === 'user' ? 1 : 0,
                    mr: message.sender === 'user' ? 0 : 1,
                  }}
                >
                  {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                </Avatar>
                
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '75%',
                    bgcolor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body2">
                    {message.content}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                      label={message.mode === 'ask' ? 'Ask' : 'Agent'}
                      size="small"
                      color={message.mode === 'ask' ? 'info' : 'warning'}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="inherit" sx={{ opacity: 0.7 }}>
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
            
            {/* Animation de typing pendant la génération */}
            {generatingMode && (
              <TypingAnimation mode={generatingMode} />
            )}
          </>
        )}
      </Box>

      {/* Chat Input */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder={
            isLoading
              ? `${chatMode === 'ask' ? 'Thinking' : 'Generating components'}...`
              : chatMode === 'ask' 
                ? 'Ask a question about your components...'
                : 'Tell the agent what to modify...'
          }
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  color="primary"
                >
                  {isLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default ChatPanel;
export type { ChatMessage }; 