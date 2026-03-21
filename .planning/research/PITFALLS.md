# Domain Pitfalls

**Domain:** Analysis parallelization, token/cost tracking, and contract lifecycle/date intelligence
**Researched:** 2026-03-21
**Overall confidence:** HIGH (codebase analysis) / MEDIUM (Anthropic API specifics)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Prompt Cache Misses on All 16 Parallel Requests

**What goes wrong:** The current code already runs all 16 passes in parallel via `Promise.allSettled` and uses `cache_control: { type: 'ephemeral' }` on the file document block. However, Anthropic's prompt caching has a critical limitation for concurrent requests: a cache entry only becomes available after the first response begins. When all 16 requests fire simultaneously, only the first request creates the cache -- the other 15 are treated as cache misses, each paying full input token cost for the entire PDF.

**Why it happens:** Developers assume `cache_control: { type: 'ephemeral' }` means "cache this for all concurrent requests." In reality, it means "cache this for future requests, starting after this response begins streaming."

**Consequences:** 16x the input token cost of what should be a 1x + 15x-cached cost. For a 50-page contract (~75K input tokens at ~1500 tokens/page), this means ~1.2M input tokens billed at full price ($3/M for Sonnet = ~$3.60) vs. ~75K full + ~1.125M cached at 10% ($3/M * 0.1 = ~$0.33 for the cached portion + $0.23 full = ~$0.56 total). That is roughly 6x cost overhead per analysis.

**Prevention:** Send the first pass (risk-overview) as a "primer" request that establishes the cache, wait for the first response to begin streaming (not complete -- just start), then fire the remaining 15 passes in parallel. This requires restructuring the `Promise.allSettled` call into a two-stage pipeline:
```
Stage 1: risk-overview (establishes cache)
Stage 2: 15 remaining passes in parallel (cache hits)
```

**Detection:** Check Anthropic API response `usage` object for `cache_creation_input_tokens` vs `cache_read_input_tokens`. If you see `cache_creation_input_tokens` on multiple passes per analysis, the cache is being recreated instead of reused.

**Phase to address:** Parallelization phase -- this is the first thing to get right before optimizing anything else.

**Confidence:** HIGH -- Anthropic documentation explicitly states this limitation.

### Pitfall 2: Token Tracking Lost in Streaming Responses

**What goes wrong:** The current `runAnalysisPass` function uses streaming (`stream: true`) but only collects `content_block_delta` text chunks. It completely ignores the `message_start` event (which contains `usage.input_tokens`) and the `message_delta` event (which contains `usage.output_tokens`). Token counts are never captured.

**Why it happens:** The original code was built for analysis output, not usage tracking. Streaming was added to avoid `HeadersTimeoutError`, and only the text content was needed.

**Consequences:** No token data available for cost tracking. Retrofitting token capture after parallelization is harder because you need to aggregate across 17 concurrent streams.

**Prevention:** Modify `runAnalysisPass` to capture token usage from streaming events alongside text content:
- `message_start` event contains `message.usage.input_tokens` (including `cache_creation_input_tokens` and `cache_read_input_tokens`)
- `message_delta` event contains `usage.output_tokens`
- Return a `{ passName, result, usage }` tuple from each pass
- Aggregate all 17 usage objects after `Promise.allSettled` completes

**Detection:** After implementation, verify every pass returns non-zero `input_tokens` and `output_tokens`.

**Phase to address:** Token tracking phase -- must be done before or simultaneously with parallelization changes, because modifying the streaming loop twice is wasteful.

**Confidence:** HIGH -- verified against Anthropic streaming documentation and the existing codebase.

### Pitfall 3: Contract Status State Machine Without Transition Validation

**What goes wrong:** Adding lifecycle statuses (Draft, Negotiating, Signed, Active, Expired, Terminated) to the existing `status` CHECK constraint as a flat list of allowed values. The database accepts any status value in the list, allowing invalid transitions like `Active -> Draft` or `Expired -> Negotiating`.

**Why it happens:** The existing schema uses `CHECK (status IN ('Analyzing', 'Reviewed', 'Draft'))` which works for 3 non-sequential statuses. Adding 3-4 more statuses that have a defined lifecycle order requires transition validation, not just value validation.

**Consequences:** Contract status becomes meaningless -- users can set any status, breaking reports and filters that depend on lifecycle ordering. Worse, the `Analyzing` and `Reviewed` statuses from the AI pipeline must coexist with lifecycle statuses, creating a confusing dual-track system.

