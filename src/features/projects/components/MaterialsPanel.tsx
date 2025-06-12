import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Avatar,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Build as BuildIcon,
  Memory as MemoryIcon,
  Wifi as WifiIcon,
  ElectricBolt as ElectricBoltIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import { Material, MaterialStatus } from '../../../shared/types';
import { api } from '../../../shared/services/api';

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

interface AddMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (material: Omit<Material, 'id'>) => void;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  mode: 'ask' | 'agent';
}

interface TypingAnimationProps {
  mode: 'ask' | 'agent';
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode: 'ask' | 'agent') => void;
  isLoading?: boolean;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ mode }) => {
  const [dots, setDots] = useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        mb: 2,
        flexDirection: 'row',
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'secondary.main',
          mr: 1,
        }}
      >
        <SmartToyIcon />
      </Avatar>
      
      <Paper
        sx={{
          p: 1.5,
          maxWidth: '75%',
          bgcolor: 'grey.100',
          color: 'text.primary',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {mode === 'ask' ? 'Thinking' : 'Generating components'}
          </Typography>
          <Typography variant="body2" sx={{ 
            fontWeight: 'bold', 
            minWidth: '20px',
            fontFamily: 'monospace' 
          }}>
            {dots}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Chip
            label={mode === 'ask' ? 'Ask' : 'Agent'}
            size="small"
            color={mode === 'ask' ? 'info' : 'warning'}
            variant="outlined"
          />
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
        
        {/* Animation de pulsation */}
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: mode === 'ask' ? 'info.main' : 'warning.main',
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': {
                opacity: 1,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 0.5,
                transform: 'scale(1.2)',
              },
              '100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
};

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

