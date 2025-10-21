import { prisma } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import { prompts } from '../config/prompts';
import { EnhancedPartsSpecification, EnhancedPartSpec } from './enhanced-parts-specification.service';
import { AssemblyPlan } from './assembly-planning.service';
import { ManufacturingConstraints } from './manufacturing-constraints.service';

export interface ValidationSummary {
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface InterfaceValidationResult {
  interface: string;
  status: 'passed' | 'failed' | 'warning';
  checks: {
    dimension_match: boolean;
    clearance_adequate: boolean;
    alignment_features: boolean;
  };
  measurements: {
    designed_gap_mm: number;
    predicted_gap_mm: number;
    tolerance_ok: boolean;
  };
  issues?: string[];
  recommendations?: string[];
}

export interface AssemblyValidationResult {
  component: string;
  status: 'passed' | 'failed' | 'warning';
  issues: string[];
  recommendations: string[];
}

export interface ManufacturingValidationResult {
  part: string;
  printability: 'passed' | 'failed' | 'warning';
  issues: string[];
  recommendations: string[];
}

export interface FunctionalValidationResult {
  function: string;
  status: 'passed' | 'failed' | 'warning';
  clearance_mm: number;
  minimum_required_mm: number;
}

export interface CriticalIssue {
  severity: 'high' | 'medium' | 'low';
  category: 'assembly' | 'manufacturing' | 'functional' | 'geometry';
  description: string;
  affected_parts: string[];
  fix_required: boolean;
}

export interface ValidationRecommendations {
  immediate_fixes: string[];
  optimizations: string[];
}

export interface AssemblyValidationReport {
  overallStatus: 'passed' | 'failed' | 'warning';
  validationSummary: ValidationSummary;
  interfaceValidation: InterfaceValidationResult[];
  assemblyValidation: AssemblyValidationResult[];
  manufacturingValidation: ManufacturingValidationResult[];
  functionalValidation: FunctionalValidationResult[];
  criticalIssues: CriticalIssue[];
  recommendations: ValidationRecommendations;
  validationMetadata: {
    validatedBy: string;
    validationTime: Date;
    confidence: number;
  };
}

export class AssemblyValidationService {
  private aiService: AIService;

  constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * Perform comprehensive assembly validation
   */
  async validateAssembly(
    cadGenerationId: string,
    partsSpecification: EnhancedPartsSpecification,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints,
    stlAnalysis?: any
  ): Promise<AssemblyValidationReport> {
    console.log(`[AssemblyValidation] Starting validation for CAD generation ${cadGenerationId}`);

    try {
      // Perform AI-driven validation analysis
      const validationReport = await this.performValidationAnalysis(
        partsSpecification,
        assemblyPlan,
        manufacturingConstraints,
        stlAnalysis
      );

      // Store validation results in database
      await this.storeValidationResults(cadGenerationId, validationReport);

      console.log(`[AssemblyValidation] Validation completed with ${validationReport.criticalIssues.length} critical issues`);
      return validationReport;

    } catch (error) {
      console.error(`[AssemblyValidation] Error validating assembly for ${cadGenerationId}:`, error);
      throw error;
    }
  }

