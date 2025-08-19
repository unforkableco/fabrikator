import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import axios from 'axios';
import { prompts } from '../../config/prompts';
import { prisma } from '../../prisma/prisma.service';

export class DesignPreviewCadService {
  private backendRoot: string;
  private scriptsDir: string;

  constructor() {
    this.backendRoot = process.cwd();
    this.scriptsDir = path.join(this.backendRoot, 'scripts');
  }

  public async retryPart(partId: string): Promise<void> {
    // Fetch part and its generation
    const part = await prisma.projectCadPart.findUnique({
      where: { id: partId },
      include: { cadGeneration: true },
    }) as any;
    if (!part) throw new Error('Part not found');
    const generation = part.cadGeneration;
    if (!generation) throw new Error('Parent generation not found');

    // Mark as processing
    await prisma.projectCadPart.update({ where: { id: partId }, data: ({ status: 'processing' } as any) });
    console.log(`[cad] Retry start for part ${part.key} (${partId}) in generation ${generation.id}`);

    // Load project and materials for context
    const project = await prisma.project.findUnique({ where: { id: generation.projectId } });
    let materialsContext = '' as string;
    try {
      const MaterialService = require('../material/material.service').MaterialService;
      const materialService = MaterialService ? new MaterialService() : null;
      const materials = materialService ? await materialService.listMaterials(generation.projectId) : [];
      materialsContext = Array.isArray(materials)
        ? materials.map((m:any)=>`${m.currentVersion?.specs?.name||'Unknown'} (${m.currentVersion?.specs?.type||'Unknown'})`).join(', ')
        : '';
    } catch {}

    const deviceContext = `Project: ${project?.description || ''}\nMaterials: ${materialsContext}\nPrevious error (for correction):\n${(part.errorLog || '').slice(0, 4000)}\n` +
      (part.scriptCode ? `Previous script (truncated):\n${String(part.scriptCode).slice(0, 4000)}` : '');

    const partJson = part.partJson || { key: part.key, name: part.name, role: part.description };

    // Generate new script with error context
    let scriptCode: string | null = null;
    try {
      const sys = prompts.cadPartScript
        .replace('{{deviceContext}}', deviceContext)
        .replace('{{part}}', JSON.stringify(partJson));
      console.log(`[cad] Retry generating script for part ${part.key} (prevError=${!!part.errorLog}, prevScript=${!!part.scriptCode})`);
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [ { role: 'system', content: sys } ],
        temperature: 0.2,
      }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 120000 });
      scriptCode = (resp.data.choices[0].message.content || '')
        .replace(/^```python[\r\n]*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      console.log(`[cad] Retry script generated for part ${part.key}: ${scriptCode ? scriptCode.length : 0} chars`);
    } catch (e: any) {
      console.error(`[cad] Retry script generation failed for part ${part.key}:`, e?.message || e);
      await prisma.projectCadPart.update({ where: { id: partId }, data: { status: 'failed', errorLog: `Retry script gen failed: ${e?.message || e}` } });
      return;
    }

    const tempBaseDir = path.join(this.scriptsDir, 'tmp', generation.id);
    try { fs.mkdirSync(tempBaseDir, { recursive: true }); } catch {}
    const stlFile = path.join(tempBaseDir, `${part.key}.stl`);
    let stlData: Buffer | null = null;
    let status: 'success' | 'failed' = 'failed';
    let errorLog: string | null = null;

    try {
      // Ensure venv and cadquery
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

      const tempScript = path.join(tempBaseDir, `${part.key}.py`);
      const wrapped = `import os\nimport cadquery as cq\nfrom cadquery import exporters\nimport math\n\n${scriptCode || ''}\n\nsolid=build_part()\nif isinstance(solid, cq.Workplane):\n    solid=solid.val()\nexporters.export(solid, os.environ.get('STL_PATH','${stlFile.replace(/\\/g, '\\')}'))\n`;
      fs.writeFileSync(tempScript, wrapped, 'utf8');

      const env = { ...process.env, STL_PATH: stlFile };
      const execRes = spawnSync(py, [tempScript], { encoding: 'utf8', env });
      if (execRes.status === 0 && fs.existsSync(stlFile)) {
        stlData = fs.readFileSync(stlFile);
        status = 'success';
        try { fs.unlinkSync(stlFile); } catch {}
        try { fs.unlinkSync(tempScript); } catch {}
      } else {
        status = 'failed';
        errorLog = (execRes.stderr || '') + '\n' + (execRes.stdout || '');
        console.error(`[cad] Retry execution failed for part ${part.key}:`, errorLog);
      }
    } catch (e: any) {
      status = 'failed';
      errorLog = e?.message || String(e);
      console.error(`[cad] Retry exception for part ${part.key}:`, errorLog);
    }

    await prisma.projectCadPart.update({
      where: { id: partId },
      data: {
        scriptCode: scriptCode || undefined,
        stlData: stlData || undefined,
        status,
        errorLog: status === 'failed' ? errorLog || undefined : undefined,
      }
    });

    // Recompute generation aggregates and status
    const parts = await prisma.projectCadPart.findMany({ where: { cadGenerationId: generation.id } });
    const total = parts.length;
    const failed = parts.filter(p => p.status === 'failed').length;
    const completed = parts.filter(p => p.status === 'success').length;
    await prisma.projectCadGeneration.update({
      where: { id: generation.id },
      data: ({
        totalParts: total,
        completedParts: completed,
        failedParts: failed,
        status: completed > 0 && failed === 0 ? 'success' : (completed + failed > 0 ? 'failed' : generation.status),
        stage: 'finalizing',
        progress: 100,
        finishedAt: new Date(),
      } as any)
    });
    console.log(`[cad] Retry finished for part ${part.key}: ${status}`);
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
    // No need to create outputDirAbs; we avoid persistent artifacts

    const generation = await prisma.projectCadGeneration.create({
      data: ({
        projectId,
        designOptionId: preview.selectedDesign.id,
        outputDir: outputDirRel,
        status: 'pending',
        stage: 'starting',
        progress: 0,
      } as any)
    });

    // Integrated pipeline (no external script)
    let combinedLog = '';
    await prisma.projectCadGeneration.update({ where: { id: generation.id }, data: ({ stage: 'analyzing', progress: 5 } as any) });

    // 1) Vision analysis (use image data URL)
    let analysisDescription: string | null = null;
    try {
      const buf = fs.readFileSync(imageAbsolute);
      const ext = (imageAbsolute.split('.').pop() || 'png').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      // Inject project description and materials into the vision prompt
      let projectDesc = '';
      let materialsContextForVision = '';
      try {
        const proj = await prisma.project.findUnique({ where: { id: projectId } });
        projectDesc = proj?.description || '';
        const MaterialService = require('../material/material.service').MaterialService;
        const materialService = MaterialService ? new MaterialService() : null;
        const materials = materialService ? await materialService.listMaterials(projectId) : [];
        materialsContextForVision = Array.isArray(materials)
          ? materials.map((m:any)=>`${m.currentVersion?.specs?.name||'Unknown'} (${m.currentVersion?.specs?.type||'Unknown'})`).join(', ')
          : '';
      } catch {}
      const sysPrompt = prompts.designImageVisionAnalysis
        .replace('{{projectDescription}}', projectDesc)
        .replace('{{materials}}', materialsContextForVision);
      const messages = [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: [ { type: 'text', text: 'Analyze this device image' }, { type: 'image_url', image_url: { url: dataUrl } } ] as any },
      ];
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        // prose output
        temperature: 0.4,
        messages,
      }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 120000,
      });
      analysisDescription = String(resp.data.choices[0].message.content || '').trim();
    } catch (e: any) {
      combinedLog += `Vision analysis failed: ${e?.message || e}\n`;
    }

    // 2) Parts list from analysis
    let partsJson: any = { parts: [] };
    let project: any = null;
    let materialsContext = '' as string;
    try {
      project = await prisma.project.findUnique({ where: { id: projectId } });
      const MaterialService = require('../material/material.service').MaterialService;
      const materialService = MaterialService ? new MaterialService() : null;
      const materials = materialService ? await materialService.listMaterials(projectId) : [];
      materialsContext = Array.isArray(materials) ? materials.map((m:any)=>`${m.currentVersion?.specs?.name||'Unknown'} (${m.currentVersion?.specs?.type||'Unknown'})`).join(', ') : '';
      const sys = prompts.cadPartsFromAnalysis
        .replace('{{analysisDescription}}', analysisDescription || '')
        .replace('{{projectDescription}}', project?.description || '')
        .replace('{{materials}}', materialsContext);
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [ { role: 'system', content: sys } ],
      }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 120000,
      });
      partsJson = JSON.parse(resp.data.choices[0].message.content || '{"parts":[]}');
      if (!Array.isArray(partsJson.parts) || partsJson.parts.length === 0) {
        combinedLog += 'No parts were generated from analysis. Aborting CAD generation.\n';
        await prisma.projectCadGeneration.update({
          where: { id: generation.id },
          data: ({
            analysisJson: analysisDescription ? { description: analysisDescription } : undefined,
            partsJson: partsJson || undefined,
            designImagePath: preview.selectedDesign.imageUrl,
            logText: combinedLog.substring(0, 100000),
            status: 'failed',
            stage: 'finalizing',
            progress: 100,
            totalParts: 0,
            completedParts: 0,
            failedParts: 0,
            finishedAt: new Date(),
          } as any)
        });
        return { generationId: generation.id };
      }
    } catch (e: any) {
      combinedLog += `Parts generation failed: ${e?.message || e}\n`;
    }

    // Unique temp dir per generation to isolate concurrent workers
    const tempBaseDir = path.join(this.scriptsDir, 'tmp', generation.id);
    try {
      fs.mkdirSync(tempBaseDir, { recursive: true });
    } catch {}

    // Update generation with intermediates
    await prisma.projectCadGeneration.update({
      where: { id: generation.id },
      data: ({
        analysisJson: analysisDescription ? { description: analysisDescription } : undefined,
        partsJson: partsJson || undefined,
        designImagePath: preview.selectedDesign.imageUrl,
        logText: combinedLog.substring(0, 100000),
        stage: 'parts_list',
        progress: 15,
        totalParts: Array.isArray(partsJson?.parts) ? partsJson.parts.length : 0,
        completedParts: 0,
        failedParts: 0,
      } as any)
    });

    // Persist parts
    const parts: any[] = Array.isArray(partsJson?.parts) ? partsJson.parts : [];
    let completed = 0;
    let failed = 0;
    for (const part of parts) {
      const key: string = part.key;
      const name: string = part.name || key;
      // 3) Generate CadQuery code for this part
      let scriptCode: string | null = null;
      try {
        const sys = prompts.cadPartScript.replace('{{part}}', JSON.stringify(part));
        const deviceContext = `Project: ${project?.description || ''}\nMaterials: ${materialsContext}`;
        const sysFull = sys.replace('{{deviceContext}}', deviceContext);
        console.log(`[cad] Generating script for part ${key}`);
        const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [ { role: 'system', content: sysFull } ],
          temperature: 0.2,
        }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 120000 });
        scriptCode = (resp.data.choices[0].message.content || '').replace(/^```python[\r\n]*/i, '').replace(/```\s*$/i, '').trim();
      } catch (e: any) {
        combinedLog += `Script gen failed for ${key}: ${e?.message || e}\n`;
        console.error(`[cad] Script generation failed for ${key}:`, e?.message || e);
      }

      const stlFile = path.join(tempBaseDir, `${key}.stl`);
      let stlData: Buffer | null = null;
      let status = 'failed';
      let errorLog: string | null = null;

      // If AI failed to generate code, skip execution and record meaningful error
      if (!scriptCode || scriptCode.trim().length < 10) {
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
            scriptCode: scriptCode || undefined,
            scriptPath: null,
            stlPath: null,
            stlData: undefined,
            status: 'failed',
            errorLog: 'AI did not return valid CadQuery code for this part',
          }
        });
        failed++;
        const total = parts.length;
        const base = 15;
        const span = 80;
        const pct = base + Math.round(((completed + failed) / Math.max(1, total)) * span);
        await prisma.projectCadGeneration.update({
          where: { id: generation.id },
          data: ({ stage: 'stl_export', progress: Math.min(99, pct), completedParts: completed, failedParts: failed } as any),
        });
        continue;
      }
      try {
        // 4) Execute Python in venv, writing script to a temp file then exporting STL
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

        // Write temp script in generation-scoped temp dir
        try { fs.mkdirSync(tempBaseDir, { recursive: true }); } catch {}
        const tempScript = path.join(tempBaseDir, `${key}.py`);
        const wrapped = `import os\nimport cadquery as cq\nfrom cadquery import exporters\nimport math\n\n${scriptCode || ''}\n\nsolid=build_part()\nif isinstance(solid, cq.Workplane):\n    solid=solid.val()\nexporters.export(solid, os.environ.get('STL_PATH','${stlFile.replace(/\\/g, '\\')}'))\n`;
        fs.writeFileSync(tempScript, wrapped, 'utf8');

        const env = { ...process.env, STL_PATH: stlFile };
        const execRes = spawnSync(py, [tempScript], { encoding: 'utf8', env });
        if (execRes.status === 0 && fs.existsSync(stlFile)) {
          stlData = fs.readFileSync(stlFile);
          status = 'success';
          completed++;
          // Cleanup STL on disk after reading
          try { fs.unlinkSync(stlFile); } catch {}
          // Delete temp script only on success
          try { fs.unlinkSync(tempScript); } catch {}
        } else {
          // No retry: record the first error and keep the temp script for debugging
          status = 'failed';
          errorLog = (execRes.stderr || '') + '\n' + (execRes.stdout || '');
          console.error(`[cad] Execution failed for ${key}:`, errorLog);
          failed++;
        }
        // On failure, keep tempScript for debugging
      } catch (e: any) {
        status = 'failed';
        errorLog = e?.message || String(e);
        console.error(`[cad] Exception during exec for ${key}:`, errorLog);
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
          scriptCode: scriptCode || undefined,
          scriptPath: null,
          stlPath: null,
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
        data: ({ stage: 'stl_export', progress: Math.min(99, pct), completedParts: completed, failedParts: failed } as any),
      });
    }

    // Finalize status
    const partsCount = await prisma.projectCadPart.count({ where: { cadGenerationId: generation.id } });
    const anyFailed = await prisma.projectCadPart.count({ where: { cadGenerationId: generation.id, status: 'failed' } });
    const finalStatus = partsCount > 0 && anyFailed === 0 ? 'success' : 'failed';
    await prisma.projectCadGeneration.update({ where: { id: generation.id }, data: ({ status: finalStatus, stage: 'finalizing', progress: 100, finishedAt: new Date() } as any) });

    return { generationId: generation.id };
  }
}


