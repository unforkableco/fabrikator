import React, { useState } from 'react';
import { Box, Paper, Typography, Chip, Avatar } from '@mui/material';
import { SmartToy as SmartToyIcon } from '@mui/icons-material';

interface TypingAnimationProps {
  mode: 'ask' | 'agent';
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ mode }) => {
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
        mb: 2,
        flexDirection: 'row',
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'secondary.main',
          mr: 1,
        }}
      >
        <SmartToyIcon />
      </Avatar>
      
      <Paper
        sx={{
          p: 1.5,
          maxWidth: '75%',
          bgcolor: 'grey.100',
          color: 'text.primary',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {mode === 'ask' ? 'Thinking' : 'Generating components'}
          </Typography>
          <Typography variant="body2" sx={{ 
            fontWeight: 'bold', 
            minWidth: '20px',
            fontFamily: 'monospace' 
          }}>
            {dots}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Chip
            label={mode === 'ask' ? 'Ask' : 'Agent'}
            size="small"
            color={mode === 'ask' ? 'info' : 'warning'}
            variant="outlined"
          />
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
        
        {/* Animation de pulsation */}
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: mode === 'ask' ? 'info.main' : 'warning.main',
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': {
                opacity: 1,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 0.5,
                transform: 'scale(1.2)',
              },
              '100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default TypingAnimation; 