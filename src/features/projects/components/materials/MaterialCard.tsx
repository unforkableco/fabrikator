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
  Button
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
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { Material, MaterialStatus, ProductReference } from '../../../../shared/types';
import { api } from '../../../../shared/services/api';

interface MaterialCardProps {
  material: Material;
  onEdit?: (material: Material) => void;
  onApprove?: (materialId: string) => void;
  onReject?: (materialId: string) => void;
  onDelete?: (materialId: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  expanded,
  onExpandedChange,
}) => {
  const [localExpanded, setLocalExpanded] = React.useState(false);
  const isExpanded = expanded !== undefined ? expanded : localExpanded;
  const handleAccordionChange = (_e: any, newExpanded: boolean) => {
    if (onExpandedChange) onExpandedChange(newExpanded);
    else setLocalExpanded(newExpanded);
  };

  const getStatusIcon = (material: Material) => {
    const isAIGenerated = material.aiSuggested || 
      (material.currentVersion?.specs as any)?.createdBy === 'AI' ||
      material.status === MaterialStatus.SUGGESTED;
    
    if (isAIGenerated && material.status === MaterialStatus.SUGGESTED) {
      return (
        <Box 
          sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'info.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="AI Suggested"
        >
          <SmartToyIcon sx={{ fontSize: 12 }} />
        </Box>
      );
    }
    
    if (material.status === MaterialStatus.APPROVED) {
      return (
        <Box 
          sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'success.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Approved"
        >
          <CheckCircleIcon sx={{ fontSize: 12 }} />
        </Box>
      );
    }
    
    if (material.status !== MaterialStatus.REJECTED && 
        material.status !== MaterialStatus.ORDERED && 
        material.status !== MaterialStatus.RECEIVED) {
      return (
        <Box 
          sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'warning.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="User Added"
        >
          <PersonAddIcon sx={{ fontSize: 12 }} />
        </Box>
      );
    }
    
    return null;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getProductReference = () => {
    const specs = material.currentVersion?.specs as any;
    return specs?.productReference || material.productReference;
  };

  // Générer des liens de recherche fiables
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // const productReference = getProductReference(); // unused
  // const workingPurchaseUrl = generateWorkingPurchaseUrl(productReference); // unused

  // References suggestion modal state
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestedRefs, setSuggestedRefs] = React.useState<ProductReference[]>([]);
  const [showRefsModal, setShowRefsModal] = React.useState(false);
  const canSuggestRefs = material.status === MaterialStatus.APPROVED;

  const handleSuggestReferences = async () => {
    if (!canSuggestRefs) return;
    try {
      setIsSuggesting(true);
      const resp = await api.projects.suggestPurchaseReferences(material.id);
      setSuggestedRefs(Array.isArray(resp.references) ? resp.references : []);
      setShowRefsModal(true);
    } catch (e) {
      setSuggestedRefs([]);
      setShowRefsModal(true);
    } finally {
      setIsSuggesting(false);
    }
  };

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
                  {getMaterialNotes()}
                </Typography>
                {material.quantity && material.quantity > 0 && (
                  <Typography variant="body2" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', px: 1, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                    Qty: {material.quantity}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onEdit && (
              <IconButton size="small" onClick={() => onEdit(material)} title="Edit">
                <EditIcon />
              </IconButton>
            )}
            {/* Toggle Approve/Disapprove */}
            {(onApprove || onReject) && (
              material.status === MaterialStatus.APPROVED ? (
                <IconButton size="small" color="warning" onClick={() => onReject?.(material.id)} title="Disapprove">
                  <CheckCircleIcon />
                </IconButton>
              ) : (
                <IconButton size="small" color="success" onClick={() => onApprove?.(material.id)} title="Approve">
                  <CheckCircleIcon />
                </IconButton>
              )
            )}
            {/* Delete */}
            {onDelete && (
              <IconButton size="small" color="error" onClick={() => onDelete(material.id)} title="Delete">
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Suggest references (APPROVED only) */}
        {canSuggestRefs && (
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={handleSuggestReferences} disabled={isSuggesting}>
              {isSuggesting ? 'Searching…' : 'Suggest references'}
            </Button>
          </Box>
        )}

        {/* Specifications */}
        {Object.keys(technicalSpecs).length > 0 && (
          <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }} expanded={isExpanded} onChange={handleAccordionChange}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Specifications
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {Object.entries(technicalSpecs).map(([key, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: getSpecIcon(key).color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>
                        {getSpecIcon(key).icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'capitalize' }}>{key}:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem', color: 'text.primary' }}>{String(value)}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Suggested references modal */}
        {showRefsModal && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Suggested references</Typography>
            {suggestedRefs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No references found.</Typography>
            ) : (
              <Grid container spacing={1}>
                {suggestedRefs.map((ref) => (
                  <Grid key={ref.name + (ref.partNumber || '')} item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{ref.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{ref.manufacturer} · {ref.estimatedPrice} · {ref.supplier}</Typography>
                        {ref.partNumber && (<Typography variant="caption" color="text.secondary">PN: {ref.partNumber}</Typography>)}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {ref.purchaseUrl && (
                          <Button size="small" variant="outlined" href={ref.purchaseUrl} target="_blank">Buy</Button>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setShowRefsModal(false)}>Close</Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MaterialCard; 