import React from 'react';
import { Card } from '@mui/material';
import { WiringDiagram, WiringComponent, WiringConnection } from '../../../../shared/types';
import WiringEditor from './WiringEditor';

interface WiringCanvasProps {
  diagram: WiringDiagram | null;
  materials: any[];
  selectedConnection: string | null;
  selectedComponent: string | null;
  isValidating: boolean;
  onComponentAdd: (component: WiringComponent) => void;
  onConnectionAdd: (connection: WiringConnection) => void;
  onConnectionUpdate: (connectionId: string, updates: Partial<WiringConnection>) => void;
  onConnectionDelete: (connectionId: string) => void;
  onComponentDelete: (componentId: string) => void;
  onComponentUpdate: (componentId: string, updates: Partial<WiringComponent>) => void;
  onSelectionChange: (connectionId: string | null, componentId: string | null) => void;
}

const WiringCanvas: React.FC<WiringCanvasProps> = ({
  diagram,
  materials,
  selectedConnection,
  selectedComponent,
  isValidating,
  onComponentAdd,
  onConnectionAdd,
  onConnectionUpdate,
  onConnectionDelete,
  onComponentDelete,
  onComponentUpdate,
  onSelectionChange
}) => {
  // Ajouter des quantités par défaut aux matériaux s'ils n'en ont pas
  const materialsWithQuantities = materials.map(material => ({
    ...material,
    quantity: material.quantity || 2 // Default 2 of each component
  }));

  return (
    <Card sx={{ 
      flex: 1, 
      p: 1, // Padding réduit pour plus d'espace
      minHeight: 500, // Hauteur minimale augmentée
      overflow: 'hidden' // Évite les débordements
    }}>
      <WiringEditor
        diagram={diagram}
        materials={materialsWithQuantities}
        selectedConnection={selectedConnection}
        selectedComponent={selectedComponent}
        onComponentAdd={onComponentAdd}
        onConnectionAdd={onConnectionAdd}
        onConnectionUpdate={onConnectionUpdate}
        onConnectionDelete={onConnectionDelete}
        onComponentDelete={onComponentDelete}
        onComponentUpdate={onComponentUpdate}
        onSelectionChange={onSelectionChange}
        isValidating={isValidating}
      />
    </Card>
  );
};

export default WiringCanvas; 