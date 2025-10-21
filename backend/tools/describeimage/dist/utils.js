"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDirs = ensureDirs;
exports.toDataUrl = toDataUrl;
exports.writeFileSafe = writeFileSafe;
exports.ensureVenv = ensureVenv;
exports.loadMarkdownFile = loadMarkdownFile;
exports.stripCodeFences = stripCodeFences;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
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
function writeFileSafe(fp, content) {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, content);
}
function ensureVenv(backendRoot) {
    const venvDir = path.join(backendRoot, '.venv');
    const py = path.join(venvDir, 'bin', 'python3');
    if (!fs.existsSync(py)) {
        console.log('Creating Python venv for CadQuery...');
        (0, child_process_1.spawnSync)('python3', ['-m', 'venv', venvDir], { stdio: 'inherit' });
    }
    const chk = (0, child_process_1.spawnSync)(py, ['-c', 'import cadquery'], { encoding: 'utf8' });
    if (chk.status !== 0) {
        console.log('Installing cadquery in venv...');
        const pip = path.join(venvDir, 'bin', 'pip');
        (0, child_process_1.spawnSync)(pip, ['install', '--upgrade', 'pip', 'wheel', 'setuptools'], { stdio: 'inherit' });
        (0, child_process_1.spawnSync)(pip, ['install', 'cadquery==2.3.1'], { stdio: 'inherit' });
    }
    return py;
}
function loadMarkdownFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8').trim();
    }
    catch (error) {
        console.error(`Error loading markdown file ${filePath}:`, error);
        return '';
    }
}
function stripCodeFences(code) {
    return code
        .replace(/^```python[\r\n]*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
}
