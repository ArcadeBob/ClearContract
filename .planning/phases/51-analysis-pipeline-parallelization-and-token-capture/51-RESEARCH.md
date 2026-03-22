# Phase 51: Analysis Pipeline Parallelization and Token Capture - Research

**Researched:** 2026-03-21
**Domain:** Anthropic API streaming, prompt caching, AbortController patterns, Supabase schema design
**Confidence:** HIGH

## Summary

Phase 51 restructures the server-side analysis pipeline from "all 16 passes in parallel" to a two-stage cache pipeline (primer then 15 parallel), adds per-pass AbortController timeouts, progressive DB saves on global timeout, and captures streaming token usage into a new `analysis_usage` table.

The existing codebase is well-structured for this change. `runAnalysisPass()` already streams via `client.beta.messages.create({ stream: true })` with a `for await` event loop that only captures `content_block_delta` events today. Extending it to also capture `message_start` (which carries `BetaUsage` with all four token fields) and `message_delta` (which carries `BetaMessageDeltaUsage` with cumulative output_tokens) is straightforward. The `Promise.allSettled` pattern and `mergePassResults()` already handle partial results. The undici Agent is already configured with `connections: 20` for concurrency.

**Primary recommendation:** Restructure `api/analyze.ts` handler into primer-then-parallel stages, extend the streaming event loop to capture usage from `message_start`, wire per-pass AbortControllers via the SDK's `signal` option in `RequestOptions`, add a global 250s timeout with progressive save path, create the `analysis_usage` migration, and compute costs server-side before writing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- risk-overview is the primer pass -- sent first, alone, to create the Anthropic prompt cache
- Fire the remaining 15 passes immediately after the primer completes (no artificial delay)
- If the primer fails, abort the entire analysis -- don't waste API budget on passes that will likely fail too
- Synthesis pass (17th) stays sequential -- runs after all parallel passes complete and merge is done
- Each pass (including primer) gets its own AbortController with ~90s timeout
- Global safety timeout at ~250s aborts ALL in-flight passes, leaving ~50s for merge + DB writes + cleanup before Vercel's 300s hard kill
- Timed-out passes are dropped silently -- server logs the timeout, no finding inserted for the user
- API response remains 200 with whatever findings were collected, same as current Promise.allSettled behavior
- Normal path: wait for all parallel passes to settle, merge, run synthesis, then bulk-write (current pattern)
- Timeout path: when the 250s global timeout fires, abort in-flight passes, merge what's done, skip synthesis, write to DB with contract status set to 'Partial' (new status value) so the client knows analysis is incomplete
- Re-analyze keeps current delete-then-insert pattern
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Two-stage cache pipeline sends primer pass first, then 15 passes in parallel with cache hits | Anthropic prompt caching docs confirm: first request creates cache, subsequent requests within 5 min read from cache at 0.1x cost. SDK `cache_control: { type: 'ephemeral' }` already on the document block. Primer creates cache, parallel passes hit it. |
| PERF-02 | Each pass has individual AbortController timeout (~90s) instead of single 280s timeout | Anthropic SDK v0.78.0 `RequestOptions` accepts `signal?: AbortSignal`. Pass per-pass AbortController signal to `client.beta.messages.create()`. |
| PERF-03 | Completed pass results are progressively saved to DB, surviving function timeout | Global 250s timeout aborts in-flight passes, merges completed results, writes to DB with 'Partial' status. ~50s buffer before Vercel's 300s hard kill. |
| COST-01 | Streaming event loop captures input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens per pass | SDK types confirm: `message_start` event carries `BetaMessage.usage: BetaUsage` with all four fields. `message_delta` carries `BetaMessageDeltaUsage` with cumulative output_tokens. |
| COST-02 | Server computes per-pass and total cost using pricing constants and writes to analysis_usage table | New Supabase migration creates `analysis_usage` table. Cost formula: `(input * 3.00 + output * 15.00 + cache_creation * 3.75 + cache_read * 0.30) / 1_000_000`. |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.78.0 | Claude API client, streaming, Files API | Already installed; provides typed streaming events with usage fields |
| @supabase/supabase-js | (installed) | Database client for analysis_usage writes | Already used for all DB operations |
| undici | (installed) | Custom fetch with connection pooling | Already configured with 20-connection Agent |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.randomUUID() | Node built-in | Generate run_id per analysis run | No need for nanoid -- Node 18+ built-in suffices |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Independent AbortControllers per pass | Shared parent + per-pass children (AbortController composition) | Independent controllers are simpler -- no need for parent-child wiring. The global timeout just calls `abort()` on all controllers. Recommend independent. |
| Extending the existing stream loop | Wrapper function around `client.beta.messages.create()` | Wrapper function is cleaner -- encapsulates usage capture + text collection + timeout signal. Recommend wrapper. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Changes to api/analyze.ts

