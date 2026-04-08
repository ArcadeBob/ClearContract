# Phase 56: Architecture Foundation - Research

**Researched:** 2026-04-05
**Domain:** Vercel serverless pipeline orchestration, Zod schema discrimination, token-budget-aware module loading
**Confidence:** HIGH

## Summary

Phase 56 is a pure infrastructure phase: extend the existing two-stage pipeline in `api/analyze.ts` with a third parallel wave, add an `inferenceBasis` discriminator to inference-pass finding schemas (enforced in Zod, policed at merge time), rename the current `scope-of-work` pass to `scope-extraction`, register a new `scope-reconciliation` Stage-3 pass, and raise `MAX_MODULES_PER_PASS` from 4 to 6. No new analysis content ships — every requirement is plumbing that unblocks Phases 57-62.

All patterns required already live in the repo. Stage 2's orchestration (`Promise.allSettled` + per-pass `AbortController` + 90s `setTimeout` + `allControllers` tracking + `finally(clearTimeout)`) is directly cloneable for Stage 3. Zod's `z.discriminatedUnion` is the natural fit for `inferenceBasis`. The token-budget change is a single constant bump with a transitive effect on `validateTokenBudget`. The scope-pass split touches ~14 references across 8 files (registry, schemas, merge, tests, fixtures, UI badges, cost-summary component).

**Primary recommendation:** Mirror Stage 2 exactly for Stage 3 (same timeouts, same patterns, same filtering logic). The user has explicitly chosen cognitive-load minimization over tuning. Land Phase 56 as plumbing that compiles and tests green with zero Stage 3 passes registered — actual Stage 3 passes arrive in Phases 57+.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ARCH-03: Scope pass capacity resolution**
- **Split the scope pass** into two passes: `scope-extraction` (Stage 2) + `scope-reconciliation` (Stage 3).
- **Rename** the existing `scope-of-work` pass to `scope-extraction` (updates tests, fixtures, ANALYSIS_PASSES entry).
- `scope-extraction` runs in Stage 2 alongside clause passes; extracts contract-quoted inclusions, exclusions, quantity signals.
- `scope-reconciliation` runs in Stage 3; consumes extraction output + knowledge modules for inference-grounded findings.
- **Also raise `MAX_MODULES_PER_PASS` from 4 → 6** for per-pass flexibility (belt-and-suspenders with the split).
- Module distribution between the two passes is **Claude's discretion during planning** — determine after token-budget measurement.

**ARCH-02: inferenceBasis discriminator**
- **Enforced in Zod schema** as a required discriminator on inference-pass finding schemas: `'contract-quoted' | 'knowledge-module:{id}' | 'model-prior'`.
- **Merge-time policy for `model-prior`:** **drop entirely** before findings reach the client. Never shipped, no Info-downgrade fallback.
- **Severity ceiling (Medium max) enforced at merge time**, not in the schema. Schema allows any severity; merge clamps inference-basis findings to Medium.
- **Applies only to inference-based passes:** `scope-reconciliation`, `spec-reconciliation`, `exclusion-stress-test`, `bid-reconciliation`. Extraction and clause passes keep their existing schemas untouched.

**ARCH-01: Stage 3 wave orchestration**
- **Pattern mirrors Stage 2:** `Promise.allSettled` + independent `AbortController` per pass + **90s per-pass timeout** (identical to Stage 2, minimizes cognitive load and reuses test patterns).
- **Empty wave handling:** special-cased — when zero Stage 3 passes are registered, log "Stage 3: no passes registered, skipping" and proceed directly to synthesis. `Promise.allSettled([])` is not relied on as the carrier.
- **Runs after Stage 2 settles** (not in parallel with Stage 2) — Stage 3 passes depend on Stage 2 output for grounding.

**Stage 3 failure / Partial policy**
- **Per-pass failure:** any Stage 3 pass failure marks the contract `partial`, same rule as Stage 2 (uniform with v2.2 Phase 55).
- **Entire Stage 3 wave failure with Stage 2 success:** synthesis still runs on Stage 2 output only, contract marked `partial`, results written. Ship what we have.
- No required/optional tagging — all registered passes are treated equally.

