# Phase 61: Warranty + Safety/OSHA Clause Passes - Research

**Researched:** 2026-04-06
**Domain:** Analysis pipeline clause passes (warranty + safety/OSHA), Zod schema design, merge pipeline integration
**Confidence:** HIGH

## Summary

Phase 61 adds two new analysis passes to the existing pipeline: a **warranty clause pass** and a **safety/OSHA compliance pass**. Both follow the well-established pattern from Phases 56-60: define a Zod finding schema, register the pass in `api/passes.ts`, wire a converter function in `api/merge.ts`, add a `ScopeMetaBadge` variant, and register the pass name in `PASS_LABELS` and dedup lists.

The warranty pass is a pure clause-extraction pass (no knowledge modules, no inference basis) that targets warranty-specific language: duration, exclusions, transferability, defect coverage scope, and call-back periods. The safety/OSHA pass leverages the existing `ca-calosha` knowledge module already registered in the knowledge registry (currently only consumed by `labor-compliance`). Both passes run as Stage 2 passes (no stage property needed, default is 2), require no bid PDF, and emit findings through the standard merge pipeline.

**Primary recommendation:** Follow the exact pattern of existing legal/scope passes. Each pass needs: (1) Zod finding schema, (2) pass result schema, (3) pass definition in `ANALYSIS_PASSES`, (4) converter function in merge.ts, (5) handler registration in `passHandlers`, (6) `ScopeMetaBadge` variant, (7) `ScopeMetaSchema` discriminated union entry, (8) `PASS_LABELS` entry, (9) `isSpecializedPass` list entry, (10) knowledge module mapping in `PASS_KNOWLEDGE_MAP`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLS-01 | User sees warranty clause findings (duration, exclusions, transferability, defect coverage, call-back period) | Warranty pass schema with `warrantyAspect` enum covering these 5 dimensions; category `Contract Compliance`; no inferenceBasis needed (direct clause extraction) |
| CLS-02 | User sees safety/OSHA compliance findings (site safety requirements, fall protection, GC safety-plan coordination) | Safety pass schema with `safetyAspect` enum; grounded in existing `ca-calosha` knowledge module; `inferenceBasis` field required for knowledge-module findings; category `Contract Compliance` |
</phase_requirements>

## Architecture Patterns

### Established Pass Creation Pattern (10-step checklist)

Every new pass follows this exact sequence. Deviating from it causes merge failures or silent finding drops.

1. **Zod Finding Schema** (`src/schemas/scopeComplianceAnalysis.ts` or `src/schemas/legalAnalysis.ts`)
   - Define `XxxFindingSchema` with pass-specific metadata fields as REQUIRED (not optional)
   - No `.min()/.max()/.minLength()/.maxLength()` constraints (structured outputs limitation)
   - Category must be a `z.literal()` matching one of the existing `CATEGORIES` tuple values

2. **Pass Result Schema** (same file)
   - `XxxPassResultSchema = z.object({ findings: z.array(XxxFindingSchema), dates: z.array(ContractDateSchema) })`

3. **Pass Definition** (`api/passes.ts`)
   - Add to `ANALYSIS_PASSES` array with `name`, `systemPrompt`, `userPrompt`, `isOverview: false`, `isScope: true` or `isLegal: true`, `schema: XxxPassResultSchema`
   - Stage 2 passes omit `stage` (defaults to 2); Stage 3 passes set `stage: 3`

4. **Converter Function** (`api/merge.ts`)
   - `convertXxxFinding(finding, passName)` returns `UnifiedFinding` with `scopeMeta` or `legalMeta`

5. **Handler Registration** (`api/merge.ts` `passHandlers` map)
   - `'pass-name': createHandler(XxxFindingSchema, convertXxxFinding)`

6. **ScopeMetaSchema Variant** (`src/schemas/finding.ts`)
   - Add discriminated union entry: `z.object({ passType: z.literal('pass-name'), ...metadata })`

7. **ScopeMetaBadge Component** (`src/components/ScopeMetaBadge/`)
   - New file with pill badges for pass-specific metadata
   - Register in `BADGE_MAP` in `index.tsx`

8. **PASS_LABELS** (`src/components/CostSummaryBar.tsx`)
   - Add human-readable label + add to `ORDERED_PASSES` array

9. **isSpecializedPass List** (`api/merge.ts`)
   - Add pass name to the dedup `isSpecializedPass` function's `.includes()` array

10. **PASS_KNOWLEDGE_MAP** (`src/knowledge/registry.ts`)
    - Map pass name to knowledge module IDs (empty array `[]` if none)

### Recommended Project Structure for New Files

