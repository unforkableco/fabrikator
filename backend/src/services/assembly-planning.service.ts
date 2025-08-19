import { prisma } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import { prompts } from '../config/prompts';
import { HardwareSpecs, ComponentSpecs } from './hardware-analysis.service';

export interface AssemblyStrategy {
  splitMethod: string;
  mainParts: string[];
  assemblySequence: string[];
}

export interface InterfaceFeatures {
  screwHoles?: number;
  screwType?: string;
  alignmentPins?: number;
  sealingLip?: boolean;
  snapFits?: number;
  clips?: number;
}

export interface ToleranceSpec {
  fit_type: 'clearance' | 'interference' | 'transition';
  gap_mm: number;
  tolerance_class?: string;
}

export interface PartInterface {
  partA: string;
  partB: string;
  connectionType: 'screw' | 'clip' | 'press-fit' | 'snap' | 'slide' | 'adhesive';
  interfaceFeatures: InterfaceFeatures;
  tolerances: ToleranceSpec;
  assemblyOrder?: number;
  toolsRequired?: string[];
  notes?: string;
}

export interface HardwareIntegration {
  component: string;
  mountingMethod: 'standoffs' | 'direct_mount' | 'clips' | 'adhesive';
  position: { x_mm: number; y_mm: number; z_mm: number };
  accessRequired: string[];
  features: string[];
}

export interface ManufacturingNotes {
  printOrientation: string;
  supportMinimization: string;
  postProcessing: string[];
}

export interface AssemblyPlan {
  assemblyStrategy: AssemblyStrategy;
  partInterfaces: PartInterface[];
  hardwareIntegration: HardwareIntegration[];
  manufacturingNotes: ManufacturingNotes;
  planMetadata: {
    createdBy: string;
    planningMethod: string;
    confidence: number;
    timestamp: Date;
  };
}

