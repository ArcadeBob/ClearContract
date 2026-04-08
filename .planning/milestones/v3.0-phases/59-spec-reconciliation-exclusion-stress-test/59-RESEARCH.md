# Phase 59: Spec Reconciliation + Exclusion Stress-Test - Research

**Researched:** 2026-04-06
**Domain:** LLM inference passes (Stage 3), Zod schema design, knowledge-module-grounded prompting, merge pipeline extension
**Confidence:** HIGH

## Summary

Phase 59 adds two new Stage 3 analysis passes -- `spec-reconciliation` and `exclusion-stress-test` -- to the existing three-stage pipeline. All infrastructure for Stage 3 orchestration, `inferenceBasis` schema enforcement, and knowledge-module injection already exists from Phases 56-58. The work is primarily: (1) new Zod schemas for each pass's finding shape, (2) new prompt definitions in `api/passes.ts`, (3) new converter functions and handler registrations in `api/merge.ts`, (4) new `ScopeMeta` union variants in `src/types/contract.ts`, and (5) `PASS_LABELS` entries in the cost summary UI.

The `spec-reconciliation` pass is already registered in `PASS_KNOWLEDGE_MAP` (with `div08-deliverables` and `aama-submittal-standards` modules). The `exclusion-stress-test` pass needs to be added to the map with the same two modules. Both passes must emit findings with `inferenceBasis` as a required field, and the existing `enforceInferenceBasis` merge logic will automatically drop `model-prior` findings and clamp `knowledge-module:*` findings to Medium severity.

**Primary recommendation:** Follow the established pass-addition pattern exactly (schema + pass definition + merge handler + ScopeMeta variant + PASS_LABELS). The prompt engineering is the high-risk area -- use quote-first synthesis patterns from Pitfall 1 research to prevent fabricated spec requirements.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCOPE-03 | User sees inferred spec-reconciliation gaps for Div 08 / ASTM / AAMA cites -- what's typically required but absent from declared scope | New `spec-reconciliation` Stage 3 pass with `div08-deliverables` + `aama-submittal-standards` modules; Zod schema with required `inferenceBasis`; merge handler converts to `ScopeMeta` with `passType: 'spec-reconciliation'` |
| SCOPE-04 | User sees exclusion stress-test findings that challenge declared exclusions against inferred spec requirements | New `exclusion-stress-test` Stage 3 pass with same knowledge modules; Zod schema with both exclusion quote and tension quote fields; merge handler converts to `ScopeMeta` with `passType: 'exclusion-stress-test'` |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase extends existing infrastructure only.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | existing | Schema validation for new pass finding shapes | Project standard for all pass schemas |
| @anthropic-ai/sdk | existing | Claude API calls for new passes | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | -- | -- | -- |

**Installation:** None required.

## Architecture Patterns

### Existing Infrastructure (reuse, don't rebuild)

All of the following already exist and are proven:

1. **Stage 3 orchestration** (`api/analyze.ts` lines 563-615): `Promise.allSettled` + per-pass `AbortController` + 90s timeout. Passes with `stage: 3` are automatically routed to Stage 3 wave.
2. **Knowledge module injection** (`src/knowledge/registry.ts`): `PASS_KNOWLEDGE_MAP` already has `spec-reconciliation` mapped to `['div08-deliverables', 'aama-submittal-standards']`. `composeSystemPrompt()` appends module content to system prompt automatically.
3. **Inference basis enforcement** (`api/merge.ts` lines 80-103): `enforceInferenceBasis()` drops `model-prior` findings and clamps `knowledge-module:*` to Medium. Runs after dedup, before scoring.
4. **Token budget** (`src/knowledge/tokenBudget.ts`): MAX_MODULES_PER_PASS = 6, both passes need only 2 modules each -- well within budget.

### New Pass Addition Pattern (follow exactly)

Each new pass requires work in these files, in this order:

```
src/schemas/scopeComplianceAnalysis.ts   # New finding schema + pass result schema
src/types/contract.ts                     # New ScopeMeta union variant
api/passes.ts                             # New AnalysisPass entry (stage: 3)
api/merge.ts                              # New converter function + passHandlers entry
src/knowledge/registry.ts                 # PASS_KNOWLEDGE_MAP entry (spec-recon already exists)
src/components/CostSummaryBar.tsx          # PASS_LABELS entry
```

### Pattern: Spec-Reconciliation Pass

