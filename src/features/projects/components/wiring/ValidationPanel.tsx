import React from 'react';
import { Card, Typography, Box, Alert, Chip, IconButton } from '@mui/material';
import { Close as CloseIcon, Warning as WarningIcon, Error as ErrorIcon } from '@mui/icons-material';

interface ValidationError {
  id: string;
  type: 'invalid_connection' | 'save_error' | 'missing_component';
  message: string;
  connectionId?: string;
  severity: 'error' | 'warning';
}

interface ValidationResults {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface ValidationPanelProps {
  validationResults: ValidationResults;
  onFixError?: (errorId: string) => void;
  onClose?: () => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationResults,
  onFixError,
  onClose
}) => {
  const { errors, warnings } = validationResults;
  const totalIssues = errors.length + warnings.length;

  if (totalIssues === 0) {
    return (
      <Card sx={{ p: 2, mb: 2, bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" color="success.dark" sx={{ fontWeight: 600 }}>
              ✅ Validation Passed
            </Typography>
            <Chip label="No Issues" color="success" size="small" />
          </Box>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        <Typography variant="body2" color="success.dark" sx={{ mt: 1 }}>
          Your wiring diagram is valid and ready to use.
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Validation Results
          </Typography>
          <Chip 
            label={`${totalIssues} Issue${totalIssues > 1 ? 's' : ''}`} 
            color={errors.length > 0 ? 'error' : 'warning'}
            size="small"
          />
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Errors */}
      {errors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="error" sx={{ mb: 1, fontWeight: 600 }}>
            <ErrorIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
            Errors ({errors.length})
          </Typography>
          {errors.map((error) => (
            <Alert 
              key={error.id} 
              severity="error" 
              sx={{ mb: 1 }}
              action={
                onFixError && (
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={() => onFixError(error.id)}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                )
              }
            >
              <Typography variant="body2">
                {error.message}
              </Typography>
              {error.connectionId && (
                <Typography variant="caption" color="text.secondary">
                  Connection ID: {error.connectionId}
                </Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 600 }}>
            <WarningIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
            Warnings ({warnings.length})
          </Typography>
          {warnings.map((warning) => (
            <Alert 
              key={warning.id} 
              severity="warning" 
              sx={{ mb: 1 }}
              action={
                onFixError && (
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={() => onFixError(warning.id)}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                )
              }
            >
              <Typography variant="body2">
                {warning.message}
              </Typography>
              {warning.connectionId && (
                <Typography variant="caption" color="text.secondary">
                  Connection ID: {warning.connectionId}
                </Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}
    </Card>
  );
};

export default ValidationPanel; 