```
src/schemas/scopeComplianceAnalysis.ts   # ADD: WarrantyFindingSchema, SafetyOshaFindingSchema + pass results
src/schemas/finding.ts                    # ADD: 2 new ScopeMetaSchema variants
src/components/ScopeMetaBadge/
  WarrantyBadge.tsx                       # NEW
  SafetyOshaBadge.tsx                     # NEW
  index.tsx                               # MODIFY: add to BADGE_MAP
api/passes.ts                             # MODIFY: add 2 pass definitions
api/merge.ts                              # MODIFY: add 2 converters + 2 handler registrations + isSpecializedPass
src/knowledge/registry.ts                 # MODIFY: add 2 PASS_KNOWLEDGE_MAP entries
src/components/CostSummaryBar.tsx         # MODIFY: add to PASS_LABELS + ORDERED_PASSES
```

### Category Decision

Both passes should use **`'Contract Compliance'`** as the finding category. This is an existing category in `CATEGORIES`. Rationale:
- Warranty clauses are contractual compliance obligations (not legal issues, not scope)
- Safety/OSHA requirements are compliance obligations imposed by the contract
- `'Contract Compliance'` is used by the existing change-order legal pass, establishing precedent for compliance-related findings
- No new categories needed -- avoids UI noise (aligns with UX-01 philosophy)

### Stage Decision

Both passes should be **Stage 2** (omit `stage` property, defaults to 2). Rationale:
- Neither pass depends on Stage 2 scope extraction results
- Neither pass requires bid PDF
- Running in Stage 2 maximizes parallelization without adding latency
- Success criterion 4 explicitly states "independent of scope-intel infrastructure"

### Warranty Pass Schema Design

```typescript
export const WarrantyFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Contract Compliance'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  warrantyAspect: z.enum([
    'duration',
    'exclusion',
    'transferability',
    'defect-coverage',
    'call-back-period',
    'missing-warranty',
  ]),
  warrantyDuration: z.string(),       // e.g. "2 years", "N/A" if not applicable
  affectedParty: z.enum(['subcontractor', 'general-contractor', 'manufacturer', 'owner', 'unspecified']),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});
```

Key design decisions:
- `warrantyAspect` enum directly maps to the 5 CLS-01 dimensions + `missing-warranty` for gap detection
- `warrantyDuration` as string (not number) because contracts express durations variously ("2 years from substantial completion", "manufacturer's standard")
- `affectedParty` captures who bears warranty obligation
- No `inferenceBasis` field -- warranty is direct clause extraction, not inference-grounded

### Safety/OSHA Pass Schema Design

```typescript
export const SafetyOshaFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Contract Compliance'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  safetyAspect: z.enum([
    'site-safety-program',
    'fall-protection',
    'gc-safety-coordination',
    'scaffolding-responsibility',
    'hazmat-handling',
    'incident-reporting',
    'safety-indemnification',
    'missing-safety-provision',
  ]),
  regulatoryReference: z.string(),     // T8 section or "N/A"
  responsibleParty: z.string(),
  inferenceBasis: InferenceBasisSchema,
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});
```

Key design decisions:
- `safetyAspect` covers CLS-02 requirements + scaffolding (mentioned in ca-calosha), hazmat, incident reporting, and safety-indemnification (flagged as CRITICAL in ca-calosha module)
- `inferenceBasis` IS required because the pass uses the `ca-calosha` knowledge module -- findings citing regulatory requirements from the module need provenance tracking
- `regulatoryReference` captures the specific T8 section (Cal/OSHA Title 8 code reference)
- The inference basis enforcement in merge.ts will automatically clamp knowledge-module-grounded findings to Medium max and drop any `model-prior` findings

### ScopeMetaSchema Variants

Two new entries for the discriminated union in `src/schemas/finding.ts`:

```typescript
z.object({
  passType: z.literal('warranty'),
  warrantyAspect: z.string(),
  warrantyDuration: z.string(),
  affectedParty: z.string(),
}),
z.object({
  passType: z.literal('safety-osha'),
  safetyAspect: z.string(),
  regulatoryReference: z.string(),
  responsibleParty: z.string(),
}),
```

### Knowledge Module Mapping

```typescript
// In PASS_KNOWLEDGE_MAP:
'warranty': [],                    // No knowledge modules -- direct clause extraction
'safety-osha': ['ca-calosha'],    // Existing module, already registered
```

The `ca-calosha` module is already registered by `src/knowledge/regulatory/ca-calosha.ts` and currently mapped to `labor-compliance`. Adding it to the safety-osha pass is safe -- multiple passes can share the same module. The token budget validator (`src/knowledge/tokenBudget.ts`) validates per-module, not per-pass.

### System Prompt Design

