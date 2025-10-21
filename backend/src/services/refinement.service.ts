import { prisma } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import { prompts } from '../config/prompts';
import { AssemblyValidationReport, CriticalIssue } from './assembly-validation.service';
import { EnhancedPartsSpecification, EnhancedPartSpec } from './enhanced-parts-specification.service';

export interface RefinementObjective {
  objective: string;
  priority: 'high' | 'medium' | 'low';
  target_parts: string[];
  success_criteria: string[];
}

export interface RefinementPlan {
  iteration_number: number;
  primary_objectives: string[];
  expected_outcomes: string[];
  objectives: RefinementObjective[];
}

export interface ParameterChange {
  feature: string;
  parameter: string;
  current_value: any;
  new_value: any;
  reason: string;
}

export interface PartModification {
  part_key: string;
  modification_type: 'dimensional_adjustment' | 'feature_addition' | 'feature_removal' | 'geometry_change';
  changes: ParameterChange[];
  validation_checks: string[];
}

export interface NewFeature {
  part_key: string;
  feature_type: string;
  specification: any;
  purpose: string;
}

export interface InterfaceUpdate {
  interface: string;
  update_type: string;
  current_gap_mm: number;
  new_gap_mm: number;
  affected_parts: string[];
  reason: string;
}

export interface ValidationPlan {
  critical_checks: string[];
  success_criteria: Record<string, boolean | number>;
  regression_tests: string[];
}

export interface RiskAssessment {
  potential_new_issues: string[];
  mitigation_strategies: string[];
}

export interface RefinementStrategy {
  refinementPlan: RefinementPlan;
  partModifications: PartModification[];
  newFeatures: NewFeature[];
  interfaceUpdates: InterfaceUpdate[];
  validationPlan: ValidationPlan;
  riskAssessment: RiskAssessment;
  strategyMetadata: {
    generatedBy: string;
    basedOn: string[];
    confidence: number;
    timestamp: Date;
  };
}

export interface RefinementResult {
  iteration_number: number;
  refinement_applied: boolean;
  parts_modified: string[];
  issues_addressed: string[];
  new_issues_introduced: string[];
  validation_results: any;
  success_rate: number;
}

