import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab
} from '@mui/material';
import {
  Search,
  Add,
  Memory,
  Settings,
  Palette,
  Build,
  Upload,
  Download
} from '@mui/icons-material';
import { apiCall } from '../../../../../shared/services/api';

interface Component3D {
  id: string;
  name: string;
  type: 'DESIGN' | 'FUNCTIONAL' | 'ELECTRONIC' | 'MECHANICAL';
  category: string;
  filePath?: string;
  fileSize?: number;
  metadata: any;
  isGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ComponentLibraryProps {
  onAddComponent: (component: Component3D) => void;
}

interface CreateComponentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (component: Component3D) => void;
}

const getComponentIcon = (type: string) => {
  switch (type) {
    case 'ELECTRONIC':
      return <Memory />;
    case 'MECHANICAL':
      return <Settings />;
    case 'DESIGN':
      return <Palette />;
    case 'FUNCTIONAL':
      return <Build />;
    default:
      return <Settings />;
  }
};

const getComponentColor = (type: string): string => {
  switch (type) {
    case 'ELECTRONIC':
      return '#4caf50';
    case 'MECHANICAL':
      return '#9e9e9e';
    case 'DESIGN':
      return '#e91e63';
    case 'FUNCTIONAL':
      return '#2196f3';
    default:
      return '#757575';
  }
};

const CreateComponentDialog: React.FC<CreateComponentDialogProps> = ({
  open,
  onClose,
  onCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'FUNCTIONAL' as Component3D['type'],
    category: '',
    metadata: {}
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      // Create component
      const response = await apiCall('/api/components3d', 'POST', formData);
      const component = response.data;

      // Upload STL file if provided
      if (file) {
        const formDataFile = new FormData();
        formDataFile.append('stl', file);

        await apiCall(
          `/api/components3d/${component.id}/upload`,
          'POST',
          formDataFile,
          { 'Content-Type': 'multipart/form-data' }
        );
      }

      onCreated(component);
      onClose();
      setFormData({
        name: '',
        type: 'FUNCTIONAL',
        category: '',
        metadata: {}
      });
      setFile(null);
    } catch (error) {
      console.error('Failed to create component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Component</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Component Name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
          />

          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              label="Type"
              onChange={(e: any) => setFormData({ ...formData, type: e.target.value as Component3D['type'] })}
            >
              <MenuItem value="ELECTRONIC">Electronic</MenuItem>
              <MenuItem value="MECHANICAL">Mechanical</MenuItem>
              <MenuItem value="FUNCTIONAL">Functional</MenuItem>
              <MenuItem value="DESIGN">Design</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Category"
            value={formData.category}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., arduino, sensor, chassis, decoration"
            fullWidth
            required
          />

          <Box>
            <input
              accept=".stl"
              style={{ display: 'none' }}
              id="stl-file-upload"
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="stl-file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<Upload />}
                fullWidth
              >
                {file ? file.name : 'Upload STL File (Optional)'}
              </Button>
            </label>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || !formData.name.trim() || !formData.category.trim()}
        >
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddComponent }) => {
  const [components, setComponents] = useState<Component3D[]>([]);
  const [filteredComponents, setFilteredComponents] = useState<Component3D[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadComponents = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/api/components3d', 'GET');
      setComponents(response.data);
      setFilteredComponents(response.data);
    } catch (error) {
      console.error('Failed to load components:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterComponents = useCallback(() => {
    let filtered = components;

    if (searchQuery.trim()) {
      filtered = filtered.filter(comp =>
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(comp => comp.type === typeFilter);
    }

    setFilteredComponents(filtered);
  }, [components, searchQuery, typeFilter]);

  const handleComponentCreated = (component: Component3D) => {
    setComponents(prev => [component, ...prev]);
    filterComponents();
  };

  useEffect(() => {
    loadComponents();
  }, []);

  useEffect(() => {
    filterComponents();
  }, [searchQuery, typeFilter, components, filterComponents]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'No file';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (isLoading && components.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Typography>Loading components...</Typography>
      </div>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header & Search */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          Component Library ({filteredComponents.length})
        </Typography>
        
        <TextField
          size="small"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            )
          }}
          fullWidth
          sx={{ mb: 1 }}
        />

        <FormControl size="small" fullWidth>
          <InputLabel>Filter by type</InputLabel>
          <Select
            value={typeFilter}
            label="Filter by type"
            onChange={(e: any) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="ELECTRONIC">Electronic</MenuItem>
            <MenuItem value="MECHANICAL">Mechanical</MenuItem>
            <MenuItem value="FUNCTIONAL">Functional</MenuItem>
            <MenuItem value="DESIGN">Design</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Components Grid */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {filteredComponents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No components found
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              Create First Component
            </Button>
          </Box>
        ) : (
          <Grid container spacing={1}>
            {filteredComponents.map((component) => (
              <Grid item xs={12} key={component.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getComponentIcon(component.type)}
                      <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                        {component.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <Chip
                        label={component.type.toLowerCase()}
                        size="small"
                        sx={{
                          bgcolor: getComponentColor(component.type),
                          color: 'white',
                          fontSize: '0.65rem',
                          height: 20
                        }}
                      />
                      <Chip
                        label={component.category}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatFileSize(component.fileSize)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      onClick={() => onAddComponent(component)}
                      variant="contained"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      Add to Scene
                    </Button>
                    
                    {component.filePath && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          window.open(`/api/components3d/${component.id}/download`, '_blank');
                        }}
                      >
                        <Download fontSize="small" />
                      </IconButton>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Create Component FAB */}
      <Fab
        color="primary"
        size="small"
        onClick={() => setCreateDialogOpen(true)}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16
        }}
      >
        <Add />
      </Fab>

      {/* Create Component Dialog */}
      <CreateComponentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleComponentCreated}
      />
    </Box>
  );
};