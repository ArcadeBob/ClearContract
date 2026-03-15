# Phase 31: Server-side API Modularization - Research

**Researched:** 2026-03-15
**Domain:** TypeScript module extraction / Vercel serverless function decomposition
**Confidence:** HIGH

## Summary

This phase is a straightforward file extraction: move the 16 analysis pass definitions (lines 141-1116 of `api/analyze.ts`, ~975 lines) into a new `api/passes.ts` sibling module. The remaining `analyze.ts` will contain imports, constants, schemas, helper functions, and the handler -- approximately 490 lines. No new libraries, no behavior changes, no architectural shifts.

The existing codebase already proves this pattern works: `api/pdf.ts` (58 lines), `api/scoring.ts` (107 lines), and `api/merge.ts` (555 lines) are all flat sibling modules imported by `analyze.ts`. The extraction follows the same pattern exactly.

**Primary recommendation:** Extract pass definitions to `api/passes.ts` as a single array export. Keep `zodToOutputFormat` in `analyze.ts` since passes.ts does not call it directly -- passes reference Zod schemas, and `runAnalysisPass` calls `zodToOutputFormat` at runtime. The `AnalysisPass` interface should be exported from `passes.ts` since it defines the pass shape.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Extract all 16 pass definitions to a single `api/passes.ts` file
- Prompts stay inline as template literals in pass objects (no separate prompts file)
- Schemas remain in `src/schemas/` (legalAnalysis.ts, scopeComplianceAnalysis.ts, analysis.ts, synthesisAnalysis.ts) -- passes.ts imports them
- passes.ts exports the typed pass array and the `AnalysisPass` interface
- The `zodToOutputFormat` helper stays in analyze.ts (used by pass definitions but also by runSynthesisPass)
- Flat structure in `api/` -- no subdirectories
- passes.ts sits alongside analyze.ts, merge.ts, pdf.ts, scoring.ts
- No api/lib/ or api/passes/ directories
- Keep merge.ts as-is at 554 lines -- converters, dispatch map, and dedup are tightly coupled
- DECOMP-05 is satisfied by the Phase 30 type guard refactoring (merge.ts is already well-structured)
- analyze.ts keeps: `export const config`, CompanyProfileSchema, AnalyzeRequestSchema, sanitizeFileName, constants (BETAS, MODEL, MAX_TOKENS), PASSES_RECEIVING_PROFILE, zodToOutputFormat, runAnalysisPass, runSynthesisPass, and the handler
- Target ~490 lines after pass extraction (down from 1,478)
- runAnalysisPass/runSynthesisPass stay in analyze.ts -- they share the Anthropic client and constants with the handler

### Claude's Discretion
- Exact import structure in passes.ts (how to handle zodToOutputFormat dependency)
- Whether to re-export AnalysisPass type from passes.ts or keep it in analyze.ts
- Any minor interface adjustments needed for the extraction

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DECOMP-04 | api/analyze.ts modularized -- extract schema definitions, pass configuration, and orchestration into separate modules | Pass definitions (lines 141-1116) extracted to api/passes.ts; schemas already in src/schemas/; orchestration stays in analyze.ts |
| DECOMP-05 | api/merge.ts refactored -- extract finding conversion functions and deduplication logic into focused modules | Satisfied by Phase 30 type guard refactoring per user decision; merge.ts is well-structured at 555 lines with typed dispatch map |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (project version) | Type-safe module extraction | Already configured with strict mode |
| Zod | (project version) | Schema definitions imported by passes | Already the schema source of truth |

### Supporting
No new libraries needed. This is pure code reorganization.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single passes.ts | Directory api/passes/ with per-pass files | User locked decision: flat structure, no subdirectories |
| Inline prompts | Separate prompts.ts | User locked decision: prompts stay inline in pass objects |

## Architecture Patterns

### Current Structure (Before)
```
api/
  analyze.ts    # 1,478 lines -- monolith
  merge.ts      # 555 lines -- finding conversion + dedup
  pdf.ts        # 58 lines -- PDF upload/fallback
  scoring.ts    # 107 lines -- risk score computation
```

### Target Structure (After)
```
api/
  analyze.ts    # ~490 lines -- handler, constants, run functions
  passes.ts     # ~985 lines -- 16 pass definitions + AnalysisPass interface + SYNTHESIS_SYSTEM_PROMPT
  merge.ts      # 555 lines -- unchanged
  pdf.ts        # 58 lines -- unchanged
  scoring.ts    # 107 lines -- unchanged
```

