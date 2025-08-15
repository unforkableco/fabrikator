import { Request, Response } from 'express';
import path from 'path';
import { DesignPreviewService } from './design-preview.service';

export class DesignPreviewController {
  private designPreviewService: DesignPreviewService;

  constructor() {
    this.designPreviewService = new DesignPreviewService();
  }

  /**
   * Get design preview for a project
   */
  async getDesignPreview(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const designPreview = await this.designPreviewService.getDesignPreviewByProjectId(projectId);
      
      if (!designPreview) {
        return res.status(404).json({ error: 'Design preview not found' });
      }
      
      res.json(designPreview);
    } catch (error: any) {
      console.error('Error getting design preview:', error);
      res.status(500).json({ error: 'Failed to get design preview' });
    }
  }

  /**
   * Generate new design previews
   */
  async generateDesignPreviews(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      console.log('Generating design previews for project:', projectId);
      
      const designPreview = await this.designPreviewService.generateDesignPreviews(projectId);
      
      res.json({
        message: 'Design previews generated successfully',
        designPreview,
      });
    } catch (error: any) {
      console.error('Error generating design previews:', error);
      res.status(500).json({ 
        error: 'Failed to generate design previews',
        details: error.message 
      });
    }
  }

  /**
   * Select a design option
   */
  async selectDesignOption(req: Request, res: Response) {
    try {
      const { designPreviewId, designOptionId } = req.body;
      
      if (!designPreviewId || !designOptionId) {
        return res.status(400).json({ 
          error: 'Design preview ID and design option ID are required' 
        });
      }
      
      const designPreview = await this.designPreviewService.selectDesignOption(
        designPreviewId,
        designOptionId
      );
      
      res.json({
        message: 'Design option selected successfully',
        designPreview,
      });
    } catch (error: any) {
      console.error('Error selecting design option:', error);
      res.status(500).json({ error: 'Failed to select design option' });
    }
  }

  /**
   * Iterate upon a base design to propose 3 similar options
   */
  async iterate(req: Request, res: Response) {
    try {
      const { projectId, baseDesignOptionId } = req.body as any;
      if (!projectId || !baseDesignOptionId) {
        return res.status(400).json({ error: 'projectId and baseDesignOptionId are required' });
      }

      const service: any = this.designPreviewService as any;
      const preview = await this.designPreviewService.getOrCreateDesignPreview(projectId);

      const base = await (service.prisma || require('../../prisma/prisma.service').prisma).designOption.findUnique({ where: { id: baseDesignOptionId } });
      if (!base) return res.status(404).json({ error: 'Base design option not found' });

      const project = await (service.prisma || require('../../prisma/prisma.service').prisma).project.findUnique({ where: { id: projectId } });
      const materials = await (this.designPreviewService as any)['materialService'].listMaterials(projectId);
      const materialsContext = materials.map((m: any) => ({
        name: m.currentVersion?.specs?.name || 'Unknown',
        type: m.currentVersion?.specs?.type || 'Unknown',
        specs: m.currentVersion?.specs || {},
      }));

      const ai = (this.designPreviewService as any)['aiService'];
      // Vision analysis first to derive a canonical prompt
      // Use base64 data URL so OpenAI can access the image (localhost is not reachable from OpenAI)
      const path = require('path');
      const fs = require('fs');
      const absPath = path.join(process.cwd(), base.imageUrl);
      let dataUrl: string | null = null;
      try {
        const buf = fs.readFileSync(absPath);
        const ext = (absPath.split('.').pop() || 'png').toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      } catch (e) {
        console.warn('Could not read image from disk for vision analysis, falling back to URL:', absPath);
      }

      const analysis = await ai.analyzeImageForPrompt(dataUrl || `http://localhost:3001/${base.imageUrl}`, base.description);
      // Use canonical prompt verbatim to anchor iterations
      const baseDesc = analysis?.canonicalPrompt ? analysis.canonicalPrompt : base.description;
      const variants = await ai.generateImageVariationsFromBase(
        project?.description || '',
        materialsContext,
        baseDesc
      );

      const imageService = (this.designPreviewService as any)['imageService'];
      const results = await imageService.generateDesignPreviews(variants.variants.map((v: any) => v.imagePrompt));

      const created: any[] = [];
      const prisma = (service.prisma || require('../../prisma/prisma.service').prisma);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.url && !r.error) {
          const filename = `design_${projectId}_${Date.now()}_iter_${i}.png`;
          const imagePath = await imageService.downloadAndSaveImage(r.url, filename);
          const opt = await prisma.designOption.create({
            data: {
              designPreviewId: preview.id,
              parentDesignOptionId: baseDesignOptionId,
              concept: base.concept,
              description: base.description,
              imagePrompt: r.revisedPrompt || variants.variants[i].imagePrompt,
              imageUrl: imagePath,
              keyFeatures: base.keyFeatures,
              complexity: base.complexity,
            },
          });
          created.push(opt);
        }
      }

      const refreshed = await this.designPreviewService.getOrCreateDesignPreview(projectId);
      return res.json(refreshed);
    } catch (error: any) {
      console.error('Error iterating designs:', error);
      return res.status(500).json({ error: error.message || 'Failed to iterate designs' });
    }
  }

  /**
   * Serve STL for a specific CAD part, preferring DB binary. Falls back to disk if needed.
   */
  async getPartStl(req: Request, res: Response) {
    try {
      const { partId } = req.params as any;
      const prisma = (require('../../prisma/prisma.service').prisma);
      const part = await prisma.projectCadPart.findUnique({ where: { id: partId } });
      if (!part) return res.status(404).json({ error: 'Part not found' });

      if (part.stlData) {
        const buf = Buffer.from(part.stlData as any);
        res.setHeader('Content-Type', 'model/stl');
        res.setHeader('Content-Length', String(buf.length));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.end(buf);
      }

      if (part.stlPath) {
        const abs = path.join(process.cwd(), part.stlPath);
        return res.sendFile(abs, (err) => {
          if (err) {
            res.status(404).json({ error: 'STL file not found on disk' });
          }
        });
      }

      return res.status(404).json({ error: 'No STL available for this part' });
    } catch (e: any) {
      console.error('getPartStl error', e);
      return res.status(500).json({ error: 'Failed to fetch STL' });
    }
  }

  // Fetch latest CAD generation with parts for a project
  async getLatestCad(req: Request, res: Response) {
    try {
      const { projectId } = req.params as any;
      const latest = await (require('../../prisma/prisma.service').prisma).projectCadGeneration.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: { parts: true }
      });
      if (!latest) return res.status(404).json({ error: 'No CAD generation found' });
      res.json(latest);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch CAD generation' });
    }
  }

  /**
   * Delete design preview
   */
  async deleteDesignPreview(req: Request, res: Response) {
    try {
      const { designPreviewId } = req.params;
      
      await this.designPreviewService.deleteDesignPreview(designPreviewId);
      
      res.json({ message: 'Design preview deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting design preview:', error);
      res.status(500).json({ error: 'Failed to delete design preview' });
    }
  }
}
