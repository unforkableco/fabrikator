import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load env from backend/.env first, then repo root .env, then process env
const backendEnv = path.resolve(__dirname, '../.env');
const repoRootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnv)) dotenv.config({ path: backendEnv });
else if (fs.existsSync(repoRootEnv)) dotenv.config({ path: repoRootEnv });
else dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:9876';
// Model selection: prefer SCAD_AGENT_MODEL, then OPENAI_RESPONSES_MODEL, then OPENAI_MODEL, with a final default
const MODEL = process.env.SCAD_AGENT_MODEL || process.env.OPENAI_RESPONSES_MODEL || process.env.OPENAI_MODEL || 'gpt-5';

// Per-agent session identifiers and canonical file names
const SESSION_ID = (process.env.SCAD_AGENT_ID || uuidv4()).slice(0, 12);
const SCAD_FILE = `${SESSION_ID}_assembly.scad`;
let lastStlPath: string | undefined;
const exportedStls: string[] = [];
const MAX_STEPS = Number(process.env.SCAD_AGENT_MAX_STEPS || 60);
const MAX_IDLE_ROUNDS = Number(process.env.SCAD_AGENT_MAX_IDLE || 3);

async function post<T>(endpoint: string, body: any): Promise<T> {
  console.log(`[agent->mcp] POST ${endpoint} body=`, body);
  const res = await fetch(`${MCP_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${endpoint} ${res.status} ${txt}`);
  }
  const json = (await res.json()) as T;
  console.log(`[mcp->agent] ${endpoint} resp=`, json);
  return json;
}

const tools = [
  { type: 'function', name: 'get_libs', description: 'List installed OpenSCAD libraries available via OPENSCADPATH', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { type: 'function', name: 'write_scad', description: 'Write or overwrite a .scad file in the workspace', parameters: { type: 'object', properties: { path: { type: 'string' }, contents: { type: 'string' } }, required: ['path', 'contents'], additionalProperties: false } },
  { type: 'function', name: 'run_scad', description: 'Run openscad on an entry .scad to produce output', parameters: { type: 'object', properties: { entry: { type: 'string' }, out: { type: 'string' }, args: { type: 'array', items: { type: 'string' } } }, required: ['entry', 'out'], additionalProperties: false } },
  { type: 'function', name: 'add_part', description: 'Add a parametric scene part (primitive or library-backed)', parameters: { type: 'object', properties: { part: { type: 'object' } }, required: ['part'], additionalProperties: true } },
  { type: 'function', name: 'set_transform', description: 'Update transform for a part', parameters: { type: 'object', properties: { id: { type: 'string' }, transform: { type: 'object' } }, required: ['id','transform'], additionalProperties: false } },
  { type: 'function', name: 'set_params', description: 'Patch parameters of a part', parameters: { type: 'object', properties: { id: { type: 'string' }, params: { type: 'object' } }, required: ['id','params'], additionalProperties: false } },
  { type: 'function', name: 'remove_part', description: 'Remove a part by id', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } },
  { type: 'function', name: 'render_preview', description: 'Render a preview PNG of the current scene', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { type: 'function', name: 'export_artifacts', description: 'Export assembly STL', parameters: { type: 'object', properties: {}, additionalProperties: false } },
  { type: 'function', name: 'measure', description: 'Measure an STL file (bbox, volume)', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } }
];

// Convert tools to Chat Completions schema
const chatTools = tools.map((t: any) => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.parameters }
}));

