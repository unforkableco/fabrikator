import { AIService } from './ai.service';
import { prompts } from '../config/prompts';
import { AssemblyPlan } from './assembly-planning.service';

export interface MaterialProperties {
  type: string;
  shrinkage_factor: number;
  layer_height_mm: number;
  nozzle_diameter_mm: number;
  bed_temperature_c?: number;
  nozzle_temperature_c?: number;
  print_speed_mm_s?: number;
}

export interface PrintOrientation {
  optimal_face: string;
  rotation: { x: number; y: number; z: number };
  reason: string;
}

export interface SupportRequirements {
  support_free: boolean;
  critical_overhangs: string[];
  support_removal_access: 'good' | 'moderate' | 'poor';
  support_material?: string;
}

export interface GeometryConstraints {
  min_wall_thickness_mm: number;
  min_hole_diameter_mm: number;
  max_overhang_angle_deg: number;
  max_bridge_span_mm: number;
  min_feature_size_mm: number;
}

export interface FitTolerances {
  clearance_fit_mm: number;
  loose_fit_mm: number;
  press_fit_mm: number;
  sliding_fit_mm: number;
}

export interface ToleranceSpec {
  general_tolerance_mm: number;
  fit_tolerances: FitTolerances;
  critical_dimension_tolerance_mm: number;
}

export interface PartConstraints {
  partKey: string;
  printOrientation: PrintOrientation;
  supportRequirements: SupportRequirements;
  geometryConstraints: GeometryConstraints;
  tolerances: ToleranceSpec;
  estimatedPrintTime?: string;
  materialUsage?: { volume_mm3: number; weight_g: number };
}

export interface AssemblyTolerance {
  interface: string;
  tolerance_type: 'clearance' | 'interference' | 'transition';
  gap_mm: number;
  compensation: string;
}

export interface QualityRequirements {
  surface_finish: 'high' | 'standard' | 'draft';
  dimensional_accuracy: string;
  critical_features: string[];
  post_processing_required: string[];
}

export interface ManufacturingConstraints {
  materialProperties: MaterialProperties;
  partConstraints: PartConstraints[];
  assemblyTolerances: AssemblyTolerance[];
  qualityRequirements: QualityRequirements;
  constraintsMetadata: {
    generatedBy: string;
    material: string;
    printer_capability: string;
    timestamp: Date;
  };
}

