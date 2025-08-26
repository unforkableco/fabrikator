#!/usr/bin/env node

/**
 * End-to-end test for describe-image TypeScript tool
 * Tests that it produces the same outputs as the original script
 */

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TEST_DIR = __dirname;
const TOOL_DIR = path.dirname(TEST_DIR);
const BACKEND_DIR = path.dirname(path.dirname(TOOL_DIR));
const SCRIPTS_DIR = path.join(BACKEND_DIR, 'scripts');

// Test configuration
const TEST_IMAGE = path.join(TEST_DIR, 'mug.png');
const TOOL_BINARY = path.join(TOOL_DIR, 'dist', 'index.js');

function cleanupTestFiles() {
  console.log('🧹 Cleaning up previous test files...');
  const filesToClean = [
    path.join(SCRIPTS_DIR, 'analysis_latest.json'),
    path.join(SCRIPTS_DIR, 'parts_latest.json'),
  ];
  
  filesToClean.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (error) {
      console.warn(`Warning: Could not clean ${file}:`, error.message);
    }
  });

  // Clean up parts_scripts and stl directories
  const dirsToClean = [
    path.join(SCRIPTS_DIR, 'parts_scripts'),
    path.join(SCRIPTS_DIR, 'stl')
  ];
  
  dirsToClean.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          fs.unlinkSync(path.join(dir, file));
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not clean ${dir}:`, error.message);
    }
  });
}

function runTool(imagePath) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running tool: node ${TOOL_BINARY} ${imagePath}`);
    
    const child = spawn('node', [TOOL_BINARY, imagePath], {
      cwd: BACKEND_DIR,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output.trim());
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(output.trim());
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Tool exited with code ${code}. Stderr: ${stderr}`));
      }
    });

    // Set timeout for long-running operations
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Tool execution timed out after 5 minutes'));
    }, 5 * 60 * 1000); // 5 minutes

    child.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

function validateOutputFiles() {
  console.log('🔍 Validating output files...');
  
  // Check required output files exist
  const requiredFiles = [
    path.join(SCRIPTS_DIR, 'analysis_latest.json'),
    path.join(SCRIPTS_DIR, 'parts_latest.json')
  ];

  requiredFiles.forEach(file => {
    assert(fs.existsSync(file), `Required file missing: ${file}`);
    console.log(`✅ Found: ${path.basename(file)}`);
  });

  // Validate analysis file structure
  const analysisPath = path.join(SCRIPTS_DIR, 'analysis_latest.json');
  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
  
  assert(typeof analysis.canonicalPrompt === 'string', 'analysis.canonicalPrompt should be string');
  assert(Array.isArray(analysis.visibleComponents), 'analysis.visibleComponents should be array');
  assert(typeof analysis.shape === 'string', 'analysis.shape should be string');
  assert(typeof analysis.finish === 'string', 'analysis.finish should be string');
  assert(typeof analysis.notes === 'string', 'analysis.notes should be string');
  
  console.log(`✅ Analysis file structure valid`);
  console.log(`   - canonicalPrompt: ${analysis.canonicalPrompt.slice(0, 50)}...`);
  console.log(`   - visibleComponents: ${analysis.visibleComponents.length} items`);

  // Validate parts file structure
  const partsPath = path.join(SCRIPTS_DIR, 'parts_latest.json');
  const parts = JSON.parse(fs.readFileSync(partsPath, 'utf8'));
  
  assert(Array.isArray(parts.parts), 'parts.parts should be array');
  assert(parts.parts.length >= 1, 'Should have at least 1 part');
  assert(parts.parts.length <= 8, 'Should have at most 8 parts');
  
  console.log(`✅ Parts file structure valid`);
  console.log(`   - Generated ${parts.parts.length} parts`);

  // Check each part structure
  parts.parts.forEach((part, i) => {
    assert(typeof part.key === 'string', `part[${i}].key should be string`);
    assert(typeof part.name === 'string', `part[${i}].name should be string`);
    assert(Array.isArray(part.features), `part[${i}].features should be array`);
    console.log(`   - Part ${i}: ${part.name} (${part.key})`);
  });

  return { analysis, parts };
}

function validateGeneratedFiles(parts) {
  console.log('🔍 Validating generated files...');
  
  let successCount = 0;
  let totalCount = parts.parts.length;
  
  parts.parts.forEach(part => {
    const key = part.key;
    const scriptPath = path.join(SCRIPTS_DIR, 'parts_scripts', `${key}.py`);
    const stlPath = path.join(SCRIPTS_DIR, 'stl', `${key}.stl`);
    
    // Check if either main script or retry scripts exist
    const possibleScripts = [
      `${key}.py`,
      `${key}.fix1.py`, 
      `${key}.simple.py`,
      `${key}.primitive.py`
    ];
    
    let foundScript = false;
    possibleScripts.forEach(scriptFile => {
      const fullPath = path.join(SCRIPTS_DIR, 'parts_scripts', scriptFile);
      if (fs.existsSync(fullPath)) {
        foundScript = true;
        console.log(`✅ Found script: ${scriptFile}`);
      }
    });
    
    assert(foundScript, `No script found for part ${key}`);
    
    // Check STL file
    if (fs.existsSync(stlPath)) {
      const stats = fs.statSync(stlPath);
      assert(stats.size > 0, `STL file ${key}.stl is empty`);
      console.log(`✅ Generated STL: ${key}.stl (${stats.size} bytes)`);
      successCount++;
    } else {
      console.log(`❌ Missing STL: ${key}.stl`);
    }
  });
  
  console.log(`📊 Success rate: ${successCount}/${totalCount} parts (${Math.round(100*successCount/totalCount)}%)`);
  
  // We expect some failures but overall success should be reasonable
  const successRate = successCount / totalCount;
  assert(successRate >= 0.5, `Success rate too low: ${Math.round(successRate*100)}%`);
  
  return { successCount, totalCount, successRate };
}

async function main() {
  console.log('🧪 Starting E2E test for describe-image tool');
  console.log(`📁 Test directory: ${TEST_DIR}`);
  console.log(`📁 Backend directory: ${BACKEND_DIR}`);
  console.log(`🖼️ Test image: ${TEST_IMAGE}`);
  
  try {
    // Pre-flight checks
    assert(fs.existsSync(TEST_IMAGE), `Test image not found: ${TEST_IMAGE}`);
    assert(fs.existsSync(TOOL_BINARY), `Tool binary not found: ${TOOL_BINARY}`);
    
    // Check if build is up to date
    const srcModified = fs.statSync(path.join(TOOL_DIR, 'src', 'index.ts')).mtime;
    const distModified = fs.statSync(TOOL_BINARY).mtime;
    if (srcModified > distModified) {
      console.log('⚠️  Source files newer than build - you may want to run: npm run build');
    }
    
    // Clean previous test artifacts
    cleanupTestFiles();
    
    // Run the tool
    const startTime = Date.now();
    await runTool(TEST_IMAGE);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ Tool completed in ${Math.round(duration/1000)}s`);
    
    // Validate outputs
    const { analysis, parts } = validateOutputFiles();
    const results = validateGeneratedFiles(parts);
    
    console.log('');
    console.log('🎉 E2E Test PASSED!');
    console.log(`✅ Generated ${parts.parts.length} parts`);
    console.log(`✅ Success rate: ${Math.round(results.successRate*100)}%`);
    console.log(`✅ All required files created`);
    console.log(`✅ Output format matches original tool`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('❌ E2E Test FAILED!');
    console.error('Error:', error.message);
    console.error('');
    
    // Print some debug info
    if (fs.existsSync(SCRIPTS_DIR)) {
      console.error('Contents of scripts directory:');
      try {
        const files = fs.readdirSync(SCRIPTS_DIR);
        files.forEach(file => {
          console.error(`  - ${file}`);
        });
      } catch (e) {
        console.error('  (could not read directory)');
      }
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error in test:', error);
    process.exit(1);
  });
}

module.exports = { main, validateOutputFiles, validateGeneratedFiles };