import { useState } from 'react';
import { WiringDiagram } from '../../../shared/types';

interface ValidationError {
  id: string;
  type: 'invalid_connection' | 'save_error' | 'missing_component';
  message: string;
  connectionId?: string;
  severity: 'error' | 'warning';
}

interface ValidationResults {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export const useWiringValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  const validateWiring = async (diagramToValidate: WiringDiagram) => {
    setIsValidating(true);
    try {
      // Simulate validation - replace with actual validation logic
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      
      // Basic validation checks
      for (const connection of diagramToValidate.connections) {
        const fromComponent = diagramToValidate.components.find(c => c.id === connection.fromComponent);
        const toComponent = diagramToValidate.components.find(c => c.id === connection.toComponent);
        
        if (!fromComponent || !toComponent) {
          errors.push({
            id: `error-${connection.id}`,
            type: 'invalid_connection',
            message: `Invalid connection: missing component`,
            connectionId: connection.id,
            severity: 'error'
          });
        }

        // Check pin compatibility
        if (fromComponent && toComponent) {
          const fromPin = fromComponent.pins.find(p => p.id === connection.fromPin);
          const toPin = toComponent.pins.find(p => p.id === connection.toPin);
          
          if (!fromPin || !toPin) {
            errors.push({
              id: `error-pin-${connection.id}`,
              type: 'invalid_connection',
              message: `Invalid connection: missing pin`,
              connectionId: connection.id,
              severity: 'error'
            });
          } else {
            // Check voltage compatibility
            if (fromPin.voltage && toPin.voltage && fromPin.voltage !== toPin.voltage) {
              warnings.push({
                id: `warning-voltage-${connection.id}`,
                type: 'invalid_connection',
                message: `Voltage mismatch: ${fromPin.voltage}V to ${toPin.voltage}V`,
                connectionId: connection.id,
                severity: 'warning'
              });
            }

            // Check pin type compatibility
            if (fromPin.type === 'power' && toPin.type === 'ground') {
              errors.push({
                id: `error-short-${connection.id}`,
                type: 'invalid_connection',
                message: `Short circuit: connecting power to ground`,
                connectionId: connection.id,
                severity: 'error'
              });
            }
          }
        }
      }

      // Check for isolated components
      for (const component of diagramToValidate.components) {
        const hasConnections = diagramToValidate.connections.some(
          c => c.fromComponent === component.id || c.toComponent === component.id
        );
        
        if (!hasConnections) {
          warnings.push({
            id: `warning-isolated-${component.id}`,
            type: 'missing_component',
            message: `Component "${component.name}" is not connected`,
            severity: 'warning'
          });
        }
      }
      
      const results: ValidationResults = {
        isValid: errors.length === 0,
        errors,
        warnings
      };
      
      setValidationResults(results);
      
      return results;
    } catch (error) {
      console.error('Error validating wiring:', error);
      const errorResults: ValidationResults = {
        isValid: false,
        errors: [{
          id: 'validation-error',
          type: 'save_error',
          message: 'Failed to validate wiring diagram',
          severity: 'error'
        }],
        warnings: []
      };
      setValidationResults(errorResults);
      return errorResults;
    } finally {
      setIsValidating(false);
    }
  };

  const clearValidation = () => {
    setValidationResults(null);
  };

  const addValidationError = (error: ValidationError) => {
    setValidationResults(prev => {
      if (!prev) {
        return {
          isValid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        ...prev,
        isValid: false,
        errors: [...prev.errors, error]
      };
    });
  };

  return {
    isValidating,
    validationResults,
    validateWiring,
    clearValidation,
    addValidationError
  };
}; 