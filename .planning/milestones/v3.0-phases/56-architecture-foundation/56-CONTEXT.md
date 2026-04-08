# Phase 56: Architecture Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the v3.0 pipeline infrastructure: a Stage 3 parallel wave after Stage 2, an `inferenceBasis` discriminator on inference-pass Zod schemas with merge-time containment, and resolution of the scope-of-work pass module-capacity constraint. No new analysis content — this phase unblocks Phases 57-62. Empty Stage 3 wave must still complete a full run.

</domain>

<decisions>
## Implementation Decisions

### ARCH-03: Scope pass capacity resolution
- **Split the scope pass** into two passes: `scope-extraction` (Stage 2) + `scope-reconciliation` (Stage 3).
- **Rename** the existing `scope-of-work` pass to `scope-extraction` (updates tests, fixtures, ANALYSIS_PASSES entry).
- `scope-extraction` runs in Stage 2 alongside clause passes; extracts contract-quoted inclusions, exclusions, quantity signals.
- `scope-reconciliation` runs in Stage 3; consumes extraction output + knowledge modules for inference-grounded findings.
- **Also raise `MAX_MODULES_PER_PASS` from 4 → 6** for per-pass flexibility (belt-and-suspenders with the split).
- Module distribution between the two passes is **Claude's discretion during planning** — determine after token-budget measurement.

### ARCH-02: inferenceBasis discriminator
- **Enforced in Zod schema** as a required discriminator on inference-pass finding schemas: `'contract-quoted' | 'knowledge-module:{id}' | 'model-prior'`.
- **Merge-time policy for `model-prior`:** **drop entirely** before findings reach the client. Never shipped, no Info-downgrade fallback.
- **Severity ceiling (Medium max) enforced at merge time**, not in the schema. Schema allows any severity; merge clamps inference-basis findings to Medium.
- **Applies only to inference-based passes:** `scope-reconciliation`, `spec-reconciliation`, `exclusion-stress-test`, `bid-reconciliation`. Extraction and clause passes keep their existing schemas untouched.

### ARCH-01: Stage 3 wave orchestration
- **Pattern mirrors Stage 2:** `Promise.allSettled` + independent `AbortController` per pass + **90s per-pass timeout** (identical to Stage 2, minimizes cognitive load and reuses test patterns).
- **Empty wave handling:** special-cased — when zero Stage 3 passes are registered, log "Stage 3: no passes registered, skipping" and proceed directly to synthesis. `Promise.allSettled([])` is not relied on as the carrier.
- **Runs after Stage 2 settles** (not in parallel with Stage 2) — Stage 3 passes depend on Stage 2 output for grounding.

### Stage 3 failure / Partial policy
- **Per-pass failure:** any Stage 3 pass failure marks the contract `partial`, same rule as Stage 2 (uniform with v2.2 Phase 55).
- **Entire Stage 3 wave failure with Stage 2 success:** synthesis still runs on Stage 2 output only, contract marked `partial`, results written. Ship what we have.
- No required/optional tagging — all registered passes are treated equally.

### Timeout budget (sub-budgets within the 250s global)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` §Phase 56 — goal, success criteria (4 criteria), ARCH-01/02/03 requirements
- `.planning/REQUIREMENTS.md` §ARCH — requirement wording for ARCH-01, ARCH-02, ARCH-03

### Research (v3.0 milestone)
- `.planning/research/SUMMARY.md` — Stage 3 pattern rationale, timeline math (S1+S2+S3+synth+DB ≈ 90-105s)
- `.planning/research/ARCHITECTURE.md` — three-stage pipeline extension, Stage 3 wave pattern mirroring Stage 2
- `.planning/research/PITFALLS.md` §Pitfall 1 — fabricated spec requirements, `inferenceBasis` as "never acceptable" shortcut
- `.planning/research/PITFALLS.md` §Pitfall 3 — pipeline timeout breach, Stage 3 as separate wave (Phase 56 item)
- `.planning/research/PITFALLS.md` §Pitfall 10 — knowledge module bloat, token budget discipline
- `.planning/research/FEATURES.md` §Scope pass constraint — current 4-module capacity, split vs raise analysis

