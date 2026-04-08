# Phase 60: Bid Reconciliation Capstone - Research

**Researched:** 2026-04-06
**Domain:** Dual-document LLM analysis pass, bid-vs-contract reconciliation schema, document attribution, Stage 3 orchestration extension
**Confidence:** HIGH

## Summary

Phase 60 adds a single new Stage 3 analysis pass -- `bid-reconciliation` -- that receives both the contract PDF and the bid PDF, producing findings that cover exclusion parity, quantity deltas, and unbid scope items. This is the capstone of v3.0: it consumes infrastructure from Phase 56 (Stage 3 orchestration), Phase 57 (scope_items data model), and Phase 58 (multi-doc upload + bidFileId).

The primary technical challenge is **dual-document attribution**: the `bid-reconciliation` pass is the first pass that receives two documents, requiring changes to `runAnalysisPass()` to accept an optional `bidFileId` parameter, and prompt-level `<document index>` tagging to ensure the LLM attributes quotes to the correct source. The schema introduces `contractQuote` and `bidQuote` as required nullable fields on every reconciliation finding, replacing the generic `clauseText` field for attribution purposes.

The secondary challenge is **conditional pass skipping**: when no bid PDF is uploaded, the bid-reconciliation pass must be excluded from the Stage 3 wave entirely (not run with empty bid context). This requires a `requiresBid` flag on the `AnalysisPass` definition and a filter in the Stage 3 orchestration block.

**Primary recommendation:** Extend `runAnalysisPass()` with an optional `bidFileId` parameter. Add a `requiresBid?: boolean` flag to `AnalysisPass`. Filter Stage 3 passes to exclude `requiresBid` passes when `bidFileId` is null. Follow the established pass-addition pattern exactly for schema, merge handler, and ScopeMeta variant. Use explicit `<document index="1" type="contract">` / `<document index="2" type="bid">` tagging in the prompt per Pitfall 2 prevention strategy.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BID-02 | User sees bid-vs-contract reconciliation findings: exclusion parity, quantity deltas, scope items not in bid | New `bid-reconciliation` Stage 3 pass with dual-document input; three finding subtypes (exclusion-parity, quantity-delta, unbid-scope) via `reconciliationType` enum field; schema requires `contractQuote` + `bidQuote` for attribution |
| BID-04 | Each reconciliation finding has both `contractQuote` and `bidQuote` attributed to the correct document | `BidReconciliationFindingSchema` requires `contractQuote: z.string().nullable()` and `bidQuote: z.string().nullable()`; prompt uses `<document index>` tagging; merge converter maps to new `ScopeMeta` variant with `passType: 'bid-reconciliation'`; FindingCard renders dual quotes via existing `ClauseQuote` component |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase extends existing infrastructure only.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | existing | Schema validation for bid-reconciliation finding shape | Project standard for all pass schemas |
| @anthropic-ai/sdk | existing | Claude API calls with dual-document context | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | -- | -- | -- |

**Installation:** None required.

## Architecture Patterns

### Existing Infrastructure (reuse, don't rebuild)

1. **Stage 3 orchestration** (`api/analyze.ts` lines 563-615): `Promise.allSettled` + per-pass `AbortController` + 90s timeout. Already proven with spec-reconciliation and exclusion-stress-test passes.
2. **Knowledge module injection** (`src/knowledge/registry.ts`): `PASS_KNOWLEDGE_MAP` + `composeSystemPrompt()`. Bid-reconciliation does NOT need knowledge modules -- it compares two actual documents, not inferred requirements.
3. **Inference basis enforcement** (`api/merge.ts` lines 80-103): Bid-reconciliation findings use `inferenceBasis: 'contract-quoted'` since they quote actual document text, not knowledge-module inferences. No severity clamping needed.
4. **Dual-quote UI** (`src/components/ClauseQuote.tsx`): Already supports `borderColor` and `label` props. Exclusion-stress-test findings already render two `ClauseQuote` components (contract text + inferred requirement). Bid-reconciliation extends this pattern with contract quote + bid quote.
5. **bidFileId availability** (`api/analyze.ts` line 456): `bidFileId` is already captured from the bid upload flow and available in the analyze handler scope. Currently only used for cleanup -- needs to be passed to `runAnalysisPass()`.