```
api/analyze.ts (restructured handler)
  1. Upload PDF (unchanged)
  2. Create run_id = crypto.randomUUID()
  3. Set up global timeout (250s AbortController)
  4. PRIMER STAGE: run risk-overview pass alone
     - If fails: abort, return error
     - Captures usage from streaming events
  5. PARALLEL STAGE: run remaining 15 passes concurrently
     - Each with independent 90s AbortController
     - Global timeout aborts all on fire
     - Promise.allSettled collects results
  6. MERGE: mergePassResults() (unchanged logic)
  7. SYNTHESIS: runSynthesisPass() (unchanged, skipped on timeout path)
  8. DB WRITE: bulk insert findings + dates + analysis_usage rows
     - Normal path: status = 'Reviewed'
     - Timeout path: status = 'Partial'
  9. Return response
```

### Pattern 1: Streaming Usage Capture Wrapper
**What:** A wrapper function that runs a single pass and returns both the parsed result AND token usage
**When to use:** Every call to `runAnalysisPass()` and `runSynthesisPass()`
**Example:**
```typescript
// Source: Anthropic SDK v0.78.0 type definitions (node_modules)
interface PassUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

// Inside the streaming event loop, capture usage:
for await (const event of response) {
  if (event.type === 'message_start') {
    // message_start carries BetaMessage with full usage
    const usage = event.message.usage;
    passUsage.inputTokens = usage.input_tokens;
    passUsage.cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
    passUsage.cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  }
  if (event.type === 'message_delta') {
    // message_delta carries cumulative output_tokens
    passUsage.outputTokens = event.usage.output_tokens ?? 0;
  }
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    responseText += event.delta.text;
  }
}
```

### Pattern 2: Per-Pass AbortController with Global Timeout
**What:** Independent AbortControllers per pass, plus a global timeout that aborts all
**When to use:** All pass execution
**Example:**
```typescript
// Source: Anthropic SDK RequestOptions.signal (internal/request-options.d.ts:56)
const passController = new AbortController();
const passTimeout = setTimeout(() => passController.abort(), 90_000);

try {
  const response = await client.beta.messages.create(
    { /* params */ stream: true },
    { signal: passController.signal }  // RequestOptions
  );
  // ... iterate stream
} finally {
  clearTimeout(passTimeout);
}

// Global timeout aborts all in-flight controllers:
const allControllers: AbortController[] = [];
const globalTimeout = setTimeout(() => {
  allControllers.forEach(c => c.abort());
}, 250_000);
```

### Pattern 3: Cost Computation
**What:** Compute cost_usd from token counts using hardcoded pricing constants
**When to use:** After each pass completes and usage is captured
**Example:**
```typescript
// Source: Anthropic pricing page, confirmed via CONTEXT.md decisions
const PRICING = {
  inputPerMillion: 3.00,
  outputPerMillion: 15.00,
  cacheWritePerMillion: 3.75,
  cacheReadPerMillion: 0.30,
} as const;

function computePassCost(usage: PassUsage): number {
  return (
    (usage.inputTokens * PRICING.inputPerMillion +
     usage.outputTokens * PRICING.outputPerMillion +
     usage.cacheCreationTokens * PRICING.cacheWritePerMillion +
     usage.cacheReadTokens * PRICING.cacheReadPerMillion) /
    1_000_000
  );
}
```

