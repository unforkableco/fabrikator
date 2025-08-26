import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import axios from 'axios';
import { Part, RetryAttempt, GenerationResult } from './types';
import { buildCadGenerationPrompt, buildErrorRecoveryPrompt, buildSimplifiedCadPrompt, buildPrimitiveFallbackPrompt } from './prompts';
import { stripCodeFences, writeFileSafe } from './utils';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export class RetryManager {
  private pythonBin: string;
  private tempDir: string;

  constructor(pythonBin: string, tempDir: string) {
    this.pythonBin = pythonBin;
    this.tempDir = tempDir;
  }

  async generateWithRetry(part: Part, scriptDir: string, stlDir: string): Promise<GenerationResult> {
    const attempts: RetryAttempt[] = [];
    const scriptPath = path.join(scriptDir, `${part.key}.py`);
    const stlPath = path.join(stlDir, `${part.key}.stl`);

    // Attempt 1: Initial generation with enhanced prompts
    const attempt1 = await this.attemptGeneration(part, 'initial', buildCadGenerationPrompt(part), scriptPath, stlPath, 0.2);
    attempts.push(attempt1);
    if (attempt1.success) {
      return { part, scriptPath, stlPath, success: true, attempts };
    }

    // Attempt 2: Error-aware fix using the error from attempt 1
    if (attempt1.error) {
      const fixPath = path.join(scriptDir, `${part.key}.fix1.py`);
      const attempt2 = await this.attemptErrorFix(part, attempt1.error, fixPath, stlPath);
      attempts.push(attempt2);
      if (attempt2.success) {
        return { part, scriptPath: fixPath, stlPath, success: true, attempts };
      }
    }

    // Attempt 3: Simplified approach (reduce complexity)
    const simplifiedPath = path.join(scriptDir, `${part.key}.simple.py`);
    const attempt3 = await this.attemptGeneration(part, 'simplified', buildSimplifiedCadPrompt(part), simplifiedPath, stlPath, 0.1);
    attempts.push(attempt3);
    if (attempt3.success) {
      return { part, scriptPath: simplifiedPath, stlPath, success: true, attempts };
    }

    // Attempt 4: Primitive fallback (basic shapes only)
    const primitivePath = path.join(scriptDir, `${part.key}.primitive.py`);
    const attempt4 = await this.attemptGeneration(part, 'primitive', buildPrimitiveFallbackPrompt(part), primitivePath, stlPath, 0.0);
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

  private async attemptGeneration(
    part: Part, 
    strategy: 'initial' | 'simplified' | 'primitive', 
    systemPrompt: string, 
    scriptPath: string, 
    stlPath: string,
    temperature: number
  ): Promise<RetryAttempt> {
    try {
      // Generate code using AI
      const code = await this.generateCode(systemPrompt, temperature);
      if (!code || code.trim().length < 10) {
        return { attempt: 0, strategy, success: false, error: 'AI did not return valid code' };
      }

      // Execute the code
      const success = await this.executeScript(code, part.key, scriptPath, stlPath);
      
      if (success) {
        return { attempt: 0, strategy, success: true };
      } else {
        // Get error from last execution
        const errorLog = this.getLastExecutionError(scriptPath);
        return { attempt: 0, strategy, success: false, error: errorLog };
      }
    } catch (error) {
      return { attempt: 0, strategy, success: false, error: String(error) };
    }
  }

  private async attemptErrorFix(part: Part, originalError: string, fixPath: string, stlPath: string): Promise<RetryAttempt> {
    try {
      // Read the original failed script
      const originalScript = await this.getLastGeneratedScript(part.key);
      if (!originalScript) {
        return { attempt: 0, strategy: 'error_fix', success: false, error: 'No original script to fix' };
      }

      // Generate fix using error context
      const fixPrompt = buildErrorRecoveryPrompt(part, originalScript, originalError);
      const fixedCode = await this.generateCode(fixPrompt, 0.1);
      
      if (!fixedCode || fixedCode.trim().length < 10) {
        return { attempt: 0, strategy: 'error_fix', success: false, error: 'AI did not return fixed code' };
      }

      // Execute the fixed code
      const success = await this.executeScript(fixedCode, part.key, fixPath, stlPath);
      
      if (success) {
        return { attempt: 0, strategy: 'error_fix', success: true };
      } else {
        const errorLog = this.getLastExecutionError(fixPath);
        return { attempt: 0, strategy: 'error_fix', success: false, error: errorLog };
      }
    } catch (error) {
      return { attempt: 0, strategy: 'error_fix', success: false, error: String(error) };
    }
  }

  private async generateCode(systemPrompt: string, temperature: number): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        temperature,
        messages: [{ role: 'system', content: systemPrompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 120000,
      }
    );
    
    return stripCodeFences(response.data.choices[0].message.content || '');
  }

  private async executeScript(code: string, partKey: string, scriptPath: string, stlPath: string): Promise<boolean> {
    // Wrap the code for execution
    const wrapped = `import os\nimport math\nimport cadquery as cq\nfrom cadquery import exporters\n\n${code}\n\nsolid = build_part()\nif isinstance(solid, cq.Workplane):\n    solid = solid.val()\nexporters.export(solid, os.environ.get('STL_PATH', r'${stlPath.replace(/\\/g, '\\\\')}'))\n`;
    
    writeFileSafe(scriptPath, wrapped);
    
    // Execute the script
    const env = { ...process.env, STL_PATH: stlPath };
    const result = spawnSync(this.pythonBin, [scriptPath], { encoding: 'utf8', env });
    
    return result.status === 0 && fs.existsSync(stlPath);
  }

  private getLastExecutionError(scriptPath: string): string {
    // This would need to be enhanced to capture the actual execution error
    // For now, return a generic message
    return 'Script execution failed - check CadQuery syntax and geometry';
  }

  private async getLastGeneratedScript(partKey: string): Promise<string | null> {
    try {
      const scriptPath = path.join(this.tempDir, 'parts_scripts', `${partKey}.py`);
      return fs.readFileSync(scriptPath, 'utf-8');
    } catch {
      return null;
    }
  }
}