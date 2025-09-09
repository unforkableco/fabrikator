import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Material } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';

interface EditMaterialDialogProps {
  open: boolean;
  material: Material | null;
  onClose: () => void;
  onSave: (materialId: string, updatedMaterial: Partial<Material>) => void;
  onRefetch?: () => void;
}

const EditMaterialDialog: React.FC<EditMaterialDialogProps> = ({
  open,
  material,
  onClose,
  onSave,
  onRefetch,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState<{[key: string]: string}>({});
  const [editingSpec, setEditingSpec] = useState<{key: string; value: string} | null>(null);
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  // Impact analysis state
  const [isAnalyzingImpact, setIsAnalyzingImpact] = useState(false);
  const [impactResult, setImpactResult] = useState<any | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Initialiser les valeurs quand le material change
  useEffect(() => {
    if (material) {
      setName(material.name || '');
      setType(material.type || '');
      setDescription(material.description || '');
      // Convertir toutes les valeurs en string pour la cohérence
      const specs = material.requirements || {};
      const stringSpecs: {[key: string]: string} = {};
      Object.entries(specs).forEach(([key, value]) => {
        stringSpecs[key] = String(value);
      });
      setSpecifications(stringSpecs);
    } else {
      // Reset form
      setName('');
      setType('');
      setDescription('');
      setSpecifications({});
    }
    setEditingSpec(null);
    setNewSpecKey('');
    setNewSpecValue('');
    // Reset impact UI when reopening
    setImpactResult(null);
    setApplyError(null);
    setApplySuccess(null);
  }, [material]);

  const buildUpdatedMaterial = (): Partial<Material> => ({
    name: name.trim(),
    type: type.trim(),
    description: description.trim(),
    requirements: specifications,
  });

  const handleSave = () => {
    if (!material) return;

    const updatedMaterial = buildUpdatedMaterial();
    onSave(material.id, updatedMaterial);
    onClose();
    // (Retiré) Pas de onRefetch ici pour éviter double refresh; le panel gère l'optimisme + refresh
  };

  const handleSaveWithImpact = async () => {
    if (!material) return;
    setIsAnalyzingImpact(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const updatedMaterial = buildUpdatedMaterial();
      const result = await api.projects.updateMaterialAndReviewImpact(material.id, updatedMaterial);
      setImpactResult(result?.impactSuggestions || null);
      // Trigger a refetch so the list reflects the new spec immediately
      onRefetch?.();
    } catch (err) {
      setImpactResult({
        explanation: { summary: "Impossible d'analyser l'impact pour le moment." },
        components: []
      });
    } finally {
      setIsAnalyzingImpact(false);
    }
  };

  const handleApplyImpact = async () => {
    if (!material || !material.projectId || !impactResult || !Array.isArray(impactResult.components)) return;
    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      for (const comp of impactResult.components) {
        const action = comp.details?.action || 'update';
        const normalizedSpecs = comp.details?.specs || comp.details?.technicalSpecs || {};
        const suggestion = {
          action,
          type: comp.type,
          details: {
            quantity: comp.details?.quantity ?? 1,
            notes: comp.details?.notes || '',
            technicalSpecs: undefined,
            specs: normalizedSpecs,
            productReference: comp.details?.productReference || null,
          }
        };
        await api.projects.addMaterialFromSuggestion(material.projectId, suggestion);
      }
      setApplySuccess('Modifications liées appliquées.');
      onRefetch?.();
    } catch (err: any) {
      setApplyError("Échec lors de l'application automatique des modifications.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleAddSpecification = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setSpecifications(prev => ({
        ...prev,
        [newSpecKey.trim()]: newSpecValue.trim()
      }));
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const handleEditSpecification = (key: string, value: string) => {
    setEditingSpec({ key, value });
  };

  const handleSaveEditedSpec = () => {
    if (!editingSpec) return;

    const newSpecs = { ...specifications };
    // simple replacement by key
    newSpecs[editingSpec.key] = editingSpec.value;
    setSpecifications(newSpecs);
    setEditingSpec(null);
  };

  const handleDeleteSpecification = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    setSpecifications(newSpecs);
  };

  const materialTypes = [
    'Microcontroller',
    'Sensor',
    'Actuator',
    'Display',
    'Power Supply',
    'Connectivity Module',
    'Memory',
    'Processing Unit',
    'Interface',
    'Other'
  ];

  const renderImpact = () => {
    if (!impactResult) return null;
    const components = Array.isArray(impactResult.components) ? impactResult.components : [];
    return (
      <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom color="primary">
          Impact détecté
        </Typography>
        {impactResult.explanation?.summary && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {impactResult.explanation.summary}
          </Alert>
        )}
        {components.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun impact détecté.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {components.map((c: any, idx: number) => (
              <Box key={idx} sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">{c.type}</Typography>
                  <Chip label={String(c.details?.action || 'update')} size="small" color={c.details?.action === 'remove' ? 'error' : c.details?.action === 'new' ? 'success' : 'warning'} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {c.details?.notes || 'Mise à jour nécessaire suite au changement.'}
                </Typography>
                {'quantity' in (c.details || {}) && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Quantité: {String(c.details?.quantity)}
                  </Typography>
                )}
              </Box>
            ))}
            {applyError && <Alert severity="error">{applyError}</Alert>}
            {applySuccess && <Alert severity="success">{applySuccess}</Alert>}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button variant="contained" onClick={handleApplyImpact} disabled={isApplying}>
                {isApplying ? 'Application…' : 'Appliquer automatiquement'}
              </Button>
              <Button variant="text" onClick={onClose}>Fermer</Button>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" />
          Edit Material
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Material Name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  fullWidth
                  placeholder="e.g., ESP32 microcontroller"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    label="Type"
                  >
                    {materialTypes.map((materialType) => (
                      <MenuItem key={materialType} value={materialType}>
                        {materialType}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Brief description of the material"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Specifications */}
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Specifications
            </Typography>
            
            {/* Add New Specification */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Add New Specification
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Property"
                    value={newSpecKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSpecKey(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g., Power, Memory"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Value"
                    value={newSpecValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSpecValue(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g., 3.3V, 520 KB"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    onClick={handleAddSpecification}
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={!newSpecKey.trim() || !newSpecValue.trim()}
                    fullWidth
                    size="small"
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Existing Specifications */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(specifications).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  {editingSpec && editingSpec.key === key ? (
                    // Edit mode
                    <>
                      <TextField
                        value={editingSpec.key}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSpec({ ...editingSpec, key: e.target.value })}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        value={editingSpec.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSpec({ ...editingSpec, value: e.target.value })}
                        size="small"
                        sx={{ flex: 2 }}
                      />
                      <Button
                        onClick={handleSaveEditedSpec}
                        variant="contained"
                        size="small"
                        color="success"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingSpec(null)}
                        variant="outlined"
                        size="small"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    // Display mode
                    <>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {key}:
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 2 }}>
                        <Typography variant="body2">
                          {String(value)}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => handleEditSpecification(key, String(value))}
                        size="small"
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteSpecification(key)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              ))}
              
              {Object.keys(specifications).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No specifications yet. Add some above.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Impact analysis results */}
          {renderImpact()}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="outlined"
          disabled={!name.trim() || !type.trim()}
        >
          Save Changes
        </Button>
        <Button
          onClick={handleSaveWithImpact}
          variant="contained"
          disabled={!name.trim() || !type.trim() || isAnalyzingImpact}
        >
          {isAnalyzingImpact ? 'Analyse…' : 'Save + Impact'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMaterialDialog; 