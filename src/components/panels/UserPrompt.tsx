import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Project } from '../../types';
import { api } from '../../config/api';

interface UserPromptProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const UserPrompt: React.FC<UserPromptProps> = ({ project, onUpdateProject }) => {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!userInput.trim()) return;

    setIsProcessing(true);
    try {
      const { message, changes, project: updatedProject } = await api.projects.processPrompt(
        project.id,
        userInput
      );

      onUpdateProject(updatedProject);
      setUserInput('');
    } catch (error) {
      console.error('Error processing user input:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Project Assistant
      </Typography>

      {project.conversations.length > 0 && (
        <List sx={{ mb: 2, maxHeight: 300, overflow: 'auto' }}>
          {project.conversations[project.conversations.length - 1].messages.map((message) => (
            <ListItem key={message.id}>
              <ListItemText
                primary={message.role === 'assistant' ? 'Assistant' : 'You'}
                secondary={message.content}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: 'bold',
                    color: message.role === 'assistant' ? 'primary.main' : 'text.primary',
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Ask for help"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          multiline
          rows={4}
          placeholder="Describe what you need help with..."
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isProcessing || !userInput.trim()}
          fullWidth
        >
          {isProcessing ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </Box>
    </Paper>
  );
};

export default UserPrompt; 