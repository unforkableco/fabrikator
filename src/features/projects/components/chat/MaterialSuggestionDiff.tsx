import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Material } from '../../../../shared/types';

interface MaterialSuggestion {
  action: 'keep' | 'update' | 'new' | 'remove';
  type: string;
  details: any;
  currentMaterial?: Material; // Matériau existant pour les updates/removes
}

interface MaterialSuggestionDiffProps {
  suggestions: MaterialSuggestion[];
  onAccept: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

const MaterialSuggestionDiff: React.FC<MaterialSuggestionDiffProps> = ({
  suggestions,
  onAccept,
  onReject,
  isProcessing = false,
}) => {
  const newMaterials = suggestions.filter(s => s.action === 'new');
  const updatedMaterials = suggestions.filter(s => s.action === 'update');
  const removedMaterials = suggestions.filter(s => s.action === 'remove');
  const keptMaterials = suggestions.filter(s => s.action === 'keep');

  const renderMaterialItem = (suggestion: MaterialSuggestion, color: string, icon: React.ReactNode) => (
    <ListItem
      key={`${suggestion.action}-${suggestion.type}`}
      sx={{
        bgcolor: `${color}.50`,
        border: `1px solid ${color}.200`,
        borderRadius: 1,
        mb: 1,
      }}
    >
      <ListItemIcon sx={{ color: `${color}.600` }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {suggestion.type}
            </Typography>
            <Chip
              label={suggestion.action}
              size="small"
              color={
                suggestion.action === 'new' ? 'success' :
                suggestion.action === 'remove' ? 'error' :
                suggestion.action === 'update' ? 'warning' : 'default'
              }
              variant="outlined"
            />
          </Box>
        }
        secondary={
          <React.Fragment>
            {suggestion.details?.notes && (
              <Typography variant="caption" color="text.secondary" component="span">
                {suggestion.details.notes}
              </Typography>
            )}
            {suggestion.details?.quantity && (
              <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                Quantité: {suggestion.details.quantity}
              </Typography>
            )}
            {suggestion.action === 'update' && suggestion.currentMaterial && (
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                Ancien: {suggestion.currentMaterial.name || suggestion.currentMaterial.type}
              </Typography>
            )}
          </React.Fragment>
        }
      />
    </ListItem>
  );

  return (
    <Paper
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        maxWidth: '100%',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Suggestions de Matériaux
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CloseIcon />}
            onClick={onReject}
            disabled={isProcessing}
            sx={{ textTransform: 'none' }}
          >
            Rejeter
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<CheckIcon />}
            onClick={onAccept}
            disabled={isProcessing}
            sx={{ textTransform: 'none' }}
          >
            Accepter
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        {newMaterials.length > 0 && (
          <>
            <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 600 }}>
              + Nouveaux composants ({newMaterials.length})
            </Typography>
            <List dense sx={{ mb: 2 }}>
              {newMaterials.map(suggestion => 
                renderMaterialItem(suggestion, 'success', <AddIcon />)
              )}
            </List>
          </>
        )}

        {updatedMaterials.length > 0 && (
          <>
            <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 600 }}>
              ~ Composants modifiés ({updatedMaterials.length})
            </Typography>
            <List dense sx={{ mb: 2 }}>
              {updatedMaterials.map(suggestion => 
                renderMaterialItem(suggestion, 'warning', <EditIcon />)
              )}
            </List>
          </>
        )}

        {removedMaterials.length > 0 && (
          <>
            <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, fontWeight: 600 }}>
              - Composants supprimés ({removedMaterials.length})
            </Typography>
            <List dense sx={{ mb: 2 }}>
              {removedMaterials.map(suggestion => 
                renderMaterialItem(suggestion, 'error', <RemoveIcon />)
              )}
            </List>
          </>
        )}

        {keptMaterials.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              {keptMaterials.length} composant(s) inchangé(s)
            </Typography>
          </>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        Résumé: {newMaterials.length} ajout(s), {updatedMaterials.length} modification(s), {removedMaterials.length} suppression(s)
      </Typography>
    </Paper>
  );
};

export default MaterialSuggestionDiff; 