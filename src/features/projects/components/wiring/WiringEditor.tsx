import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Toolbar, Chip, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CableIcon from '@mui/icons-material/Cable';
import DeleteIcon from '@mui/icons-material/Delete';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { WiringDiagram, WiringConnection, WiringComponent, WiringPin } from '../../../../shared/types';

interface WiringEditorProps {
  diagram: WiringDiagram | null;
  materials: any[];
  selectedConnection: string | null;
  selectedComponent: string | null;
  onComponentAdd: (component: WiringComponent) => void;
  onConnectionAdd: (connection: WiringConnection) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<WiringConnection>) => void;
  onConnectionDelete: (connectionId: string) => void;
  onComponentDelete?: (componentId: string) => void;
  onComponentUpdate?: (componentId: string, updates: Partial<WiringComponent>) => void;
  onSelectionChange: (connectionId: string | null, componentId: string | null) => void;
  isValidating: boolean;
}

const WiringEditor: React.FC<WiringEditorProps> = ({
  diagram,
  materials,
  selectedConnection,
  selectedComponent,
  onComponentAdd,
  onConnectionAdd,
  onConnectionUpdate,
  onConnectionDelete,
  onComponentDelete,
  onComponentUpdate,
  onSelectionChange,
  isValidating
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ width: 800, height: 600 });
  const [draggedComponent, setDraggedComponent] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [connectionInProgress, setConnectionInProgress] = useState<{
    fromComponent: string;
    fromPin: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // État pour suivre les quantités utilisées de chaque matériau
  const [usedQuantities, setUsedQuantities] = useState<Record<string, number>>({});

  // Fonctions de zoom et navigation
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fonctions pour redimensionner la zone de dessin
  const handleExpandWidth = () => {
    setSvgSize(prev => ({ ...prev, width: prev.width + 200 }));
  };

  const handleShrinkWidth = () => {
    setSvgSize(prev => ({ ...prev, width: Math.max(400, prev.width - 200) }));
  };

  const handleExpandHeight = () => {
    setSvgSize(prev => ({ ...prev, height: prev.height + 150 }));
  };

  const handleShrinkHeight = () => {
    setSvgSize(prev => ({ ...prev, height: Math.max(300, prev.height - 150) }));
  };

  // Calculer les quantités utilisées à partir du diagramme
  useEffect(() => {
    if (diagram) {
      const quantities: Record<string, number> = {};
      diagram.components.forEach(component => {
        // Utiliser materialId si disponible, sinon utiliser l'id du composant
        const materialId = component.materialId || component.id;
        if (materialId) {
          quantities[materialId] = (quantities[materialId] || 0) + 1;
        }
      });
      setUsedQuantities(quantities);
      console.log('Updated used quantities:', quantities); // Debug log
    } else {
      setUsedQuantities({});
    }
  }, [diagram]);

  // Gestion des raccourcis clavier pour le zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleResetView();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Désactiver le scroll de la page quand la souris est dans la zone de dessin
  const [isMouseInCanvas, setIsMouseInCanvas] = useState(false);

  const handleMouseEnter = () => {
    setIsMouseInCanvas(true);
    // Désactiver le scroll de la page
    document.body.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    setIsMouseInCanvas(false);
    // Réactiver le scroll de la page
    document.body.style.overflow = 'auto';
  };

  // Empêcher le scroll de la page quand on est dans le canvas
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (isMouseInCanvas) {
        e.preventDefault();
      }
    };

    // Ajouter l'événement avec passive: false pour pouvoir utiliser preventDefault
    document.addEventListener('wheel', handleGlobalWheel, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleGlobalWheel);
      // Restaurer le scroll au démontage du composant
      document.body.style.overflow = 'auto';
    };
  }, [isMouseInCanvas]);

  // Resize SVG when container changes
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setSvgSize({
            width: container.offsetWidth - 20,
            height: Math.max(600, container.offsetHeight - 100)
          });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sample component templates based on materials
  const getComponentTemplate = (material: any): Omit<WiringComponent, 'id' | 'position'> => {
    console.log('Creating component from material:', material); // Debug log
    
    const specs = material.currentVersion?.specs || {};
    const materialName = material.name || specs.name || 'Composant';
    const materialType = specs.type || material.type || material.category || 'Component';
    
    console.log('Material name:', materialName, 'Type:', materialType); // Debug log
    
    // Generate pins based on component type
    const pins: WiringPin[] = [];
    
    // More flexible type matching
    const typeStr = materialType.toLowerCase();
    
    if (typeStr.includes('microcontroller') || typeStr.includes('arduino') || typeStr.includes('esp')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -25, y: -15 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -25, y: 15 }, connected: false },
        { id: 'gpio1', name: 'GPIO1', type: 'digital', position: { x: 25, y: -15 }, connected: false },
        { id: 'gpio2', name: 'GPIO2', type: 'digital', position: { x: 25, y: 0 }, connected: false },
        { id: 'gpio3', name: 'GPIO3', type: 'digital', position: { x: 25, y: 15 }, connected: false },
        { id: 'gpio4', name: 'GPIO4', type: 'digital', position: { x: 0, y: 25 }, connected: false }
      );
    } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -15, y: -10 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -15, y: 10 }, connected: false },
        { id: 'data', name: 'DATA', type: 'analog', position: { x: 15, y: 0 }, connected: false }
      );
    } else if (typeStr.includes('display') || typeStr.includes('écran') || typeStr.includes('screen')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -20, y: -15 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -20, y: 15 }, connected: false },
        { id: 'sda', name: 'SDA', type: 'digital', position: { x: 20, y: -10 }, connected: false },
        { id: 'scl', name: 'SCL', type: 'digital', position: { x: 20, y: 10 }, connected: false }
      );
    } else if (typeStr.includes('button') || typeStr.includes('bouton')) {
      pins.push(
        { id: 'pin1', name: 'Pin1', type: 'input', position: { x: -20, y: 0 }, connected: false },
        { id: 'pin2', name: 'Pin2', type: 'input', position: { x: 20, y: 0 }, connected: false }
      );
    } else if (typeStr.includes('battery') || typeStr.includes('batterie') || typeStr.includes('power')) {
      pins.push(
        { id: 'positive', name: '+', type: 'power', position: { x: 0, y: -20 }, connected: false, voltage: 3.7 },
        { id: 'negative', name: '-', type: 'ground', position: { x: 0, y: 20 }, connected: false }
      );
    } else {
      // Generic component
      pins.push(
        { id: 'pin1', name: 'Pin1', type: 'input', position: { x: -20, y: 0 }, connected: false },
        { id: 'pin2', name: 'Pin2', type: 'output', position: { x: 20, y: 0 }, connected: false }
      );
    }

    const componentName = materialName.length > 15 ? materialName.substring(0, 12) + '...' : materialName;

    return {
      name: componentName,
      type: materialType,
      pins,
      specifications: specs,
      materialId: material.id
    };
  };

  const handleAddComponent = (material: any) => {
    // Vérifier si nous avons atteint la quantité limite pour ce matériau
    const currentlyUsed = usedQuantities[material.id] || 0;
    const availableQuantity = material.quantity || 1; // Par défaut 1 si pas de quantité spécifiée
    
    if (currentlyUsed >= availableQuantity) {
      console.warn(`Quantité maximale atteinte pour ${material.name}: ${availableQuantity}`);
      return;
    }

    // Calculer une position organisée pour le nouveau composant
    const existingComponents = diagram?.components.length || 0;
    const componentsPerRow = 3;
    const componentSpacingX = 150;
    const componentSpacingY = 100;
    const startX = 150;
    const startY = 100;
    
    const row = Math.floor(existingComponents / componentsPerRow);
    const col = existingComponents % componentsPerRow;

    const template = getComponentTemplate(material);
    const component: WiringComponent = {
      id: `comp-${Date.now()}`,
      position: { 
        x: startX + (col * componentSpacingX), 
        y: startY + (row * componentSpacingY) 
      },
      ...template
    };
    onComponentAdd(component);
  };

  const handleComponentMouseDown = (e: React.MouseEvent, componentId: string) => {
    e.stopPropagation();
    if (e.button === 0) { // Left mouse button
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const component = diagram?.components.find(c => c.id === componentId);
        if (component) {
          const mouseX = (e.clientX - rect.left - pan.x) / zoom;
          const mouseY = (e.clientY - rect.top - pan.y) / zoom;
          setDraggedComponent({
            id: componentId,
            offsetX: mouseX - component.position.x,
            offsetY: mouseY - component.position.y
          });
          onSelectionChange(null, componentId);
        }
      }
    } else if (e.button === 2) { // Right mouse button - Delete component
      e.preventDefault();
      handleComponentDelete(componentId);
    }
  };

  const handleComponentDelete = (componentId: string) => {
    if (onComponentDelete) {
      onComponentDelete(componentId);
    }
    // Nettoyer également toutes les connexions associées à ce composant
    if (diagram) {
      const connectionsToDelete = diagram.connections.filter(
        conn => conn.fromComponent === componentId || conn.toComponent === componentId
      );
      connectionsToDelete.forEach(conn => onConnectionDelete(conn.id));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    // Handle component dragging
    if (draggedComponent && onComponentUpdate) {
      const newX = mouseX - draggedComponent.offsetX;
      const newY = mouseY - draggedComponent.offsetY;
      
      // Constrain to canvas bounds
      const constrainedX = Math.max(0, Math.min(newX, svgSize.width / zoom - 100));
      const constrainedY = Math.max(0, Math.min(newY, svgSize.height / zoom - 100));
      
      onComponentUpdate(draggedComponent.id, {
        position: { x: constrainedX, y: constrainedY }
      });
    }

    // Handle panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prevPan => ({
        x: prevPan.x + deltaX,
        y: prevPan.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }

    // Update connection in progress
    if (connectionInProgress) {
      setConnectionInProgress(prev => prev ? {
        ...prev,
        currentX: mouseX,
        currentY: mouseY
      } : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setDraggedComponent(null);
    setIsPanning(false);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) { // Left mouse button
      // Start panning on empty space (not on components)
      const target = e.target as SVGElement;
      if (target.tagName === 'svg' || (target.tagName === 'rect' && target.getAttribute('fill') === 'url(#grid)')) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
      // Clear selection when clicking on empty space
      onSelectionChange(null, null);
    }
  };

  // Gestion de la molette pour le zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    
    // Zoom vers la position de la souris
    const zoomRatio = newZoom / zoom;
    setPan(prevPan => ({
      x: mouseX - (mouseX - prevPan.x) * zoomRatio,
      y: mouseY - (mouseY - prevPan.y) * zoomRatio
    }));
    
    setZoom(newZoom);
  };

  const handlePinClick = (componentId: string, pinId: string, pinX: number, pinY: number) => {
    console.log('Pin clicked:', { componentId, pinId, pinX, pinY });
    
    if (connectionInProgress) {
      // Complete connection
      if (connectionInProgress.fromComponent !== componentId) {
        const newConnection: WiringConnection = {
          id: `conn-${Date.now()}`,
          fromComponent: connectionInProgress.fromComponent,
          fromPin: connectionInProgress.fromPin,
          toComponent: componentId,
          toPin: pinId,
          wireType: 'data', // Default, can be changed
          wireColor: '#000000',
          validated: false
        };
        console.log('Creating connection:', newConnection);
        console.log('Available components:', diagram?.components);
        onConnectionAdd(newConnection);
      }
      setConnectionInProgress(null);
    } else {
      // Start connection
      console.log('Starting connection from:', componentId, pinId);
      setConnectionInProgress({
        fromComponent: componentId,
        fromPin: pinId,
        startX: pinX,
        startY: pinY,
        currentX: pinX,
        currentY: pinY
      });
    }
  };

  const renderComponent = (component: WiringComponent) => {
    const isSelected = selectedComponent === component.id;
    const isDragging = draggedComponent?.id === component.id;
    
    // Determine component size based on type
    const getComponentSize = (type: string) => {
      const typeStr = type.toLowerCase();
      if (typeStr.includes('microcontroller') || typeStr.includes('arduino')) {
        return { width: 80, height: 60 };
      } else if (typeStr.includes('display') || typeStr.includes('écran')) {
        return { width: 70, height: 50 };
      } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
        return { width: 50, height: 40 };
      } else if (typeStr.includes('battery') || typeStr.includes('batterie')) {
        return { width: 40, height: 60 };
      }
      return { width: 60, height: 40 };
    };

    const getComponentColor = (type: string) => {
      const typeStr = type.toLowerCase();
      if (typeStr.includes('microcontroller') || typeStr.includes('arduino')) {
        return '#2196f3';
      } else if (typeStr.includes('display') || typeStr.includes('écran')) {
        return '#4caf50';
      } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
        return '#ff9800';
      } else if (typeStr.includes('battery') || typeStr.includes('batterie')) {
        return '#f44336';
      }
      return '#9e9e9e';
    };

    const size = getComponentSize(component.type);
    const color = getComponentColor(component.type);
    
    return (
      <g key={component.id}>
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={component.position.x - 5}
            y={component.position.y - 5}
            width={size.width + 10}
            height={size.height + 10}
            fill="none"
            stroke="#1976d2"
            strokeWidth={2}
            strokeDasharray="5,5"
            rx={8}
          />
        )}
        
        {/* Component body */}
        <rect
          x={component.position.x}
          y={component.position.y}
          width={size.width}
          height={size.height}
          fill={color}
          stroke={isSelected ? '#1976d2' : '#666'}
          strokeWidth={isSelected ? 2 : 1}
          rx={5}
          onMouseDown={(e) => handleComponentMouseDown(e, component.id)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.7 : 1
          }}
        />
        
        {/* Component label */}
        <text
          x={component.position.x + size.width / 2}
          y={component.position.y + size.height / 2 - 5}
          textAnchor="middle"
          fontSize={10}
          fill="white"
          fontWeight="bold"
          style={{ 
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {component.name}
        </text>
        
        {/* Component type label */}
        <text
          x={component.position.x + size.width / 2}
          y={component.position.y + size.height / 2 + 8}
          textAnchor="middle"
          fontSize={8}
          fill="white"
          style={{ 
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {component.type}
        </text>

        {/* Pins */}
        {component.pins.map((pin) => {
          // Positionner les broches à l'intérieur du composant
          const pinX = component.position.x + size.width / 2 + pin.position.x;
          const pinY = component.position.y + size.height / 2 + pin.position.y;
          
          return (
            <g key={pin.id}>
              <circle
                cx={pinX}
                cy={pinY}
                r={5}
                fill={pin.connected ? '#4caf50' : '#fff'}
                stroke={pin.type === 'power' ? '#f44336' : 
                        pin.type === 'ground' ? '#000' : '#666'}
                strokeWidth={2}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinClick(component.id, pin.id, pinX, pinY);
                }}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={pinX + (pin.position.x > 0 ? 8 : -8)}
                y={pinY + 3}
                fontSize={8}
                fill="#333"
                textAnchor={pin.position.x > 0 ? 'start' : 'end'}
                style={{ pointerEvents: 'none' }}
              >
                {pin.name}
              </text>
            </g>
          );
        })}
        
        {/* Resize handles for selected component */}
        {isSelected && (
          <>
            <circle
              cx={component.position.x + size.width}
              cy={component.position.y + size.height}
              r={4}
              fill="#1976d2"
              stroke="white"
              strokeWidth={1}
              style={{ cursor: 'nw-resize' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                // TODO: Implement resize functionality
              }}
            />
          </>
        )}
      </g>
    );
  };

  const renderConnection = (connection: WiringConnection) => {
    if (!diagram) return null;
    
    const fromComponent = diagram.components.find(c => c.id === connection.fromComponent);
    const toComponent = diagram.components.find(c => c.id === connection.toComponent);
    
    if (!fromComponent || !toComponent) return null;
    
    const fromPin = fromComponent.pins.find(p => p.id === connection.fromPin);
    const toPin = toComponent.pins.find(p => p.id === connection.toPin);
    
    if (!fromPin || !toPin) return null;
    
    // Calculer les tailles des composants pour les connexions
    const getComponentSize = (type: string) => {
      const typeStr = type.toLowerCase();
      if (typeStr.includes('microcontroller') || typeStr.includes('arduino')) {
        return { width: 80, height: 60 };
      } else if (typeStr.includes('display') || typeStr.includes('écran')) {
        return { width: 70, height: 50 };
      } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
        return { width: 50, height: 40 };
      } else if (typeStr.includes('battery') || typeStr.includes('batterie')) {
        return { width: 40, height: 60 };
      }
      return { width: 60, height: 40 };
    };

    const fromSize = getComponentSize(fromComponent.type);
    const toSize = getComponentSize(toComponent.type);
    
    const fromX = fromComponent.position.x + fromSize.width / 2 + fromPin.position.x;
    const fromY = fromComponent.position.y + fromSize.height / 2 + fromPin.position.y;
    const toX = toComponent.position.x + toSize.width / 2 + toPin.position.x;
    const toY = toComponent.position.y + toSize.height / 2 + toPin.position.y;
    
    const isSelected = selectedConnection === connection.id;
    const wireColor = connection.wireColor || '#000';
    const hasError = connection.error;
    
    return (
      <line
        key={connection.id}
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke={hasError ? '#f44336' : isSelected ? '#1976d2' : wireColor}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={hasError ? "5,5" : undefined}
        onClick={() => onSelectionChange(connection.id, null)}
        style={{ cursor: 'pointer' }}
      />
    );
  };

  const renderConnectionInProgress = () => {
    if (!connectionInProgress) return null;
    
    return (
      <line
        x1={connectionInProgress.startX}
        y1={connectionInProgress.startY}
        x2={connectionInProgress.currentX}
        y2={connectionInProgress.currentY}
        stroke="#1976d2"
        strokeWidth={2}
        strokeDasharray="5,5"
      />
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box>
        {/* First row - Components */}
        <Toolbar variant="dense" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mr: 2 }}>
            Composants disponibles:
          </Typography>
          {materials.map((material) => {
            const currentlyUsed = usedQuantities[material.id] || 0;
            const availableQuantity = material.quantity || 1;
            const isMaxedOut = currentlyUsed >= availableQuantity;
            
            return (
              <Chip
                key={material.id}
                label={`${material.name || 'Component'} (${currentlyUsed}/${availableQuantity})`}
                variant={isMaxedOut ? "filled" : "outlined"}
                size="small"
                icon={<AddIcon />}
                onClick={() => !isMaxedOut && handleAddComponent(material)}
                disabled={isMaxedOut}
                color={isMaxedOut ? "default" : "primary"}
                sx={{ 
                  mr: 1,
                  opacity: isMaxedOut ? 0.5 : 1,
                  cursor: isMaxedOut ? 'not-allowed' : 'pointer'
                }}
              />
            );
          })}
        </Toolbar>

        {/* Second row - Controls */}
        <Toolbar variant="dense" sx={{ bgcolor: 'background.default', minHeight: 40 }}>
          {/* Canvas Size Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 3 }}>
            <Typography variant="caption" sx={{ mr: 1, fontWeight: 'bold' }}>
              Zone:
            </Typography>
            <Tooltip title="Réduire largeur">
              <IconButton size="small" onClick={handleShrinkWidth}>
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Agrandir largeur">
              <IconButton size="small" onClick={handleExpandWidth}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Réduire hauteur">
              <IconButton size="small" onClick={handleShrinkHeight}>
                <ExpandLessIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Agrandir hauteur">
              <IconButton size="small" onClick={handleExpandHeight}>
                <ExpandMoreIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {svgSize.width}×{svgSize.height}
            </Typography>
          </Box>

          {/* Zoom and Pan Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 3 }}>
            <Typography variant="caption" sx={{ mr: 1, fontWeight: 'bold' }}>
              Zoom:
            </Typography>
            <Tooltip title="Zoom avant">
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="Zoom arrière">
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Réinitialiser la vue">
              <IconButton size="small" onClick={handleResetView}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Typography variant="caption" color="text.secondary">
            Glisser composant: déplacer • Clic droit: supprimer • Glisser zone vide: naviguer • Molette: zoom
          </Typography>
        </Toolbar>
      </Box>

      {/* Canvas */}
      <Box 
        sx={{ flex: 1, bgcolor: '#fafafa', position: 'relative', overflow: 'hidden' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          width={svgSize.width}
          height={svgSize.height}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleSvgMouseDown}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: isPanning ? 'grabbing' : 'default' }}
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#ddd" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Main group with zoom and pan transformations */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Connections */}
            {diagram?.connections.map(renderConnection)}
            
            {/* Connection in progress */}
            {renderConnectionInProgress()}
            
            {/* Components */}
            {diagram?.components.map(renderComponent)}
          </g>
        </svg>
        
        {/* Instructions overlay */}
        {(!diagram || diagram.components.length === 0) && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'text.secondary',
              pointerEvents: 'none'
            }}
          >
            <CableIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Aucun composant dans le schéma
            </Typography>
            <Typography variant="body2">
              Cliquez sur un composant dans la barre d'outils pour commencer
            </Typography>
          </Box>
        )}
        
        {/* Connection instructions */}
        {connectionInProgress && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              bgcolor: 'info.light',
              color: 'info.contrastText',
              p: 1,
              borderRadius: 1,
              pointerEvents: 'none'
            }}
          >
            <Typography variant="caption">
              Cliquez sur une broche de destination pour terminer la connexion
            </Typography>
          </Box>
        )}
        
        {/* Selected component info */}
        {selectedComponent && diagram && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              p: 1,
              borderRadius: 1,
              minWidth: 200
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              Composant sélectionné:
            </Typography>
            <Typography variant="body2">
              {diagram.components.find(c => c.id === selectedComponent)?.name}
            </Typography>
            <Typography variant="caption">
              Glissez pour déplacer • Clic droit pour supprimer
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WiringEditor; 