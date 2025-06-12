import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Notifications as NotificationIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Project, ProjectStatus } from '../../../shared/types';

interface ProjectHeaderProps {
  project: Project;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return '#9C27B0';
      case ProjectStatus.DESIGN:
        return '#FF9800';
      case ProjectStatus.PROTOTYPE:
        return '#2196F3';
      case ProjectStatus.TESTING:
        return '#2196F3';
      case ProjectStatus.PRODUCTION:
        return '#4CAF50';
      case ProjectStatus.COMPLETED:
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'PLANNING';
      case ProjectStatus.DESIGN:
      case ProjectStatus.PROTOTYPE:
      case ProjectStatus.TESTING:
      case ProjectStatus.PRODUCTION:
        return 'IN PROGRESS';
      case ProjectStatus.COMPLETED:
        return 'COMPLETED';
      default:
        return String(status).toUpperCase();
    }
  };

  const getProgressValue = (status: ProjectStatus) => {
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

  return (
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
          <IconButton>
            <EditIcon />
          </IconButton>
          <IconButton>
            <ShareIcon />
          </IconButton>
          <IconButton>
            <NotificationIcon />
          </IconButton>
          <IconButton>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 