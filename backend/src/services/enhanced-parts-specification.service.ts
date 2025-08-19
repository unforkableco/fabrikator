import { AIService } from './ai.service';
import { prompts } from '../config/prompts';
import { HardwareSpecs, ComponentSpecs } from './hardware-analysis.service';
import { AssemblyPlan, PartInterface } from './assembly-planning.service';
import { ManufacturingConstraints, PartConstraints } from './manufacturing-constraints.service';

export interface AssemblyReferenceFrame {
  origin: string;
  units: string;
  coordinate_system: string;
}

export interface HardwareIntegrationFeature {
  component: string;
  mounting_method: string;
  position: { x: number; y: number; z: number };
  features: Array<{
    type: string;
    position: { x: number; y: number; z: number };
    diameter_mm?: number;
    height_mm?: number;
    pilot_hole_mm?: number;
    thread?: string;
  }>;
}

export interface PortCutout {
  component: string;
  port_type: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  chamfer_mm?: number;
  tolerance_mm?: number;
}

export interface InterfaceFeature {
  connects_to: string;
  interface_type: string;
  features: Array<{
    type: string;
    position: { x: number; y: number; z: number };
    outer_diameter_mm?: number;
    inner_diameter_mm?: number;
    height_mm?: number;
    thread?: string;
  }>;
  mating_features: Array<{
    type: string;
    diameter_mm?: number;
    countersink?: boolean;
    depth_mm?: number;
  }>;
}

export interface GeometricFeature {
  type: 'fillet' | 'chamfer' | 'groove' | 'rib' | 'boss' | 'slot';
  where: string;
  radius_mm?: number;
  size_mm?: number;
  depth_mm?: number;
  width_mm?: number;
}

export interface CableManagement {
  type: string;
  path: string;
  width_mm: number;
  depth_mm: number;
  radius_mm: number;
}

export interface ManufacturingSpec {
  print_orientation: string;
  support_required: boolean;
  critical_surfaces: string[];
  post_processing?: string[];
}

export interface EnhancedPartSpec {
  key: string;
  name: string;
  role: string;
  geometry_hint: string;
  dims_mm: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
    wall_thickness?: number;
  };
  hardware_integration: HardwareIntegrationFeature[];
  port_cutouts: PortCutout[];
  interfaces: InterfaceFeature[];
  features: GeometricFeature[];
  cable_management: CableManagement[];
  manufacturing: ManufacturingSpec;
  appearance: {
    color_hex: string;
  };
}

export interface AssemblyValidationRequirements {
  critical_interfaces: string[];
  clearance_checks: string[];
  strength_requirements: string[];
}

export interface EnhancedPartsSpecification {
  assemblyReferenceFrame: AssemblyReferenceFrame;
  parts: EnhancedPartSpec[];
  assembly_validation: AssemblyValidationRequirements;
  specificationMetadata: {
    generatedBy: string;
    context_sources: string[];
    confidence: number;
    timestamp: Date;
  };
}

