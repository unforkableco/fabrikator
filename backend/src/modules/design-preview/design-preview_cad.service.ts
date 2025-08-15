import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { prisma } from '../../prisma/prisma.service';

export class DesignPreviewCadService {
  private backendRoot: string;
  private scriptsDir: string;

  constructor() {
    this.backendRoot = process.cwd();
    this.scriptsDir = path.join(this.backendRoot, 'scripts');
  }

  private readJsonSafe(filePath: string): any | null {
    try {
      const txt = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }

  private fileIfExists(filePath: string): string | null {
    try {
      return fs.existsSync(filePath) ? filePath : null;
    } catch {
      return null;
    }
  }

  public async runGeneration(projectId: string): Promise<{ generationId: string }> {
    // Load selected design image
    const preview = await prisma.designPreview.findFirst({
      where: { projectId },
      include: { selectedDesign: true }
    });
    if (!preview?.selectedDesign?.imageUrl) {
      throw new Error('No selected design image');
    }

    const imageAbsolute = path.join(this.backendRoot, preview.selectedDesign.imageUrl);
    const outputDirAbs = path.join(this.backendRoot, 'uploads', 'cad', projectId, String(Date.now()));
    const outputDirRel = path.relative(this.backendRoot, outputDirAbs);
    fs.mkdirSync(outputDirAbs, { recursive: true });

    const generation = await prisma.projectCadGeneration.create({
      data: {
        projectId,
        designOptionId: preview.selectedDesign.id,
        outputDir: outputDirRel,
        status: 'pending',
        stage: 'starting',
        progress: 0,
      }
    });

    // Run pipeline script synchronously for now
    const scriptPath = path.join(this.backendRoot, 'scripts', 'describe-image.js');
    let combinedLog = '';
    try {
      await prisma.projectCadGeneration.update({ where: { id: generation.id }, data: { stage: 'analyzing', progress: 5 } });
      const run = spawnSync('node', [scriptPath, imageAbsolute], { cwd: this.backendRoot, encoding: 'utf8' });
      combinedLog += (run.stdout || '') + (run.stderr || '');
    } catch (e: any) {
      combinedLog += `Spawn error: ${e?.message || e}`;
    }

    const analysisPath = path.join(this.scriptsDir, 'analysis_latest.json');
    const partsPath = path.join(this.scriptsDir, 'parts_latest.json');
    const scriptsOutDir = path.join(this.scriptsDir, 'parts_scripts');
    const stlDir = path.join(this.scriptsDir, 'stl');

    const analysisJson = this.readJsonSafe(analysisPath);
    const partsJson = this.readJsonSafe(partsPath);

    // Update generation with intermediates
    await prisma.projectCadGeneration.update({
      where: { id: generation.id },
      data: {
        analysisJson: analysisJson || undefined,
        partsJson: partsJson || undefined,
        designImagePath: preview.selectedDesign.imageUrl,
        logText: combinedLog.substring(0, 100000),
        stage: 'parts_list',
        progress: 15,
        totalParts: Array.isArray(partsJson?.parts) ? partsJson.parts.length : 0,
        completedParts: 0,
        failedParts: 0,
      }
    });

    // Persist parts
    const parts: any[] = Array.isArray(partsJson?.parts) ? partsJson.parts : [];
    let completed = 0;
    let failed = 0;
    for (const part of parts) {
      const key: string = part.key;
      const name: string = part.name || key;
      const scriptFile = path.join(scriptsOutDir, `${key}.py`);
      const fixedScript = path.join(scriptsOutDir, `${key}.fix1.py`);
      const scriptOnDisk = this.fileIfExists(fixedScript) || this.fileIfExists(scriptFile);
      const stlFile = path.join(stlDir, `${key}.stl`);
      let stlData: Buffer | null = null;
      let status = 'failed';
      let errorLog: string | null = null;
      // Ensure any STL found is copied into uploads output directory and referenced via web path
      const webStlRel = path.join(outputDirRel, `${key}.stl`);
      const webStlAbs = path.join(this.backendRoot, webStlRel);
      try {
        if (fs.existsSync(stlFile)) {
          // Copy to uploads folder for static serving
          try {
            fs.copyFileSync(stlFile, webStlAbs);
          } catch {}
          stlData = fs.readFileSync(stlFile);
          status = 'success';
          completed++;
        } else {
          status = 'failed';
          errorLog = 'STL file not found';
          failed++;
        }
      } catch (e: any) {
        status = 'failed';
        errorLog = e?.message || String(e);
        failed++;
      }

      await prisma.projectCadPart.create({
        data: {
          cadGenerationId: generation.id,
          key,
          name,
          description: part.role || null,
          geometryHint: part.geometry_hint || part.geometryHint || null,
          approxDims: part.approx_dims_mm || part.approxDims || null,
          features: part.features || null,
          appearance: part.appearance || null,
          partJson: part,
          promptMeta: undefined,
          scriptCode: scriptOnDisk ? fs.readFileSync(scriptOnDisk, 'utf8') : null,
          scriptPath: scriptOnDisk ? path.relative(this.backendRoot, scriptOnDisk) : null,
          stlPath: fs.existsSync(stlFile) ? webStlRel : null,
          stlData: stlData || undefined,
          status,
          errorLog: errorLog || undefined,
        }
      });

      // Update progress after each part
      const total = parts.length;
      const base = 15; // after parts_list
      const span = 80; // until finalizing
      const pct = base + Math.round(((completed + failed) / Math.max(1, total)) * span);
      await prisma.projectCadGeneration.update({
        where: { id: generation.id },
        data: { stage: 'stl_export', progress: Math.min(99, pct), completedParts: completed, failedParts: failed },
      });
    }

    // Finalize status
    const anyFailed = await prisma.projectCadPart.count({ where: { cadGenerationId: generation.id, status: 'failed' } });
    await prisma.projectCadGeneration.update({ where: { id: generation.id }, data: { status: anyFailed > 0 ? 'failed' : 'success', stage: 'finalizing', progress: 100, finishedAt: new Date() } });

    // Copy artifacts into unique outputDir for archival
    try {
      if (fs.existsSync(scriptsOutDir)) {
        for (const f of fs.readdirSync(scriptsOutDir)) {
          fs.copyFileSync(path.join(scriptsOutDir, f), path.join(outputDirAbs, f));
        }
      }
      if (fs.existsSync(stlDir)) {
        for (const f of fs.readdirSync(stlDir)) {
          const src = path.join(stlDir, f);
          const dst = path.join(outputDirAbs, f);
          if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
        }
      }
    } catch {}

    return { generationId: generation.id };
  }
}


