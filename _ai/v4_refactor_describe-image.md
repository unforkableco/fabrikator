# V4 KISS Refactor: describe-image Tool Simple Rewrite

## Overview
This plan outlines a simple, focused rewrite of `backend/scripts/describe-image.js` as a TypeScript-based tool in `backend/tools/describeimage/` with knowledge-enhanced prompts, improved retry logic, and better error handling while maintaining the exact same outputs and CLI interface.

## Current State Analysis

### Existing Implementation
The current `describe-image.js` script provides:
- Basic image analysis using OpenAI vision models
- Simple string-based prompts hardcoded in functions
- Three-phase pipeline: analyze → propose parts → generate CAD scripts
- Basic error handling with single retry attempt
- Minimal context awareness

### Current Prompts Structure
1. **Image Analysis** (`analyzeImage()`)
   - System: Basic product vision analyzer
   - Output: Simple JSON with canonicalPrompt, visibleComponents, shape, finish, notes
   
2. **Parts Proposal** (`proposeParts()`)
   - System: Minimal part design instructions
   - Output: JSON with parts array (3-8 parts)
   
3. **CAD Script Generation** (`generateCadQueryScript()`)
   - System: Basic CadQuery requirements
   - Output: Raw Python code

### Limitations Identified
- **Basic prompts** without CAD generation knowledge or failure patterns
- **Simple retry logic** - only one fix attempt per part
- **No learning** from common failure patterns
- **Missing CAD constraints** - no 3D printing guidelines in prompts
- **JavaScript instead of TypeScript** - harder to maintain and extend

## Proposed Improvements (KISS Approach)

### 1. Simple TypeScript Structure

#### Minimal Module Structure
Simple TypeScript tool that produces the same outputs:
```
backend/tools/describeimage/
├── package.json                    # Tool dependencies
├── tsconfig.json                   # TypeScript config
├── src/
│   ├── index.ts                    # Main CLI entry point
│   ├── pipeline.ts                 # Main pipeline logic
│   ├── prompts.ts                  # Enhanced prompts with knowledge
│   ├── knowledge.ts                # CAD knowledge and constraints
│   ├── retry.ts                    # Improved retry logic
│   ├── utils.ts                    # File ops, venv, helpers
│   └── types.ts                    # TypeScript interfaces
└── dist/                           # Compiled output
```

#### Simple String Concatenation (No Template Engine)
- Enhanced prompts using simple string concatenation with knowledge injection
- Knowledge-based context strings for better CAD generation
- Common failure pattern awareness in prompts
- 3D printing constraints built into prompt strings

### 2. Knowledge-Enhanced Prompts

#### Static Knowledge Base
- **CAD Best Practices**: Common CadQuery patterns and constraints
- **3D Printing Rules**: Printability guidelines, minimum feature sizes
- **Common Failures**: Known error patterns and fixes
- **Material Constraints**: Standard 3D printing materials and properties

#### Simple Context Injection
1. **Image Analysis**: Add fabrication awareness to vision prompts
2. **Parts Proposal**: Include printability guidelines in parts design
3. **CAD Generation**: Inject common error prevention patterns
4. **Error Recovery**: Use failure pattern knowledge for better fixes

### 3. Improved Retry Logic

#### Multi-Attempt Strategy
- **Attempt 1**: Original generation with enhanced prompts
- **Attempt 2**: Error-aware fix (same as original but with better context)
- **Attempt 3**: Simplified approach (reduce complexity when fixes fail)
- **Fallback**: Generate basic primitive shape as last resort

#### Same Outputs as Original
- Maintains exact same file structure and naming
- Same CLI interface: `node dist/index.js <image_path>`
- Same JSON outputs in `scripts/` directory
- Same Python scripts and STL file generation

## Simple Implementation Checklist

### Phase 1: Project Setup (1 day)
- [x] Create `backend/tools/describeimage/` directory
- [x] Set up basic TypeScript project with `package.json` and `tsconfig.json`
- [x] Create simple type definitions in `types.ts`
- [x] Set up basic utilities in `utils.ts`


### Phase 2: Knowledge Base (1 day)
- [x] Create knowledge base with CAD best practices, 3D printing constraints
- [x] Add common failure patterns and fixes
- [x] Include material properties and printability guidelines
- [x] Test knowledge injection into prompt strings

### Phase 3: Enhanced Prompts (1 day)
- [x] Create `prompts.ts` with knowledge-enhanced prompts using string concatenation
- [x] Improve vision analysis prompt with fabrication awareness
- [x] Enhance parts proposal prompt with printability rules
- [x] Upgrade CAD generation prompt with error prevention patterns
- [x] Test prompts produce better results than original

