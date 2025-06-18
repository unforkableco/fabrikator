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

  const getErrorTypeLabel = (type: string): string => {
    switch (type) {
      case 'invalid_connection': return 'Invalid connection';
      case 'missing_connection': return 'Missing connection';
      case 'voltage_mismatch': return 'Voltage mismatch';
      case 'pin_conflict': return 'Pin conflict';
      case 'component_error': return 'Component error';
      default: return type;
    }
  };

  const getWarningTypeLabel = (type: string) => {
    switch (type) {
      case 'optimization': return 'Optimization possible';
      case 'best_practice': return 'Best practice';
      case 'redundancy': return 'Redundancy detected';
      default: return 'Warning';
    }
  };

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <Card sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon />
          <Typography variant="subtitle2">
            ✅ Wiring schema validated successfully
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          No errors or warnings detected.
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
          <Typography variant="h6" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 'bold'
          }}>
            <ErrorIcon color="error" />
            Schema Validation
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {errors.length > 0 && (
            <Chip
              label={`${errors.length} error${errors.length > 1 ? 's' : ''}`}
              color="error"
              size="small"
            />
          )}
          {warnings.length > 0 && (
            <Chip
              label={`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
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
              🚫 Errors to correct
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
                          Connection ID: {error.connectionId}
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
                    Correct
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
              ⚠️ Warnings
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
          severity={isValid ? "success" : "error"}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2">
            {isValid 
              ? '✅ The wiring schema is functionally correct'
              : '❌ The wiring schema contains errors that must be corrected'
            }
          </Typography>
        </Alert>
        
        {!isValid && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Fix the errors above before continuing with this wiring schema.
          </Typography>
        )}
      </Collapse>
    </Card>
  );
};

export default WiringValidationPanel; 