**Schema shape (Zod):**
```typescript
// In src/schemas/scopeComplianceAnalysis.ts
export const SpecReconciliationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),     // contract section citing the spec
  clauseText: z.string(),          // exact contract quote referencing the spec
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  // Spec-reconciliation-specific fields:
  specSection: z.string(),          // CSI section number (e.g., "08 44 13")
  typicalDeliverable: z.string(),   // what the knowledge module says is typical
  gapType: z.enum(['missing-submittal', 'missing-test-report', 'missing-certification',
                    'missing-structural-calc', 'missing-warranty', 'missing-mock-up',
                    'finish-spec-mismatch', 'other']),
  inferenceBasis: InferenceBasisSchema,  // REQUIRED -- grounding citation
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const SpecReconciliationPassResultSchema = z.object({
  findings: z.array(SpecReconciliationFindingSchema),
  dates: z.array(ContractDateSchema),
});
```

**ScopeMeta variant:**
```typescript
// In src/types/contract.ts -- add to ScopeMeta union
| {
    passType: 'spec-reconciliation';
    specSection: string;
    typicalDeliverable: string;
    gapType: string;
  }
```

**Merge converter:**
```typescript
// In api/merge.ts
function convertSpecReconciliationFinding(finding: SpecReconciliationFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'spec-reconciliation',
      specSection: finding.specSection,
      typicalDeliverable: finding.typicalDeliverable,
      gapType: finding.gapType,
    },
  };
}
```

### Pattern: Exclusion Stress-Test Pass

**Schema shape (Zod):**
```typescript
export const ExclusionStressTestFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),           // the exclusion clause text
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  // Exclusion-stress-test-specific fields:
  exclusionQuote: z.string(),       // exact text of the declared exclusion
  tensionQuote: z.string(),         // knowledge-module requirement that conflicts
  specSection: z.string(),          // CSI section the tension relates to
  tensionType: z.enum(['spec-requires-excluded-item', 'code-requires-excluded-item',
                       'standard-practice-conflict', 'warranty-gap', 'other']),
  inferenceBasis: InferenceBasisSchema,  // REQUIRED
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const ExclusionStressTestPassResultSchema = z.object({
  findings: z.array(ExclusionStressTestFindingSchema),
  dates: z.array(ContractDateSchema),
});
```

**ScopeMeta variant:**
```typescript
| {
    passType: 'exclusion-stress-test';
    exclusionQuote: string;
    tensionQuote: string;
    specSection: string;
    tensionType: string;
  }
```

### Anti-Patterns to Avoid

- **Emitting findings without knowledge-module grounding:** Every finding MUST have `inferenceBasis` set to `'knowledge-module:div08-deliverables'` or `'knowledge-module:aama-submittal-standards'` or `'contract-quoted'`. Never allow free-form model priors to become user-visible findings.
- **Using High/Critical severity on inference findings:** The merge logic clamps to Medium, but the prompt should also instruct the model not to exceed Medium for inference-grounded findings -- belt and suspenders.
- **Adding new top-level Category values:** Both passes emit findings under `'Scope of Work'` category (per UX-01 requirement in Phase 62). No new enum values.
- **Modifying Stage 3 orchestration:** The orchestration is proven and unchanged. Only register new passes in `ANALYSIS_PASSES` with `stage: 3`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stage 3 orchestration | Custom parallel runner | Existing Stage 3 wave in `api/analyze.ts` | Already handles allSettled, abort, timeout, partial |
| Inference basis enforcement | Per-pass severity checks | `enforceInferenceBasis()` in `api/merge.ts` | Centralized, tested, handles drop + clamp |
| Knowledge module injection | Manual prompt concatenation | `composeSystemPrompt()` via `PASS_KNOWLEDGE_MAP` | Automatic module loading, token budget validation |
| Finding schema validation | Manual field checks | Zod `safeParse` in merge handler dispatch | Type-safe, structured outputs guarantee shape |

## Common Pitfalls

### Pitfall 1: Fabricated Spec Requirements (CRITICAL)
**What goes wrong:** Claude lists "typical Section 084113 requirements" from training data that don't match the actual project specification. False gaps waste negotiation capital.
**Why it happens:** Section 084113 is a CSI taxonomy slot, not a fixed spec. Each project populates it differently. Claude pattern-matches training examples.
**How to avoid:**
- Prompt pattern: "Quote the contract's spec reference first, then quote the knowledge-module entry. If you cannot cite both, do not emit the finding."
- `inferenceBasis` must be `knowledge-module:*` (not `model-prior`). Merge drops model-prior.
- Knowledge modules already constrain to verifiable standards (AAMA 501.1, ASTM E330, etc.) not "typical spec content."
**Warning signs:** Findings with `clauseReference` but no quoted clause text. Multiple identical gaps across wildly different contracts.