**Prevention:**
1. Separate concerns: `analysis_status` (Analyzing/Reviewed/Failed) for the AI pipeline, `lifecycle_status` (Draft/Negotiating/Signed/Active/Expired/Terminated) for contract lifecycle. The existing `status` field becomes `analysis_status`.
2. Validate transitions in the application layer (not the database) since this is a sole-user app -- a simple transition map in TypeScript is sufficient.
3. Allow `lifecycle_status` to be nullable initially -- existing contracts get null until the user explicitly sets one.

**Detection:** Test that setting `lifecycle_status = 'Draft'` on a contract with `lifecycle_status = 'Active'` is rejected by the application.

**Phase to address:** Contract lifecycle phase -- schema design must be right before any UI is built.

**Confidence:** HIGH -- based on state machine design patterns and the existing schema.

### Pitfall 4: Vercel 300s Timeout Becomes Binding Constraint with Two-Stage Parallelization

**What goes wrong:** Currently, all 16 passes fire simultaneously and the slowest pass determines total time (~30-60s observed). Moving to two-stage parallelization (1 primer + 15 parallel) adds the primer pass latency (~15-25s) on top. Combined with file upload (~5-10s), synthesis pass (~10-15s), and DB writes (~2-5s), the total budget becomes:
```
Upload: 5-10s + Primer: 15-25s + Parallel: 30-60s + Synthesis: 10-15s + DB: 2-5s = 62-115s typical
```
This fits within 300s normally. But with large contracts (100+ pages), slow API responses (Anthropic under load), or model retries, individual passes can take 60-120s, pushing the total past 300s.

**Why it happens:** The current code sets `maxRetries: 0` and `timeout: 280s` on the Anthropic client, which is correct. But the Vercel `maxDuration: 300` is an absolute wall -- if any pass takes longer than expected, the entire function terminates with no partial result saved.

**Consequences:** User uploads a 100-page contract, waits 5 minutes, gets a timeout error with zero results. All API costs for completed passes are wasted.

**Prevention:**
1. Keep `maxRetries: 0` (correct -- retries within serverless waste remaining budget)
2. Set per-pass timeouts via `AbortController` at ~90s each (not 280s for the whole function)
3. Consider progressive saving: write partial results to DB as each pass completes, so timeouts preserve completed work. The existing `passResults` array with success/failed status already supports this.
4. For the synthesis pass, set a tighter timeout (~30s) since it processes text, not a PDF

**Detection:** Monitor for 504 responses on the `/api/analyze` endpoint. Log elapsed time at each stage.

**Phase to address:** Parallelization phase -- per-pass timeouts should be added when restructuring the parallel execution.

**Confidence:** HIGH -- based on existing vercel.json config and observed analysis times.

## Moderate Pitfalls

### Pitfall 5: Token Cost Calculation Drift from Pricing Changes

**What goes wrong:** Hardcoding Anthropic pricing ($3/$15 per million tokens for Sonnet) in the application. Anthropic adjusts pricing periodically (they dropped Haiku pricing in 2025, added long-context surcharges). Hardcoded prices become inaccurate.

**Prevention:** Store pricing as a configuration object (not inline constants) that can be updated without code changes. Better: use the Anthropic Usage & Cost API (`/v1/organizations/usage_report/messages`) to get actual costs rather than estimating. For a sole-user app, a simple config constant with a comment noting the last-verified date is sufficient.

**Detection:** Compare calculated costs against the Anthropic console usage report monthly.

**Phase to address:** Token tracking phase.

**Confidence:** MEDIUM -- pricing stability is uncertain.

### Pitfall 6: Schema Migration Breaks Existing Contracts on Status Field Change

**What goes wrong:** Renaming `status` to `analysis_status` or changing the CHECK constraint values breaks existing rows and all client queries that reference `status`.

**Prevention:** Use a non-destructive migration approach:
1. Add new `lifecycle_status` column (nullable, no CHECK initially)
2. Add CHECK constraint on `lifecycle_status` after adding the column
3. Keep existing `status` column unchanged -- it already works for the AI pipeline
4. Update client code to read both fields
5. Only rename/remove `status` in a later migration if needed (probably never -- `status` is fine as-is)

This avoids the "rename existing column" anti-pattern that breaks every query referencing it.

**Detection:** Run `SELECT DISTINCT status FROM contracts` before and after migration to verify no data loss.

**Phase to address:** Contract lifecycle phase -- first migration step.

**Confidence:** HIGH -- standard migration practice.

### Pitfall 7: Parallel Pass Failures Producing Misleading Risk Scores

