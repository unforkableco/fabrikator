#!/usr/bin/env node
/*
  describe-image.js
  Standalone pipeline to:
  - Analyze a selected design image (vision)
  - Derive a concise analysis JSON and a parts list JSON
  - Generate per-part CadQuery Python scripts (deterministic)
  - Execute scripts to export STL files
  Outputs:
    scripts/analysis_latest.json
    scripts/parts_latest.json
    scripts/parts_scripts/<key>.py (and optional <key>.fix1.py)
    scripts/stl/<key>.stl
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(1);
}

async function callOpenAIJson(messages, temperature = 0.4) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const resp = await axios.post(
    url,
    {
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      temperature,
      messages,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      timeout: 120000,
    }
  );
  return resp.data.choices[0].message.content;
}

function ensureDirs(baseDir) {
  const dirs = [
    baseDir,
    path.join(baseDir, 'parts_scripts'),
    path.join(baseDir, 'stl'),
    path.join(baseDir, 'out_features'),
    path.join(baseDir, 'out_code'),
    path.join(baseDir, 'out_generic'),
  ];
  dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));
  return {
    scriptsDir: path.join(baseDir, 'parts_scripts'),
    stlDir: path.join(baseDir, 'stl'),
  };
}

function toDataUrl(imagePath) {
  const buf = fs.readFileSync(imagePath);
  const ext = (imagePath.split('.').pop() || 'png').toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function analyzeImage(imagePath) {
  const dataUrl = toDataUrl(imagePath);
  const system = `You are an expert product vision analyzer.
Return concise JSON with keys: canonicalPrompt, visibleComponents (array), shape, finish, notes.`;
  const userContent = [
    { type: 'text', text: 'Analyze this device image. Output strict JSON as instructed.' },
    { type: 'image_url', image_url: { url: dataUrl } },
  ];
  const raw = await callOpenAIJson([
    { role: 'system', content: system },
    { role: 'user', content: userContent }
  ], 0.4);
  return JSON.parse(raw);
}

async function proposeParts(analysis) {
  const system = `You design a minimal set of 3D printable parts for the device described.
Return JSON: { parts: [ { key, name, role, geometry_hint, approx_dims_mm: { ... }, features: [ ... ], appearance: { color_hex?: string } } ] }
Constraints: 3-8 parts, concise geometry hints, avoid electronics modeling, focus on shell, covers, brackets, feet, diffusers.`;
  const raw = await callOpenAIJson([
    { role: 'system', content: system },
    { role: 'user', content: `Analysis: ${JSON.stringify(analysis)}` }
  ], 0.3);
  const parsed = JSON.parse(raw);
  if (!parsed.parts || !Array.isArray(parsed.parts)) parsed.parts = [];
  // normalize keys
  parsed.parts = parsed.parts.map((p, i) => ({
    key: (p.key || `part_${i}`).toLowerCase().replace(/[^a-z0-9_\-]/g, '_'),
    name: p.name || `Part ${i+1}`,
    role: p.role || null,
    geometry_hint: p.geometry_hint || null,
    approx_dims_mm: p.approx_dims_mm || p.approxDims || null,
    features: p.features || [],
    appearance: p.appearance || null,
  }));
  return parsed;
}

async function generateCadQueryScript(part) {
  const system = `You write deterministic CadQuery (Python) code for a single part.
Requirements:
- Use "import cadquery as cq"; create solid in function build_part() -> cq.Workplane or Solid.
- Base on part.approx_dims_mm and geometry_hint; clamp feature radii; avoid failures when selections empty.
- Never use len(Workplane); use .size() on selections.
- At end, export to STL path given as variable STL_PATH using exporters.export().
- No external dependencies besides cadquery and math.
- Provide only code, no explanations.`;
  const user = `part = ${JSON.stringify(part)}`;
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      timeout: 120000,
    }
  );
  let code = resp.data.choices[0].message.content || '';
  // strip markdown fences if present
  code = code.replace(/^```python[\r\n]*/i, '').replace(/```\s*$/i, '').trim();
  return code;
}

function ensureVenv(backendRoot) {
  const venvDir = path.join(backendRoot, '.venv');
  const py = path.join(venvDir, 'bin', 'python3');
  if (!fs.existsSync(py)) {
    console.log('Creating Python venv for CadQuery...');
    spawnSync('python3', ['-m', 'venv', venvDir], { stdio: 'inherit' });
  }
  const chk = spawnSync(py, ['-c', 'import cadquery'], { encoding: 'utf8' });
  if (chk.status !== 0) {
    console.log('Installing cadquery in venv...');
    const pip = path.join(venvDir, 'bin', 'pip');
    spawnSync(pip, ['install', '--upgrade', 'pip', 'wheel', 'setuptools'], { stdio: 'inherit' });
    // Pin to a reasonable version
    spawnSync(pip, ['install', 'cadquery==2.3.1'], { stdio: 'inherit' });
  }
  return py;
}

function writeFileSafe(fp, content) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content);
}

async function main() {
  try {
    const backendRoot = process.cwd();
    const scriptsBase = path.join(backendRoot, 'scripts');
    const { scriptsDir, stlDir } = ensureDirs(scriptsBase);

    const imagePath = process.argv[2];
    if (!imagePath) {
      console.error('Usage: node scripts/describe-image.js <absolute_image_path>');
      process.exit(2);
    }

    const ts = Date.now();

    // 1) Vision analysis
    const analysis = await analyzeImage(imagePath);
    const analysisOut = { ...analysis };
    const analysisLatest = path.join(scriptsBase, 'analysis_latest.json');
    const analysisStamped = path.join(scriptsBase, `analysis_${ts}.json`);
    writeFileSafe(analysisLatest, JSON.stringify(analysisOut, null, 2));
    writeFileSafe(analysisStamped, JSON.stringify(analysisOut, null, 2));
    console.log(`Saved analysis: ${analysisLatest}`);

    // 2) Parts proposal
    const partsDoc = await proposeParts(analysisOut);
    const partsLatest = path.join(scriptsBase, 'parts_latest.json');
    const partsStamped = path.join(scriptsBase, `parts_${ts}.json`);
    writeFileSafe(partsLatest, JSON.stringify(partsDoc, null, 2));
    writeFileSafe(partsStamped, JSON.stringify(partsDoc, null, 2));
    console.log(`Saved parts: ${partsLatest}`);

    // 3) Per-part CadQuery scripts
    const pyBin = ensureVenv(backendRoot);
    for (const part of partsDoc.parts) {
      const key = part.key || `part_${Math.random().toString(36).slice(2, 8)}`;
      const scriptPath = path.join(scriptsDir, `${key}.py`);
      const stlPath = path.join(stlDir, `${key}.stl`);

      let code = await generateCadQueryScript(part);
      // Wrap to ensure export via STL_PATH env
      const wrapped = `# Auto-generated CadQuery for ${key}\n`+
`import os\nimport math\nimport cadquery as cq\nfrom cadquery import exporters\n\n`+
`def build_part():\n`+
`    # User code begins\n${code}\n\n`+
`solid = None\ntry:\n`+
`    res = build_part()\n`+
`    solid = res if hasattr(res, 'val') or hasattr(res, 'toSvg') else res\n`+
`except Exception as e:\n`+
`    raise\n`+
`stl_path = os.environ.get('STL_PATH', r'${stlPath}')\n`+
`if isinstance(solid, cq.Workplane):\n`+
`    solid = solid.val()\n`+
`exporters.export(solid, stl_path)\n`;
      writeFileSafe(scriptPath, wrapped);

      // 4) Execute script to export STL
      const env = { ...process.env, STL_PATH: stlPath };
      const run = spawnSync(pyBin, [scriptPath], { encoding: 'utf8', env });
      if (run.status !== 0 || !fs.existsSync(stlPath)) {
        console.warn(`Initial generation failed for ${key}, attempting AI fix...`);
        const errorLog = (run.stderr || '') + '\n' + (run.stdout || '');

        // Ask AI for a fixed version given the error
        const fixSystem = `You fix CadQuery scripts. Return only corrected code. Constraints as before.`;
        const fixUser = `Original part: ${JSON.stringify(part)}\n\nOriginal code:\n\n${code}\n\nError:\n${errorLog}`;
        const fixResp = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: OPENAI_MODEL,
            temperature: 0.1,
            messages: [
              { role: 'system', content: fixSystem },
              { role: 'user', content: fixUser }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            timeout: 120000,
          }
        );
        let fixed = fixResp.data.choices[0].message.content || '';
        fixed = fixed.replace(/^```python[\r\n]*/i, '').replace(/```\s*$/i, '').trim();
        const fixPath = path.join(scriptsDir, `${key}.fix1.py`);
        const fixedWrapped = wrapped.replace(code, fixed);
        writeFileSafe(fixPath, fixedWrapped);
        const runFix = spawnSync(pyBin, [fixPath], { encoding: 'utf8', env });
        if (runFix.status !== 0 || !fs.existsSync(stlPath)) {
          console.error(`Fix attempt failed for ${key}`);
          console.error(runFix.stderr || runFix.stdout || 'No output');
        } else {
          console.log(`Generated STL after fix for ${key}: ${stlPath}`);
        }
      } else {
        console.log(`Generated STL for ${key}: ${stlPath}`);
      }
    }

    console.log('Pipeline completed');
  } catch (e) {
    console.error('Pipeline error:', e?.message || e);
    process.exit(1);
  }
}

main();