async function executeTool(name: string, args: any): Promise<any> {
  console.log(`[agent] exec tool ${name} args=`, args);
  switch (name) {
    case 'get_libs': return await post('/tools/get_libs', { sessionId: SESSION_ID });
    case 'write_scad': {
      // Force a single canonical file name per agent session
      const body = { sessionId: SESSION_ID, ...args, path: SCAD_FILE };
      return await post('/tools/write_scad', body);
    }
    case 'run_scad': {
      // Always run the canonical file
      const body = { sessionId: SESSION_ID, ...args, entry: SCAD_FILE };
      const res = await post('/tools/run_scad', body);
      return res;
    }
    case 'add_part': return await post('/tools/add_part', { sessionId: SESSION_ID, ...args });
    case 'set_transform': return await post('/tools/set_transform', { sessionId: SESSION_ID, ...args });
    case 'set_params': return await post('/tools/set_params', { sessionId: SESSION_ID, ...args });
    case 'remove_part': return await post('/tools/remove_part', { sessionId: SESSION_ID, ...args });
    case 'render_preview': return await post('/tools/render_preview', { sessionId: SESSION_ID, ...args });
    case 'export_artifacts': {
      const res = await post('/tools/export_artifacts', { sessionId: SESSION_ID, ...args });
      if (res && (res as any).stl) {
        const stlPath = String((res as any).stl);
        lastStlPath = stlPath;
        if (stlPath && !exportedStls.includes(stlPath)) exportedStls.push(stlPath);
      }
      return res;
    }
    case 'measure': {
      // Ensure we provide an STL path; export first if needed
      const p = args?.path ? String(args.path) : '';
      // If .scad or empty, export first
      if (!p || p.endsWith('.scad')) {
        if (!lastStlPath) {
          const exp = await post('/tools/export_artifacts', { sessionId: SESSION_ID });
          lastStlPath = String((exp as any).stl || '');
        }
        const outName = require('path').basename(lastStlPath || 'assembly.stl');
        return await post('/tools/measure', { sessionId: SESSION_ID, outName });
      }
      // Always convert to relative outName so server resolves within session
      const outName = require('path').basename(p);
      return await post('/tools/measure', { sessionId: SESSION_ID, outName });
    }
    default: throw new Error(`Unknown tool ${name}`);
  }
}

function makeSystemPrompt() {
  return [
    'You are an OpenSCAD modeling agent operating in one conversation.',
    'Start from an empty scene and build the model step-by-step using the available tools.',
    'Prefer structured scene tools (add_part, set_transform, set_params, render_preview, export_artifacts).',
    'You may also write raw OpenSCAD using write_scad + run_scad when helpful (libraries available via get_libs).',
    'Use exactly one SCAD file for this session: do not pick filenames; always write to the canonical file maintained by the host.',
    'Always export STL (export_artifacts) before calling measure; measure requires an STL path.',
    'First, infer and enumerate the printable parts (plate-by-plate outputs). For each part, create or update its SCAD, render a preview, and export a per-part STL to the session out/ folder. Use descriptive outName values like lid.stl, base.stl, arm_left.stl.',
    'Iterate: add/edit → render_preview → export_artifacts (per part) → measure → adjust until the design meets the description.',
    'When the design is fully complete and all printable parts have been exported as STL, reply with the single word: DONE.',
    'Avoid narrative-only replies. If you need to proceed, immediately call the next tools. Do not stop after a "first pass"—continue emitting tool calls until DONE.',
    'Return export_artifacts when ready. Keep changes minimal and reversible.'
  ].join(' ');
}

async function main() {
  // Args: <specPath> [--image <imagePath>]
  const argv = process.argv.slice(2);
  const specPath = argv[0];
  let imagePath: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--image') imagePath = argv[i + 1];
  }
  const spec = specPath && fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : (argv[0] || 'Design a simple rectangular enclosure with four mounting bosses and a lid.');
  const hasImage = imagePath && fs.existsSync(imagePath);

  const client = new OpenAI();
  // Chat Completions loop (SDK 6.x compatible)
  const messages: any[] = [];
  messages.push({ role: 'system', content: makeSystemPrompt() });
  messages.push({ role: 'user', content: [{ type: 'text', text: `Device spec:\n${spec}` }] });
  if (hasImage) {
    const b = fs.readFileSync(imagePath!);
    const ext = path.extname(imagePath!).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    const dataUrl = `data:${mime};base64,${b.toString('base64')}`;
    messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }] });
  }

  let idleRounds = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    const cmp = await (client as any).chat.completions.create({ model: MODEL, messages, tools: chatTools });
    const msg = cmp.choices[0].message as any;
    messages.push(msg);
    const toolCalls = msg.tool_calls || [];
    if (!toolCalls.length) {
      const content = (msg.content || '').trim();
      if (/^done$/i.test(content) && exportedStls.length > 0) {
        console.log('DONE');
        break;
      }
      idleRounds++;
      if (idleRounds >= MAX_IDLE_ROUNDS) {
        console.log('Idle limit reached without tool calls. Stopping.');
        break;
      }
      // Nudge the model to act
      messages.push({ role: 'user', content: [{ type: 'text', text: 'Continue and call the next tools to proceed; do not summarize—act. Export STL for each printable part and reply DONE only when fully complete.' }] });
      continue;
    } else {
      idleRounds = 0;
    }
    for (const tc of toolCalls) {
      const name = tc.function?.name || tc.name;
      let args: any = tc.function?.arguments || tc.arguments || '{}';
      if (typeof args === 'string') { try { args = JSON.parse(args); } catch {} }
      const result = await executeTool(name, args);
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
