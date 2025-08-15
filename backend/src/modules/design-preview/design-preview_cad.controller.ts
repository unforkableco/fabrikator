import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../prisma/prisma.service';
// AIService may be used later for streaming logs or retries
import { DesignPreviewCadService } from './design-preview_cad.service';

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

    // Kick off generation asynchronously to avoid long-running HTTP request
    const service = new DesignPreviewCadService();
    setImmediate(() => {
      service.runGeneration(projectId).catch((e) => {
        console.error('CAD generation worker error', e);
      });
    });

    // Return immediately; frontend should poll `getLatestCad`
    res.status(202).json({ message: 'CAD generation started' });
  } catch (e: any) {
    console.error('startCadGeneration error', e);
    res.status(500).json({ error: 'Failed to start CAD generation' });
  }
}


