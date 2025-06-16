import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Toolbar,
  IconButton,
  Tooltip,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Cable as CableIcon,
  CheckCircle as ValidIcon
} from '@mui/icons-material';

interface Component {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  pins: Pin[];
}

interface Pin {
  name: string;
  type: 'input' | 'output' | 'power' | 'ground';
  position: { x: number; y: number };
}

interface Connection {
  id: string;
  from: { component: string; pin: string };
  to: { component: string; pin: string };
  color: string;
  path: { x: number; y: number }[];
  validation?: {
    isValid: boolean;
    warnings: string[];
  };
}

interface WiringEditorProps {
  projectId: string;
  components: any[];
  wiring?: any;
  onSave: (wiringData: any) => void;
  onValidate: (wiringData: any) => Promise<any>;
}

const WiringEditor: React.FC<WiringEditorProps> = ({
  projectId,
  components: availableComponents,
  wiring,
  onSave,
  onValidate
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // État du diagramme
  const [components, setComponents] = useState<Component[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ component: string; pin: string } | null>(null);
  
  // État des dialogues
  const [addComponentDialog, setAddComponentDialog] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [connectionData, setConnectionData] = useState<any>({ 
    color: 'red', 
    voltage: '5V',
    from: null,
    to: null
  });
  
  // État de validation
  const [validation, setValidation] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Charger les composants disponibles depuis les matériaux
  useEffect(() => {
    if (availableComponents && availableComponents.length > 0) {
      const materialComponents = availableComponents.map((material, index) => {
        const specs = material.currentVersion?.specs || {};
        return {
          id: material.id,
          name: specs.name || specs.type || 'Composant',
          type: specs.type || 'generic',
          position: { x: 100 + (index * 120), y: 100 },
          pins: generatePinsForComponent(specs.type || 'generic')
        };
      });
      setComponents(materialComponents);
    }
  }, [availableComponents]);

  // Charger les connexions existantes
  useEffect(() => {
    if (wiring?.currentVersion?.wiringData?.connections && components.length > 0) {
      console.log('Chargement des connexions:', wiring.currentVersion.wiringData.connections);
      console.log('Composants disponibles:', components);
      
      const existingConnections = wiring.currentVersion.wiringData.connections;
      const formattedConnections = existingConnections.map((conn: any) => {
        const path = generateConnectionPathFromIds(conn.from, conn.fromPin, conn.to, conn.toPin);
        
        return {
          id: conn.id || `conn_${Date.now()}_${Math.random()}`,
          from: { component: conn.from, pin: conn.fromPin },
          to: { component: conn.to, pin: conn.toPin },
          color: conn.wire || 'blue',
          path: path
        };
      });
      
      console.log('Connexions formatées:', formattedConnections);
      setConnections(formattedConnections);
    }
  }, [wiring, components]);

  // Gestion du zoom
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  // Gestion du pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !connectionMode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan, connectionMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Ajouter un composant
  const handleAddComponent = (componentData: any) => {
    const newComponent: Component = {
      id: `comp_${Date.now()}`,
      name: componentData.name,
      type: componentData.type,
      position: { x: 100, y: 100 },
      pins: generatePinsForComponent(componentData.type)
    };
    
    setComponents(prev => [...prev, newComponent]);
    setAddComponentDialog(false);
  };

  // Générer les pins pour un type de composant
  const generatePinsForComponent = (type: string): Pin[] => {
    const pinMappings: { [key: string]: Pin[] } = {
      'arduino': [
        { name: 'D0', type: 'input', position: { x: -10, y: 15 } },
        { name: 'D1', type: 'output', position: { x: -10, y: 25 } },
        { name: 'D2', type: 'input', position: { x: -10, y: 35 } },
        { name: 'D3', type: 'output', position: { x: -10, y: 45 } },
        { name: 'GND', type: 'ground', position: { x: 90, y: 15 } },
        { name: '5V', type: 'power', position: { x: 90, y: 25 } }
      ],
      'sensor': [
        { name: 'VCC', type: 'power', position: { x: -10, y: 15 } },
        { name: 'GND', type: 'ground', position: { x: -10, y: 30 } },
        { name: 'OUT', type: 'output', position: { x: 90, y: 22 } }
      ],
      'led': [
        { name: 'ANODE', type: 'input', position: { x: -10, y: 22 } },
        { name: 'CATHODE', type: 'ground', position: { x: 90, y: 22 } }
      ],
      'resistor': [
        { name: 'PIN1', type: 'input', position: { x: -10, y: 22 } },
        { name: 'PIN2', type: 'output', position: { x: 90, y: 22 } }
      ],
      'actuator': [
        { name: 'VCC', type: 'power', position: { x: -10, y: 15 } },
        { name: 'GND', type: 'ground', position: { x: -10, y: 30 } },
        { name: 'SIGNAL', type: 'input', position: { x: 90, y: 22 } }
      ]
    };
    
    return pinMappings[type.toLowerCase()] || [
      { name: 'VCC', type: 'power', position: { x: -10, y: 15 } },
      { name: 'GND', type: 'ground', position: { x: -10, y: 30 } },
      { name: 'OUT', type: 'output', position: { x: 90, y: 22 } }
    ];
  };

  // Commencer une connexion
  const handleStartConnection = (componentId: string, pinName: string) => {
    if (connectionMode) {
      if (!connectionStart) {
        setConnectionStart({ component: componentId, pin: pinName });
      } else {
        // Terminer la connexion
        setConnectionData({
          ...connectionData,
          from: connectionStart,
          to: { component: componentId, pin: pinName }
        });
        setConnectionDialog(true);
      }
    }
  };

  // Créer une connexion
  const handleCreateConnection = () => {
    if (connectionStart && connectionData) {
      const newConnection: Connection = {
        id: `conn_${Date.now()}`,
        from: connectionStart,
        to: connectionData.to,
        color: connectionData.color,
        path: generateConnectionPath(connectionStart, connectionData.to)
      };
      
      setConnections(prev => [...prev, newConnection]);
      setConnectionStart(null);
      setConnectionDialog(false);
      setConnectionMode(false);
    }
  };

  // Générer le chemin d'une connexion
  const generateConnectionPath = (from: any, to: any) => {
    const fromComp = components.find(c => c.id === from.component);
    const toComp = components.find(c => c.id === to.component);
    
    if (!fromComp || !toComp) return [];
    
    const fromPin = fromComp.pins.find(p => p.name === from.pin);
    const toPin = toComp.pins.find(p => p.name === to.pin);
    
    if (!fromPin || !toPin) return [];
    
    return [
      { x: fromComp.position.x + fromPin.position.x, y: fromComp.position.y + fromPin.position.y },
      { x: toComp.position.x + toPin.position.x, y: toComp.position.y + toPin.position.y }
    ];
  };
  
  // Générer le chemin d'une connexion depuis les IDs
  const generateConnectionPathFromIds = (fromCompId: string, fromPinName: string, toCompId: string, toPinName: string) => {
    const fromComp = components.find(c => c.id === fromCompId);
    const toComp = components.find(c => c.id === toCompId);
    
    if (!fromComp || !toComp) return [];
    
    const fromPin = fromComp.pins.find(p => p.name === fromPinName);
    const toPin = toComp.pins.find(p => p.name === toPinName);
    
    if (!fromPin || !toPin) return [];
    
    return [
      { x: fromComp.position.x + fromPin.position.x, y: fromComp.position.y + fromPin.position.y },
      { x: toComp.position.x + toPin.position.x, y: toComp.position.y + toPin.position.y }
    ];
  };

  // Sauvegarder le câblage
  const handleSave = () => {
    const wiringData = {
      connections: connections.map(conn => ({
        id: conn.id,
        from: conn.from.component,
        fromPin: conn.from.pin,
        to: conn.to.component,
        toPin: conn.to.pin,
        wire: conn.color,
        voltage: connectionData.voltage
      })),
      diagram: {
        components,
        wires: connections
      }
    };
    
    onSave(wiringData);
  };

  // Valider le câblage
  const handleValidate = async () => {
    const wiringData = {
      connections: connections.map(conn => ({
        from: conn.from.component,
        fromPin: conn.from.pin,
        to: conn.to.component,
        toPin: conn.to.pin,
        wire: conn.color,
        voltage: connectionData.voltage
      })),
      diagram: { components, wires: connections }
    };
    
    try {
      const result = await onValidate(wiringData);
      setValidation(result);
      setShowValidation(true);
    } catch (error) {
      console.error('Erreur de validation:', error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barre d'outils */}
      <Toolbar sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Tooltip title="Ajouter un composant">
          <IconButton onClick={() => setAddComponentDialog(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Mode connexion">
          <IconButton 
            color={connectionMode ? 'primary' : 'default'}
            onClick={() => setConnectionMode(!connectionMode)}
          >
            <CableIcon />
          </IconButton>
        </Tooltip>
        
        <Box sx={{ mx: 2 }}>
          <Tooltip title="Zoom arrière">
            <IconButton onClick={() => handleZoom(-0.1)}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Chip label={`${Math.round(zoom * 100)}%`} size="small" />
          <Tooltip title="Zoom avant">
            <IconButton onClick={() => handleZoom(0.1)}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flexGrow: 1 }} />
        
        <Button
          variant="outlined"
          startIcon={<ValidIcon />}
          onClick={handleValidate}
          sx={{ mr: 1 }}
        >
          Valider
        </Button>
        
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Sauvegarder
        </Button>
      </Toolbar>

      {/* Zone de dessin SVG */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : connectionMode ? 'crosshair' : 'grab' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="2000" height="2000" fill="url(#grid)" />
            
            {/* Connexions */}
            {connections.map(conn => (
              <g key={conn.id}>
                <path
                  d={`M ${conn.path.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                  stroke={conn.color}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {conn.validation && !conn.validation.isValid && (
                  <circle
                    cx={conn.path[Math.floor(conn.path.length / 2)]?.x}
                    cy={conn.path[Math.floor(conn.path.length / 2)]?.y}
                    r="8"
                    fill="red"
                    opacity="0.8"
                  />
                )}
              </g>
            ))}
            
            {/* Debug info */}
            {components.length === 0 && (
              <text x="100" y="100" fontSize="16" fill="#666">
                Aucun composant chargé. Vérifiez que vous avez des matériaux dans votre projet.
              </text>
            )}
            
            {/* Composants */}
            {components.map(comp => (
              <g key={comp.id} transform={`translate(${comp.position.x}, ${comp.position.y})`}>
                {/* Corps du composant */}
                <rect
                  width="80"
                  height="60"
                  fill={selectedComponent === comp.id ? '#e3f2fd' : '#f5f5f5'}
                  stroke={selectedComponent === comp.id ? '#2196f3' : '#ccc'}
                  strokeWidth="2"
                  rx="4"
                  onClick={() => setSelectedComponent(comp.id)}
                />
                
                {/* Nom du composant */}
                <text
                  x="40"
                  y="30"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#333"
                >
                  {comp.name}
                </text>
                
                {/* Pins */}
                {comp.pins.map(pin => (
                  <g key={pin.name}>
                    <circle
                      cx={pin.position.x}
                      cy={pin.position.y}
                      r="4"
                      fill={pin.type === 'power' ? 'red' : pin.type === 'ground' ? 'black' : '#2196f3'}
                      stroke="#fff"
                      strokeWidth="1"
                      onClick={() => handleStartConnection(comp.id, pin.name)}
                      style={{ cursor: connectionMode ? 'pointer' : 'default' }}
                    />
                    <text
                      x={pin.position.x + 8}
                      y={pin.position.y + 4}
                      fontSize="10"
                      fill="#666"
                    >
                      {pin.name}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </g>
        </svg>
      </Box>

      {/* Dialog d'ajout de composant */}
      <Dialog open={addComponentDialog} onClose={() => setAddComponentDialog(false)}>
        <DialogTitle>Ajouter un composant</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Composant disponible</InputLabel>
            <Select
              label="Composant disponible"
              onChange={(e) => {
                const selected = availableComponents.find(c => c.id === e.target.value);
                if (selected) {
                  const specs = selected.currentVersion?.specs || {};
                  handleAddComponent({
                    name: specs.name || 'Composant',
                    type: specs.type || 'generic'
                  });
                }
              }}
            >
              {availableComponents.map(comp => {
                const specs = comp.currentVersion?.specs || {};
                return (
                  <MenuItem key={comp.id} value={comp.id}>
                    {specs.name || specs.type || 'Composant'}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
      </Dialog>

      {/* Dialog de connexion */}
      <Dialog open={connectionDialog} onClose={() => setConnectionDialog(false)}>
        <DialogTitle>Configurer la connexion</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Couleur du câble</InputLabel>
            <Select
              value={connectionData.color}
              onChange={(e) => setConnectionData({...connectionData, color: e.target.value})}
            >
              <MenuItem value="red">Rouge (5V)</MenuItem>
              <MenuItem value="black">Noir (GND)</MenuItem>
              <MenuItem value="blue">Bleu (Signal)</MenuItem>
              <MenuItem value="yellow">Jaune (Data)</MenuItem>
              <MenuItem value="green">Vert (Analog)</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Tension"
            value={connectionData.voltage}
            onChange={(e) => setConnectionData({...connectionData, voltage: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionDialog(false)}>Annuler</Button>
          <Button onClick={handleCreateConnection} variant="contained">Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de validation */}
      <Snackbar
        open={showValidation}
        autoHideDuration={6000}
        onClose={() => setShowValidation(false)}
      >
        <Alert
          severity={validation?.isValid ? 'success' : validation?.errors?.length > 0 ? 'error' : 'warning'}
          onClose={() => setShowValidation(false)}
        >
          {validation?.summary || 'Validation terminée'}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WiringEditor; 