### Phase 4: Pipeline & Retry Logic (2 days)
- [x] Create `pipeline.ts` with main logic (same flow as original)
- [x] Implement `retry.ts` with improved multi-attempt strategy
- [x] Add primitive shape fallback generation
- [x] Ensure exact same output files and structure as original
- [ ] Test with various input images

### Phase 5: CLI & Testing (1 day)
- [x] Create `index.ts` CLI entry point with same interface as original
- [x] Test backward compatibility - same usage and outputs
- [ ] Verify STL generation works correctly
- [x] Add basic error handling and logging
- [ ] Document usage and migration from original script

## Simple Technical Architecture

### Core Types
```typescript
interface AnalysisResult {
  canonicalPrompt: string;
  visibleComponents: string[];
  shape: string;
  finish: string;
  notes: string;
}

interface Part {
  key: string;
  name: string;
  role: string;
  geometry_hint: string;
  approx_dims_mm: Record<string, number>;
  features: string[];
  appearance: { color_hex?: string };
}

interface PartsDocument {
  parts: Part[];
}

interface Knowledge {
  cadBestPractices: string;
  printingConstraints: string;
  commonErrors: string;
  materialGuidelines: string;
}
```

### Simple Pipeline
```typescript
class DescribeImagePipeline {
  async analyzeImage(imagePath: string): Promise<AnalysisResult>;
  async proposeParts(analysis: AnalysisResult): Promise<PartsDocument>;
  async generateCadScript(part: Part): Promise<string>;
  async executeWithRetry(part: Part, script: string): Promise<boolean>;
}
```

## Success Metrics

### Quality Improvements
- **Reduced failures** (target: <15% failure rate, from ~30%)
- **Better CAD scripts** (knowledge-enhanced prompts)
- **Improved error recovery** (3-attempt retry with simplification)
- **Same reliable outputs** (maintains original file structure)

### Maintainability Improvements
- **Centralized prompt management** (all prompts in templates/)
- **Easier prompt iteration** (markdown editing vs code changes)
- **Better version control** (trackable prompt changes)

### Performance Improvements  
- **Similar performance** (same basic pipeline flow)
- **Better success rate** (fewer retries needed overall)
- **TypeScript benefits** (better maintainability and debugging)
- **Same resource usage** (Python venv management preserved)

## Risk Mitigation

### Technical Risks
- **Template complexity**: Start with simple templates, add features incrementally
- **Performance impact**: Implement caching and lazy loading
- **Context data volume**: Use selective context injection based on relevance

### Migration Risks
- **Backward compatibility**: Maintain fallback to original prompts during transition
- **User disruption**: Implement feature flags and gradual rollout
- **Data loss**: Ensure robust backup and rollback procedures

## Simple Timeline Estimate

- **Phase 1**: Project Setup (1 day)
- **Phase 2**: Knowledge Base (1 day)
- **Phase 3**: Enhanced Prompts (1 day)
- **Phase 4**: Pipeline & Retry Logic (2 days)
- **Phase 5**: CLI & Testing (1 day)

**Total Estimated Duration**: 6 days for production-ready implementation

### Success Criteria
- **Reliability**: <15% failure rate (from ~30%)
- **Compatibility**: Exact same outputs and CLI interface
- **Quality**: Improved CAD script generation
- **Maintainability**: Clean TypeScript code
- **Simplicity**: Easy to understand and modify

## Implementation Strategy

### Migration Approach
1. **Parallel Development**: Build new tool alongside existing script
2. **Compatibility Layer**: Create wrapper for seamless transition
3. **A/B Testing**: Run both implementations to validate improvements
4. **Gradual Migration**: Phase out old script over time
5. **Monitoring**: Track success metrics and optimize

### Next Steps

1. **Create project structure** in `backend/tools/describeimage/`
2. **Initialize TypeScript project** with comprehensive dependencies
3. **Build core type system** and interfaces
4. **Implement template engine** with enhanced features
5. **Create knowledge base** and context system
6. **Build smart retry strategy** with learning capabilities
7. **Add validation pipeline** for quality assurance
8. **Implement CLI** with progress reporting
9. **Write comprehensive tests** (unit, integration, benchmarks)
10. **Deploy with monitoring** and success tracking

### Deliverables

- **Simple TypeScript tool** replacing `describe-image.js`
- **Same CLI interface** for backward compatibility
- **Knowledge-enhanced prompts** for better CAD generation
- **Improved retry logic** with fallback strategies
- **Basic testing** to ensure functionality
- **Migration guide** from original script

---

*This KISS plan provides a focused roadmap for building a simple, improved image analysis tool that enhances the current implementation with knowledge and better retry logic while maintaining the exact same outputs and interface.*