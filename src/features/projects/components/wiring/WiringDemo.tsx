import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import WiringPanel from './WiringPanel';

// Données de test pour la démonstration
const mockMaterials = [
  {
    id: 'mat1',
    name: 'Arduino Uno',
    type: 'microcontroller',
    quantity: 1
  },
  {
    id: 'mat2', 
    name: 'Capteur de température',
    type: 'sensor',
    quantity: 2
  },
  {
    id: 'mat3',
    name: 'Écran LCD 16x2',
    type: 'display',
    quantity: 1
  },
  {
    id: 'mat4',
    name: 'Batterie 9V',
    type: 'battery',
    quantity: 1
  },
  {
    id: 'mat5',
    name: 'LED',
    type: 'actuator',
    quantity: 5
  }
];

const mockWiringDiagram = {
  id: 'demo-diagram',
  components: [],
  connections: [],
  metadata: {
    title: 'Diagramme de démonstration',
    description: 'Test des nouvelles fonctionnalités de câblage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  }
};

const WiringDemo: React.FC = () => {
  return (
    <Box sx={{ height: '100vh', p: 2 }}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light' }}>
        <Typography variant="h5" gutterBottom>
          🔧 Démonstration des nouvelles fonctionnalités de câblage
        </Typography>
        <Typography variant="body2">
          <strong>Fonctionnalités testées :</strong>
        </Typography>
        <ul>
          <li>📊 Gestion des quantités de matériaux (drag & drop limité)</li>
          <li>🗑️ Suppression de composants (clic droit ou bouton X)</li>
          <li>🔌 Connexions manuelles ajoutées automatiquement à la liste</li>
          <li>🤖 Bouton "Circuit Optimal" pour suggestions automatiques</li>
          <li>💬 Chat agent intégré avec API de wiring</li>
        </ul>
      </Paper>
      
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <WiringPanel
          wiringDiagram={mockWiringDiagram}
          isLoading={false}
          projectId="demo-project"
          materials={mockMaterials}
          onWiringUpdated={() => console.log('Wiring updated in demo')}
        />
      </Box>
    </Box>
  );
};

export default WiringDemo; 