**What goes wrong:** When passes fail (network error, timeout, API rate limit), the current code creates a "Critical" severity finding for each failed pass. With 16 parallel passes, if 3-4 fail due to a transient rate limit hit, the risk score inflates dramatically because the scoring algorithm sees 3-4 Critical findings from "Analysis Pass Failed" entries.

**Why it happens:** The existing code in `mergePassResults` already creates Critical findings for failed passes. But the scoring function in `computeRiskScore` only skips findings whose title starts with `'Analysis Pass Failed:'` -- this works but is fragile (string matching on titles).

**Prevention:**
1. Add a `synthetic: true` field to error findings created by `mergePassResults`
2. Filter synthetic findings out of risk score computation explicitly (not by title matching)
3. When multiple passes fail, surface a single "Partial Analysis" warning instead of N Critical findings
4. Consider that parallel execution may hit Anthropic's RPM limit -- 16 simultaneous requests from a single function invocation could trigger rate limiting depending on tier

**Detection:** If risk scores jump to 80+ on contracts that previously scored 40-60, check for "Analysis Pass Failed" findings.

**Phase to address:** Parallelization phase -- part of restructuring the merge logic.

**Confidence:** HIGH -- verified in existing `scoring.ts` and `merge.ts` code.

### Pitfall 8: Date Intelligence Confusing AI-Extracted Dates with User-Set Lifecycle Dates

**What goes wrong:** The `contract_dates` table stores AI-extracted dates (from the dates-deadlines pass). Adding lifecycle dates (when status changed to Signed, when it became Active) to the same table creates a confusing mix of AI-generated and user-generated dates with no way to distinguish them.

**Prevention:** Add a `source` column to `contract_dates`: `'ai-extracted'` vs `'user-set'`. Or, if lifecycle dates are just timestamps on status transitions, store them differently -- as `signed_at`, `active_at` columns on the `contracts` table rather than as rows in `contract_dates`. The latter is simpler for a sole-user app.

**Detection:** Query `contract_dates` and check if lifecycle milestones (e.g., "Contract Signed") appear alongside AI-extracted dates like "Submittal Deadline" without distinction.

**Phase to address:** Contract lifecycle phase -- schema design decision.

**Confidence:** HIGH -- based on existing schema analysis.

### Pitfall 9: Anthropic Rate Limits Hit by 16 Concurrent Streaming Requests

**What goes wrong:** The current code fires 16 parallel streaming requests. Each streaming request holds an open connection for its entire duration (15-60s). Depending on the Anthropic API tier, this could exceed the requests-per-minute (RPM) limit. Tier 1 allows 50 RPM, Tier 2 allows 1000 RPM, Tier 3 allows 2000 RPM.

**Why it happens:** RPM is measured per minute, not per second. 16 requests in a burst is fine for Tier 2+ but could be problematic for Tier 1.

**Consequences:** 429 Too Many Requests errors on some passes. With `maxRetries: 0`, failed passes are not retried.

**Prevention:**
1. Check current API tier (visible in Anthropic Console dashboard)
2. For Tier 1: implement a concurrency limiter (e.g., p-limit with concurrency 4-6) to avoid burst rate limiting
3. For Tier 2+: 16 concurrent requests is well within limits
4. The undici Agent already has `connections: 20` which is appropriate for the connection pool

**Detection:** Check for 429 status codes in pass failure errors. Monitor `anthropic-ratelimit-requests-remaining` response header.

**Phase to address:** Parallelization phase -- add rate limit awareness.

**Confidence:** MEDIUM -- depends on specific API tier which varies per account.

### Pitfall 10: Portfolio Timeline Query Performance with Growing Data

**What goes wrong:** The dashboard date timeline currently fetches ALL contract_dates for ALL contracts in a single query (see `useContractStore` fetching all dates then stitching by contract). For portfolio-wide deadline tracking, this pattern works for 5-10 contracts but becomes slow at 50+ contracts with 10-20 dates each.

**Prevention:** For the portfolio timeline, query dates with a date range filter server-side: `supabase.from('contract_dates').select('*, contracts(name, lifecycle_status)').gte('date', today).lte('date', thirtyDaysFromNow)`. This requires a JOIN that the current RLS policies support (user_id on both tables). Consider adding an index on `contract_dates(date)`.

**Phase to address:** Date intelligence phase.

**Confidence:** MEDIUM -- sole user may never hit 50+ contracts, but the pattern should be correct from the start.

## Minor Pitfalls

### Pitfall 11: Token Tracking Table Schema Overdesign

**What goes wrong:** Creating a normalized schema with separate tables for `analysis_runs`, `pass_executions`, `token_usage` when a simple JSONB column on the contracts table (or a single `analysis_usage` table) would suffice for a sole-user app.