### Pattern: Flat Sibling Module Extraction
**What:** Move a cohesive set of data definitions to a sibling file, export them as a named array + interface.
**When to use:** When a file has a large block of declarative data (pass configs) mixed with imperative logic (handler, API calls).
**Example:**

```typescript
// api/passes.ts
import { DatesDeadlinesPassResultSchema } from '../src/schemas/scopeComplianceAnalysis';
// ... other schema imports

export interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
  schema?: import('zod').ZodTypeAny;
}

export const ANALYSIS_PASSES: AnalysisPass[] = [
  { name: 'risk-overview', isOverview: true, systemPrompt: `...`, userPrompt: '...' },
  // ... 15 more passes
];
```

```typescript
// api/analyze.ts (updated imports)
import { ANALYSIS_PASSES } from './passes';
import type { AnalysisPass } from './passes';
```

### Pattern: zodToOutputFormat Dependency Resolution
**What:** The `AnalysisPass` interface references `zodToOutputFormat`'s parameter type for the `schema` field. Since `zodToOutputFormat` stays in `analyze.ts`, the interface type needs adjustment.
**Recommended approach:** Change the `schema` field type in `AnalysisPass` to use `import('zod').ZodTypeAny` (or `z.ZodTypeAny` with a zod import) instead of `Parameters<typeof zodToOutputFormat>[0]`. This decouples passes.ts from zodToOutputFormat entirely. The `zodToJsonSchema` function accepts `ZodTypeAny`, so this is type-compatible.

### Pattern: Synthesis Prompt Extraction
**What:** The `SYNTHESIS_SYSTEM_PROMPT` constant (lines 1198-1219) is a pass-related prompt that logically belongs with the other pass definitions.
**Recommended approach:** Export `SYNTHESIS_SYSTEM_PROMPT` from `passes.ts` alongside `ANALYSIS_PASSES`. This further reduces analyze.ts and keeps all prompt content co-located.

### Anti-Patterns to Avoid
- **Circular imports:** passes.ts must NOT import from analyze.ts. All dependencies flow one way: passes.ts imports from src/schemas/, analyze.ts imports from passes.ts.
- **Re-exporting AnalysisPass from analyze.ts:** Since merge.ts already imports `AnalysisPassInfo` (its own interface), there is no need to re-export from analyze.ts. Keep AnalysisPass in passes.ts only.
- **Moving constants that runAnalysisPass needs:** BETAS, MODEL, MAX_TOKENS_PER_PASS, PASSES_RECEIVING_PROFILE all stay in analyze.ts because they are used by the run functions and handler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module bundling for Vercel | Custom webpack/esbuild config | Vercel's built-in bundler | Vercel automatically bundles all imports into the serverless function; flat siblings work out of the box (proven by pdf.ts, scoring.ts, merge.ts) |
| Schema type for pass interface | Custom type wrapper | `z.ZodTypeAny` from zod | Already available, compatible with zodToJsonSchema input type |

## Common Pitfalls

### Pitfall 1: Breaking the Vercel Entry Point Contract
**What goes wrong:** Moving `export const config` or the `default export` handler out of analyze.ts breaks the serverless function.
**Why it happens:** Vercel requires these specific exports in the entry file.
**How to avoid:** Only extract data (pass definitions) and types. Keep `export const config` at the top and `export default handler` in analyze.ts.
**Warning signs:** 404 or 500 errors on `/api/analyze` after deployment.

### Pitfall 2: Import Path Mismatch Between passes.ts and analyze.ts
**What goes wrong:** passes.ts uses `../src/schemas/analysis` but the relative path differs if the file moves.
**Why it happens:** Both analyze.ts and passes.ts are in `api/`, so they share the same relative path to `src/`.
**How to avoid:** passes.ts uses identical `../src/schemas/...` paths as the current imports in analyze.ts. No path changes needed.
**Warning signs:** TypeScript compilation errors on import resolution.

### Pitfall 3: The schema Field Type Breaks Without zodToOutputFormat
**What goes wrong:** The current `AnalysisPass` interface types `schema` as `Parameters<typeof zodToOutputFormat>[0]`, which requires importing `zodToOutputFormat`.
**Why it happens:** zodToOutputFormat stays in analyze.ts, creating a potential circular dependency.
**How to avoid:** Change the type to `z.ZodTypeAny` in the passes.ts interface. This is the underlying type that `zodToJsonSchema` (and therefore `zodToOutputFormat`) accepts.
**Warning signs:** Type error on `schema` field assignment.

