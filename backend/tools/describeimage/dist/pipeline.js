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
exports.DescribeImagePipeline = void 0;
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const prompts_1 = require("./prompts");
const utils_1 = require("./utils");
const retry_1 = require("./retry");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    process.exit(1);
}
class DescribeImagePipeline {
    constructor(backendRoot) {
        this.backendRoot = backendRoot;
        this.scriptsBase = path.join(backendRoot, 'scripts');
        const dirs = (0, utils_1.ensureDirs)(this.scriptsBase);
        this.scriptsDir = dirs.scriptsDir;
        this.stlDir = dirs.stlDir;
        this.pythonBin = (0, utils_1.ensureVenv)(backendRoot);
    }
    async processImage(imagePath) {
        console.log(`Processing image: ${imagePath}`);
        const timestamp = Date.now();
        try {
            console.log('Analyzing image...');
            const analysis = await this.analyzeImage(imagePath);
            this.saveAnalysis(analysis, timestamp);
            console.log('Proposing parts...');
            const partsDoc = await this.proposeParts(analysis);
            this.saveParts(partsDoc, timestamp);
            console.log('Generating CAD scripts and STL files...');
            await this.generateAllParts(partsDoc.parts);
            console.log('Pipeline completed');
        }
        catch (error) {
            console.error('Pipeline error:', error?.message || error);
            process.exit(1);
        }
    }
    async analyzeImage(imagePath) {
        const dataUrl = (0, utils_1.toDataUrl)(imagePath);
        const systemPrompt = (0, prompts_1.buildVisionAnalysisPrompt)();
        const userContent = [
            { type: 'text', text: 'Analyze this device image. Output strict JSON as instructed.' },
            { type: 'image_url', image_url: { url: dataUrl } },
        ];
        const response = await this.callOpenAIJson([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ], 0.4);
        return JSON.parse(response);
    }
    async proposeParts(analysis) {
        const systemPrompt = (0, prompts_1.buildPartsProposalPrompt)(analysis);
        const response = await this.callOpenAIJson([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analysis: ${JSON.stringify(analysis)}` }
        ], 0.3);
        const parsed = JSON.parse(response);
        if (!parsed.parts || !Array.isArray(parsed.parts)) {
            parsed.parts = [];
        }
        parsed.parts = parsed.parts.map((p, i) => ({
            key: (p.key || `part_${i}`).toLowerCase().replace(/[^a-z0-9_\-]/g, '_'),
            name: p.name || `Part ${i + 1}`,
            role: p.role || null,
            geometry_hint: p.geometry_hint || null,
            approx_dims_mm: p.approx_dims_mm || p.approxDims || null,
            features: p.features || [],
            appearance: p.appearance || null,
        }));
        return parsed;
    }
    async generateAllParts(parts) {
        const retryManager = new retry_1.RetryManager(this.pythonBin, this.scriptsBase);
        for (const part of parts) {
            const key = part.key || `part_${Math.random().toString(36).slice(2, 8)}`;
            console.log(`Generating ${key}...`);
            try {
                const result = await retryManager.generateWithRetry(part, this.scriptsDir, this.stlDir);
                if (result.success) {
                    console.log(`Generated STL for ${key}: ${result.stlPath}`);
                }
                else {
                    console.error(`Failed to generate ${key} after ${result.attempts.length} attempts`);
                    if (result.finalError) {
                        console.error(`Final error: ${result.finalError}`);
                    }
                }
            }
            catch (error) {
                console.error(`Exception generating ${key}:`, error?.message || error);
            }
        }
    }
    saveAnalysis(analysis, timestamp) {
        const analysisLatest = path.join(this.scriptsBase, 'analysis_latest.json');
        const analysisStamped = path.join(this.scriptsBase, `analysis_${timestamp}.json`);
        const content = JSON.stringify(analysis, null, 2);
        (0, utils_1.writeFileSafe)(analysisLatest, content);
        (0, utils_1.writeFileSafe)(analysisStamped, content);
        console.log(`Saved analysis: ${analysisLatest}`);
    }
    saveParts(partsDoc, timestamp) {
        const partsLatest = path.join(this.scriptsBase, 'parts_latest.json');
        const partsStamped = path.join(this.scriptsBase, `parts_${timestamp}.json`);
        const content = JSON.stringify(partsDoc, null, 2);
        (0, utils_1.writeFileSafe)(partsLatest, content);
        (0, utils_1.writeFileSafe)(partsStamped, content);
        console.log(`Saved parts: ${partsLatest}`);
    }
    async callOpenAIJson(messages, temperature = 0.4) {
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: OPENAI_MODEL,
            response_format: { type: 'json_object' },
            temperature,
            messages,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            timeout: 120000,
        });
        return response.data.choices[0].message.content;
    }
}
exports.DescribeImagePipeline = DescribeImagePipeline;
