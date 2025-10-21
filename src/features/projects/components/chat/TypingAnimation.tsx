import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { SmartToy as SmartToyIcon, Cable as CableIcon, Memory as MemoryIcon, ViewInAr as ViewInArIcon } from '@mui/icons-material';

interface TypingAnimationProps {
  mode: 'ask' | 'agent';
  context?: 'materials' | 'wiring' | 'general' | '3d';
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ mode, context = 'general' }) => {
  const getAnimationContent = () => {
    if (context === 'wiring') {
      return {
        icon: <CableIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
        text: 'Generating wiring in progress...',
        subtext: 'Analyzing optimal connections'
      };
    } else if (context === 'materials') {
      return {
        icon: <MemoryIcon sx={{ fontSize: 16, color: 'secondary.main' }} />,
        text: 'Analyzing materials...',
        subtext: 'Searching for components'
      };
    } else if (context === '3d') {
      return {
        icon: <ViewInArIcon sx={{ fontSize: 16, color: 'success.main' }} />,
        text: 'Designing 3D components...',
        subtext: 'Creating custom parts for your project'
      };
    } else {
      return {
        icon: <SmartToyIcon sx={{ fontSize: 16, color: 'info.main' }} />,
        text: mode === 'ask' ? 'Réflexion en cours...' : 'Génération en cours...',
        subtext: 'Traitement de votre demande'
      };
    }
  };

  const { icon, text, subtext } = getAnimationContent();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        animation: 'pulse 2s infinite'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <CircularProgress size={12} thickness={4} />
      </Box>
      
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {text}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtext}
        </Typography>
      </Box>
      
      {/* Dots animation */}
      <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: `bounce 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.16}s`
            }}
          />
        ))}
      </Box>
      
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default TypingAnimation; 