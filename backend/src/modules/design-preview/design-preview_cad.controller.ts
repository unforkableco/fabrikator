import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { prisma } from '../../prisma/prisma.service';
// AIService may be used later for streaming logs or retries
import { DesignPreviewCadService } from './design-preview_cad.service';
import { EnhancedCadPipelineService } from '../../services/enhanced-cad-pipeline.service';
import { cadQueue } from '../../workers/index';

// Type-safe utility functions for accessing JSON fields
const safeJsonArray = (jsonValue: any): any[] | null => {
  return jsonValue && Array.isArray(jsonValue) ? jsonValue : null;
};

const safeJsonObject = (jsonValue: any): Record<string, any> | null => {
  return jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue) ? jsonValue : null;
};

const getNestedArrayLength = (jsonValue: any, key: string): number => {
  const obj = safeJsonObject(jsonValue);
  if (!obj || !(key in obj)) return 0;
  const arr = safeJsonArray(obj[key]);
  return arr ? arr.length : 0;
};

// Minimal controller to kick off CAD generation using the same logic as scripts/describe-image.js (simplified)
export async function startCadGeneration(req: Request, res: Response) {
  try {
    const { projectId } = req.params as any;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    // Load project and selected design image
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { designPreviews: { include: { selectedDesign: true } } } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const preview = project.designPreviews?.[0];
    const selected = preview?.selectedDesign;
    if (!selected?.imageUrl) return res.status(400).json({ error: 'No selected design image' });

    // Return 202 if a job already exists (dedupe by jobId)
    try {
      await cadQueue.add('generate', { projectId }, { jobId: `cad:${projectId}`, removeOnComplete: true, removeOnFail: 100 } as any);
      res.status(202).json({ message: 'CAD generation started' });
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('JobId') && msg.includes('already exists')) {
        return res.status(202).json({ message: 'CAD generation already running' });
      }
      throw err;
    }
  } catch (e: any) {
    console.error('startCadGeneration error', e);
    res.status(500).json({ error: 'Failed to start CAD generation' });
  }
}

export async function retryCadPart(req: Request, res: Response) {
  try {
    const { partId } = req.params as any;
    if (!partId) return res.status(400).json({ error: 'partId required' });

    const service = new DesignPreviewCadService();
    await service.retryPart(partId);
    return res.json({ message: 'Retry triggered' });
  } catch (e: any) {
    console.error('retryCadPart error', e);
    return res.status(500).json({ error: 'Failed to retry CAD part' });
  }
}

/**
 * Start enhanced CAD generation pipeline with multi-agent approach
 */
