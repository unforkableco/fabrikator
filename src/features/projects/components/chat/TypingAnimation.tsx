import React, { useState } from 'react';
import { Box, Paper, Typography, Chip, Avatar } from '@mui/material';
import { SmartToy as SmartToyIcon } from '@mui/icons-material';

interface TypingAnimationProps {
  mode: 'ask' | 'agent';
  onStop?: () => void;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ mode, onStop }) => {
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
        gap: 1
      }}
    >
      <Avatar
        sx={{
          width: 24,
          height: 24,
          bgcolor: 'secondary.main',
          fontSize: '0.75rem'
        }}
      >
        <SmartToyIcon sx={{ fontSize: 14 }} />
      </Avatar>
      
      <Box sx={{ flexGrow: 1, maxWidth: '85%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Assistant
          </Typography>
          <Chip
            label={mode}
            size="small"
            color={mode === 'ask' ? 'info' : 'warning'}
            variant="outlined"
            sx={{ height: 16, fontSize: '0.625rem' }}
          />
          <Typography variant="caption" color="text.disabled">
            {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
        
        <Paper
          sx={{
            p: 1.5,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ 
              opacity: 0.8,
              fontStyle: 'italic'
            }}>
              {mode === 'ask' ? 'Réflexion en cours' : 'Génération de composants'}
            </Typography>
            <Typography variant="body2" sx={{ 
              fontWeight: 'bold', 
              minWidth: '20px',
              fontFamily: 'monospace',
              color: 'primary.main'
            }}>
              {dots}
            </Typography>
          </Box>
          
          {/* Point de pulsation minimaliste */}
          <Box
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: mode === 'ask' ? 'info.main' : 'warning.main',
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': {
                  opacity: 1,
                  transform: 'translateY(-50%) scale(1)',
                },
                '50%': {
                  opacity: 0.5,
                  transform: 'translateY(-50%) scale(1.2)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(-50%) scale(1)',
                },
              },
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default TypingAnimation; 