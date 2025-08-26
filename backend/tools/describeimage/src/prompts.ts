import * as path from 'path';
import { loadMarkdownFile } from './utils';
import { AnalysisResult, Part } from './types';

// Load prompt templates
const PROMPTS_DIR = path.join(__dirname, '../prompts');
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

// Load base prompts
const visionAnalysisPrompt = loadMarkdownFile(path.join(PROMPTS_DIR, 'vision-analysis.md'));
const partsProposalPrompt = loadMarkdownFile(path.join(PROMPTS_DIR, 'parts-proposal.md'));
const cadGenerationPrompt = loadMarkdownFile(path.join(PROMPTS_DIR, 'cad-generation.md'));
const errorRecoveryPrompt = loadMarkdownFile(path.join(PROMPTS_DIR, 'error-recovery.md'));

// Load knowledge base
const cadBestPractices = loadMarkdownFile(path.join(KNOWLEDGE_DIR, 'cad-best-practices.md'));
const printingConstraints = loadMarkdownFile(path.join(KNOWLEDGE_DIR, 'printing-constraints.md'));
const commonErrors = loadMarkdownFile(path.join(KNOWLEDGE_DIR, 'common-errors.md'));
const materialsGuide = loadMarkdownFile(path.join(KNOWLEDGE_DIR, 'materials.md'));

// official cadquery docs scraped with context7
const cadqueryDocs = loadMarkdownFile(path.join(KNOWLEDGE_DIR, 'cadquery-official-docs.md'));

export function buildVisionAnalysisPrompt(): string {
  return visionAnalysisPrompt + '\n\n' + 
         '## 3D Printing Knowledge:\n' + printingConstraints;
}

export function buildPartsProposalPrompt(analysis: AnalysisResult): string {
  const context = `\n\nContext from image analysis:\n${JSON.stringify(analysis)}`;
  return partsProposalPrompt + '\n\n' +
         '## 3D Printing Guidelines:\n' + printingConstraints + '\n\n' +
         '## Material Considerations:\n' + materialsGuide + 
         context;
}

export function buildCadGenerationPrompt(part: Part): string {
  const partContext = `\n\nPart to generate:\n${JSON.stringify(part)}`;
  return cadGenerationPrompt + '\n\n' +
         '## CADQUERY KNOWLEDGE / OFFICIAL DOCS:\n' + cadqueryDocs + '\n\n' +
         '## CAD Best Practices:\n' + cadBestPractices + '\n\n' +
         '## Common Errors to Avoid:\n' + commonErrors +
         partContext;
}

export function buildErrorRecoveryPrompt(part: Part, originalCode: string, error: string): string {
  const context = `\n\nOriginal part: ${JSON.stringify(part)}\n\n` +
                  `Original code:\n\n${originalCode}\n\n` +
                  `Error:\n${error}`;
  return errorRecoveryPrompt + '\n\n' +
         '## Error Patterns Reference:\n' + commonErrors + 
         context;
}

export function buildSimplifiedCadPrompt(part: Part): string {
  const simplifiedPart = {
    ...part,
    features: part.features.slice(0, 2), // Keep only basic features
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

export function buildPrimitiveFallbackPrompt(part: Part): string {
  const dims = part.approx_dims_mm || { length: 50, width: 30, height: 20 };
  const fallbackContext = `\n\nCreate a basic primitive shape with dimensions: ${JSON.stringify(dims)}`;
  
  return 'Generate a simple primitive CadQuery script (box or cylinder only).\n' +
         'No complex features - just basic geometry that will always work.\n' +
         'Use cq.Workplane().box() or .cylinder() operations only.\n' +
         'Ensure minimum wall thickness of 1.0mm for 3D printing.' +
         fallbackContext;
}