**Timeout budget (sub-budgets within the 250s global)**
- **Stage 2 budget:** 150s (wall-clock)
- **Stage 3 budget:** 60s (wall-clock)
- **Stage 1 + synthesis + DB writes:** ~40s remaining
- **Mechanism:** wall-clock check at stage boundaries — record `startTime`, compare `Date.now() - startTime` against the budget, fire the relevant AbortController when the budget is exceeded. No cascading `setTimeout` timers.
- **S2 overrun behavior:** abort Stage 2 in-flight, **still run Stage 3 on partial Stage 2 output**. Stage 3 passes gracefully skip if their required input is missing. Maximizes intel delivered.
- **Global 250s timeout remains** as the final safety net above the per-stage sub-budgets.

### Claude's Discretion
- Module distribution across `scope-extraction` vs `scope-reconciliation` (measured during planning).
- Exact log-line wording and observability hooks.
- Internal organization of the Stage 3 orchestration function (new helper vs. inlined in `api/analyze.ts`).
- Zod schema file layout for new `inferenceBasis` types.

### Deferred Ideas (OUT OF SCOPE)
- Required vs optional Stage 3 pass tagging — not needed for Phase 56; revisit if a Stage 3 pass becomes load-bearing for UI.
- Env-gated `model-prior` visibility for debugging (prod: drop, dev: Info) — defer until a debugging need actually surfaces.
- Anthropic Citations API evaluation for document attribution — flagged for Phase 59 planning (SUMMARY.md Gap 4).
- Per-pass p95 SLO monitoring dashboard — observability work for post-v3.0.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Analysis pipeline adds Stage 3 parallel wave for reconciliation passes (runs after Stage 2 scope extraction completes) | Stage 2 pattern in `api/analyze.ts:496-572` — `Promise.allSettled` + per-pass `AbortController` + 90s `setTimeout` + `allControllers` tracking + `finally(clearTimeout)` + abort-reason filtering (`nonAbortSettled`). Clone this block with `remainingPasses` → `stage3Passes` and add empty-wave guard. Wall-clock sub-budget via `Date.now() - startTime` check before firing Stage 3 controllers. |
| ARCH-02 | Inference-based findings include mandatory `inferenceBasis` schema field citing knowledge module source | Zod `z.discriminatedUnion` or `z.enum([...])` on a required `inferenceBasis` field. Existing Zod schemas in `src/schemas/scopeComplianceAnalysis.ts` use `z.enum` discriminators (e.g. `scopeItemType`, `periodType`) — same pattern. Merge-time policy lives in `api/merge.ts` — filter/drop `model-prior` findings, clamp severity via `severityRank` map (already present at `merge.ts:407-413`). |
| ARCH-03 | Scope-of-work pass knowledge module capacity resolved (pass split OR cap raised) to unblock scope-intel module additions | Both resolution paths applied: constant change in `src/knowledge/tokenBudget.ts:4` (4→6), plus pass split (rename `scope-of-work` → `scope-extraction` in `ANALYSIS_PASSES`, `PASS_KNOWLEDGE_MAP`, `passHandlers`, `isSpecializedPass` list, `src/schemas/finding.ts`, `src/types/contract.ts`, `src/components/ScopeMetaBadge/`, `src/components/CostSummaryBar.tsx`, all test fixtures). Register new `scope-reconciliation` pass with `stage: 3` marker (or `STAGE_3_PASSES` parallel export). |
</phase_requirements>

## Standard Stack

All dependencies already installed. No new libraries required for Phase 56.

### Core (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.25.76 | Schema validation, discriminated unions, runtime parse | Already the validation layer for every pass; `z.discriminatedUnion` is the canonical way to express tagged variants |
| @anthropic-ai/sdk | ^0.78.0 | Claude API client with streaming, AbortSignal | Already drives every pass; unchanged for Phase 56 |
| undici | ^7.22.0 | Custom fetch dispatcher with configurable timeouts | Already integrated; unchanged for Phase 56 |
| @vercel/node | ^5.6.9 | Serverless handler types + runtime | Already the handler signature; unchanged |
| vitest | ^3.2.4 | Test runner (Node + jsdom) | Already the test runner; new Stage 3 tests slot into existing `api/*.test.ts` pattern |

**Platform promitives:**
- `Promise.allSettled(iterable)` — native, already used in `api/analyze.ts:500` for Stage 2
- `AbortController` — native, already used per-pass in Stage 2
- `setTimeout` / `clearTimeout` — native, already used with `finally(clearTimeout)` pattern

