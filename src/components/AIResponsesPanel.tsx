import React, { useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip, Checkbox, ListItemIcon, Card, CardContent, Grid, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Message } from '../types';

interface AIResponsesPanelProps {
  messages: Message[];
  materials: any[];
  onUpdateMaterials: (materials: any[]) => void;
}

export const AIResponsesPanel: React.FC<AIResponsesPanelProps> = ({ messages, materials, onUpdateMaterials }) => {
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const initialResponse = messages.find(m => m.role === 'assistant' && m.content.includes('Initial project analysis'));
  const otherMessages = messages.filter(m => m !== initialResponse);

  const parseAnalysis = (content: string) => {
    const sections = {
      summary: '',
      technicalRequirements: [] as string[],
      challenges: [] as string[],
      recommendations: [] as string[]
    };

    // Extract summary
    const summaryMatch = content.match(/Project Analysis Summary:([\s\S]*?)(?=Technical Requirements:|$)/);
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim();
    }

    // Extract technical requirements
    const requirementsMatch = content.match(/Technical Requirements:([\s\S]*?)(?=Potential Challenges:|$)/);
    if (requirementsMatch) {
      sections.technicalRequirements = requirementsMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim());
    }

    // Extract challenges
    const challengesMatch = content.match(/Potential Challenges:([\s\S]*?)(?=Recommendations:|$)/);
    if (challengesMatch) {
      sections.challenges = challengesMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim());
    }

    // Extract recommendations
    const recommendationsMatch = content.match(/Recommendations:([\s\S]*?)(?=Required Components:|$)/);
    if (recommendationsMatch) {
      sections.recommendations = recommendationsMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim());
    }

    return sections;
  };

  const formatResponse = (content: string) => {
    try {
      const analysis = parseAnalysis(content);
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>Project Summary</Typography>
                <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>{analysis.summary}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" color="primary" gutterBottom>Technical Requirements</Typography>
                <List dense>
                  {analysis.technicalRequirements.map((req, index) => (
                    <ListItem key={index} sx={{ py: 1 }}>
                      <ListItemIcon>
                        <Checkbox edge="start" />
                      </ListItemIcon>
                      <ListItemText primary={req} primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ height: '100%', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>Challenges</Typography>
                <List dense>
                  {analysis.challenges.map((challenge, index) => (
                    <ListItem key={index} sx={{ py: 1 }}>
                      <ListItemIcon>
                        <Checkbox edge="start" sx={{ color: 'warning.contrastText' }} />
                      </ListItemIcon>
                      <ListItemText primary={challenge} primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ height: '100%', bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>Recommendations</Typography>
                <List dense>
                  {analysis.recommendations.map((rec, index) => (
                    <ListItem key={index} sx={{ py: 1 }}>
                      <ListItemIcon>
                        <Checkbox edge="start" sx={{ color: 'success.contrastText' }} />
                      </ListItemIcon>
                      <ListItemText primary={rec} primaryTypographyProps={{ sx: { fontSize: '1.1rem' } }} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    } catch (error) {
      return content;
    }
  };

  const handleSubmitPrompt = async () => {
    try {
      // Prepare the context with previous messages and current materials
      const context = {
        messages: messages,
        currentMaterials: materials
      };

      // Send to backend
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: additionalPrompt,
          context: context
        }),
      });

      const data = await response.json();
      setSuggestions(data.suggestions);
      setShowSuggestions(true);
      setAdditionalPrompt('');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  const handleAcceptSuggestion = (suggestion: any) => {
    const updatedMaterials = materials.map(material => {
      if (material.type === suggestion.type) {
        return {
          ...material,
          ...suggestion.newDetails,
          status: 'approved'
        };
      }
      return material;
    });

    // Add new materials if they don't exist
    const newMaterials = suggestions
      .filter(s => !materials.some(m => m.type === s.type))
      .map(s => ({
        ...s,
        status: 'suggestion'
      }));

    onUpdateMaterials([...updatedMaterials, ...newMaterials]);
    setShowSuggestions(false);
  };

  const handleRejectSuggestion = (suggestion: any) => {
    const updatedMaterials = materials.map(material => {
      if (material.type === suggestion.type) {
        return {
          ...material,
          status: 'rejected'
        };
      }
      return material;
    });
    onUpdateMaterials(updatedMaterials);
    setShowSuggestions(false);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ p: 3, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        AI Analysis
      </Typography>
      
      {initialResponse && (
        <Box sx={{ p: 3, overflow: 'auto' }}>
          {formatResponse(initialResponse.content)}
        </Box>
      )}

      <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          label="Ask AI for suggestions"
          value={additionalPrompt}
          onChange={(e) => setAdditionalPrompt(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button 
          variant="contained" 
          onClick={handleSubmitPrompt}
          disabled={!additionalPrompt.trim()}
        >
          Get Suggestions
        </Button>
      </Box>

      <Dialog 
        open={showSuggestions} 
        onClose={() => setShowSuggestions(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI Suggestions</DialogTitle>
        <DialogContent>
          <List>
            {suggestions.map((suggestion, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={suggestion.type}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        Current: {JSON.stringify(suggestion.details)}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        Suggested: {JSON.stringify(suggestion.newDetails)}
                      </Typography>
                    </Box>
                  }
                />
                <Box>
                  <Button 
                    color="success" 
                    onClick={() => handleAcceptSuggestion(suggestion)}
                  >
                    Accept
                  </Button>
                  <Button 
                    color="error" 
                    onClick={() => handleRejectSuggestion(suggestion)}
                  >
                    Reject
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuggestions(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <List sx={{ flex: 1, overflow: 'auto' }}>
        {otherMessages.map((message, index) => (
          <React.Fragment key={message.id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={message.role === 'assistant' ? 'AI' : 'User'} 
                      size="small"
                      color={message.role === 'assistant' ? 'primary' : 'secondary'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(message.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 2 }}>
                    {message.role === 'assistant' ? formatResponse(message.content) : message.content}
                  </Box>
                }
              />
            </ListItem>
            {index < otherMessages.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}; 