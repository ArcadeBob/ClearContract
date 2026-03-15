# Phase 30: Type Safety Hardening - Research

**Researched:** 2026-03-15
**Domain:** Zod/TypeScript type reconciliation, client-side API validation, type guard refactoring
**Confidence:** HIGH

## Summary

This phase eliminates the gap between Zod schemas (used for structured API outputs) and TypeScript interfaces (used by UI components), adds client-side response validation, and removes ~50 assertion casts from merge.ts. The codebase already has Zod v3 schemas for every analysis pass and a discriminated union type system for LegalMeta/ScopeMeta -- the work is connecting these properly so types flow end-to-end without manual assertion casts.

The core pattern is: parse pass results through their specific Zod schemas in merge.ts (instead of treating them as `FindingResult & Record<string, unknown>`), infer TS types from Zod via `z.infer`, and add a single `safeParse()` gate in the client before trusting API responses. A lazy localStorage migration handles existing contracts that lack newly-required fields.

**Primary recommendation:** Work bottom-up: (1) create the canonical Finding schema with `resolved`/`note` required, (2) update merge.ts converter functions to accept Zod-inferred pass types, (3) add client-side safeParse, (4) add localStorage migration. Each step is independently verifiable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Zod schemas are the source of truth -- TS interfaces are updated to match what the API actually produces
- Context-dependent fields (legalMeta, scopeMeta, isSynthesis, downgradedFrom) stay optional in both Zod and TS
- User-added fields (resolved, note) get defaults on creation in merge.ts: resolved: false, note: ''
- These become required in the TS Finding interface -- eliminates nullish coalescing throughout the UI
- Canonical Finding schema lives in `src/schemas/finding.ts` -- TS Finding type inferred via z.infer
- Pass-level schemas (analysis.ts, legalAnalysis.ts) stay separate -- they define per-pass API output, not the merged result
- Full response-level AnalysisResultSchema in src/schemas/ validates the entire API response
- Hard fail on validation error -- throws error that becomes a Critical finding in the UI
- Generic user message: "Analysis returned invalid data. Please try again." -- Zod issues logged to console.error
- AnalysisResult type inferred from Zod schema (z.infer) -- delete the manual interface in analyzeContract.ts
- Lazy migration on load -- contractStorage.ts fills missing fields with safe defaults
- Add schemaVersion number to localStorage data -- migration function checks version and only runs patches for versions behind current
- Parse pass results through their Zod schemas first in merge.ts
- Converter functions receive properly-typed z.infer data instead of Record<string, unknown>
- If a pass result fails Zod parsing: skip the malformed result, log console.error, continue with other passes

### Claude's Discretion
- Exact field-by-field optionality audit results (which optional fields become required)
- AnalysisResultSchema composition details (how Finding/ContractDate/BidSignal schemas are nested)
- Schema version numbering scheme (starting number, increment strategy)
- Migration function internals (field default values, version check logic)
- How to restructure merge.ts converter function signatures to accept Zod-inferred types

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TYPE-01 | Reconcile Zod schema / TypeScript interface optionality -- required fields in schemas match required fields in types | Optionality audit below maps every field; canonical Finding schema in src/schemas/finding.ts with z.infer; pass-level schemas stay separate |
| TYPE-02 | Validate API response on client -- add Zod parse to analyzeContract.ts response handling | AnalysisResultSchema composition documented; safeParse pattern at line 77 of analyzeContract.ts; error flow to Critical finding |
| TYPE-03 | Replace merge.ts assertion casts with type guards -- eliminate 13+ `as string` casts using discriminated union narrowing | 50 assertion casts identified; converter function refactoring strategy documented with typed pass schemas |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.25.76 | Runtime schema validation and type inference | Already in project; z.infer eliminates manual interface maintenance |
| typescript | ^5.5.4 | Static type checking | Already in project; strict mode enabled |