export class EnhancedPartsSpecificationService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Generate enhanced part specifications with full assembly context
   */
  async generateEnhancedPartsSpecification(
    projectDescription: string,
    hardwareSpecs: HardwareSpecs,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints,
    designAnalysis: string,
    requiredParts?: string[]
  ): Promise<EnhancedPartsSpecification> {
    console.log('[EnhancedParts] Generating enhanced part specifications with full context');

    try {
      // Generate parts using comprehensive AI analysis
      const partsSpec = await this.createContextualPartsSpecification(
        projectDescription,
        hardwareSpecs,
        assemblyPlan,
        manufacturingConstraints,
        designAnalysis,
        requiredParts
      );

      console.log(`[EnhancedParts] Successfully generated ${partsSpec.parts.length} enhanced part specifications`);
      return partsSpec;

    } catch (error) {
      console.error('[EnhancedParts] Error generating enhanced parts specification:', error);
      throw error;
    }
  }

  /**
   * Create contextual parts specification using AI
   */
  private async createContextualPartsSpecification(
    projectDescription: string,
    hardwareSpecs: HardwareSpecs,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints,
    designAnalysis: string,
    requiredParts?: string[]
  ): Promise<EnhancedPartsSpecification> {
    console.log('[EnhancedParts] Creating AI-driven contextual parts specification');

    try {
      // Prepare comprehensive context for AI
      const geometryHints = this.extractGeometryHints(designAnalysis);
      const prompt = prompts.contextualPartSpecification
        .replace('{{projectDescription}}', projectDescription)
        .replace('{{hardwareSpecs}}', JSON.stringify(hardwareSpecs, null, 2))
        .replace('{{assemblyPlan}}', JSON.stringify(assemblyPlan, null, 2))
        .replace('{{manufacturingConstraints}}', JSON.stringify(manufacturingConstraints, null, 2))
        .replace('{{designAnalysis}}', designAnalysis)
        .replace('{{geometryHints}}', JSON.stringify(geometryHints, null, 2))
        .replace('{{requiredParts}}', JSON.stringify(requiredParts || [], null, 2));

      const aiResponse = await this.aiService.callOpenAI([
        { role: 'system', content: prompt }
      ], 0.2);

      const parsedResponse = JSON.parse(this.aiService.cleanJsonResponse(aiResponse));

      // Validate and enhance the specification
      const enhancedSpec = this.validateAndEnhanceSpecification(
        parsedResponse,
        hardwareSpecs,
        assemblyPlan,
        manufacturingConstraints
      );

      console.log('[EnhancedParts] Successfully created contextual parts specification');
      return enhancedSpec;

    } catch (error) {
      console.error('[EnhancedParts] Error creating contextual specification:', error);
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
   * Validate and enhance parts specification
   */
  private validateAndEnhanceSpecification(
    parsedResponse: any,
    hardwareSpecs: HardwareSpecs,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints
  ): EnhancedPartsSpecification {
    // Reference frame
    const assemblyReferenceFrame: AssemblyReferenceFrame = {
      origin: parsedResponse.assemblyReferenceFrame?.origin || 'bottom_left_corner_of_base',
      units: parsedResponse.assemblyReferenceFrame?.units || 'millimeters',
      coordinate_system: parsedResponse.assemblyReferenceFrame?.coordinate_system || 'right_handed_xyz'
    };

    // Enhanced parts
    const parts: EnhancedPartSpec[] = Array.isArray(parsedResponse.parts)
      ? parsedResponse.parts.map((part: any) => this.enhancePartSpecification(
          part,
          hardwareSpecs,
          assemblyPlan,
          manufacturingConstraints
        ))
      : this.generateDefaultParts(assemblyPlan, hardwareSpecs, manufacturingConstraints);

    // Assembly validation requirements
    const assembly_validation: AssemblyValidationRequirements = {
      critical_interfaces: Array.isArray(parsedResponse.assembly_validation?.critical_interfaces)
        ? parsedResponse.assembly_validation.critical_interfaces
        : ['primary_enclosure_fit', 'component_mounting'],
      clearance_checks: Array.isArray(parsedResponse.assembly_validation?.clearance_checks)
        ? parsedResponse.assembly_validation.clearance_checks
        : ['cable_routing', 'component_access', 'thermal_clearance'],
      strength_requirements: Array.isArray(parsedResponse.assembly_validation?.strength_requirements)
        ? parsedResponse.assembly_validation.strength_requirements
        : ['mounting_post_integrity', 'interface_strength']
    };

    return {
      assemblyReferenceFrame,
      parts,
      assembly_validation,
      specificationMetadata: {
        generatedBy: 'ai_enhanced',
        context_sources: ['hardware_specs', 'assembly_plan', 'manufacturing_constraints', 'design_analysis'],
        confidence: 0.9,
        timestamp: new Date()
      }
    };
  }

  /**
   * Enhance a single part specification with context
   */
  private enhancePartSpecification(
    part: any,
    hardwareSpecs: HardwareSpecs,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints
  ): EnhancedPartSpec {
    // Find relevant manufacturing constraints for this part
    const partConstraints = manufacturingConstraints.partConstraints.find(
      pc => pc.partKey === part.key
    );

    // Find relevant interfaces for this part
    const relevantInterfaces = assemblyPlan.partInterfaces.filter(
      iface => iface.partA === part.key || iface.partB === part.key
    );

    // Enhanced part specification
    return {
      key: part.key || `part_${Date.now()}`,
      name: part.name || 'Unknown Part',
      role: part.role || 'Structural component',
      geometry_hint: part.geometry_hint || 'Basic geometric shape',
      dims_mm: this.validateDimensions(part.dims_mm),
      hardware_integration: this.enhanceHardwareIntegration(
        part.hardware_integration,
        hardwareSpecs.components
      ),
      port_cutouts: this.enhancePortCutouts(
        part.port_cutouts,
        hardwareSpecs.components
      ),
      interfaces: this.enhanceInterfaces(
        part.interfaces,
        relevantInterfaces,
        partConstraints
      ),
      features: this.enhanceFeatures(part.features, partConstraints),
      cable_management: this.enhanceCableManagement(part.cable_management),
      manufacturing: this.enhanceManufacturingSpec(
        part.manufacturing,
        partConstraints
      ),
      appearance: {
        color_hex: part.appearance?.color_hex || '#2c3e50'
      }
    };
  }

  /**
   * Validate and normalize part dimensions
   */
  private validateDimensions(dims: any): EnhancedPartSpec['dims_mm'] {
    return {
      length: dims?.length ? Math.max(1, dims.length) : undefined,
      width: dims?.width ? Math.max(1, dims.width) : undefined,
      height: dims?.height ? Math.max(1, dims.height) : undefined,
      diameter: dims?.diameter ? Math.max(1, dims.diameter) : undefined,
      wall_thickness: dims?.wall_thickness ? Math.max(0.8, dims.wall_thickness) : 2.0
    };
  }

  /**
   * Enhance hardware integration features
   */
  private enhanceHardwareIntegration(
    integration: any[],
    components: ComponentSpecs[]
  ): HardwareIntegrationFeature[] {
    if (!Array.isArray(integration)) return [];

    return integration.map(hw => {
      const component = components.find(comp => comp.name === hw.component || comp.id === hw.component);
      
      return {
        component: hw.component || 'unknown_component',
        mounting_method: hw.mounting_method || 'standoff_posts',
        position: hw.position || { x: 10, y: 10, z: 3 },
        features: Array.isArray(hw.features) ? hw.features.map((feature: any) => ({
          type: feature.type || 'mounting_post',
          position: feature.position || { x: 0, y: 0, z: 0 },
          diameter_mm: feature.diameter_mm || 6.0,
          height_mm: feature.height_mm || (component ? component.clearances.bottom_mm + component.dimensions.height_mm : 11.0),
          pilot_hole_mm: feature.pilot_hole_mm || 2.5,
          thread: feature.thread || 'M2.5'
        })) : []
      };
    });
  }

  /**
   * Enhance port cutout specifications
   */
  private enhancePortCutouts(
    cutouts: any[],
    components: ComponentSpecs[]
  ): PortCutout[] {
    if (!Array.isArray(cutouts)) return [];

    return cutouts.map(cutout => {
      const component = components.find(comp => comp.name === cutout.component || comp.id === cutout.component);
      const port = component?.ports.find(p => p.type === cutout.port_type);

      return {
        component: cutout.component || 'unknown_component',
        port_type: cutout.port_type || 'unknown_port',
        position: cutout.position || { x: 0, y: 0, z: 0 },
        dimensions: {
          width: cutout.dimensions?.width || port?.dimensions.width_mm || 10,
          height: cutout.dimensions?.height || port?.dimensions.height_mm || 6,
          depth: cutout.dimensions?.depth || 3
        },
        chamfer_mm: cutout.chamfer_mm || 0.5,
        tolerance_mm: cutout.tolerance_mm || 0.2
      };
    });
  }

  /**
   * Enhance interface specifications
   */
  private enhanceInterfaces(
    interfaces: any[],
    relevantInterfaces: PartInterface[],
    partConstraints?: PartConstraints
  ): InterfaceFeature[] {
    if (!Array.isArray(interfaces)) return [];

    return interfaces.map(iface => ({
      connects_to: iface.connects_to || 'unknown_part',
      interface_type: iface.interface_type || 'screw_mount',
      features: Array.isArray(iface.features) ? iface.features.map((feature: any) => ({
        type: feature.type || 'screw_boss',
        position: feature.position || { x: 0, y: 0, z: 0 },
        outer_diameter_mm: feature.outer_diameter_mm || 8.0,
        inner_diameter_mm: feature.inner_diameter_mm || 3.2,
        height_mm: feature.height_mm || 20.0,
        thread: feature.thread || 'M3'
      })) : [],
      mating_features: Array.isArray(iface.mating_features) ? iface.mating_features.map((feature: any) => ({
        type: feature.type || 'clearance_hole',
        diameter_mm: feature.diameter_mm || 3.5,
        countersink: feature.countersink || true,
        depth_mm: feature.depth_mm || 2.0
      })) : []
    }));
  }

  /**
   * Enhance geometric features
   */
  private enhanceFeatures(
    features: any[],
    partConstraints?: PartConstraints
  ): GeometricFeature[] {
    if (!Array.isArray(features)) return [];

    const minRadius = partConstraints?.geometryConstraints.min_feature_size_mm || 0.5;

    return features.map(feature => ({
      type: this.validateFeatureType(feature.type),
      where: feature.where || 'edges',
      radius_mm: feature.radius_mm ? Math.max(minRadius, feature.radius_mm) : undefined,
      size_mm: feature.size_mm ? Math.max(minRadius, feature.size_mm) : undefined,
      depth_mm: feature.depth_mm ? Math.max(0.2, feature.depth_mm) : undefined,
      width_mm: feature.width_mm ? Math.max(minRadius, feature.width_mm) : undefined
    }));
  }

  /**
   * Enhance cable management specifications
   */
  private enhanceCableManagement(cableManagement: any[]): CableManagement[] {
    if (!Array.isArray(cableManagement)) return [];

    return cableManagement.map(cm => ({
      type: cm.type || 'routing_channel',
      path: cm.path || 'internal_routing',
      width_mm: Math.max(3, cm.width_mm || 8),
      depth_mm: Math.max(1, cm.depth_mm || 3),
      radius_mm: Math.max(1, cm.radius_mm || 2)
    }));
  }

  /**
   * Enhance manufacturing specifications
   */
  private enhanceManufacturingSpec(
    manufacturing: any,
    partConstraints?: PartConstraints
  ): ManufacturingSpec {
    return {
      print_orientation: manufacturing?.print_orientation || partConstraints?.printOrientation.optimal_face || 'bottom_face_down',
      support_required: manufacturing?.support_required ?? (partConstraints ? !partConstraints.supportRequirements.support_free : false),
      critical_surfaces: Array.isArray(manufacturing?.critical_surfaces)
        ? manufacturing.critical_surfaces
        : ['mounting_posts', 'interface_surfaces'],
      post_processing: Array.isArray(manufacturing?.post_processing)
        ? manufacturing.post_processing
        : ['support_removal', 'hole_drilling']
    };
  }

  /**
   * Generate fallback specification when AI fails
   */
  private generateFallbackSpecification(
    assemblyPlan: AssemblyPlan,
    hardwareSpecs: HardwareSpecs
  ): EnhancedPartsSpecification {
    console.log('[EnhancedParts] Generating fallback specification');

    const parts = assemblyPlan.assemblyStrategy.mainParts.map((partName, index) => ({
      key: partName.toLowerCase().replace(/\s+/g, '_'),
      name: partName,
      role: index === 0 ? 'Primary enclosure' : 'Secondary enclosure',
      geometry_hint: 'Rectangular shell with mounting features',
      dims_mm: {
        length: 100,
        width: 70,
        height: 25,
        wall_thickness: 2.0
      },
      hardware_integration: hardwareSpecs.components.map(comp => ({
        component: comp.name,
        mounting_method: 'standoff_posts',
        position: { x: 15, y: 15, z: 3 },
        features: comp.mounting.holes.map(hole => ({
          type: 'mounting_post',
          position: { x: hole.position.x_mm, y: hole.position.y_mm, z: 0 },
          diameter_mm: 6.0,
          height_mm: comp.clearances.bottom_mm + comp.dimensions.height_mm,
          pilot_hole_mm: hole.diameter_mm,
          thread: comp.mounting.screw_type
        }))
      })),
      port_cutouts: hardwareSpecs.components.flatMap(comp =>
        comp.ports.map(port => ({
          component: comp.name,
          port_type: port.type,
          position: {
            x: port.position.x_mm || 0,
            y: port.position.y_mm || 0,
            z: port.position.z_mm || 0
          },
          dimensions: {
            width: port.dimensions.width_mm + 2,
            height: port.dimensions.height_mm + 2,
            depth: 3
          },
          chamfer_mm: 0.5
        }))
      ),
      interfaces: [],
      features: [
        {
          type: 'fillet' as const,
          where: 'all_edges',
          radius_mm: 1.0
        }
      ],
      cable_management: [],
      manufacturing: {
        print_orientation: 'bottom_face_down',
        support_required: false,
        critical_surfaces: ['mounting_posts']
      },
      appearance: {
        color_hex: '#2c3e50'
      }
    }));

    return {
      assemblyReferenceFrame: {
        origin: 'bottom_left_corner_of_base',
        units: 'millimeters',
        coordinate_system: 'right_handed_xyz'
      },
      parts,
      assembly_validation: {
        critical_interfaces: ['enclosure_fit'],
        clearance_checks: ['component_access'],
        strength_requirements: ['mounting_integrity']
      },
      specificationMetadata: {
        generatedBy: 'fallback_generator',
        context_sources: ['assembly_plan', 'hardware_specs'],
        confidence: 0.6,
        timestamp: new Date()
      }
    };
  }

  /**
   * Generate default parts based on assembly plan
   */
  private generateDefaultParts(
    assemblyPlan: AssemblyPlan,
    hardwareSpecs: HardwareSpecs,
    manufacturingConstraints: ManufacturingConstraints
  ): EnhancedPartSpec[] {
    return assemblyPlan.assemblyStrategy.mainParts.map((partName): EnhancedPartSpec => {
      const partConstraints = manufacturingConstraints.partConstraints.find(
        pc => pc.partKey === partName
      );

      return {
        key: partName.toLowerCase().replace(/\s+/g, '_'),
        name: partName,
        role: 'Assembly component',
        geometry_hint: 'Basic component shape',
        dims_mm: {
          length: 80,
          width: 60,
          height: 20,
          wall_thickness: partConstraints?.geometryConstraints.min_wall_thickness_mm || 2.0
        },
        hardware_integration: [],
        port_cutouts: [],
        interfaces: [],
        features: [],
        cable_management: [],
        manufacturing: {
          print_orientation: partConstraints?.printOrientation.optimal_face || 'bottom_face_down',
          support_required: partConstraints ? !partConstraints.supportRequirements.support_free : false,
          critical_surfaces: ['surfaces']
        },
        appearance: {
          color_hex: '#34495e'
        }
      };
    });
  }

  // Helper validation methods
  private validateFeatureType(type: string): GeometricFeature['type'] {
    const validTypes: GeometricFeature['type'][] = ['fillet', 'chamfer', 'groove', 'rib', 'boss', 'slot'];
    return validTypes.includes(type as any) ? type as GeometricFeature['type'] : 'fillet';
  }

  /**
   * Validate enhanced parts specification
   */
  validateSpecification(spec: EnhancedPartsSpecification): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check parts
    if (!spec.parts || spec.parts.length === 0) {
      errors.push('No parts defined in specification');
    }

    for (const part of spec.parts) {
      if (!part.key) {
        errors.push('Part missing key identifier');
      }

      if (!part.dims_mm.length && !part.dims_mm.diameter) {
        errors.push(`Part ${part.key}: Missing primary dimensions`);
      }

      if (part.dims_mm.wall_thickness && part.dims_mm.wall_thickness < 0.8) {
        warnings.push(`Part ${part.key}: Wall thickness may be too thin for reliable printing`);
      }

      // Check hardware integration
      for (const hw of part.hardware_integration) {
        if (hw.features.length === 0) {
          warnings.push(`Part ${part.key}: Hardware integration ${hw.component} has no mounting features`);
        }
      }
    }

    // Check assembly validation requirements
    if (!spec.assembly_validation.critical_interfaces.length) {
      warnings.push('No critical interfaces defined for validation');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}
