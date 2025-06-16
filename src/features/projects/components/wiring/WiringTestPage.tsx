import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import WiringPanel from './WiringPanel';

const WiringTestPage: React.FC = () => {
  const mockMaterials = [
    { id: '1', name: 'Arduino Uno', type: 'microcontroller', quantity: 1 },
    { id: '2', name: 'Capteur de température', type: 'sensor', quantity: 2 },
    { id: '3', name: 'Écran LCD', type: 'display', quantity: 1 },
    { id: '4', name: 'Batterie Li-ion', type: 'battery', quantity: 1 }
  ];

  const handleWiringUpdated = () => {
    console.log('✅ Wiring diagram updated successfully!');
  };

  return (
    <Box sx={{ height: '100vh', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Test du Circuit Optimal
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Instructions de test :</strong><br/>
          1. Cliquez sur "Circuit Optimal" pour générer des suggestions<br/>
          2. Vous devriez voir "Génération du câblage en cours..." avec animation<br/>
          3. Puis 5 suggestions de connexions apparaîtront<br/>
          4. Cliquez sur "Accepter" sur une suggestion<br/>
          5. La connexion devrait apparaître dans le schéma et la liste des connexions<br/>
          6. Ouvrez la console (F12) pour voir les logs de débogage
        </Typography>
      </Alert>
      
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <WiringPanel
          projectId="demo-project"
          materials={mockMaterials}
          onWiringUpdated={handleWiringUpdated}
        />
      </Box>
    </Box>
  );
};

export default WiringTestPage; 