**No install step required.** If the planner wants to add an explicit type for the empty-wave case, use `z.never()` or a simple length-check guard — no new dependency needed.

## Architecture Patterns

### Current Project Structure (relevant slices)
```
api/
├── analyze.ts                  # Main handler — Stage 1/2 orchestration lives here
├── passes.ts                   # ANALYSIS_PASSES registry (16 passes, line 36+)
├── merge.ts                    # mergePassResults, passHandlers map, severity guard
├── types.ts                    # PassUsage, PassWithUsage (result: unknown)
├── cost.ts                     # computePassCost
└── *.test.ts                   # analyze.test, merge.test, regression.test
src/
├── knowledge/
│   ├── tokenBudget.ts          # MAX_MODULES_PER_PASS = 4 (line 4), validateTokenBudget
│   ├── registry.ts             # PASS_KNOWLEDGE_MAP, getModulesForPass
│   └── __tests__/tokenBudget.test.ts
├── schemas/
│   ├── analysis.ts             # FindingSchema, PassResultSchema, RiskOverviewResultSchema
│   ├── scopeComplianceAnalysis.ts  # ScopeOfWorkFindingSchema, DatesDeadlinesFindingSchema...
│   ├── legalAnalysis.ts        # 11 clause-pass schemas
│   └── finding.ts              # Unified finding types (includes scopeMeta.passType literal)
├── types/contract.ts           # ScopeMeta discriminated union (passType: 'scope-of-work' | ...)
└── components/
    ├── ScopeMetaBadge/         # ScopeOfWorkBadge.tsx, index.tsx routing map
    └── CostSummaryBar.tsx      # pass-name pretty label map
```

### Pattern 1: Stage 2 Parallel Wave (direct template for Stage 3)
**What:** `Promise.allSettled` over a mapped pass array, each call guarded by its own `AbortController` + 90s `setTimeout`, with a `finally(clearTimeout)` to release timers regardless of outcome. All controllers are pushed onto `allControllers[]` so the global 250s safety timeout can abort them.
**When to use:** Any wave of independent, equal-priority API passes.
**Example (verbatim from `api/analyze.ts:500-512`):**
```typescript
// Source: api/analyze.ts lines 500-512
const settledResults = await Promise.allSettled(
  remainingPasses.map((pass) => {
    const ctrl = new AbortController();
    allControllers.push(ctrl);
    const timeout = setTimeout(() => {
      console.log(`[analyze] Pass "${pass.name}" timed out at 90s`);
      ctrl.abort();
    }, 90_000);

    return runAnalysisPass(client!, fileId!, pass, companyProfile, ctrl.signal)
      .finally(() => clearTimeout(timeout));
  })
);
```

### Pattern 2: Abort-reason filtering post-settle
**What:** After `allSettled`, filter out rejections whose reason is an abort (`AbortError` or message includes `'abort'`) so those passes are dropped silently instead of producing "Analysis Pass Failed" findings.
**When to use:** Always — Stage 3 should use the same filter to keep merge semantics uniform.
**Example (verbatim from `api/analyze.ts:545-556`):**
```typescript
// Source: api/analyze.ts lines 545-556
const nonAbortSettled = allSettled.filter((s, i) => {
  if (s.status === 'rejected') {
    const reason = s.reason;
    const isAbort = reason instanceof Error && (reason.name === 'AbortError' || reason.message?.includes('abort'));
    if (isAbort) {
      const passName = i === 0 ? 'risk-overview' : remainingPasses[i - 1]?.name || 'unknown';
      console.log(`[analyze] Pass "${passName}" dropped (timed out)`);
      return false;
    }
  }
  return true;
});
```

### Pattern 3: Zod discriminator on finding meta
**What:** Pass-specific schemas use `z.enum([...])` on a required metadata field to restrict the allowed values at parse time. The current `ScopeOfWorkFindingSchema.scopeItemType` is the template.
**When to use:** For `inferenceBasis` — use `z.enum(['contract-quoted', 'knowledge-module', 'model-prior'])` OR (for the templated `knowledge-module:{id}` form) use `z.string().refine(...)` with a regex.
**Example (verbatim from `src/schemas/scopeComplianceAnalysis.ts:32-39`):**
```typescript
// Source: src/schemas/scopeComplianceAnalysis.ts
scopeItemType: z.enum([
  'inclusion',
  'exclusion',
  'specification-reference',
  'scope-rule',
  'ambiguity',
  'gap',
]),
```

