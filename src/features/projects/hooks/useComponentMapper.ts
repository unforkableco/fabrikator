import { WiringComponent, WiringPin } from '../../../shared/types';

export const useComponentMapper = () => {
  /**
   * Extrait les broches depuis les spécifications techniques d'un matériau
   */
  const extractPinsFromTechnicalSpecs = (material: any): WiringPin[] => {
    const specs = material.currentVersion?.specs || {};
    const technicalSpecs = specs.requirements || {};
    const productReference = specs.productReference || {};
    
    const pins: WiringPin[] = [];
    const componentType = (specs.type || material.type || '').toLowerCase();
    
    console.log('🔧 useComponentMapper - Extracting pins from technical specs:', {
      materialName: specs.name || material.name,
      componentType,
      technicalSpecs,
      productReference: productReference.name
    });
    
    // 1. Analyser les spécifications techniques pour extraire les informations de broches
    Object.entries(technicalSpecs).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const valueStr = String(value).toLowerCase();
      
      // Chercher des patterns de broches dans les spécifications
      if (keyLower.includes('pin') || keyLower.includes('broche') || keyLower.includes('gpio')) {
        const digitalPins = valueStr.match(/(\d+)\s*digital/i);
        const analogPins = valueStr.match(/(\d+)\s*analog/i);
        const gpioPins = valueStr.match(/(\d+)\s*gpio/i);
        
        if (digitalPins) {
          const count = parseInt(digitalPins[1]);
          for (let i = 0; i < Math.min(count, 14); i++) {
            pins.push({
              id: `d${i}`,
              name: `D${i}`,
              type: 'digital',
              position: { x: i < 7 ? -60 : 60, y: -40 + (i % 7) * 12 },
              connected: false
            });
          }
        }
        
        if (analogPins) {
          const count = parseInt(analogPins[1]);
          for (let i = 0; i < Math.min(count, 8); i++) {
            pins.push({
              id: `a${i}`,
              name: `A${i}`,
              type: 'analog',
              position: { x: 0, y: -40 + i * 10 },
              connected: false
            });
          }
        }
        
        if (gpioPins) {
          const count = parseInt(gpioPins[1]);
          for (let i = 0; i < Math.min(count, 10); i++) {
            pins.push({
              id: `gpio${i}`,
              name: `GPIO${i}`,
              type: 'digital',
              position: { x: i < 5 ? -50 : 50, y: -30 + (i % 5) * 15 },
              connected: false
            });
          }
        }
      }
      
      // Interfaces de communication
      if (keyLower.includes('interface') || keyLower.includes('communication')) {
        if (valueStr.includes('i2c') || valueStr.includes('iic')) {
          pins.push(
            { id: 'sda', name: 'SDA', type: 'digital', position: { x: 40, y: -20 }, connected: false },
            { id: 'scl', name: 'SCL', type: 'digital', position: { x: 40, y: 20 }, connected: false }
          );
        }
        if (valueStr.includes('spi')) {
          pins.push(
            { id: 'mosi', name: 'MOSI', type: 'digital', position: { x: 40, y: -30 }, connected: false },
            { id: 'miso', name: 'MISO', type: 'digital', position: { x: 40, y: -10 }, connected: false },
            { id: 'sck', name: 'SCK', type: 'digital', position: { x: 40, y: 10 }, connected: false },
            { id: 'ss', name: 'SS', type: 'digital', position: { x: 40, y: 30 }, connected: false }
          );
        }
        if (valueStr.includes('uart') || valueStr.includes('serial')) {
          pins.push(
            { id: 'tx', name: 'TX', type: 'digital', position: { x: 40, y: -15 }, connected: false },
            { id: 'rx', name: 'RX', type: 'digital', position: { x: 40, y: 15 }, connected: false }
          );
        }
      }
      
      // Voltage et alimentation
      if (keyLower.includes('voltage') || keyLower.includes('power') || keyLower.includes('supply')) {
        const voltage3v3 = valueStr.includes('3.3v') || valueStr.includes('3v3');
        const voltage5v = valueStr.includes('5v');
        
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -25 }, connected: false, voltage: voltage3v3 ? 3.3 : 5.0 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 25 }, connected: false });
        
        if (voltage3v3) {
          pins.push({ id: '3v3', name: '3V3', type: 'power', position: { x: -40, y: -10 }, connected: false, voltage: 3.3 });
        }
        if (voltage5v) {
          pins.push({ id: '5v', name: '5V', type: 'power', position: { x: -40, y: 5 }, connected: false, voltage: 5.0 });
        }
      }
    });
    
    // 2. Générer des broches spécifiques basées sur le type de composant et références produit
    if (componentType.includes('arduino') || productReference.name?.toLowerCase().includes('arduino')) {
      // Arduino Uno R3 standard pinout
      if (!pins.some(p => p.name.startsWith('D'))) {
        for (let i = 0; i <= 13; i++) {
          pins.push({
            id: `d${i}`,
            name: `D${i}`,
            type: 'digital',
            position: { x: i < 7 ? -60 : 60, y: -40 + (i % 7) * 12 },
            connected: false
          });
        }
      }
      if (!pins.some(p => p.name.startsWith('A'))) {
        for (let i = 0; i <= 5; i++) {
          pins.push({
            id: `a${i}`,
            name: `A${i}`,
            type: 'analog',
            position: { x: 0, y: -30 + i * 10 },
            connected: false
          });
        }
      }
      // Broches d'alimentation et contrôle
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -25 }, connected: false, voltage: 5.0 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 25 }, connected: false });
        pins.push({ id: '3v3', name: '3V3', type: 'power', position: { x: -40, y: -10 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'reset', name: 'RESET', type: 'digital', position: { x: -40, y: 5 }, connected: false });
      }
    } else if (componentType.includes('esp32') || productReference.name?.toLowerCase().includes('esp32')) {
      // ESP32 specific pinout
      if (!pins.some(p => p.name.startsWith('GPIO'))) {
        const availableGPIOs = [0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
        availableGPIOs.forEach((gpio, index) => {
          pins.push({
            id: `gpio${gpio}`,
            name: `GPIO${gpio}`,
            type: 'digital',
            position: { x: index < 10 ? -60 : 60, y: -40 + (index % 10) * 8 },
            connected: false
          });
        });
      }
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -30 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 30 }, connected: false });
        pins.push({ id: '3v3', name: '3V3', type: 'power', position: { x: -40, y: -15 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'en', name: 'EN', type: 'digital', position: { x: -40, y: 0 }, connected: false });
      }
    } else if (componentType.includes('sensor')) {
      // Capteurs génériques
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -20 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 20 }, connected: false });
        pins.push({ id: 'data', name: 'DATA', type: 'analog', position: { x: 30, y: 0 }, connected: false });
        
        if (componentType.includes('analog')) {
          pins.push({ id: 'aout', name: 'AOUT', type: 'analog', position: { x: 30, y: -15 }, connected: false });
        }
        if (componentType.includes('digital')) {
          pins.push({ id: 'dout', name: 'DOUT', type: 'digital', position: { x: 30, y: 15 }, connected: false });
        }
      }
    } else if (componentType.includes('display') || componentType.includes('oled') || componentType.includes('lcd')) {
      // Écrans
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -40, y: -30 }, connected: false, voltage: 3.3 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -40, y: 30 }, connected: false });
        
        // Par défaut I2C
        if (!pins.some(p => p.id === 'sda')) {
          pins.push({ id: 'sda', name: 'SDA', type: 'digital', position: { x: 40, y: -20 }, connected: false });
          pins.push({ id: 'scl', name: 'SCL', type: 'digital', position: { x: 40, y: 20 }, connected: false });
        }
      }
    } else if (componentType.includes('relay')) {
      // Relais
      if (!pins.some(p => p.id === 'vcc')) {
        pins.push({ id: 'vcc', name: 'VCC', type: 'power', position: { x: -30, y: -20 }, connected: false, voltage: 5.0 });
        pins.push({ id: 'gnd', name: 'GND', type: 'ground', position: { x: -30, y: 20 }, connected: false });
        pins.push({ id: 'in', name: 'IN', type: 'digital', position: { x: 30, y: -15 }, connected: false });
        pins.push({ id: 'com', name: 'COM', type: 'power', position: { x: 30, y: 0 }, connected: false });
        pins.push({ id: 'no', name: 'NO', type: 'power', position: { x: 30, y: 15 }, connected: false });
      }
    } else if (componentType.includes('battery') || componentType.includes('power')) {
      // Batteries et alimentations
      if (!pins.some(p => p.id === 'positive')) {
        pins.push({ id: 'positive', name: '+', type: 'power', position: { x: 0, y: -25 }, connected: false, voltage: 12 });
        pins.push({ id: 'negative', name: '-', type: 'ground', position: { x: 0, y: 25 }, connected: false });
      }
    }
    
    // 3. Broches génériques si aucune trouvée
    if (pins.length === 0) {
      pins.push(
        { id: 'vcc', name: 'VCC', type: 'power', position: { x: -25, y: -15 }, connected: false, voltage: 3.3 },
        { id: 'gnd', name: 'GND', type: 'ground', position: { x: -25, y: 15 }, connected: false },
        { id: 'signal', name: 'SIGNAL', type: 'digital', position: { x: 25, y: 0 }, connected: false }
      );
    }
    
    console.log('🔧 useComponentMapper - Generated pins from technical specs:', pins.map(p => ({ id: p.id, name: p.name, type: p.type })));
    
    return pins;
  };

  // Helper function to create component from material using technical specifications
  const createComponentFromMaterial = (material: any, index: number): WiringComponent => {
    const specs = material.currentVersion?.specs || {};
    const componentType = specs.type?.toLowerCase() || 'unknown';
    
    console.log('🔧 useComponentMapper - Creating component from material with technical specs:', material);
    
    // Utiliser les spécifications techniques réelles pour générer les broches
    const pins = extractPinsFromTechnicalSpecs(material);
    
    // Disposition en grille compacte
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
    extractPinsFromTechnicalSpecs,
    createComponentFromMaterial
  };
}; 