import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  IconButton,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  AutoFixHigh as AutoFixHighIcon,
  Stop as StopIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { TypingAnimation } from './';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  mode: 'ask' | 'agent';
  suggestions?: BaseSuggestion[];
  isLoading?: boolean;
}

interface BaseSuggestion {
  id: string;
  title: string;
  description: string;
  code?: string;
  action: 'add' | 'modify' | 'remove';
  expanded: boolean;
  status?: 'pending' | 'accepted' | 'rejected';
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode: 'ask' | 'agent') => void;
  onStopGeneration: () => void;
  onAcceptSuggestion: (messageId: string, suggestionId: string) => void;
  onRejectSuggestion: (messageId: string, suggestionId: string) => void;
  isGenerating?: boolean;
  context?: 'materials' | 'wiring' | 'general';
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onStopGeneration,
  onAcceptSuggestion,
  onRejectSuggestion,
  isGenerating = false,
  context
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<'ask' | 'agent'>('ask');
  const [suggestionStates, setSuggestionStates] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clé pour le localStorage basée sur le contexte
  const storageKey = `suggestions-state-${context || 'general'}`;

  // Charger l'état des suggestions depuis le localStorage
  useEffect(() => {
    try {
      const savedStates = localStorage.getItem(storageKey);
      if (savedStates) {
        setSuggestionStates(JSON.parse(savedStates));
      }
    } catch (error) {
      console.error('Error loading suggestion states:', error);
    }
  }, [storageKey]);

  // Sauvegarder l'état des suggestions dans le localStorage
  const saveSuggestionStates = useCallback((newStates: Record<string, 'accepted' | 'rejected'>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newStates));
    } catch (error) {
      console.error('Error saving suggestion states:', error);
    }
  }, [storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isGenerating) {
      onSendMessage(inputMessage.trim(), chatMode);
      setInputMessage('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleAcceptSuggestion = (messageId: string, suggestionId: string) => {
    // Marquer la suggestion comme acceptée visuellement
    const newStates = {
      ...suggestionStates,
      [suggestionId]: 'accepted' as const
    };
    setSuggestionStates(newStates);
    saveSuggestionStates(newStates);
    // Appeler la fonction parent
    onAcceptSuggestion(messageId, suggestionId);
  };

  const handleRejectSuggestion = (messageId: string, suggestionId: string) => {
    // Marquer la suggestion comme refusée visuellement
    const newStates = {
      ...suggestionStates,
      [suggestionId]: 'rejected' as const
    };
    setSuggestionStates(newStates);
    saveSuggestionStates(newStates);
    // Appeler la fonction parent
    onRejectSuggestion(messageId, suggestionId);
  };

  const renderSuggestion = (suggestion: BaseSuggestion, messageId: string) => {
    const suggestionState = suggestionStates[suggestion.id];
    const isAccepted = suggestionState === 'accepted';
    const isRejected = suggestionState === 'rejected';
    
    return (
      <Paper
        key={suggestion.id}
        sx={{
          mb: 1.5,
          border: '2px solid',
          borderColor: isAccepted 
            ? '#4caf50' 
            : isRejected 
              ? '#e0e0e0' 
              : 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: isAccepted 
            ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)' 
            : isRejected 
              ? '#f8f9fa' 
              : 'background.paper',
          opacity: isRejected ? 0.8 : 1,
          position: 'relative',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isAccepted 
            ? '0 4px 12px rgba(76, 175, 80, 0.15), 0 2px 4px rgba(76, 175, 80, 0.1)' 
            : isRejected 
              ? '0 2px 4px rgba(0, 0, 0, 0.05)' 
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            transform: isAccepted || isRejected ? 'none' : 'translateY(-2px)',
            boxShadow: isAccepted 
              ? '0 6px 16px rgba(76, 175, 80, 0.2), 0 4px 8px rgba(76, 175, 80, 0.15)' 
              : isRejected 
                ? '0 2px 4px rgba(0, 0, 0, 0.05)'
                : '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        {/* Badge d'état - Simple et discret */}
        {(isAccepted || isRejected) && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: isAccepted ? '#4caf50' : '#bdbdbd',
              color: 'white',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isAccepted 
                ? '0 2px 4px rgba(76, 175, 80, 0.3)' 
                : '0 1px 2px rgba(0, 0, 0, 0.1)',
              border: '2px solid white',
              animation: isAccepted ? 'checkmarkPulse 0.6s ease-out' : 'none'
            }}
          >
            {isAccepted ? (
              <CheckIcon sx={{ fontSize: 16 }} />
            ) : (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'white',
                  opacity: 0.8
                }}
              />
            )}
          </Box>
        )}

        <Box sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={suggestion.action}
                size="small"
                color={
                  suggestion.action === 'add' ? 'success' :
                  suggestion.action === 'remove' ? 'error' : 'warning'
                }
                variant="outlined"
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  textDecoration: isRejected ? 'line-through' : 'none',
                  color: isRejected ? 'text.disabled' : 'text.primary'
                }}
              >
                {suggestion.title}
              </Typography>


            </Box>

          </Box>
          

            {suggestion.description}

          {/* Boutons seulement si pas encore traité */}
          {!isAccepted && !isRejected && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                onClick={() => handleRejectSuggestion(messageId, suggestion.id)}
                sx={{ textTransform: 'none' }}
              >
                Refuser
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={() => handleAcceptSuggestion(messageId, suggestion.id)}
                sx={{ textTransform: 'none' }}
              >
                Accepter
              </Button>
            </Box>
          )}

                    {/* Message d'état - Élégant et informatif */}
          {isAccepted && (
            <Box 
              sx={{ 
                p: 1.5, 
                mt: 2, 
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%)',
                border: '1px solid #4caf50',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)',
                  borderRadius: '2px 2px 0 0'
                }
              }}
            >
              <Typography 
                variant="body2" 
                color="#2e7d32"
                sx={{ 
                  fontWeight: 500, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}
              >
                <Box 
                  sx={{ 
                    bgcolor: '#4caf50', 
                    borderRadius: '50%', 
                    width: 20, 
                    height: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  <CheckIcon sx={{ fontSize: 14, color: 'white' }} />
                </Box>
                Suggestion appliquée avec succès au schéma
              </Typography>
            </Box>
          )}
          
          {isRejected && (
            <Box 
              sx={{ 
                p: 1.5, 
                mt: 2, 
                borderRadius: 2,
                bgcolor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                position: 'relative'
              }}
            >
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontWeight: 500, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}
              >
                <Box 
                  sx={{ 
                    bgcolor: '#9e9e9e', 
                    borderRadius: '50%', 
                    width: 20, 
                    height: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >

                </Box>
                Cette suggestion n'a pas été appliquée
              </Typography>
            </Box>
          )}
        </Box>



        {/* CSS Animation pour le badge */}
        <style>
          {`
            @keyframes checkmarkPulse {
              0% {
                transform: scale(0.8);
                opacity: 0.7;
              }
              50% {
                transform: scale(1.1);
                opacity: 1;
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}
        </style>
      </Paper>
    );
  };

  return (
    <Paper 
      sx={{ 
        height: '100vh',
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0
      }}
    >
      {/* Header simplifié style Cursor */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider', 
        flexShrink: 0,
        bgcolor: 'background.default'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              @/chat
            </Typography>
          </Box>
          
          {isGenerating && (
            <IconButton
              size="small"
              color="error"
              onClick={onStopGeneration}
              sx={{ 
                border: '1px solid',
                borderColor: 'error.main',
                '&:hover': { bgcolor: 'error.light' }
              }}
            >
              <StopIcon />
            </IconButton>
          )}
        </Box>
        
        {/* Mode Toggle compact */}
        <ToggleButtonGroup
          value={chatMode}
          exclusive
          onChange={(e, newMode) => newMode && setChatMode(newMode)}
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.5,
              px: 1.5,
              border: 'none',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                }
              }
            }
          }}
          disabled={isGenerating}
        >
          <ToggleButton value="ask">
            <PsychologyIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Ask
          </ToggleButton>
          <ToggleButton value="agent">
            <AutoFixHighIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Agent
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        p: 2,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {messages.length === 0 && !isGenerating ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <SmartToyIcon sx={{ fontSize: 32, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2" color="text.secondary">
              Start a conversation
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Choose "Ask" for questions or "Agent" for modifications
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <Box key={message.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    gap: 1
                  }}
                >
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                      fontSize: '0.75rem'
                    }}
                  >
                    {message.sender === 'user' ? <PersonIcon sx={{ fontSize: 14 }} /> : <SmartToyIcon sx={{ fontSize: 14 }} />}
                  </Avatar>
                  
                  <Box sx={{ flexGrow: 1, maxWidth: '85%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {message.sender === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Chip
                        label={message.mode}
                        size="small"
                        color={message.mode === 'ask' ? 'info' : 'warning'}
                        variant="outlined"
                        sx={{ height: 16, fontSize: '0.625rem' }}
                      />
                      <Typography variant="caption" color="text.disabled">
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: message.sender === 'user' ? 'primary.light' : 'background.paper',
                        color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                        border: message.sender === 'ai' ? '1px solid' : 'none',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                    </Paper>

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {message.suggestions.map(suggestion => 
                          renderSuggestion(suggestion, message.id)
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
            
            {isGenerating && (
              <TypingAnimation mode={chatMode} context={context} />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input simplifié style Cursor */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider', 
        flexShrink: 0,
        bgcolor: 'background.default'
      }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder={
            isGenerating
                              ? "Generating..."
              : chatMode === 'ask' 
                                  ? '@/chat Ask your question...'
                                  : '@/chat Tell me what to modify...'
          }
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isGenerating}
          variant="outlined"
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {isGenerating ? (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={onStopGeneration}
                  >
                    <StopIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    size="small"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    color="primary"
                  >
                    <SendIcon />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            }
          }}
        />
      </Box>
    </Paper>
  );
};

export default ChatPanel;
export type { ChatMessage, BaseSuggestion }; 