# Project Research Summary

**Project:** ClearContract v2.2 — Analysis Parallelization, Token/Cost Tracking, Contract Lifecycle & Date Intelligence
**Domain:** AI-powered contract analysis SaaS (glazing/construction vertical) — feature expansion milestone
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

ClearContract v2.2 is a well-scoped feature expansion on a stable, already-working stack. The critical insight from all three research files is that **the architecture for this milestone is almost entirely additive** — the hardest work is exposing data already flowing through the system (token usage in streaming events) rather than building new infrastructure. Analysis parallelization is already implemented at the API call level via `Promise.allSettled`; the enhancement is restructuring the execution order to achieve prompt cache hits, capturing timing per pass, and surfacing that data to the user.

The recommended approach is a four-phase sequence driven by dependencies: (1) server-side token capture and DB schema, (2) client cost display UI, (3) contract lifecycle status, (4) date intelligence and portfolio timeline. Zero new npm dependencies are needed. The entire stack — React 18, TypeScript, Anthropic SDK, Supabase, Tailwind — already supports all three features through code-level changes and one DB migration. The only non-trivial engineering decision is whether to use a separate `analysis_usage` table (preferred — supports per-run history and portfolio queries) or a JSONB column on `contracts` (simpler but loses re-analysis history).

The primary risk is prompt cache behavior with parallel API calls. Anthropic's ephemeral cache only activates after the first response begins streaming, meaning all 16 currently-concurrent passes pay full input token cost. Restructuring to a two-stage pipeline (1 primer pass to warm the cache, then 15 parallel passes) is the single most impactful change in v2.2 — it reduces per-analysis API cost by an estimated 5-6x. This restructuring should be done first, before token tracking is instrumented, because measuring costs against the current broken cache behavior would produce misleading baselines.

## Key Findings

### Recommended Stack

v2.2 requires **zero new npm dependencies**. All three features build entirely on the existing stack. The Anthropic SDK (`@anthropic-ai/sdk ^0.78.0`) already emits `usage` fields in `message_start` and `message_delta` streaming events — the current code simply ignores them. Supabase Postgres handles the new `analysis_usage` table via a single migration file. Native `Date` and `Intl.DateTimeFormat` cover all date intelligence requirements; date-fns/dayjs would add bundle weight for 3-4 operations the browser handles natively.

**Core technologies (unchanged):**
- `@anthropic-ai/sdk ^0.78.0`: Streaming API — `message_start`/`message_delta` events contain token usage; already in use, extend don't replace
- `@supabase/supabase-js ^2.99.2`: Postgres + Auth — new `analysis_usage` table via migration; existing RLS pattern applies
- React 18 / TypeScript / Tailwind: New components (`TokenUsageDisplay`, `LifecycleStatusSelect`, `PortfolioTimeline`) follow existing component patterns exactly
- Native `Promise.allSettled`: Already orchestrates 16 parallel API calls; restructure to two-stage, do not introduce p-limit or p-queue
- Native `Date` / `Intl.DateTimeFormat`: Date intelligence is arithmetic (day diffs, urgency bands); `getDateUrgency()` already exists in Dashboard.tsx, extract and reuse

**What NOT to add:** p-limit, date-fns, dayjs, xstate, Recharts, Chart.js, Helicone, LangSmith, Temporal polyfill.

### Expected Features

FEATURES.md was not produced for this milestone. Features are derived from ARCHITECTURE.md and PITFALLS.md.

**Must have (table stakes for v2.2 milestone):**
- Token usage capture per analysis pass — users need cost visibility; data is already in streaming events
- Total and per-pass cost display on contract review page — directly tied to usage capture
- Contract lifecycle status (`Draft / Negotiating / Signed / Active / Expired / Archived`) — user-controlled business state orthogonal to AI analysis state
- Portfolio-wide deadline timeline on Dashboard — cross-contract urgency view