### Key Change: `runAnalysisPass()` Dual-Document Support

Current signature:
```typescript
async function runAnalysisPass(
  client: Anthropic,
  fileId: string,
  pass: AnalysisPass,
  companyProfile?: CompanyProfile,
  signal?: AbortSignal
): Promise<PassWithUsage>
```

Required change -- add optional `bidFileId`:
```typescript
async function runAnalysisPass(
  client: Anthropic,
  fileId: string,
  pass: AnalysisPass,
  companyProfile?: CompanyProfile,
  signal?: AbortSignal,
  bidFileId?: string | null
): Promise<PassWithUsage>
```

When `bidFileId` is provided, the messages array includes two document blocks:
```typescript
content: [
  {
    type: 'document',
    source: { type: 'file', file_id: fileId },
    cache_control: { type: 'ephemeral' },
  },
  // Bid document -- only included when bidFileId is provided
  ...(bidFileId ? [{
    type: 'document',
    source: { type: 'file', file_id: bidFileId },
  }] : []),
  {
    type: 'text',
    text: pass.userPrompt,
  },
],
```

Note: The bid document does NOT get `cache_control: { type: 'ephemeral' }` because only the contract PDF should be cached across passes. The bid is only used by bid-reconciliation.

### Key Change: `AnalysisPass` Interface Extension

```typescript
export interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
  schema?: z.ZodTypeAny;
  stage?: 2 | 3;
  requiresBid?: boolean;  // NEW: skip pass when no bid PDF uploaded
}
```

### Key Change: Stage 3 Conditional Filtering

In `api/analyze.ts`, the Stage 3 block needs to filter out `requiresBid` passes when `bidFileId` is null:

```typescript
const stage3Passes = ANALYSIS_PASSES.filter((p) => p.stage === 3);
// Filter bid-requiring passes when no bid is uploaded
const activeStage3Passes = stage3Passes.filter(
  (p) => !p.requiresBid || bidFileId
);
```

And the Stage 3 `runAnalysisPass` call needs to pass `bidFileId`:

```typescript
return runAnalysisPass(client!, fileId!, pass, companyProfile, ctrl.signal, bidFileId)
```

### New Pass Addition Pattern (follow exactly)

Each new pass requires work in these files, in this order:

```
src/schemas/scopeComplianceAnalysis.ts   # New BidReconciliationFindingSchema + pass result schema
src/schemas/finding.ts                    # New ScopeMeta union variant for 'bid-reconciliation'
src/types/contract.ts                     # New ScopeMeta type variant
api/passes.ts                             # New AnalysisPass entry (stage: 3, requiresBid: true)
api/merge.ts                              # New converter function + passHandlers entry
api/analyze.ts                            # runAnalysisPass bidFileId param + Stage 3 filter
src/knowledge/registry.ts                 # PASS_KNOWLEDGE_MAP entry (empty array -- no modules)
src/components/CostSummaryBar.tsx          # PASS_LABELS entry
src/components/FindingCard.tsx             # Dual-quote rendering for bid-reconciliation
```

### Schema: BidReconciliationFindingSchema

```typescript
export const BidReconciliationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),              // summary text (kept for backward compat)
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  // Bid-reconciliation-specific fields:
  contractQuote: z.string().nullable(), // exact quote from contract (null if contract silent)
  bidQuote: z.string().nullable(),      // exact quote from bid (null if bid silent)
  reconciliationType: z.enum([
    'exclusion-parity',    // exclusion in one doc missing from other
    'quantity-delta',      // different quantities across documents
    'unbid-scope',         // contract scope item absent from bid
  ]),
  directionOfRisk: z.string(),         // plain-English risk direction explanation
  inferenceBasis: z.literal('contract-quoted'), // always contract-quoted (both docs are real)
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});
```

