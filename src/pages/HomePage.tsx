import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  InputAdornment,
  Fab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Project } from '../shared/types';
import { api } from '../shared/services/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const projectsData = await api.projects.getAll();
        setProjects(projectsData);
        setFilteredProjects(projectsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    let filtered = projects;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'in-progress') {
        filtered = filtered.filter(project => 
          ['design', 'prototype', 'testing', 'production'].includes(project.status)
        );
      } else {
        filtered = filtered.filter(project => project.status === selectedFilter);
      }
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, selectedFilter]);

  const getStatusColor = (status: string) => {
    if (status === 'planning') return 'info';
    if (['design', 'prototype', 'testing', 'production'].includes(status)) return 'warning';
    if (status === 'completed') return 'success';
    return 'default';
  };

  const getStatusDisplayLabel = (status: string) => {
    if (status === 'planning') return 'Planning';
    if (['design', 'prototype', 'testing', 'production'].includes(status)) return 'In Progress';
    if (status === 'completed') return 'Completed';
    return status;
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent navigation to project
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      setIsDeleting(true);
      await api.projects.delete(projectToDelete.id);
      
      // Update the projects list
      const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
      setProjects(updatedProjects);
      setFilteredProjects(updatedProjects.filter(project => {
        // Reapply existing filters
        let matches = true;
        
        if (searchTerm) {
          matches = matches && (
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            Boolean(project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        if (selectedFilter !== 'all') {
          if (selectedFilter === 'in-progress') {
            matches = matches && ['design', 'prototype', 'testing', 'production'].includes(project.status);
          } else {
            matches = matches && project.status === selectedFilter;
          }
        }
        
        return matches;
      }));
      
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
          My Projects
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage and track all your hardware projects
        </Typography>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '32px' }}>
        <TextField
          fullWidth
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'planning', 'in-progress', 'completed'].map((filter) => (
            <Chip
              key={filter}
              label={filter === 'in-progress' ? 'In Progress' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              onClick={() => handleFilterChange(filter)}
              variant={selectedFilter === filter ? 'filled' : 'outlined'}
              color={selectedFilter === filter ? 'primary' : 'default'}
            />
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <CircularProgress size={60} />
        </div>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.length === 0 ? (
            <Grid item xs={12}>
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchTerm || selectedFilter !== 'all' ? 'No projects match your search' : 'No projects yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm || selectedFilter !== 'all' ? 'Try adjusting your search criteria' : 'Create your first project to get started'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/project/new')}
                >
                  Create Project
                </Button>
              </div>
            </Grid>
          ) : (
            filteredProjects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    }
                  }}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600, flex: 1 }}>
                        {project.name}
                      </Typography>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Chip
                          label={getStatusDisplayLabel(project.status)}
                          color={getStatusColor(project.status) as any}
                          size="small"
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteClick(e, project)}
                          sx={{ 
                            opacity: 0.7,
                            '&:hover': {
                              opacity: 1,
                              backgroundColor: 'error.light',
                              color: 'white',
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </div>
                    
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {project.description || 'No description available'}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button size="small" sx={{ textTransform: 'none' }}>
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add project"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => navigate('/project/new')}
      >
        <AddIcon />
      </Fab>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Project
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the project "{projectToDelete?.name}"?
            This action is irreversible and will permanently delete the project and all its associated materials.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : undefined}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HomePage; 