**Should have:**
- Per-pass duration tracking alongside token counts — natural addition when restructuring streaming loops
- Lifecycle status filter on AllContracts page — discovery feature once status exists
- Portfolio cost aggregate stat card on Dashboard — summarizes spend at a glance

**Defer (v3+):**
- Budget alerts / spending limits — sole-user app, cost visibility is sufficient for now
- Audit trail / status history — overkill for sole user; can add if needed later
- Recharts cost charts — summary table suffices; charts add complexity before value is proven
- Supabase Realtime progress streaming — indeterminate spinner is adequate; Vercel serverless does not support SSE responses

### Architecture Approach

The architecture follows a clean server-to-client pipeline with additive changes at each layer. The server (`api/analyze.ts`) gains token capture in the streaming loop and a bulk insert to `analysis_usage` after the existing contract/findings/dates writes. The client gains three new components and one new utility module. The store gains a fourth parallel query for usage data. The DB gains one new table and one new column via a single migration. All changes are additive — no existing files are restructured, no existing APIs are broken.

**Major components:**
1. `api/analyze.ts` (modified) — Extended streaming loop captures `message_start`/`message_delta` usage; two-stage parallel execution for cache efficiency; bulk insert to `analysis_usage` post-merge
2. `analysis_usage` table (new DB) — Per-analysis token counts, per-pass JSONB breakdown, cost, duration; indexed by contract_id and user_id
3. `src/types/usage.ts` (new) — `AnalysisUsage`, `PassUsageDetail`, `TimelineEntry` client types
4. `src/utils/dates.ts` (new) — Extracted `getDateUrgency()` + new `buildPortfolioTimeline()` for cross-contract deadline aggregation
5. `src/utils/costs.ts` (new) — Cost and token formatting utilities (`$0.04`, `12.3K tokens`, cache hit rate)
6. `TokenUsageDisplay` (new component) — Collapsible per-pass cost breakdown on ContractReview page
7. `LifecycleStatusSelect` (new component) — Dropdown for user-controlled contract lifecycle state
8. `PortfolioTimeline` (new component) — Urgency-grouped cross-contract deadline view on Dashboard

### Critical Pitfalls

1. **Prompt cache misses on all 16 concurrent passes** — Restructure to two-stage pipeline: fire one "primer" pass (risk-overview) first, wait for streaming to begin (cache entry created), then fire remaining 15 in parallel. Detection: check `cache_creation_input_tokens` vs `cache_read_input_tokens` on passes 2-16; all should show read hits, not creation hits.

2. **Token usage lost in streaming loop** — The current loop only handles `content_block_delta`. Add handlers for `message_start` (input tokens + cache fields) and `message_delta` (cumulative output tokens). Beta streaming types may lack full TypeScript definitions for usage fields — use defensive access (`(event as any).message?.usage`) and verify with a real API call.

3. **Lifecycle status state machine without transition validation** — Do NOT expand the existing `status` CHECK constraint in place. Add a separate `lifecycle_status` column (nullable, additive migration) with its own CHECK constraint. Keep existing `status` column unchanged. Validate transitions in application layer via a TypeScript `Record<LifecycleStatus, LifecycleStatus[]>` transition map.

4. **Vercel 300s timeout with two-stage parallelization** — Two-stage execution adds primer pass latency (~15-25s) on top of existing parallel execution. Mitigate with per-pass `AbortController` timeouts at ~90s each (not the current 280s whole-function timeout). Consider progressive DB writes as each pass completes so partial results survive a timeout.

5. **Schema migration breaks existing contracts** — Never rename or drop the existing `status` column. Add `lifecycle_status` as a new nullable column. The existing `status` field (`Analyzing | Reviewed | Draft`) continues unchanged for the AI pipeline.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Server-Side Token Capture and DB Foundation

**Rationale:** This is the riskiest change (modifying the core analysis pipeline) and everything else depends on it. The cache structure fix (two-stage pipeline) and token capture must be done together because restructuring the parallel execution order is the right moment to modify the streaming loop — doing it twice is wasteful. Get server-side right before layering any UI.

