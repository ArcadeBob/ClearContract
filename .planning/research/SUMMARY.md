# Project Research Summary

**Project:** ClearContract v3.0 — Scope Intelligence Milestone
**Domain:** Multi-document AI contract analysis for glazing subcontractors (contract PDF + bid/estimate PDF)
**Researched:** 2026-04-05
**Confidence:** HIGH (grounded in codebase inspection + validated v2.2 pipeline; MEDIUM-HIGH on glazing domain specifics)

---

## Executive Summary

ClearContract v3.0 adds estimator-grade scope intelligence to a 17-pass AI contract analysis pipeline that is already in production. The milestone introduces two structural changes: (1) a second optional PDF input (the user's bid/estimate) that enables cross-document reconciliation, and (2) three new analysis stages covering submittal tracking, spec-cite reconciliation, and bid-vs-contract comparison. Research confirms that zero new npm dependencies are required — all new capability is delivered through Zod schema additions, new analysis passes following existing patterns, and database schema expansions. This is a disciplined extension of an already-validated architecture, not a rewrite.

The recommended approach is a phased, dependency-ordered rollout: multi-document upload infrastructure first, then new contract-only extraction passes (submittal register, quantity signals), then the Stage 3 reconciliation wave (spec-reconciliation, exclusion stress-test), and finally bid-reconciliation as the capstone feature that requires all prior phases to be stable. The biggest risks are LLM hallucination in inference-grounded passes (fabricated spec requirements, document attribution confusion) and pipeline performance (adding 3-5 passes to an already 20-request burst on Anthropic Tier 1). Both are preventable through schema-enforced grounding constraints and an Anthropic tier upgrade.

Cross-contract scope trends (portfolio-level insights) are achievable with v2.2's existing pattern detection infrastructure, but are limited by the current out-of-scope decision on outcome tracking. The single highest-value unlock for future milestones would be reversing the "no negotiation outcome tracking" decision — it is the prerequisite for exclusion outcome history, the feature research identifies as the strongest sole-user differentiator with no competitive equivalent. This decision should be surfaced to the user during requirements.

---

## Key Findings

### Recommended Stack

No new packages. The entire v3.0 feature set is delivered through pipeline and schema changes to the existing stack. See [STACK.md](.planning/research/STACK.md) for full detail.

**Core technologies (unchanged):**
- **react-dropzone 14.2.3** — add `role` prop, render two instances; no upgrade needed
- **@anthropic-ai/sdk 0.78.0** — Files API already supports multiple `document` blocks; pin until a reconciliation-specific API feature ships
- **@supabase/supabase-js 2.99.2** — three new tables + two new columns on `contracts`; no new clients
- **zod 3.25.76** — three new pass result schemas following existing `PassResultSchema` pattern
- **unpdf 1.4.0** — existing Files-API-first / unpdf-fallback applies identically to bid PDF

**Key stack decisions:**
- Two separate `useDropzone` instances (role-labeled) rather than one `multiple: true` dropzone — cleaner UX, no post-drop role assignment UI
- Reconciliation findings surface as `findings` rows with new category values; structured data (scope items, submittals, spec reconciliations) go to dedicated new tables
- Reconciliation metadata stored in existing `scope_meta` JSONB column on findings, not a new column

### Expected Features

See [FEATURES.md](.planning/research/FEATURES.md) for full detail including domain research on submittal timing, exclusion gotchas, and quantity-ambiguity phrase catalog.

**Must have — table stakes for "estimator-grade scope intelligence" promise:**
- Submittal register extraction — glazing PMs' #1 schedule-risk artifact; 8-14 week glass lead times make late approvals the dominant scheduling failure mode
- Submittal schedule-conflict flags — deterministic computation after extraction; no new AI pass
- Quantity-ambiguity flagging — highest-frequency finding type; phrases like "as required to weatherproof" are CRITICAL bid risk
- Spec cite reconciliation knowledge module (Div 08 to typical deliverables) — foundational; unlocks exclusion stress-test and inferred-but-unreferenced features
- Exclusion stress-test — catches what expert reviewers miss; the single highest-differentiation finding type
- Multi-document input infrastructure — architectural prerequisite for 4 of 9 table-stakes features
- Bid-vs-contract exclusion parity — most common glazing disaster ("bid excludes perimeter sealant, contract doesn't adopt exclusion")
- Bid-vs-contract quantity delta — second most common signing-day failure
- Unbid scope detection — wrapper around parity + inclusion diff; very high user value
- Cross-contract scope trend view — LOW-MED complexity layered on v2.2 pattern detection

**Should have — differentiators:**
- Submittal critical-path overlay visualization (timeline component, MED complexity)
- Responsibility matrix structured output — upgrade "scope rules" list to GC/Sub/Silent matrix
- Inferred-but-unreferenced spec requirements (HIGH complexity; wait for spec reconciliation to prove out first)
- Per-GC scope behavior profile (cross-contract dashboard card)
- Warranty clause pass — STRONG fit: intersects spec reconciliation, exclusion stress-test, and submittal register; PRIMARY new clause pass recommendation
- Safety/OSHA clause pass — fills known gap; existing ca-calosha knowledge module has no consuming pass; SECONDARY recommendation

**Defer to v3.x / v4+:**
- Exclusion outcome history — BLOCKED by out-of-scope decision on outcome tracking (see Decision Flag below)
- Full spec PDF upload + parsing — already out of scope per PROJECT.md
- Drawing OCR / automated takeoff — already out of scope per PROJECT.md
- SOV line-item reconciliation — only if user bids routinely include SOVs
- Schedule-of-values reconciliation

**Decision flag — revisit "no negotiation outcome tracking":**
FEATURES.md identifies exclusion outcome history as the "single biggest unlock" for cross-contract differentiators. It requires per-exclusion outcome tracking (accepted/rejected/modified), currently out of scope. The schema change is LOW complexity; the product decision is the blocker. This is the highest-value out-of-scope item to reconsider during requirements.

### Architecture Approach

The architecture follows a clean three-stage pipeline extension. Stage 1 (primer, unchanged), Stage 2 (existing 15 passes + 2-3 new contract-only passes running in parallel), Stage 3 (new reconciliation wave running in parallel after Stage 2 settles, consuming contract + bid + Stage 2 outputs). Stage 3 is new infrastructure but mirrors Stage 2's `Promise.allSettled` + per-pass AbortController + 90s timeout pattern. Timeline math is safe: Stage 1 (~15s) + Stage 2 (~30-40s) + Stage 3 (~25-30s) + synthesis + DB writes (~20s) = ~90-105s, well under the 250s global timeout. See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full detail.

**Major components and responsibilities:**
1. **ContractUpload page (modified)** — second optional `UploadZone` with role="bid"; `bidFile: File | null` state; sends both base64 payloads
2. **`api/analyze.ts` (modified)** — parallel Files API uploads for both PDFs; Stage 3 orchestration wave; bid-conditional pass skipping; bid file retention logic
3. **Three new Supabase tables** — `scope_items` (inclusions/exclusions/quantity signals with bid parity), `submittals` (register with schedule conflict flags), `spec_reconciliations` (inference-based spec gap results)
4. **New passes: `quantity-signals`, `submittal-extraction`** — contract-only, added to Stage 2 parallel wave
5. **New passes: `bid-reconciliation`, `spec-reconciliation`, `exclusion-stress-test`** — Stage 3 (contract + bid context); `bid-reconciliation` conditionally skipped when no bid uploaded
6. **ScopeIntelTab** — new primary tab in ContractReview alongside Findings/Dates/Coverage/Checklist; contains SubmittalSchedule, SpecGapMatrix, BidReconciliationDiff, QuantityAmbiguityList sub-components
7. **ScopeTrendsCard** — cross-contract aggregation on Dashboard; mirrors existing PatternsCard approach

**Patterns to follow:**
- Every new pass gets a Zod schema, an `ANALYSIS_PASSES` entry, and a test fixture
- Reconciliation data in dedicated tables; reconciliation risks in findings table with new category values
- Bid PDF is always optional — every code path handles `bidFileId === null`
- Asymmetric storage: contract PDF ephemeral (current behavior preserved); bid PDF persistent (mechanism TBD — see Gap 1)

**Anti-patterns to avoid:**
- Stuffing new passes into existing scope-of-work pass (already at 4-module capacity)
- Making bid PDF required (breaks single-document workflow)
- Running reconciliation as a synthesis-style post-processor (no document access)
- Storing contract PDF in Supabase to match bid storage (unnecessary cost/complexity)

### Critical Pitfalls

See [PITFALLS.md](.planning/research/PITFALLS.md) for 12 pitfalls with full prevention strategies, integration gotchas, performance traps, and a "looks done but isn't" checklist.

**Top 5 pitfalls with prevention:**

1. **Fabricated spec requirements (inference-grounding failure)** — Claude invents canonical spec requirements that don't apply to the specific project. Prevention: require `inferenceBasis` field (`"contract-quoted"` | `"knowledge-module:{id}"` | `"model-prior"`); merge logic drops or Info-downgrades `model-prior` findings; prompt uses quote-first synthesis pattern. Address in Phase 1 (schema) and Phase 2 (reconciliation prompt). This is a "never acceptable" shortcut — shipping without `inferenceBasis` permanently erodes user trust.

2. **Document attribution confusion (which PDF said that?)** — reconciliation findings attribute exclusions to the wrong document; user negotiates the wrong direction. Prevention: explicit `<document index="1" type="contract">` / `<document index="2" type="bid">` tagging in user prompt; schema requires `contractQuote: string | null` and `bidQuote: string | null` on every reconciliation finding; evaluate Anthropic Citations API. Address in Phase 2 (multi-doc ingest) and Phase 3 (reconciliation pass design). Recovery cost is HIGH — document attribution errors cannot be repaired post-hoc and require re-processing all bids.

3. **Pipeline timeout breach** — adding 3-5 new passes without architecture discipline pushes past the 250s global timeout. Prevention: Stage 3 as a separate wave (not stuffed into Stage 2); deterministic reconciliation (quantity delta, exclusion parity) computed in TypeScript after pass output, not as additional LLM calls; per-pass p95 SLO monitoring. Address in Phase 0 (architecture decision) before coding any pass.

4. **Anthropic Tier 1 rate-limit cliff (50 RPM)** — 20 concurrent requests + two analyses in 60s window = 429 storms, Partial contracts. Prevention: upgrade to Tier 2 ($40 cumulative spend barrier, trivial) before v3.0 ships to production; add 429-specific retry-with-backoff (currently `maxRetries: 0`). Address in Phase 0.

5. **UI noise collapse from new finding categories** — 40-60 findings per contract; scope-intel Medium/Low findings drown Critical legal findings. Prevention: new findings as `scopeMeta.subKind` subcategories under existing "Scope of Work" (Category enum stays at 10); inference-based findings default to Low/Info; per-subcategory finding caps enforced at merge time; dedicated "Scope Intelligence" view mode. Address in Phase 0 (UX architecture decision) before schema design.

---

## Implications for Roadmap

Based on combined research, the dependency graph is clear and dictates phase order. The architecture research has explicitly worked out the build ordering; the phase suggestions below align with it and add pitfall-prevention rationale.

### Phase 0: Pre-Build Architecture Decisions
**Rationale:** Three cross-cutting decisions must be made before any code is written. Getting them wrong requires rewriting every downstream component. This is a requirements/design checkpoint, not a development phase.
**Delivers:** Locked decisions on (a) bid PDF storage architecture (Files API only vs. Supabase Storage — see Gap 1), (b) UX information architecture for findings (subcategory model, Scope Intel view mode), (c) Anthropic Tier 2 upgrade (infra task), (d) outcome tracking decision (see Gap 2)
**Addresses:** Pitfalls 3, 4, 8 — all three are Phase 0 items per PITFALLS.md; all are preventable at design time and expensive to fix post-ship

### Phase 1: Multi-Document Upload Infrastructure
**Rationale:** Four of nine table-stakes features are gated on bid PDF flowing through the pipeline. This is the lowest-risk foundation phase — no new AI passes, validates upload patterns in isolation.
**Delivers:** Second optional UploadZone (role="bid"), extended `AnalyzeRequestSchema`, parallel Files API uploads in `api/analyze.ts`, bid storage column(s) on `contracts`, backward-compatible schema (all new columns nullable), graceful old-contract handling, `analysisCapabilities` field on contracts driving UI rendering
**Addresses:** Multi-document input (table stakes), backward compatibility (Pitfall 12), body size limit (Pitfall 5), schema design for new tables
**Avoids:** Making bid PDF required (anti-pattern); storing contract PDF to match bid (anti-pattern)

### Phase 2: New Stage 2 Scope Extraction Passes
**Rationale:** Validate new-pass addition pattern with contract-only (no bid) passes before adding two-document reconciliation complexity. `submittal-extraction` and `quantity-signals` deliver standalone value and accumulate the `scope_items` / `submittals` data that later phases depend on.
**Delivers:** `quantity-signals` pass, `submittal-extraction` pass, two new knowledge modules (`div08-deliverables`, `exclusion-stress-test`), `scope_items` + `submittals` tables, ScopeIntelTab shell with QuantityAmbiguityList and SubmittalSchedule sub-components
**Addresses:** Submittal register extraction (P1), quantity-ambiguity flagging (P1)
**Avoids:** Knowledge module bloat (Pitfall 10 — module token budget: 800-1,500 tokens, hard cap 2,000); submittal date hallucination (Pitfall 9 — relative dates schema; deterministic conflict detection)
**Needs research:** Scope pass split vs. `MAX_MODULES_PER_PASS` raise — measure cache impact after scaffold before committing

### Phase 3: Stage 3 Infrastructure + Spec Reconciliation
**Rationale:** Prove Stage 3 orchestration pattern using inference-only passes (contract-only) before adding bid-document complexity. Spec-reconciliation is the highest-leverage knowledge module — it unlocks exclusion stress-test and the inferred-but-unreferenced differentiator.
**Delivers:** Stage 3 `Promise.allSettled` wave in `api/analyze.ts`, `spec-reconciliation` pass, `exclusion-stress-test` pass, `spec_reconciliations` table, SpecGapMatrix component, `inferenceBasis` enforcement in merge logic
**Addresses:** Exclusion stress-test (P1), spec cite reconciliation (P1)
**Avoids:** Fabricated spec requirements (Pitfall 1 — `inferenceBasis` schema; severity caps); exclusion false positives (Pitfall 7 — `tensionQuote` required, severity ceiling Medium, max 5 challenges)
**Needs research:** Evaluate Anthropic Citations API fit for spec-reconciliation pass before finalizing prompt design

### Phase 4: Bid Reconciliation Pass
**Rationale:** Most complex phase; requires P1 (bid upload), P2 (contract scope data), P3 (Stage 3 orchestration) all working. The capstone of v3.0.
**Delivers:** `bid-reconciliation` pass with both `contractFileId` + `bidFileId` in context, `scope_items.bid_parity` population, BidReconciliationDiff component (Contract Scope | Bid Scope | Status badge columns)
**Addresses:** Bid-vs-contract exclusion parity (P1), bid-vs-contract quantity delta (P1), unbid scope detection (P1)
**Avoids:** Document attribution confusion (Pitfall 2 — explicit `<document index>` tagging, `contractQuote`/`bidQuote` schema fields); single "compare everything" pass (anti-pattern — recovery cost HIGH)
**Needs research:** Citations API evaluation result from Phase 3 informs pass design here

### Phase 5: New Clause Passes (Warranty + Safety/OSHA)
**Rationale:** Independent of scope-intel infrastructure; can ship any time after Phase 2 proves the pass-addition pattern. Natural milestone pairing.
**Delivers:** Warranty clause pass (PRIMARY — intersects spec reconciliation, exclusion stress-test, submittal register); Safety/OSHA clause pass (SECONDARY — first dedicated pass consuming existing ca-calosha knowledge module)
**Addresses:** 1-2 new clause passes per milestone spec

### Phase 6: Cross-Contract Scope Trends
**Rationale:** Depends on `scope_items` data accumulating across multiple analyzed contracts. Pointless before the user has enough contracts with scope data; ship per-contract UI first.
**Delivers:** `useScopeTrends()` aggregation hook, ScopeTrendsCard on Dashboard, minimum-N threshold (render only at N≥10), GC-grouped counts, raw counts below N=20
**Addresses:** Cross-contract scope trend view (P1), per-GC scope behavior profile (P2)
**Avoids:** Trend false signals on small N (Pitfall 11)

### Phase 7: Submittal Schedule-Conflict Detection
**Rationale:** Natural follow-up once `submittals` + `contract_dates` are both populated. Conflict detection is deterministic TypeScript — no AI pass, no hallucination risk.
**Delivers:** Post-processing cross-reference of `submittals.due_offset_days` vs `contract_dates`, `schedule_conflict_flag` population, SubmittalSchedule timeline visualization, conflict findings with dual `anchorQuote` display
**Addresses:** Submittal schedule-conflict flags (P1), submittal critical-path overlay (P2)
**Avoids:** Submitting sequence conflicts to LLM reasoning (Pitfall 9)

### Phase Ordering Rationale

- Phase 0 decisions (storage model, category model, Tier 2 upgrade) must be locked before any code
- Phase 1 before Phase 4 — no bid PDF flowing through pipeline, no bid reconciliation possible
- Phase 2 before Phase 3 — spec-reconciliation needs scope extraction output for grounding; new-pass pattern validated with simple passes first
- Phase 3 before Phase 4 — Stage 3 orchestration pattern proven before highest-complexity two-document pass
- Phase 5 is independent — can be developed in parallel with Phase 3 or 4
- Phases 6 and 7 require data that only accumulates after Phase 2 is in production; inherently last

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (spec-reconciliation pass):** Highest hallucination risk; Anthropic Citations API fit and `inferenceBasis` enforcement strategy need spiking before prompt design
- **Phase 4 (bid-reconciliation pass):** Document attribution is the highest-risk failure mode; Citations API evaluation and attribution correctness fixture testing before finalizing pass design
- **Phase 2 (scope pass split decision):** `MAX_MODULES_PER_PASS` raise vs. scope-pass split has cache and latency implications; measure empirically before committing

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (upload infra):** Well-understood — existing UploadZone component, Files API upload pattern in `api/pdf.ts`, additive Supabase schema
- **Phase 5 (clause passes):** Established pattern; 17 prior passes provide complete template
- **Phase 7 (submittal schedule conflict):** Deterministic post-processing; no AI design decisions needed

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Grounded in direct codebase inspection; all claims cross-referenced against `package.json`, `api/analyze.ts`, `src/schemas/analysis.ts`. Zero ambiguity on dependency choices. |
| Features | MEDIUM-HIGH | Table-stakes features (submittal timing, exclusion gotchas, quantity-ambiguity phrases) verified across multiple industry sources. Sole-user portfolio insight features are design inferences from v2.2 infrastructure — not empirical user research. |
| Architecture | HIGH | Grounded in actual codebase inspection of pipeline, pass structure, schema, and UI tab layout. Timeout math verified against current pipeline measurements. Two-stage pipeline extension pattern is proven in v2.2. |
| Pitfalls | HIGH (technical) / MEDIUM-HIGH (domain) | LLM hallucination patterns and API/pipeline constraints are well-documented. Glazing-domain specifics (exclusion dispute frequencies, spec section gotchas) extrapolated from v1.0-v2.2 learnings and construction industry norms. |

**Overall confidence:** HIGH for technical execution path; MEDIUM-HIGH for domain feature prioritization.

### Gaps to Address During Requirements

**Gap 1 — Bid PDF storage (CRITICAL: blocks Phase 1 schema design):**
STACK.md recommends Anthropic Files API only for bid PDF (single nullable `bid_file_id TEXT` column on `contracts`; delete after each analysis run, no persistent storage). ARCHITECTURE.md recommends Supabase Storage for persistent bid PDF retention (`bids/{user_id}/{contract_id}/{run_id}.pdf` path, permanent) plus per-run Files API uploads. The disagreement centers on whether bid PDFs need to persist between sessions. User must decide: should the bid be re-viewable after analysis? Should re-analyze work without re-uploading the bid? The answer determines the storage architecture and the Supabase Storage bucket setup (new RLS, new client surface area). Files API only is simpler; Supabase Storage is more flexible. This is the most consequential open decision.

**Gap 2 — Outcome tracking out-of-scope reversal (HIGH VALUE: decision flag):**
FEATURES.md identifies exclusion outcome history (per-exclusion accepted/rejected/modified tracking) as the highest-value cross-contract differentiator, currently blocked by a PROJECT.md out-of-scope decision. The schema addition is LOW complexity (one new field on `scope_items`). The product decision is the only blocker. Unblocking this for v3.0 enables the "sections you keep getting burned by" coaching loop — an insight no multi-tenant tool can offer. User should explicitly decide during requirements.

**Gap 3 — Scope pass split vs. MAX_MODULES_PER_PASS raise:**
The existing scope-of-work pass is at 4-module capacity. Adding `div08-deliverables` + `exclusion-stress-test` requires either raising the cap to 6 or splitting into scope-extraction + scope-reconciliation passes. Splitting is architecturally cleaner (independent caching, parallel execution) but more work. Raising the cap is faster but risks context window quality degradation at 6+ modules. Empirical measurement after Phase 2 scaffold recommended before committing.

**Gap 4 — Anthropic Citations API evaluation:**
PITFALLS.md flags the Citations API as potentially eliminating document-attribution confusion (Pitfall 2, recovery cost HIGH) entirely. Has not been evaluated against the existing structured-output pipeline. Should be spiked in Phase 3 planning before the reconciliation pass prompt is finalized.

**Gap 5 — Vercel body parser limit with two PDFs:**
Base64-encoding two large PDFs exceeds the current 15MB `sizeLimit` override. PITFALLS.md recommends using Files API for bid PDF (keeping base64 for contract for backward compat) as the simplest resolution, with `sizeLimit` raised to 25MB only as a safety net. This should be an explicit Phase 1 design decision rather than discovered during implementation.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `api/analyze.ts`, `api/passes.ts`, `api/pdf.ts`, `src/schemas/analysis.ts`, `src/components/UploadZone.tsx`, `src/pages/ContractReview.tsx`, `supabase/migrations/`, `package.json`, `CLAUDE.md`
- `.planning/PROJECT.md` — locked out-of-scope decisions, v3.0 milestone scope definition
- [Anthropic Files API docs](https://docs.claude.com/en/docs/build-with-claude/files) — 100GB storage, 500MB/file, retention policy
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) — Tier 1: 50 RPM, 30k ITPM for Sonnet
- [Anthropic Citations API](https://claude.com/blog/introducing-citations-api) — source grounding for multi-doc
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — cache breakpoints and ITPM treatment

### Secondary (MEDIUM-HIGH confidence)
- [react-dropzone npm / GitHub](https://www.npmjs.com/package/react-dropzone) — v14/v15 API, `multiple`/`maxFiles` behavior
- [CSI MasterFormat 084113 spec — YKK AP](https://www.ykkap.com/commercial/productguide/specs/CSI_Storefront/02-3009-09.pdf) — typical storefront submittals
- [Glass project scheduling — InAir Space](https://inairspace.com/blogs/learn-with-inair/glass-project-scheduling-strategies-for-on-time-profitable-installations) — 10-14 day review cycles, 8-14 week glass lead times
- [Shop drawings and submittals — EJCDC](https://ejcdc.org/shop-drawings-and-submittalspart-1-definition-purpose-and-necessityby-kevin-obeirne-pe/) — submittal types and review chain
- [Scope gaps and exclusions — VERTEX](https://vertexeng.com/insights/limiting-risks-of-scope-gaps-and-subcontract-exclusions-in-completion-projects/)
- [Inclusions/exclusions/assumptions — PVBid](https://pvbid.com/blog/inclusions-exclusions-and-assumptions-avoiding-scope-drop/)
- [Glazing scope of work — Provision](https://provision.com/resources/glazing-scope-of-work)

### Tertiary (MEDIUM confidence — domain extrapolation)
- ClearContract v1.0-v2.2 shipped learnings: 16-pass pipeline tuning, exclusion gotcha patterns, per-GC pattern detection
- Construction bid/contract reconciliation common-practice patterns (extrapolated from glazing subcontractor domain)
- Glazing exclusion dispute frequency estimates (extrapolated from industry sources and domain knowledge)

---

*Research completed: 2026-04-05*
*Ready for roadmap: yes*
