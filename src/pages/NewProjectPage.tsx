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
  Alert,
} from '@mui/material';
import { api } from '../shared/services/api';

const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  
  // AI prompt creation
  const [prompt, setPrompt] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please describe what you want to build');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus('Analyzing project with AI...');

    try {
      const project = await api.projects.createFromPrompt(prompt.trim());
      
      // Automatically generate an initial materials list based on the original prompt
      setLoadingStatus('Generating materials list...');
      try {
        await api.projects.generateMaterialSuggestions(project.id, prompt.trim());
      } catch (materialError) {
        console.warn('Failed to generate initial materials:', materialError);
        // Continue even if material generation fails
      }

      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Project
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Describe your project idea and our AI will help you get started with the right structure and components.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handlePromptSubmit}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tell me what you want to build
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Describe your project idea in detail. What is its purpose? What functionality do you need?
            </Typography>
            <TextField
              fullWidth
              label="Project Description"
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
              required
              multiline
              rows={6}
              placeholder="I want to build an automated watering system for my garden. It will be solar powered and connected to a water pipe always turned on. It will measure the soil humidity and trigger water flow for a configurable amount of minutes before turning the water off, then waiting some time and measuring humidity again. It must be able to operate at night too..."
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || !prompt.trim()}
              size="large"
            >
              {isLoading ? <CircularProgress size={24} /> : 'Create with AI'}
            </Button>
            {isLoading && loadingStatus && (
              <Typography variant="body2" color="text.secondary">
                {loadingStatus}
              </Typography>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default NewProjectPage; 