**Prevention:** Start with the simplest schema that works:
- Add `token_usage JSONB` column to `contracts` table containing: `{ totalInputTokens, totalOutputTokens, totalCost, perPass: [{ passName, inputTokens, outputTokens, cachedTokens, cost }] }`
- This aligns with the existing `pass_results JSONB` and `score_breakdown JSONB` patterns
- Only normalize into separate tables if you need to query across analyses (unlikely for sole user)

**Phase to address:** Token tracking phase -- schema decision.

**Confidence:** HIGH -- matches existing codebase patterns.

### Pitfall 12: Lifecycle Status UI Not Reflecting Analysis Status

**What goes wrong:** The existing UI uses `contract.status` to show "Analyzing" spinner, "Reviewed" badge, etc. Adding `lifecycle_status` without updating all status-dependent UI creates confusion -- a contract could be "Reviewed" (analysis done) but "Draft" (not yet signed), and the UI only shows one.

**Prevention:** Design the UI to show both dimensions:
- Analysis badge (small): Analyzing/Reviewed/Failed
- Lifecycle badge (prominent): Draft/Negotiating/Signed/Active
- The `SeverityBadge` component pattern already exists for color-coded badges
- Default new contracts to `lifecycle_status: null` and show "Set Status" prompt

**Phase to address:** Contract lifecycle phase -- UI implementation.

**Confidence:** HIGH -- based on existing UI component patterns.

### Pitfall 13: Cache TTL Mismatch Between Primer and Parallel Passes

**What goes wrong:** The default ephemeral cache TTL is 5 minutes. If the primer pass takes 20-25s and the parallel passes take another 30-60s, the cache is still fresh. But if anything delays the parallel passes (e.g., waiting for user confirmation, retry logic), the cache could expire between primer and parallel execution.

**Prevention:** Use the extended cache TTL: `cache_control: { type: 'ephemeral', ttl: '1h' }`. This is available on the Anthropic API and costs the same as the 5-minute cache. Since each analysis is a single serverless invocation, the 1-hour TTL provides a generous buffer at no additional cost.

**Phase to address:** Parallelization phase.

**Confidence:** MEDIUM -- TTL extension availability verified via docs, but `ttl: '1h'` support on the Files API beta endpoint needs validation.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Parallelization | Cache misses on concurrent requests (#1) | Two-stage pipeline: primer then parallel |
| Parallelization | Timeout budget with two stages (#4) | Per-pass AbortController timeouts at ~90s |
| Parallelization | Rate limit burst (#9) | Check API tier; add concurrency limiter for Tier 1 |
| Parallelization | Failed pass risk score inflation (#7) | Mark synthetic findings; single "Partial Analysis" warning |
| Token tracking | Lost usage in streaming (#2) | Capture message_start + message_delta events |
| Token tracking | Pricing drift (#5) | Config constant with verified-date comment |
| Token tracking | Schema overdesign (#11) | JSONB column on contracts, matching existing patterns |
| Contract lifecycle | State machine without transitions (#3) | Separate analysis_status from lifecycle_status |
| Contract lifecycle | Migration breaks existing data (#6) | Additive migration only, keep existing status column |
| Contract lifecycle | Mixed date sources (#8) | Source column or separate lifecycle timestamps |
| Contract lifecycle | UI status confusion (#12) | Show both analysis and lifecycle badges |
| Date intelligence | Query performance (#10) | Date range filter with index |

## Sources

- [Anthropic Prompt Caching Documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- HIGH confidence (concurrent request cache limitation)
- [Anthropic Streaming Messages Documentation](https://docs.anthropic.com/en/api/messages-streaming) -- HIGH confidence (message_start/message_delta event structure)
- [Anthropic Rate Limits Documentation](https://platform.claude.com/docs/en/api/rate-limits) -- HIGH confidence (tier-based RPM limits)
- [Anthropic Pricing Documentation](https://platform.claude.com/docs/en/about-claude/pricing) -- HIGH confidence (Sonnet token pricing, cache pricing)
- [Anthropic Usage & Cost API](https://docs.anthropic.com/en/api/usage-cost-api) -- MEDIUM confidence (organizational usage reporting)
- [Vercel Functions Timeout Documentation](https://vercel.com/docs/limits) -- HIGH confidence (maxDuration limits)
- [State Machines in Database Design](https://blog.lawrencejones.dev/state-machines/) -- MEDIUM confidence (transition validation patterns)
- Project codebase analysis (api/analyze.ts, api/merge.ts, api/scoring.ts, schema.sql) -- HIGH confidence