### Pitfall 2: Exclusion Stress-Test False Positives
**What goes wrong:** The pass challenges every declared exclusion, even ones that are standard and reasonable for glazing subcontracts (e.g., "excludes structural steel" is normal for a glazing sub).
**Why it happens:** Without guidance on what exclusions are expected vs. unusual, the LLM treats all exclusions as suspicious.
**How to avoid:**
- Prompt instructs: "Only flag an exclusion if the knowledge module identifies a specific tension -- the excluded item is typically REQUIRED by the cited spec section. Standard trade exclusions (structural steel, concrete work, painting) should NOT be flagged."
- `tensionQuote` field must cite the specific knowledge-module requirement that conflicts with the exclusion.

### Pitfall 3: Dedup Collisions with Stage 2 Scope Findings
**What goes wrong:** Stage 2 `scope-extraction` and Stage 3 `spec-reconciliation` both emit "Scope of Work" category findings about the same spec section, and the dedup logic keeps the wrong one.
**Why it happens:** `isSpecializedPass()` in merge.ts currently lists `scope-extraction` but not the new passes. Both have the same category + potentially overlapping clauseReferences.
**How to avoid:**
- Add `'spec-reconciliation'` and `'exclusion-stress-test'` to the `isSpecializedPass()` array in `api/merge.ts`.
- The new passes use distinct `scopeItemType` / `gapType` values that scope-extraction never emits, so title-based dedup should be sufficient as long as titles are unique.

### Pitfall 4: Token Budget Overrun on Large Contracts
**What goes wrong:** Two additional Stage 3 passes each consume ~15-25s and the pipeline breaches the 250s global timeout.
**Why it happens:** Stage 3 passes receive the full contract document (via Files API fileId) plus knowledge modules in the system prompt.
**How to avoid:**
- Both passes run in parallel within Stage 3's existing 90s per-pass timeout.
- The 60s Stage 3 wall-clock budget (from Phase 56 CONTEXT.md) accommodates two parallel passes easily since they run concurrently.
- Monitor: if Stage 2 takes >150s (overrun), Stage 3 still runs on partial output per established policy.

## Code Examples

### Pass Definition (api/passes.ts)
```typescript
// Source: follows existing pattern from scope-extraction, dates-deadlines
{
  name: 'spec-reconciliation',
  isOverview: false,
  isScope: true,
  schema: SpecReconciliationPassResultSchema,
  stage: 3,
  systemPrompt: `You are a construction contract analyst...
    [spec-reconciliation prompt with quote-first synthesis pattern]`,
  userPrompt: 'Analyze this contract for spec-reconciliation gaps...',
},
{
  name: 'exclusion-stress-test',
  isOverview: false,
  isScope: true,
  schema: ExclusionStressTestPassResultSchema,
  stage: 3,
  systemPrompt: `You are a construction contract analyst...
    [exclusion stress-test prompt]`,
  userPrompt: 'Challenge the declared exclusions against inferred spec requirements...',
},
```

### Knowledge Map Registration (src/knowledge/registry.ts)
```typescript
// spec-reconciliation already registered:
'spec-reconciliation': ['div08-deliverables', 'aama-submittal-standards'],
// Add exclusion-stress-test:
'exclusion-stress-test': ['div08-deliverables', 'aama-submittal-standards'],
```

### Merge Handler Registration (api/merge.ts)
```typescript
// In passHandlers Record:
'spec-reconciliation': createHandler(SpecReconciliationFindingSchema, convertSpecReconciliationFinding),
'exclusion-stress-test': createHandler(ExclusionStressTestFindingSchema, convertExclusionStressTestFinding),
```

