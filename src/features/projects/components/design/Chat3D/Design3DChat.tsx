import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  SmartToy,
  Person,
  Send,
  ViewInAr,
  Build,
  Palette,
  Memory,
  Settings,
  Add
} from '@mui/icons-material';
import { useScene3D } from '../../../hooks/useScene3D';
import { apiCall } from '../../../../../shared/services/api';
import { Message } from '../../../../../shared/types';
import TypingAnimation from '../../chat/TypingAnimation';

interface Design3DChatProps {
  projectId: string;
}

interface Design3DMessage extends Message {
  context: '3d';
  attachments?: {
    sceneState?: any;
    selectedComponents?: string[];
    suggestions?: ComponentSuggestion[];
  };
}

interface ComponentSuggestion {
  id: string;
  type: 'create' | 'modify' | 'generate';
  title: string;
  description: string;
  componentType: 'DESIGN' | 'FUNCTIONAL' | 'ELECTRONIC' | 'MECHANICAL';
  parameters?: any;
  prompt?: string;
}

const getMessageIcon = (sender: string) => {
  return sender === 'user' ? <Person /> : <SmartToy />;
};

const getComponentTypeIcon = (type: string) => {
  switch (type) {
    case 'ELECTRONIC': return <Memory />;
    case 'MECHANICAL': return <Settings />;
    case 'DESIGN': return <Palette />;
    case 'FUNCTIONAL': return <Build />;
    default: return <ViewInAr />;
  }
};

const getComponentTypeColor = (type: string): string => {
  switch (type) {
    case 'ELECTRONIC': return '#4caf50';
    case 'MECHANICAL': return '#9e9e9e';
    case 'DESIGN': return '#e91e63';
    case 'FUNCTIONAL': return '#2196f3';
    default: return '#757575';
  }
};

export const Design3DChat: React.FC<Design3DChatProps> = ({ projectId }) => {
  const [messages, setMessages] = useState<Design3DMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scene3D = useScene3D(projectId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    try {
      const response = await apiCall(`/api/projects/${projectId}/messages?context=3d`, 'GET');
      setMessages(response.data || []);
    } catch (error) {
      console.error('Failed to load 3D chat messages:', error);
    }
  }, [projectId]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Design3DMessage = {
      id: `temp_${Date.now()}`,
      projectId,
      context: '3d',
      content: input.trim(),
      sender: 'user',
      mode: 'ask',
      createdAt: new Date().toISOString(),
      attachments: {
        sceneState: scene3D.sceneGraph,
        selectedComponents: scene3D.selectedNodes
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiCall('/api/chat/3d', 'POST', {
        message: input.trim(),
        projectId,
        context: '3d',
        sceneState: scene3D.sceneGraph,
        selectedComponents: scene3D.selectedNodes
      });

      const aiMessage: Design3DMessage = {
        id: response.data.id || `ai_${Date.now()}`,
        projectId,
        context: '3d',
        content: response.data.content,
        sender: 'ai',
        mode: 'agent',
        createdAt: new Date().toISOString(),
        suggestions: response.data.suggestions,
        attachments: {
          suggestions: response.data.componentSuggestions || []
        }
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Design3DMessage = {
        id: `error_${Date.now()}`,
        projectId,
        context: '3d',
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        mode: 'agent',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionAction = async (suggestion: ComponentSuggestion) => {
    switch (suggestion.type) {
      case 'create':
        // Create new component based on suggestion
        try {
          const response = await apiCall('/api/components3d', 'POST', {
            name: suggestion.title,
            type: suggestion.componentType,
            category: 'ai-suggested',
            metadata: {
              ...suggestion.parameters,
              aiGenerated: true,
              originalPrompt: suggestion.prompt
            },
            isGenerated: true
          });

          const component = response.data;
          
          // Add to scene
          scene3D.addNodeToScene({
            name: component.name,
            type: component.type,
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1]
            },
            componentId: component.id,
            children: [],
            metadata: component.metadata
          });

          // Send confirmation message
          const confirmMessage: Design3DMessage = {
            id: `confirm_${Date.now()}`,
            projectId,
            context: '3d',
            content: `✅ Created and added "${component.name}" to your scene!`,
            sender: 'ai',
            mode: 'agent',
            createdAt: new Date().toISOString()
          };
          setMessages(prev => [...prev, confirmMessage]);
          
        } catch (error) {
          console.error('Failed to create component:', error);
        }
        break;

      case 'generate':
        // TODO: Trigger parametric or AI generation
        console.log('Generate component:', suggestion);
        break;

      case 'modify':
        // TODO: Modify existing component
        console.log('Modify component:', suggestion);
        break;
    }
  };

  useEffect(() => {
    loadMessages();
  }, [projectId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          3D Design Assistant
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Get help with 3D modeling, component suggestions, and scene optimization
        </Typography>
        
        {/* Scene Info */}
        {scene3D.sceneGraph && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              size="small" 
              label={`${scene3D.sceneGraph.children.length} objects`}
              icon={<ViewInAr />}
            />
            {scene3D.selectedNodes.length > 0 && (
              <Chip 
                size="small" 
                label={`${scene3D.selectedNodes.length} selected`}
                color="primary"
              />
            )}
          </Box>
        )}
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Ready to help with your 3D design!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask me to create components, suggest improvements, or help with modeling
            </Typography>
            
            {/* Quick suggestions */}
            <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                'Create a chassis for Arduino Uno',
                'Add LED mounting holes',
                'Generate a decorative cover',
                'Optimize for 3D printing'
              ].map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  variant="outlined"
                  size="small"
                  onClick={() => setInput(suggestion)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {messages.map((message, index) => (
              <ListItem key={message.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main'
                    }}
                  >
                    {getMessageIcon(message.sender)}
                  </Avatar>
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    
                    {/* Component Suggestions */}
                    {message.attachments?.suggestions && message.attachments.suggestions.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Suggested Actions:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {message.attachments.suggestions.map((suggestion, idx) => (
                            <Card key={idx} sx={{ maxWidth: 400 }}>
                              <CardContent sx={{ pb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  {getComponentTypeIcon(suggestion.componentType)}
                                  <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                                    {suggestion.title}
                                  </Typography>
                                  <Chip
                                    label={suggestion.componentType.toLowerCase()}
                                    size="small"
                                    sx={{
                                      bgcolor: getComponentTypeColor(suggestion.componentType),
                                      color: 'white',
                                      fontSize: '0.65rem'
                                    }}
                                  />
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {suggestion.description}
                                </Typography>
                              </CardContent>
                              <CardActions sx={{ pt: 0 }}>
                                <Button
                                  size="small"
                                  startIcon={<Add />}
                                  onClick={() => handleSuggestionAction(suggestion)}
                                  variant="contained"
                                >
                                  {suggestion.type === 'create' ? 'Create' : 
                                   suggestion.type === 'generate' ? 'Generate' : 'Modify'}
                                </Button>
                              </CardActions>
                            </Card>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                {index < messages.length - 1 && <Divider sx={{ width: '100%', mt: 2 }} />}
              </ListItem>
            ))}
            
            {/* Loading animation */}
            {isLoading && (
              <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                <TypingAnimation mode="agent" context="3d" />
              </ListItem>
            )}
          </List>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask me about 3D design, components, or modeling..."
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            size="small"
          />
          <IconButton 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            color="primary"
          >
            <Send />
          </IconButton>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Box>
    </Box>
  );
};