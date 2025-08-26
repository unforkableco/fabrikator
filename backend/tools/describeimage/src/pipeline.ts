import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { AnalysisResult, Part, PartsDocument, GenerationResult } from './types';
import { buildVisionAnalysisPrompt, buildPartsProposalPrompt } from './prompts';
import { ensureDirs, toDataUrl, writeFileSafe, ensureVenv } from './utils';
import { RetryManager } from './retry';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(1);
}

export class DescribeImagePipeline {
  private backendRoot: string;
  private scriptsBase: string;
  private scriptsDir: string;
  private stlDir: string;
  private pythonBin: string;

  constructor(backendRoot: string) {
    this.backendRoot = backendRoot;
    this.scriptsBase = path.join(backendRoot, 'scripts');
    
    // Ensure directories exist (same as original)
    const dirs = ensureDirs(this.scriptsBase);
    this.scriptsDir = dirs.scriptsDir;
    this.stlDir = dirs.stlDir;
    
    // Ensure Python venv
    this.pythonBin = ensureVenv(backendRoot);
  }

  async processImage(imagePath: string): Promise<void> {
    console.log(`Processing image: ${imagePath}`);
    const timestamp = Date.now();

    try {
      // 1) Vision analysis (same output format as original)
      console.log('Analyzing image...');
      const analysis = await this.analyzeImage(imagePath);
      this.saveAnalysis(analysis, timestamp);

      // 2) Parts proposal (same output format as original)  
      console.log('Proposing parts...');
      const partsDoc = await this.proposeParts(analysis);
      this.saveParts(partsDoc, timestamp);

      // 3) Generate CAD scripts and STL files with improved retry logic
      console.log('Generating CAD scripts and STL files...');
      await this.generateAllParts(partsDoc.parts);

      console.log('Pipeline completed');
    } catch (error) {
      console.error('Pipeline error:', (error as Error)?.message || error);
      process.exit(1);
    }
  }

  private async analyzeImage(imagePath: string): Promise<AnalysisResult> {
    const dataUrl = toDataUrl(imagePath);
    const systemPrompt = buildVisionAnalysisPrompt();
    
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

  private async proposeParts(analysis: AnalysisResult): Promise<PartsDocument> {
    const systemPrompt = buildPartsProposalPrompt(analysis);
    
    const response = await this.callOpenAIJson([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analysis: ${JSON.stringify(analysis)}` }
    ], 0.3);

    const parsed = JSON.parse(response);
    if (!parsed.parts || !Array.isArray(parsed.parts)) {
      parsed.parts = [];
    }

    // Normalize keys (same as original)
    parsed.parts = parsed.parts.map((p: any, i: number) => ({
      key: (p.key || `part_${i}`).toLowerCase().replace(/[^a-z0-9_\-]/g, '_'),
      name: p.name || `Part ${i+1}`,
      role: p.role || null,
      geometry_hint: p.geometry_hint || null,
      approx_dims_mm: p.approx_dims_mm || p.approxDims || null,
      features: p.features || [],
      appearance: p.appearance || null,
    }));

    return parsed;
  }

  private async generateAllParts(parts: Part[]): Promise<void> {
    const retryManager = new RetryManager(this.pythonBin, this.scriptsBase);
    
    for (const part of parts) {
      const key = part.key || `part_${Math.random().toString(36).slice(2, 8)}`;
      console.log(`Generating ${key}...`);
      
      try {
        const result = await retryManager.generateWithRetry(part, this.scriptsDir, this.stlDir);
        
        if (result.success) {
          console.log(`Generated STL for ${key}: ${result.stlPath}`);
        } else {
          console.error(`Failed to generate ${key} after ${result.attempts.length} attempts`);
          if (result.finalError) {
            console.error(`Final error: ${result.finalError}`);
          }
        }
      } catch (error) {
        console.error(`Exception generating ${key}:`, (error as Error)?.message || error);
      }
    }
  }

  private saveAnalysis(analysis: AnalysisResult, timestamp: number): void {
    const analysisLatest = path.join(this.scriptsBase, 'analysis_latest.json');
    const analysisStamped = path.join(this.scriptsBase, `analysis_${timestamp}.json`);
    
    const content = JSON.stringify(analysis, null, 2);
    writeFileSafe(analysisLatest, content);
    writeFileSafe(analysisStamped, content);
    
    console.log(`Saved analysis: ${analysisLatest}`);
  }

  private saveParts(partsDoc: PartsDocument, timestamp: number): void {
    const partsLatest = path.join(this.scriptsBase, 'parts_latest.json');
    const partsStamped = path.join(this.scriptsBase, `parts_${timestamp}.json`);
    
    const content = JSON.stringify(partsDoc, null, 2);
    writeFileSafe(partsLatest, content);
    writeFileSafe(partsStamped, content);
    
    console.log(`Saved parts: ${partsLatest}`);
  }

  private async callOpenAIJson(messages: any[], temperature: number = 0.4): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature,
        messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 120000,
      }
    );

    return response.data.choices[0].message.content;
  }
}