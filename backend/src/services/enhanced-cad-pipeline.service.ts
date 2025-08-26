import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { prompts } from '../config/prompts';
import { prisma } from '../prisma/prisma.service';
import { AIService } from './ai.service';

// Import all the new services
import { HardwareAnalysisService, HardwareSpecs } from './hardware-analysis.service';
import { AssemblyPlanningService, AssemblyPlan } from './assembly-planning.service';
import { ManufacturingConstraintsService, ManufacturingConstraints } from './manufacturing-constraints.service';
import { EnhancedPartsSpecificationService, EnhancedPartsSpecification } from './enhanced-parts-specification.service';
import { AssemblyValidationService, AssemblyValidationReport } from './assembly-validation.service';
import { RefinementService, RefinementResult } from './refinement.service';

export interface EnhancedPipelineConfig {
  maxRefinementIterations: number;
  enableValidation: boolean;
  materialType: string;
  qualityTarget: 'draft' | 'standard' | 'high';
  maxScriptRetries?: number;
}

export interface PipelineProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
}

export interface EnhancedPipelineResult {
  generationId: string;
  success: boolean;
  finalPartsCount: number;
  successfulParts: number;
  failedParts: number;
  refinementIterations: number;
  qualityScore: number;
  pipelineLog: PipelineProgress[];
  finalValidation?: AssemblyValidationReport;
}

export class EnhancedCadPipelineService {
  private backendRoot: string;
  private scriptsDir: string;
  private hardwareAnalysisService: HardwareAnalysisService;
  private assemblyPlanningService: AssemblyPlanningService;
  private manufacturingConstraintsService: ManufacturingConstraintsService;
  private enhancedPartsService: EnhancedPartsSpecificationService;
  private assemblyValidationService: AssemblyValidationService;
  private refinementService: RefinementService;
  private aiService: AIService;

  constructor() {
    this.backendRoot = process.cwd();
    this.scriptsDir = path.join(this.backendRoot, 'scripts');
    
    // Initialize all services
    this.hardwareAnalysisService = new HardwareAnalysisService();
    this.assemblyPlanningService = new AssemblyPlanningService();
    this.manufacturingConstraintsService = new ManufacturingConstraintsService();
    this.enhancedPartsService = new EnhancedPartsSpecificationService();
    this.assemblyValidationService = new AssemblyValidationService();
    this.refinementService = new RefinementService();
    this.aiService = AIService.getInstance();
  }

