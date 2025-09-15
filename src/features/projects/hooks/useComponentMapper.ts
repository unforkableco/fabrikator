import { WiringComponent, WiringPin } from '../../../shared/types';

export const useComponentMapper = () => {
  // Normalise un tableau de noms de pins (string[]) en WiringPin[]
  const toWiringPins = (names: string[]): WiringPin[] => {
    const spacing = 14;
    return names.map((name, i) => ({
      id: name.toLowerCase(),
      name,
      type: ['gnd','ground','-','v-','negative'].includes(name.toLowerCase()) ? 'ground'
           : ['vcc','3v3','5v','vin','+','positive','v+','power'].includes(name.toLowerCase()) ? 'power'
           : name.toLowerCase().startsWith('a') ? 'analog'
           : 'digital',
      position: { x: i % 2 === 0 ? -50 : 50, y: -35 + (i % 10) * spacing },
      connected: false
    }));
  };

  // Helper function to create component from material using technical specifications
  const createComponentFromMaterial = (material: any, index: number, opts?: { presetPins?: WiringPin[] | string[] | null }): WiringComponent => {
    const specs = material.currentVersion?.specs || {};
    const componentType = specs.type?.toLowerCase() || 'unknown';
    

    
    // Use preset pins if provided (from backend componentsToPlace), else read specs.pins if present
    let pins: WiringPin[] = [];
    if (opts && 'presetPins' in (opts || {})) {
      const preset = opts?.presetPins;
      if (preset === null) {
        pins = [];
      } else if (Array.isArray(preset) && preset.length > 0) {
        if (typeof preset[0] === 'string') {
          pins = toWiringPins(preset as string[]);
        } else {
          pins = preset as WiringPin[];
        }
      } else {
        // Aucun preset fourni: utiliser seulement specs.pins si disponible (fallback requirements.pins)
        if (Array.isArray(specs.pins)) {
          pins = toWiringPins((specs.pins as any[]).filter((p: any) => typeof p === 'string'));
        } else if (Array.isArray(specs?.requirements?.pins)) {
          pins = toWiringPins((specs.requirements.pins as any[]).filter((p: any) => typeof p === 'string'));
        } else if (specs.pins === null) {
          pins = [];
        } else {
          pins = [];
        }
      }
    } else {
      // Aucun preset: utiliser uniquement specs.pins (pas d'inférence) avec fallback requirements.pins
      if (Array.isArray(specs.pins)) {
        pins = toWiringPins((specs.pins as any[]).filter((p: any) => typeof p === 'string'));
      } else if (Array.isArray(specs?.requirements?.pins)) {
        pins = toWiringPins((specs.requirements.pins as any[]).filter((p: any) => typeof p === 'string'));
      } else if (specs.pins === null) {
        pins = [];
      } else {
        pins = [];
      }
    }
    
    // Compact grid layout
    const componentsPerRow = 3;
    const componentSpacingX = 150;
    const componentSpacingY = 100;
    const startX = 150;
    const startY = 100;
    
    const row = Math.floor(index / componentsPerRow);
    const col = index % componentsPerRow;
    
    return {
      id: material.id,
      name: specs.name || 'Component',
      type: componentType,
      position: {
        x: startX + (col * componentSpacingX),
        y: startY + (row * componentSpacingY)
      },
      pins
    };
  };

  return {
    createComponentFromMaterial
  };
}; 