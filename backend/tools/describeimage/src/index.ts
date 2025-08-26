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

import { DescribeImagePipeline } from './pipeline';

async function main() {
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