  /**
   * Execute the complete enhanced CAD generation pipeline
   */
  async executeEnhancedPipeline(
    projectId: string,
    designOptionId: string,
    config: EnhancedPipelineConfig = {
      maxRefinementIterations: 3,
      enableValidation: true,
      materialType: 'PLA',
      qualityTarget: 'standard'
    }
  ): Promise<EnhancedPipelineResult> {
    console.log(`[EnhancedPipeline] Starting enhanced pipeline for project ${projectId}`);

    const pipelineLog: PipelineProgress[] = [];
    let generation: any = null;
    // Debug directory to persist intermediate artifacts for post-mortem analysis
    const debugRoot = path.join(this.backendRoot, 'debug', 'enhanced', projectId, `${Date.now()}`);
    this.ensureDir(debugRoot);
    this.ensureDir(path.join(debugRoot, 'scripts'));
    this.ensureDir(path.join(debugRoot, 'stl'));
    this.ensureDir(path.join(debugRoot, 'json'));
    this.ensureDir(path.join(debugRoot, 'logs'));

    try {
      // Initialize CAD generation record
      generation = await this.initializeCadGeneration(projectId, designOptionId);
      const generationId = generation.id;

      this.logProgress(pipelineLog, 'initializing', 0, 'Pipeline initialization complete');

      // Optional vision analysis of the selected image (beginning of pipeline)
      await this.updateGenerationProgress(generationId, 'vision_analysis', 3);
      this.logProgress(pipelineLog, 'vision_analysis', 3, 'Analyzing selected design image');
      const projectDescForVision = await this.getProjectDescription(projectId);
      const visionAnalysis = await this.analyzeDesignImage(designOptionId, projectDescForVision);
      this.writeText(path.join(debugRoot, 'json', 'vision_analysis.txt'), visionAnalysis || '');

      // Phase 1: Enhanced Analysis & Planning
      await this.updateGenerationProgress(generationId, 'hardware_analysis', 5);
      this.logProgress(pipelineLog, 'hardware_analysis', 5, 'Analyzing hardware specifications');

      const hardwareSpecs = await this.hardwareAnalysisService.analyzeProjectHardware(projectId);
      this.writeJson(path.join(debugRoot, 'json', 'hardware_specs.json'), hardwareSpecs);
      console.log(`[EnhancedPipeline] Hardware analysis complete: ${hardwareSpecs.components.length} components`);

      await this.updateGenerationProgress(generationId, 'assembly_planning', 15);
      this.logProgress(pipelineLog, 'assembly_planning', 15, 'Planning assembly architecture');

      const textualAnalysis = await this.getDesignAnalysis(designOptionId);
      const designAnalysis = `${visionAnalysis ? `VISION_INFERENCES:\n${visionAnalysis}\n\n` : ''}TEXT_DESCRIPTION:\n${textualAnalysis || ''}`;
      const assemblyPlan = await this.assemblyPlanningService.generateAssemblyPlan(
        projectId,
        hardwareSpecs,
        designAnalysis
      );
      this.writeJson(path.join(debugRoot, 'json', 'assembly_plan.json'), assemblyPlan);
      console.log(`[EnhancedPipeline] Assembly planning complete: ${assemblyPlan.partInterfaces.length} interfaces`);

      await this.updateGenerationProgress(generationId, 'manufacturing_constraints', 25);
      this.logProgress(pipelineLog, 'manufacturing_constraints', 25, 'Optimizing for manufacturing');

      const manufacturingConstraints = await this.manufacturingConstraintsService.generateManufacturingConstraints(
        assemblyPlan.assemblyStrategy.mainParts.map(name => ({ key: name })),
        assemblyPlan,
        config.materialType
      );
      this.writeJson(path.join(debugRoot, 'json', 'manufacturing_constraints.json'), manufacturingConstraints);
      console.log(`[EnhancedPipeline] Manufacturing constraints complete: ${manufacturingConstraints.partConstraints.length} parts`);

      // Store analysis results
      await this.storeAnalysisResults(generationId, hardwareSpecs, assemblyPlan, manufacturingConstraints);

      // Phase 2: Enhanced Part Design
      await this.updateGenerationProgress(generationId, 'enhanced_parts_design', 35);
      this.logProgress(pipelineLog, 'enhanced_parts_design', 35, 'Generating enhanced part specifications');

      let currentPartsSpec = await this.enhancedPartsService.generateEnhancedPartsSpecification(
        await this.getProjectDescription(projectId),
        hardwareSpecs,
        assemblyPlan,
        manufacturingConstraints,
        designAnalysis
      );
      this.writeJson(path.join(debugRoot, 'json', 'parts_spec_iteration_0.json'), currentPartsSpec);
      console.log(`[EnhancedPipeline] Enhanced parts specification complete: ${currentPartsSpec.parts.length} parts`);

      // Coverage enforcement: if any required main parts are missing, retry once with Required Parts hint
      const requiredMainParts = assemblyPlan.assemblyStrategy.mainParts.map(p => p.toLowerCase());
      const present = new Set(currentPartsSpec.parts.map(p => (p.key || '').toLowerCase()));
      const missing = requiredMainParts.filter(p => !present.has(p));
      if (missing.length > 0) {
        console.log(`[EnhancedPipeline] Missing required parts in spec, retrying with Required Parts: ${missing.join(', ')}`);
        const retriedSpec = await this.enhancedPartsService.generateEnhancedPartsSpecification(
          await this.getProjectDescription(projectId),
          hardwareSpecs,
          assemblyPlan,
          manufacturingConstraints,
          designAnalysis,
          missing
        );
        this.writeJson(path.join(debugRoot, 'json', 'parts_spec_retry_required.json'), retriedSpec);
        if (retriedSpec.parts.length >= currentPartsSpec.parts.length) {
          currentPartsSpec = retriedSpec;
          console.log(`[EnhancedPipeline] Retry produced ${currentPartsSpec.parts.length} parts.`);
        } else {
          console.log('[EnhancedPipeline] Retry did not improve coverage; proceeding with original spec.');
        }
      }

      // Phase 3: Iterative Design & Validation
      let refinementIterations = 0;
      let finalValidation: AssemblyValidationReport | undefined;
      let successfulParts = 0;
      let failedParts = 0;

      for (let iteration = 0; iteration < config.maxRefinementIterations; iteration++) {
        const iterationProgress = 45 + (iteration * 15);
        await this.updateGenerationProgress(generationId, `iteration_${iteration + 1}`, iterationProgress);
        this.logProgress(pipelineLog, `iteration_${iteration + 1}`, iterationProgress, `Refinement iteration ${iteration + 1}`);

        // Generate CAD scripts for all parts
        const cadResults = await this.generateCadScriptsForAllParts(
          generationId,
          currentPartsSpec,
          manufacturingConstraints,
          debugRoot,
          config.maxScriptRetries ?? 4,
          iteration + 1
        );

        successfulParts = cadResults.successful;
        failedParts = cadResults.failed;

        // If any parts failed after retries, skip validation and end run as failed
        if (failedParts > 0) {
          console.log(`[EnhancedPipeline] Skipping validation: ${failedParts} part(s) failed after retries`);
          // Break out of iteration loop; final status will be computed with failures present
          break;
        }

        // Validation phase
        if (config.enableValidation) {
          this.logProgress(pipelineLog, 'validation', iterationProgress + 5, 'Validating assembly');

          finalValidation = await this.assemblyValidationService.validateAssembly(
            generationId,
            currentPartsSpec,
            assemblyPlan,
            manufacturingConstraints
          );
          this.writeJson(path.join(debugRoot, 'json', `validation_iteration_${iteration + 1}.json`), finalValidation);

          console.log(`[EnhancedPipeline] Validation complete: ${finalValidation.overallStatus}`);

          // Early-exit if validation issues are not changing across iterations
          const prevLog = this.readJsonSafe(path.join(debugRoot, 'json', `validation_iteration_${iteration}.json`));
          const currSig = JSON.stringify((finalValidation as any)?.criticalIssues || []);
          const prevSig = JSON.stringify((prevLog as any)?.criticalIssues || []);
          if (iteration > 1 && currSig === prevSig) {
            console.log('[EnhancedPipeline] Validation issues unchanged from previous iteration, stopping refinements');
            break;
          }

          // Check if validation passed or if we should refine
          if (finalValidation.overallStatus === 'passed' || iteration === config.maxRefinementIterations - 1) {
            break;
          }

          // Refinement phase
          if (finalValidation.overallStatus === 'failed' && iteration < config.maxRefinementIterations - 1) {
            this.logProgress(pipelineLog, 'refinement', iterationProgress + 10, `Refining design (iteration ${iteration + 1})`);

            const failedPartKeys = this.extractFailedPartKeys(finalValidation);
            // Load previous iterations to advance numbering and context
            const previousIterations = await prisma.refinementIteration.findMany({
              where: { cadGenerationId: generationId },
              orderBy: { iterationNumber: 'asc' }
            });
            const refinementResult = await this.refinementService.executeRefinementIteration(
              generationId,
              finalValidation,
              currentPartsSpec,
              failedPartKeys,
              previousIterations
            );

            if (refinementResult.refinement_applied) {
              refinementIterations++;
              console.log(`[EnhancedPipeline] Refinement ${iteration + 1} applied: ${refinementResult.parts_modified.length} parts modified`);
              this.writeJson(path.join(debugRoot, 'json', `refinement_iteration_${iteration + 1}.json`), refinementResult);
              
              // Generate new parts specification based on refinements
              // For now, we assume applyRefinements mutates the spec returned by refinement service consumer; keep using currentPartsSpec
            } else {
              console.log(`[EnhancedPipeline] Refinement ${iteration + 1} failed, stopping iterations`);
              break;
            }
          }
        } else {
          // Skip validation, just check if we have successful parts
          if (successfulParts > 0) {
            break;
          }
        }
      }

      // Final pipeline completion
      await this.updateGenerationProgress(generationId, 'finalizing', 95);
      this.logProgress(pipelineLog, 'finalizing', 95, 'Finalizing pipeline results');

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(
        successfulParts,
        failedParts,
        finalValidation,
        refinementIterations
      );

      // Update final generation status
      await this.updateFinalGenerationStatus(
        generationId,
        successfulParts,
        failedParts,
        qualityScore >= 0.7 ? 'success' : 'failed'
      );

      this.logProgress(pipelineLog, 'completed', 100, 'Enhanced pipeline completed successfully');
      this.writeJson(path.join(debugRoot, 'json', 'pipeline_log.json'), pipelineLog);

      const result: EnhancedPipelineResult = {
        generationId,
        success: qualityScore >= 0.7,
        finalPartsCount: currentPartsSpec.parts.length,
        successfulParts,
        failedParts,
        refinementIterations,
        qualityScore,
        pipelineLog,
        finalValidation
      };

      console.log(`[EnhancedPipeline] Pipeline completed: ${result.success ? 'SUCCESS' : 'FAILED'} (Quality: ${(qualityScore * 100).toFixed(1)}%)`);
      return result;

    } catch (error) {
      console.error('[EnhancedPipeline] Pipeline failed:', error);

      if (generation) {
        await this.updateFinalGenerationStatus(generation.id, 0, 0, 'failed');
      }

      this.logProgress(pipelineLog, 'failed', 0, `Pipeline failed: ${(error as Error).message || 'Unknown error'}`);
      this.writeJson(path.join(debugRoot, 'json', 'pipeline_log.json'), pipelineLog);

      return {
        generationId: generation?.id || 'unknown',
        success: false,
        finalPartsCount: 0,
        successfulParts: 0,
        failedParts: 0,
        refinementIterations: 0,
        qualityScore: 0,
        pipelineLog
      };
    }
  }

