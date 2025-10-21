#!/usr/bin/env node
/*
  TypeScript rewrite of describe-image.js
  Standalone pipeline to:
  - Analyze a selected design image (vision) with enhanced prompts
  - Derive a concise analysis JSON and a parts list JSON
  - Generate per-part CadQuery Python scripts with improved retry logic
  - Execute scripts to export STL files
  Outputs (same as original):
    scripts/analysis_latest.json
    scripts/parts_latest.json
    scripts/parts_scripts/<key>.py (and optional retry files)
    scripts/stl/<key>.stl
*/

import * as dotenv from 'dotenv';
import * as path from 'path';
import { DescribeImagePipeline } from './pipeline';

// Load environment variables from root .env (priority) or backend/.env
function loadEnvironment() {
  const rootEnvPath = path.resolve(__dirname, '../../../../.env');
  const backendEnvPath = path.resolve(__dirname, '../../../.env');
  
  console.log(`🔍 Looking for environment files...`);
  console.log(`   Root .env: ${rootEnvPath}`);
  console.log(`   Backend .env: ${backendEnvPath}`);
  
  // Always prioritize root .env to ensure consistent environment loading
  const envPaths = [rootEnvPath, backendEnvPath];
  let envLoaded = false;
  
  for (const envPath of envPaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`✅ Loaded environment from: ${envPath}`);
        envLoaded = true;
        break;
      }
    } catch (error) {
      console.log(`❌ Could not load ${envPath}:`, (error as Error).message);
    }
  }
  
  if (!envLoaded) {
    console.log(`⚠️  No .env file found. Checking environment variables...`);
  }
  
  // Log environment status
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    console.log(`✅ OPENAI_API_KEY found (${apiKey.slice(0, 8)}...)`);
  } else {
    console.error('❌ OPENAI_API_KEY not found in environment');
  }
}

async function main() {
  // Load environment first
  loadEnvironment();
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Usage: node dist/index.js <absolute_image_path>');
    process.exit(2);
  }

  // Use current working directory as backend root (same as original)
  const backendRoot = process.cwd();
  const pipeline = new DescribeImagePipeline(backendRoot);
  
  await pipeline.processImage(imagePath);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error?.message || error);
    process.exit(1);
  });
}