### Pattern 4: Schema-keyed pass dispatch at merge
**What:** `passHandlers` is a `Record<string, PassHandler>` mapping pass name → schema + converter. Each finding is `safeParse`-d through the schema before being converted to `UnifiedFinding`.
**Where to hook `inferenceBasis` enforcement:** inside the converter (or as a merge-time post-filter), drop `model-prior` findings and clamp severity to Medium for non-`contract-quoted` findings.
**Example (verbatim from `api/merge.ts:429-445`):**
```typescript
// Source: api/merge.ts lines 429-445
const handler = passHandlers[passName];
if (handler) {
  for (const f of result.findings) {
    const parsed = handler.schema.safeParse(f);
    if (parsed.success) {
      allFindings.push(handler.convert(parsed.data as never, passName));
    } else {
      console.error('Malformed finding in pass %s:', passName, parsed.error.issues);
    }
  }
}
```

### Pattern 5: Severity clamp at merge (follow existing `applySeverityGuard` style)
**What:** `api/scoring.ts` exports `applySeverityGuard(finding)` which mutates a finding in-place to upgrade severity for CA void-by-law items. The same inline-mutation pattern is applied at `api/merge.ts:544-546`. The inverse operation (clamp-down to Medium) should live alongside.
**When to use:** After risk-score computation, before `applySeverityGuard`, add an inline loop clamping inference-basis findings to max Medium.

### Anti-Patterns to Avoid
- **Parent-child AbortController hierarchy**: Phase 51 explicitly rejected this. Stage 3 controllers go onto the flat `allControllers[]` array — same as Stage 2.
- **Cascading `setTimeout` for sub-budgets**: User ruled this out. Use `Date.now() - startTime` wall-clock checks at stage boundaries.
- **Relying on `Promise.allSettled([])` as the empty-wave carrier**: User ruled this out. Special-case the empty Stage 3 array with a length check + log line + early return to synthesis.
- **Schema-level severity ceiling**: User chose merge-time clamp. Zod schemas for inference passes still allow any Severity enum value; the clamp is a post-parse mutation.
- **Exporting `model-prior` findings with `Info` downgrade**: User explicitly rejected this. `model-prior` is dropped entirely pre-client.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wave-level cancellation | Custom promise-race timeout class | `Promise.allSettled` + per-pass `AbortController` (existing Stage 2 pattern) | Already tested, already integrates with `allControllers[]` + global 250s safety net |
| Discriminated-union parse | Custom tag-field runtime checks | `z.discriminatedUnion` or `z.enum` required field | Zod generates both TS type + runtime guard; already the project's validation layer |
| Per-pass timeout | Custom Promise.race with timer | `setTimeout` firing `controller.abort()` + `finally(clearTimeout)` | Existing Stage 2 pattern; AbortSignal wiring already built into Anthropic SDK call |
| Stage-boundary wall-clock | Custom sub-budget timer object | `Date.now() - startTime` compared inline, fire existing `allControllers` on overrun | No new state to manage; matches existing `passStart = Date.now()` pattern at `analyze.ts:498` |
| Finding dedupe post-Stage-3 | New dedup logic | Existing two-phase dedup (clauseRef+category, then title) in `api/merge.ts:467-535` | Stage 3 findings flow into `allFindings` and get deduped identically |

**Key insight:** Every primitive Phase 56 needs is already in the codebase and battle-tested by v2.2. The work is structured extension, not greenfield.

## Common Pitfalls

### Pitfall 1: Empty Stage 3 wave silently breaks synthesis path
**What goes wrong:** Calling `Promise.allSettled([])` returns `[]` immediately, but downstream code that iterates "stage 3 results" may still try to log per-pass summaries or merge zero rows, masking the bug.
**Why it happens:** The user explicitly flagged this — zero-registered-passes is the default state for Phase 56 (no Stage 3 passes exist yet until Phase 59).
**How to avoid:** Length-check `stage3Passes.length === 0`, log "Stage 3: no passes registered, skipping", short-circuit to synthesis. Success Criterion #4 requires this to work end-to-end.
**Warning signs:** Any test that runs the pipeline with zero Stage 3 passes must pass. Regression test should assert the log line.

