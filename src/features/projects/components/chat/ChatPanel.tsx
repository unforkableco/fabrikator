import React, { useState, useRef, useEffect } from 'react';
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
import api from '../../../../shared/services/api';

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
  originalData?: string; // Original suggestion JSON data
  
  // Extensions pour le wiring (optionnelles)
  connectionData?: any; // WiringConnection
  componentData?: any;  // WiringComponent  
  confidence?: number;
  validated?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode: 'ask' | 'agent') => void | Promise<void>;
  onStopGeneration: () => void | Promise<void>;
  onAcceptSuggestion: (messageId: string, suggestionId: string) => void | Promise<void>;
  onRejectSuggestion: (messageId: string, suggestionId: string) => void | Promise<void>;
  onAcceptAllSuggestions?: (messageId: string, suggestionIds: string[]) => void | Promise<void>;
  onRejectAllSuggestions?: (messageId: string, suggestionIds: string[]) => void | Promise<void>;
  isGenerating?: boolean;
  context?: 'materials' | 'wiring' | 'general';
  projectId?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onStopGeneration,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAcceptAllSuggestions,
  onRejectAllSuggestions,
  isGenerating = false,
  context,
  projectId
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<'ask' | 'agent'>('ask');
  const storageKey = `suggestions-${projectId || 'default'}`;
  const [suggestionStates, setSuggestionStates] = useState<{[key: string]: 'accepted' | 'rejected'}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load states from messages (database) on startup
  useEffect(() => {
    try {
      // ✅ SOLUTION: Extraire seulement les états des suggestions qui ont un status explicite
      // Don't mix with new suggestions without status
      const statesFromDB: {[key: string]: 'accepted' | 'rejected'} = {};
      
      messages.forEach(message => {
        if (message.suggestions) {
          message.suggestions.forEach(suggestion => {
            // ✅ Charger seulement les suggestions qui ont un status explicite en BD
            if (suggestion.status && ['accepted', 'rejected'].includes(suggestion.status)) {
              statesFromDB[suggestion.id] = suggestion.status as 'accepted' | 'rejected';
            }
          });
        }
      });
      
      // ✅ Pour les nouvelles suggestions sans status, charger seulement depuis localStorage
      // mais seulement pour les suggestions qui existent dans les messages actuels
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedStates = JSON.parse(saved);
        
        Object.entries(parsedStates).forEach(([suggestionId, state]) => {
          // ✅ Ajouter seulement si:
          // 1. Pas déjà dans la BD avec un status
          // 2. La suggestion existe dans les messages actuels
          // 3. La suggestion n'a pas de status défini (nouvelles suggestions)
          const suggestionExists = messages.some(m => 
            m.suggestions?.some(s => s.id === suggestionId && !s.status)
          );
          
          if (!statesFromDB[suggestionId] && suggestionExists) {
            statesFromDB[suggestionId] = state as 'accepted' | 'rejected';
          }
        });
      }
      
      setSuggestionStates(statesFromDB);
      
      // ✅ Nettoyer localStorage des anciennes suggestions qui ne sont plus pertinentes
      const validStates: {[key: string]: 'accepted' | 'rejected'} = {};
      const currentSuggestionIds = messages.flatMap(m => m.suggestions?.map(s => s.id) || []);
      
      Object.entries(statesFromDB).forEach(([suggestionId, state]) => {
        if (currentSuggestionIds.includes(suggestionId)) {
          validStates[suggestionId] = state;
        }
      });
      
      localStorage.setItem(storageKey, JSON.stringify(validStates));
      
    } catch (error) {
      console.warn('Error loading suggestion states:', error);
      setSuggestionStates({});
    }
  }, [messages, storageKey]);

  // 🧹 Écouter l'événement de nettoyage forcé des suggestions
  useEffect(() => {
    const handleClearSuggestionStates = (event: CustomEvent) => {
      const { projectId: eventProjectId, context: eventContext } = event.detail;
      
      // Nettoyer seulement si c'est le bon projet et contexte
      if (eventProjectId === projectId && eventContext === context) {
        // cleared suggestion states
        
        // ✅ Nettoyage complet et agressif
        setSuggestionStates({}); // Completely clear the state
        localStorage.removeItem(storageKey); // Supprimer le localStorage
        
        // ✅ Aussi nettoyer toutes les variations possibles de clés
        const possibleKeys = [
          `suggestions-${projectId}`,
          `suggestions-${projectId}-${context}`,
          `suggestions-${eventProjectId}`,
          storageKey
        ];
        
        possibleKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // ✅ Forcer le re-render pour éviter la contamination
      }
    };

    window.addEventListener('clearSuggestionStates', handleClearSuggestionStates as EventListener);
    
    return () => {
      window.removeEventListener('clearSuggestionStates', handleClearSuggestionStates as EventListener);
    };
  }, [projectId, context, storageKey]);

  // Nettoyer le localStorage quand on change de projet
  useEffect(() => {
    return () => {
      // Optional: cleanup when component unmounts
      // localStorage.removeItem(storageKey);
    };
  }, [projectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll uniquement pour les nouveaux messages ou pendant la génération
  const prevMsgLenRef = useRef<number>(0);
  useEffect(() => {
    const prevLen = prevMsgLenRef.current;
    if (isGenerating) {
      scrollToBottom();
    } else if (messages.length > prevLen) {
      scrollToBottom();
    }
    prevMsgLenRef.current = messages.length;
  }, [messages.length, isGenerating]);

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

  const handleAcceptSuggestion = async (messageId: string, suggestionId: string) => {
    if (!projectId) return;
    
          try {
        // Update status in database
        await api.projects.updateSuggestionStatus(projectId, messageId, suggestionId, 'accepted');
      
      // Mark suggestion as accepted visually
      const newStates = {
        ...suggestionStates,
        [suggestionId]: 'accepted' as const
      };
      setSuggestionStates(newStates);
      localStorage.setItem(storageKey, JSON.stringify(newStates));
      
      // Appeler la fonction parent
      await Promise.resolve(onAcceptSuggestion(messageId, suggestionId));
    } catch (error) {
      console.error('Error updating suggestion status:', error);
    }
  };

  const handleRejectSuggestion = async (messageId: string, suggestionId: string) => {
    if (!projectId) return;
    
          try {
        // Update status in database
        await api.projects.updateSuggestionStatus(projectId, messageId, suggestionId, 'rejected');
      
      // Mark suggestion as rejected visually
      const newStates = {
        ...suggestionStates,
        [suggestionId]: 'rejected' as const
      };
      setSuggestionStates(newStates);
      localStorage.setItem(storageKey, JSON.stringify(newStates));
      
      // Appeler la fonction parent
      await Promise.resolve(onRejectSuggestion(messageId, suggestionId));
    } catch (error) {
      console.error('Error updating suggestion status:', error);
    }
  };

  const renderSuggestion = (suggestion: BaseSuggestion, messageId: string) => {
    const suggestionState = suggestionStates[suggestion.id];
    const isAccepted = suggestionState === 'accepted';
    const isRejected = suggestionState === 'rejected';
    
    // Debug removed
    
    // DEBUG TEMPORARY - Clean localStorage if necessary
    if (suggestion.id.includes('debug-clear')) {
      localStorage.removeItem(storageKey);
    }
    
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
                Refuse
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={() => handleAcceptSuggestion(messageId, suggestion.id)}
                sx={{ textTransform: 'none' }}
              >
                Accept
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
                Suggestion applied successfully to the schema
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
                This suggestion was not applied
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
          onChange={(e: any, newMode: any) => newMode && setChatMode(newMode)}
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
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Actions groupées si >1 suggestion en attente */}
                        {(() => {
                          const pending = message.suggestions!.filter(s => !suggestionStates[s.id]);
                          if (pending.length > 1) {
                            const handleAcceptAll = async () => {
                              // Toujours persister les statuts en BD
                              for (const s of pending) {
                                try {
                                  await api.projects.updateSuggestionStatus(projectId!, message.id, s.id, 'accepted');
                                } catch (e) {
                                  console.error('Persist accept failed for', s.id, e);
                                }
                              }

                              if (typeof onAcceptAllSuggestions === 'function') {
                                await Promise.resolve(onAcceptAllSuggestions(message.id, pending.map(p => p.id)));
                              } else {
                                // Fallback séquentiel côté UI
                                for (const s of pending) {
                                  if (!suggestionStates[s.id]) {
                                    await handleAcceptSuggestion(message.id, s.id);
                                  }
                                }
                              }

                              // Marquer localement
                              const newStates = { ...suggestionStates } as any;
                              pending.forEach(p => { newStates[p.id] = 'accepted'; });
                              setSuggestionStates(newStates);
                              localStorage.setItem(storageKey, JSON.stringify(newStates));
                            };
                            const handleRejectAll = async () => {
                              // Toujours persister les statuts en BD
                              for (const s of pending) {
                                try {
                                  await api.projects.updateSuggestionStatus(projectId!, message.id, s.id, 'rejected');
                                } catch (e) {
                                  console.error('Persist reject failed for', s.id, e);
                                }
                              }

                              if (typeof onRejectAllSuggestions === 'function') {
                                await Promise.resolve(onRejectAllSuggestions(message.id, pending.map(p => p.id)));
                              } else {
                                for (const s of pending) {
                                  if (!suggestionStates[s.id]) {
                                    await handleRejectSuggestion(message.id, s.id);
                                  }
                                }
                              }

                              const newStates = { ...suggestionStates } as any;
                              pending.forEach(p => { newStates[p.id] = 'rejected'; });
                              setSuggestionStates(newStates);
                              localStorage.setItem(storageKey, JSON.stringify(newStates));
                            };
                            return (
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Button size="small" variant="contained" color="success" onClick={handleAcceptAll}>
                                  Accept all ({pending.length})
                                </Button>
                                <Button size="small" variant="outlined" color="error" onClick={handleRejectAll}>
                                  Reject all ({pending.length})
                                </Button>
                              </Box>
                            );
                          }
                          return null;
                        })()}

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
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