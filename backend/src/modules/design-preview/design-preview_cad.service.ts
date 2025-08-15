import path from 'path';
import fs from 'fs';
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
    let analysisJson: any = null;
    try {
      const buf = fs.readFileSync(imageAbsolute);
      const ext = (imageAbsolute.split('.').pop() || 'png').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      const messages = [
        { role: 'system', content: prompts.designImageVisionAnalysis },
        { role: 'user', content: [ { type: 'text', text: 'Analyze this device image' }, { type: 'image_url', image_url: { url: dataUrl } } ] as any },
      ];
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages,
      }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 120000,
      });
      analysisJson = JSON.parse(resp.data.choices[0].message.content || '{}');
    } catch (e: any) {
      combinedLog += `Vision analysis failed: ${e?.message || e}\n`;
    }

    // 2) Parts list from analysis
    let partsJson: any = { parts: [] };
    try {
      const sys = prompts.cadPartsFromAnalysis.replace('{{analysis}}', JSON.stringify(analysisJson || {}));
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
        // Fallback minimal parts set if AI returned empty
        partsJson = {
          parts: [
            { key: 'base_shell', name: 'Base Shell', role: 'Houses the electronics and provides stability', geometry_hint: 'circular or rounded rectangular base with internal cavity and bottom thickness', features: [ { type: 'shell', where: 'all', value_mm: 2 } ] },
            { key: 'top_cover', name: 'Top Cover', role: 'Protects and closes the assembly', geometry_hint: 'matching cover with alignment lip and screw bosses', features: [ { type: 'fillet', where: 'outer_edges', value_mm: 1 } ] },
            { key: 'stand_bracket', name: 'Stand Bracket', role: 'Supports the angled charging surface', geometry_hint: 'simple angled bracket with mounting holes', features: [ { type: 'hole', where: 'mounting', value_mm: 3 } ] },
          ]
        };
      }
    } catch (e: any) {
      combinedLog += `Parts generation failed: ${e?.message || e}\n`;
    }

    const scriptsOutDir = path.join(this.scriptsDir, 'parts_scripts');
    const stlDir = path.join(this.scriptsDir, 'stl');
    // Unique temp dir per generation to isolate concurrent workers
    const tempBaseDir = path.join(this.scriptsDir, 'tmp', generation.id);
    try {
      fs.mkdirSync(scriptsOutDir, { recursive: true });
      fs.mkdirSync(stlDir, { recursive: true });
      fs.mkdirSync(tempBaseDir, { recursive: true });
    } catch {}

    // Update generation with intermediates
    await prisma.projectCadGeneration.update({
      where: { id: generation.id },
      data: ({
        analysisJson: analysisJson || undefined,
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
      const scriptFile = path.join(scriptsOutDir, `${key}.py`);
      const fixedScript = path.join(scriptsOutDir, `${key}.fix1.py`);
      // 3) Generate CadQuery code for this part
      let scriptCode: string | null = null;
      try {
        const sys = prompts.cadPartScript.replace('{{part}}', JSON.stringify(part));
        const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [ { role: 'system', content: sys } ],
          temperature: 0.2,
        }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 120000 });
        scriptCode = (resp.data.choices[0].message.content || '').replace(/^```python[\r\n]*/i, '').replace(/```\s*$/i, '').trim();
      } catch (e: any) {
        combinedLog += `Script gen failed for ${key}: ${e?.message || e}\n`;
      }

      const scriptOnDisk = null; // avoid relying on disk as source of truth
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
        const wrapped = `import os\nimport cadquery as cq\nfrom cadquery import exporters\n\n${scriptCode || ''}\n\nsolid=None\ntry:\n    solid=build_part()\nexcept Exception as e:\n    raise\nif isinstance(solid, cq.Workplane):\n    solid=solid.val()\nexporters.export(solid, os.environ.get('STL_PATH','${stlFile.replace(/\\/g, '\\\\')}'))\n`;
        fs.writeFileSync(tempScript, wrapped, 'utf8');

        const env = { ...process.env, STL_PATH: stlFile };
        const execRes = spawnSync(py, [tempScript], { encoding: 'utf8', env });
        if (execRes.status === 0 && fs.existsSync(stlFile)) {
          stlData = fs.readFileSync(stlFile);
          status = 'success';
          completed++;
          // Cleanup STL on disk after reading
          try { fs.unlinkSync(stlFile); } catch {}
        } else {
          status = 'failed';
          errorLog = (execRes.stderr || '') + '\n' + (execRes.stdout || '');
          failed++;
        }
        // Cleanup temp script
        try { fs.unlinkSync(tempScript); } catch {}
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

    // Skip artifact archival when avoiding disk persistence

    return { generationId: generation.id };
  }
}