export async function startEnhancedCadGeneration(req: Request, res: Response) {
  try {
    const { projectId } = req.params as any;
    const config = req.body || {};

    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }

    // Load project and selected design image
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        designPreviews: {
          include: { selectedDesign: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const preview = project.designPreviews?.[0];
    const selected = preview?.selectedDesign;

    if (!selected?.imageUrl) {
      return res.status(400).json({ error: 'No selected design image' });
    }

    // Clean up previous generations for this project to ensure a fresh run
    const previousGenerations = await prisma.projectCadGeneration.findMany({
      where: { projectId },
      select: { id: true }
    });
    if (previousGenerations.length > 0) {
      const ids = previousGenerations.map(g => g.id);
      await prisma.$transaction([
        prisma.assemblyValidation.deleteMany({ where: { cadGenerationId: { in: ids } } }),
        prisma.refinementIteration.deleteMany({ where: { cadGenerationId: { in: ids } } }),
        prisma.projectCadPart.deleteMany({ where: { cadGenerationId: { in: ids } } }),
        prisma.projectCadGeneration.deleteMany({ where: { id: { in: ids } } })
      ]);
    }

    // Start enhanced pipeline
    const enhancedService = new EnhancedCadPipelineService();
    
    // Execute pipeline asynchronously
    enhancedService.executeEnhancedPipeline(projectId, selected.id, {
      maxRefinementIterations: config.maxRefinementIterations || 5,
      enableValidation: config.enableValidation !== false,
      materialType: config.materialType || 'PLA',
      qualityTarget: config.qualityTarget || 'standard',
      maxScriptRetries: config.maxScriptRetries || 4
    }).then(result => {
      console.log(`[Controller] Enhanced pipeline completed for project ${projectId}:`, {
        success: result.success,
        qualityScore: result.qualityScore,
        refinementIterations: result.refinementIterations
      });
    }).catch(error => {
      console.error(`[Controller] Enhanced pipeline failed for project ${projectId}:`, error);
    });

    res.status(202).json({
      message: 'Enhanced CAD generation started',
      pipelineType: 'enhanced',
      features: [
        'Hardware integration analysis',
        'Assembly planning',
        'Manufacturing optimization',
        'Cross-part coordination',
        'Assembly validation',
        'Iterative refinement'
      ]
    });

  } catch (error: any) {
    console.error('[Controller] Enhanced CAD generation error:', error);
    res.status(500).json({ error: 'Failed to start enhanced CAD generation' });
  }
}

/**
 * Get enhanced pipeline status and results
 */
export async function getEnhancedPipelineStatus(req: Request, res: Response) {
  try {
    const { projectId } = req.params as any;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }

    // Get latest CAD generation for the project
    const generation = await prisma.projectCadGeneration.findFirst({
      where: { projectId },
      include: {
        parts: true,
        assemblyValidations: {
          include: {
            partResults: true
          }
        },
        refinementIterations: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!generation) {
      return res.status(404).json({ error: 'No CAD generation found for project' });
    }

    // Calculate enhanced metrics
    const totalParts = generation.parts.length;
    const successfulParts = generation.parts.filter(p => p.status === 'success').length;
    const failedParts = generation.parts.filter(p => p.status === 'failed').length;
    const processingParts = generation.parts.filter(p => p.status === 'processing').length;

    const latestValidation = generation.assemblyValidations[0]; // Most recent
    const refinementCount = generation.refinementIterations?.length || 0;

    // Enhanced status response
    const enhancedStatus = {
      generationId: generation.id,
      status: generation.status,
      stage: generation.stage,
      progress: generation.progress,
      
      // Enhanced pipeline specific data
      pipelineType: generation.hardwareSpecs ? 'enhanced' : 'legacy',
      
      // Parts summary
      parts: {
        total: totalParts,
        successful: successfulParts,
        failed: failedParts,
        processing: processingParts,
        successRate: totalParts > 0 ? (successfulParts / totalParts) * 100 : 0,
        byIteration: (() => {
          const buckets: Record<string, any[]> = {};
          for (const p of generation.parts) {
            const iter = (p.promptMeta as any)?.iterationNumber ?? 1;
            const key = String(iter);
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push({ id: p.id, key: p.key, name: p.name, status: p.status });
          }
          return buckets;
        })()
      },

      // Enhanced analysis results
      analysis: {
        hardwareSpecs: !!generation.hardwareSpecs,
        assemblyPlan: !!generation.assemblyPlan,
        manufacturingConstraints: !!generation.manufacturingConstraints,
        componentsAnalyzed: getNestedArrayLength(generation.hardwareSpecs, 'components'),
        interfacesDefined: getNestedArrayLength(generation.assemblyPlan, 'partInterfaces')
      },

      // Validation results
      validation: latestValidation ? {
        overallStatus: latestValidation.overallStatus,
        totalChecks: safeJsonArray(latestValidation.fitmentCheck)?.length || 0,
        criticalIssues: safeJsonArray(latestValidation.issues)?.length || 0,
        recommendations: getNestedArrayLength(latestValidation.recommendations, 'immediate_fixes')
      } : null,

      // Refinement history
      refinement: {
        iterationsCompleted: refinementCount,
        lastRefinement: refinementCount > 0 ? 
          safeJsonArray(generation.refinementIterations)?.[refinementCount - 1] || null : null
      },

      // Timing
      startedAt: generation.startedAt,
      finishedAt: generation.finishedAt,
      
      // Quality metrics (if available)
      qualityScore: generation.status === 'success' ? 
        Math.min(0.95, (successfulParts / Math.max(totalParts, 1)) * 0.7 + 0.3) : 
        Math.max(0.1, (successfulParts / Math.max(totalParts, 1)) * 0.5)
    };

    res.json(enhancedStatus);

  } catch (error: any) {
    console.error('[Controller] Get enhanced pipeline status error:', error);
    res.status(500).json({ error: 'Failed to get pipeline status' });
  }
}

/**
 * Get detailed validation results for a project
 */
export async function getValidationResults(req: Request, res: Response) {
  try {
    const { projectId } = req.params as any;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }

    // Get latest validation results
    const generation = await prisma.projectCadGeneration.findFirst({
      where: { projectId },
      include: {
        assemblyValidations: {
          include: {
            partResults: {
              include: {
                part: true
              }
            }
          },
          orderBy: { validationTime: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!generation || !generation.assemblyValidations.length) {
      return res.status(404).json({ error: 'No validation results found' });
    }

    const validation = generation.assemblyValidations[0];

    const detailedResults = {
      validationId: validation.id,
      overallStatus: validation.overallStatus,
      validatedAt: validation.validationTime,
      
      // Summary metrics
      summary: {
        totalChecks: (validation.fitmentCheck as any[])?.length || 0,
        passedChecks: ((validation.fitmentCheck as any[]) || []).filter((check: any) => check.status === 'passed').length,
        failedChecks: ((validation.fitmentCheck as any[]) || []).filter((check: any) => check.status === 'failed').length,
        warnings: ((validation.fitmentCheck as any[]) || []).filter((check: any) => check.status === 'warning').length
      },

      // Detailed validation results
      interfaceValidation: validation.fitmentCheck || [],
      assemblyValidation: validation.interferenceCheck || [],
      manufacturingValidation: validation.accessibilityCheck || [],
      functionalValidation: validation.clearanceCheck || [],
      
      // Critical issues
      criticalIssues: validation.issues || [],
      
      // Recommendations
      recommendations: validation.recommendations || {},
      
      // Part-specific results
      partResults: validation.partResults.map(pr => ({
        partId: pr.partId,
        partKey: pr.part.key,
        partName: pr.part.name,
        geometryValid: pr.geometryValid,
        dimensionsValid: pr.dimensionsValid,
        featuresValid: pr.featuresValid,
        printabilityValid: pr.printabilityValid,
        issues: {
          geometry: pr.geometryIssues,
          dimensions: pr.dimensionIssues,
          features: pr.featureIssues,
          printing: pr.printIssues
        },
        recommendations: pr.recommendations
      }))
    };

    res.json(detailedResults);

  } catch (error: any) {
    console.error('[Controller] Get validation results error:', error);
    res.status(500).json({ error: 'Failed to get validation results' });
  }
}


