import { prisma } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import { prompts } from '../config/prompts';

export interface ComponentDimensions {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  pcb_thickness_mm?: number;
}

export interface PortSpec {
  type: string;
  position: { x_mm: number; y_mm: number; z_mm: number };
  orientation: string;
  dimensions: { width_mm: number; height_mm: number };
}

export interface MountingSpec {
  holes: Array<{
    diameter_mm: number;
    position: { x_mm: number; y_mm: number };
  }>;
  standoff_height_mm: number;
  screw_type: string;
}

export interface ClearanceSpec {
  top_mm: number;
  sides_mm: number;
  bottom_mm: number;
  thermal_zone_mm?: number;
}

export interface ComponentSpecs {
  id: string;
  name: string;
  dimensions: ComponentDimensions;
  ports: PortSpec[];
  mounting: MountingSpec;
  clearances: ClearanceSpec;
}

export interface HardwareSpecs {
  components: ComponentSpecs[];
  analysisMetadata: {
    extractedBy: string;
    extractionMethod: string;
    confidence: number;
    timestamp: Date;
  };
}

export class HardwareAnalysisService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Analyze all components in a project and extract technical specifications
   */
  async analyzeProjectHardware(projectId: string): Promise<HardwareSpecs> {
    console.log(`[HardwareAnalysis] Starting hardware analysis for project ${projectId}`);
    
    try {
      // Get project and its components
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          components: {
            include: {
              currentVersion: true
            }
          }
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.components || project.components.length === 0) {
        console.log(`[HardwareAnalysis] No components found for project ${projectId}`);
        return {
          components: [],
          analysisMetadata: {
            extractedBy: 'ai_agent',
            extractionMethod: 'component_list_empty',
            confidence: 1.0,
            timestamp: new Date()
          }
        };
      }

      // Extract component specifications using AI
      const componentSpecs = await this.extractComponentSpecifications(
        project.description || '',
        project.components
      );

      // Store component specs in database
      await this.storeComponentSpecs(componentSpecs);

      console.log(`[HardwareAnalysis] Successfully analyzed ${componentSpecs.length} components`);

      return {
        components: componentSpecs,
        analysisMetadata: {
          extractedBy: 'ai_agent',
          extractionMethod: 'llm_extraction',
          confidence: 0.85, // Default confidence for AI extraction
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error(`[HardwareAnalysis] Error analyzing hardware for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Extract component specifications using AI analysis
   */
  private async extractComponentSpecifications(
    projectDescription: string,
    components: any[]
  ): Promise<ComponentSpecs[]> {
    console.log(`[HardwareAnalysis] Extracting specifications for ${components.length} components`);

    // Prepare components data for AI analysis
    const componentsData = components.map(comp => ({
      id: comp.id,
      name: comp.currentVersion?.specs?.name || 'Unknown Component',
      type: comp.currentVersion?.specs?.type || 'Unknown',
      description: comp.currentVersion?.specs?.description || '',
      specs: comp.currentVersion?.specs || {}
    }));

    try {
      // Use AI to extract hardware specifications
      const prompt = prompts.hardwareSpecsExtraction
        .replace('{{projectDescription}}', projectDescription)
        .replace('{{components}}', JSON.stringify(componentsData, null, 2));

      const aiResponse = await this.aiService.callOpenAI([
        { role: 'system', content: prompt }
      ], 0.3);

      const parsedResponse = JSON.parse(this.aiService.cleanJsonResponse(aiResponse));
      
      if (!parsedResponse.components || !Array.isArray(parsedResponse.components)) {
        throw new Error('AI response missing components array');
      }

      // Validate and normalize the extracted specifications
      const extractedSpecs: ComponentSpecs[] = parsedResponse.components.map((spec: any) => {
        return this.validateAndNormalizeComponentSpec(spec);
      });

      console.log(`[HardwareAnalysis] Successfully extracted specs for ${extractedSpecs.length} components`);
      return extractedSpecs;

    } catch (error) {
      console.error('[HardwareAnalysis] Error extracting component specifications:', error);
      throw error;
    }
  }

  /**
   * Validate and normalize component specifications from AI
   */
  private validateAndNormalizeComponentSpec(spec: any): ComponentSpecs {
    // Ensure required fields with defaults
    const normalized: ComponentSpecs = {
      id: spec.id || 'unknown',
      name: spec.name || 'Unknown Component',
      dimensions: {
        length_mm: Math.max(1, spec.dimensions?.length_mm || 50),
        width_mm: Math.max(1, spec.dimensions?.width_mm || 30),
        height_mm: Math.max(1, spec.dimensions?.height_mm || 10),
        pcb_thickness_mm: spec.dimensions?.pcb_thickness_mm || 1.6
      },
      ports: Array.isArray(spec.ports) ? spec.ports.map((port: any) => ({
        type: port.type || 'unknown',
        position: {
          x_mm: port.position?.x_mm || 0,
          y_mm: port.position?.y_mm || 0,
          z_mm: port.position?.z_mm || 0
        },
        orientation: port.orientation || 'edge',
        dimensions: {
          width_mm: Math.max(1, port.dimensions?.width_mm || 5),
          height_mm: Math.max(1, port.dimensions?.height_mm || 3)
        }
      })) : [],
      mounting: {
        holes: Array.isArray(spec.mounting?.holes) ? spec.mounting.holes.map((hole: any) => ({
          diameter_mm: Math.max(1, hole.diameter_mm || 2.5),
          position: {
            x_mm: hole.position?.x_mm || 3.5,
            y_mm: hole.position?.y_mm || 3.5
          }
        })) : [
          { diameter_mm: 2.5, position: { x_mm: 3.5, y_mm: 3.5 } },
          { diameter_mm: 2.5, position: { x_mm: 46.5, y_mm: 3.5 } },
          { diameter_mm: 2.5, position: { x_mm: 3.5, y_mm: 26.5 } },
          { diameter_mm: 2.5, position: { x_mm: 46.5, y_mm: 26.5 } }
        ],
        standoff_height_mm: Math.max(1, spec.mounting?.standoff_height_mm || 3),
        screw_type: spec.mounting?.screw_type || 'M2.5'
      },
      clearances: {
        top_mm: Math.max(1, spec.clearances?.top_mm || 5),
        sides_mm: Math.max(1, spec.clearances?.sides_mm || 2),
        bottom_mm: Math.max(0.5, spec.clearances?.bottom_mm || 1),
        thermal_zone_mm: spec.clearances?.thermal_zone_mm || 10
      }
    };

    return normalized;
  }

  /**
   * Generate default specifications when AI extraction fails
   */
  private generateDefaultSpecifications(componentsData: any[]): ComponentSpecs[] {
    console.log('[HardwareAnalysis] Generating default specifications');

    return componentsData.map((comp, index) => {
      // Generate reasonable defaults based on component type
      const componentType = comp.type?.toLowerCase() || '';
      let defaultDims = { length_mm: 50, width_mm: 30, height_mm: 10 };
      let defaultPorts: PortSpec[] = [];

      // Component-specific defaults
      if (componentType.includes('raspberry') || componentType.includes('pi')) {
        defaultDims = { length_mm: 85.6, width_mm: 56, height_mm: 17 };
        defaultPorts = [
          {
            type: 'usb-c',
            position: { x_mm: 10.5, y_mm: 0, z_mm: 8 },
            orientation: 'edge',
            dimensions: { width_mm: 9, height_mm: 3.2 }
          },
          {
            type: 'hdmi',
            position: { x_mm: 32, y_mm: 0, z_mm: 6 },
            orientation: 'edge',
            dimensions: { width_mm: 15, height_mm: 6 }
          }
        ];
      } else if (componentType.includes('arduino')) {
        defaultDims = { length_mm: 68.6, width_mm: 53.4, height_mm: 15 };
        defaultPorts = [
          {
            type: 'usb-b',
            position: { x_mm: 68.6, y_mm: 36, z_mm: 8 },
            orientation: 'edge',
            dimensions: { width_mm: 12, height_mm: 10 }
          }
        ];
      } else if (componentType.includes('esp32')) {
        defaultDims = { length_mm: 51, width_mm: 28, height_mm: 12 };
        defaultPorts = [
          {
            type: 'micro-usb',
            position: { x_mm: 0, y_mm: 14, z_mm: 6 },
            orientation: 'edge',
            dimensions: { width_mm: 8, height_mm: 3 }
          }
        ];
      }

      return {
        id: comp.id,
        name: comp.name,
        dimensions: {
          ...defaultDims,
          pcb_thickness_mm: 1.6
        },
        ports: defaultPorts,
        mounting: {
          holes: [
            { diameter_mm: 2.5, position: { x_mm: 3.5, y_mm: 3.5 } },
            { diameter_mm: 2.5, position: { x_mm: defaultDims.length_mm - 3.5, y_mm: 3.5 } },
            { diameter_mm: 2.5, position: { x_mm: 3.5, y_mm: defaultDims.width_mm - 3.5 } },
            { diameter_mm: 2.5, position: { x_mm: defaultDims.length_mm - 3.5, y_mm: defaultDims.width_mm - 3.5 } }
          ],
          standoff_height_mm: 3,
          screw_type: 'M2.5'
        },
        clearances: {
          top_mm: 5,
          sides_mm: 2,
          bottom_mm: 1,
          thermal_zone_mm: 10
        }
      };
    });
  }

  /**
   * Store component specifications in database
   */
  private async storeComponentSpecs(componentSpecs: ComponentSpecs[]): Promise<void> {
    console.log(`[HardwareAnalysis] Storing ${componentSpecs.length} component specifications`);

    try {
      for (const spec of componentSpecs) {
        // Check if component specs already exist
        const existingSpecs = await prisma.componentSpecs.findUnique({
          where: { componentId: spec.id }
        });

        const specsData = {
          dimensions: spec.dimensions,
          ports: spec.ports,
          constraints: spec.clearances,
          mountingInfo: spec.mounting,
          extractedBy: 'ai_agent',
          confidence: 0.85,
          verified: false
        };

        if (existingSpecs) {
          // Update existing specs
          await prisma.componentSpecs.update({
            where: { componentId: spec.id },
            data: {
              ...specsData,
              dimensions: specsData.dimensions as any,
              ports: specsData.ports as any,
              constraints: specsData.constraints as any,
              mountingInfo: specsData.mountingInfo as any
            }
          });
        } else {
          // Create new specs
          await prisma.componentSpecs.create({
            data: {
              componentId: spec.id,
              ...specsData,
              dimensions: specsData.dimensions as any,
              ports: specsData.ports as any,
              constraints: specsData.constraints as any,
              mountingInfo: specsData.mountingInfo as any
            }
          });
        }
      }

      console.log('[HardwareAnalysis] Successfully stored all component specifications');
    } catch (error) {
      console.error('[HardwareAnalysis] Error storing component specifications:', error);
      throw error;
    }
  }

  /**
   * Get stored component specifications for a project
   */
  async getProjectComponentSpecs(projectId: string): Promise<ComponentSpecs[]> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          components: {
            include: {
              componentSpecs: true,
              currentVersion: true
            }
          }
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const componentSpecs: ComponentSpecs[] = project.components
        .filter(comp => comp.componentSpecs && comp.componentSpecs.length > 0)
        .map(comp => {
          const specs = comp.componentSpecs[0]; // Get latest specs
          return {
            id: comp.id,
            name: (comp.currentVersion?.specs as any)?.name || 'Unknown Component',
            dimensions: specs.dimensions as any,
            ports: specs.ports as any,
            mounting: specs.mountingInfo as any,
            clearances: specs.constraints as any
          };
        });

      return componentSpecs;
    } catch (error) {
      console.error(`[HardwareAnalysis] Error getting component specs for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update component specifications manually
   */
  async updateComponentSpecs(
    componentId: string,
    specs: Partial<ComponentSpecs>
  ): Promise<void> {
    try {
      const updateData: any = {
        verified: true,
        extractedBy: 'manual',
        confidence: 1.0
      };

      if (specs.dimensions) updateData.dimensions = specs.dimensions;
      if (specs.ports) updateData.ports = specs.ports;
      if (specs.mounting) updateData.mountingInfo = specs.mounting;
      if (specs.clearances) updateData.constraints = specs.clearances;

      await prisma.componentSpecs.upsert({
        where: { componentId },
        update: updateData,
        create: {
          componentId,
          ...updateData,
          dimensions: specs.dimensions || {},
          ports: specs.ports || [],
          constraints: specs.clearances || {},
          mountingInfo: specs.mounting || {}
        }
      });

      console.log(`[HardwareAnalysis] Updated specifications for component ${componentId}`);
    } catch (error) {
      console.error(`[HardwareAnalysis] Error updating component specs for ${componentId}:`, error);
      throw error;
    }
  }

  /**
   * Validate component specifications for completeness
   */
  validateComponentSpecs(specs: ComponentSpecs[]): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const spec of specs) {
      // Check required dimensions
      if (!spec.dimensions.length_mm || spec.dimensions.length_mm <= 0) {
        errors.push(`Component ${spec.name}: Invalid length dimension`);
      }
      if (!spec.dimensions.width_mm || spec.dimensions.width_mm <= 0) {
        errors.push(`Component ${spec.name}: Invalid width dimension`);
      }
      if (!spec.dimensions.height_mm || spec.dimensions.height_mm <= 0) {
        errors.push(`Component ${spec.name}: Invalid height dimension`);
      }

      // Check mounting holes
      if (!spec.mounting.holes || spec.mounting.holes.length === 0) {
        warnings.push(`Component ${spec.name}: No mounting holes defined`);
      }

      // Check port definitions
      if (spec.ports.length === 0) {
        warnings.push(`Component ${spec.name}: No ports defined`);
      }

      // Check clearances
      if (spec.clearances.top_mm <= 0 || spec.clearances.sides_mm <= 0) {
        warnings.push(`Component ${spec.name}: Insufficient clearances defined`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}
