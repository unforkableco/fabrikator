import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { api } from '../shared/services/api';
import { ProjectStatus } from '../shared/types';
import { TabPanel } from '../shared/components/ui/TabPanel';

const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  
  // Manual creation form
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  
  // AI prompt creation
  const [prompt, setPrompt] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const project = await api.projects.create({
        name: projectName.trim(),
        description: description.trim(),
        status: ProjectStatus.PLANNING,
      });

      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please describe what you want to build');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const project = await api.projects.createFromPrompt(prompt.trim());
      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Project
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="project creation tabs">
            <Tab label="Manual Creation" />
            <Tab label="AI Assistant" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0} id="new-project">
          <form onSubmit={handleManualSubmit}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                sx={{ mb: 2 }}
                placeholder="Enter a name for your project"
              />
              <TextField
                fullWidth
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={4}
                placeholder="Describe your project in detail. What is its purpose? What functionality do you need?"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading || !projectName.trim()}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Create Project'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={1} id="new-project">
          <form onSubmit={handlePromptSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tell me what you want to build
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Describe your project idea and I'll help you get started with the right structure and components.
              </Typography>
              <TextField
                fullWidth
                label="Project Description"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                multiline
                rows={6}
                placeholder="I want to build an automated watering system for my garden. It will be solar powered and connected to a water pipe always turned on. It will measure the soil humidity and trigger water flow for a configurable amount of minutes before turning the water off, then waiting some time and measuring humidity again. It must be able to operate at night too..."
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading || !prompt.trim()}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Create with AI'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default NewProjectPage; 