### Pitfall 2: Stage 2 abort leaves in-flight passes holding timers
**What goes wrong:** If the Stage 2 wall-clock budget fires mid-flight, controllers abort, but `setTimeout` handles leak unless `finally(clearTimeout)` was attached.
**Why it happens:** The current Stage 2 code attaches `finally(clearTimeout)` per-pass. Stage 3 must mirror this.
**How to avoid:** Copy the `.finally(() => clearTimeout(timeout))` chain verbatim for every Stage 3 pass invocation.
**Warning signs:** Vitest warns about open handles / unresolved timers after tests.

### Pitfall 3: Stage 2 overrun + Stage 3 running on partial input
**What goes wrong:** User decided Stage 3 still runs on partial Stage 2 output after S2 wall-clock overrun. But Stage 3 passes may assume specific Stage 2 pass outputs exist (e.g., `scope-extraction`). If extraction timed out, `scope-reconciliation` has nothing to reconcile.
**Why it happens:** "Ship what we have" policy, but individual Stage 3 passes need graceful skip-on-missing-input logic.
**How to avoid:** Phase 56 delivers the infrastructure; document a convention that Stage 3 passes must check their Stage 2 dependencies at runtime start and return an empty result (not throw) when missing. This is a planning note for Phase 59/60 pass authors.
**Warning signs:** A Stage 3 pass throws and creates an "Analysis Pass Failed" finding purely because its predecessor timed out.

### Pitfall 4: `isSpecializedPass` list drifts from ANALYSIS_PASSES
**What goes wrong:** `api/merge.ts:468-470` hard-codes `['scope-of-work', 'dates-deadlines', 'verbiage-analysis', 'labor-compliance']` as "specialized" passes for dedup priority. Renaming `scope-of-work` → `scope-extraction` AND adding `scope-reconciliation` requires updating this list.
**Why it happens:** Dedup logic has an out-of-band constant.
**How to avoid:** Grep for `'scope-of-work'` across the whole repo before landing the rename. The grep I ran returned 14 hits across 8 files; every one must be updated or intentionally left.
**Warning signs:** Dedup test in `merge.test.ts` fails or a scope finding is dropped in favor of a generic duplicate.

### Pitfall 5: Token-budget cap constant referenced by test mocks
**What goes wrong:** `api/analyze.test.ts:49` and `api/regression.test.ts:49` both mock `MAX_MODULES_PER_PASS: 5`. Raising the constant to 6 is fine, but test mocks that hard-code 5 may give false positives.
**Why it happens:** Test isolation mocks the constant rather than importing it.
**How to avoid:** Leave test mocks at their hard-coded values if they're testing boundary behavior, OR update them to derive from the real constant. Either is acceptable; document the choice.
**Warning signs:** Tests pass but `validateTokenBudget` behavior at the new boundary isn't exercised.

### Pitfall 6: Zod discriminator on templated string (`knowledge-module:{id}`)
**What goes wrong:** `z.enum(['knowledge-module:ca-title24', 'knowledge-module:div08-scope', ...])` couples the schema to the module registry and requires a schema bump for every new module.
**Why it happens:** The user wants `knowledge-module:{id}` to identify the specific module basis.
**How to avoid:** Model `inferenceBasis` as `z.union([z.literal('contract-quoted'), z.literal('model-prior'), z.string().regex(/^knowledge-module:[a-z0-9-]+$/)])`. This keeps the discriminator strict on the two fixed literals and permits any registered module id via regex, without per-module schema churn.
**Warning signs:** Adding a new knowledge module in Phase 57/58 forces a Phase-56 schema edit.

### Pitfall 7: Tier-1 Anthropic rate limit with added Stage 3 passes
**What goes wrong:** STATE.md Blockers call this out — Anthropic Tier 1 50 RPM cap will 429-storm once Stage 3 adds 4 more passes on top of 16. Phase 56 itself adds zero new API calls (empty Stage 3), so this is pre-Phase-59 infra debt, not Phase-56 blocking.
**Why it happens:** Parallel-wave architecture has no built-in throttle.
**How to avoid:** Phase 56 is safe because Stage 3 runs empty. Flag in VERIFICATION.md that Tier 2 upgrade remains a blocker for v3.0 production ship.
**Warning signs:** N/A for Phase 56.

