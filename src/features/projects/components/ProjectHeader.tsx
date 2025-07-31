import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Box,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Notifications as NotificationIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import * as FaIcons from 'react-icons/fa6';
import { Project, ProjectStatus } from '../../../shared/types';
import { api } from '../../../shared/services/api';

interface ProjectHeaderProps {
  project: Project;
  onProjectUpdate?: (updatedProject: Project) => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onProjectUpdate }) => {
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Create wrapper components for icons
  const XTwitterIcon = () => React.createElement(FaIcons.FaXTwitter as any, { style: { color: '#000000', fontSize: '20px' } });
  const FacebookIcon = () => React.createElement(FaIcons.FaFacebook as any, { style: { color: '#1877F2', fontSize: '20px' } });
  const LinkedInIcon = () => React.createElement(FaIcons.FaLinkedin as any, { style: { color: '#0A66C2', fontSize: '20px' } });

  const getStatusColor = (status: string) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return '#2196f3';
      case ProjectStatus.DESIGN:
        return '#ff9800';
      case ProjectStatus.PROTOTYPE:
        return '#9c27b0';
      case ProjectStatus.TESTING:
        return '#f44336';
      case ProjectStatus.PRODUCTION:
        return '#4caf50';
      case ProjectStatus.COMPLETED:
        return '#607d8b';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.toUpperCase().replace('_', ' ');
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 10;
      case ProjectStatus.DESIGN:
        return 25;
      case ProjectStatus.PROTOTYPE:
        return 50;
      case ProjectStatus.TESTING:
        return 75;
      case ProjectStatus.PRODUCTION:
        return 90;
      case ProjectStatus.COMPLETED:
        return 100;
      default:
        return 0;
    }
  };

  const handleEditClick = () => {
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    setIsUpdating(true);
    try {
      const updatedProject = await api.projects.update(project.id, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      onProjectUpdate?.(updatedProject);
      setEditDialogOpen(false);
      setSnackbarMessage('Project updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to update project:', error);
      setSnackbarMessage('Error updating project');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setEditName(project.name);
    setEditDescription(project.description || '');
  };

  const handleShareClick = (event: React.MouseEvent<HTMLElement>) => {
    setShareMenuAnchor(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareMenuAnchor(null);
  };

  const getProjectUrl = () => {
    return `${window.location.origin}/project/${project.id}`;
  };

  const getShareText = () => {
    return `Check out my DIY project "${project.name}" on Forge! ${project.description ? project.description.substring(0, 100) + '...' : ''}`;
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(getProjectUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    handleShareClose();
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(getProjectUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    handleShareClose();
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(getProjectUrl());
    const title = encodeURIComponent(project.name);
    const summary = encodeURIComponent(project.description || '');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank');
    handleShareClose();
  };



  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getProjectUrl());
      setSnackbarMessage('Link copied to clipboard!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error copying link:', error);
      setSnackbarMessage('Error copying link');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    handleShareClose();
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <IconButton 
            edge="start" 
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              {project.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={getStatusLabel(project.status)}
                sx={{
                  bgcolor: getStatusColor(project.status),
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                }}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress: {getProgressValue(project.status)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={getProgressValue(project.status)}
                  sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleEditClick} title="Edit project">
              <EditIcon />
            </IconButton>
            <IconButton onClick={handleShareClick} title="Share project">
              <ShareIcon />
            </IconButton>
            <IconButton title="Notifications (coming soon)">
              <NotificationIcon />
            </IconButton>
            <IconButton title="Settings (coming soon)">
              <SettingsIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Project edit dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            margin="normal"
            multiline
            rows={4}
            placeholder="Describe your project in detail..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel} disabled={isUpdating}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            disabled={isUpdating || !editName.trim()}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de partage */}
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={handleShareClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleTwitterShare}>
          <ListItemIcon>
            <XTwitterIcon />
          </ListItemIcon>
          <ListItemText>Share on X (Twitter)</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleFacebookShare}>
          <ListItemIcon>
            <FacebookIcon />
          </ListItemIcon>
          <ListItemText>Share on Facebook</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLinkedInShare}>
          <ListItemIcon>
            <LinkedInIcon />
          </ListItemIcon>
          <ListItemText>Share on LinkedIn</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleCopyLink}>
          <ListItemIcon>
            <CopyIcon />
          </ListItemIcon>
          <ListItemText>Copy link</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}; 