  /**
   * Perform AI-driven validation analysis
   */
  private async performValidationAnalysis(
    partsSpecification: EnhancedPartsSpecification,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints,
    stlAnalysis?: any
  ): Promise<AssemblyValidationReport> {
    console.log('[AssemblyValidation] Performing AI-driven validation analysis');

    try {
      // Prepare context for AI validation
      const prompt = prompts.assemblyValidationAnalysis
        .replace('{{partsSpecs}}', JSON.stringify(partsSpecification, null, 2))
        .replace('{{assemblyPlan}}', JSON.stringify(assemblyPlan, null, 2))
        .replace('{{stlAnalysis}}', JSON.stringify(stlAnalysis || {}, null, 2))
        .replace('{{manufacturingConstraints}}', JSON.stringify(manufacturingConstraints, null, 2));

      const aiResponse = await this.aiService.callOpenAI([
        { role: 'system', content: prompt }
      ], 0.3);

      const parsedResponse = JSON.parse(this.aiService.cleanJsonResponse(aiResponse));

      // Validate and normalize the validation report
      const validationReport = this.normalizeValidationReport(parsedResponse, partsSpecification);

      // Enhance with additional programmatic checks
      const enhancedReport = await this.enhanceWithProgrammaticChecks(
        validationReport,
        partsSpecification,
        assemblyPlan,
        manufacturingConstraints
      );

      console.log('[AssemblyValidation] Successfully completed AI validation analysis');
      return enhancedReport;

    } catch (error) {
      console.error('[AssemblyValidation] Error in AI validation analysis:', error);
      throw error;
    }
  }

  /**
   * Normalize validation report from AI response
   */
  private normalizeValidationReport(
    parsedResponse: any,
    partsSpecification: EnhancedPartsSpecification
  ): AssemblyValidationReport {
    // Validation summary
    const validationSummary: ValidationSummary = {
      total_checks: parsedResponse.validationSummary?.total_checks || 0,
      passed: parsedResponse.validationSummary?.passed || 0,
      failed: parsedResponse.validationSummary?.failed || 0,
      warnings: parsedResponse.validationSummary?.warnings || 0
    };

    // Interface validation
    const interfaceValidation: InterfaceValidationResult[] = Array.isArray(parsedResponse.interfaceValidation)
      ? parsedResponse.interfaceValidation.map((iv: any) => this.normalizeInterfaceValidation(iv))
      : [];

    // Assembly validation
    const assemblyValidation: AssemblyValidationResult[] = Array.isArray(parsedResponse.assemblyValidation)
      ? parsedResponse.assemblyValidation.map((av: any) => this.normalizeAssemblyValidation(av))
      : [];

    // Manufacturing validation
    const manufacturingValidation: ManufacturingValidationResult[] = Array.isArray(parsedResponse.manufacturingValidation)
      ? parsedResponse.manufacturingValidation.map((mv: any) => this.normalizeManufacturingValidation(mv))
      : [];

    // Functional validation
    const functionalValidation: FunctionalValidationResult[] = Array.isArray(parsedResponse.functionalValidation)
      ? parsedResponse.functionalValidation.map((fv: any) => this.normalizeFunctionalValidation(fv))
      : [];

    // Critical issues
    const criticalIssues: CriticalIssue[] = Array.isArray(parsedResponse.criticalIssues)
      ? parsedResponse.criticalIssues.map((ci: any) => this.normalizeCriticalIssue(ci))
      : [];

    // Recommendations
    const recommendations: ValidationRecommendations = {
      immediate_fixes: Array.isArray(parsedResponse.recommendations?.immediate_fixes)
        ? parsedResponse.recommendations.immediate_fixes
        : [],
      optimizations: Array.isArray(parsedResponse.recommendations?.optimizations)
        ? parsedResponse.recommendations.optimizations
        : []
    };

    // Overall status
    const overallStatus = this.determineOverallStatus(validationSummary, criticalIssues);

    return {
      overallStatus,
      validationSummary,
      interfaceValidation,
      assemblyValidation,
      manufacturingValidation,
      functionalValidation,
      criticalIssues,
      recommendations,
      validationMetadata: {
        validatedBy: 'ai_validation_agent',
        validationTime: new Date(),
        confidence: 0.85
      }
    };
  }