### isSpecializedPass Update (api/merge.ts)
```typescript
const isSpecializedPass = (sp: string) =>
  sp.startsWith('legal-') ||
  ['scope-extraction', 'dates-deadlines', 'verbiage-analysis', 'labor-compliance',
   'spec-reconciliation', 'exclusion-stress-test'].includes(sp);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All passes in single stage | Three-stage pipeline (S1 primer + S2 parallel + S3 reconciliation) | Phase 56 (2026-04-05) | Stage 3 runs after Stage 2 settles, enables inference passes |
| No inference grounding | `inferenceBasis` discriminator + merge-time enforcement | Phase 56 (2026-04-05) | model-prior dropped, knowledge-module clamped to Medium |
| 4 modules per pass max | 6 modules per pass max | Phase 56 (2026-04-05) | Both new passes need only 2 modules each |
| No knowledge modules for specs | AAMA + Div 08 modules | Phase 58 (2026-04-06) | Grounding data for reconciliation/stress-test |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCOPE-03 | spec-reconciliation findings emitted with inferenceBasis | unit | `npx vitest run api/merge.test.ts -t "spec-reconciliation" -x` | No - Wave 0 |
| SCOPE-03 | spec-recon findings clamped to Medium by enforceInferenceBasis | unit | `npx vitest run api/merge.test.ts -t "enforceInferenceBasis" -x` | Partial (existing tests cover clamp, need spec-recon case) |
| SCOPE-04 | exclusion-stress-test findings with exclusionQuote + tensionQuote | unit | `npx vitest run api/merge.test.ts -t "exclusion-stress-test" -x` | No - Wave 0 |
| SCOPE-04 | exclusion-stress-test findings never exceed Medium | unit | `npx vitest run api/merge.test.ts -t "enforceInferenceBasis" -x` | Partial |
| SCOPE-03+04 | model-prior findings dropped for both passes | unit | `npx vitest run api/merge.test.ts -t "model-prior" -x` | Existing tests cover generic case |
| SCOPE-03+04 | Both passes registered as stage: 3 | unit | `npx vitest run api/analyze.test.ts -t "Stage 3" -x` | Partial (empty-wave test exists, need real pass test) |
| SCOPE-03+04 | Zod schema validation for new finding shapes | unit | `npx vitest run src/schemas/inferenceBasis.test.ts -x` | Existing InferenceBasis tests cover |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Merge test cases for `spec-reconciliation` findings (convert + dedup + inference enforcement)
- [ ] Merge test cases for `exclusion-stress-test` findings (convert + dedup + inference enforcement)
- [ ] Stage 3 integration test with real pass registration (update analyze.test.ts todo tests)
- [ ] Schema validation tests for new finding schemas (SpecReconciliationFindingSchema, ExclusionStressTestFindingSchema)

## Open Questions

1. **Prompt engineering specifics for spec-reconciliation**
   - What we know: Quote-first synthesis pattern is the correct approach (Pitfall 1 research). Knowledge modules already contain ANALYSIS INSTRUCTIONS sections.
   - What's unclear: Exact prompt wording to balance thoroughness (catching real gaps) vs. precision (avoiding false positives). This is best refined during implementation.
   - Recommendation: Start with the ANALYSIS INSTRUCTIONS already embedded in the knowledge modules and add the quote-first constraint. Iterate based on test contract output.

2. **Exclusion stress-test scope boundaries**
   - What we know: Only exclusions that conflict with cited spec section requirements should be flagged. Standard trade exclusions should not be challenged.
   - What's unclear: Whether the prompt needs an explicit list of "standard trade exclusions" or whether the knowledge modules provide sufficient context.
   - Recommendation: Include a brief standard-exclusions list in the prompt (structural steel, concrete, painting, electrical, plumbing, HVAC) as negative examples.

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` -- Stage 3 orchestration code, line-by-line inspection
- `api/merge.ts` -- enforceInferenceBasis, passHandlers, dedup logic, converter pattern
- `api/passes.ts` -- AnalysisPass interface, existing pass definitions, stage marker
- `src/knowledge/registry.ts` -- PASS_KNOWLEDGE_MAP with spec-reconciliation pre-registered
- `src/schemas/inferenceBasis.ts` -- InferenceBasisSchema Zod type
- `src/schemas/scopeComplianceAnalysis.ts` -- existing scope finding schema pattern
- `src/types/contract.ts` -- ScopeMeta union type
- `src/knowledge/standards/aama-submittal-standards.ts` -- AAMA module content + ANALYSIS INSTRUCTIONS
- `src/knowledge/trade/div08-deliverables.ts` -- Div 08 module content + ANALYSIS INSTRUCTIONS

### Secondary (HIGH confidence)
- `.planning/phases/56-architecture-foundation/56-CONTEXT.md` -- locked decisions for Stage 3, inferenceBasis, timeout budgets
- `.planning/research/PITFALLS.md` -- Pitfall 1 (fabricated specs), Pitfall 3 (timeout)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, extends existing patterns
- Architecture: HIGH -- all infrastructure proven in Phases 56-58, patterns directly reusable
- Pitfalls: HIGH -- Pitfall 1 (fabrication) extensively researched in v3.0 research; merge enforcement already tested
- Prompt engineering: MEDIUM -- exact prompt wording is iterative; patterns are established but effectiveness on real contracts needs validation

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependency changes expected)
