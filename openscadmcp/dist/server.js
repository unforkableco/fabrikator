import express from 'express';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: '5mb' }));
// Workspace
const WORK_DIR = path.resolve(__dirname, '..', 'work');
function sessionDirs(sessionId) {
    const root = path.join(WORK_DIR, 'sessions', sessionId);
    const scad = path.join(root, 'scad');
    const out = path.join(root, 'out');
    fs.mkdirSync(scad, { recursive: true });
    fs.mkdirSync(out, { recursive: true });
    const scenePath = path.join(root, 'scene.json');
    return { root, scad, out, scenePath };
}
function baseNameSafe(name) {
    const b = path.basename(name || '');
    if (!b || b.includes('..') || b.includes('/') || b.includes('\\'))
        return 'assembly.scad';
    return b;
}
function findBackendCwd() {
    const candidates = [
        path.resolve(__dirname, '../../../backend'),
        path.resolve(process.cwd(), '../backend'),
        path.resolve(process.cwd(), 'backend'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, 'package.json')))
            return c;
    }
    return path.resolve(process.cwd(), '../backend');
}
function runAgentDemo() {
    const cwd = findBackendCwd();
    const res = spawnSync('bash', ['-lc', 'npm run -s scad:demo'], { cwd, encoding: 'utf-8' });
    return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}