### Supporting
No new libraries needed. All work uses existing Zod + TypeScript.

## Architecture Patterns

### Recommended File Structure
```
src/schemas/
├── analysis.ts              # Base FindingSchema, PassResultSchema, MergedAnalysisResultSchema (EXISTS)
├── legalAnalysis.ts         # 11 legal pass schemas (EXISTS)
├── scopeComplianceAnalysis.ts # 4 scope/compliance pass schemas (EXISTS)
├── synthesisAnalysis.ts     # Synthesis pass schema (EXISTS)
├── finding.ts               # NEW: Canonical merged Finding schema (with resolved, note, id)
└── analysisResult.ts        # NEW: Client-side AnalysisResultSchema for response validation
src/types/
└── contract.ts              # Finding interface becomes: export type Finding = z.infer<typeof MergedFindingSchema>
```

### Pattern 1: Canonical Schema with z.infer Type Export
**What:** Single Zod schema defines the shape; TypeScript type is derived via z.infer
**When to use:** Whenever a type must match a runtime validation schema
**Example:**
```typescript
// src/schemas/finding.ts
import { z } from 'zod';
import { SEVERITIES, CATEGORIES } from '../types/contract';
// Import LegalMeta/ScopeMeta schemas...

export const MergedFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(SEVERITIES),
  category: z.enum(CATEGORIES),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string().optional(),
  explanation: z.string().optional(),
  crossReferences: z.array(z.string()).optional(),
  legalMeta: LegalMetaSchema.optional(),
  scopeMeta: ScopeMetaSchema.optional(),
  sourcePass: z.string().optional(),
  negotiationPosition: z.string(),
  downgradedFrom: z.enum(SEVERITIES).optional(),
  isSynthesis: z.boolean().optional(),
  actionPriority: z.enum(['pre-bid', 'pre-sign', 'monitor']),
  resolved: z.boolean(),   // REQUIRED (default: false on creation)
  note: z.string(),        // REQUIRED (default: '' on creation)
});

export type MergedFinding = z.infer<typeof MergedFindingSchema>;
```

### Pattern 2: Typed Converter Functions (merge.ts)
**What:** Each converter function accepts the specific Zod-inferred type for its pass, not `FindingResult & Record<string, unknown>`
**When to use:** When converting pass-specific findings to unified findings in merge.ts
**Example:**
```typescript
import { z } from 'zod';
import { IndemnificationFindingSchema } from '../src/schemas/legalAnalysis';

type IndemnificationFinding = z.infer<typeof IndemnificationFindingSchema>;

function convertIndemnificationFinding(
  finding: IndemnificationFinding,
  passName: string
): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'indemnification',
      riskType: finding.riskType,         // no cast needed -- type is known
      hasInsuranceGap: finding.hasInsuranceGap,  // no cast needed
    },
  };
}
```

### Pattern 3: Pass-Level Dispatch with Zod Parsing
**What:** In the merge loop, parse each pass result through its specific Zod schema before conversion
**When to use:** Replacing the current `f as FindingResult & Record<string, unknown>` pattern
**Example:**
```typescript
// Instead of: convertLegalFinding(f as FindingResult & Record<string, unknown>, passName)
// Do:
const parsed = IndemnificationFindingSchema.safeParse(f);
if (parsed.success) {
  allFindings.push(convertIndemnificationFinding(parsed.data, passName));
} else {
  console.error(`Malformed ${passName} finding:`, parsed.error.issues);
}
```

### Pattern 4: Client-Side Response Validation
**What:** safeParse the entire API response before returning from analyzeContract()
**When to use:** At the single point where API responses enter the client
**Example:**
```typescript
const json = await response.json();
const parsed = AnalysisResultSchema.safeParse(json);
if (!parsed.success) {
  console.error('API response validation failed:', parsed.error.issues);
  throw new Error('Analysis returned invalid data. Please try again.');
}
return parsed.data;
```

