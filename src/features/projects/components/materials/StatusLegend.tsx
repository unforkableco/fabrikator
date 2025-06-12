import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  SmartToy as SmartToyIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';

const StatusLegend: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            bgcolor: 'info.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SmartToyIcon sx={{ fontSize: 12 }} />
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          AI Suggested
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            bgcolor: 'success.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 12 }} />
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          User Validated
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            bgcolor: 'warning.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <PersonAddIcon sx={{ fontSize: 12 }} />
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
          User Added
        </Typography>
      </Box>
    </Box>
  );
};

export default StatusLegend; 