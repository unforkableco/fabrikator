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
  Collapse,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
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
  suggestions?: MaterialSuggestion[];
}

interface MaterialSuggestion {
  id: string;
  title: string;
  description: string;
  code?: string;
  action: 'add' | 'modify' | 'remove';
  expanded: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode: 'ask' | 'agent') => void;
  onStopGeneration: () => void;
  onAcceptSuggestion: (messageId: string, suggestionId: string) => void;
  onRejectSuggestion: (messageId: string, suggestionId: string) => void;
  isGenerating?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onStopGeneration,
  onAcceptSuggestion,
  onRejectSuggestion,
  isGenerating = false 
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<'ask' | 'agent'>('ask');
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const toggleSuggestionExpansion = (suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const renderSuggestion = (suggestion: MaterialSuggestion, messageId: string) => {
    const isExpanded = expandedSuggestions.has(suggestion.id);
    
    return (
      <Paper
        key={suggestion.id}
        sx={{
          mb: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
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
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {suggestion.title}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => toggleSuggestionExpansion(suggestion.id)}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {suggestion.description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<CloseIcon />}
              onClick={() => onRejectSuggestion(messageId, suggestion.id)}
              sx={{ textTransform: 'none' }}
            >
              Refuser
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => onAcceptSuggestion(messageId, suggestion.id)}
              sx={{ textTransform: 'none' }}
            >
              Accepter
            </Button>
          </Box>
        </Box>

        <Collapse in={isExpanded}>
          <Divider />
          <Box sx={{ p: 1.5, bgcolor: 'grey.50' }}>
            {suggestion.code && (
              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  borderRadius: 1,
                  overflow: 'auto'
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {suggestion.code}
                </pre>
              </Paper>
            )}
          </Box>
        </Collapse>
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
              Commencez une conversation
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Choisissez "Ask" pour des questions ou "Agent" pour des modifications
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
                        {message.sender === 'user' ? 'Vous' : 'Assistant'}
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
              <TypingAnimation mode={chatMode} />
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
export type { ChatMessage, MaterialSuggestion }; 