**Delivers:** Working per-pass token capture, accurate prompt cache utilization, `analysis_usage` table populated on every new analysis, total and per-pass cost computed server-side.

**Implements:** Two-stage `Promise.allSettled` pipeline, extended streaming loop in `runAnalysisPass` and `runSynthesisPass`, `PRICING` constants, `computeCost()`, DB migration for `analysis_usage` table.

**Avoids:** Pitfall 1 (cache misses), Pitfall 2 (lost token data), Pitfall 4 (timeout budget with two-stage), Pitfall 7 (failed pass risk score inflation from synthetic findings).

### Phase 2: Token and Cost Display (Client UI)

**Rationale:** Depends on Phase 1 data being available in Supabase. This phase is purely additive client work with no server risk. All new components follow established patterns exactly.

**Delivers:** `TokenUsageDisplay` component on ContractReview page (collapsible, pass-by-pass cost table), portfolio cost stat card on Dashboard, `useAnalysisUsage` hook, cost formatting utilities.

**Uses:** `analysis_usage` table (Phase 1), existing Supabase query patterns, existing Tailwind component patterns.

**Avoids:** Pitfall 11 (schema overdesign — the table structure from Phase 1 is kept simple).

### Phase 3: Contract Lifecycle Status

**Rationale:** Independent of token tracking; simpler than date intelligence. The lifecycle status must exist before the date intelligence phase because urgency filtering is more meaningful when contracts have `Active` or `Negotiating` status. Schema design must be right before any UI is built.

**Delivers:** `lifecycle_status` column on contracts, `LifecycleStatusSelect` dropdown on ContractReview and AllContracts, lifecycle status badges on ContractCard, status filter on AllContracts, `updateContractStatus()` store method.

**Implements:** Non-destructive DB migration (additive `lifecycle_status` column), TypeScript transition map, optimistic update pattern (matches `renameContract` pattern exactly).

**Avoids:** Pitfall 3 (state machine without transitions), Pitfall 6 (migration breaks existing data), Pitfall 8 (mixed AI and user date sources), Pitfall 12 (UI status confusion — show both analysis and lifecycle badges).

### Phase 4: Date Intelligence and Portfolio Timeline

**Rationale:** Purely additive, lowest risk, depends on lifecycle status for meaningful urgency filtering by contract state. All computation is client-side over already-loaded data.

**Delivers:** `src/utils/dates.ts` with extracted `getDateUrgency()` and new `buildPortfolioTimeline()`, `PortfolioTimeline` component on Dashboard (grouped by overdue/this week/this month/later), date range query optimization with index on `contract_dates.date`.

**Implements:** Client-side urgency computation, cross-contract deadline aggregation, clickable timeline entries navigating to contract review.

**Avoids:** Pitfall 8 (AI-extracted vs user-set dates kept separate), Pitfall 10 (portfolio query performance — date range filter added from the start).

### Phase Ordering Rationale

