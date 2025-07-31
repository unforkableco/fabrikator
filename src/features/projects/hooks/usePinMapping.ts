import { WiringPin } from '../../../shared/types';

export const usePinMapping = () => {
  // Fonction pour mapper intelligemment les noms de broches
  const mapPinName = (suggestedPin: string, availablePins: WiringPin[]): string => {
    console.log('usePinMapping - Suggested pin:', suggestedPin, 'Available pins:', availablePins.map(p => ({ id: p.id, name: p.name, type: p.type })));
    
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

    // Data/Signals
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

  return {
    mapPinName
  };
}; 