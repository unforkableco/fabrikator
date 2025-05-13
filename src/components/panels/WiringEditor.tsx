import React from 'react';
import { Paper, Typography } from '@mui/material';
import { Project } from '../../types';

interface WiringEditorProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const WiringEditor: React.FC<WiringEditorProps> = ({ project, onUpdateProject }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Wiring Editor
      </Typography>
      <Typography>
        Wiring editor coming soon...
      </Typography>
    </Paper>
  );
};

export default WiringEditor; 