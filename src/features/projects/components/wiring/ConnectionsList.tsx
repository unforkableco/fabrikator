import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

interface Connection {
  id: string;
  from: string;
  fromPin: string;
  to: string;
  toPin: string;
  wire: string;
  voltage: string;
  description?: string;
  validation?: {
    isValid: boolean;
    warnings: string[];
  };
}

interface ConnectionsListProps {
  connections: Connection[];
  components: any[];
  onUpdate: (wiringData: any) => void;
  onValidate: (wiringData: any) => Promise<any>;
}

const ConnectionsList: React.FC<ConnectionsListProps> = ({
  connections,
  components,
  onUpdate,
  onValidate
}) => {
  const [editDialog, setEditDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [isNewConnection, setIsNewConnection] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Ouvrir le dialog d'édition
  const handleEdit = (connection: Connection) => {
    setEditingConnection(connection);
    setIsNewConnection(false);
    setEditDialog(true);
  };

  // Ouvrir le dialog pour nouvelle connexion
  const handleAdd = () => {
    setEditingConnection({
      id: `conn_${Date.now()}`,
      from: '',
      fromPin: '',
      to: '',
      toPin: '',
      wire: 'red',
      voltage: '5V',
      description: ''
    });
    setIsNewConnection(true);
    setEditDialog(true);
  };

  // Supprimer une connexion
  const handleDelete = (connectionId: string) => {
    const updatedConnections = connections.filter(conn => conn.id !== connectionId);
    onUpdate({
      connections: updatedConnections,
      diagram: { components: [], wires: [] }
    });
  };

  // Sauvegarder une connexion
  const handleSave = () => {
    if (!editingConnection) return;

    let updatedConnections;
    if (isNewConnection) {
      updatedConnections = [...connections, editingConnection];
    } else {
      updatedConnections = connections.map(conn => 
        conn.id === editingConnection.id ? editingConnection : conn
      );
    }

    onUpdate({
      connections: updatedConnections,
      diagram: { components: [], wires: [] }
    });

    setEditDialog(false);
    setEditingConnection(null);
  };

  // Valider toutes les connexions
  const handleValidateAll = async () => {
    try {
      const result = await onValidate({
        connections,
        diagram: { components: [], wires: [] }
      });
      setValidationResults(result);
    } catch (error) {
      console.error('Erreur de validation:', error);
    }
  };

  // Obtenir la couleur du statut de validation
  const getValidationColor = (connection: Connection) => {
    if (connection.validation?.isValid === false) return 'error';
    if (connection.validation?.warnings && connection.validation.warnings.length > 0) return 'warning';
    return 'success';
  };

  // Obtenir l'icône de validation
  const getValidationIcon = (connection: Connection) => {
    if (connection.validation?.isValid === false) return <ErrorIcon />;
    if (connection.validation?.warnings && connection.validation.warnings.length > 0) return <WarningIcon />;
    return <ValidIcon />;
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Connexions ({connections.length})
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={handleValidateAll}
            sx={{ mr: 1 }}
          >
            Valider tout
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Ajouter
          </Button>
        </Box>
      </Box>

      {/* Résultats de validation globale */}
      {validationResults && (
        <Alert 
          severity={validationResults.isValid ? 'success' : validationResults.errors?.length > 0 ? 'error' : 'warning'}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">{validationResults.summary}</Typography>
          {validationResults.errors?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="error">Erreurs:</Typography>
              <ul>
                {validationResults.errors.map((error: string, index: number) => (
                  <li key={index}><Typography variant="body2">{error}</Typography></li>
                ))}
              </ul>
            </Box>
          )}
          {validationResults.warnings?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="warning.main">Avertissements:</Typography>
              <ul>
                {validationResults.warnings.map((warning: string, index: number) => (
                  <li key={index}><Typography variant="body2">{warning}</Typography></li>
                ))}
              </ul>
            </Box>
          )}
        </Alert>
      )}

      {/* Table des connexions */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Statut</TableCell>
              <TableCell>De</TableCell>
              <TableCell>Pin Source</TableCell>
              <TableCell>Vers</TableCell>
              <TableCell>Pin Destination</TableCell>
              <TableCell>Câble</TableCell>
              <TableCell>Tension</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucune connexion définie
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              connections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell>
                    <Tooltip title={connection.validation?.warnings?.join(', ') || 'Connexion valide'}>
                      <Chip
                        icon={getValidationIcon(connection)}
                        label={connection.validation?.isValid !== false ? 'OK' : 'Erreur'}
                        color={getValidationColor(connection)}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {components.find(c => c.id === connection.from)?.currentVersion?.specs?.name || connection.from}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={connection.fromPin} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {components.find(c => c.id === connection.to)?.currentVersion?.specs?.name || connection.to}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={connection.toPin} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 3,
                          backgroundColor: connection.wire,
                          borderRadius: 1
                        }}
                      />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {connection.wire}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{connection.voltage}</Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(connection)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(connection.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog d'édition */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isNewConnection ? 'Nouvelle Connexion' : 'Modifier la Connexion'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Composant source */}
            <FormControl fullWidth>
              <InputLabel>Composant source</InputLabel>
              <Select
                value={editingConnection?.from || ''}
                onChange={(e) => setEditingConnection(prev => prev ? { ...prev, from: e.target.value } : null)}
              >
                {components.map(comp => {
                  const specs = comp.currentVersion?.specs || {};
                  return (
                    <MenuItem key={comp.id} value={comp.id}>
                      {specs.name || specs.type || 'Composant'}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Pin source */}
            <TextField
              fullWidth
              label="Pin source"
              value={editingConnection?.fromPin || ''}
              onChange={(e) => setEditingConnection(prev => prev ? { ...prev, fromPin: e.target.value } : null)}
            />

            {/* Composant destination */}
            <FormControl fullWidth>
              <InputLabel>Composant destination</InputLabel>
              <Select
                value={editingConnection?.to || ''}
                onChange={(e) => setEditingConnection(prev => prev ? { ...prev, to: e.target.value } : null)}
              >
                {components.map(comp => {
                  const specs = comp.currentVersion?.specs || {};
                  return (
                    <MenuItem key={comp.id} value={comp.id}>
                      {specs.name || specs.type || 'Composant'}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Pin destination */}
            <TextField
              fullWidth
              label="Pin destination"
              value={editingConnection?.toPin || ''}
              onChange={(e) => setEditingConnection(prev => prev ? { ...prev, toPin: e.target.value } : null)}
            />

            {/* Couleur du câble */}
            <FormControl fullWidth>
              <InputLabel>Couleur du câble</InputLabel>
              <Select
                value={editingConnection?.wire || 'red'}
                onChange={(e) => setEditingConnection(prev => prev ? { ...prev, wire: e.target.value } : null)}
              >
                <MenuItem value="red">Rouge (5V)</MenuItem>
                <MenuItem value="black">Noir (GND)</MenuItem>
                <MenuItem value="blue">Bleu (Signal)</MenuItem>
                <MenuItem value="yellow">Jaune (Data)</MenuItem>
                <MenuItem value="green">Vert (Analog)</MenuItem>
                <MenuItem value="white">Blanc (Signal)</MenuItem>
              </Select>
            </FormControl>

            {/* Tension */}
            <TextField
              fullWidth
              label="Tension"
              value={editingConnection?.voltage || '5V'}
              onChange={(e) => setEditingConnection(prev => prev ? { ...prev, voltage: e.target.value } : null)}
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description (optionnel)"
              multiline
              rows={2}
              value={editingConnection?.description || ''}
              onChange={(e) => setEditingConnection(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">
            {isNewConnection ? 'Créer' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConnectionsList; 