### Anti-Patterns to Avoid
- **`as` casts on API data:** Never cast API responses to expected types -- validate with Zod first
- **Duplicate type definitions:** Never maintain a manual interface AND a Zod schema for the same shape
- **Optional fields with constant defaults:** If a field always has a value after creation, make it required

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type inference from schemas | Manual interface mirroring Zod schema | `z.infer<typeof Schema>` | Single source of truth, zero drift |
| Response validation | Manual field checking | `schema.safeParse()` | Zod handles nested objects, arrays, enums automatically |
| Discriminated union schemas | Flat schema with optional fields | `z.discriminatedUnion('clauseType', [...])` | Enforces exactly the right fields per variant |
| Migration field defaults | Complex conditional logic | `schema.transform()` or simple patch function | Keep it straightforward |

## Common Pitfalls

### Pitfall 1: Circular Import Between schemas/ and types/
**What goes wrong:** `src/schemas/finding.ts` imports from `types/contract.ts` which re-exports from `schemas/finding.ts`
**Why it happens:** When Finding type moves to z.infer, contract.ts must import from schemas/
**How to avoid:** Keep enum constants (SEVERITIES, CATEGORIES) in types/contract.ts. Export the Finding type from schemas/finding.ts. In contract.ts, re-export: `export type { MergedFinding as Finding } from '../schemas/finding'`. Ensure no circular dependency by having schemas import only constants, not types.
**Warning signs:** "Cannot access before initialization" runtime error

### Pitfall 2: LegalMeta/ScopeMeta Zod Schema for z.discriminatedUnion
**What goes wrong:** Zod's `z.discriminatedUnion()` requires the discriminant to be a `z.literal()` in each variant, not a `z.enum()`
**Why it happens:** The 11 LegalMeta variants use `clauseType` as discriminant, 4 ScopeMeta variants use `passType`
**How to avoid:** Each variant schema must have `clauseType: z.literal('indemnification')` etc. The existing pass-level schemas already have `z.literal()` for category -- use the same pattern for the discriminated union wrapper.
**Warning signs:** Zod error: "Invalid discriminator value" at parse time

### Pitfall 3: Schema Version Increment Timing
**What goes wrong:** Bump CURRENT_SCHEMA_VERSION but migration function has no handler for the new version
**Why it happens:** Version check and migration logic are written separately
**How to avoid:** Write the migration handler FIRST, then bump the version constant. Test with a localStorage entry that lacks `resolved`/`note` fields.
**Warning signs:** All stored contracts get cleared instead of migrated

### Pitfall 4: MergedAnalysisResultSchema vs Client AnalysisResultSchema Divergence
**What goes wrong:** The server's MergedAnalysisResultSchema (in src/schemas/analysis.ts) defines the merge output, but the client response includes additional fields added in analyze.ts (id on findings, bidSignal)
**Why it happens:** analyze.ts adds `id` to each finding and `bidSignal` to the response AFTER merge
**How to avoid:** The client-side AnalysisResultSchema must match what analyze.ts actually returns (with id, bidSignal), NOT what MergedAnalysisResultSchema defines. These are two different schemas for two different stages.
**Warning signs:** safeParse fails on every valid API response because `id` field is missing from schema

### Pitfall 5: UnifiedFinding vs Finding Type Confusion
**What goes wrong:** merge.ts has its own `UnifiedFinding` interface that overlaps with but differs from the client-side `Finding` type
**Why it happens:** UnifiedFinding is a server-side intermediate type; Finding is what the client uses
**How to avoid:** Keep UnifiedFinding in merge.ts as-is for the merge pipeline. The client AnalysisResultSchema validates the final output shape (which includes `id` and excludes `resolved`/`note` -- those are added client-side). Don't try to unify these into one type.
**Warning signs:** Build errors from trying to use client Finding type in serverless function code