## Code Examples

### Stage 3 wave skeleton (template for planner)
```typescript
// Source: composed from api/analyze.ts:496-572 patterns
// --- STAGE 3: Reconciliation wave ---
const stage3Passes = STAGE_3_PASSES; // or ANALYSIS_PASSES.filter(p => p.stage === 3)

if (stage3Passes.length === 0) {
  console.log('[analyze] Stage 3: no passes registered, skipping');
} else {
  // Wall-clock sub-budget check: if Stage 2 overran the 150s budget, still
  // run Stage 3 but against the remaining global budget.
  const stage3Start = Date.now();
  console.log(`[analyze] Stage 3: running ${stage3Passes.length} reconciliation passes...`);

  const stage3Settled = await Promise.allSettled(
    stage3Passes.map((pass) => {
      const ctrl = new AbortController();
      allControllers.push(ctrl);
      const timeout = setTimeout(() => {
        console.log(`[analyze] Stage 3 pass "${pass.name}" timed out at 90s`);
        ctrl.abort();
      }, 90_000);

      return runAnalysisPass(client!, fileId!, pass, companyProfile, ctrl.signal)
        .finally(() => clearTimeout(timeout));
    })
  );

  // Record usage, filter abort rejections, merge into allSettled array
  // (same pattern as Stage 2: record usage for fulfilled, drop abort rejections)
  console.log(
    `[analyze] Stage 3 done in ${((Date.now() - stage3Start) / 1000).toFixed(1)}s`
  );
}
```

### inferenceBasis schema field
```typescript
// Source: composed from src/schemas/scopeComplianceAnalysis.ts patterns
export const InferenceBasisSchema = z.union([
  z.literal('contract-quoted'),
  z.literal('model-prior'),
  z.string().regex(/^knowledge-module:[a-z0-9-]+$/, {
    message: 'knowledge-module basis must be formatted as "knowledge-module:{id}"',
  }),
]);

// Applied to inference-pass finding schemas
export const ScopeReconciliationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  inferenceBasis: InferenceBasisSchema, // ← REQUIRED discriminator
  // ...pass-specific metadata...
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});
```

### Merge-time enforcement (drop + clamp)
```typescript
// Source: composed from api/merge.ts:540-546 pattern
const severityRank: Record<Severity, number> = {
  Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1,
};
const MAX_INFERENCE_SEVERITY: Severity = 'Medium';

function enforceInferenceBasis(findings: UnifiedFinding[]): UnifiedFinding[] {
  const kept: UnifiedFinding[] = [];
  for (const f of findings) {
    const basis = (f as UnifiedFinding & { inferenceBasis?: string }).inferenceBasis;
    if (basis === 'model-prior') continue; // drop entirely
    if (basis && basis !== 'contract-quoted') {
      // knowledge-module:* → clamp to Medium
      if (severityRank[f.severity] > severityRank[MAX_INFERENCE_SEVERITY]) {
        f.downgradedFrom = f.severity;
        f.severity = MAX_INFERENCE_SEVERITY;
      }
    }
    kept.push(f);
  }
  return kept;
}
```