// Helpers for OpenSCAD and measurements
function runOpenSCAD(scadPath, outPath, args = []) {
    const env = { ...process.env };
    // Point to user libraries if present
    const userLib = path.resolve(process.env.HOME || '', '.local/share/OpenSCAD/libraries');
    env.OPENSCADPATH = [userLib].filter(Boolean).join(path.delimiter);
    // filter out any '-o' passed by client
    const filtered = (args || []).filter((a) => a !== '-o');
    const res = spawnSync('openscad', ['-o', outPath, ...filtered, scadPath], { encoding: 'utf-8', env });
    return res;
}
function measureSTL(stlPath) {
    const backend = findBackendCwd();
    const py = path.join(backend, 'tools', 'scad_measure.py');
    const venv = path.resolve(__dirname, '../../openscad/.venv/bin/activate');
    const cmd = `source ${venv} && python3 ${py} ${stlPath}`;
    const res = spawnSync('bash', ['-lc', cmd], { encoding: 'utf-8' });
    if (res.status !== 0)
        return { ok: false, error: (res.stderr || '') + (res.stdout || '') };
    try {
        return { ok: true, json: JSON.parse(res.stdout) };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
}
function loadScene(scenePath) {
    if (!fs.existsSync(scenePath))
        return { version: 1, parts: [] };
    return JSON.parse(fs.readFileSync(scenePath, 'utf-8'));
}
function saveScene(scenePath, scene) {
    fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
}
function scadHeader() { return 'use <BOSL2/std.scad>;\n'; }
function scadPart(p) {
    if (!p)
        return '';
    const t = p.transform?.translate || [0, 0, 0];
    const r = p.transform?.rotate || [0, 0, 0];
    let body = '';
    if (p.kind === 'primitive.cube') {
        const s = p.params?.size || [10, 10, 10];
        const center = p.params?.center === true;
        body = `cube(${JSON.stringify(s)}, center=${center});`;
    }
    else if (p.kind === 'primitive.cylinder') {
        const h = p.params?.h ?? 10;
        const r0 = p.params?.r ?? 5;
        body = `cylinder(h=${h}, r=${r0}, center=false);`;
    }
    else {
        body = 'cube([5,5,5]);';
    }
    return `translate([${t[0]},${t[1]},${t[2]}])\nrotate([${r[0]},${r[1]},${r[2]}])\n${body}`;
}
function generateScad(scene) {
    const items = (scene.parts || []).filter(Boolean).map(p => scadPart(p)).filter(s => s && s.trim().length > 0);
    const body = items.length ? items.join('\n') : 'cube([1,1,1]);';
    return `${scadHeader()}\nunion(){\n${body}\n}`;
}
app.post('/tools/get_scene', (_req, res) => {
    res.json({ version: 1, parts: [] });
});
app.post('/tools/demo', (_req, res) => {
    const r = runAgentDemo();
    if (r.status === 0) {
        try {
            return res.json(JSON.parse(r.stdout));
        }
        catch {
            return res.json({ ok: true, output: r.stdout });
        }
    }
    else {
        return res.json({ ok: false, error: (r.stderr || '') + (r.stdout || '') });
    }
});
// Raw OpenSCAD tools
app.post('/tools/write_scad', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { scad } = sessionDirs(sessionId);
    const rel = baseNameSafe(req.body.path || 'script.scad');
    const dst = path.join(scad, rel);
    fs.writeFileSync(dst, String(req.body.contents || ''));
    res.json({ ok: true, path: dst });
});
app.post('/tools/run_scad', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { scad, out: outDir } = sessionDirs(sessionId);
    const entry = path.join(scad, baseNameSafe(req.body.entry || 'assembly.scad'));
    const out = path.join(outDir, baseNameSafe(req.body.out || req.body.outName || 'out.stl'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const args = Array.isArray(req.body.args) ? req.body.args : [];
    const r = runOpenSCAD(entry, out, args);
    res.json({ status: r.status, out, stderr: r.stderr, stdout: r.stdout, exists: fs.existsSync(out) });
});
app.post('/tools/get_libs', (_req, res) => {
    const libsFile = path.resolve(__dirname, '../../openscad/libraries.txt');
    let libs = [];
    if (fs.existsSync(libsFile)) {
        const lines = fs.readFileSync(libsFile, 'utf-8').split('\n');
        libs = lines.filter(l => l.trim() && !l.startsWith('#')).map(l => l.split(/\s+/)[0]);
    }
    res.json({ libs });
});
// Scene tools
app.post('/tools/add_part', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { scenePath } = sessionDirs(sessionId);
    const scene = loadScene(scenePath);
    const part = req.body.part;
    scene.parts.push(part);
    saveScene(scenePath, scene);
    res.json({ ok: true, count: scene.parts.length });
});
app.post('/tools/set_transform', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { scenePath } = sessionDirs(sessionId);
    const scene = loadScene(scenePath);
    const p = scene.parts.find(x => x && x.id === req.body.id);
    if (!p)
        return res.status(404).json({ ok: false, error: 'not found' });
    p.transform = { ...(p.transform || {}), ...(req.body.transform || {}) };
    saveScene(scenePath, scene);
    res.json({ ok: true });
});
app.post('/tools/set_params', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { scenePath } = sessionDirs(sessionId);
    const scene = loadScene(scenePath);
    const p = scene.parts.find(x => x && x.id === req.body.id);
    if (!p)
        return res.status(404).json({ ok: false, error: 'not found' });
    p.params = { ...p.params, ...(req.body.params || {}) };
    saveScene(scenePath, scene);
    res.json({ ok: true });
});
app.post('/tools/remove_part', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { scenePath } = sessionDirs(sessionId);
    const scene = loadScene(scenePath);
    const before = scene.parts.length;
    scene.parts = scene.parts.filter(x => !(x && x.id === req.body.id));
    saveScene(scenePath, scene);
    res.json({ ok: true, removed: before - scene.parts.length });
});
app.post('/tools/render_preview', (_req, res) => {
    const sessionId = String((_req.body && _req.body.sessionId) || 'default');
    const { scad: scadDir, out: outDir, scenePath } = sessionDirs(sessionId);
    const scene = loadScene(scenePath);
    const scadText = generateScad(scene);
    const scadPath = path.join(scadDir, 'assembly.scad');
    fs.writeFileSync(scadPath, scadText);
    const outName = baseNameSafe((_req.body && _req.body.outName) || 'preview.png');
    const png = path.join(outDir, outName);
    const r = runOpenSCAD(scadPath, png, ['--imgsize=600,400', '--viewall', '--autocenter', '--projection=perspective', '--preview=throwntogether']);
    res.json({ status: r.status, png, exists: fs.existsSync(png) });
});
app.post('/tools/export_artifacts', (_req, res) => {
    const sessionId = String((_req.body && _req.body.sessionId) || 'default');
    const { scad: scadDir, out: outDir, scenePath } = sessionDirs(sessionId);
    const scene = loadScene(scenePath);
    const scadText = generateScad(scene);
    const scadPath = path.join(scadDir, baseNameSafe((_req.body && _req.body.entry) || 'assembly.scad'));
    fs.writeFileSync(scadPath, scadText);
    const stl = path.join(outDir, baseNameSafe((_req.body && _req.body.outName) || 'assembly.stl'));
    const r = runOpenSCAD(scadPath, stl, []);
    res.json({ status: r.status, stl, exists: fs.existsSync(stl) });
});
app.post('/tools/measure', (req, res) => {
    const sessionId = String(req.body.sessionId || 'default');
    const { out: outDir } = sessionDirs(sessionId);
    let stl = req.body.path;
    const outName = req.body.outName;
    if (!stl && outName)
        stl = path.join(outDir, baseNameSafe(outName));
    if (!stl) {
        res.status(400).json({ error: 'missing path' });
        return;
    }
    const m = measureSTL(stl);
    if (m.ok)
        return res.json(m.json);
    res.status(500).json({ error: m.error });
});
const port = Number(process.env.PORT || 8765);
app.listen(port, () => console.log(`[openscad-mcp] listening on ${port}`));
