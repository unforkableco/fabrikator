import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

// Minimal Scene IR v1 types
export type Vector3 = [number, number, number];

export interface Transform {
  translate?: Vector3;
  rotate?: Vector3; // degrees
}

export interface PartOp { op: 'union' | 'subtract' | 'intersect'; target: string; }

export interface Part {
  id: string;
  kind: string; // e.g., 'enclosure.base.rect', 'cut.slot.rounded'
  params: Record<string, any>;
  transform?: Transform;
  anchors?: Record<string, any>;
  ops?: PartOp[];
}

export interface SceneIR {
  version: 1;
  parts: Part[];
  constraints?: any[];
  metadata?: Record<string, any>;
}

// JsonPatch subset
export type JsonPatch = Array<{ op: 'add'|'remove'|'replace'; path: string; value?: any }>;

function hashObject(obj: unknown): string {
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify(obj));
  return h.digest('hex').slice(0, 16);
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

// Scene persistence
function loadScene(scenePath: string): SceneIR {
  if (!fs.existsSync(scenePath)) return { version: 1, parts: [], metadata: {} };
  return JSON.parse(fs.readFileSync(scenePath, 'utf-8')) as SceneIR;
}

function saveScene(scenePath: string, scene: SceneIR) {
  ensureDir(path.dirname(scenePath));
  fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
}

// Apply a tiny subset of JSON Patch (add/replace/remove by absolute path)
function applyPatch(scene: SceneIR, patch: JsonPatch): SceneIR {
  const clone = JSON.parse(JSON.stringify(scene));
  for (const p of patch) {
    const segs = p.path.split('/').slice(1); // remove leading ''
    let cur: any = clone;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i];
      cur = Array.isArray(cur) ? cur[Number(k)] : cur[k];
      if (cur === undefined) throw new Error(`Invalid path segment at ${segs.slice(0, i+1).join('/')}`);
    }
    const last = segs[segs.length - 1];
    if (p.op === 'add' || p.op === 'replace') {
      if (Array.isArray(cur)) {
        if (last === '-') cur.push(p.value);
        else cur[Number(last)] = p.value;
      } else {
        cur[last] = p.value;
      }
    } else if (p.op === 'remove') {
      if (Array.isArray(cur)) cur.splice(Number(last), 1);
      else delete cur[last];
    }
  }
  return clone;
}

// .scad generator (very small scaffold)
function scadHeader(): string {
  return [
    'use <BOSL2/std.scad>;',
    '',
  ].join('\n');
}

function scadForPart(part: Part): string {
  const t = part.transform || {};
  const tr = t.translate || [0, 0, 0];
  const rr = t.rotate || [0, 0, 0];

  // minimal mapping for demo; extend as we add kinds
  let body = '// part body\n';
  if (part.kind === 'primitive.cube') {
    const s = part.params.size || [10, 10, 10];
    const center = part.params.center === true;
    body += `cube(${JSON.stringify(s)}, center=${center});`;
  } else if (part.kind === 'primitive.cylinder') {
    const h = part.params.h ?? 10;
    const r = part.params.r ?? 5;
    body += `cylinder(h=${h}, r=${r}, center=false);`;
  } else {
    // placeholder
    body += `cube([5,5,5]); // ${part.kind}`;
  }

  return [
    `// ${part.id} (${part.kind})`,
    `translate([${tr[0]},${tr[1]},${tr[2]}])`,
    `rotate([${rr[0]},${rr[1]},${rr[2]}])`,
    body,
  ].join('\n');
}

function generateScad(scene: SceneIR): string {
  const lines: string[] = [];
  lines.push(scadHeader());
  lines.push('module part(id){');
  lines.push('  // emitted inline per part id');
  lines.push('}');
  lines.push('');
  lines.push('module assembly(){');
  if (scene.parts.length) {
    lines.push('  union(){');
    for (const p of scene.parts) lines.push('    ' + scadForPart(p).replace(/\n/g, '\n    '));
    lines.push('  }');
  }
  lines.push('}');
  lines.push('');
  lines.push('assembly();');
  return lines.join('\n');
}

function runOpenSCAD(scadPath: string, outPath: string, args: string[] = []): { ok: boolean; stderr: string } {
  const res = spawnSync('openscad', ['-o', outPath, ...args, scadPath], { encoding: 'utf-8' });
  return { ok: res.status === 0, stderr: (res.stderr || '') + (res.stdout || '') };
}

function measureSTL(stlPath: string): { ok: boolean; json?: any; stderr?: string } {
  const py = path.join(__dirname, 'scad_measure.py');
  const venv = path.resolve(__dirname, '../../openscad/.venv/bin/activate');
  const cmd = `source ${venv} && python3 ${py} ${stlPath}`;
  const res = spawnSync('bash', ['-lc', cmd], { encoding: 'utf-8' });
  if (res.status !== 0) return { ok: false, stderr: (res.stderr || '') + (res.stdout || '') };
  try { return { ok: true, json: JSON.parse(res.stdout) }; } catch (e) { return { ok: false, stderr: String(e) }; }
}

// CLI
if (require.main === module) {
  const runRoot = path.resolve('runs', new Date().toISOString().replace(/[:.]/g, '-'));
  const scenePath = path.join(runRoot, 'scene.json');
  const scadPath = path.join(runRoot, 'scad', 'assembly.scad');
  const stlPath = path.join(runRoot, 'stls', 'assembly.stl');
  const cmd = process.argv[2] || 'demo';

  if (cmd === 'demo') {
    const scene = loadScene(scenePath);
    if (scene.parts.length === 0) {
      scene.parts.push({ id: 'cube1', kind: 'primitive.cube', params: { size: [20,20,20], center: true }, transform: { translate: [0,0,0] } });
      scene.parts.push({ id: 'cyl1', kind: 'primitive.cylinder', params: { h: 30, r: 10 }, transform: { translate: [20,20,0] } });
      saveScene(scenePath, scene);
    }
    const scad = generateScad(scene);
    ensureDir(path.dirname(scadPath));
    fs.writeFileSync(scadPath, scad);
    ensureDir(path.dirname(stlPath));
    const r = runOpenSCAD(scadPath, stlPath);
    if (!r.ok) {
      console.error('[openscad] error:', r.stderr);
      process.exit(1);
    }
    const m = measureSTL(stlPath);
    if (m.ok) console.log(JSON.stringify({ hash: hashObject(scene), measurements: m.json }, null, 2));
    else console.error('[measure] error:', m.stderr);
  }
}