  /**
   * Initialize CAD generation record
   */
  private async initializeCadGeneration(projectId: string, designOptionId: string): Promise<any> {
    const outputDir = path.join(this.scriptsDir, 'enhanced', Date.now().toString());
    fs.mkdirSync(outputDir, { recursive: true });

    return await prisma.projectCadGeneration.create({
      data: {
        projectId,
        designOptionId,
        outputDir,
        status: 'pending',
        stage: 'initializing',
        progress: 0
      }
    });
  }

  /**
   * Store analysis results in the generation record
   */
  private async storeAnalysisResults(
    generationId: string,
    hardwareSpecs: HardwareSpecs,
    assemblyPlan: AssemblyPlan,
    manufacturingConstraints: ManufacturingConstraints
  ): Promise<void> {
    await prisma.projectCadGeneration.update({
      where: { id: generationId },
      data: {
        hardwareSpecs: hardwareSpecs as any,
        assemblyPlan: assemblyPlan as any,
        manufacturingConstraints: manufacturingConstraints as any
      }
    });
  }

  /**
   * Generate CAD scripts for all parts
   */
  private async generateCadScriptsForAllParts(
    generationId: string,
    partsSpec: EnhancedPartsSpecification,
    manufacturingConstraints: ManufacturingConstraints,
    debugRoot: string,
    maxScriptRetries: number,
    iterationNumber: number
  ): Promise<{ successful: number; failed: number }> {
    console.log(`[EnhancedPipeline] Generating CAD scripts for ${partsSpec.parts.length} parts`);

    let successful = 0;
    let failed = 0;

    // Create parts in database and generate scripts
    for (const partSpec of partsSpec.parts) {
      try {
        const ok = await this.processPartCad(
          generationId,
          partSpec,
          partsSpec,
          manufacturingConstraints,
          debugRoot,
          maxScriptRetries,
          iterationNumber
        );
        if (ok) successful++; else failed++;
      } catch (error) {
        console.error(`[EnhancedPipeline] Error processing part ${partSpec.key}:`, error);
        const errPath = path.join(debugRoot, 'logs', `${partSpec.key}.unexpected_error.log`);
        this.writeText(errPath, (error as Error).stack || (error as Error).message || String(error));
        failed++;
      }
    }

    console.log(`[EnhancedPipeline] CAD generation complete: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  }

  /**
   * Generate, execute and (if needed) repair a single part's CAD script.
   */
  private async processPartCad(
    generationId: string,
    partSpec: any,
    fullPartsSpec: EnhancedPartsSpecification,
    manufacturingConstraints: ManufacturingConstraints,
    debugRoot: string,
    maxScriptRetries: number,
    iterationNumber: number
  ): Promise<boolean> {
    // Create part record in 'processing' state
    const cadPart = await prisma.projectCadPart.create({
      data: {
        cadGenerationId: generationId,
        key: partSpec.key,
        name: partSpec.name,
        description: partSpec.role,
        geometryHint: partSpec.geometry_hint,
        approxDims: partSpec.dims_mm,
        features: partSpec.features as any,
        appearance: partSpec.appearance,
        partJson: partSpec as any,
        promptMeta: { iterationNumber } as any,
        status: 'processing'
      }
    });

    // Helper to run a script and update success
    const runAndPersist = async (code: string): Promise<{ ok: boolean; error?: string }> => {
      const res = await this.executeScriptAndGenerateStl(cadPart.id, code, partSpec);
      if (res.success) {
        await prisma.projectCadPart.update({
          where: { id: cadPart.id },
          data: { scriptCode: code, stlData: res.stlData, status: 'success' }
        });
        return { ok: true };
      }
      return { ok: false, error: res.error };
    };

    // 1) Initial generation
    let gen = await this.generateEnhancedCadScript(partSpec, fullPartsSpec, manufacturingConstraints);
    if (gen.scriptCode) {
      this.writeText(path.join(debugRoot, 'scripts', `${partSpec.key}.py.txt`), gen.scriptCode);
    }
    if (!gen.success) {
      this.writeText(path.join(debugRoot, 'logs', `${partSpec.key}.gen_error.log`), gen.error || 'Unknown error');
      await prisma.projectCadPart.update({ where: { id: cadPart.id }, data: { status: 'failed', errorLog: gen.error } });
      return false;
    }

    // 2) Execute initial
    const first = await runAndPersist(gen.scriptCode || '');
    if (first.ok) return true;
    this.writeText(path.join(debugRoot, 'logs', `${partSpec.key}.exec_error.log`), first.error || 'Unknown error');

    // 3) Repair attempts
    let lastError = first.error || 'Unknown error';
    for (let attempt = 1; attempt <= maxScriptRetries; attempt++) {
      const guidance = `Previous Python execution failed with error: ${lastError}.
Please generate a corrected CadQuery script. Ensure build_part() first creates a base solid sized from dims_mm, preserves enclosure bottoms (cut depth = height - wall_thickness), and returns a watertight solid.
Attempt ${attempt} of ${maxScriptRetries}.`;
      const retry = await this.generateEnhancedCadScript(partSpec, fullPartsSpec, manufacturingConstraints, guidance);
      if (retry.scriptCode) {
        this.writeText(path.join(debugRoot, 'scripts', `${partSpec.key}.retry${attempt}.py.txt`), retry.scriptCode);
        const run = await runAndPersist(retry.scriptCode);
        if (run.ok) return true;
        lastError = run.error || lastError;
      }
    }

    // 4) Mark as failed after exhausting retries
    await prisma.projectCadPart.update({
      where: { id: cadPart.id },
      data: { scriptCode: gen.scriptCode, status: 'failed', errorLog: lastError }
    });
    return false;
  }

  /**
   * Generate enhanced CAD script with full context
   */
  private async generateEnhancedCadScript(
    partSpec: any,
    fullPartsSpec: EnhancedPartsSpecification,
    manufacturingConstraints: ManufacturingConstraints,
    errorFeedback?: string
  ): Promise<{ success: boolean; scriptCode?: string; error?: string }> {
    try {
      // Find manufacturing constraints for this part
      const partConstraints = manufacturingConstraints.partConstraints.find(
        pc => pc.partKey === partSpec.key
      );

      // Build enhanced device context
      const deviceContext = this.buildEnhancedDeviceContext(
        partSpec,
        fullPartsSpec,
        partConstraints
      );

      // Use enhanced CAD script prompt
      let prompt = prompts.cadPartScript
        .replace('{{deviceContext}}', deviceContext)
        .replace('{{part}}', JSON.stringify(partSpec, null, 2));
      if (errorFeedback) {
        prompt += `\n\nPrevious attempt failed. Please fix with the following guidance and return a corrected script:\n${errorFeedback}`;
      }

      const response = await this.aiService.callAI([{ role: 'system', content: prompt }], 0.2);

      const scriptCode = response
        .replace(/^```python[\r\n]*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      return { success: true, scriptCode };

    } catch (error) {
      console.error(`[EnhancedPipeline] Script generation failed for ${partSpec.key}:`, error);
      return { success: false, error: (error as Error).message || 'Unknown error' };
    }
  }

