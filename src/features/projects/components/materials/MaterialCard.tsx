import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Link,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Memory as MemoryIcon,
  ElectricBolt as ElectricBoltIcon,
  SmartToy as SmartToyIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  Sensors as SensorsIcon,
  Router as RouterIcon,
  Power as PowerIcon,
  DisplaySettings as DisplayIcon,
  Storage as StorageIcon,
  Cable as CableIcon,
  Settings as SettingsIcon,
  Thermostat as ThermostatIcon,
  Lightbulb as LightbulbIcon,
  ShoppingCart as ShoppingCartIcon,
  Launch as LaunchIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { Material, MaterialStatus } from '../../../../shared/types';

interface MaterialCardProps {
  material: Material;
  onEdit?: (material: Material) => void;
  onApprove?: (materialId: string) => void;
  onReject?: (materialId: string) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onEdit,
  onApprove,
  onReject,
}) => {
  const getStatusIcon = (material: Material) => {
    // Logique plus flexible pour détecter les matériaux IA
    const isAIGenerated = material.aiSuggested || 
      (material.currentVersion?.specs as any)?.createdBy === 'AI' ||
      material.status === MaterialStatus.SUGGESTED;
    
    // AI Suggested: si c'est généré par l'IA et pas encore approuvé
    if (isAIGenerated && material.status === MaterialStatus.SUGGESTED) {
      return (
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            bgcolor: 'info.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="AI Suggested"
        >
          <SmartToyIcon sx={{ fontSize: 12 }} />
        </Box>
      );
    }
    
    // User Validated: seulement si status === 'approved'
    if (material.status === MaterialStatus.APPROVED) {
      return (
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            bgcolor: 'success.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="User Validated"
        >
          <CheckCircleIcon sx={{ fontSize: 12 }} />
        </Box>
      );
    }
    
    // User Added par défaut (si pas AI et pas approuvé)
    if (material.status !== MaterialStatus.REJECTED && 
        material.status !== MaterialStatus.ORDERED && 
        material.status !== MaterialStatus.RECEIVED) {
      return (
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            bgcolor: 'warning.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="User Added"
        >
          <PersonAddIcon sx={{ fontSize: 12 }} />
        </Box>
      );
    }
    
    return null; // Pas d'icône pour les autres statuts
  };

  const getTypeIcon = (type?: string, name?: string) => {
    const materialType = type?.toLowerCase() || '';
    const materialName = name?.toLowerCase() || '';
    
    // Icônes spécifiques selon le type et le nom
    if (materialType.includes('microcontroller') || materialName.includes('esp32') || materialName.includes('arduino')) {
      return <MemoryIcon />;
    }
    if (materialType.includes('sensor') || materialName.includes('sensor')) {
      if (materialName.includes('soil') || materialName.includes('moisture')) {
        return <ThermostatIcon />;
      }
      return <SensorsIcon />;
    }
    if (materialType.includes('power') || materialName.includes('power') || materialType.includes('supply')) {
      return <PowerIcon />;
    }
    if (materialType.includes('display') || materialName.includes('display') || materialType.includes('screen')) {
      return <DisplayIcon />;
    }
    if (materialType.includes('connectivity') || materialType.includes('wifi') || materialType.includes('bluetooth')) {
      return <RouterIcon />;
    }
    if (materialType.includes('storage') || materialType.includes('memory')) {
      return <StorageIcon />;
    }
    if (materialType.includes('server') || materialName.includes('server')) {
      return <RouterIcon />;
    }
    if (materialType.includes('valve') || materialName.includes('valve')) {
      return <SettingsIcon />;
    }
    if (materialType.includes('timer') || materialName.includes('timer')) {
      return <SettingsIcon />;
    }
    if (materialType.includes('light') || materialName.includes('light')) {
      return <LightbulbIcon />;
    }
    
    // Icône par défaut
    return <BuildIcon />;
  };

  const getSpecIcon = (specKey: string) => {
    const key = specKey.toLowerCase();
    
    if (key.includes('power') || key.includes('voltage')) {
      return { icon: <ElectricBoltIcon sx={{ fontSize: 10 }} />, color: '#2196f3' }; // Bleu
    }
    if (key.includes('speed') || key.includes('frequency') || key.includes('clock')) {
      return { icon: <SettingsIcon sx={{ fontSize: 10 }} />, color: '#4caf50' }; // Vert
    }
    if (key.includes('memory') || key.includes('storage') || key.includes('ram')) {
      return { icon: <StorageIcon sx={{ fontSize: 10 }} />, color: '#ff9800' }; // Orange
    }
    if (key.includes('connectivity') || key.includes('wifi') || key.includes('bluetooth')) {
      return { icon: <RouterIcon sx={{ fontSize: 10 }} />, color: '#9c27b0' }; // Violet
    }
    if (key.includes('current') || key.includes('ampere')) {
      return { icon: <CableIcon sx={{ fontSize: 10 }} />, color: '#f44336' }; // Rouge
    }
    if (key.includes('quantity') || key.includes('count')) {
      return { icon: <BuildIcon sx={{ fontSize: 10 }} />, color: '#607d8b' }; // Bleu gris
    }
    if (key.includes('efficiency') || key.includes('performance')) {
      return { icon: <ThermostatIcon sx={{ fontSize: 10 }} />, color: '#795548' }; // Marron
    }
    
    // Icône par défaut
    return { icon: <SettingsIcon sx={{ fontSize: 10 }} />, color: '#757575' }; // Gris
  };

  // Filtrer les spécifications pour ne garder que les techniques
  const getFilteredTechnicalSpecs = (requirements: any = {}) => {
    if (!requirements || typeof requirements !== 'object') {
      return {};
    }

    // Liste des champs non-techniques à exclure
    const nonTechnicalFields = [
      'action', 'quantity', 'notes', 'status', 'createdBy', 'createdAt', 
      'updatedAt', 'id', 'materialRequirementId', 'projectId', 'componentId',
      'versionNumber', 'aiSuggested', 'suggestedAlternatives'
    ];

    const technicalSpecs: any = {};
    
    Object.entries(requirements).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      
      // Exclure les champs non-techniques
      if (!nonTechnicalFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        technicalSpecs[key] = value;
      }
    });

    return technicalSpecs;
  };

  // Extraire les notes des requirements (chercher dans tous les endroits possibles)
  const getMaterialNotes = () => {
    const specs = material.currentVersion?.specs as any;
    
    // Chercher les notes dans plusieurs endroits possibles
    const notes = specs?.requirements?.notes || 
                  specs?.notes || 
                  material.description ||
                  material.requirements?.notes ||
                  '';
    
    return notes;
  };

  // Extraire les informations de référence de produit
  const getProductReference = () => {
    const specs = material.currentVersion?.specs as any;
    return specs?.productReference || material.productReference;
  };

  // Générer des liens de recherche fiables
  const generateWorkingPurchaseUrl = (productReference: any) => {
    if (!productReference) return null;
    
    const productName = productReference.name;
    const supplier = productReference.supplier?.toLowerCase();
    const materialType = material.type?.toLowerCase() || '';
    
    // Ajouter des mots-clés spécifiques selon le type de composant
    let searchQuery = productName;
    if (materialType.includes('sensor')) {
      searchQuery += ' sensor module';
    } else if (materialType.includes('microcontroller')) {
      searchQuery += ' development board';
    } else if (materialType.includes('power') || materialType.includes('battery')) {
      searchQuery += ' power supply';
    } else if (materialType.includes('display')) {
      searchQuery += ' display module';
    }
    
    // Encoder le nom du produit pour l'URL
    const encodedProductName = encodeURIComponent(searchQuery);
    
    // Générer des URLs de recherche qui fonctionnent vraiment
    const searchUrls: { [key: string]: string } = {
      'amazon': `https://www.amazon.com/s?k=${encodedProductName}&ref=nb_sb_noss`,
      'adafruit': `https://www.adafruit.com/search?q=${encodedProductName}`,
      'sparkfun': `https://www.sparkfun.com/search/results?term=${encodedProductName}`,
      'aliexpress': `https://www.aliexpress.com/wholesale?SearchText=${encodedProductName}`,
      'mouser': `https://www.mouser.com/c/?q=${encodedProductName}`,
      'digikey': `https://www.digikey.com/products/en?keywords=${encodedProductName}`,
    };
    
    // Retourner l'URL de recherche appropriée
    return searchUrls[supplier] || `https://www.google.com/search?q=${encodedProductName}+buy+electronics`;
  };

  const technicalSpecs = getFilteredTechnicalSpecs(material.requirements);
  const productReference = getProductReference();
  const workingPurchaseUrl = generateWorkingPurchaseUrl(productReference);

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              {getTypeIcon(material.type, material.name)}
            </Box>
            <Box>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                {material.name || 'Unnamed Component'}
                {getStatusIcon(material)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {material.type || 'Component'}
                </Typography>
                {material.quantity && material.quantity > 0 && (
                  <Typography variant="body2" sx={{ 
                    bgcolor: 'primary.light', 
                    color: 'primary.contrastText',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    Qty: {material.quantity}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Edit button */}
            <IconButton 
              size="small" 
              onClick={() => onEdit?.(material)}
              sx={{ color: 'primary.main' }}
              title="Edit"
            >
              <EditIcon />
            </IconButton>
            
            {/* Approve button - only for suggested materials */}
            {material.status === MaterialStatus.SUGGESTED && (
              <IconButton 
                size="small" 
                onClick={() => onApprove?.(material.id)}
                sx={{ color: 'success.main' }}
                title="Approve"
              >
                <BuildIcon />
              </IconButton>
            )}
            
            {/* Reject button (was Delete) */}
            <IconButton 
              size="small" 
              onClick={() => onReject?.(material.id)}
              sx={{ color: 'error.main' }}
              title="Reject"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Notes au lieu de description répétée */}
        {getMaterialNotes() && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {getMaterialNotes()}
          </Typography>
        )}

        {/* Product Reference Section */}
        {productReference && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCartIcon sx={{ fontSize: 16 }} />
              Référence Produit Suggérée
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                size="small" 
                label={productReference.manufacturer} 
                sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
              />
              <Chip 
                size="small" 
                label={productReference.estimatedPrice} 
                sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}
              />
              <Chip 
                size="small" 
                label={productReference.supplier} 
                sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}
              />
            </Box>
            
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              {productReference.name}
            </Typography>
            
            {productReference.partNumber && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Référence: {productReference.partNumber}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {workingPurchaseUrl && (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<ShoppingCartIcon />}
                  endIcon={<LaunchIcon />}
                  component={Link}
                  href={workingPurchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textTransform: 'none' }}
                  title={`Rechercher "${productReference.name}" sur ${productReference.supplier}`}
                >
                  Rechercher & Acheter
                </Button>
              )}
              
              {productReference.datasheet && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  endIcon={<LaunchIcon />}
                  component={Link}
                  href={productReference.datasheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textTransform: 'none' }}
                >
                  Datasheet
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Specifications - Seulement les techniques */}
        {Object.keys(technicalSpecs).length > 0 && (
          <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Specifications
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {Object.entries(technicalSpecs).map(([key, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      p: 1.5, 
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}>
                      <Box sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: getSpecIcon(key).color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '10px'
                      }}>
                        {getSpecIcon(key).icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize'
                        }}>
                          {key}:
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          color: 'text.primary'
                        }}>
                          {String(value)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default MaterialCard; 