Important schema decisions:
- `contractQuote` and `bidQuote` are both `z.string().nullable()` (not optional) -- structured outputs requires the field to always be present. Null means "document is silent on this item."
- `inferenceBasis` is always `'contract-quoted'` since findings come from actual document text, not knowledge modules.
- `reconciliationType` discriminates the three finding subtypes for UI rendering and filtering.
- NOTE on `.nullable()`: Anthropic structured outputs supports nullable via Zod `.nullable()` -- this produces `{"type": ["string", "null"]}` in JSON schema, which the model handles correctly.

### ScopeMeta Variant

```typescript
// In src/types/contract.ts ScopeMeta union:
| {
    passType: 'bid-reconciliation';
    contractQuote: string | null;
    bidQuote: string | null;
    reconciliationType: 'exclusion-parity' | 'quantity-delta' | 'unbid-scope';
    directionOfRisk: string;
  }
```

### Merge Converter

```typescript
function convertBidReconciliationFinding(finding: BidReconciliationFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'bid-reconciliation',
      contractQuote: finding.contractQuote,
      bidQuote: finding.bidQuote,
      reconciliationType: finding.reconciliationType,
      directionOfRisk: finding.directionOfRisk,
    },
  };
}
```

### UI: FindingCard Dual-Quote Display

Extend FindingCard to render contractQuote and bidQuote for bid-reconciliation findings:

```typescript
{finding.scopeMeta &&
  finding.scopeMeta.passType === 'bid-reconciliation' && (
    <>
      {finding.scopeMeta.contractQuote && (
        <ClauseQuote
          text={finding.scopeMeta.contractQuote}
          reference={finding.clauseReference || ''}
          borderColor="border-slate-300"
          label="Contract Language"
        />
      )}
      {finding.scopeMeta.bidQuote && (
        <ClauseQuote
          text={finding.scopeMeta.bidQuote}
          reference="Bid Document"
          borderColor="border-emerald-300"
          label="Bid Language"
        />
      )}
    </>
  )}
```

Color scheme: Contract = slate (existing default), Bid = emerald (new, distinct from amber used for inferred requirements).

### Prompt Design: Document Attribution

The bid-reconciliation pass prompt MUST use explicit document tagging per Pitfall 2 prevention:

```
You will receive two documents:
- Document 1 (CONTRACT): The glazing subcontract
- Document 2 (BID): The bid/estimate PDF

## CRITICAL: Attribution Rules
- When quoting the contract, place the exact text in the contractQuote field. NEVER put contract text in bidQuote.
- When quoting the bid, place the exact text in the bidQuote field. NEVER put bid text in contractQuote.
- If one document is silent on an item, set that quote field to null.
- NEVER blend quotes from both documents into a single quote string.
```

### Anti-Patterns to Avoid

- **Single "compare everything" pass**: Don't try to do exclusion parity, quantity deltas, AND unbid scope in separate passes. One pass with `reconciliationType` discriminator is correct -- the LLM needs to see both documents simultaneously.
- **Knowledge modules on bid-reconciliation**: Don't attach div08-deliverables or aama-submittal-standards. This pass compares two actual documents, not inferences. Adding modules wastes tokens and invites fabrication.
- **Making clauseText carry attribution**: Don't repurpose existing `clauseText` for dual-document quotes. Use dedicated `contractQuote`/`bidQuote` fields.
- **Running bid-reconciliation without bid**: Don't pass null/empty bid and let the LLM say "no bid provided." Filter the pass out entirely at orchestration time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Document attribution | Custom post-processing to split quotes | Prompt-level `<document index>` tagging + separate schema fields | LLM must attribute at generation time, not post-hoc |
| Dual-quote UI | New quote component | Existing `ClauseQuote` with `borderColor`/`label` props | Already supports customization from Phase 59-02 |
| Pass skipping logic | Custom orchestration for bid passes | `requiresBid` flag + filter in existing Stage 3 block | Follows existing pattern, no new orchestration code |
| Finding deduplication | Custom bid-reconciliation dedup | Existing `mergePassResults` dedup pipeline | clauseReference+category dedup already handles multi-pass overlap |