  /**
   * Build enhanced device context for CAD script generation
   */
  private buildEnhancedDeviceContext(
    partSpec: any,
    fullPartsSpec: EnhancedPartsSpecification,
    partConstraints?: any
  ): string {
    let context = `Enhanced Part Context for ${partSpec.name}:\n\n`;

    // Part role and relationships
    context += `Part Role: ${partSpec.role}\n`;
    context += `Connects to: ${partSpec.interfaces.map((i: any) => i.connects_to).join(', ')}\n\n`;

    // Assembly reference frame
    context += `Assembly Reference Frame:\n`;
    context += `- Origin: ${fullPartsSpec.assemblyReferenceFrame.origin}\n`;
    context += `- Units: ${fullPartsSpec.assemblyReferenceFrame.units}\n`;
    context += `- Coordinate System: ${fullPartsSpec.assemblyReferenceFrame.coordinate_system}\n\n`;

    // Hardware integration requirements
    if (partSpec.hardware_integration && partSpec.hardware_integration.length > 0) {
      context += `Hardware Integration:\n`;
      for (const hw of partSpec.hardware_integration) {
        context += `- Component: ${hw.component}\n`;
        context += `- Mounting: ${hw.mounting_method} at (${hw.position.x}, ${hw.position.y}, ${hw.position.z})mm\n`;
        context += `- Features: ${hw.features.map((f: any) => f.type).join(', ')}\n`;
      }
      context += '\n';
    }

    // Port cutouts
    if (partSpec.port_cutouts && partSpec.port_cutouts.length > 0) {
      context += `Port Cutouts Required:\n`;
      for (const cutout of partSpec.port_cutouts) {
        context += `- ${cutout.port_type}: ${cutout.dimensions.width}x${cutout.dimensions.height}mm at (${cutout.position.x}, ${cutout.position.y}, ${cutout.position.z})mm\n`;
      }
      context += '\n';
    }

    // Interface specifications
    if (partSpec.interfaces && partSpec.interfaces.length > 0) {
      context += `Interface Requirements:\n`;
      for (const iface of partSpec.interfaces) {
        context += `- ${iface.interface_type} connection to ${iface.connects_to}\n`;
        context += `- Features: ${iface.features.map((f: any) => f.type).join(', ')}\n`;
      }
      context += '\n';
    }

    // Manufacturing constraints
    if (partConstraints) {
      context += `Manufacturing Constraints:\n`;
      context += `- Print Orientation: ${partConstraints.printOrientation.optimal_face}\n`;
      context += `- Support Required: ${!partConstraints.supportRequirements.support_free}\n`;
      context += `- Min Wall Thickness: ${partConstraints.geometryConstraints.min_wall_thickness_mm}mm\n`;
      context += `- General Tolerance: ±${partConstraints.tolerances.general_tolerance_mm}mm\n`;
      context += `- Clearance Fit: ${partConstraints.tolerances.fit_tolerances.clearance_fit_mm}mm\n\n`;
    }

    // Assembly validation requirements
    context += `Critical Validation Requirements:\n`;
    for (const req of fullPartsSpec.assembly_validation.critical_interfaces) {
      context += `- ${req}\n`;
    }

    return context;
  }