export class ManufacturingConstraintsService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Generate manufacturing constraints for all parts in an assembly
   */
  async generateManufacturingConstraints(
    partsList: any[],
    assemblyPlan: AssemblyPlan,
    materialType: string = 'PLA'
  ): Promise<ManufacturingConstraints> {
    console.log(`[ManufacturingConstraints] Generating constraints for ${partsList.length} parts with ${materialType}`);

    try {
      // Generate constraints using AI analysis
      const constraints = await this.createManufacturingConstraints(
        partsList,
        assemblyPlan,
        materialType
      );

      console.log(`[ManufacturingConstraints] Successfully generated constraints for ${constraints.partConstraints.length} parts`);
      return constraints;

    } catch (error) {
      console.error('[ManufacturingConstraints] Error generating manufacturing constraints:', error);
      throw error;
    }
  }

  /**
   * Create manufacturing constraints using AI analysis
   */
  private async createManufacturingConstraints(
    partsList: any[],
    assemblyPlan: AssemblyPlan,
    materialType: string
  ): Promise<ManufacturingConstraints> {
    console.log('[ManufacturingConstraints] Creating AI-driven manufacturing constraints');

    try {
      // Prepare context for AI analysis
      const prompt = prompts.manufacturingOptimization
        .replace('{{partsList}}', JSON.stringify(partsList, null, 2))
        .replace('{{assemblyPlan}}', JSON.stringify(assemblyPlan, null, 2))
        .replace('{{materialType}}', materialType);

      const aiResponse = await this.aiService.callOpenAI([
        { role: 'system', content: prompt }
      ], 0.2);

      const parsedResponse = JSON.parse(this.aiService.cleanJsonResponse(aiResponse));

      // Validate and normalize the constraints
      const constraints = this.validateAndNormalizeConstraints(parsedResponse, partsList, materialType);

      console.log('[ManufacturingConstraints] Successfully created manufacturing constraints');
      return constraints;

    } catch (error) {
      console.error('[ManufacturingConstraints] Error creating constraints:', error);
      throw error;
    }
  }

  /**
   * Validate and normalize manufacturing constraints from AI
   */
  private validateAndNormalizeConstraints(
    parsedResponse: any,
    partsList: any[],
    materialType: string
  ): ManufacturingConstraints {
    // Material properties with defaults
    const materialProperties: MaterialProperties = {
      type: materialType,
      shrinkage_factor: this.getMaterialShrinkage(materialType),
      layer_height_mm: parsedResponse.materialProperties?.layer_height_mm || 0.2,
      nozzle_diameter_mm: parsedResponse.materialProperties?.nozzle_diameter_mm || 0.4,
      bed_temperature_c: this.getMaterialBedTemp(materialType),
      nozzle_temperature_c: this.getMaterialNozzleTemp(materialType),
      print_speed_mm_s: parsedResponse.materialProperties?.print_speed_mm_s || 50
    };

    // Normalize part constraints
    const partConstraints: PartConstraints[] = partsList.map((part, index) => {
      const aiConstraint = Array.isArray(parsedResponse.partConstraints)
        ? parsedResponse.partConstraints.find((pc: any) => pc.partKey === part.key)
        : null;

      return this.normalizePartConstraints(part, aiConstraint, materialType);
    });

    // Assembly tolerances
    const assemblyTolerances: AssemblyTolerance[] = Array.isArray(parsedResponse.assemblyTolerances)
      ? parsedResponse.assemblyTolerances.map((at: any) => this.normalizeAssemblyTolerance(at))
      : this.generateDefaultAssemblyTolerances();

    // Quality requirements
    const qualityRequirements: QualityRequirements = {
      surface_finish: this.validateSurfaceFinish(parsedResponse.qualityRequirements?.surface_finish),
      dimensional_accuracy: parsedResponse.qualityRequirements?.dimensional_accuracy || '±0.2mm',
      critical_features: Array.isArray(parsedResponse.qualityRequirements?.critical_features)
        ? parsedResponse.qualityRequirements.critical_features
        : ['mounting_holes', 'interface_surfaces'],
      post_processing_required: Array.isArray(parsedResponse.qualityRequirements?.post_processing_required)
        ? parsedResponse.qualityRequirements.post_processing_required
        : ['support_removal', 'hole_drilling']
    };

    return {
      materialProperties,
      partConstraints,
      assemblyTolerances,
      qualityRequirements,
      constraintsMetadata: {
        generatedBy: 'ai_agent',
        material: materialType,
        printer_capability: 'standard_fdm',
        timestamp: new Date()
      }
    };
  }

  /**
   * Normalize constraints for a single part
   */
  private normalizePartConstraints(
    part: any,
    aiConstraint: any,
    materialType: string
  ): PartConstraints {
    const defaultConstraints = this.getDefaultConstraintsForMaterial(materialType);

    return {
      partKey: part.key || `part_${Date.now()}`,
      printOrientation: {
        optimal_face: aiConstraint?.printOrientation?.optimal_face || 'bottom',
        rotation: aiConstraint?.printOrientation?.rotation || { x: 0, y: 0, z: 0 },
        reason: aiConstraint?.printOrientation?.reason || 'minimize_supports_and_optimize_strength'
      },
      supportRequirements: {
        support_free: aiConstraint?.supportRequirements?.support_free ?? true,
        critical_overhangs: Array.isArray(aiConstraint?.supportRequirements?.critical_overhangs)
          ? aiConstraint.supportRequirements.critical_overhangs
          : [],
        support_removal_access: this.validateSupportAccess(aiConstraint?.supportRequirements?.support_removal_access),
        support_material: aiConstraint?.supportRequirements?.support_material || 'same_material'
      },
      geometryConstraints: {
        min_wall_thickness_mm: Math.max(0.8, aiConstraint?.geometryConstraints?.min_wall_thickness_mm || defaultConstraints.min_wall_thickness_mm),
        min_hole_diameter_mm: Math.max(1.0, aiConstraint?.geometryConstraints?.min_hole_diameter_mm || defaultConstraints.min_hole_diameter_mm),
        max_overhang_angle_deg: Math.min(60, Math.max(30, aiConstraint?.geometryConstraints?.max_overhang_angle_deg || defaultConstraints.max_overhang_angle_deg)),
        max_bridge_span_mm: Math.max(2, aiConstraint?.geometryConstraints?.max_bridge_span_mm || defaultConstraints.max_bridge_span_mm),
        min_feature_size_mm: Math.max(0.4, aiConstraint?.geometryConstraints?.min_feature_size_mm || defaultConstraints.min_feature_size_mm)
      },
      tolerances: {
        general_tolerance_mm: Math.max(0.1, aiConstraint?.tolerances?.general_tolerance_mm || defaultConstraints.general_tolerance_mm),
        fit_tolerances: {
          clearance_fit_mm: Math.max(0.1, aiConstraint?.tolerances?.fit_tolerances?.clearance_fit_mm || defaultConstraints.clearance_fit_mm),
          loose_fit_mm: Math.max(0.2, aiConstraint?.tolerances?.fit_tolerances?.loose_fit_mm || defaultConstraints.loose_fit_mm),
          press_fit_mm: Math.min(-0.05, aiConstraint?.tolerances?.fit_tolerances?.press_fit_mm || defaultConstraints.press_fit_mm),
          sliding_fit_mm: Math.max(0.05, aiConstraint?.tolerances?.fit_tolerances?.sliding_fit_mm || defaultConstraints.sliding_fit_mm)
        },
        critical_dimension_tolerance_mm: Math.max(0.05, aiConstraint?.tolerances?.critical_dimension_tolerance_mm || 0.1)
      },
      estimatedPrintTime: this.estimatePrintTime(part),
      materialUsage: this.estimateMaterialUsage(part)
    };
  }

  /**
   * Normalize assembly tolerance specification
   */
  private normalizeAssemblyTolerance(at: any): AssemblyTolerance {
    return {
      interface: at.interface || 'unknown_interface',
      tolerance_type: this.validateToleranceType(at.tolerance_type),
      gap_mm: Math.max(0.05, at.gap_mm || 0.2),
      compensation: at.compensation || 'none'
    };
  }

  /**
   * Generate default manufacturing constraints
   */
  private generateDefaultConstraints(
    partsList: any[],
    materialType: string
  ): ManufacturingConstraints {
    console.log('[ManufacturingConstraints] Generating default constraints');

    const defaultConstraints = this.getDefaultConstraintsForMaterial(materialType);

    const partConstraints: PartConstraints[] = partsList.map(part => ({
      partKey: part.key || `part_${Date.now()}`,
      printOrientation: {
        optimal_face: 'bottom',
        rotation: { x: 0, y: 0, z: 0 },
        reason: 'default_orientation_for_stability'
      },
      supportRequirements: {
        support_free: true,
        critical_overhangs: [],
        support_removal_access: 'good' as const
      },
      geometryConstraints: {
        min_wall_thickness_mm: defaultConstraints.min_wall_thickness_mm,
        min_hole_diameter_mm: defaultConstraints.min_hole_diameter_mm,
        max_overhang_angle_deg: defaultConstraints.max_overhang_angle_deg,
        max_bridge_span_mm: defaultConstraints.max_bridge_span_mm,
        min_feature_size_mm: defaultConstraints.min_feature_size_mm
      },
      tolerances: {
        general_tolerance_mm: defaultConstraints.general_tolerance_mm,
        fit_tolerances: {
          clearance_fit_mm: defaultConstraints.clearance_fit_mm,
          loose_fit_mm: defaultConstraints.loose_fit_mm,
          press_fit_mm: defaultConstraints.press_fit_mm,
          sliding_fit_mm: defaultConstraints.sliding_fit_mm
        },
        critical_dimension_tolerance_mm: 0.1
      }
    }));

    return {
      materialProperties: {
        type: materialType,
        shrinkage_factor: this.getMaterialShrinkage(materialType),
        layer_height_mm: 0.2,
        nozzle_diameter_mm: 0.4,
        bed_temperature_c: this.getMaterialBedTemp(materialType),
        nozzle_temperature_c: this.getMaterialNozzleTemp(materialType)
      },
      partConstraints,
      assemblyTolerances: this.generateDefaultAssemblyTolerances(),
      qualityRequirements: {
        surface_finish: 'standard',
        dimensional_accuracy: '±0.2mm',
        critical_features: ['mounting_holes', 'interface_surfaces'],
        post_processing_required: ['support_removal', 'deburring']
      },
      constraintsMetadata: {
        generatedBy: 'default_generator',
        material: materialType,
        printer_capability: 'standard_fdm',
        timestamp: new Date()
      }
    };
  }

  /**
   * Get default constraints for a specific material
   */
  private getDefaultConstraintsForMaterial(materialType: string) {
    const materials: Record<string, any> = {
      'PLA': {
        min_wall_thickness_mm: 1.2,
        min_hole_diameter_mm: 2.0,
        max_overhang_angle_deg: 45,
        max_bridge_span_mm: 5.0,
        min_feature_size_mm: 0.4,
        general_tolerance_mm: 0.2,
        clearance_fit_mm: 0.3,
        loose_fit_mm: 0.5,
        press_fit_mm: -0.1,
        sliding_fit_mm: 0.15
      },
      'PETG': {
        min_wall_thickness_mm: 1.0,
        min_hole_diameter_mm: 1.8,
        max_overhang_angle_deg: 50,
        max_bridge_span_mm: 8.0,
        min_feature_size_mm: 0.3,
        general_tolerance_mm: 0.15,
        clearance_fit_mm: 0.25,
        loose_fit_mm: 0.4,
        press_fit_mm: -0.05,
        sliding_fit_mm: 0.1
      },
      'ABS': {
        min_wall_thickness_mm: 1.5,
        min_hole_diameter_mm: 2.2,
        max_overhang_angle_deg: 40,
        max_bridge_span_mm: 4.0,
        min_feature_size_mm: 0.5,
        general_tolerance_mm: 0.25,
        clearance_fit_mm: 0.35,
        loose_fit_mm: 0.6,
        press_fit_mm: -0.15,
        sliding_fit_mm: 0.2
      }
    };

    return materials[materialType] || materials['PLA'];
  }

  /**
   * Get material-specific properties
   */
  private getMaterialShrinkage(materialType: string): number {
    const shrinkage: Record<string, number> = {
      'PLA': 0.002,
      'PETG': 0.004,
      'ABS': 0.008,
      'TPU': 0.003
    };
    return shrinkage[materialType] || 0.002;
  }

  private getMaterialBedTemp(materialType: string): number {
    const temps: Record<string, number> = {
      'PLA': 60,
      'PETG': 80,
      'ABS': 100,
      'TPU': 50
    };
    return temps[materialType] || 60;
  }

  private getMaterialNozzleTemp(materialType: string): number {
    const temps: Record<string, number> = {
      'PLA': 200,
      'PETG': 240,
      'ABS': 250,
      'TPU': 220
    };
    return temps[materialType] || 200;
  }

  /**
   * Generate default assembly tolerances
   */
  private generateDefaultAssemblyTolerances(): AssemblyTolerance[] {
    return [
      {
        interface: 'default_interface',
        tolerance_type: 'clearance',
        gap_mm: 0.2,
        compensation: 'none'
      }
    ];
  }

  /**
   * Estimate print time for a part
   */
  private estimatePrintTime(part: any): string {
    // Simple estimation based on part complexity
    const volume = (part.dims_mm?.x || 50) * (part.dims_mm?.y || 50) * (part.dims_mm?.z || 10);
    const estimatedMinutes = Math.round(volume / 1000 * 2); // Rough estimate: 2 minutes per cm³
    
    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} minutes`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Estimate material usage for a part
   */
  private estimateMaterialUsage(part: any): { volume_mm3: number; weight_g: number } {
    const volume = (part.dims_mm?.x || 50) * (part.dims_mm?.y || 50) * (part.dims_mm?.z || 10);
    const fillFactor = 0.2; // Assume 20% infill and hollow shell
    const actualVolume = volume * fillFactor;
    const weight = actualVolume * 0.00125; // PLA density ~1.25g/cm³
    
    return {
      volume_mm3: Math.round(actualVolume),
      weight_g: Math.round(weight * 10) / 10
    };
  }

  // Validation helper methods
  private validateSurfaceFinish(finish: string): QualityRequirements['surface_finish'] {
    const validFinishes: QualityRequirements['surface_finish'][] = ['high', 'standard', 'draft'];
    return validFinishes.includes(finish as any) ? finish as QualityRequirements['surface_finish'] : 'standard';
  }

  private validateSupportAccess(access: string): SupportRequirements['support_removal_access'] {
    const validAccess: SupportRequirements['support_removal_access'][] = ['good', 'moderate', 'poor'];
    return validAccess.includes(access as any) ? access as SupportRequirements['support_removal_access'] : 'good';
  }

  private validateToleranceType(type: string): AssemblyTolerance['tolerance_type'] {
    const validTypes: AssemblyTolerance['tolerance_type'][] = ['clearance', 'interference', 'transition'];
    return validTypes.includes(type as any) ? type as AssemblyTolerance['tolerance_type'] : 'clearance';
  }

  /**
   * Validate manufacturing constraints for completeness
   */
  validateConstraints(constraints: ManufacturingConstraints): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check material properties
    if (!constraints.materialProperties.type) {
      errors.push('Material type not specified');
    }

    if (constraints.materialProperties.layer_height_mm <= 0 || constraints.materialProperties.layer_height_mm > 0.5) {
      warnings.push('Layer height may be outside typical range (0.1-0.3mm)');
    }

    // Check part constraints
    for (const partConstraint of constraints.partConstraints) {
      if (!partConstraint.partKey) {
        errors.push('Part constraint missing part key');
      }

      if (partConstraint.geometryConstraints.min_wall_thickness_mm < 0.8) {
        warnings.push(`Part ${partConstraint.partKey}: Wall thickness may be too thin for reliable printing`);
      }

      if (partConstraint.geometryConstraints.max_overhang_angle_deg > 60) {
        warnings.push(`Part ${partConstraint.partKey}: Overhang angle may require supports`);
      }

      if (partConstraint.tolerances.general_tolerance_mm <= 0) {
        errors.push(`Part ${partConstraint.partKey}: Invalid general tolerance`);
      }
    }

    // Check assembly tolerances
    for (const assemblyTolerance of constraints.assemblyTolerances) {
      if (assemblyTolerance.gap_mm <= 0) {
        errors.push(`Assembly tolerance ${assemblyTolerance.interface}: Invalid gap dimension`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}