### Pitfall 6: Existing Contracts Missing `id` or Other Fields
**What goes wrong:** Mock contracts or manually-created contracts in localStorage may lack fields that become required
**Why it happens:** Mock data in mockContracts.ts may not have all fields; old analyzed contracts pre-date newer schema fields
**How to avoid:** Migration function must handle ALL newly-required fields with safe defaults. Check mockContracts.ts and update it too.
**Warning signs:** App crashes on load with "Cannot read property of undefined"

## Code Examples

### Optionality Audit: Current Finding Interface vs Zod FindingSchema

Current TS Finding (contract.ts) has these optional fields:
```
recommendation?     -- Zod FindingSchema: REQUIRED (z.string())     --> MISMATCH
clauseReference?    -- Zod FindingSchema: REQUIRED (z.string())     --> MISMATCH
clauseText?         -- Zod FindingSchema: optional                  --> OK
explanation?        -- Zod FindingSchema: optional                  --> OK
crossReferences?    -- Zod legal/scope schemas: REQUIRED            --> context-dependent, keep optional in merged
legalMeta?          -- context-dependent                            --> OK stays optional
scopeMeta?          -- context-dependent                            --> OK stays optional
sourcePass?         -- set in merge.ts                              --> keep optional (not set on error findings)
negotiationPosition? -- Zod FindingSchema: REQUIRED (z.string())    --> MISMATCH
downgradedFrom?     -- context-dependent                            --> OK stays optional
isSynthesis?        -- context-dependent                            --> OK stays optional
actionPriority?     -- Zod FindingSchema: REQUIRED                  --> MISMATCH
resolved?           -- user-added, decision: becomes REQUIRED       --> CHANGE
note?               -- user-added, decision: becomes REQUIRED       --> CHANGE
```

**Fields to make required in TS Finding:**
- `recommendation` (always set by API)
- `clauseReference` (always set by API, 'N/A' for error findings)
- `negotiationPosition` (always set by API)
- `actionPriority` (always set by API)
- `resolved` (default: false)
- `note` (default: '')

**Fields that stay optional:** clauseText, explanation, crossReferences, legalMeta, scopeMeta, sourcePass, downgradedFrom, isSynthesis

### merge.ts Assertion Cast Census

Total `as` casts in merge.ts: **50 casts** across these functions:
- `buildBaseFinding`: 2 casts (crossReferences, actionPriority)
- `convertLegalFinding`: 37 casts (11 pass switch cases, 2-5 casts each)
- `convertScopeFinding`: 11 casts (4 pass switch cases)
- `mergePassResults`: 4 casts (overview, finding array conversions, final findings)

All become unnecessary when converter functions accept properly-typed Zod-inferred pass types.

### Converter Refactoring Strategy

Current: One `convertLegalFinding` function handles all 11 legal pass types via switch on passName, with `FindingResult & Record<string, unknown>` input.

Target: A dispatch map from passName to specific converter+schema pairs:
```typescript
const legalPassHandlers: Record<string, {
  schema: z.ZodSchema;
  convert: (finding: unknown, passName: string) => UnifiedFinding;
}> = {
  'legal-indemnification': {
    schema: IndemnificationFindingSchema,
    convert: (f, pn) => convertIndemnificationFinding(f as z.infer<typeof IndemnificationFindingSchema>, pn),
  },
  // ... one entry per legal pass
};
```

This approach: (a) parses through the specific schema, (b) hands typed data to a typed converter, (c) eliminates all assertion casts.

### Client AnalysisResultSchema Shape

The client schema must match what `api/analyze.ts` line 1443-1452 actually returns:
```typescript
export const AnalysisResultSchema = z.object({
  client: z.string(),
  contractType: ContractTypeEnum,
  riskScore: z.number(),
  scoreBreakdown: z.array(z.object({ name: z.string(), points: z.number() })).optional(),
  bidSignal: BidSignalSchema.optional(),  // added by analyze.ts after merge
  findings: z.array(MergedFindingSchema), // includes id field
  dates: z.array(ContractDateSchema),
  passResults: z.array(PassStatusSchema),
});
```