  /**
   * Execute CAD script and generate STL
   */
  private async executeScriptAndGenerateStl(
    partId: string,
    scriptCode: string,
    partSpec: any
  ): Promise<{ success: boolean; stlData?: Buffer; error?: string }> {
    try {
      // Setup Python environment
      const venvDir = path.join(this.backendRoot, '.venv');
      const py = path.join(venvDir, 'bin', 'python3');
      
      if (!fs.existsSync(py)) {
        spawnSync('python3', ['-m', 'venv', venvDir], { stdio: 'inherit' });
      }
      
      const pip = path.join(venvDir, 'bin', 'pip');
      const chk = spawnSync(py, ['-c', 'import cadquery'], { encoding: 'utf8' });
      if (chk.status !== 0) {
        spawnSync(pip, ['install', '--upgrade', 'pip', 'wheel', 'setuptools'], { stdio: 'inherit' });
        spawnSync(pip, ['install', 'cadquery==2.3.1'], { stdio: 'inherit' });
      }

      // Create temporary script
      const tempDir = path.join(this.scriptsDir, 'temp', partId);
      fs.mkdirSync(tempDir, { recursive: true });
      
      const tempScript = path.join(tempDir, `${partSpec.key}.py`);
      const stlFile = path.join(tempDir, `${partSpec.key}.stl`);
      
      // Pre-exec validation
      if (!/def\s+build_part\s*\(/.test(scriptCode)) {
        return { success: false, error: 'Generated script missing build_part() definition' };
      }
      const wrappedScript = `import os\nimport cadquery as cq\nfrom cadquery import exporters\nimport math\n\n${scriptCode}\n\nsolid=build_part()\nif isinstance(solid, cq.Workplane):\n    solid=solid.val()\nexporters.export(solid, os.environ.get('STL_PATH','${stlFile.replace(/\\/g, '\\\\')}'))\n`;
      
      fs.writeFileSync(tempScript, wrappedScript, 'utf8');

      // Execute script
      const env = { ...process.env, STL_PATH: stlFile };
      const execRes = spawnSync(py, [tempScript], { encoding: 'utf8', env });
      
      if (execRes.status === 0 && fs.existsSync(stlFile)) {
        const stlData = fs.readFileSync(stlFile);
        
        // Cleanup
        try {
          fs.unlinkSync(stlFile);
          fs.unlinkSync(tempScript);
          fs.rmdirSync(tempDir);
        } catch {}
        
        return { success: true, stlData };
      } else {
        const error = (execRes.stderr || '') + '\n' + (execRes.stdout || '');
        return { success: false, error };
      }

    } catch (error) {
      return { success: false, error: (error as Error).message || 'Unknown error' };
    }
  }

  // Helper methods
  private async getDesignAnalysis(designOptionId: string): Promise<string> {
    try {
      const designOption = await prisma.designOption.findUnique({
        where: { id: designOptionId }
      });
      return designOption?.description || 'No design analysis available';
    } catch {
      return 'No design analysis available';
    }
  }

  private async analyzeDesignImage(designOptionId: string, projectDescription: string): Promise<string | null> {
    try {
      const designOption = await prisma.designOption.findUnique({ where: { id: designOptionId } });
      const imagePath = designOption?.imageUrl;
      if (!imagePath) return null;
      const abs = path.join(this.backendRoot, imagePath);
      if (!fs.existsSync(abs)) return null;
      const ext = (abs.split('.').pop() || 'png').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;

      const sys = prompts.designImageVisionAnalysis
        .replace('{{projectDescription}}', projectDescription)
        .replace('{{materials}}', '');

      const response = await this.aiService.callAI([
        { role: 'system', content: sys },
        { role: 'user', content: [ { type: 'text', text: 'Describe this device design for mechanical inference' }, { type: 'image_url', image_url: { url: dataUrl } } ] as any }
      ], 0.2);
      return response.trim();
    } catch (e) {
      console.warn('[EnhancedPipeline] Vision analysis failed:', (e as Error).message);
      return null;
    }
  }

  private async getProjectDescription(projectId: string): Promise<string> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      return project?.description || 'No project description available';
    } catch {
      return 'No project description available';
    }
  }

  private logProgress(
    log: PipelineProgress[],
    stage: string,
    progress: number,
    message: string
  ): void {
    log.push({
      stage,
      progress,
      message,
      timestamp: new Date()
    });
  }

  // Utilities
  private ensureDir(dir: string): void {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }

  private writeJson(filePath: string, data: any): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('[EnhancedPipeline] Failed to write JSON', filePath, e);
    }
  }

  private writeText(filePath: string, text: string): void {
    try {
      fs.writeFileSync(filePath, text, 'utf8');
    } catch (e) {
      console.warn('[EnhancedPipeline] Failed to write text', filePath, e);
    }
  }

  private readJsonSafe(filePath: string): any | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  private async updateGenerationProgress(
    generationId: string,
    stage: string,
    progress: number
  ): Promise<void> {
    await prisma.projectCadGeneration.update({
      where: { id: generationId },
      data: { stage, progress }
    });
  }

  private async updateFinalGenerationStatus(
    generationId: string,
    successfulParts: number,
    failedParts: number,
    status: string
  ): Promise<void> {
    await prisma.projectCadGeneration.update({
      where: { id: generationId },
      data: {
        status,
        completedParts: successfulParts,
        failedParts: failedParts,
        totalParts: successfulParts + failedParts,
        progress: 100,
        finishedAt: new Date()
      }
    });
  }

  private extractFailedPartKeys(validation: AssemblyValidationReport): string[] {
    const failedParts: string[] = [];
    
    for (const mv of validation.manufacturingValidation) {
      if (mv.printability === 'failed') {
        failedParts.push(mv.part);
      }
    }
    
    for (const issue of validation.criticalIssues) {
      if (issue.severity === 'high') {
        failedParts.push(...issue.affected_parts);
      }
    }
    
    return Array.from(new Set(failedParts)); // Remove duplicates
  }

  private calculateQualityScore(
    successfulParts: number,
    failedParts: number,
    validation?: AssemblyValidationReport,
    refinementIterations?: number
  ): number {
    let score = 0;

    // Base score from part success rate
    const totalParts = successfulParts + failedParts;
    if (totalParts > 0) {
      score += (successfulParts / totalParts) * 0.4;
    }

    // Validation score
    if (validation) {
      if (validation.overallStatus === 'passed') {
        score += 0.4;
      } else if (validation.overallStatus === 'warning') {
        score += 0.2;
      }
      
      // Critical issues penalty
      const criticalIssues = validation.criticalIssues.filter(issue => issue.severity === 'high').length;
      score -= (criticalIssues * 0.1);
    } else {
      score += 0.2; // Partial score if validation was skipped
    }

    // Refinement efficiency bonus/penalty
    if (refinementIterations !== undefined) {
      if (refinementIterations === 0) {
        score += 0.2; // Bonus for getting it right the first time
      } else if (refinementIterations <= 2) {
        score += 0.1; // Small bonus for efficient refinement
      } else {
        score -= 0.1; // Penalty for excessive refinement
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  private ensureAllPartsSpecified(
    spec: EnhancedPartsSpecification,
    plan: AssemblyPlan,
    constraints: ManufacturingConstraints
  ): EnhancedPartsSpecification {
    // Placeholder synthesis removed by request to expose missing parts issues clearly
    return spec;
  }
}
