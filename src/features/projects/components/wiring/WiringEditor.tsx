import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    fromX: number;
    fromY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // État pour suivre les quantités utilisées de chaque matériau
  const [usedQuantities, setUsedQuantities] = useState<Record<string, number>>({});

  // Système de routage intelligent pour éviter les croisements
  const routingGrid = useRef<Map<string, Set<string>>>(new Map());
  const connectionPaths = useRef<Map<string, { x: number, y: number }[]>>(new Map());

  // Fonction helper pour obtenir la taille d'un composant
  const getComponentSize = (type: string) => {
    const typeStr = type.toLowerCase();
    if (typeStr.includes('microcontroller') || typeStr.includes('arduino')) {
      return { width: 120, height: 80 };
    } else if (typeStr.includes('display') || typeStr.includes('écran')) {
      return { width: 100, height: 70 };
    } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
      return { width: 90, height: 60 };
    } else if (typeStr.includes('battery') || typeStr.includes('batterie')) {
      return { width: 70, height: 80 };
    }
    return { width: 90, height: 60 };
  };

  // Fonction pour calculer une clé de grille
  const getGridKey = (x: number, y: number, gridSize: number = 20): string => {
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    return `${gridX},${gridY}`;
  };

  // Fonction pour marquer/libérer des cellules de grille
  const markGridCells = useCallback((path: { x: number, y: number }[], connectionId: string, mark: boolean = true) => {
    const gridSize = 20;
    path.forEach((point, index) => {
      if (index === 0) return; // Skip start point
      const prevPoint = path[index - 1];
      
      // Marquer tous les points entre prevPoint et point
      const steps = Math.max(Math.abs(point.x - prevPoint.x), Math.abs(point.y - prevPoint.y)) / gridSize;
      for (let step = 0; step <= steps; step++) {
        const t = steps === 0 ? 0 : step / steps;
        const x = prevPoint.x + (point.x - prevPoint.x) * t;
        const y = prevPoint.y + (point.y - prevPoint.y) * t;
        const key = getGridKey(x, y, gridSize);
        
        if (mark) {
          if (!routingGrid.current.has(key)) {
            routingGrid.current.set(key, new Set());
          }
          routingGrid.current.get(key)!.add(connectionId);
        } else {
          const cell = routingGrid.current.get(key);
          if (cell) {
            cell.delete(connectionId);
            if (cell.size === 0) {
              routingGrid.current.delete(key);
            }
          }
        }
      }
    });
  }, []);

  // Nettoyer le cache de routage quand le diagramme change
  useEffect(() => {
    if (diagram) {
      // Nettoyer les connexions supprimées du cache
      const currentConnectionIds = new Set(diagram.connections.map(c => c.id));
      
      // Convertir les clés en array pour éviter les problèmes TypeScript
      const cachedConnectionIds = Array.from(connectionPaths.current.keys());
      
      for (const connectionId of cachedConnectionIds) {
        if (!currentConnectionIds.has(connectionId)) {
          const path = connectionPaths.current.get(connectionId);
          if (path) {
            markGridCells(path, connectionId, false);
          }
          connectionPaths.current.delete(connectionId);
        }
      }
    }
  }, [diagram, markGridCells]);

  // Fonction pour vérifier si un chemin est libre
  const isPathClear = (path: { x: number, y: number }[], connectionId: string, gridSize: number = 20): boolean => {
    for (let i = 1; i < path.length; i++) {
      const prevPoint = path[i - 1];
      const point = path[i];
      
      const steps = Math.max(Math.abs(point.x - prevPoint.x), Math.abs(point.y - prevPoint.y)) / gridSize;
      for (let step = 0; step <= steps; step++) {
        const t = steps === 0 ? 0 : step / steps;
        const x = prevPoint.x + (point.x - prevPoint.x) * t;
        const y = prevPoint.y + (point.y - prevPoint.y) * t;
        const key = getGridKey(x, y, gridSize);
        
        const cell = routingGrid.current.get(key);
        if (cell && cell.size > 0 && !cell.has(connectionId)) {
          return false;
        }
      }
    }
    return true;
  };

  // Fonction pour créer un path SVG orthogonal intelligent qui évite les croisements
  const createSmartOrthogonalPath = (
    fromX: number, 
    fromY: number, 
    toX: number, 
    toY: number,
    fromPin: WiringPin,
    toPin: WiringPin,
    fromComponent: WiringComponent,
    toComponent: WiringComponent,
    connectionId: string,
    allConnections: WiringConnection[]
  ): string => {
    // Libérer l'ancien chemin s'il existe
    const oldPath = connectionPaths.current.get(connectionId);
    if (oldPath) {
      markGridCells(oldPath, connectionId, false);
    }

    // Déterminer la direction de sortie de chaque pin
    const getConnectionDirection = (pin: WiringPin, component: WiringComponent) => {
      const componentSize = getComponentSize(component.type);
      const pinPosX = pin.position.x;
      const pinPosY = pin.position.y;
      
      const leftThreshold = -componentSize.width * 0.4;
      const rightThreshold = componentSize.width * 0.4;
      const topThreshold = -componentSize.height * 0.4;
      const bottomThreshold = componentSize.height * 0.4;
      
      if (pinPosX <= leftThreshold) return 'left';
      if (pinPosX >= rightThreshold) return 'right';
      if (pinPosY <= topThreshold) return 'top';
      if (pinPosY >= bottomThreshold) return 'bottom';
      
      const distances = {
        left: Math.abs(pinPosX - leftThreshold),
        right: Math.abs(pinPosX - rightThreshold),
        top: Math.abs(pinPosY - topThreshold),
        bottom: Math.abs(pinPosY - bottomThreshold)
      };
      
      return Object.entries(distances).reduce((a, b) => distances[a[0] as keyof typeof distances] < distances[b[0] as keyof typeof distances] ? a : b)[0] as 'left' | 'right' | 'top' | 'bottom';
    };
    
    const fromDirection = getConnectionDirection(fromPin, fromComponent);
    const toDirection = getConnectionDirection(toPin, toComponent);
    
    // Distance de base pour éviter les composants
    const baseDistance = 30;
    
    // Calculer plusieurs chemins possibles et choisir le meilleur
    const generatePathOptions = (): { x: number, y: number }[][] => {
      const options: { x: number, y: number }[][] = [];
      
      // Option 1: Chemin direct avec offset minimal
      const directPath = generateDirectPath(fromX, fromY, toX, toY, fromDirection, toDirection, baseDistance);
      options.push(directPath);
      
      // Option 2: Chemin avec détour horizontal
      if (Math.abs(toX - fromX) > 60) {
        const midX = fromX + (toX - fromX) * 0.3;
        const horizontalPath = generateHorizontalDetourPath(fromX, fromY, toX, toY, midX, fromDirection, toDirection, baseDistance);
        options.push(horizontalPath);
      }
      
      // Option 3: Chemin avec détour vertical
      if (Math.abs(toY - fromY) > 60) {
        const midY = fromY + (toY - fromY) * 0.3;
        const verticalPath = generateVerticalDetourPath(fromX, fromY, toX, toY, midY, fromDirection, toDirection, baseDistance);
        options.push(verticalPath);
      }
      
      // Option 4: Chemin externe (contourne largement)
      const externalPath = generateExternalPath(fromX, fromY, toX, toY, fromDirection, toDirection, baseDistance * 2);
      options.push(externalPath);
      
      return options;
    };

    const generateDirectPath = (fx: number, fy: number, tx: number, ty: number, fromDir: string, toDir: string, dist: number): { x: number, y: number }[] => {
      const path = [{ x: fx, y: fy }];
      
      // Sortir du composant
      switch (fromDir) {
        case 'left': path.push({ x: fx - dist, y: fy }); break;
        case 'right': path.push({ x: fx + dist, y: fy }); break;
        case 'top': path.push({ x: fx, y: fy - dist }); break;
        case 'bottom': path.push({ x: fx, y: fy + dist }); break;
      }
      
      const lastPoint = path[path.length - 1];
      
      // Aller vers la destination
      if (fromDir === 'left' || fromDir === 'right') {
        if (toDir === 'left' || toDir === 'right') {
          const midY = (lastPoint.y + ty) / 2;
          path.push({ x: lastPoint.x, y: midY });
          path.push({ x: tx + (toDir === 'left' ? -dist : dist), y: midY });
          path.push({ x: tx + (toDir === 'left' ? -dist : dist), y: ty });
        } else {
          path.push({ x: lastPoint.x, y: ty });
        }
      } else {
        if (toDir === 'top' || toDir === 'bottom') {
          const midX = (lastPoint.x + tx) / 2;
          path.push({ x: midX, y: lastPoint.y });
          path.push({ x: midX, y: ty + (toDir === 'top' ? -dist : dist) });
          path.push({ x: tx, y: ty + (toDir === 'top' ? -dist : dist) });
        } else {
          path.push({ x: tx, y: lastPoint.y });
        }
      }
      
      path.push({ x: tx, y: ty });
      return path;
    };

    const generateHorizontalDetourPath = (fx: number, fy: number, tx: number, ty: number, midX: number, fromDir: string, toDir: string, dist: number): { x: number, y: number }[] => {
      const path = [{ x: fx, y: fy }];
      
      // Sortir du composant source
      switch (fromDir) {
        case 'left': path.push({ x: fx - dist, y: fy }); break;
        case 'right': path.push({ x: fx + dist, y: fy }); break;
        case 'top': path.push({ x: fx, y: fy - dist }); break;
        case 'bottom': path.push({ x: fx, y: fy + dist }); break;
      }
      
      const startPoint = path[path.length - 1];
      
      // Aller au point de détour horizontal
      path.push({ x: midX, y: startPoint.y });
      path.push({ x: midX, y: ty });
      path.push({ x: tx, y: ty });
      
      return path;
    };

    const generateVerticalDetourPath = (fx: number, fy: number, tx: number, ty: number, midY: number, fromDir: string, toDir: string, dist: number): { x: number, y: number }[] => {
      const path = [{ x: fx, y: fy }];
      
      // Sortir du composant source
      switch (fromDir) {
        case 'left': path.push({ x: fx - dist, y: fy }); break;
        case 'right': path.push({ x: fx + dist, y: fy }); break;
        case 'top': path.push({ x: fx, y: fy - dist }); break;
        case 'bottom': path.push({ x: fx, y: fy + dist }); break;
      }
      
      const startPoint = path[path.length - 1];
      
      // Aller au point de détour vertical
      path.push({ x: startPoint.x, y: midY });
      path.push({ x: tx, y: midY });
      path.push({ x: tx, y: ty });
      
      return path;
    };

    const generateExternalPath = (fx: number, fy: number, tx: number, ty: number, fromDir: string, toDir: string, dist: number): { x: number, y: number }[] => {
      const path = [{ x: fx, y: fy }];
      
      // Sortir largement du composant
      switch (fromDir) {
        case 'left': path.push({ x: fx - dist, y: fy }); break;
        case 'right': path.push({ x: fx + dist, y: fy }); break;
        case 'top': path.push({ x: fx, y: fy - dist }); break;
        case 'bottom': path.push({ x: fx, y: fy + dist }); break;
      }
      
      const startPoint = path[path.length - 1];
      
      // Contourner largement
      const margin = 50;
      const minX = Math.min(fx, tx) - margin;
      const maxX = Math.max(fx, tx) + margin;
      const minY = Math.min(fy, ty) - margin;
      const maxY = Math.max(fy, ty) + margin;
      
      if (fromDir === 'left' || fromDir === 'right') {
        const detourY = fy < ty ? minY : maxY;
        path.push({ x: startPoint.x, y: detourY });
        path.push({ x: tx, y: detourY });
      } else {
        const detourX = fx < tx ? minX : maxX;
        path.push({ x: detourX, y: startPoint.y });
        path.push({ x: detourX, y: ty });
      }
      
      path.push({ x: tx, y: ty });
      return path;
    };
    
    // Générer les options de chemin
    const pathOptions = generatePathOptions();
    
    // Évaluer chaque option et choisir la meilleure
    let bestPath = pathOptions[0];
    let bestScore = Infinity;
    
    for (const pathOption of pathOptions) {
      if (isPathClear(pathOption, connectionId)) {
        // Calculer un score basé sur la longueur et la complexité
        const length = pathOption.reduce((sum, point, i) => {
          if (i === 0) return 0;
          const prev = pathOption[i - 1];
          return sum + Math.sqrt((point.x - prev.x) ** 2 + (point.y - prev.y) ** 2);
        }, 0);
        
        const complexity = pathOption.length; // Plus de points = plus complexe
        const score = length + complexity * 20;
        
        if (score < bestScore) {
          bestScore = score;
          bestPath = pathOption;
        }
      }
    }
    
    // Marquer le chemin choisi dans la grille
    markGridCells(bestPath, connectionId, true);
    connectionPaths.current.set(connectionId, bestPath);
    
    // Construire le path SVG
    let pathString = `M ${bestPath[0].x} ${bestPath[0].y}`;
    for (let i = 1; i < bestPath.length; i++) {
      pathString += ` L ${bestPath[i].x} ${bestPath[i].y}`;
    }
    
    return pathString;
  };

  // Fonction pour mapper intelligemment les noms de broches
  const mapPinName = (suggestedPin: string, availablePins: WiringPin[]): string => {
    console.log('mapPinName - Suggested pin:', suggestedPin, 'Available pins:', availablePins.map(p => ({ id: p.id, name: p.name, type: p.type })));
    
    // Correspondance exacte d'abord
    const exactMatch = availablePins.find(pin => pin.id === suggestedPin || pin.name === suggestedPin);
    if (exactMatch) {
      console.log('Found exact match:', exactMatch.id);
      return exactMatch.id;
    }

    // Mapping intelligent basé sur les types et noms courants
    const pinMappings: { [key: string]: string[] } = {
      // Alimentation - plus de variations
      'vcc': ['vcc', 'power', '3v3', '5v', 'vin', 'v+', '+', 'positive', '3.3v'],
      'gnd': ['gnd', 'ground', '-', 'v-', 'negative', 'masse'],
      'positive': ['positive', '+', 'vcc', 'power', 'vin', 'v+'],
      'negative': ['negative', '-', 'gnd', 'ground', 'v-'],
      
      // Communication I2C
      'sda': ['sda', 'data', 'i2c_sda', 'serial_data'],
      'scl': ['scl', 'clock', 'i2c_scl', 'serial_clock'],
      
      // GPIO et signaux - plus de variations
      'gpio1': ['gpio1', 'pin1', 'd1', 'digital1', 'io1', 'd0', 'gpio0'],
      'gpio2': ['gpio2', 'pin2', 'd2', 'digital2', 'io2', 'd1'],
      'gpio3': ['gpio3', 'pin3', 'd3', 'digital3', 'io3', 'd2'],
      'gpio4': ['gpio4', 'pin4', 'd4', 'digital4', 'io4', 'd3'],
      'data': ['data', 'signal', 'out', 'output', 'analog', 'sensor'],
      
      // Broches génériques - plus de variations
      'pin1': ['pin1', 'p1', '1', 'input1', 'input', 'in'],
      'pin2': ['pin2', 'p2', '2', 'output1', 'output', 'out']
    };

    // Chercher une correspondance dans les mappings avec plus de tolérance
    for (const [pinId, aliases] of Object.entries(pinMappings)) {
      const pinExists = availablePins.find(pin => pin.id === pinId);
      if (pinExists) {
        const suggestedLower = suggestedPin.toLowerCase();
        const isMatch = aliases.some(alias => {
          const aliasLower = alias.toLowerCase();
          return suggestedLower === aliasLower || 
                 suggestedLower.includes(aliasLower) || 
                 aliasLower.includes(suggestedLower) ||
                 // Correspondance partielle pour les noms composés
                 (suggestedLower.includes(aliasLower.split('_')[0]) && aliasLower.includes('_')) ||
                 (aliasLower.includes(suggestedLower.split('_')[0]) && suggestedLower.includes('_'));
        });
        
        if (isMatch) {
          console.log('Found mapping match:', pinId, 'for suggested:', suggestedPin);
          return pinId;
        }
      }
    }

    // Si aucune correspondance, essayer de trouver par type avec plus de flexibilité
    const suggestedLower = suggestedPin.toLowerCase();
    
    // Alimentation
    if (suggestedLower.includes('power') || suggestedLower.includes('vcc') || 
        suggestedLower.includes('3v') || suggestedLower.includes('5v') || 
        suggestedLower.includes('positive') || suggestedLower.includes('+') ||
        suggestedLower.includes('vin') || suggestedLower.includes('v+')) {
      const powerPin = availablePins.find(pin => pin.type === 'power');
      if (powerPin) {
        console.log('Found power pin by type:', powerPin.id);
        return powerPin.id;
      }
    }
    
    // Masse
    if (suggestedLower.includes('gnd') || suggestedLower.includes('ground') || 
        suggestedLower.includes('negative') || suggestedLower.includes('-') ||
        suggestedLower.includes('masse') || suggestedLower.includes('v-')) {
      const groundPin = availablePins.find(pin => pin.type === 'ground');
      if (groundPin) {
        console.log('Found ground pin by type:', groundPin.id);
        return groundPin.id;
      }
    }

    // Données/Signaux
    if (suggestedLower.includes('data') || suggestedLower.includes('signal') || 
        suggestedLower.includes('analog') || suggestedLower.includes('sensor') ||
        suggestedLower.includes('out') || suggestedLower.includes('output')) {
      const dataPin = availablePins.find(pin => pin.type === 'analog' || pin.type === 'input' || pin.type === 'output');
      if (dataPin) {
        console.log('Found data/signal pin by type:', dataPin.id);
        return dataPin.id;
      }
    }

    // GPIO/Digital
    if (suggestedLower.includes('gpio') || suggestedLower.includes('digital') ||
        suggestedLower.includes('control') || suggestedLower.includes('pin')) {
      const digitalPin = availablePins.find(pin => pin.type === 'digital');
      if (digitalPin) {
        console.log('Found digital pin by type:', digitalPin.id);
        return digitalPin.id;
      }
    }

    // En dernier recours, utiliser la première broche disponible appropriée
    console.log('No specific match found, using fallback logic for:', suggestedPin);
    
    // Essayer de trouver une broche par priorité de type
    let fallbackPin = availablePins.find(pin => pin.type === 'power') || // Priorité aux broches d'alimentation
                      availablePins.find(pin => pin.type === 'ground') || // Puis masse
                      availablePins.find(pin => pin.type === 'digital') || // Puis digital
                      availablePins.find(pin => pin.type === 'analog') || // Puis analog
                      availablePins[0]; // En dernier recours, la première

    const result = fallbackPin ? fallbackPin.id : suggestedPin;
    console.log('Final result for', suggestedPin, ':', result);
    return result;
  };

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

  // Gestion des raccourcis clavier pour le zoom et la suppression
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
      } else {
        // Gestion de la touche Supprimer pour supprimer l'élément sélectionné
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            if (selectedComponent) {
              handleComponentDelete(selectedComponent);
            } else if (selectedConnection) {
              onConnectionDelete(selectedConnection);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponent, selectedConnection]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const materialName = material.name || specs.name || 'Component';
    const materialType = specs.type || material.type || material.category || 'Component';
    
    console.log('Material name:', materialName, 'Type:', materialType); // Debug log
    
    // Generate pins based on component type
    const pins: WiringPin[] = [];
    
    // More flexible type matching
    const typeStr = materialType.toLowerCase();
    
    if (typeStr.includes('microcontroller') || typeStr.includes('arduino') || typeStr.includes('esp')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -60, y: -30 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -60, y: 30 }, connected: false },
        { id: 'gpio1', name: 'GPIO1', type: 'digital', position: { x: 60, y: -30 }, connected: false },
        { id: 'gpio2', name: 'GPIO2', type: 'digital', position: { x: 60, y: -10 }, connected: false },
        { id: 'gpio3', name: 'GPIO3', type: 'digital', position: { x: 60, y: 10 }, connected: false },
        { id: 'gpio4', name: 'GPIO4', type: 'digital', position: { x: 60, y: 30 }, connected: false },
        { id: 'd0', name: 'D0', type: 'digital', position: { x: -60, y: 0 }, connected: false },
        { id: 'a0', name: 'A0', type: 'analog', position: { x: 0, y: 40 }, connected: false },
        { id: 'control', name: 'CTRL', type: 'digital', position: { x: 0, y: -40 }, connected: false }
      );
    } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -20 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 20 }, connected: false },
        { id: 'data', name: 'DATA', type: 'analog', position: { x: 30, y: 0 }, connected: false },
        { id: 'signal', name: 'SIGNAL', type: 'analog', position: { x: 30, y: -15 }, connected: false },
        { id: 'out', name: 'OUT', type: 'output', position: { x: 30, y: 15 }, connected: false }
      );
    } else if (typeStr.includes('display') || typeStr.includes('écran') || typeStr.includes('screen')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -30 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 30 }, connected: false },
        { id: 'sda', name: 'SDA', type: 'digital', position: { x: 40, y: -20 }, connected: false },
        { id: 'scl', name: 'SCL', type: 'digital', position: { x: 40, y: 20 }, connected: false }
      );
    } else if (typeStr.includes('button') || typeStr.includes('bouton')) {
      pins.push(
        { id: 'pin1', name: 'Pin1', type: 'input', position: { x: -40, y: 0 }, connected: false },
        { id: 'pin2', name: 'Pin2', type: 'input', position: { x: 40, y: 0 }, connected: false },
        { id: 'signal', name: 'SIGNAL', type: 'digital', position: { x: 0, y: 20 }, connected: false },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: 0, y: -20 }, connected: false }
      );
    } else if (typeStr.includes('valve') || typeStr.includes('vanne') || typeStr.includes('solenoid')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -15 }, connected: false, voltage: 12 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 15 }, connected: false },
        { id: 'control', name: 'CTRL', type: 'digital', position: { x: 30, y: 0 }, connected: false },
        { id: 'signal', name: 'SIGNAL', type: 'digital', position: { x: 30, y: -15 }, connected: false }
      );
    } else if (typeStr.includes('pump') || typeStr.includes('pompe')) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -15 }, connected: false, voltage: 12 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 15 }, connected: false },
        { id: 'control', name: 'CTRL', type: 'digital', position: { x: 30, y: 0 }, connected: false },
        { id: 'signal', name: 'SIGNAL', type: 'digital', position: { x: 30, y: 15 }, connected: false }
      );
    } else if (typeStr.includes('battery') || typeStr.includes('batterie') || typeStr.includes('power') || typeStr.includes('supply') || typeStr.includes('alimentation')) {
      pins.push(
        { id: 'positive', name: '+', type: 'power', position: { x: 0, y: -25 }, connected: false, voltage: 12 },
        { id: 'negative', name: '-', type: 'ground', position: { x: 0, y: 25 }, connected: false },
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -25, y: 0 }, connected: false, voltage: 12 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: 25, y: 0 }, connected: false }
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
      console.warn(`Maximum quantity reached for ${material.name}: ${availableQuantity}`);
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
        fromX: pinX,
        fromY: pinY,
        currentX: pinX,
        currentY: pinY
      });
    }
  };

  const renderComponent = (component: WiringComponent) => {
    const isSelected = selectedComponent === component.id;
    const isDragging = draggedComponent?.id === component.id;
    
    // Determine component size based on type - Tailles agrandies pour éviter le débordement de texte
    const size = getComponentSize(component.type);
    
    // Couleurs basées sur le type de composant pour une meilleure identification
    const getComponentColor = (type: string) => {
      const typeStr = type.toLowerCase();
      if (typeStr.includes('microcontroller') || typeStr.includes('arduino')) {
        return { primary: '#2196f3', secondary: '#1976d2', text: 'white' };
      } else if (typeStr.includes('display') || typeStr.includes('écran')) {
        return { primary: '#4caf50', secondary: '#388e3c', text: 'white' };
      } else if (typeStr.includes('sensor') || typeStr.includes('capteur')) {
        return { primary: '#ff9800', secondary: '#f57c00', text: 'white' };
      } else if (typeStr.includes('battery') || typeStr.includes('batterie')) {
        return { primary: '#f44336', secondary: '#d32f2f', text: 'white' };
      }
      return { primary: '#9e9e9e', secondary: '#757575', text: 'white' };
    };
    
    const colors = getComponentColor(component.type);
    const mainColor = isSelected ? '#1976d2' : colors.primary;
    const borderColor = isSelected ? '#0d47a1' : colors.secondary;
    
    return (
      <g key={component.id}>
        {/* Ombre pour donner de la profondeur */}
        <rect
          x={component.position.x + 2}
          y={component.position.y + 2}
          width={size.width}
          height={size.height}
          fill="rgba(0,0,0,0.2)"
          rx={8}
        />
        
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={component.position.x - 4}
            y={component.position.y - 4}
            width={size.width + 8}
            height={size.height + 8}
            fill="none"
            stroke="#1976d2"
            strokeWidth={3}
            strokeDasharray="8,4"
            rx={10}
            opacity={0.8}
          />
        )}
        
        {/* Gradient pour le corps du composant */}
        <defs>
          <linearGradient id={`gradient-${component.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={mainColor} />
            <stop offset="100%" stopColor={borderColor} />
          </linearGradient>
        </defs>
        
        {/* Component body */}
        <rect
          x={component.position.x}
          y={component.position.y}
          width={size.width}
          height={size.height}
          fill={`url(#gradient-${component.id})`}
          stroke={borderColor}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          onMouseDown={(e) => handleComponentMouseDown(e, component.id)}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.8 : 1
          }}
        />
        
        {/* Component label - Amélioration de la lisibilité */}
        <text
          x={component.position.x + size.width / 2}
          y={component.position.y + size.height / 2 - 8}
          textAnchor="middle"
          fontSize={12}
          fill="white"
          fontWeight="bold"
          style={{ 
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {component.name}
        </text>
        
        {/* Component type label - Police agrandie */}
        <text
          x={component.position.x + size.width / 2}
          y={component.position.y + size.height / 2 + 10}
          textAnchor="middle"
          fontSize={10}
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
          
          // Couleurs des broches selon leur type
          const getPinColor = (pinType: string) => {
            switch (pinType) {
              case 'power': return { fill: '#f44336', stroke: '#d32f2f' };
              case 'ground': return { fill: '#424242', stroke: '#212121' };
              case 'digital': return { fill: '#2196f3', stroke: '#1976d2' };
              case 'analog': return { fill: '#4caf50', stroke: '#388e3c' };
              default: return { fill: '#9e9e9e', stroke: '#757575' };
            }
          };
          
          const pinColors = getPinColor(pin.type);
          const isConnected = pin.connected;
          
          return (
            <g key={pin.id}>
              {/* Ombre de la broche */}
              <circle
                cx={pinX + 1}
                cy={pinY + 1}
                r={6}
                fill="rgba(0,0,0,0.2)"
              />
              
              {/* Corps de la broche */}
              <circle
                cx={pinX}
                cy={pinY}
                r={6}
                fill={isConnected ? pinColors.fill : '#ffffff'}
                stroke={pinColors.stroke}
                strokeWidth={isConnected ? 3 : 2}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinClick(component.id, pin.id, pinX, pinY);
                }}
                style={{ 
                  cursor: 'pointer',
                  filter: isConnected ? 'brightness(1.1)' : 'none'
                }}
              />
              
              {/* Indicateur de connexion */}
              {isConnected && (
                <circle
                  cx={pinX}
                  cy={pinY}
                  r={3}
                  fill="white"
                />
              )}
              
              {/* Label de la broche avec fond */}
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={pinX + (pin.position.x > 0 ? 10 : -10 - pin.name.length * 4)}
                  y={pinY - 6}
                  width={pin.name.length * 4 + 4}
                  height={12}
                  fill="rgba(255,255,255,0.9)"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth={1}
                  rx={2}
                />
                <text
                  x={pinX + (pin.position.x > 0 ? 12 : -8)}
                  y={pinY + 2}
                  fontSize={8}
                  fill="#333"
                  fontWeight="bold"
                  textAnchor={pin.position.x > 0 ? 'start' : 'end'}
                >
                  {pin.name}
                </text>
              </g>
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
    
    // Utiliser le mapping intelligent pour trouver les broches
    const mappedFromPin = mapPinName(connection.fromPin, fromComponent.pins);
    const mappedToPin = mapPinName(connection.toPin, toComponent.pins);
    
    const fromPin = fromComponent.pins.find(p => p.id === mappedFromPin);
    const toPin = toComponent.pins.find(p => p.id === mappedToPin);
    
    if (!fromPin || !toPin) {
      console.warn(`Connexion invalide: ${connection.fromPin} -> ${connection.toPin}`, {
        fromComponent: fromComponent.name,
        toComponent: toComponent.name,
        availableFromPins: fromComponent.pins.map(p => p.id),
        availableToPins: toComponent.pins.map(p => p.id),
        mappedFromPin,
        mappedToPin
      });
      return null;
    }
    
    const fromSize = getComponentSize(fromComponent.type);
    const toSize = getComponentSize(toComponent.type);
    
    const fromX = fromComponent.position.x + fromSize.width / 2 + fromPin.position.x;
    const fromY = fromComponent.position.y + fromSize.height / 2 + fromPin.position.y;
    const toX = toComponent.position.x + toSize.width / 2 + toPin.position.x;
    const toY = toComponent.position.y + toSize.height / 2 + toPin.position.y;
    
    const isSelected = selectedConnection === connection.id;
    const wireColor = connection.wireColor || '#666';
    const hasError = connection.error;
    
          // Créer le path orthogonal intelligent
      let pathData: string;
      try {
        pathData = createSmartOrthogonalPath(
          fromX, fromY, toX, toY, 
          fromPin, toPin, 
          fromComponent, toComponent,
          connection.id, diagram.connections
        );
      } catch (error) {
        console.warn('Erreur lors de la création du chemin intelligent, utilisation du chemin simple:', error);
        // Fallback vers un chemin simple
        pathData = `M ${fromX} ${fromY} L ${toX} ${toY}`;
      }
    
    return (
      <g key={connection.id}>
        {/* Ombre pour donner de la profondeur */}
        <path
          d={pathData}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={isSelected ? 4 : 3}
          fill="none"
          transform="translate(1,1)"
        />
        {/* Connexion principale */}
        <path
          d={pathData}
          stroke={hasError ? '#f44336' : isSelected ? '#1976d2' : wireColor}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={hasError ? "5,5" : undefined}
          fill="none"
          onClick={() => onSelectionChange(connection.id, null)}
          style={{ 
            cursor: 'pointer',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
        {/* Points de connexion */}
        <circle
          cx={fromX}
          cy={fromY}
          r={isSelected ? 4 : 3}
          fill={hasError ? '#f44336' : isSelected ? '#1976d2' : wireColor}
          stroke="white"
          strokeWidth={1}
        />
        <circle
          cx={toX}
          cy={toY}
          r={isSelected ? 4 : 3}
          fill={hasError ? '#f44336' : isSelected ? '#1976d2' : wireColor}
          stroke="white"
          strokeWidth={1}
        />
        {/* Label de la connexion si sélectionnée */}
        {isSelected && (
          <text
            x={(fromX + toX) / 2}
            y={(fromY + toY) / 2 - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#1976d2"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {`${fromPin.name} → ${toPin.name}`}
          </text>
        )}
      </g>
    );
  };

  const renderConnectionInProgress = () => {
    if (!connectionInProgress) return null;
    
    // Créer un path orthogonal temporaire pour la connexion en cours
    const fromX = connectionInProgress.fromX;
    const fromY = connectionInProgress.fromY;
    const toX = connectionInProgress.currentX;
    const toY = connectionInProgress.currentY;
    
    // Path simple orthogonal pour la connexion temporaire
    let path = `M ${fromX} ${fromY}`;
    
    // Si la distance est suffisante, créer un chemin orthogonal
    const deltaX = Math.abs(toX - fromX);
    const deltaY = Math.abs(toY - fromY);
    
    if (deltaX > 20 || deltaY > 20) {
      if (deltaX > deltaY) {
        // Mouvement principalement horizontal
        const midX = fromX + (toX - fromX) * 0.7;
        path += ` L ${midX} ${fromY} L ${midX} ${toY}`;
      } else {
        // Mouvement principalement vertical
        const midY = fromY + (toY - fromY) * 0.7;
        path += ` L ${fromX} ${midY} L ${toX} ${midY}`;
      }
    }
    
    path += ` L ${toX} ${toY}`;
    
    return (
      <g>
        {/* Ombre pour la connexion temporaire */}
        <path
          d={path}
          stroke="rgba(25, 118, 210, 0.3)"
          strokeWidth={3}
          fill="none"
          transform="translate(1,1)"
        />
        {/* Connexion temporaire */}
        <path
          d={path}
          stroke="#1976d2"
          strokeWidth={2}
          strokeDasharray="5,5"
          fill="none"
          style={{
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
        {/* Point de début */}
        <circle
          cx={fromX}
          cy={fromY}
          r={4}
          fill="#1976d2"
          stroke="white"
          strokeWidth={2}
        />
        {/* Point de fin (curseur) */}
        <circle
          cx={toX}
          cy={toY}
          r={3}
          fill="#1976d2"
          stroke="white"
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box>
        {/* First row - Components */}
        <Box sx={{ 
          bgcolor: 'background.paper', 
          borderBottom: 1, 
          borderColor: 'divider',
          p: 1,
          minHeight: 48
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Available components:
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1,
            alignItems: 'center'
          }}>
            {materials.map((material) => {
              const currentlyUsed = usedQuantities[material.id] || 0;
              const availableQuantity = material.quantity || 1;
              const isMaxedOut = currentlyUsed >= availableQuantity;
              
              // Tronquer le nom s'il est trop long et afficher le nom complet au survol
              const displayName = material.name || 'Component';
              const truncatedName = displayName.length > 15 
                ? `${displayName.substring(0, 15)}...` 
                : displayName;
              
              return (
                <Chip
                  key={material.id}
                  label={`${truncatedName} (${currentlyUsed}/${availableQuantity})`}
                  variant={isMaxedOut ? "filled" : "outlined"}
                  size="small"
                  icon={<AddIcon />}
                  onClick={() => !isMaxedOut && handleAddComponent(material)}
                  disabled={isMaxedOut}
                  color={isMaxedOut ? "default" : "primary"}
                  title={`${displayName} - ${currentlyUsed}/${availableQuantity} used`}
                  sx={{ 
                    opacity: isMaxedOut ? 0.5 : 1,
                    cursor: isMaxedOut ? 'not-allowed' : 'pointer',
                    maxWidth: 200, // Largeur maximale pour éviter les chips trop larges
                    '& .MuiChip-label': {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Second row - Controls */}
        <Toolbar variant="dense" sx={{ bgcolor: 'background.default', minHeight: 40 }}>
          {/* Canvas Size Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 3 }}>
            <Typography variant="caption" sx={{ mr: 1, fontWeight: 'bold' }}>
              Canvas:
            </Typography>
            <Tooltip title="Reduce width">
              <IconButton size="small" onClick={handleShrinkWidth}>
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Increase width">
              <IconButton size="small" onClick={handleExpandWidth}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reduce height">
              <IconButton size="small" onClick={handleShrinkHeight}>
                <ExpandLessIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Increase height">
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
            <Tooltip title="Zoom in">
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="Zoom out">
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset view">
              <IconButton size="small" onClick={handleResetView}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Typography variant="caption" color="text.secondary">
            Drag component: move • Delete key: delete • Drag empty space: navigate • Wheel: zoom
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
              No components in the schema
            </Typography>
            <Typography variant="body2">
              Click on a component in the toolbar to start
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
              Click on a destination pin to complete the connection
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
              Selected component:
            </Typography>
            <Typography variant="body2">
              {diagram.components.find(c => c.id === selectedComponent)?.name}
            </Typography>
            <Typography variant="caption">
              Drag to move • Delete key to delete
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WiringEditor; 