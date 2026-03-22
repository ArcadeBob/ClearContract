---
phase: 51-analysis-pipeline-parallelization-and-token-capture
verified: 2026-03-21T21:30:00Z
status: passed
score: 17/17 must-haves verified
gaps: []
human_verification:
  - test: "Run a live analysis and confirm analysis_usage rows are written"
    expected: "DB table analysis_usage contains one row per pass plus one synthesis row after analysis completes"
    why_human: "Cannot execute live Anthropic API call or inspect Supabase in automated verification"
  - test: "Run a live analysis that exceeds 250s and confirm contract is saved with status Partial"
    expected: "Contract record has status='Partial', synthesis skipped, in-flight passes aborted, partial findings saved"
    why_human: "Requires real timeout scenario with Anthropic API"
  - test: "Verify prompt cache hit on Stage 2 passes"
    expected: "Server logs show cache_read > 0 for at least most Stage 2 passes (cache created by primer pass)"
    why_human: "Requires live Anthropic API calls with a real PDF to confirm cache_creation_input_tokens on primer and cache_read_input_tokens on subsequent passes"
---

# Phase 51: Analysis Pipeline Parallelization and Token Capture — Verification Report

**Phase Goal:** Restructure the 16-pass analysis pipeline to use prompt caching (primer + parallel), add per-pass timeouts, global safety timeout with progressive saves, and capture token usage to analysis_usage table.
**Verified:** 2026-03-21T21:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | analysis_usage table exists in Supabase with correct columns and RLS | VERIFIED | `supabase/migrations/20260322_add_analysis_usage.sql` creates table with all 12 columns, 3 indexes, RLS enabled, 3 policies |
| 2  | Partial is a valid contract status value in the DB CHECK constraint | VERIFIED | Migration line: `CHECK (status IN ('Analyzing', 'Reviewed', 'Draft', 'Partial'))` |
| 3  | PassUsage interface defines all four token fields plus cost and duration | VERIFIED | `api/types.ts` exports `PassUsage` with inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens; `PassWithUsage` adds cost and durationMs |
| 4  | computePassCost function correctly calculates cost from token counts using locked pricing constants | VERIFIED | `api/cost.ts` formula: `(input * 3.00 + output * 15.00 + cacheWrite * 3.75 + cacheRead * 0.30) / 1_000_000` |
| 5  | PRICING constants match locked values from CONTEXT.md | VERIFIED | inputPerMillion: 3.00, outputPerMillion: 15.00, cacheWritePerMillion: 3.75, cacheReadPerMillion: 0.30 with `as const` |
| 6  | Primer pass (risk-overview) runs first and alone before any other passes | VERIFIED | `api/analyze.ts` lines 443–464: `ANALYSIS_PASSES.find(p => p.name === 'risk-overview')` awaited alone in Stage 1 |
| 7  | If primer fails, entire analysis aborts immediately with no further API calls | VERIFIED | Lines 456–461: catch block throws `Analysis aborted: primer pass failed (...)`, propagating out of the two-stage try block |
| 8  | Remaining 15 passes fire concurrently after primer completes | VERIFIED | Lines 487–499: `Promise.allSettled(remainingPasses.map(...))` — all 15 remaining passes launched in parallel |
| 9  | Each pass has its own AbortController with ~90s timeout | VERIFIED | 4 `new AbortController()` calls (global + primer + per-pass inside map + synthesis); `setTimeout(() => ctrl.abort(), 90_000)` per parallel pass; primer and synthesis each get their own 90s timeout |
| 10 | Global 250s timeout aborts all in-flight passes | VERIFIED | Lines 432–438: `setTimeout(() => { allControllers.forEach(c => c.abort()) }, 250_000)` |
| 11 | Normal path: all passes settle, merge, synthesis, bulk-write with status Reviewed | VERIFIED | Line 601: `const contractStatus = isGlobalTimeout ? 'Partial' : 'Reviewed'`; synthesis runs when `!isGlobalTimeout` |
| 12 | Timeout path: abort in-flight, merge completed, skip synthesis, write with status Partial | VERIFIED | `isGlobalTimeout = true` set in global timeout callback; synthesis block gated on `!isGlobalTimeout`; `contractStatus = 'Partial'` |
| 13 | Streaming events capture input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens per pass | VERIFIED | Lines 149–161 (runAnalysisPass) and 234–245 (runSynthesisPass): `message_start` and `message_delta` events captured with defensive `?? 0` |
| 14 | analysis_usage rows written to DB with per-pass token counts, computed cost, and duration | VERIFIED | Lines 727–745: `supabaseAdmin.from('analysis_usage').insert(usagePayloads)` with run_id, contract_id, user_id, all token fields, cost_usd, duration_ms |
| 15 | Synthesis pass gets its own usage row with pass_name='synthesis' | VERIFIED | Lines 590–598: `usageRows.push({ pass_name: 'synthesis', ... })` — even when synthesis is skipped (zeros) |
| 16 | run_id UUID groups all passes from the same analysis run | VERIFIED | Line 418: `const runId = randomUUID()` from `crypto`; spread into each usage payload at line 731 |
| 17 | Timed-out passes are dropped silently (logged but no finding created) | VERIFIED | Lines 531–542: abort errors filtered out of `allSettled` before `mergePassResults`; `console.log` only, no finding created |