### Anti-Patterns to Avoid
- **Nested AbortController trees:** Don't build complex parent-child abort hierarchies. Independent controllers + a global timeout that iterates them is simpler and more debuggable.
- **Reading usage only from message_delta:** The `message_start` event carries all four input token fields (input, cache_creation, cache_read). The `message_delta` only carries cumulative output_tokens. You need both events.
- **Catching abort errors as failures:** When a pass is aborted by timeout, the error should be caught and the pass dropped silently (logged but no finding created). Do not treat it as a Critical "Pass Failed" finding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Node 18+ built-in, RFC 4122 compliant |
| Connection pooling | Manual connection management | undici Agent (already configured) | Already has `connections: 20` for peak concurrency |
| Streaming event parsing | Manual SSE parsing | SDK's `for await (const event of response)` | Already handles all event types with proper TypeScript types |
| Abort timeout cleanup | Manual tracking | `AbortController` + `setTimeout`/`clearTimeout` | Standard Web API, no external library needed |

**Key insight:** The Anthropic SDK v0.78.0 already provides fully typed streaming events with usage fields. The existing code's streaming loop just needs to capture two additional event types (`message_start` and `message_delta`).

## Common Pitfalls

### Pitfall 1: Cache not being created on primer pass
**What goes wrong:** Parallel passes don't show `cache_read_input_tokens`, defeating the purpose of the two-stage pipeline
**Why it happens:** Prompt cache requires minimum 1,024 tokens for Sonnet (the model in use). The document content attached via Files API `cache_control: { type: 'ephemeral' }` likely exceeds this (contracts are thousands of tokens). However, if the system prompt + document is below the threshold, no cache is created.
**How to avoid:** After the primer pass completes, check its usage: `cache_creation_input_tokens` should be non-zero. Log this value. If zero, the content was below the caching threshold (very unlikely for contracts but worth validating).
**Warning signs:** All 15 parallel passes show `cache_creation_input_tokens > 0` and `cache_read_input_tokens === 0`.

### Pitfall 2: Cache TTL expiry during long analysis
**What goes wrong:** If the primer pass takes 30-60s and the parallel passes take another 60-90s, total wall time could approach the 5-minute cache TTL. Late-finishing parallel passes might not get cache hits.
**Why it happens:** Default cache TTL is 5 minutes from creation. The parallel passes fire immediately after primer, so they start within ~60s. Each parallel pass starts its own API call, and the cache is checked at request start -- so even if the pass takes 90s to complete, the cache check happens at the beginning.
**How to avoid:** This is unlikely to be an issue in practice. The cache is checked when the request is received by Anthropic, not when it completes. All 15 parallel requests fire within milliseconds of each other, well within the 5-minute window. But log cache hit rates to validate empirically.
**Warning signs:** Late-starting passes (if something delays their launch) showing `cache_creation_input_tokens > 0`.

### Pitfall 3: AbortController abort during stream iteration
**What goes wrong:** Aborting mid-stream throws an `AbortError` that needs to be caught in the `for await` loop, or the promise rejects with an unhandled error.
**Why it happens:** The `for await (const event of response)` loop will throw when the underlying request is aborted.
**How to avoid:** Wrap the stream iteration in a try/catch that specifically catches abort errors. Check `error.name === 'AbortError'` or check the controller's `signal.aborted` property.
**Warning signs:** Unhandled promise rejections in Vercel function logs.

### Pitfall 4: Global timeout fires during DB write
**What goes wrong:** The 250s global timeout fires, aborts in-flight passes, but the merge + DB write takes longer than the remaining ~50s, and Vercel kills the function.
**Why it happens:** The merge itself is synchronous and fast (~ms). The DB writes involve network calls to Supabase. If Supabase is slow or there are many findings, writes could take 5-10s.
**How to avoid:** The 250s budget leaves 50s for merge + write + cleanup. This should be ample. But: don't run synthesis on the timeout path (already decided), and consider batching the analysis_usage inserts into a single `.insert([...rows])` call rather than individual inserts.
**Warning signs:** Vercel function timeout errors (504) despite the global timeout being in place.

### Pitfall 5: 'Partial' status not in DB CHECK constraint
**What goes wrong:** Inserting a contract with `status: 'Partial'` fails because the CHECK constraint only allows `'Analyzing' | 'Reviewed' | 'Draft'`.
**Why it happens:** The initial migration defined a restricted CHECK constraint.
**How to avoid:** The migration for this phase MUST alter the CHECK constraint to add 'Partial' before any pipeline code changes are deployed.
**Warning signs:** `23514` CHECK violation error on contract insert/update.

