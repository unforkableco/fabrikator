# Describe Image Tool (TypeScript)

A TypeScript rewrite of the original `describe-image.js` script with knowledge-enhanced prompts and improved retry logic.

## Features

- **Knowledge-Enhanced Prompts**: Prompts include 3D printing constraints, CAD best practices, and common error patterns
- **Improved Retry Logic**: 4-tier retry strategy with error recovery, simplification, and primitive fallback
- **Same Interface**: Drop-in replacement for the original script with identical outputs
- **Better Maintainability**: TypeScript code with separate files for different concerns

## Installation

```bash
cd backend/tools/describeimage
npm install
npm run build
```

## Usage

```bash
# Same interface as original describe-image.js
node dist/index.js /path/to/your/image.jpg
```

## Outputs

The tool produces the exact same outputs as the original:

- `scripts/analysis_latest.json` and `scripts/analysis_{timestamp}.json`
- `scripts/parts_latest.json` and `scripts/parts_{timestamp}.json` 
- `scripts/parts_scripts/{key}.py` (and optional `.fix1.py`, `.simple.py`, `.primitive.py`)
- `scripts/stl/{key}.stl`

## Architecture

- **`src/index.ts`**: CLI entry point with same interface
- **`src/pipeline.ts`**: Main processing pipeline
- **`src/prompts.ts`**: Loads markdown prompts and injects knowledge
- **`src/retry.ts`**: Multi-attempt retry strategy
- **`src/utils.ts`**: File operations, venv management, helpers
- **`src/types.ts`**: TypeScript type definitions

## Knowledge Base

- **`knowledge/cad-best-practices.md`**: CadQuery patterns and best practices
- **`knowledge/printing-constraints.md`**: 3D printing design rules
- **`knowledge/common-errors.md`**: Error patterns and solutions  
- **`knowledge/materials.md`**: 3D printing material guidelines

## Enhanced Prompts

- **`prompts/vision-analysis.md`**: Vision analysis with fabrication awareness
- **`prompts/parts-proposal.md`**: Parts design with printability rules
- **`prompts/cad-generation.md`**: CAD generation with error prevention
- **`prompts/error-recovery.md`**: Error recovery with pattern matching

## Retry Strategy

1. **Initial**: Knowledge-enhanced generation
2. **Error Fix**: AI analyzes error and provides fix
3. **Simplified**: Reduced complexity approach
4. **Primitive**: Basic shape fallback

## Migration from Original

The new tool is a drop-in replacement:

```bash
# Old way
node backend/scripts/describe-image.js /path/to/image.jpg

# New way  
node backend/tools/describeimage/dist/index.js /path/to/image.jpg
```

All outputs remain in the same `scripts/` directory with identical file names and formats.