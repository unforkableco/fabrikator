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
exports.buildVisionAnalysisPrompt = buildVisionAnalysisPrompt;
exports.buildPartsProposalPrompt = buildPartsProposalPrompt;
exports.buildCadGenerationPrompt = buildCadGenerationPrompt;
exports.buildErrorRecoveryPrompt = buildErrorRecoveryPrompt;
exports.buildSimplifiedCadPrompt = buildSimplifiedCadPrompt;
exports.buildPrimitiveFallbackPrompt = buildPrimitiveFallbackPrompt;
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const PROMPTS_DIR = path.join(__dirname, '../prompts');
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const visionAnalysisPrompt = (0, utils_1.loadMarkdownFile)(path.join(PROMPTS_DIR, 'vision-analysis.md'));
const partsProposalPrompt = (0, utils_1.loadMarkdownFile)(path.join(PROMPTS_DIR, 'parts-proposal.md'));
const cadGenerationPrompt = (0, utils_1.loadMarkdownFile)(path.join(PROMPTS_DIR, 'cad-generation.md'));
const errorRecoveryPrompt = (0, utils_1.loadMarkdownFile)(path.join(PROMPTS_DIR, 'error-recovery.md'));
const cadBestPractices = (0, utils_1.loadMarkdownFile)(path.join(KNOWLEDGE_DIR, 'cad-best-practices.md'));
const printingConstraints = (0, utils_1.loadMarkdownFile)(path.join(KNOWLEDGE_DIR, 'printing-constraints.md'));
const commonErrors = (0, utils_1.loadMarkdownFile)(path.join(KNOWLEDGE_DIR, 'common-errors.md'));
const materialsGuide = (0, utils_1.loadMarkdownFile)(path.join(KNOWLEDGE_DIR, 'materials.md'));
const cadqueryDocs = (0, utils_1.loadMarkdownFile)(path.join(KNOWLEDGE_DIR, 'cadquery-official-docs.md'));
function buildVisionAnalysisPrompt() {
    return visionAnalysisPrompt + '\n\n' +
        '## 3D Printing Knowledge:\n' + printingConstraints;
}
function buildPartsProposalPrompt(analysis) {
    const context = `\n\nContext from image analysis:\n${JSON.stringify(analysis)}`;
    return partsProposalPrompt + '\n\n' +
        '## 3D Printing Guidelines:\n' + printingConstraints + '\n\n' +
        '## Material Considerations:\n' + materialsGuide +
        context;
}
function buildCadGenerationPrompt(part) {
    const partContext = `\n\nPart to generate:\n${JSON.stringify(part)}`;
    return cadGenerationPrompt + '\n\n' +
        '## CADQUERY KNOWLEDGE / OFFICIAL DOCS:\n' + cadqueryDocs + '\n\n' +
        '## CAD Best Practices:\n' + cadBestPractices + '\n\n' +
        '## Common Errors to Avoid:\n' + commonErrors +
        partContext;
}
function buildErrorRecoveryPrompt(part, originalCode, error) {
    const context = `\n\nOriginal part: ${JSON.stringify(part)}\n\n` +
        `Original code:\n\n${originalCode}\n\n` +
        `Error:\n${error}`;
    return errorRecoveryPrompt + '\n\n' +
        '## Error Patterns Reference:\n' + commonErrors +
        context;
}
function buildSimplifiedCadPrompt(part) {
    const simplifiedPart = {
        ...part,
        features: part.features.slice(0, 2),
        geometry_hint: 'Simple box or cylinder with minimal features'
    };
    const partContext = `\n\nSimplified part to generate:\n${JSON.stringify(simplifiedPart)}`;
    return 'You write simple, robust CadQuery (Python) code for a basic 3D printable part.\n\n' +
        'Create a simple geometric approximation (box, cylinder, or basic extrusion).\n' +
        'Use minimal features and avoid complex operations.\n' +
        'Focus on printability over exact feature replication.\n\n' +
        '## Basic CAD Rules:\n' + cadBestPractices +
        partContext;
}
function buildPrimitiveFallbackPrompt(part) {
    const dims = part.approx_dims_mm || { length: 50, width: 30, height: 20 };
    const fallbackContext = `\n\nCreate a basic primitive shape with dimensions: ${JSON.stringify(dims)}`;
    return 'Generate a simple primitive CadQuery script (box or cylinder only).\n' +
        'No complex features - just basic geometry that will always work.\n' +
        'Use cq.Workplane().box() or .cylinder() operations only.\n' +
        'Ensure minimum wall thickness of 1.0mm for 3D printing.' +
        fallbackContext;
}