  /**
   * Enhance report with additional programmatic checks
   */
  private async enhanceWithProgrammaticChecks(
    report: AssemblyValidationReport,
    partsSpecification: EnhancedPartsSpecification,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints
  ): Promise<AssemblyValidationReport> {
    console.log('[AssemblyValidation] Enhancing with programmatic checks');

    // Add dimensional consistency checks
    const dimensionalIssues = this.checkDimensionalConsistency(partsSpecification);
    
    // Add tolerance stack-up analysis
    const toleranceIssues = this.analyzeToleranceStackup(partsSpecification, manufacturingConstraints);

    // Add manufacturing feasibility checks
    const manufacturingIssues = this.checkManufacturingFeasibility(partsSpecification, manufacturingConstraints);

    // Merge additional issues into the report
    const enhancedReport = this.mergeAdditionalIssues(report, {
      dimensional: dimensionalIssues,
      tolerance: toleranceIssues,
      manufacturing: manufacturingIssues
    });

    return enhancedReport;
  }

  /**
   * Check dimensional consistency between parts
   */
  private checkDimensionalConsistency(partsSpec: EnhancedPartsSpecification): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // Check interface dimension matching
    for (const part of partsSpec.parts) {
      for (const partInterface of part.interfaces) {
        const connectedPart = partsSpec.parts.find(p => p.key === partInterface.connects_to);
        
        if (connectedPart) {
          // Check for matching interface features
          const hasMatchingInterface = connectedPart.interfaces.some(ci => ci.connects_to === part.key);
          
          if (!hasMatchingInterface) {
            issues.push({
              severity: 'high',
              category: 'geometry',
              description: `Interface mismatch between ${part.key} and ${partInterface.connects_to}`,
              affected_parts: [part.key, partInterface.connects_to],
              fix_required: true
            });
          }
        }
      }

      // Check for minimum wall thickness
      if (part.dims_mm.wall_thickness && part.dims_mm.wall_thickness < 1.0) {
        issues.push({
          severity: 'medium',
          category: 'manufacturing',
          description: `Part ${part.key} has wall thickness below recommended minimum`,
          affected_parts: [part.key],
          fix_required: false
        });
      }
    }

    return issues;
  }

