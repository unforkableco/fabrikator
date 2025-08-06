import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon,
  ViewInAr as View3DIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Memory as MemoryIcon,
  ElectricBolt as ElectricBoltIcon,
  Sensors as SensorsIcon,
  Power as PowerIcon,
  DisplaySettings as DisplayIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Material, MaterialStatus, Project } from '../../../../shared/types';

interface ProjectOverviewProps {
  project: Project;
  materials: Material[];
  onGoToMaterials: () => void;
  onRefreshMaterials?: () => void;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  materials,
  onGoToMaterials,
  onRefreshMaterials,
}) => {
  // Calculate project statistics
  const approvedMaterials = materials.filter(m => m.status === MaterialStatus.APPROVED);
  const suggestedMaterials = materials.filter(m => m.status === MaterialStatus.SUGGESTED);

  // Calculate total estimated price
  const calculateTotalPrice = () => {
    let total = 0;
    let currency = 'USD';
    
    materials.forEach(material => {
      const price = material.currentVersion?.specs?.productReference?.estimatedPrice;
      if (price) {
        // Extract numeric value from price string (e.g., "$15.99 USD" -> 15.99)
        const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
        if (!isNaN(numericPrice)) {
          total += numericPrice * (material.quantity || 1);
        }
        
        // Extract currency from the first price found
        const currencyMatch = price.match(/[A-Z]{3}/);
        if (currencyMatch && currency === 'USD') {
          currency = currencyMatch[0];
        }
      }
    });
    
    return { total, currency };
  };

  const { total: totalPrice, currency } = calculateTotalPrice();

  // Get component type icon
  const getComponentIcon = (type: string) => {
    const typeStr = type?.toLowerCase() || '';
    if (typeStr.includes('microcontroller') || typeStr.includes('arduino') || typeStr.includes('esp')) {
      return <MemoryIcon />;
    }
    if (typeStr.includes('sensor')) {
      return <SensorsIcon />;
    }
    if (typeStr.includes('power') || typeStr.includes('battery') || typeStr.includes('supply')) {
      return <PowerIcon />;
    }
    if (typeStr.includes('display') || typeStr.includes('screen') || typeStr.includes('lcd') || typeStr.includes('oled')) {
      return <DisplayIcon />;
    }
    if (typeStr.includes('motor') || typeStr.includes('servo') || typeStr.includes('actuator')) {
      return <ElectricBoltIcon />;
    }
    return <BuildIcon />;
  };

  // Get status icon and color
  const getStatusInfo = (status?: MaterialStatus) => {
    switch (status) {
      case MaterialStatus.APPROVED:
        return { icon: <CheckCircleIcon />, color: 'success' as const, label: 'Approved' };
      case MaterialStatus.SUGGESTED:
        return { icon: <PendingIcon />, color: 'warning' as const, label: 'Pending' };
      case MaterialStatus.REJECTED:
        return { icon: <CancelIcon />, color: 'error' as const, label: 'Rejected' };
      default:
        return { icon: <PendingIcon />, color: 'default' as const, label: 'Unknown' };
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Project Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          {project.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
          {project.description || 'No description available.'}
        </Typography>
        <Chip 
          label={project.status?.toUpperCase() || 'PLANNING'} 
          color="primary" 
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Project Statistics */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Component Summary
                </Typography>
                {onRefreshMaterials && (
                  <Tooltip title="Refresh materials">
                    <IconButton size="small" onClick={onRefreshMaterials} sx={{ ml: 'auto' }}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {approvedMaterials.length}
                    </Typography>
                    <Typography variant="body2">
                      Approved
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {suggestedMaterials.length}
                    </Typography>
                    <Typography variant="body2">
                      Pending
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.300', color: 'text.primary' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {materials.length}
                    </Typography>
                    <Typography variant="body2">
                      Total
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Estimated Cost */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoneyIcon sx={{ mr: 1, color: 'primary.contrastText' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.contrastText' }}>
                    Estimated Total Cost
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.contrastText' }}>
                  {totalPrice > 0 ? `$${totalPrice.toFixed(2)} ${currency}` : 'Not calculated'}
                </Typography>
                {totalPrice > 0 && (
                  <Typography variant="body2" sx={{ color: 'primary.contrastText', opacity: 0.8 }}>
                    Based on {materials.filter(m => m.currentVersion?.specs?.productReference?.estimatedPrice).length} priced components
                  </Typography>
                )}
              </Box>

              {/* Next Step Button */}
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={onGoToMaterials}
                fullWidth
                sx={{ mt: 3, py: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Go to Next Step: Review Components
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Components List */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Required Components
              </Typography>
              
              {materials.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No components added yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start by adding components to your project
                  </Typography>
                </Box>
              ) : (
                <List sx={{ maxHeight: 350, overflow: 'auto' }}>
                  {materials.slice(0, 8).map((material, index) => {
                    const statusInfo = getStatusInfo(material.status);
                    return (
                      <React.Fragment key={material.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {getComponentIcon(material.type || '')}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {material.name || material.type || 'Unnamed Component'}
                                </Typography>
                                <Chip
                                  icon={statusInfo.icon}
                                  label={statusInfo.label}
                                  color={statusInfo.color}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Qty: {material.quantity || 1}
                                </Typography>
                                {material.currentVersion?.specs?.productReference?.estimatedPrice && (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {material.currentVersion.specs.productReference.estimatedPrice}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < Math.min(materials.length - 1, 7) && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                  {materials.length > 8 && (
                    <ListItem sx={{ px: 0, justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        ... and {materials.length - 8} more components
                      </Typography>
                    </ListItem>
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 3D Preview Placeholder */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                3D Project Preview
              </Typography>
              <Box 
                sx={{ 
                  height: 300, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  border: '2px dashed',
                  borderColor: 'grey.300'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <View3DIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    3D Preview Coming Soon
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This will show a 3D visualization of your assembled project
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProjectOverview; 