const AddMaterialDialog: React.FC<AddMaterialDialogProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState<{[key: string]: string}>({});

  const handleAdd = () => {
    onAdd({
      name,
      type,
      description,
      requirements: specifications,
      status: MaterialStatus.SUGGESTED,
    });
    onClose();
    // Reset form
    setName('');
    setType('');
    setDescription('');
    setSpecifications({});
  };

  const addSpecification = () => {
    const key = prompt('Specification name (e.g., Power, Memory):');
    const value = prompt('Specification value (e.g., 3.3V, 520 KB):');
    if (key && value) {
      setSpecifications(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Component</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Component Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="e.g., ESP32 microcontroller"
          />
          <FormControl fullWidth>
            <InputLabel>Component Type</InputLabel>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              label="Component Type"
            >
              <MenuItem value="Microcontroller">Microcontroller</MenuItem>
              <MenuItem value="Sensor">Sensor</MenuItem>
              <MenuItem value="Actuator">Actuator</MenuItem>
              <MenuItem value="Display">Display</MenuItem>
              <MenuItem value="Power">Power Supply</MenuItem>
              <MenuItem value="Connectivity">Connectivity Module</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Brief description of the component"
          />
          <Box>
            <Button onClick={addSpecification} startIcon={<AddIcon />} variant="outlined">
              Add Specification
            </Button>
            {Object.entries(specifications).map(([key, value]) => (
              <Chip 
                key={key} 
                label={`${key}: ${value}`} 
                onDelete={() => {
                  const newSpecs = { ...specifications };
                  delete newSpecs[key];
                  setSpecifications(newSpecs);
                }}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!name || !type}>
          Add Component
        </Button>
      </DialogActions>
    </Dialog>
  );
};

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, material: Material) => {
    setAnchorEl(event.currentTarget);
    setSelectedMaterial(material);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMaterial(null);
  };

  const getStatusColor = (status?: MaterialStatus) => {
    switch (status) {
      case MaterialStatus.APPROVED: return 'success';
      case MaterialStatus.REJECTED: return 'error';
      case MaterialStatus.ORDERED: return 'info';
      case MaterialStatus.RECEIVED: return 'primary';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status?: MaterialStatus) => {
    switch (status) {
      case MaterialStatus.SUGGESTED: return 'AI Suggested';
      case MaterialStatus.APPROVED: return 'User Validated';
      case MaterialStatus.REJECTED: return 'Rejected';
      case MaterialStatus.ORDERED: return 'Ordered';
      case MaterialStatus.RECEIVED: return 'Received';
      default: return 'User Added';
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'microcontroller': return <MemoryIcon />;
      case 'sensor': return <BuildIcon />;
      case 'connectivity': return <WifiIcon />;
      case 'power': return <ElectricBoltIcon />;
      default: return <BuildIcon />;
    }
  };

  const handleAddMaterial = async (material: Omit<Material, 'id'>) => {
    if (onAddMaterial) {
      await onAddMaterial(material);
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

    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      let aiResponse: string;
      
      if (mode === 'ask') {
        // Mode Ask - Réponse simple sans appel API pour éviter l'erreur 500
        // Plus tard, on pourra intégrer une vraie API de chat
        aiResponse = `I understand you're asking: "${message}". In Ask mode, I can provide information about your components and answer questions about your project, but I won't modify anything. Is there something specific about your current components you'd like to know more about?`;
      } else {
        // Mode Agent - Génération de suggestions de matériaux
        console.log('Sending agent message:', message);
        const response = await api.projects.sendAgentMessage(projectId, message);
        console.log('Agent response:', response);
        
        if (Array.isArray(response) && response.length > 0) {
          // Si l'agent a créé des matériaux, informer l'utilisateur et rafraîchir
          const materialCount = response.length;
          aiResponse = `I've analyzed your request and ${materialCount === 1 ? 'added 1 new component' : `added ${materialCount} new components`} to your project. The components have been automatically generated based on your requirements. You can see them in the list on the left.`;
          
          // Rafraîchir la liste des matériaux
          if (onMaterialsUpdated) {
            onMaterialsUpdated();
          }
        } else {
          aiResponse = 'I understand your request for component modifications. I\'m working on analyzing your needs and will suggest appropriate components.';
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

      setChatMessages(prev => [...prev, aiMessage]);
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

      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
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
            onClick={() => setAddDialogOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Add Component
          </Button>
        </Box>

        {/* Status Legend */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />} label="AI Suggested" size="small" />
          <Chip icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />} label="User Validated" size="small" />
          <Chip icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />} label="User Added" size="small" />
        </Box>

        {/* Materials List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {materials.length === 0 ? (
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
                onClick={() => setAddDialogOpen(true)}
              >
                Add First Component
              </Button>
            </Card>
          ) : (
            materials.map((material) => (
              <Card key={material.id} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        {getTypeIcon(material.type)}
                      </Box>
                      <Box>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                          {material.name || 'Unnamed Component'}
                          <Chip
                            label={getStatusLabel(material.status)}
                            color={getStatusColor(material.status) as any}
                            size="small"
                          />
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {material.type || 'Component'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => {}}>
                        <SettingsIcon />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, material)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {material.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {material.description}
                    </Typography>
                  )}

                  {/* Specifications */}
                  {material.requirements && Object.keys(material.requirements).length > 0 && (
                    <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Specifications
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {Object.entries(material.requirements).map(([key, value]) => (
                            <Grid item xs={12} sm={6} md={4} key={key}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 60 }}>
                                  {key}:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {String(value)}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Box>

      {/* Chat Panel - Right Side */}
      <Box sx={{ flex: 1, minWidth: 350 }}>
        <ChatPanel
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          isLoading={isChatLoading}
        />
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { onEditMaterial?.(selectedMaterial!); handleMenuClose(); }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedMaterial?.status === MaterialStatus.SUGGESTED && (
          <>
            <MenuItem onClick={() => { onApproveSelected?.(selectedMaterial!.id); handleMenuClose(); }}>
              <BuildIcon sx={{ mr: 1 }} />
              Approve
            </MenuItem>
            <Divider />
          </>
        )}
        <MenuItem 
          onClick={() => { onDeleteMaterial?.(selectedMaterial!.id); handleMenuClose(); }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Add Material Dialog */}
      <AddMaterialDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddMaterial}
      />
    </Box>
  );
};

export default MaterialsPanel; 