### Empty-wave guard test (vitest pattern)
```typescript
// Source: composed from api/analyze.test.ts patterns
it('completes full pipeline with zero Stage 3 passes registered', async () => {
  vi.mock('../api/passes', () => ({
    ANALYSIS_PASSES: [/* only stage 1 + 2 */],
    STAGE_3_PASSES: [],
  }));
  const result = await runHandler(mockReq, mockRes);
  expect(result.status).toBe(200);
  expect(logSpy).toHaveBeenCalledWith('[analyze] Stage 3: no passes registered, skipping');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single AbortController per pipeline | Independent AbortControllers per pass | Phase 51 (v2.2) | Stage 3 MUST follow this — no parent-child hierarchy |
| Timeout findings shown as "Analysis Pass Failed" | Abort rejections filtered out silently via `nonAbortSettled` | v2.2 | Stage 3 must reuse the same abort-reason filter |
| `result: PassResult` typed strictly | `result: unknown` on `PassWithUsage` | v2.2 | Avoids circular imports; inferenceBasis findings fit naturally |
| `contracts.status = 'Reviewed'` only | `'Reviewed'` + `'Partial'` statuses | Phase 55 (v2.2) | Stage 3 failures mark contract Partial — consistent |

**Deprecated/outdated:**
- Two-stage pipeline (primer + parallel wave) — extended to three-stage in Phase 56.
- `scope-of-work` pass name — renamed to `scope-extraction` in Phase 56. All 14 references across 8 files must update.

## Open Questions

1. **Where should the inference-basis enforcement live in merge ordering?**
   - What we know: Must run before `applySeverityGuard` (else CA void-by-law upgrade could re-exceed Medium for inference findings) and before risk-score compute (so dropped `model-prior` findings don't inflate score).
   - What's unclear: Whether to drop-then-clamp as two separate passes or combine into one loop.
   - Recommendation: Single loop at the start of `mergePassResults` post-dedup, pre-scoring. Plan this placement explicitly.

2. **Should `STAGE_3_PASSES` be a new export or an annotated `stage` field on `AnalysisPass`?**
   - What we know: User said "Claude's discretion, internal organization."
   - What's unclear: Annotation is less duplicative; separate export is more explicit.
   - Recommendation: Add `stage?: 2 | 3` to `AnalysisPass` interface (default 2), filter in `analyze.ts` via `ANALYSIS_PASSES.filter(p => p.stage === 3)`. Keeps one registry, one source of truth.

3. **Module distribution between `scope-extraction` and `scope-reconciliation`?**
   - What we know: Current `scope-of-work` loads 4 modules (ca-title24, div08-scope, standards-validation, contract-forms). User said "measure during planning."
   - What's unclear: Which modules ground extraction vs reconciliation.
   - Recommendation: Extraction = `contract-forms` (parsing hints) + maybe `div08-scope` (section id awareness). Reconciliation = `ca-title24`, `standards-validation`, plus the two new v3.0 modules (AAMA submittals, Div 08 deliverables) arriving in Phase 58. Revisit when token counts are measurable — the cap raise to 6 gives headroom either way.

4. **Does `validateTokenBudget` need to change when cap goes 4→6?**
   - What we know: Single constant, transitively propagated.
   - What's unclear: Whether any module content currently fails at the 4-module boundary (would become passing with 6).
   - Recommendation: Run `validateAllModulesRegistered()` after the constant bump; if any pass suddenly validates that didn't before, investigate before shipping.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.2.4 (Node env for api/*, jsdom for src/*) |
| Config file | `vitest.config.ts` (implied by `vitest run` + package.json) |
| Quick run command | `npx vitest run api/analyze.test.ts api/merge.test.ts src/knowledge/__tests__/tokenBudget.test.ts` |
| Full suite command | `npm test` (runs `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Stage 3 wave orchestrated with `Promise.allSettled` + per-pass AbortController + 90s timeout | unit | `npx vitest run api/analyze.test.ts -t "Stage 3"` | ❌ Wave 0 (new describe block) |
| ARCH-01 | Empty Stage 3 wave completes pipeline and writes results | unit | `npx vitest run api/analyze.test.ts -t "zero Stage 3 passes"` | ❌ Wave 0 |
| ARCH-01 | Stage 3 pass failure marks contract Partial | unit | `npx vitest run api/analyze.test.ts -t "Stage 3 failure marks Partial"` | ❌ Wave 0 |
| ARCH-01 | Total runtime under 250s on representative contract | integration | `npx vitest run api/regression.test.ts -t "pipeline runtime"` | ✅ (extend existing) |
| ARCH-01 | Stage 2 wall-clock overrun still runs Stage 3 | unit | `npx vitest run api/analyze.test.ts -t "S2 overrun"` | ❌ Wave 0 |
| ARCH-02 | `inferenceBasis` required on inference-pass schemas, Zod rejects missing field | unit | `npx vitest run src/schemas -t "inferenceBasis"` | ❌ Wave 0 (new file or extend scopeCompliance test) |
| ARCH-02 | Merge drops `model-prior` findings before client | unit | `npx vitest run api/merge.test.ts -t "drops model-prior"` | ❌ Wave 0 |
| ARCH-02 | Merge clamps `knowledge-module:*` findings to Medium max | unit | `npx vitest run api/merge.test.ts -t "clamps inference severity"` | ❌ Wave 0 |
| ARCH-03 | `MAX_MODULES_PER_PASS` raised to 6, validateTokenBudget enforces new boundary | unit | `npx vitest run src/knowledge/__tests__/tokenBudget.test.ts` | ✅ (update constant in test) |
| ARCH-03 | `scope-of-work` renamed to `scope-extraction` across registry/schemas/merge/fixtures | unit | `npx vitest run api/merge.test.ts -t "scope-extraction"` | ❌ Wave 0 (rename existing) |
| ARCH-03 | New `scope-reconciliation` pass registered with stage-3 marker | unit | `npx vitest run api/passes.test.ts -t "scope-reconciliation"` | ❌ Wave 0 (or inline in analyze.test) |

