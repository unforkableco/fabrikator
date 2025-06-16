import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CableIcon from '@mui/icons-material/Cable';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { WiringConnection, WiringComponent } from '../../../../shared/types';

interface ConnectionsListProps {
  connections: WiringConnection[];
  components: WiringComponent[];
  selectedConnection: string | null;
  onConnectionSelect: (connectionId: string) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<WiringConnection>) => void;
  onConnectionDelete: (connectionId: string) => void;
}

const ConnectionsList: React.FC<ConnectionsListProps> = ({
  connections,
  components,
  selectedConnection,
  onConnectionSelect,
  onConnectionUpdate,
  onConnectionDelete
}) => {
  const getComponentName = (componentId: string): string => {
    console.log('Looking for component:', componentId, 'in components:', components);
    const component = components.find(c => c.id === componentId);
    console.log('Found component:', component);
    return component?.name || 'Unknown Component';
  };

  const getPinName = (componentId: string, pinId: string): string => {
    const component = components.find(c => c.id === componentId);
    const pin = component?.pins.find(p => p.id === pinId);
    console.log('Looking for pin:', pinId, 'in component:', component, 'found pin:', pin);
    return pin?.name || 'Unknown Pin';
  };

  const getWireTypeColor = (wireType: WiringConnection['wireType']): string => {
    switch (wireType) {
      case 'power': return '#f44336';
      case 'ground': return '#424242';
      case 'data': return '#2196f3';
      case 'analog': return '#ff9800';
      case 'digital': return '#4caf50';
      default: return '#666';
    }
  };

  const getWireTypeIcon = (wireType: WiringConnection['wireType']) => {
    return <CableIcon sx={{ color: getWireTypeColor(wireType) }} />;
  };

  const handleWireTypeChange = (connectionId: string, newType: WiringConnection['wireType']) => {
    onConnectionUpdate(connectionId, { 
      wireType: newType,
      wireColor: getWireTypeColor(newType)
    });
  };

  const handleLabelChange = (connectionId: string, newLabel: string) => {
    onConnectionUpdate(connectionId, { label: newLabel });
  };

  if (connections.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <CableIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
        <Typography variant="body2">
          Aucune connexion dans le schéma
        </Typography>
        <Typography variant="caption">
          Cliquez sur les broches des composants pour créer des connexions
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List>
        {connections.map((connection, index) => {
          const isSelected = selectedConnection === connection.id;
          const hasError = Boolean(connection.error);
          const isValidated = connection.validated;
          
          return (
            <React.Fragment key={connection.id}>
              <ListItem
                selected={isSelected}
                onClick={() => onConnectionSelect(connection.id)}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  {getWireTypeIcon(connection.wireType)}
                  {hasError && <ErrorIcon color="error" sx={{ ml: 1 }} />}
                  {isValidated && !hasError && <CheckCircleIcon color="success" sx={{ ml: 1 }} />}
                </Box>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {getComponentName(connection.fromComponent)}.{getPinName(connection.fromComponent, connection.fromPin)}
                        {' → '}
                        {getComponentName(connection.toComponent)}.{getPinName(connection.toComponent, connection.toPin)}
                      </Typography>
                      {connection.label && (
                        <Chip 
                          label={connection.label} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      {hasError && (
                        <Typography variant="caption" color="error" display="block">
                          ⚠️ {connection.error}
                        </Typography>
                      )}
                    </React.Fragment>
                  }
                />
                
                {/* Connection details when selected - moved outside ListItemText */}
                {isSelected && (
                  <Box sx={{ width: '100%', mt: 2, pl: 7 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type de fil</InputLabel>
                        <Select
                          value={connection.wireType}
                          label="Type de fil"
                          onChange={(e) => handleWireTypeChange(
                            connection.id, 
                            e.target.value as WiringConnection['wireType']
                          )}
                        >
                          <MenuItem value="power">Alimentation</MenuItem>
                          <MenuItem value="ground">Masse</MenuItem>
                          <MenuItem value="data">Données</MenuItem>
                          <MenuItem value="analog">Analogique</MenuItem>
                          <MenuItem value="digital">Numérique</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <TextField
                        size="small"
                        label="Étiquette"
                        value={connection.label || ''}
                        onChange={(e) => handleLabelChange(connection.id, e.target.value)}
                        placeholder="Nom de la connexion..."
                        sx={{ minWidth: 160 }}
                      />
                      
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          bgcolor: connection.wireColor || '#000',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          alignSelf: 'center'
                        }}
                        title={`Couleur: ${connection.wireColor}`}
                      />
                    </Box>
                  </Box>
                )}
                
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectionDelete(connection.id);
                    }}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              
              {index < connections.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
      
      {/* Summary */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Résumé des connexions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`Total: ${connections.length}`} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label={`Validées: ${connections.filter(c => c.validated).length}`} 
            size="small" 
            color="success"
            variant="outlined"
          />
          <Chip 
            label={`Erreurs: ${connections.filter(c => c.error).length}`} 
            size="small" 
            color="error"
            variant="outlined"
          />
        </Box>
        
        {/* Wire type breakdown */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Types de connexions:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(
              connections.reduce((acc, conn) => {
                acc[conn.wireType] = (acc[conn.wireType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <Chip
                key={type}
                label={`${type}: ${count}`}
                size="small"
                sx={{ 
                  bgcolor: getWireTypeColor(type as WiringConnection['wireType']),
                  color: 'white',
                  fontSize: '0.7rem'
                }}
              />
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ConnectionsList; 