### Pitfall 6: Anthropic Tier 1 RPM limits with 16 concurrent requests
**What goes wrong:** 15 parallel requests + 1 recent primer request could hit Tier 1 rate limits (varies by plan).
**Why it happens:** Tier 1 typically allows 50 RPM for Sonnet. 16 requests from a single analysis run is fine, but if multiple users trigger analysis simultaneously, it could compound.
**How to avoid:** This is a single-user app per STATE.md context ("sole user"). 16 requests within a single run is well under 50 RPM. Log 429 responses to detect if this becomes an issue. The existing `maxRetries: 0` setting means rate-limited passes will fail and be dropped.
**Warning signs:** 429 errors in Vercel function logs during parallel execution.

## Code Examples

### Streaming Event Types (verified from SDK v0.78.0 type definitions)

```typescript
// Source: node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.d.ts

// message_start event (line 1168-1171):
interface BetaRawMessageStartEvent {
  message: BetaMessage;  // Contains .usage: BetaUsage
  type: 'message_start';
}

// BetaUsage (line 2000-2020):
interface BetaUsage {
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  input_tokens: number;
  output_tokens: number;
  // ... additional fields (cache_creation, inference_geo, etc.)
}

// message_delta event (line 1131-1156):
interface BetaRawMessageDeltaEvent {
  delta: { stop_reason: BetaStopReason | null; stop_sequence: string | null; };
  type: 'message_delta';
  usage: BetaMessageDeltaUsage;  // Cumulative output_tokens
}

// BetaMessageDeltaUsage (line 1010-1022):
interface BetaMessageDeltaUsage {
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number;  // NOT null -- always present
}

// RequestOptions signal (line 54-56 of internal/request-options.d.ts):
// signal?: AbortSignal | undefined | null;
```

### analysis_usage Table Migration

```sql
-- Migration: Add analysis_usage table and 'Partial' contract status

-- 1. Extend contracts.status CHECK constraint to include 'Partial'
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('Analyzing', 'Reviewed', 'Draft', 'Partial'));

-- 2. Create analysis_usage table
CREATE TABLE analysis_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  run_id uuid NOT NULL,
  pass_name text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cache_creation_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_analysis_usage_contract_id ON analysis_usage(contract_id);
CREATE INDEX idx_analysis_usage_user_id ON analysis_usage(user_id);
CREATE INDEX idx_analysis_usage_run_id ON analysis_usage(run_id);

-- 4. RLS
ALTER TABLE analysis_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis_usage"
  ON analysis_usage FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own analysis_usage"
  ON analysis_usage FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own analysis_usage"
  ON analysis_usage FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

### AbortController Signal Passing

```typescript
// Source: @anthropic-ai/sdk internal/request-options.d.ts line 56
// The SDK accepts signal in the second argument (RequestOptions)

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 90_000);