**Warranty pass prompt** should instruct the model to:
- Search for warranty, guarantee, call-back, defect, latent defect, workmanship, and remediation clauses
- Quote exact clause text (same quote-first discipline as all other passes)
- Classify each finding by `warrantyAspect`
- Flag missing warranty protections (no duration stated, no scope limitation, no mutual warranty)
- Severity: missing warranty = High, unreasonably short warranty (<1 year) = High, no transferability limitation = Medium, standard warranty provisions = Low/Info
- Action priority: duration/exclusion = pre-sign, call-back/defect monitoring = monitor

**Safety/OSHA pass prompt** should instruct the model to:
- Search for safety, OSHA, Cal/OSHA, fall protection, scaffolding, site safety, safety plan, PPE, and incident reporting clauses
- Cross-reference findings against `ca-calosha` knowledge module regulatory requirements
- Flag contracts shifting ALL safety responsibility to sub without GC coordination (HIGH per ca-calosha instructions)
- Flag safety-indemnification that covers GC's own site conditions (CRITICAL per ca-calosha instructions)
- Flag missing safety coordination provisions (MEDIUM per ca-calosha instructions)
- Set `inferenceBasis` to `'knowledge-module:ca-calosha'` for findings grounded in the module, `'contract-quoted'` for direct clause extraction
- NOTE: The merge pipeline's `enforceInferenceBasis` will automatically clamp `knowledge-module:ca-calosha` findings to Medium max

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding dedup | Custom dedup logic | Existing `byClauseAndCategory` + `byTitle` dedup in merge.ts | Already handles specialized vs overview pass preference |
| Severity clamping for inference findings | Manual severity cap | `enforceInferenceBasis()` in merge.ts | Automatically clamps knowledge-module findings to Medium |
| Knowledge module injection | Manual prompt concatenation | `getModulesForPass()` in registry.ts | composeSystemPrompt already appends module content |
| Finding ID generation | Custom UUID | Existing ID generation in merge pipeline | IDs assigned during mergePassResults |
| Badge pill styling | Custom CSS | `pillBase` + `formatLabel` from `ScopeMetaBadge/shared.ts` | Consistent pill appearance across all badge types |

## Common Pitfalls

### Pitfall 1: Forgetting isSpecializedPass Registration
**What goes wrong:** New pass findings lose to risk-overview duplicates during dedup
**Why it happens:** The `isSpecializedPass` function in merge.ts has a hardcoded `.includes()` list. If the new pass name is not added, its findings are treated as generic and may be deduplicated away in favor of the overview pass's version.
**How to avoid:** Add both `'warranty'` and `'safety-osha'` to the `isSpecializedPass` `.includes()` array
**Warning signs:** Findings from the new passes disappear after merge

### Pitfall 2: ScopeMetaSchema Discriminated Union Mismatch
**What goes wrong:** TypeScript compile error or runtime `passType` mismatch
**Why it happens:** The `ScopeMetaSchema` discriminated union in `finding.ts` must have a variant for every `passType` value that converters emit. If the string literal doesn't match exactly, the discriminated union rejects it.
**How to avoid:** Ensure the `passType` literal in the schema variant matches exactly what the converter function sets
**Warning signs:** `z.discriminatedUnion` parse errors in tests or at runtime

### Pitfall 3: Safety Pass Severity Exceeding Medium for Knowledge-Module Findings
**What goes wrong:** The ca-calosha module instructions say to flag certain patterns as CRITICAL or HIGH, but `enforceInferenceBasis` clamps `knowledge-module:*` findings to Medium
**Why it happens:** The module instructions predate ARCH-02's inference basis enforcement
**How to avoid:** For safety findings that quote exact contract text (not inferred from the module), use `inferenceBasis: 'contract-quoted'` -- these bypass the Medium clamp. Only use `'knowledge-module:ca-calosha'` for findings where the module provides the regulatory context that the contract doesn't explicitly state.
**Warning signs:** All safety findings capped at Medium even when contract text clearly warrants Critical/High

### Pitfall 4: PASS_LABELS and ORDERED_PASSES Sync
**What goes wrong:** Cost summary bar shows raw pass names or breaks ordering
**Why it happens:** `CostSummaryBar.tsx` has both `ORDERED_PASSES` array and `PASS_LABELS` record. Missing from either causes display issues.
**How to avoid:** Add to both `ORDERED_PASSES` (for sort order) and `PASS_LABELS` (for display name)

### Pitfall 5: Schema Import Not Added in merge.ts
**What goes wrong:** `passHandlers` references undefined schema, causing runtime crash
**Why it happens:** New schemas are defined in `scopeComplianceAnalysis.ts` but the import at the top of `merge.ts` is not updated
**How to avoid:** Add both new schema imports to the existing import block from `../src/schemas/scopeComplianceAnalysis`