**Score:** 17/17 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260322_add_analysis_usage.sql` | analysis_usage table, Partial status, RLS policies, indexes | VERIFIED | All 12 columns present, 3 CREATE INDEX, ENABLE ROW LEVEL SECURITY, 3 CREATE POLICY, GRANT ALL to service_role |
| `api/types.ts` | PassUsage interface, PassWithUsage result type, PRICING constants | VERIFIED | All 3 exports present: PassUsage (4 fields), PassWithUsage (4 fields), PRICING (4 constants with `as const`) |
| `api/cost.ts` | computePassCost pure function importing PassUsage and PRICING | VERIFIED | Function exported, imports `PassUsage` type and `PRICING` value from `./types`, divides by `1_000_000` |
| `api/analyze.ts` | Restructured two-stage pipeline with usage capture | VERIFIED | 784 lines (above 400 min), contains `crypto.randomUUID` import and all required pipeline patterns |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api/cost.ts` | `api/types.ts` | `import type { PassUsage } from './types'` and `import { PRICING } from './types'` | WIRED | Line 1–2 of cost.ts: both imports present and used in formula |
| `api/analyze.ts` | `api/types.ts` | `import type { PassUsage, PassWithUsage } from './types'` | WIRED | Line 7 of analyze.ts; PassUsage used in usage tracker initialization; PassWithUsage used as return type of runAnalysisPass |
| `api/analyze.ts` | `api/cost.ts` | `import { computePassCost } from './cost'` | WIRED | Line 8 of analyze.ts; `computePassCost(...)` called for primer, each parallel pass, and synthesis row |
| `api/analyze.ts` | `supabase analysis_usage table` | `supabaseAdmin.from('analysis_usage').insert()` | WIRED | Lines 735–737: bulk insert; line 646: delete on re-analyze path |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-01 | 51-02 | Two-stage cache pipeline: primer pass first, then 15 passes in parallel with cache hits | SATISFIED | `ANALYSIS_PASSES.find(p => p.name === 'risk-overview')` awaited alone; `Promise.allSettled(remainingPasses.map(...))` for Stage 2 |
| PERF-02 | 51-02 | Each pass has individual AbortController timeout (~90s) | SATISFIED | `setTimeout(() => ctrl.abort(), 90_000)` per parallel pass; separate timers for primer and synthesis |
| PERF-03 | 51-02 | Completed pass results progressively saved to DB, surviving function timeout | SATISFIED | Global 250s timeout sets `isGlobalTimeout`, merges completed passes, writes with `status: 'Partial'` |
| COST-01 | 51-01, 51-02 | Streaming event loop captures input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens per pass | SATISFIED | `message_start` and `message_delta` event handlers in both `runAnalysisPass` and `runSynthesisPass` |
| COST-02 | 51-01, 51-02 | Server computes per-pass and total cost using pricing constants, writes to analysis_usage table | SATISFIED | `computePassCost(usage)` called per pass; bulk insert to `analysis_usage` with cost_usd per row; total logged |

No orphaned requirements. REQUIREMENTS.md maps PERF-01, PERF-02, PERF-03, COST-01, COST-02 to Phase 51 — all five are claimed and satisfied by the two plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `api/analyze.ts` | 33 | `AnalysisPassInfo` imported but never used (`TS6196`) | Info | Pre-existing from before phase 51; type import only, no runtime impact |
| `api/analyze.ts` | 677–682, 749 | `crossReferences`, `legalMeta`, `scopeMeta`, `sourcePass`, `isSynthesis` properties not on narrowed type; spread type error (`TS2339`, `TS2698`) | Warning | Pre-existing TypeScript errors from before phase 51 (confirmed by git history — identical errors in HEAD~2). Phase 51 did not introduce them. No runtime impact as fields are accessed via `mapToSnake` at runtime on the broader merge result type. |

**Pre-existing TS error confirmation:** `git show HEAD~2:api/analyze.ts` (the commit before phase 51 touched analyze.ts) contains the same lines (478–483 in that version) with identical property access patterns. Phase 51-02 did not introduce these errors.

**Build:** `npm run build` passes (Vite, frontend only). The TypeScript errors are in API files not processed by Vite.

---

### Human Verification Required

#### 1. Live analysis_usage DB write

**Test:** Upload a PDF contract and trigger analysis. After completion, query the Supabase `analysis_usage` table.
**Expected:** One row per analysis pass (up to 16 passes) plus one `synthesis` row, all sharing the same `run_id`. Each row has non-zero `input_tokens` and `output_tokens`. At least the primer pass row should show non-zero `cache_creation_tokens`.
**Why human:** Cannot execute live Anthropic API calls or inspect Supabase data in automated verification.

#### 2. Partial status on timeout path

**Test:** Simulate a global timeout (e.g., temporarily set `250_000` to `5_000` in a dev environment) and trigger analysis.
**Expected:** Contract written with `status='Partial'`, synthesis pass skipped (logged as "Synthesis pass skipped (global timeout path)"), findings from completed passes present, timed-out passes absent with no "Analysis Pass Failed" findings.
**Why human:** Requires live API calls and DB inspection.

#### 3. Cache hit rate empirical validation

**Test:** Run two analyses with the same PDF. On the second run, check server logs for `cache_read` values in Stage 2 passes.
**Expected:** Stage 2 passes show `cache_read_input_tokens > 0` (Anthropic ephemeral cache hit from the primer pass in the same run, or prior-run cache if within 5-minute TTL).
**Why human:** Anthropic cache behavior is observable only via live API responses.

---

### Gaps Summary

No gaps. All 17 observable truths are verified against the actual code. All 5 requirements (PERF-01 through PERF-03, COST-01 through COST-02) are satisfied by substantive implementation — not stubs or placeholders.

The two TypeScript errors flagged (`TS6196` unused import, `TS2339`/`TS2698` pre-existing property access issues) predate this phase and are not regressions introduced by phase 51. They do not block the goal or prevent runtime execution.

---

_Verified: 2026-03-21T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
