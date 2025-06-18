import React from 'react';
import {
  Box,
  Typography,
  Card,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Collapse,
  IconButton
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BuildIcon from '@mui/icons-material/Build';
import { WiringValidationResult } from '../../../../shared/types';

interface WiringValidationPanelProps {
  validationResults: WiringValidationResult;
  onFixError: (errorId: string) => void;
}



const WiringValidationPanel: React.FC<WiringValidationPanelProps> = ({
  validationResults,
  onFixError
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const { isValid, errors, warnings } = validationResults;

  // Removed unused getSeverityColor function

  const getSeverityIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? <ErrorIcon color="error" /> : <WarningIcon color="warning" />;
  };

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'voltage_mismatch': return 'Tension incompatible';
      case 'current_overload': return 'Surcharge de courant';
      case 'invalid_connection': return 'Connexion invalide';
      case 'missing_connection': return 'Connexion manquante';
      default: return 'Erreur inconnue';
    }
  };

  const getWarningTypeLabel = (type: string) => {
    switch (type) {
      case 'optimization': return 'Optimisation possible';
      case 'best_practice': return 'Bonne pratique';
      case 'redundancy': return 'Redondance détectée';
      default: return 'Avertissement';
    }
  };

    if (errors.length === 0 && warnings.length === 0) {
    return (
      <Card sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon />
          <Typography variant="subtitle2">
            ✅ Schéma de câblage validé avec succès
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          Aucune erreur ou avertissement détecté.
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isValid ? (
            <CheckCircleIcon color="success" />
          ) : (
            <ErrorIcon color="error" />
          )}
          <Typography variant="h6">
            Validation du Schéma
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {errors.length > 0 && (
            <Chip
              label={`${errors.length} erreur${errors.length > 1 ? 's' : ''}`}
              color="error"
              size="small"
            />
          )}
          {warnings.length > 0 && (
            <Chip
              label={`${warnings.length} avertissement${warnings.length > 1 ? 's' : ''}`}
              color="warning"
              size="small"
            />
          )}
          
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        {/* Errors */}
        {errors.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="error" gutterBottom>
              🚫 Erreurs à corriger
            </Typography>
            <List dense>
              {errors.map((error) => (
                <ListItem key={error.id} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getSeverityIcon(error.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getErrorTypeLabel(error.type)}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                        <Typography variant="body2">
                          {error.message}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      error.connectionId && (
                        <Typography variant="caption" color="text.secondary">
                          Connexion ID: {error.connectionId}
                        </Typography>
                      )
                    }
                  />
                  <Button
                    size="small"
                    startIcon={<BuildIcon />}
                    onClick={() => onFixError(error.id)}
                    variant="outlined"
                    color="error"
                  >
                    Corriger
                  </Button>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="warning.main" gutterBottom>
              ⚠️ Avertissements
            </Typography>
            <List dense>
              {warnings.map((warning, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getWarningTypeLabel(warning.type)}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                        <Typography variant="body2">
                          {warning.message}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      warning.suggestion && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          💡 Suggestion: {warning.suggestion}
                        </Typography>
                      )
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Summary */}
        <Alert 
          severity={isValid ? 'success' : 'error'} 
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle2">
            {isValid 
              ? '✅ Le schéma de câblage est fonctionnellement correct'
              : '❌ Le schéma de câblage contient des erreurs qui doivent être corrigées'
            }
          </Typography>
          {!isValid && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Corrigez les erreurs ci-dessus avant de continuer avec ce schéma de câblage.
            </Typography>
          )}
        </Alert>
      </Collapse>
    </Card>
  );
};

export default WiringValidationPanel; 