### Existing pipeline (v2.2 patterns to mirror)
- `api/analyze.ts` §Two-stage cache pipeline (lines ~431-571) — globalController pattern, Stage 1/2 orchestration, `Promise.allSettled` + per-pass AbortController + 90s setTimeout + 250s global safety timeout
- `api/passes.ts` — `ANALYSIS_PASSES` registry pattern, knowledge module loading per pass
- `src/knowledge/tokenBudget.ts` — `MAX_MODULES_PER_PASS` constant (currently 4), `TOKEN_CAP_PER_MODULE`, `validateTokenBudget`
- `src/schemas/analysis.ts` — existing `PassResultSchema` pattern, finding schemas
- `api/merge.ts` — current merge pipeline (where severity clamp + model-prior drop will be added)
- `api/types.ts` — shared API types, `PassWithUsage` shape

### Prior-milestone decisions (carry forward)
- Phase 51 decision: independent AbortControllers per pass (not parent-child hierarchy) — `.planning/milestones/v2.2-phases/51-*/`
- Phase 55 decision: partial contracts treated as first-class data — `.planning/milestones/v2.2-phases/55-*/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/analyze.ts` Stage 2 wave pattern: `Promise.allSettled` over `remainingPasses.map` with `AbortController`, `setTimeout(90s)`, `finally(clearTimeout)` — directly cloneable for Stage 3.
- `globalController` + 250s safety timeout already in place — Stage 3 sub-budget layers on top.
- `allSettled` aggregation + `nonAbortSettled` filtering pattern — reuse for Stage 3 result merging.
- `ANALYSIS_PASSES` registry — Stage 3 passes register here with a `stage: 3` marker (or a parallel `STAGE_3_PASSES` export).
- `src/knowledge/tokenBudget.ts` — single constant change unlocks capacity raise; `validateTokenBudget` callers update automatically.
- `PassWithUsage.result typed as unknown` (v2.2 decision) — avoids circular imports, extends naturally to inference-basis findings.

### Established Patterns
- Two-client Supabase pattern (anon + service_role) — no change for Phase 56 (no DB schema work this phase).
- Zod schemas with `z.discriminatedUnion` — natural fit for `inferenceBasis` discriminator.
- Per-pass result typed with explicit Zod schema + runtime `safeParse` at merge boundary — extend for inference-basis enforcement.
- 280s SDK timeout as last-resort, 90s AbortController as working timeout, 250s globalController as pipeline guard — three-tier timeout model preserved.

### Integration Points
- `api/analyze.ts` handler — Stage 3 orchestration inserted after Stage 2 `passStart` summary and before synthesis.
- `api/passes.ts` — `scope-of-work` → `scope-extraction` rename; new `scope-reconciliation` registered with stage-3 marker.
- `api/merge.ts` — new merge steps: drop `model-prior` findings, clamp inference-basis severity to Medium.
- `src/schemas/analysis.ts` / `src/schemas/scopeComplianceAnalysis.ts` — inference-pass finding schemas gain required `inferenceBasis` discriminator.
- `src/knowledge/tokenBudget.ts` — constant bump from 4 to 6.
- Tests: `api/analyze.test.ts`, `api/regression.test.ts`, `api/merge.test.ts`, `src/knowledge/__tests__/tokenBudget.test.ts` all reference the current constants and need updates.

</code_context>

<specifics>
## Specific Ideas

- "Mirror Stage 2 exactly" for Stage 3 per-pass timeout (90s) — the user explicitly prefers cognitive-load minimization over tuning.
- Severity clamp at merge time, not in schema — trade schema rigor for schema evolvability. Pair with strict schema-level `inferenceBasis` enforcement.
- Wall-clock sub-budgets over timer-based cascading — aligns with the existing `Date.now() - startTime` logging pattern in `api/analyze.ts`.

</specifics>

<deferred>
## Deferred Ideas

- Required vs optional Stage 3 pass tagging — not needed for Phase 56; revisit if a Stage 3 pass becomes load-bearing for UI.
- Env-gated `model-prior` visibility for debugging (prod: drop, dev: Info) — defer until a debugging need actually surfaces.
- Anthropic Citations API evaluation for document attribution — flagged for Phase 59 planning (SUMMARY.md Gap 4).
- Per-pass p95 SLO monitoring dashboard — observability work for post-v3.0.

</deferred>

---

*Phase: 56-architecture-foundation*
*Context gathered: 2026-04-05*