### Pitfall 4: Forgetting the Synthesis Prompt
**What goes wrong:** SYNTHESIS_SYSTEM_PROMPT is easy to miss because it sits between the pass array and the handler (lines 1198-1219), separated from the 16 pass definitions.
**Why it happens:** It is not part of `ANALYSIS_PASSES` -- it is used by `runSynthesisPass`.
**How to avoid:** Include it in the extraction to passes.ts. Import it in analyze.ts where runSynthesisPass uses it.

### Pitfall 5: Line Count Expectations
**What goes wrong:** Expecting analyze.ts to be "under 200 lines" per the ROADMAP aspirational target.
**Why it happens:** The ROADMAP target was set before the discussion session determined that handler logic, run functions, constants, and schemas all stay.
**How to avoid:** The realistic target is ~490 lines per the CONTEXT.md decisions. The ROADMAP notes this is aspirational; ~490 is correct.

## Code Examples

### Extract: AnalysisPass Interface (passes.ts)
```typescript
// Source: Current analyze.ts lines 131-139, modified for decoupling
import { z } from 'zod';

export interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
  schema?: z.ZodTypeAny;
}
```

### Extract: Pass Array Export (passes.ts)
```typescript
// Source: Current analyze.ts lines 141-1116
import {
  IndemnificationPassResultSchema,
  // ... other legal schemas
} from '../src/schemas/legalAnalysis';
import {
  ScopeOfWorkPassResultSchema,
  // ... other scope schemas
} from '../src/schemas/scopeComplianceAnalysis';

export const ANALYSIS_PASSES: AnalysisPass[] = [
  {
    name: 'risk-overview',
    isOverview: true,
    systemPrompt: `...`,  // existing prompt
    userPrompt: '...',
  },
  // ... 15 more passes exactly as they are
];
```

### Updated Import in analyze.ts
```typescript
// Source: New import replacing inline definitions
import { ANALYSIS_PASSES, SYNTHESIS_SYSTEM_PROMPT } from './passes';
import type { AnalysisPass } from './passes';
```

### Schema Imports Stay in passes.ts (Not analyze.ts)
After extraction, analyze.ts no longer needs to import pass-specific schemas:
```typescript
// REMOVE from analyze.ts after extraction:
// - IndemnificationPassResultSchema, PaymentContingencyPassResultSchema, etc.
// - ScopeOfWorkPassResultSchema, DatesDeadlinesPassResultSchema, etc.

// KEEP in analyze.ts (used by runAnalysisPass/runSynthesisPass):
import { PassResultSchema, RiskOverviewResultSchema } from '../src/schemas/analysis';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolith api/analyze.ts (1478 lines) | Pass definitions extracted to sibling module | Phase 31 | Handler focused on orchestration, passes self-contained |

## Open Questions

1. **Should SYNTHESIS_SYSTEM_PROMPT go to passes.ts?**
   - What we know: It is a prompt constant, logically grouped with pass content. It is used only by runSynthesisPass in analyze.ts.
   - What's unclear: The CONTEXT.md does not explicitly mention it.
   - Recommendation: Extract to passes.ts. It reduces analyze.ts by ~22 lines and keeps all prompt content together. This falls under "Claude's Discretion" for minor interface adjustments.

2. **Exact line count after extraction**
   - What we know: Pass definitions are lines 141-1116 (~975 lines). SYNTHESIS_SYSTEM_PROMPT is lines 1198-1219 (~22 lines). Total extraction: ~997 lines.
   - What's unclear: After removing unused imports from analyze.ts, exact count may vary.
   - Recommendation: Target ~480-500 lines for analyze.ts. Do not force artificial line count targets.

## Sources

### Primary (HIGH confidence)
- Direct code analysis of `api/analyze.ts` (1,478 lines, read in full)
- Direct code analysis of `api/merge.ts` (555 lines, read in full)
- Direct code analysis of `api/pdf.ts` and `api/scoring.ts` (existing extraction pattern)
- Phase 31 CONTEXT.md (user decisions from discussion session)

### Secondary (MEDIUM confidence)
- Vercel serverless function documentation (entry point contract: `export const config` + `export default handler`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure extraction
- Architecture: HIGH - pattern already proven by pdf.ts, scoring.ts, merge.ts
- Pitfalls: HIGH - identified from direct code analysis of dependency chains

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- no external dependencies to drift)
