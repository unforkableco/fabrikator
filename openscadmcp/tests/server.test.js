const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ method: 'POST', hostname: u.hostname, port: u.port, path: u.pathname, headers: { 'content-type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body || {}));
    req.end();
  });
}

function expectJson(r) { const o = JSON.parse(r.text); expect(typeof o).toBe('object'); return o; }

describe('openscad-mcp server', () => {
  let proc;
  const port = 9876;
  beforeAll(async () => {
    const serverPath = path.resolve(__dirname, '../dist/server.js');
    proc = spawn('node', [serverPath], { env: { ...process.env, PORT: String(port) }, cwd: path.resolve(__dirname, '..') });
    const start = Date.now();
    while (Date.now() - start < 5000) {
      try {
        const r = await httpPost(`http://localhost:${port}/tools/get_scene`, {});
        if (r.status === 200) return;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('server did not start');
  }, 20000);

  afterAll(() => { try { proc.kill(); } catch (e) {} });

  it('responds to demo', async () => {
    const r = await httpPost(`http://localhost:${port}/tools/demo`, {});
    expect(r.status).toBe(200);
    expectJson(r);
  });

  it('add_part -> render_preview -> export_artifacts -> measure works', async () => {
    // add cube
    let r = await httpPost(`http://localhost:${port}/tools/add_part`, { part: { id: 'cube1', kind: 'primitive.cube', params: { size: [20,20,20], center: true }, transform: { translate: [0,0,0] } } });
    expect(r.status).toBe(200);
    expectJson(r);

    // preview
    r = await httpPost(`http://localhost:${port}/tools/render_preview`, {});
    const prev = expectJson(r);
    expect(prev.status).toBe(0);
    expect(prev.exists).toBe(true);

    // export stl
    r = await httpPost(`http://localhost:${port}/tools/export_artifacts`, {});
    const exp = expectJson(r);
    expect(exp.status).toBe(0);
    expect(exp.exists).toBe(true);

    // measure
    r = await httpPost(`http://localhost:${port}/tools/measure`, { path: exp.stl });
    const m = expectJson(r);
    expect(Array.isArray(m.bbox)).toBe(true);
    expect(m.volume).toBeGreaterThan(0);
  });

  it('raw write_scad/run_scad works', async () => {
    const scad = 'sphere(r=5);';
    let r = await httpPost(`http://localhost:${port}/tools/write_scad`, { path: 'raw/test.scad', contents: scad });
    const w = expectJson(r);
    expect(fs.existsSync(w.path)).toBe(true);

    r = await httpPost(`http://localhost:${port}/tools/run_scad`, { entry: 'raw/test.scad', out: 'raw/out.stl', args: [] });
    const run = expectJson(r);
    expect(run.status).toBe(0);
    expect(run.exists).toBe(true);
  });
});