try {
  const response = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS_PER_PASS,
      betas: BETAS,
      stream: true,
      system: systemPrompt,
      messages: [/* ... */],
      output_config: { format: outputFormat },
    },
    { signal: controller.signal }  // RequestOptions -- second argument
  );

  for await (const event of response) {
    // ... capture events
  }
} finally {
  clearTimeout(timeout);
}
```

## State of the Art

| Old Approach (current) | New Approach (this phase) | Impact |
|------------------------|--------------------------|--------|
| All 16 passes fire in parallel with no cache priming | Primer pass first, then 15 parallel with cache hits | ~90% savings on input token cost for passes 2-16 |
| Single 280s SDK timeout for entire run | Per-pass 90s + global 250s timeouts | Individual slow passes don't block others |
| No usage tracking | Per-pass token + cost tracking in DB | Full cost visibility, cache hit verification |
| All-or-nothing DB write | Progressive save on timeout (Partial status) | Completed results survive function timeout |

## Open Questions

1. **Cache hit rate in practice**
   - What we know: Anthropic docs confirm cache is created on first request and read on subsequent requests within 5 min TTL. The document block already has `cache_control: { type: 'ephemeral' }`.
   - What's unclear: Whether the Files API `file_id` reference is cached in the same way as inline content. The primer and parallel passes all reference the same `file_id` -- this should produce cache hits because the prefix (system prompt varies but the document block is identical).
   - Recommendation: Log `cache_creation_input_tokens` and `cache_read_input_tokens` for every pass. The primer should show high `cache_creation_input_tokens`. Parallel passes should show high `cache_read_input_tokens`. If not, the file_id reference may not cache as expected and we'd need to investigate inline document embedding instead.

2. **System prompt variation across passes**
   - What we know: Each pass has a different system prompt. The cache breakpoint is on the document block in the user message (after the system prompt). Since the document is the same across all passes but the system prompt differs, the cache should still work because Anthropic caches the longest matching prefix.
   - What's unclear: The cache matches from the beginning of the request. If the system prompt is different, does that invalidate the cache of the document block?
   - Recommendation: Per Anthropic docs, the cache matches the longest prefix. Since the system prompt differs between passes, the cache of the system prompt won't match -- but the document block with `cache_control` set on it should still be cacheable IF the SDK/API treats the document (uploaded via Files API) as a separate cacheable unit. **This needs empirical validation.** Log all token fields on first real analysis run.

3. **Beta streaming TypeScript types completeness**
   - What we know: SDK v0.78.0 types show `BetaUsage.cache_creation_input_tokens: number | null` and `BetaUsage.cache_read_input_tokens: number | null` -- both nullable.
   - What's unclear: Whether these fields are always populated in practice or sometimes undefined (despite the type saying `null`).
   - Recommendation: Use nullish coalescing (`?? 0`) when reading these fields. Already planned.

## Validation Architecture

> nyquist_validation not explicitly set to false in config.json. Including section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Primer runs first, then 15 parallel; parallel passes show cache_read tokens | manual-only | Deploy and analyze a real contract; check server logs for cache_read_input_tokens on passes 2-16 | N/A |
| PERF-02 | Per-pass AbortController fires at ~90s, dropping slow passes | manual-only | Hard to simulate in automated test without mocking Anthropic API | N/A |
| PERF-03 | On 250s global timeout, completed results are saved with 'Partial' status | manual-only | Requires real slow API responses or mock; verify DB row with status='Partial' | N/A |
| COST-01 | Streaming events capture all four token fields per pass | manual-only | Analyze a contract; verify analysis_usage rows have non-zero token counts | N/A |
| COST-02 | Cost computed correctly per pass | unit | Cost computation is a pure function -- testable without API calls | N/A -- Wave 0 |

### Sampling Rate
- **Per task commit:** Manual verification via `vercel dev` + real contract upload
- **Per wave merge:** Full analysis run with server log review
- **Phase gate:** Successful analysis with all 17 usage rows written and cache hits on passes 2-16

### Wave 0 Gaps
- No test framework configured -- COST-02 cost computation function is the only unit-testable piece
- All other requirements require integration with Anthropic API and are manual-only validation
- Consider: a simple Node script that validates the cost computation formula if desired

## Sources

### Primary (HIGH confidence)
- Anthropic SDK v0.78.0 type definitions -- `node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.d.ts` -- verified `BetaUsage`, `BetaMessageDeltaUsage`, `BetaRawMessageStartEvent`, `BetaRawMessageDeltaEvent` interfaces and `RequestOptions.signal`
- [Anthropic Prompt Caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- cache TTL (5 min default), pricing multipliers (0.1x read, 1.25x write), minimum token thresholds (1,024 for Sonnet), usage field meanings
- Existing codebase: `api/analyze.ts`, `api/passes.ts`, `api/merge.ts`, `api/pdf.ts` -- current pipeline structure, streaming patterns, DB write patterns

### Secondary (MEDIUM confidence)
- Anthropic pricing for Claude Sonnet: $3.00/M input, $15.00/M output, $3.75/M cache write, $0.30/M cache read -- confirmed via [official docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) pricing table

### Tertiary (LOW confidence)
- Cache behavior with Files API `file_id` references -- docs confirm documents in `messages.content` are cacheable, but specific behavior when the system prompt varies across passes while the document block stays identical needs empirical validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified from installed SDK types
- Architecture: HIGH -- extending well-understood existing patterns (streaming, Promise.allSettled, Supabase writes)
- Pitfalls: HIGH -- AbortController, cache TTL, CHECK constraints are well-documented patterns
- Cache behavior with Files API: MEDIUM -- docs support it but cross-pass caching with different system prompts needs empirical validation

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- Anthropic SDK and caching APIs are GA)
