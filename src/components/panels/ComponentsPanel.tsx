import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Power as PowerIcon, Straighten as SizeIcon, Info as InfoIcon } from '@mui/icons-material';
import { Project, Material, MaterialStatus } from '../../types';
import { api } from '../../config/api';

interface ComponentsPanelProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const ComponentsPanel: React.FC<ComponentsPanelProps> = ({ project, onUpdateProject }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newComponent, setNewComponent] = useState<Partial<Material>>({
    name: '',
    type: '',
    quantity: 1,
    requirements: {},
    description: '',
    status: MaterialStatus.APPROVED,
  });

  const handleAddComponent = async () => {
    if (!newComponent.name || !newComponent.type) return;

    try {
      const updatedProject = await api.projects.addMaterial(project.id, newComponent);
      onUpdateProject(updatedProject);
      setIsAddDialogOpen(false);
      setNewComponent({
        name: '',
        type: '',
        quantity: 1,
        requirements: {},
        description: '',
        status: MaterialStatus.APPROVED,
      });
    } catch (error) {
      console.error('Error adding component:', error);
    }
  };

  const handleRemoveComponent = async (componentId: string) => {
    try {
      const updatedProject = await api.projects.update(project.id, {
        materials: project.materials.filter(m => m.id !== componentId),
      });
      onUpdateProject(updatedProject);
    } catch (error) {
      console.error('Error removing component:', error);
    }
  };

  const getStatusColor = (status: MaterialStatus) => {
    switch (status) {
      case MaterialStatus.SUGGESTED:
        return 'info';
      case MaterialStatus.APPROVED:
        return 'success';
      case MaterialStatus.REJECTED:
        return 'error';
      case MaterialStatus.ORDERED:
        return 'warning';
      case MaterialStatus.RECEIVED:
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Components
      </Typography>
      
      <Grid container spacing={2}>
        {project.materials.map((component) => (
          <Grid item xs={12} md={6} key={component.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="div">
                    {component.name}
                  </Typography>
                  <Box>
                    {component.aiSuggested && (
                      <Chip
                        size="small"
                        label="AI Suggested"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Chip
                      size="small"
                      label={component.status}
                      color={getStatusColor(component.status)}
                    />
                  </Box>
                </Box>
                
                <Typography color="text.secondary" gutterBottom>
                  Type: {component.type}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Grid container spacing={1}>
                  {component.requirements.powerInput && (
                    <Grid item xs={12}>
                      <Box display="flex" alignItems="center">
                        <PowerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          Power: {component.requirements.powerInput}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  
                  {component.requirements.size && (
                    <Grid item xs={12}>
                      <Box display="flex" alignItems="center">
                        <SizeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          Size: {component.requirements.size}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {component.description && (
                    <Grid item xs={12}>
                      <Box display="flex" alignItems="flex-start">
                        <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                        <Typography variant="body2">
                          {component.description}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Quantity: {component.quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveComponent(component.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setIsAddDialogOpen(true)}
        sx={{ mt: 2 }}
      >
        Add Component
      </Button>

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
        <DialogTitle>Add New Component</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Component Name"
            fullWidth
            value={newComponent.name}
            onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Type"
            fullWidth
            value={newComponent.type}
            onChange={(e) => setNewComponent({ ...newComponent, type: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Quantity"
            type="number"
            fullWidth
            value={newComponent.quantity}
            onChange={(e) => setNewComponent({ ...newComponent, quantity: parseInt(e.target.value) || 1 })}
          />
          <TextField
            margin="dense"
            label="Power Input"
            fullWidth
            value={newComponent.requirements?.powerInput || ''}
            onChange={(e) => setNewComponent({
              ...newComponent,
              requirements: { ...newComponent.requirements, powerInput: e.target.value }
            })}
          />
          <TextField
            margin="dense"
            label="Size"
            fullWidth
            value={newComponent.requirements?.size || ''}
            onChange={(e) => setNewComponent({
              ...newComponent,
              requirements: { ...newComponent.requirements, size: e.target.value }
            })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={newComponent.description}
            onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddComponent} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ComponentsPanel; 