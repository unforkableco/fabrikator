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
} from '@mui/material';
import { ProjectRequirements } from '../types';
import { api } from '../config/api';

const NewProject: React.FC = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Test');
  const [description, setDescription] = useState('I want to build an automated watering system for my garden. It will be solar powered and connected to a water pipe always turned on. It will measure the soil humidity and trigger watter flow for a configurable amount of minutes before turning the water off, then waiting some time and measuring humidity again. It must be able to operate at night too');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const project = await api.projects.create({
        name: projectName,
        description,
      });

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
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="What do you want to build?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              multiline
              rows={4}
              placeholder="Describe your project in detail. What is its purpose? What functionality do you need?"
            />
          </Box>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{ mr: 2 }}
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
        </form>
      </Paper>
    </Container>
  );
};

export default NewProject; 