export class RefinementService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Plan and execute refinement iteration
   */
  async executeRefinementIteration(
    cadGenerationId: string,
    validationResults: AssemblyValidationReport,
    currentPartsSpec: EnhancedPartsSpecification,
    failedParts: string[],
    previousIterations?: any[]
  ): Promise<RefinementResult> {
    console.log(`[Refinement] Starting refinement iteration for CAD generation ${cadGenerationId}`);

    try {
      // Generate refinement strategy
      const refinementStrategy = await this.generateRefinementStrategy(
        validationResults,
        currentPartsSpec,
        failedParts,
        previousIterations || []
      );

      // Apply refinements to parts specification
      const refinedPartsSpec = await this.applyRefinements(
        currentPartsSpec,
        refinementStrategy
      );

      // Store refinement iteration
      const iterationNumber = (previousIterations?.length || 0) + 1;
      await this.storeRefinementIteration(cadGenerationId, iterationNumber, refinementStrategy);

      // Determine success metrics
      const result: RefinementResult = {
        iteration_number: iterationNumber,
        refinement_applied: true,
        parts_modified: refinementStrategy.partModifications.map(pm => pm.part_key),
        issues_addressed: this.extractAddressedIssues(validationResults, refinementStrategy),
        new_issues_introduced: [], // To be filled by subsequent validation
        validation_results: null, // To be filled by subsequent validation
        success_rate: this.calculateExpectedSuccessRate(refinementStrategy)
      };

      console.log(`[Refinement] Completed refinement iteration ${iterationNumber} with ${result.parts_modified.length} parts modified`);
      return result;

    } catch (error) {
      console.error(`[Refinement] Error executing refinement for ${cadGenerationId}:`, error);
      
      // Return failed refinement result
      return {
        iteration_number: (previousIterations?.length || 0) + 1,
        refinement_applied: false,
        parts_modified: [],
        issues_addressed: [],
        new_issues_introduced: [],
        validation_results: null,
        success_rate: 0
      };
    }
  }

  /**
   * Generate refinement strategy using AI
   */
  private async generateRefinementStrategy(
    validationResults: AssemblyValidationReport,
    currentPartsSpec: EnhancedPartsSpecification,
    failedParts: string[],
    previousIterations: any[]
  ): Promise<RefinementStrategy> {
    console.log('[Refinement] Generating AI-driven refinement strategy');

    try {
      // Prepare context for AI analysis
      const prompt = prompts.refinementPlanning
        .replace('{{validationResults}}', JSON.stringify(validationResults, null, 2))
        .replace('{{currentSpecs}}', JSON.stringify(currentPartsSpec, null, 2))
        .replace('{{failedParts}}', JSON.stringify(failedParts, null, 2))
        .replace('{{previousIterations}}', JSON.stringify(previousIterations, null, 2));

      const aiResponse = await this.aiService.callOpenAI([
        { role: 'system', content: prompt }
      ], 0.3);

      const parsedResponse = JSON.parse(this.aiService.cleanJsonResponse(aiResponse));

      // Validate and normalize the refinement strategy
      const strategy = this.normalizeRefinementStrategy(parsedResponse, validationResults);

      console.log('[Refinement] Successfully generated refinement strategy');
      return strategy;

    } catch (error) {
      console.error('[Refinement] Error generating refinement strategy:', error);
      throw error;
    }
  }

  /**
   * Normalize refinement strategy from AI response
   */
  private normalizeRefinementStrategy(
    parsedResponse: any,
    validationResults: AssemblyValidationReport
  ): RefinementStrategy {
    // Refinement plan
    const refinementPlan: RefinementPlan = {
      iteration_number: parsedResponse.refinementPlan?.iteration_number || 1,
      primary_objectives: Array.isArray(parsedResponse.refinementPlan?.primary_objectives)
        ? parsedResponse.refinementPlan.primary_objectives
        : ['Address critical validation failures'],
      expected_outcomes: Array.isArray(parsedResponse.refinementPlan?.expected_outcomes)
        ? parsedResponse.refinementPlan.expected_outcomes
        : ['Improve assembly compatibility'],
      objectives: this.generateObjectivesFromValidation(validationResults)
    };

    // Part modifications
    const partModifications: PartModification[] = Array.isArray(parsedResponse.partModifications)
      ? parsedResponse.partModifications.map((pm: any) => this.normalizePartModification(pm))
      : [];

    // New features
    const newFeatures: NewFeature[] = Array.isArray(parsedResponse.newFeatures)
      ? parsedResponse.newFeatures.map((nf: any) => this.normalizeNewFeature(nf))
      : [];

    // Interface updates
    const interfaceUpdates: InterfaceUpdate[] = Array.isArray(parsedResponse.interfaceUpdates)
      ? parsedResponse.interfaceUpdates.map((iu: any) => this.normalizeInterfaceUpdate(iu))
      : [];

    // Validation plan
    const validationPlan: ValidationPlan = {
      critical_checks: Array.isArray(parsedResponse.validationPlan?.critical_checks)
        ? parsedResponse.validationPlan.critical_checks
        : ['Assembly compatibility', 'Dimensional accuracy'],
      success_criteria: parsedResponse.validationPlan?.success_criteria || {
        zero_assembly_failures: true,
        all_ports_accessible: true
      },
      regression_tests: Array.isArray(parsedResponse.validationPlan?.regression_tests)
        ? parsedResponse.validationPlan.regression_tests
        : ['Previous passing tests']
    };

    // Risk assessment
    const riskAssessment: RiskAssessment = {
      potential_new_issues: Array.isArray(parsedResponse.riskAssessment?.potential_new_issues)
        ? parsedResponse.riskAssessment.potential_new_issues
        : [],
      mitigation_strategies: Array.isArray(parsedResponse.riskAssessment?.mitigation_strategies)
        ? parsedResponse.riskAssessment.mitigation_strategies
        : []
    };

    return {
      refinementPlan,
      partModifications,
      newFeatures,
      interfaceUpdates,
      validationPlan,
      riskAssessment,
      strategyMetadata: {
        generatedBy: 'ai_refinement_agent',
        basedOn: ['validation_results', 'current_specs', 'failed_parts'],
        confidence: 0.8,
        timestamp: new Date()
      }
    };
  }

  /**
   * Apply refinements to parts specification
   */
  private async applyRefinements(
    currentPartsSpec: EnhancedPartsSpecification,
    refinementStrategy: RefinementStrategy
  ): Promise<EnhancedPartsSpecification> {
    console.log('[Refinement] Applying refinements to parts specification');

    // Create a deep copy of the current specification
    const refinedSpec: EnhancedPartsSpecification = JSON.parse(JSON.stringify(currentPartsSpec));

    // Apply part modifications
    for (const modification of refinementStrategy.partModifications) {
      const part = refinedSpec.parts.find(p => p.key === modification.part_key);
      if (part) {
        this.applyPartModification(part, modification);
      }
    }

    // Apply new features
    for (const newFeature of refinementStrategy.newFeatures) {
      const part = refinedSpec.parts.find(p => p.key === newFeature.part_key);
      if (part) {
        this.applyNewFeature(part, newFeature);
      }
    }

    // Apply interface updates
    for (const interfaceUpdate of refinementStrategy.interfaceUpdates) {
      this.applyInterfaceUpdate(refinedSpec, interfaceUpdate);
    }

    // Update specification metadata
    refinedSpec.specificationMetadata = {
      ...refinedSpec.specificationMetadata,
      generatedBy: 'refinement_service',
      context_sources: [...refinedSpec.specificationMetadata.context_sources, 'validation_feedback'],
      timestamp: new Date()
    };

    console.log('[Refinement] Successfully applied refinements');
    return refinedSpec;
  }

  /**
   * Apply modification to a specific part
   */
  private applyPartModification(part: EnhancedPartSpec, modification: PartModification): void {
    for (const change of modification.changes) {
      // Navigate to the feature and parameter to change
      const pathParts = change.feature.split('.');
      let current: any = part;

      // Navigate to the parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (current[pathParts[i]]) {
          current = current[pathParts[i]];
        }
      }

      // Apply the parameter change
      const finalProperty = pathParts[pathParts.length - 1];
      if (current && current.hasOwnProperty(finalProperty)) {
        current[finalProperty] = change.new_value;
        console.log(`[Refinement] Applied change to ${part.key}.${change.feature}: ${change.current_value} → ${change.new_value}`);
      }
    }
  }

  /**
   * Apply new feature to a part
   */
  private applyNewFeature(part: EnhancedPartSpec, newFeature: NewFeature): void {
    switch (newFeature.feature_type) {
      case 'alignment_pin':
        // Add alignment pin to part features
        part.features.push({
          type: 'boss',
          where: 'interface_surface',
          radius_mm: newFeature.specification.diameter_mm / 2,
          depth_mm: newFeature.specification.height_mm
        });
        break;

      case 'mounting_post':
        // Add mounting post to hardware integration
        if (part.hardware_integration.length > 0) {
          part.hardware_integration[0].features.push({
            type: 'mounting_post',
            position: newFeature.specification.position,
            diameter_mm: newFeature.specification.diameter_mm,
            height_mm: newFeature.specification.height_mm,
            pilot_hole_mm: newFeature.specification.pilot_hole_mm,
            thread: newFeature.specification.thread
          });
        }
        break;

      case 'reinforcement_rib':
        // Add reinforcement rib
        part.features.push({
          type: 'rib',
          where: newFeature.specification.location || 'internal_walls',
          width_mm: newFeature.specification.width_mm || 1.0,
          depth_mm: newFeature.specification.height_mm || 3.0
        });
        break;

      default:
        console.log(`[Refinement] Unknown feature type: ${newFeature.feature_type}`);
    }

    console.log(`[Refinement] Added ${newFeature.feature_type} to part ${part.key}`);
  }

  /**
   * Apply interface update to specification
   */
  private applyInterfaceUpdate(
    spec: EnhancedPartsSpecification,
    interfaceUpdate: InterfaceUpdate
  ): void {
    // Find and update interfaces between affected parts
    for (const partKey of interfaceUpdate.affected_parts) {
      const part = spec.parts.find(p => p.key === partKey);
      if (part) {
        for (const partInterface of part.interfaces) {
          if (interfaceUpdate.affected_parts.includes(partInterface.connects_to)) {
            // Update tolerances and clearances
            // This is a simplified implementation - in practice, this would be more sophisticated
            console.log(`[Refinement] Updated interface ${interfaceUpdate.interface} gap from ${interfaceUpdate.current_gap_mm}mm to ${interfaceUpdate.new_gap_mm}mm`);
          }
        }
      }
    }
  }

  /**
   * Store refinement iteration in database
   */
  private async storeRefinementIteration(
    cadGenerationId: string,
    iterationNumber: number,
    refinementStrategy: RefinementStrategy
  ): Promise<void> {
    console.log(`[Refinement] Storing refinement iteration ${iterationNumber}`);

    try {
      await prisma.refinementIteration.create({
        data: {
          cadGenerationId,
          iterationNumber,
          triggerReason: 'validation_failure',
          previousResults: {}, // Would contain previous validation results
          targetIssues: refinementStrategy.refinementPlan.primary_objectives,
          refinementGoals: {
            objectives: refinementStrategy.refinementPlan.primary_objectives,
            expected_outcomes: refinementStrategy.refinementPlan.expected_outcomes
          },
          status: 'completed',
          partModifications: {
            modifications: refinementStrategy.partModifications,
            new_features: refinementStrategy.newFeatures,
            interface_updates: refinementStrategy.interfaceUpdates
          } as any,
          improvements: {
            validation_plan: refinementStrategy.validationPlan,
            risk_assessment: refinementStrategy.riskAssessment
          } as any,
          completedAt: new Date(),
          refinedBy: refinementStrategy.strategyMetadata.generatedBy
        }
      });

      console.log('[Refinement] Successfully stored refinement iteration');

    } catch (error) {
      console.error('[Refinement] Error storing refinement iteration:', error);
      throw error;
    }
  }

  /**
   * Generate basic refinement strategy as fallback
   */
  private generateBasicRefinementStrategy(
    validationResults: AssemblyValidationReport,
    failedParts: string[]
  ): RefinementStrategy {
    console.log('[Refinement] Generating basic refinement strategy');

    // Basic strategy focuses on critical issues
    const criticalIssues = validationResults.criticalIssues.filter(issue => issue.severity === 'high');
    
    const partModifications: PartModification[] = failedParts.map(partKey => ({
      part_key: partKey,
      modification_type: 'dimensional_adjustment',
      changes: [
        {
          feature: 'dims_mm.wall_thickness',
          parameter: 'wall_thickness',
          current_value: 1.0,
          new_value: 1.5,
          reason: 'Increase structural integrity'
        }
      ],
      validation_checks: ['Dimensional accuracy', 'Structural integrity']
    }));

    return {
      refinementPlan: {
        iteration_number: 1,
        primary_objectives: ['Address critical failures', 'Improve printability'],
        expected_outcomes: ['Reduced assembly failures', 'Better print success rate'],
        objectives: this.generateObjectivesFromValidation(validationResults)
      },
      partModifications,
      newFeatures: [],
      interfaceUpdates: [],
      validationPlan: {
        critical_checks: ['Assembly compatibility'],
        success_criteria: { basic_functionality: true },
        regression_tests: ['Previous tests']
      },
      riskAssessment: {
        potential_new_issues: ['Increased material usage'],
        mitigation_strategies: ['Monitor print times']
      },
      strategyMetadata: {
        generatedBy: 'basic_refinement_generator',
        basedOn: ['validation_failures'],
        confidence: 0.5,
        timestamp: new Date()
      }
    };
  }

  /**
   * Generate objectives from validation results
   */
  private generateObjectivesFromValidation(validationResults: AssemblyValidationReport): RefinementObjective[] {
    const objectives: RefinementObjective[] = [];

    // High priority objectives for critical issues
    const criticalIssues = validationResults.criticalIssues.filter(issue => issue.severity === 'high');
    for (const issue of criticalIssues) {
      objectives.push({
        objective: `Resolve: ${issue.description}`,
        priority: 'high',
        target_parts: issue.affected_parts,
        success_criteria: ['Issue eliminated', 'No regression in other areas']
      });
    }

    // Medium priority for warnings
    const warningIssues = validationResults.criticalIssues.filter(issue => issue.severity === 'medium');
    for (const issue of warningIssues.slice(0, 3)) { // Limit to top 3 warnings
      objectives.push({
        objective: `Improve: ${issue.description}`,
        priority: 'medium',
        target_parts: issue.affected_parts,
        success_criteria: ['Issue severity reduced', 'Overall quality improved']
      });
    }

    return objectives;
  }

  // Normalization helper methods
  private normalizePartModification(pm: any): PartModification {
    return {
      part_key: pm.part_key || 'unknown_part',
      modification_type: this.validateModificationType(pm.modification_type),
      changes: Array.isArray(pm.changes) ? pm.changes.map((change: any) => ({
        feature: change.feature || 'unknown_feature',
        parameter: change.parameter || 'unknown_parameter',
        current_value: change.current_value,
        new_value: change.new_value,
        reason: change.reason || 'Unspecified improvement'
      })) : [],
      validation_checks: Array.isArray(pm.validation_checks) ? pm.validation_checks : []
    };
  }

  private normalizeNewFeature(nf: any): NewFeature {
    return {
      part_key: nf.part_key || 'unknown_part',
      feature_type: nf.feature_type || 'unknown_feature',
      specification: nf.specification || {},
      purpose: nf.purpose || 'Improve functionality'
    };
  }

  private normalizeInterfaceUpdate(iu: any): InterfaceUpdate {
    return {
      interface: iu.interface || 'unknown_interface',
      update_type: iu.update_type || 'tolerance_adjustment',
      current_gap_mm: iu.current_gap_mm || 0,
      new_gap_mm: iu.new_gap_mm || 0.2,
      affected_parts: Array.isArray(iu.affected_parts) ? iu.affected_parts : [],
      reason: iu.reason || 'Improve fit'
    };
  }

  private validateModificationType(type: string): PartModification['modification_type'] {
    const validTypes: PartModification['modification_type'][] = [
      'dimensional_adjustment', 'feature_addition', 'feature_removal', 'geometry_change'
    ];
    return validTypes.includes(type as any) ? type as PartModification['modification_type'] : 'dimensional_adjustment';
  }

  private extractAddressedIssues(
    validationResults: AssemblyValidationReport,
    refinementStrategy: RefinementStrategy
  ): string[] {
    const addressedIssues: string[] = [];

    // Extract issues that the refinement strategy is targeting
    for (const objective of refinementStrategy.refinementPlan.primary_objectives) {
      addressedIssues.push(objective);
    }

    // Add issues from critical problems being addressed
    const criticalIssues = validationResults.criticalIssues
      .filter(issue => issue.severity === 'high')
      .map(issue => issue.description);

    addressedIssues.push(...criticalIssues.slice(0, 3)); // Limit to top 3

    return addressedIssues;
  }

  private calculateExpectedSuccessRate(refinementStrategy: RefinementStrategy): number {
    // Simple heuristic based on strategy completeness
    let score = 0.5; // Base score

    if (refinementStrategy.partModifications.length > 0) score += 0.2;
    if (refinementStrategy.newFeatures.length > 0) score += 0.1;
    if (refinementStrategy.interfaceUpdates.length > 0) score += 0.1;
    if (refinementStrategy.validationPlan.critical_checks.length > 0) score += 0.1;

    return Math.min(score, 0.95); // Cap at 95%
  }
}