## Common Pitfalls

### Pitfall 1: Document Attribution Confusion (Pitfall 2 from PITFALLS.md)
**What goes wrong:** The LLM puts contract text in the `bidQuote` field or vice versa. Users negotiate the wrong direction.
**Why it happens:** Without explicit document tagging, the LLM sees two documents as a single context and conflates their content.
**How to avoid:** (1) Use `<document index="1" type="contract">` / `<document index="2" type="bid">` tagging in the user prompt. (2) Require `contractQuote`/`bidQuote` as separate schema fields. (3) Prompt includes explicit "NEVER put contract text in bidQuote" instruction.
**Warning signs:** Finding quotes that appear verbatim in the wrong PDF; users reporting "that's backwards."

### Pitfall 2: Nullable Fields in Structured Outputs
**What goes wrong:** Using `.optional()` instead of `.nullable()` on `contractQuote`/`bidQuote` causes the LLM to omit the field entirely, breaking downstream code that expects the field to exist.
**Why it happens:** Structured outputs requires all fields to be present. `.optional()` means "field may be absent" (wrong). `.nullable()` means "field is always present but may be null" (correct).
**How to avoid:** Use `z.string().nullable()` for both quote fields. Verify with `JSON.stringify` that the schema produces `{"type": ["string", "null"]}` not `{"type": "string"}` with missing-field handling.
**Warning signs:** TypeScript errors about possibly-undefined access on quote fields.

### Pitfall 3: Stage 3 Pass Count Increase Without Budget Check
**What goes wrong:** Adding bid-reconciliation as a third Stage 3 pass pushes total analysis time closer to the 250s global timeout.
**Why it happens:** Each Stage 3 pass is ~15-25s. Three passes in parallel (spec-recon + exclusion-stress-test + bid-recon) still fit within 90s per-pass timeout easily, but adding the bid document increases input tokens.
**How to avoid:** Bid-reconciliation should NOT get prompt cache benefit (bid document is unique per analysis). Monitor wall clock time. The 250s budget has ~100s headroom after Stage 1 (~15s) + Stage 2 (~60s) + current Stage 3 (~25s).
**Warning signs:** Stage 3 elapsed time exceeding 60s in logs.

### Pitfall 4: Running Bid-Reconciliation on Contracts Without Bids
**What goes wrong:** If the pass runs without a bid document, the LLM fabricates bid content or emits empty findings.
**Why it happens:** No gate preventing `requiresBid` passes from running when `bidFileId` is null.
**How to avoid:** `requiresBid: true` flag on the pass definition + filter in Stage 3 orchestration. Log when passes are skipped: `"[analyze] Skipping bid-reconciliation: no bid PDF uploaded"`.
**Warning signs:** Bid-reconciliation findings appearing on contracts that have no bid file.

## Code Examples

### BidReconciliationFindingSchema (verified pattern from existing passes)
```typescript
// Source: follows SpecReconciliationFindingSchema pattern in src/schemas/scopeComplianceAnalysis.ts
export const BidReconciliationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  contractQuote: z.string().nullable(),
  bidQuote: z.string().nullable(),
  reconciliationType: z.enum([
    'exclusion-parity',
    'quantity-delta',
    'unbid-scope',
  ]),
  directionOfRisk: z.string(),
  inferenceBasis: z.literal('contract-quoted'),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const BidReconciliationPassResultSchema = z.object({
  findings: z.array(BidReconciliationFindingSchema),
  dates: z.array(ContractDateSchema),
});
```

### Stage 3 Filter for Bid Passes
```typescript
// Source: extends existing Stage 3 block in api/analyze.ts
const stage3Passes = ANALYSIS_PASSES.filter((p) => p.stage === 3);
const activeStage3Passes = stage3Passes.filter(
  (p) => !p.requiresBid || bidFileId
);

if (activeStage3Passes.length < stage3Passes.length) {
  const skipped = stage3Passes
    .filter((p) => p.requiresBid && !bidFileId)
    .map((p) => p.name);
  console.log(`[analyze] Stage 3: skipping bid-requiring passes (no bid PDF): ${skipped.join(', ')}`);
}
```