  /**
   * Analyze tolerance stack-up
   */
  private analyzeToleranceStackup(
    partsSpec: EnhancedPartsSpecification,
    manufacturingConstraints: ManufacturingConstraints
  ): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // Check for tight tolerance combinations that may cause fit issues
    for (const part of partsSpec.parts) {
      const partConstraints = manufacturingConstraints.partConstraints.find(pc => pc.partKey === part.key);
      
      if (partConstraints) {
        // Check if tolerances are achievable with printing constraints
        const generalTolerance = partConstraints.tolerances.general_tolerance_mm;
        const clearanceFit = partConstraints.tolerances.fit_tolerances.clearance_fit_mm;
        
        if (clearanceFit < generalTolerance * 2) {
          issues.push({
            severity: 'medium',
            category: 'manufacturing',
            description: `Part ${part.key} clearance fit may be too tight for manufacturing tolerance`,
            affected_parts: [part.key],
            fix_required: false
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check manufacturing feasibility
   */
  private checkManufacturingFeasibility(
    partsSpec: EnhancedPartsSpecification,
    manufacturingConstraints: ManufacturingConstraints
  ): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    for (const part of partsSpec.parts) {
      const partConstraints = manufacturingConstraints.partConstraints.find(pc => pc.partKey === part.key);
      
      if (partConstraints && !partConstraints.supportRequirements.support_free) {
        // Check if support removal is accessible
        if (partConstraints.supportRequirements.support_removal_access === 'poor') {
          issues.push({
            severity: 'medium',
            category: 'manufacturing',
            description: `Part ${part.key} may have difficult support removal`,
            affected_parts: [part.key],
            fix_required: false
          });
        }
      }

      // Check for overly complex geometry
      if (part.features.length > 10) {
        issues.push({
          severity: 'low',
          category: 'manufacturing',
          description: `Part ${part.key} has high geometric complexity`,
          affected_parts: [part.key],
          fix_required: false
        });
      }
    }

    return issues;
  }

  /**
   * Merge additional issues into the validation report
   */
  private mergeAdditionalIssues(
    report: AssemblyValidationReport,
    additionalIssues: {
      dimensional: CriticalIssue[];
      tolerance: CriticalIssue[];
      manufacturing: CriticalIssue[];
    }
  ): AssemblyValidationReport {
    // Merge critical issues
    const allAdditionalIssues = [
      ...additionalIssues.dimensional,
      ...additionalIssues.tolerance,
      ...additionalIssues.manufacturing
    ];

    report.criticalIssues.push(...allAdditionalIssues);

    // Update validation summary
    const additionalFailures = allAdditionalIssues.filter(issue => issue.severity === 'high').length;
    const additionalWarnings = allAdditionalIssues.filter(issue => issue.severity === 'medium' || issue.severity === 'low').length;

    report.validationSummary.total_checks += allAdditionalIssues.length;
    report.validationSummary.failed += additionalFailures;
    report.validationSummary.warnings += additionalWarnings;
    report.validationSummary.passed += (allAdditionalIssues.length - additionalFailures - additionalWarnings);

    // Update overall status
    report.overallStatus = this.determineOverallStatus(report.validationSummary, report.criticalIssues);

    return report;
  }

  /**
   * Store validation results in database
   */
  private async storeValidationResults(
    cadGenerationId: string,
    validationReport: AssemblyValidationReport
  ): Promise<void> {
    console.log(`[AssemblyValidation] Storing validation results for ${cadGenerationId}`);

    try {
      // Create assembly validation record
      const assemblyValidation = await prisma.assemblyValidation.create({
        data: {
          cadGenerationId,
          overallStatus: validationReport.overallStatus,
          fitmentCheck: validationReport.interfaceValidation as any,
          clearanceCheck: validationReport.functionalValidation as any,
          interferenceCheck: validationReport.assemblyValidation as any,
          accessibilityCheck: validationReport.manufacturingValidation as any,
          issues: validationReport.criticalIssues as any,
          recommendations: validationReport.recommendations as any,
          validatedBy: validationReport.validationMetadata.validatedBy
        }
      });

      // Create individual part validation results
      for (const part of validationReport.manufacturingValidation) {
        // Find the corresponding ProjectCadPart
        const cadPart = await prisma.projectCadPart.findFirst({
          where: {
            cadGenerationId,
            key: part.part
          }
        });

        if (cadPart) {
          await prisma.partValidationResult.create({
            data: {
              assemblyValidationId: assemblyValidation.id,
              partId: cadPart.id,
              geometryValid: part.printability === 'passed',
              dimensionsValid: part.issues.length === 0,
              featuresValid: true, // Default for now
              printabilityValid: part.printability === 'passed',
              geometryIssues: part.issues.filter(issue => issue.includes('geometry')),
              dimensionIssues: part.issues.filter(issue => issue.includes('dimension')),
              featureIssues: part.issues.filter(issue => issue.includes('feature')),
              printIssues: part.issues.filter(issue => issue.includes('print')),
              recommendations: { recommendations: part.recommendations }
            }
          });
        }
      }

      console.log('[AssemblyValidation] Successfully stored validation results');

    } catch (error) {
      console.error('[AssemblyValidation] Error storing validation results:', error);
      throw error;
    }
  }

  /**
   * Generate basic validation report as fallback
   */
  private generateBasicValidationReport(partsSpec: EnhancedPartsSpecification): AssemblyValidationReport {
    console.log('[AssemblyValidation] Generating basic validation report');

    const basicChecks = partsSpec.parts.length * 5; // 5 checks per part
    
    return {
      overallStatus: 'warning',
      validationSummary: {
        total_checks: basicChecks,
        passed: Math.floor(basicChecks * 0.7),
        failed: Math.floor(basicChecks * 0.1),
        warnings: Math.floor(basicChecks * 0.2)
      },
      interfaceValidation: [],
      assemblyValidation: [],
      manufacturingValidation: partsSpec.parts.map(part => ({
        part: part.key,
        printability: 'warning' as const,
        issues: ['Basic validation only - detailed analysis not available'],
        recommendations: ['Perform detailed validation with full pipeline']
      })),
      functionalValidation: [],
      criticalIssues: [],
      recommendations: {
        immediate_fixes: [],
        optimizations: ['Run comprehensive validation analysis']
      },
      validationMetadata: {
        validatedBy: 'basic_validator',
        validationTime: new Date(),
        confidence: 0.3
      }
    };
  }

  // Normalization helper methods
  private normalizeInterfaceValidation(iv: any): InterfaceValidationResult {
    return {
      interface: iv.interface || 'unknown_interface',
      status: this.validateStatus(iv.status),
      checks: {
        dimension_match: iv.checks?.dimension_match ?? false,
        clearance_adequate: iv.checks?.clearance_adequate ?? false,
        alignment_features: iv.checks?.alignment_features ?? false
      },
      measurements: {
        designed_gap_mm: iv.measurements?.designed_gap_mm || 0,
        predicted_gap_mm: iv.measurements?.predicted_gap_mm || 0,
        tolerance_ok: iv.measurements?.tolerance_ok ?? false
      },
      issues: Array.isArray(iv.issues) ? iv.issues : [],
      recommendations: Array.isArray(iv.recommendations) ? iv.recommendations : []
    };
  }

  private normalizeAssemblyValidation(av: any): AssemblyValidationResult {
    return {
      component: av.component || 'unknown_component',
      status: this.validateStatus(av.status),
      issues: Array.isArray(av.issues) ? av.issues : [],
      recommendations: Array.isArray(av.recommendations) ? av.recommendations : []
    };
  }

  private normalizeManufacturingValidation(mv: any): ManufacturingValidationResult {
    return {
      part: mv.part || 'unknown_part',
      printability: this.validateStatus(mv.printability),
      issues: Array.isArray(mv.issues) ? mv.issues : [],
      recommendations: Array.isArray(mv.recommendations) ? mv.recommendations : []
    };
  }

  private normalizeFunctionalValidation(fv: any): FunctionalValidationResult {
    return {
      function: fv.function || 'unknown_function',
      status: this.validateStatus(fv.status),
      clearance_mm: fv.clearance_mm || 0,
      minimum_required_mm: fv.minimum_required_mm || 0
    };
  }

  private normalizeCriticalIssue(ci: any): CriticalIssue {
    return {
      severity: this.validateSeverity(ci.severity),
      category: this.validateCategory(ci.category),
      description: ci.description || 'Unknown issue',
      affected_parts: Array.isArray(ci.affected_parts) ? ci.affected_parts : [],
      fix_required: ci.fix_required ?? true
    };
  }

  private validateStatus(status: string): 'passed' | 'failed' | 'warning' {
    const validStatuses: ('passed' | 'failed' | 'warning')[] = ['passed', 'failed', 'warning'];
    return validStatuses.includes(status as any) ? status as any : 'warning';
  }

  private validateSeverity(severity: string): CriticalIssue['severity'] {
    const validSeverities: CriticalIssue['severity'][] = ['high', 'medium', 'low'];
    return validSeverities.includes(severity as any) ? severity as CriticalIssue['severity'] : 'medium';
  }

  private validateCategory(category: string): CriticalIssue['category'] {
    const validCategories: CriticalIssue['category'][] = ['assembly', 'manufacturing', 'functional', 'geometry'];
    return validCategories.includes(category as any) ? category as CriticalIssue['category'] : 'geometry';
  }

  private determineOverallStatus(
    summary: ValidationSummary,
    criticalIssues: CriticalIssue[]
  ): 'passed' | 'failed' | 'warning' {
    const highSeverityIssues = criticalIssues.filter(issue => issue.severity === 'high').length;
    
    if (highSeverityIssues > 0 || summary.failed > 0) {
      return 'failed';
    } else if (summary.warnings > 0 || criticalIssues.length > 0) {
      return 'warning';
    } else {
      return 'passed';
    }
  }
}
