import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

export function ensureDirs(baseDir: string) {
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

export function toDataUrl(imagePath: string): string {
  const buf = fs.readFileSync(imagePath);
  const ext = (imagePath.split('.').pop() || 'png').toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export function writeFileSafe(fp: string, content: string): void {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content);
}

export function ensureVenv(backendRoot: string): string {
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

export function loadMarkdownFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (error) {
    console.error(`Error loading markdown file ${filePath}:`, error);
    return '';
  }
}

export function stripCodeFences(code: string): string {
  return code
    .replace(/^```python[\r\n]*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}