### Merge Handler Registration
```typescript
// Source: follows pattern in api/merge.ts passHandlers
'bid-reconciliation': createHandler(BidReconciliationFindingSchema, convertBidReconciliationFinding),
```

### isSpecializedPass Extension
```typescript
// Source: api/merge.ts dedup logic -- add 'bid-reconciliation' to specialized pass list
const isSpecializedPass = (sp: string) =>
  sp.startsWith('legal-') ||
  ['scope-extraction', 'dates-deadlines', 'verbiage-analysis', 'labor-compliance',
   'spec-reconciliation', 'exclusion-stress-test', 'bid-reconciliation'].includes(sp);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-document passes only | `runAnalysisPass` accepts only `fileId` | Phase 58 (2026-04-06) | Bid file uploaded but not passed to any pass |
| All passes run unconditionally | Stage 3 runs all registered passes | Phase 56 (2026-04-05) | No mechanism to skip passes based on document availability |

**What Phase 60 changes:**
- `runAnalysisPass` gains optional `bidFileId` parameter -- first dual-document pass
- `AnalysisPass` gains `requiresBid` flag -- first conditional pass execution
- `UnifiedFinding` gains conceptual `contractQuote`/`bidQuote` via `ScopeMeta` -- first cross-document attribution

## Open Questions

1. **Nullable field support in Anthropic structured outputs**
   - What we know: Zod `.nullable()` produces valid JSON Schema `{"type": ["string", "null"]}`. The Anthropic SDK's `zodToOutputFormat` should handle this correctly.
   - What's unclear: Whether the current SDK version handles nullable in all edge cases with structured outputs. Phase 57 used `.nullable()` pattern for `statedFields` successfully, but `contractQuote`/`bidQuote` are the first nullable string fields in a finding schema.
   - Recommendation: Test with a simple schema during implementation. If `.nullable()` fails, fall back to empty string `""` as the null sentinel (less clean but compatible).

2. **Bid document cache behavior**
   - What we know: The contract PDF uses `cache_control: { type: 'ephemeral' }` for cross-pass caching. The bid PDF should NOT be cached since only one pass uses it.
   - What's unclear: Whether omitting cache_control on the bid document has any negative side effects (e.g., increased latency).
   - Recommendation: Omit `cache_control` on bid document. Monitor first-run latency.

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` -- Stage 3 orchestration, `runAnalysisPass` signature, `bidFileId` variable
- `api/merge.ts` -- merge pipeline, passHandlers pattern, converter functions, `enforceInferenceBasis`
- `api/passes.ts` -- `AnalysisPass` interface, existing Stage 3 pass definitions
- `src/schemas/scopeComplianceAnalysis.ts` -- existing finding schemas (spec-reconciliation, exclusion-stress-test)
- `src/schemas/finding.ts` -- `ScopeMetaSchema` discriminated union, `MergedFindingSchema`
- `src/types/contract.ts` -- `ScopeMeta` type, `Finding` type
- `src/knowledge/registry.ts` -- `PASS_KNOWLEDGE_MAP`
- `src/components/FindingCard.tsx` -- dual-quote rendering pattern for exclusion-stress-test
- `src/components/ClauseQuote.tsx` -- `borderColor`/`label` props
- `.planning/research/PITFALLS.md` -- Pitfall 2 (document attribution confusion) prevention strategy
- `.planning/research/SUMMARY.md` -- Phase 4 (bid reconciliation) architecture recommendations

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- `requiresBidDocument` flag recommendation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns proven in Phase 59
- Architecture: HIGH -- all changes are incremental extensions of proven infrastructure
- Schema design: HIGH -- follows established pass-addition pattern exactly
- Prompt design: MEDIUM -- document attribution is the critical risk; prompt engineering needs careful testing
- Pitfalls: HIGH -- Pitfall 2 (attribution) is well-researched with clear prevention strategy

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependencies changing)
