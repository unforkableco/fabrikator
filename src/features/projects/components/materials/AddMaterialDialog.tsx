import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Button,
  Box,
  MenuItem,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Material, MaterialStatus } from '../../../../shared/types';

interface AddMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (material: Omit<Material, 'id'>) => void;
}

const AddMaterialDialog: React.FC<AddMaterialDialogProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState<{[key: string]: string}>({});

  const handleAdd = () => {
    onAdd({
      name,
      type,
      description,
      requirements: specifications,
      status: MaterialStatus.SUGGESTED,
    });
    onClose();
    // Reset form
    setName('');
    setType('');
    setDescription('');
    setSpecifications({});
  };

  const addSpecification = () => {
    const key = prompt('Specification name (e.g., Power, Memory):');
    const value = prompt('Specification value (e.g., 3.3V, 520 KB):');
    if (key && value) {
      setSpecifications(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Component</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Component Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="e.g., ESP32 microcontroller"
          />
          <FormControl fullWidth>
            <InputLabel>Component Type</InputLabel>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              label="Component Type"
            >
              <MenuItem value="Microcontroller">Microcontroller</MenuItem>
              <MenuItem value="Sensor">Sensor</MenuItem>
              <MenuItem value="Actuator">Actuator</MenuItem>
              <MenuItem value="Display">Display</MenuItem>
              <MenuItem value="Power">Power Supply</MenuItem>
              <MenuItem value="Connectivity">Connectivity Module</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Brief description of the component"
          />
          <Box>
            <Button onClick={addSpecification} startIcon={<AddIcon />} variant="outlined">
              Add Specification
            </Button>
            {Object.entries(specifications).map(([key, value]) => (
              <Chip 
                key={key} 
                label={`${key}: ${value}`} 
                onDelete={() => {
                  const newSpecs = { ...specifications };
                  delete newSpecs[key];
                  setSpecifications(newSpecs);
                }}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!name || !type}>
          Add Component
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMaterialDialog; 