- Phase 1 before Phase 2: Client UI has nothing to display until server writes usage data to Supabase. Must verify end-to-end with a real analysis before building the display layer.
- Phase 1 before Phase 3: The schema migrations for `analysis_usage` and `lifecycle_status` can be combined into one migration file to reduce migration count, but Phase 1 work must be complete before Phase 3 UI is useful.
- Phase 3 before Phase 4: Portfolio timeline is more valuable when contracts have lifecycle status (filtering `Active` contracts' deadlines is a key use case). The `buildPortfolioTimeline()` utility should accept an optional lifecycle status filter from day one.
- Phase 4 last: No upstream dependencies. Lowest risk. Clean separation.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (two-stage cache pipeline):** The exact Anthropic behavior for "cache available after streaming begins" (vs after streaming completes) needs empirical validation. Research is HIGH confidence on the limitation but MEDIUM confidence on exact timing. Recommend a two-request spike before committing to the full implementation.
- **Phase 1 (beta streaming types):** `client.beta.messages.create({ stream: true })` TypeScript types for `message_start`/`message_delta` usage fields may be incomplete. Needs a real API call to confirm field presence and correct type narrowing approach.

Phases with standard patterns (skip research-phase):

- **Phase 2 (token display UI):** Standard React component work following existing patterns. No research needed.
- **Phase 3 (lifecycle status):** Additive column migration and optimistic update store method. Both patterns are already in the codebase and well-understood.
- **Phase 4 (date intelligence):** Pure client-side computation. `getDateUrgency()` already exists. Extraction and extension require no new patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; all capabilities verified in existing SDK and native APIs |
| Features | MEDIUM | Derived from architecture and pitfalls research (FEATURES.md not produced); feature list is consistent with v2.2 milestone scope but not independently validated |
| Architecture | HIGH | Based on direct codebase analysis + Anthropic official docs; specific file locations and line numbers cited |
| Pitfalls | HIGH (codebase) / MEDIUM (API specifics) | Cache behavior, streaming event structure, and schema patterns are HIGH; rate limit tier and cache TTL extension on beta endpoint are MEDIUM |

**Overall confidence:** HIGH

### Gaps to Address

- **Beta streaming TypeScript types:** `client.beta.messages.create({ stream: true })` usage field types may require `as any` casts. Validate with a real API call in Phase 1. If types are missing, document the workaround in a code comment referencing the SDK gap.
- **Prompt cache timing:** Research confirms cache is available "after streaming begins," but the exact implementation (first byte of content vs. connection established) needs empirical testing. A two-request spike before full Phase 1 implementation is recommended.
- **API tier rate limits:** Pitfall 9 notes that 16 concurrent streaming requests may hit RPM limits on Tier 1. The current account tier is unknown. Check the Anthropic Console before Phase 1 ships to decide whether to add a concurrency limiter.
- **Cache TTL extension on beta endpoint:** `cache_control: { type: 'ephemeral', ttl: '1h' }` is documented for the standard API but needs validation that it works with `client.beta.messages.create`. If not supported, the default 5-minute TTL is still sufficient for a single serverless invocation.
- **Analysis cost estimate accuracy:** ARCHITECTURE.md estimates $0.03-0.08 per analysis with cache hits. This will be validated by Phase 1 token tracking; treat pre-Phase-1 cost numbers as rough estimates only.

## Sources

### Primary (HIGH confidence)

- Anthropic Streaming Messages API: https://platform.claude.com/docs/en/api/messages-streaming — `message_start`/`message_delta` event structure, usage field presence, cumulative token counts
- Anthropic Prompt Caching Documentation: https://platform.claude.com/docs/en/build-with-claude/prompt-caching — concurrent request cache limitation (primer pattern required)
- Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing — Sonnet 4.5: $3/$15 per million tokens, cache write 1.25x, cache read 0.1x
- Anthropic Rate Limits: https://platform.claude.com/docs/en/api/rate-limits — tier-based RPM limits
- Project codebase: `api/analyze.ts`, `api/merge.ts`, `api/scoring.ts`, `src/hooks/useContractStore.ts`, `src/pages/Dashboard.tsx`, `supabase/migrations/` — direct analysis of current implementation

### Secondary (MEDIUM confidence)

- Anthropic SDK TypeScript source: https://github.com/anthropics/anthropic-sdk-typescript — beta streaming type completeness uncertain
- Vercel Functions Timeout Documentation: https://vercel.com/docs/limits — 300s maxDuration confirmed
- State machine transition patterns — general software design principles applied to lifecycle status design

### Tertiary (LOW confidence / needs validation)

- Cache TTL extension (`ttl: '1h'`) on beta endpoint — documented for standard API, beta compatibility unverified
- Per-analysis cost estimate ($0.03-0.08) — theoretical based on token counts and pricing; actual cache hit rates unknown until Phase 1 ships

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