Note: `bidSignal` and finding `id` are NOT in MergedAnalysisResultSchema (server merge output) but ARE in the final API response.

### Migration Function Shape
```typescript
function migrateContracts(contracts: unknown[], fromVersion: number): Contract[] {
  return contracts.map(c => {
    const contract = c as Record<string, unknown>;
    // v0 -> v2: Add resolved/note to findings, ensure required fields
    if (fromVersion < 2) {
      const findings = (contract.findings as Array<Record<string, unknown>> || []).map(f => ({
        ...f,
        resolved: f.resolved ?? false,
        note: f.note ?? '',
        recommendation: f.recommendation ?? '',
        clauseReference: f.clauseReference ?? 'N/A',
        negotiationPosition: f.negotiationPosition ?? '',
        actionPriority: f.actionPriority ?? 'monitor',
      }));
      contract.findings = findings;
    }
    return contract as Contract;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual TS interface + Zod schema | z.infer from single Zod schema | Zod v3 (2022+) | Eliminates optionality drift |
| `as` assertion casts | Zod safeParse + typed data | Always best practice | Catches malformed data at boundaries |
| Trust API responses | safeParse at client boundary | Always best practice | Prevents silent render errors |

## Open Questions

1. **BidSignal Zod Schema**
   - What we know: BidSignal is defined in types/contract.ts as a TS interface; it needs a Zod schema for the client AnalysisResultSchema
   - What's unclear: Whether a BidSignal schema already exists somewhere or needs to be created
   - Recommendation: Create a small BidSignalSchema in the new analysisResult.ts or finding.ts file

2. **Synthesis Finding Shape Mismatch**
   - What we know: SynthesisFindingSchema has `constituentFindings` but no `severity`/`category`/`clauseReference` -- these are added when converting to UnifiedFinding in analyze.ts (lines 1281-1290)
   - What's unclear: Whether the client AnalysisResultSchema's Finding schema needs to account for synthesis findings differently
   - Recommendation: Since analyze.ts adds the missing fields before sending to client, the client schema just validates the unified shape -- no special handling needed

3. **Mock Contract Data Completeness**
   - What we know: mockContracts.ts provides 3 sample contracts used for first-visit seeding
   - What's unclear: Whether mock findings have all the fields that will become required
   - Recommendation: Audit mockContracts.ts during implementation and fill in any missing required fields

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none -- no test framework |
| Quick run command | `npm run build` (type-check via tsc) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-01 | Zod/TS optionality matches | build | `npm run build` (tsc strict catches mismatches) | N/A -- compile-time |
| TYPE-02 | Client validates API response | manual | Manually test with malformed response | N/A -- no test framework |
| TYPE-03 | merge.ts has zero assertion casts | lint/grep | `grep -c "as string\|as boolean\|as number\|as unknown\|as Array" api/merge.ts` | N/A -- grep check |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors immediately)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build clean + lint clean + grep confirms zero assertion casts in merge.ts

### Wave 0 Gaps
None -- no test framework to set up (project decision: testing is a separate milestone). Build-time type checking serves as the verification mechanism for this type-safety phase.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: src/types/contract.ts, src/schemas/*.ts, api/merge.ts, src/api/analyzeContract.ts, src/storage/contractStorage.ts, api/analyze.ts
- Zod v3 documentation: z.infer, z.discriminatedUnion, safeParse patterns (verified in existing codebase usage)

### Secondary (MEDIUM confidence)
- Package.json: zod ^3.25.76, typescript ^5.5.4

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, Zod patterns already established in codebase
- Architecture: HIGH - all source files examined, exact line-level integration points identified
- Pitfalls: HIGH - derived from concrete code analysis (circular imports, schema shape mismatches, migration versioning)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain, no external dependencies changing)