### Pitfall 6: Category Mismatch Between Schema and Merge
**What goes wrong:** Findings silently dropped or miscategorized
**Why it happens:** The finding schema uses `z.literal('Contract Compliance')` but the category string must exactly match one of the `CATEGORIES` tuple values in `types/contract.ts`
**How to avoid:** Verify `'Contract Compliance'` is in the `CATEGORIES` tuple (it is -- confirmed at index position 2)

## Code Examples

### Converter Function Pattern (from existing codebase)

```typescript
// Source: api/merge.ts lines 376-402 (spec-reconciliation converter)
type WarrantyFinding = z.infer<typeof WarrantyFindingSchema>;

function convertWarrantyFinding(finding: WarrantyFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'warranty',
      warrantyAspect: finding.warrantyAspect,
      warrantyDuration: finding.warrantyDuration,
      affectedParty: finding.affectedParty,
    },
  };
}
```

### Handler Registration Pattern

```typescript
// Source: api/merge.ts passHandlers map
'warranty': createHandler(WarrantyFindingSchema, convertWarrantyFinding),
'safety-osha': createHandler(SafetyOshaFindingSchema, convertSafetyOshaFinding),
```

### Badge Component Pattern

```typescript
// Source: src/components/ScopeMetaBadge/SpecReconciliationBadge.tsx (template)
import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type WarrantyMeta = Extract<ScopeMeta, { passType: 'warranty' }>;

export function WarrantyBadge({ meta }: { meta: WarrantyMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} bg-emerald-100 text-emerald-700`}>
        {formatLabel(meta.warrantyAspect)}
      </span>
      {meta.warrantyDuration && meta.warrantyDuration !== 'N/A' && (
        <span className={`${pillBase} bg-blue-100 text-blue-700`}>
          {meta.warrantyDuration}
        </span>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single risk-overview pass | 18+ specialized parallel passes | Phase 5 (v1.0) | Each clause type gets dedicated analysis |
| Generic finding schema | Per-pass typed schemas with discriminated unions | Phase 6 (v1.0) | Type-safe metadata per pass type |
| Stage 2 only | Stage 2 + Stage 3 waves | Phase 56 (v3.0) | Reconciliation passes run after extraction |
| No inference tracking | `inferenceBasis` provenance field | Phase 56 (v3.0) | Knowledge-module findings clamped to Medium, model-prior dropped |

## Open Questions

1. **Pass naming: `warranty` vs `warranty-clause`**
   - What we know: Existing passes use short names (`verbiage-analysis`, `labor-compliance`, `bid-reconciliation`)
   - Recommendation: Use `warranty` and `safety-osha` -- short, consistent with pattern

2. **Safety pass: isLegal or isScope?**
   - What we know: Safety/OSHA is a compliance concern. `labor-compliance` uses `isScope: true`. The legal passes use `isLegal: true` for clause-type analysis.
   - Recommendation: Both passes should use `isScope: true` -- they produce `scopeMeta` (not `legalMeta`), consistent with labor-compliance and all scope/compliance passes

3. **Should warranty pass use legalMeta or scopeMeta?**
   - What we know: Legal passes produce `legalMeta` with `clauseType` discriminator. Scope passes produce `scopeMeta` with `passType` discriminator. Warranty is contractual but not a legal-risk clause type like indemnification.
   - Recommendation: Use `scopeMeta` -- warranty analysis is compliance-oriented, and the `ScopeMetaBadge` system is the right rendering surface for warranty metadata pills

## Sources

### Primary (HIGH confidence)
- `api/passes.ts` -- all 18 existing pass definitions, `AnalysisPass` interface
- `api/merge.ts` -- full merge pipeline, converter pattern, `passHandlers`, `isSpecializedPass`, `enforceInferenceBasis`
- `src/schemas/scopeComplianceAnalysis.ts` -- all 7 scope/compliance finding schemas
- `src/schemas/finding.ts` -- `ScopeMetaSchema` discriminated union (7 variants), `MergedFindingSchema`
- `src/schemas/inferenceBasis.ts` -- `InferenceBasisSchema` union type
- `src/knowledge/registry.ts` -- `PASS_KNOWLEDGE_MAP`, module resolution
- `src/knowledge/regulatory/ca-calosha.ts` -- full Cal/OSHA module content (Title 8 refs)
- `src/types/contract.ts` -- `CATEGORIES` tuple (10 categories), `SEVERITIES` tuple
- `src/components/ScopeMetaBadge/index.tsx` -- `BADGE_MAP` dispatch
- `src/components/CostSummaryBar.tsx` -- `PASS_LABELS`, `ORDERED_PASSES`

### Secondary (MEDIUM confidence)
- Phase 56-60 planning docs and state decisions -- architectural patterns established

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all existing infrastructure
- Architecture: HIGH - exact pattern repeated 18 times in codebase, fully inspected
- Pitfalls: HIGH - derived from direct code inspection of merge pipeline edge cases

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- pattern is mature and unlikely to change)
