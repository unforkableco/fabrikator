import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../prisma/prisma.service';
// AIService may be used later for streaming logs or retries
import { DesignPreviewCadService } from './design-preview_cad.service';
import { cadQueue } from '../../workers/index';

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


