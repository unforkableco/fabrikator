import React from 'react';
import { Card, Typography, Divider, Box } from '@mui/material';
import { WiringConnection, WiringComponent } from '../../../../shared/types';
import ConnectionsList from './ConnectionsList';

interface ConnectionManagerProps {
  connections: WiringConnection[];
  components: WiringComponent[];
  selectedConnection: string | null;
  onConnectionSelect: (connectionId: string | null) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<WiringConnection>) => void;
  onConnectionDelete: (connectionId: string) => void;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connections,
  components,
  selectedConnection,
  onConnectionSelect,
  onConnectionUpdate,
  onConnectionDelete
}) => {
  return (
    <Card sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: 400, // Hauteur minimale garantie
      maxHeight: 600, // Hauteur maximale augmentée
      flex: 1, // Prend tout l'espace disponible
      overflow: 'hidden' // Évite les débordements
    }}>
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
        Connections List ({connections.length})
      </Typography>
      <Divider sx={{ mb: 2, flexShrink: 0 }} />
      <Box sx={{ 
        flex: 1, 
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ConnectionsList
          connections={connections}
          components={components}
          selectedConnection={selectedConnection}
          onConnectionSelect={onConnectionSelect}
          onConnectionUpdate={onConnectionUpdate}
          onConnectionDelete={onConnectionDelete}
        />
      </Box>
    </Card>
  );
};

export default ConnectionManager; 