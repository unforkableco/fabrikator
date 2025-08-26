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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const prompts_1 = require("./prompts");
const utils_1 = require("./utils");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
class RetryManager {
    constructor(pythonBin, tempDir) {
        this.pythonBin = pythonBin;
        this.tempDir = tempDir;
    }
    async generateWithRetry(part, scriptDir, stlDir) {
        const attempts = [];
        const scriptPath = path.join(scriptDir, `${part.key}.py`);
        const stlPath = path.join(stlDir, `${part.key}.stl`);
        const attempt1 = await this.attemptGeneration(part, 'initial', (0, prompts_1.buildCadGenerationPrompt)(part), scriptPath, stlPath, 0.2);
        attempts.push(attempt1);
        if (attempt1.success) {
            return { part, scriptPath, stlPath, success: true, attempts };
        }
        if (attempt1.error) {
            const fixPath = path.join(scriptDir, `${part.key}.fix1.py`);
            const attempt2 = await this.attemptErrorFix(part, attempt1.error, fixPath, stlPath);
            attempts.push(attempt2);
            if (attempt2.success) {
                return { part, scriptPath: fixPath, stlPath, success: true, attempts };
            }
        }
        const simplifiedPath = path.join(scriptDir, `${part.key}.simple.py`);
        const attempt3 = await this.attemptGeneration(part, 'simplified', (0, prompts_1.buildSimplifiedCadPrompt)(part), simplifiedPath, stlPath, 0.1);
        attempts.push(attempt3);
        if (attempt3.success) {
            return { part, scriptPath: simplifiedPath, stlPath, success: true, attempts };
        }
        const primitivePath = path.join(scriptDir, `${part.key}.primitive.py`);
        const attempt4 = await this.attemptGeneration(part, 'primitive', (0, prompts_1.buildPrimitiveFallbackPrompt)(part), primitivePath, stlPath, 0.0);
        attempts.push(attempt4);
        return {
            part,
            scriptPath: attempt4.success ? primitivePath : scriptPath,
            stlPath,
            success: attempt4.success,
            attempts,
            finalError: attempts[attempts.length - 1].error
        };
    }
    async attemptGeneration(part, strategy, systemPrompt, scriptPath, stlPath, temperature) {
        try {
            const code = await this.generateCode(systemPrompt, temperature);
            if (!code || code.trim().length < 10) {
                return { attempt: 0, strategy, success: false, error: 'AI did not return valid code' };
            }
            const success = await this.executeScript(code, part.key, scriptPath, stlPath);
            if (success) {
                return { attempt: 0, strategy, success: true };
            }
            else {
                const errorLog = this.getLastExecutionError(scriptPath);
                return { attempt: 0, strategy, success: false, error: errorLog };
            }
        }
        catch (error) {
            return { attempt: 0, strategy, success: false, error: String(error) };
        }
    }
    async attemptErrorFix(part, originalError, fixPath, stlPath) {
        try {
            const originalScript = await this.getLastGeneratedScript(part.key);
            if (!originalScript) {
                return { attempt: 0, strategy: 'error_fix', success: false, error: 'No original script to fix' };
            }
            const fixPrompt = (0, prompts_1.buildErrorRecoveryPrompt)(part, originalScript, originalError);
            const fixedCode = await this.generateCode(fixPrompt, 0.1);
            if (!fixedCode || fixedCode.trim().length < 10) {
                return { attempt: 0, strategy: 'error_fix', success: false, error: 'AI did not return fixed code' };
            }
            const success = await this.executeScript(fixedCode, part.key, fixPath, stlPath);
            if (success) {
                return { attempt: 0, strategy: 'error_fix', success: true };
            }
            else {
                const errorLog = this.getLastExecutionError(fixPath);
                return { attempt: 0, strategy: 'error_fix', success: false, error: errorLog };
            }
        }
        catch (error) {
            return { attempt: 0, strategy: 'error_fix', success: false, error: String(error) };
        }
    }
    async generateCode(systemPrompt, temperature) {
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: OPENAI_MODEL,
            temperature,
            messages: [{ role: 'system', content: systemPrompt }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            timeout: 120000,
        });
        return (0, utils_1.stripCodeFences)(response.data.choices[0].message.content || '');
    }
    async executeScript(code, partKey, scriptPath, stlPath) {
        const wrapped = `import os\nimport math\nimport cadquery as cq\nfrom cadquery import exporters\n\n${code}\n\nsolid = build_part()\nif isinstance(solid, cq.Workplane):\n    solid = solid.val()\nexporters.export(solid, os.environ.get('STL_PATH', r'${stlPath.replace(/\\/g, '\\\\')}'))\n`;
        (0, utils_1.writeFileSafe)(scriptPath, wrapped);
        const env = { ...process.env, STL_PATH: stlPath };
        const result = (0, child_process_1.spawnSync)(this.pythonBin, [scriptPath], { encoding: 'utf8', env });
        return result.status === 0 && fs.existsSync(stlPath);
    }
    getLastExecutionError(scriptPath) {
        return 'Script execution failed - check CadQuery syntax and geometry';
    }
    async getLastGeneratedScript(partKey) {
        try {
            const scriptPath = path.join(this.tempDir, 'parts_scripts', `${partKey}.py`);
            return fs.readFileSync(scriptPath, 'utf-8');
        }
        catch {
            return null;
        }
    }
}
exports.RetryManager = RetryManager;