### Sampling Rate
- **Per task commit:** `npx vitest run <affected-file>.test.ts` (< 5s per focused file)
- **Per wave merge:** `npm test` (full suite; coverage not required for Phase 56 but welcome)
- **Phase gate:** Full suite green before `/gsd:verify-work`; `npm run lint` also green; `npm run build` succeeds

### Wave 0 Gaps
- [ ] `api/analyze.test.ts` — add `describe('Stage 3')` block covering orchestration, empty wave, partial-on-failure, S2-overrun-still-runs-S3
- [ ] `api/merge.test.ts` — add `describe('inferenceBasis enforcement')` block covering drop + clamp
- [ ] `src/schemas/scopeComplianceAnalysis.test.ts` (new) OR extend existing schema tests — cover `InferenceBasisSchema` union + regex
- [ ] Rename test fixtures in `api/test-fixtures/pass-responses.ts` — `scope-of-work` → `scope-extraction`
- [ ] Update `api/analyze.test.ts:49` and `api/regression.test.ts:49` `MAX_MODULES_PER_PASS: 5` mock values (decide: track real constant or pin at boundary)
- [ ] Update `src/knowledge/__tests__/tokenBudget.test.ts` expected message "max is 4" → "max is 6"
- [ ] Update `src/knowledge/__tests__/registry.test.ts:30` — test references `scope-of-work` pass name

*No new framework install needed — vitest ^3.2.4 already configured.*

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` (lines 431-572) — full Stage 1/2 orchestration, Promise.allSettled + AbortController + 90s timeout + allControllers[] + global 250s safety timeout
- `api/merge.ts` (full file) — passHandlers dispatch, severity rank map, two-phase dedup, `applySeverityGuard` in-place mutation pattern
- `api/passes.ts` (lines 26-34 + 36+) — `AnalysisPass` interface, `ANALYSIS_PASSES` array layout
- `src/knowledge/tokenBudget.ts` (full file) — `MAX_MODULES_PER_PASS = 4`, `validateTokenBudget` single-function gate
- `src/knowledge/registry.ts` (full file) — `PASS_KNOWLEDGE_MAP`, `getModulesForPass`, `validateAllModulesRegistered`
- `src/schemas/scopeComplianceAnalysis.ts` (full file) — existing `z.enum` discriminator pattern on pass-specific metadata
- `src/schemas/analysis.ts` (full file) — base `FindingSchema`, `PassResultSchema`, `RiskOverviewResultSchema`
- `package.json` — verified dependency versions: zod ^3.25.76, vitest ^3.2.4, @anthropic-ai/sdk ^0.78.0
- `.planning/phases/56-architecture-foundation/56-CONTEXT.md` — user decisions (verbatim in User Constraints section)
- `.planning/REQUIREMENTS.md` — ARCH-01/02/03 requirement wording
- `.planning/STATE.md` — project state, v2.2 decisions carried forward, Phase 51/55 constraints

### Secondary (MEDIUM confidence)
- Grep sweep across repo for `scope-of-work` (14 hits, 8 files) — rename blast radius confirmed
- Grep sweep for `MAX_MODULES_PER_PASS` — 6 hits, all accounted for

### Tertiary (LOW confidence)
- None. All findings derived from codebase inspection — no external library API guesswork required.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed, verified in package.json
- Architecture: HIGH — every pattern Phase 56 needs is already in the codebase (Stage 2 wave, Zod discriminator, severity guard, token budget)
- Pitfalls: HIGH — derived from direct code inspection and explicit user decisions in CONTEXT.md

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days — codebase-internal research, minimal external-library dependency)
