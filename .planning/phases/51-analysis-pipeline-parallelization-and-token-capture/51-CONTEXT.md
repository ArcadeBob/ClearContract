# Phase 51: Analysis Pipeline Parallelization and Token Capture - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the server-side analysis pipeline (`api/analyze.ts`) for speed (two-stage cache pipeline), resilience (per-pass timeouts, progressive saves on global timeout), and cost visibility (streaming token capture with per-pass usage rows). No client-side UI changes -- token data is captured server-side for Phase 52 to display.

</domain>

<decisions>
## Implementation Decisions

### Cache priming strategy
- risk-overview is the primer pass -- sent first, alone, to create the Anthropic prompt cache
- Fire the remaining 15 passes immediately after the primer completes (no artificial delay)
- If the primer fails, abort the entire analysis -- don't waste API budget on passes that will likely fail too
- Synthesis pass (17th) stays sequential -- runs after all parallel passes complete and merge is done

### Timeout and failure handling
- Each pass (including primer) gets its own AbortController with ~90s timeout
- Global safety timeout at ~250s aborts ALL in-flight passes, leaving ~50s for merge + DB writes + cleanup before Vercel's 300s hard kill
- Timed-out passes are dropped silently -- server logs the timeout, no finding inserted for the user
- API response remains 200 with whatever findings were collected, same as current Promise.allSettled behavior

### Progressive DB saves
- Normal path: wait for all parallel passes to settle, merge, run synthesis, then bulk-write (current pattern)
- Timeout path: when the 250s global timeout fires, abort in-flight passes, merge what's done, skip synthesis, write to DB with contract status set to 'Partial' (new status value) so the client knows analysis is incomplete
- Re-analyze keeps current delete-then-insert pattern -- finding preservation via composite key matching is already handled client-side

### Token capture and cost data
- Capture token fields from streaming events: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens (from message_start and message_delta events)
- New `analysis_usage` table with one row per pass: contract_id, run_id (UUID), pass_name, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd, duration_ms
- run_id UUID generated per analysis run -- groups all passes from the same run, supports re-analyze history
- Synthesis pass gets its own usage row (pass_name='synthesis')
- Pricing constants hardcoded: { inputPerMillion: 3.00, outputPerMillion: 15.00, cacheWritePerMillion: 3.75, cacheReadPerMillion: 0.30 } for Claude Sonnet -- update when model changes
- Server computes cost_usd per pass using these constants before writing to DB

### Claude's Discretion
- Exact AbortController wiring and cleanup patterns
- Whether to use a shared AbortController with per-pass children or independent controllers
- How to structure the streaming event capture (extend existing loop vs wrapper function)
- RLS policy design for analysis_usage table
- Migration file naming and ordering

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- PERF-01, PERF-02, PERF-03, COST-01, COST-02 define success criteria

### Pipeline code
- `api/analyze.ts` -- Main handler, runAnalysisPass(), runSynthesisPass(), DB write logic
- `api/passes.ts` -- ANALYSIS_PASSES array (16 pass definitions), AnalysisPass interface
- `api/merge.ts` -- mergePassResults(), dedup logic, risk score computation
- `api/pdf.ts` -- preparePdfForAnalysis(), Files API upload

### Schemas
- `src/schemas/analysis.ts` -- PassResultSchema, RiskOverviewResultSchema
- `src/schemas/synthesisAnalysis.ts` -- SynthesisPassResultSchema

### Database
- Supabase project -- contracts, findings, contract_dates tables with RLS
- `src/lib/mappers.ts` -- mapToSnake(), mapRow(), mapRows() for DB read/write

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `runAnalysisPass()` already streams via `client.beta.messages.create({ stream: true })` -- extend the event loop to capture `message_start` and `message_delta` usage fields
- `Promise.allSettled()` pattern already in place for parallel execution -- restructure to two-stage (primer then batch)
- `mergePassResults()` already handles partial results from settled promises
- `mapToSnake()` / `mapRow()` mappers ready for new analysis_usage table
- undici Agent already configured with `connections: 20` pool size for concurrent API calls

### Established Patterns
- Supabase admin client (`createClient` with service_role key) for server writes
- Zod schemas for structured output validation
- `classifyError()` / `formatApiError()` for error response formatting
- Console logging with `[analyze]` prefix for server-side debugging

### Integration Points
- `api/analyze.ts` handler function -- all pipeline changes happen here
- Supabase migration needed for `analysis_usage` table + RLS policies
- Contract status values -- need to add 'Partial' to the CHECK constraint (TEXT + CHECK pattern per Key Decisions)

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 51-analysis-pipeline-parallelization-and-token-capture*
*Context gathered: 2026-03-21*