export class AssemblyPlanningService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Generate assembly plan for a project
   */
  async generateAssemblyPlan(
    projectId: string,
    hardwareSpecs: HardwareSpecs,
    designAnalysis: string
  ): Promise<AssemblyPlan> {
    console.log(`[AssemblyPlanning] Generating assembly plan for project ${projectId}`);

    try {
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Generate assembly plan using AI
      const assemblyPlan = await this.createAssemblyPlan(
        project.description || '',
        hardwareSpecs,
        designAnalysis
      );

      // Store part interfaces in database
      await this.storePartInterfaces(projectId, assemblyPlan.partInterfaces);

      console.log(`[AssemblyPlanning] Successfully generated assembly plan with ${assemblyPlan.partInterfaces.length} interfaces`);

      return assemblyPlan;

    } catch (error) {
      console.error(`[AssemblyPlanning] Error generating assembly plan for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Create assembly plan using AI analysis
   */
  private async createAssemblyPlan(
    projectDescription: string,
    hardwareSpecs: HardwareSpecs,
    designAnalysis: string
  ): Promise<AssemblyPlan> {
    console.log('[AssemblyPlanning] Creating AI-driven assembly plan');

    try {
      // Prepare context for AI analysis
      const geometryHints = this.extractGeometryHints(designAnalysis);
      const prompt = prompts.assemblyArchitecturePlanning
        .replace('{{projectDescription}}', projectDescription)
        .replace('{{hardwareSpecs}}', JSON.stringify(hardwareSpecs, null, 2))
        .replace('{{designAnalysis}}', designAnalysis)
        .replace('{{geometryHints}}', JSON.stringify(geometryHints, null, 2));

      const aiResponse = await this.aiService.callOpenAI([
        { role: 'system', content: prompt }
      ], 0.3);

      const parsedResponse = JSON.parse(this.aiService.cleanJsonResponse(aiResponse));

      // Validate and normalize the assembly plan
      const assemblyPlan = this.validateAndNormalizeAssemblyPlan(parsedResponse, hardwareSpecs);

      console.log('[AssemblyPlanning] Successfully created assembly plan');
      return assemblyPlan;

    } catch (error) {
      console.error('[AssemblyPlanning] Error creating assembly plan:', error);
      throw error;
    }
  }

  /**
   * Extract coarse geometry hints from the design analysis text
   */
  private extractGeometryHints(designAnalysis: string): Record<string, any> {
    const text = (designAnalysis || '').toLowerCase();
    const hints: Record<string, any> = { overall_shape: 'unknown' };

    const isCyl = /(circular|cylindrical|round|disc|disk|flat cylinder)/i.test(text);
    const isRect = /(rectangular|box|square|cuboid|rectilinear)/i.test(text);

    if (isCyl) hints.overall_shape = 'cylindrical';
    else if (isRect) hints.overall_shape = 'rectangular';

    const diameterMatch = /diameter[^\d]*(\d+(?:\.\d+)?)/i.exec(designAnalysis);
    if (diameterMatch) {
      const mm = parseFloat(diameterMatch[1]);
      if (!Number.isNaN(mm)) hints.target_diameter_mm = mm;
    }

    const heightMatch = /height[^\d]*(\d+(?:\.\d+)?)/i.exec(designAnalysis);
    if (heightMatch) {
      const mm = parseFloat(heightMatch[1]);
      if (!Number.isNaN(mm)) hints.target_height_mm = mm;
    }

    return hints;
  }

  /**
   * Validate and normalize assembly plan from AI
   */
  private validateAndNormalizeAssemblyPlan(
    parsedResponse: any,
    hardwareSpecs: HardwareSpecs
  ): AssemblyPlan {
    // Ensure required assembly strategy
    const assemblyStrategy: AssemblyStrategy = {
      splitMethod: parsedResponse.assemblyStrategy?.splitMethod || 'horizontal_clamshell',
      mainParts: Array.isArray(parsedResponse.assemblyStrategy?.mainParts) 
        ? parsedResponse.assemblyStrategy.mainParts 
        : ['base_shell', 'top_cover'],
      assemblySequence: Array.isArray(parsedResponse.assemblyStrategy?.assemblySequence)
        ? parsedResponse.assemblyStrategy.assemblySequence
        : [
          'Mount electronics in base',
          'Connect cables',
          'Attach top cover',
          'Secure with fasteners'
        ]
    };

    // Normalize part interfaces
    const partInterfaces: PartInterface[] = Array.isArray(parsedResponse.partInterfaces)
      ? parsedResponse.partInterfaces.map((iface: any) => this.normalizePartInterface(iface))
      : this.generateDefaultInterfaces(assemblyStrategy.mainParts);

    // Normalize hardware integration
    const hardwareIntegration: HardwareIntegration[] = Array.isArray(parsedResponse.hardwareIntegration)
      ? parsedResponse.hardwareIntegration.map((hw: any) => this.normalizeHardwareIntegration(hw))
      : this.generateDefaultHardwareIntegration(hardwareSpecs.components);

    // Normalize manufacturing notes
    const manufacturingNotes: ManufacturingNotes = {
      printOrientation: parsedResponse.manufacturingNotes?.printOrientation || 'optimal_for_overhangs',
      supportMinimization: parsedResponse.manufacturingNotes?.supportMinimization || 'designed_for_support_free',
      postProcessing: Array.isArray(parsedResponse.manufacturingNotes?.postProcessing)
        ? parsedResponse.manufacturingNotes.postProcessing
        : ['hole_drilling', 'surface_finishing']
    };

    return {
      assemblyStrategy,
      partInterfaces,
      hardwareIntegration,
      manufacturingNotes,
      planMetadata: {
        createdBy: 'ai_agent',
        planningMethod: 'llm_analysis',
        confidence: 0.8,
        timestamp: new Date()
      }
    };
  }

  /**
   * Normalize a single part interface
   */
  private normalizePartInterface(iface: any): PartInterface {
    return {
      partA: iface.partA || 'unknown_part_a',
      partB: iface.partB || 'unknown_part_b',
      connectionType: this.validateConnectionType(iface.connectionType),
      interfaceFeatures: {
        screwHoles: iface.interfaceFeatures?.screwHoles || 4,
        screwType: iface.interfaceFeatures?.screwType || 'M3',
        alignmentPins: iface.interfaceFeatures?.alignmentPins || 2,
        sealingLip: iface.interfaceFeatures?.sealingLip || false,
        snapFits: iface.interfaceFeatures?.snapFits || 0,
        clips: iface.interfaceFeatures?.clips || 0
      },
      tolerances: {
        fit_type: this.validateFitType(iface.tolerances?.fit_type),
        gap_mm: Math.max(0.1, iface.tolerances?.gap_mm || 0.2),
        tolerance_class: iface.tolerances?.tolerance_class || 'H7/g6'
      },
      assemblyOrder: iface.assemblyOrder || 1,
      toolsRequired: Array.isArray(iface.toolsRequired) ? iface.toolsRequired : ['screwdriver'],
      notes: iface.notes || ''
    };
  }

  /**
   * Normalize hardware integration specification
   */
  private normalizeHardwareIntegration(hw: any): HardwareIntegration {
    return {
      component: hw.component || 'unknown_component',
      mountingMethod: this.validateMountingMethod(hw.mountingMethod),
      position: {
        x_mm: hw.position?.x_mm || 10,
        y_mm: hw.position?.y_mm || 10,
        z_mm: hw.position?.z_mm || 3
      },
      accessRequired: Array.isArray(hw.accessRequired) ? hw.accessRequired : ['ports'],
      features: Array.isArray(hw.features) ? hw.features : ['mounting_posts']
    };
  }

  /**
   * Generate default assembly plan when AI fails
   */
  private generateDefaultAssemblyPlan(hardwareSpecs: HardwareSpecs): AssemblyPlan {
    console.log('[AssemblyPlanning] Generating default assembly plan');

    const mainParts = ['base_shell', 'top_cover'];
    
    return {
      assemblyStrategy: {
        splitMethod: 'horizontal_clamshell',
        mainParts,
        assemblySequence: [
          'Mount electronics in base_shell',
          'Route cables through channels',
          'Place top_cover',
          'Secure with screws'
        ]
      },
      partInterfaces: this.generateDefaultInterfaces(mainParts),
      hardwareIntegration: this.generateDefaultHardwareIntegration(hardwareSpecs.components),
      manufacturingNotes: {
        printOrientation: 'optimal_for_strength',
        supportMinimization: 'minimize_overhangs',
        postProcessing: ['hole_drilling', 'deburring']
      },
      planMetadata: {
        createdBy: 'default_generator',
        planningMethod: 'fallback_default',
        confidence: 0.6,
        timestamp: new Date()
      }
    };
  }

  /**
   * Generate default part interfaces
   */
  private generateDefaultInterfaces(mainParts: string[]): PartInterface[] {
    const interfaces: PartInterface[] = [];

    if (mainParts.length >= 2) {
      interfaces.push({
        partA: mainParts[0],
        partB: mainParts[1],
        connectionType: 'screw',
        interfaceFeatures: {
          screwHoles: 4,
          screwType: 'M3',
          alignmentPins: 2,
          sealingLip: false
        },
        tolerances: {
          fit_type: 'clearance',
          gap_mm: 0.2
        },
        assemblyOrder: 1,
        toolsRequired: ['screwdriver']
      });
    }

    return interfaces;
  }

  /**
   * Generate default hardware integration
   */
  private generateDefaultHardwareIntegration(components: ComponentSpecs[]): HardwareIntegration[] {
    return components.map((comp, index) => ({
      component: comp.name,
      mountingMethod: 'standoffs' as const,
      position: {
        x_mm: 15 + (index * 20),
        y_mm: 15,
        z_mm: 3
      },
      accessRequired: comp.ports.map(port => port.type),
      features: ['mounting_posts', 'port_cutouts', 'cable_routing']
    }));
  }

  /**
   * Store part interfaces in database
   */
  private async storePartInterfaces(
    projectId: string,
    partInterfaces: PartInterface[]
  ): Promise<void> {
    console.log(`[AssemblyPlanning] Storing ${partInterfaces.length} part interfaces`);

    try {
      // Note: We would need actual part IDs from ProjectCadPart table
      // For now, we'll store the interface definitions as metadata
      // This will be properly linked when parts are generated

      // Store interfaces as metadata in a temporary format
      // This will be properly implemented when we have actual part records

      console.log('[AssemblyPlanning] Part interface storage deferred until part generation');

    } catch (error) {
      console.error('[AssemblyPlanning] Error storing part interfaces:', error);
      throw error;
    }
  }

  /**
   * Get assembly plan for a project
   */
  async getAssemblyPlan(projectId: string): Promise<AssemblyPlan | null> {
    try {
      // This would retrieve stored assembly plan from database
      // For now, return null to indicate it needs to be generated
      return null;

    } catch (error) {
      console.error(`[AssemblyPlanning] Error getting assembly plan for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update assembly plan
   */
  async updateAssemblyPlan(
    projectId: string,
    assemblyPlan: Partial<AssemblyPlan>
  ): Promise<void> {
    try {
      // Store updated assembly plan
      console.log(`[AssemblyPlanning] Updating assembly plan for project ${projectId}`);
      
      // Implementation would store the updated plan in database
      
    } catch (error) {
      console.error(`[AssemblyPlanning] Error updating assembly plan for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Validate assembly plan for completeness and consistency
   */
  validateAssemblyPlan(plan: AssemblyPlan): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check assembly strategy
    if (!plan.assemblyStrategy.mainParts || plan.assemblyStrategy.mainParts.length < 2) {
      errors.push('Assembly strategy must include at least 2 main parts');
    }

    if (!plan.assemblyStrategy.assemblySequence || plan.assemblyStrategy.assemblySequence.length === 0) {
      warnings.push('Assembly sequence is empty');
    }

    // Check part interfaces
    if (!plan.partInterfaces || plan.partInterfaces.length === 0) {
      errors.push('No part interfaces defined');
    }

    for (const iface of plan.partInterfaces) {
      if (!iface.partA || !iface.partB) {
        errors.push('Part interface missing part identifiers');
      }

      if (iface.tolerances.gap_mm <= 0) {
        errors.push(`Invalid tolerance gap for interface ${iface.partA}-${iface.partB}`);
      }
    }

    // Check hardware integration
    for (const hw of plan.hardwareIntegration) {
      if (!hw.component) {
        errors.push('Hardware integration missing component identifier');
      }

      if (hw.position.x_mm < 0 || hw.position.y_mm < 0 || hw.position.z_mm < 0) {
        warnings.push(`Hardware integration ${hw.component} has negative position coordinates`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  // Helper validation methods
  private validateConnectionType(type: string): PartInterface['connectionType'] {
    const validTypes: PartInterface['connectionType'][] = ['screw', 'clip', 'press-fit', 'snap', 'slide', 'adhesive'];
    return validTypes.includes(type as any) ? type as PartInterface['connectionType'] : 'screw';
  }

  private validateFitType(type: string): ToleranceSpec['fit_type'] {
    const validTypes: ToleranceSpec['fit_type'][] = ['clearance', 'interference', 'transition'];
    return validTypes.includes(type as any) ? type as ToleranceSpec['fit_type'] : 'clearance';
  }

  private validateMountingMethod(method: string): HardwareIntegration['mountingMethod'] {
    const validMethods: HardwareIntegration['mountingMethod'][] = ['standoffs', 'direct_mount', 'clips', 'adhesive'];
    return validMethods.includes(method as any) ? method as HardwareIntegration['mountingMethod'] : 'standoffs';
  }
}
