# Architecture Patterns

**Domain:** Analysis parallelization, token/cost tracking, contract lifecycle management
**Researched:** 2026-03-21

## Current Architecture Snapshot

The existing system follows a clean pipeline: client uploads PDF, single serverless function (`api/analyze.ts`, ~560 lines) runs 16 parallel passes via `Promise.allSettled`, merges results in `api/merge.ts`, runs a 17th synthesis pass, writes everything to Supabase, and returns the complete `Contract` object.

Key architectural facts that constrain the new features:

- **Passes already run in parallel** via `Promise.allSettled` (line 383-387 of analyze.ts). Parallelization is DONE at the API call level. The undici Agent already has `connections: 20` for 16 parallel API calls.
- **Token usage is discarded.** The streaming loop (lines 140-148) only captures `content_block_delta` text -- it ignores `message_start` (which carries `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) and `message_delta` (which carries cumulative `output_tokens`).
- **No lifecycle status beyond `Analyzing | Reviewed | Draft`** in the DB CHECK constraint.
- **Contract dates are flat records** with label/date/type -- no intelligence layer computes urgency or cross-contract timelines.
- **Vercel Pro 300s timeout** is the hard ceiling. Current parallel execution fits within this.
- **The `analysis_usage` concept does not exist** -- no table, no types, no tracking at all.

## Recommended Architecture

### High-Level Data Flow Changes

```
BEFORE:
  Client -> POST /api/analyze -> [16 parallel passes] -> merge -> synthesis -> Supabase -> Response

AFTER:
  Client -> POST /api/analyze -> [16 parallel passes WITH token capture] -> merge -> synthesis
         -> compute costs -> Supabase (contracts + findings + dates + analysis_usage) -> Response

  Dashboard reads analysis_usage for cost display
  Lifecycle status updated via client PATCH to Supabase (no server endpoint needed)
  Date intelligence computed client-side from contract_dates across portfolio
```

### Component Boundaries

| Component | Responsibility | New/Modified | Communicates With |
|-----------|---------------|--------------|-------------------|
| `api/analyze.ts` | Orchestrate analysis, capture token usage per pass | **Modified** | Anthropic API, Supabase, merge.ts |
| `runAnalysisPass()` | Execute single pass, return result + usage | **Modified** | Anthropic streaming API |
| `runSynthesisPass()` | Execute synthesis, return result + usage | **Modified** | Anthropic streaming API |
| `api/merge.ts` | Merge pass results, compute risk score | Unchanged | scoring.ts |
| `analysis_usage` table | Store per-contract token/cost data | **New (DB)** | Supabase |
| `src/types/contract.ts` | Contract type + AnalysisUsage type | **Modified** | All client code |
| `useContractStore.ts` | Load contracts + usage data | **Modified** | Supabase |
| `TokenUsageDisplay` component | Show per-contract and per-pass costs | **New (client)** | ContractReview page |
| `PortfolioUsageStats` component | Aggregate cost stats on Dashboard | **New (client)** | Dashboard page |
| `LifecycleStatusSelect` component | Dropdown to change contract lifecycle status | **New (client)** | ContractReview, AllContracts |
| `PortfolioTimeline` component | Cross-contract deadline view on Dashboard | **New (client)** | Dashboard page |

### Data Flow Detail

#### 1. Token Capture (Server)

The streaming loop in `runAnalysisPass` must be extended to capture usage events. The Anthropic streaming API sends usage in two event types:

- `message_start` contains `message.usage` with `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
- `message_delta` contains `usage` with cumulative `output_tokens`

**Confidence: HIGH** -- verified against [Anthropic Streaming Messages docs](https://platform.claude.com/docs/en/api/messages-streaming). The docs confirm: "The token counts shown in the usage field of the message_delta event are cumulative."

The current streaming loop structure:

```typescript
// Current: only captures text (lines 140-148 of analyze.ts)
for await (const event of response) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    responseText += event.delta.text;
  }
}
```

Extended to capture usage:

```typescript
interface PassUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

let usage: PassUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
};

for await (const event of response) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    responseText += event.delta.text;
  }
  if (event.type === 'message_start') {
    const u = (event as any).message?.usage;
    if (u) {
      usage.inputTokens = u.input_tokens ?? 0;
      usage.cacheCreationInputTokens = u.cache_creation_input_tokens ?? 0;
      usage.cacheReadInputTokens = u.cache_read_input_tokens ?? 0;
    }
  }
  if (event.type === 'message_delta') {
    const u = (event as any).usage;
    if (u) {
      usage.outputTokens = u.output_tokens ?? 0;
    }
  }
}

return { passName: pass.name, result: parsed, usage };
```

**Note on types:** The current code uses `client.beta.messages.create({ stream: true })` which returns a beta streaming type. The `message_start` and `message_delta` events may not be fully typed for usage fields in the beta namespace. Use defensive access (`(event as any).message?.usage`) and test with a real API call to confirm field presence. The non-beta SDK types DO include these fields, so this is a beta typing gap, not a feature gap.

The return type of `runAnalysisPass` changes from `{ passName, result }` to `{ passName, result, usage }`. Same pattern applies to `runSynthesisPass`.

#### 2. Cost Computation (Server)

After all passes complete, aggregate usage and compute cost:

```typescript
// Pricing constants (Claude Sonnet 4.5 as of 2025-09)
const PRICING = {
  model: 'claude-sonnet-4-5-20250929',
  inputPerMillion: 3.00,
  outputPerMillion: 15.00,
  cacheWritePerMillion: 3.75,   // 1.25x input
  cacheReadPerMillion: 0.30,    // 0.1x input
};

function computeCost(usage: PassUsage): number {
  return (
    (usage.inputTokens / 1_000_000) * PRICING.inputPerMillion +
    (usage.outputTokens / 1_000_000) * PRICING.outputPerMillion +
    (usage.cacheCreationInputTokens / 1_000_000) * PRICING.cacheWritePerMillion +
    (usage.cacheReadInputTokens / 1_000_000) * PRICING.cacheReadPerMillion
  );
}
```

**Confidence: HIGH** -- pricing verified against [Anthropic Pricing page](https://platform.claude.com/docs/en/about-claude/pricing): Sonnet 4.5 is $3/$15 per million tokens, cache write 1.25x base, cache read 0.1x base.

Cost is computed server-side (pricing constants live in server code, not exposed to client). The total and per-pass breakdown are written to Supabase alongside the contract.

#### 3. DB Schema Addition

```sql
-- analysis_usage: Token usage and cost tracking per contract analysis
create table analysis_usage (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  model text not null,                    -- 'claude-sonnet-4-5-20250929'
  total_input_tokens integer not null,
  total_output_tokens integer not null,
  total_cache_creation_tokens integer not null default 0,
  total_cache_read_tokens integer not null default 0,
  total_cost_usd numeric(10,6) not null,  -- e.g., 0.042300
  pass_usage jsonb not null,              -- Array of { passName, inputTokens, outputTokens, cacheCreation, cacheRead, costUsd }
  analysis_duration_ms integer not null,  -- Total wall-clock time
  created_at timestamptz not null default now()
);

create index idx_analysis_usage_contract_id on analysis_usage(contract_id);
create index idx_analysis_usage_user_id on analysis_usage(user_id);

alter table analysis_usage enable row level security;

create policy "Users can view own analysis_usage"
  on analysis_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Server writes only -- no client insert/update/delete policies needed
-- service_role key bypasses RLS for server writes
```

**Why a separate table instead of a JSONB column on `contracts`:**

- **Re-analyze creates new usage records** -- each analysis attempt is a distinct cost event. With a column, you lose history on re-analyze.
- **Portfolio aggregation queries** are simpler: `SELECT SUM(total_cost_usd) FROM analysis_usage WHERE user_id = $1`.
- **Separation of concerns** -- contracts table stays focused on contract data, not operational metrics.

#### 4. Contract Lifecycle Status

Extend the `contracts.status` CHECK constraint:

```sql
-- Migration: Add lifecycle statuses
ALTER TABLE contracts DROP CONSTRAINT contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('Analyzing', 'Reviewed', 'Draft', 'Negotiating', 'Signed', 'Active', 'Expired', 'Archived'));
```

Status flow:
```
Upload -> Analyzing -> Reviewed -> [User sets lifecycle status]
                                    |
                                    v
                        Negotiating -> Signed -> Active -> Expired
                                                   |
                                                   v
                                               Archived
```

`Analyzing` and `Reviewed` are set by the server (analysis pipeline). All other statuses are set by the user via a dropdown on the contract review page. This is a simple optimistic update to Supabase via the existing `updateContract` store pattern -- no new API endpoint needed.

The `Contract` type's `status` field expands:

```typescript
status: 'Analyzing' | 'Reviewed' | 'Draft' | 'Negotiating' | 'Signed' | 'Active' | 'Expired' | 'Archived';
```

#### 5. Date Intelligence (Client-Side)

Date intelligence is computed client-side from existing `contract_dates` data. No new DB columns needed. The existing `ContractDate` type (`{ label, date, type }`) already has what is needed.

Portfolio timeline aggregates dates across all contracts with urgency computation:

```typescript
interface TimelineEntry {
  contractId: string;
  contractName: string;
  date: ContractDate;
  urgency: 'overdue' | 'imminent' | 'upcoming' | 'future';
  daysUntil: number;
}
```

Dashboard already has a `getDateUrgency()` function (Dashboard.tsx lines 17-38) that computes urgency bands (today, 7 days, 30 days). Extract this to a shared utility and reuse for the portfolio timeline.

## Patterns to Follow

### Pattern 1: Usage Accumulator

Extend the existing streaming pattern with a thin accumulator that captures both text and usage without changing the streaming architecture.

**What:** Add usage capture alongside existing text capture in the streaming loop.
**When:** Every `runAnalysisPass` and `runSynthesisPass` call.
**Why this over alternatives:** The SDK's `.stream()` helper method has a `.finalMessage()` that returns the complete Message with usage. However, the current code uses `client.beta.messages.create({ stream: true })` with manual event iteration (not the SDK's `.stream()` helper). This is because the code needs the `betas` parameter for Files API support. Changing to `.stream()` would require verifying beta API compatibility. Instead, capture events inline -- minimal diff, same streaming behavior, zero risk to existing pipeline.

### Pattern 2: Optimistic Status Update

Same pattern as existing `renameContract`, `toggleFindingResolved`:

```typescript
const updateContractStatus = async (id: string, status: ContractStatus) => {
  const prev = [...contracts];
  setContracts(cs => cs.map(c => c.id === id ? { ...c, status } : c));

  const { error } = await supabase.from('contracts').update({ status }).eq('id', id);
  if (error) {
    setContracts(prev);
    showToast({ type: 'error', message: 'Failed to update status.' });
  }
};
```

**What:** Optimistic UI update with rollback on failure.
**When:** Lifecycle status changes.
**Why:** Consistent with all existing mutation patterns in `useContractStore`.

### Pattern 3: Extracted Computation Utility

**What:** Move `getDateUrgency()` from Dashboard.tsx to `src/utils/dates.ts` for reuse.
**When:** Portfolio timeline and per-contract date intelligence both need urgency bands.
**Why:** DRY principle -- the function already exists and is tested via Dashboard component tests, just needs extraction.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Sent Events for Progress

**What:** Adding SSE/WebSocket to stream per-pass progress to the client during analysis.
**Why bad:** Vercel serverless functions do not support long-lived SSE responses (the response must complete in one shot). The 300s timeout is the ceiling. The existing `AnalysisProgress` component shows an indeterminate spinner, which is adequate for a sole-user tool.
**Instead:** If progress feedback is desired later, use Supabase Realtime subscriptions (server writes progress rows, client subscribes). But this is out of scope for v2.2.

### Anti-Pattern 2: Token Tracking in a Separate API Endpoint

**What:** Creating `/api/usage` to separately log token usage after analysis completes.
**Why bad:** Race condition risk (usage write could fail silently), extra network round-trip, more code to maintain.
**Instead:** Write usage in the same handler as the contract write in `api/analyze.ts`, in sequence after findings/dates are written.

### Anti-Pattern 3: Lifecycle Status as a Separate Table

**What:** Creating a `contract_lifecycle` table with status history/audit trail.
**Why bad:** Over-engineering for a sole user. The user needs current status, not audit trail. Adding a history table means more joins, more RLS policies, more complexity.
**Instead:** Just expand the CHECK constraint on `contracts.status`. If history is ever needed, add it then.

### Anti-Pattern 4: Server-Computed Date Intelligence

**What:** Adding a Vercel cron job or Supabase function to compute upcoming deadlines.
**Why bad:** The dataset is tiny (sole user, dozens of contracts at most). Client-side computation over the already-loaded `contract_dates` is instant and avoids infrastructure complexity.
**Instead:** Pure client-side computation in a utility function.

### Anti-Pattern 5: Caching Pricing in Database

**What:** Storing pricing tiers in a `pricing` table or `api_models` table to make pricing dynamic.
**Why bad:** Over-engineering. Anthropic changes pricing rarely. When they do, you update one constant object in server code. A database table adds migration overhead for a value that changes once or twice a year.
**Instead:** Hardcoded `PRICING` object in `api/analyze.ts` with a comment noting the source and date.

## Integration Points: New vs Modified

### New Files

| File | Type | Purpose |
|------|------|---------|
| `supabase/migrations/XXXXXX_add_analysis_usage.sql` | Migration | Create `analysis_usage` table + indexes + RLS |
| `supabase/migrations/XXXXXX_expand_contract_status.sql` | Migration | Expand status CHECK constraint |
| `src/types/usage.ts` | Type | `AnalysisUsage`, `PassUsage`, `TimelineEntry` types |
| `src/utils/dates.ts` | Utility | Extracted `getDateUrgency()` + `buildPortfolioTimeline()` |
| `src/utils/costs.ts` | Utility | Client-side cost formatting (`$0.04`, `12.3K tokens`) |
| `src/components/TokenUsageDisplay.tsx` | Component | Per-contract cost breakdown (pass-by-pass table) |
| `src/components/LifecycleStatusSelect.tsx` | Component | Dropdown for contract lifecycle status |
| `src/components/PortfolioTimeline.tsx` | Component | Cross-contract deadline timeline on Dashboard |

### Modified Files

| File | Change | Risk |
|------|--------|------|
| `api/analyze.ts` | Capture usage from streaming events, aggregate costs, write to `analysis_usage` table, include usage in response | **Medium** -- core pipeline change, but additive (new event handling in existing loop, new DB write after existing writes) |
| `src/types/contract.ts` | Expand `Contract.status` union type with lifecycle statuses | **Low** -- additive type change, but must update all switch/if chains that match on status |
| `src/hooks/useContractStore.ts` | Load `analysis_usage` alongside contracts; add `updateContractStatus()` method | **Low** -- follows existing patterns exactly |
| `src/pages/ContractReview.tsx` | Add `TokenUsageDisplay` and `LifecycleStatusSelect` to review header area | **Low** -- additive UI |
| `src/pages/Dashboard.tsx` | Replace inline `getDateUrgency()` with import from utils; add `PortfolioTimeline` section; add cost stat card | **Low** -- extract + add |
| `src/pages/AllContracts.tsx` | Show lifecycle status badge on contract cards; add status filter dropdown | **Low** -- additive |
| `src/components/ContractCard.tsx` | Show lifecycle status badge | **Low** -- additive |
| `src/components/ReviewHeader.tsx` | Accommodate lifecycle status dropdown | **Low** -- layout adjustment |

### Files NOT Changed

- `api/passes.ts` -- pass definitions unchanged (pass names, prompts, schemas)
- `api/merge.ts` -- merge logic unchanged (usage is tracked separately from findings)
- `api/scoring.ts` -- scoring unchanged
- `api/pdf.ts` -- PDF handling unchanged
- `src/api/analyzeContract.ts` -- client API wrapper unchanged (response shape expands but Contract type change handles it)
- `src/components/Sidebar.tsx` -- no new views needed
- `src/schemas/*` -- analysis schemas unchanged

## Suggested Build Order

The build order is driven by dependencies and testability:

### Phase 1: Token/Cost Tracking (Server Foundation)

**Why first:** This is the riskiest change (modifying the core analysis pipeline). Get it right before layering UI on top.

1. **DB migration: `analysis_usage` table** -- Create table, indexes, RLS policies. Run migration against Supabase.
2. **Define `PassUsage` interface** in a shared location (e.g., new file `api/usage.ts` or inline in analyze.ts).
3. **Modify `runAnalysisPass()` return type** -- Add `usage: PassUsage` to return value. Capture `message_start` and `message_delta` events in the streaming loop. The function signature changes from `Promise<{ passName, result }>` to `Promise<{ passName, result, usage }>`.
4. **Modify `runSynthesisPass()` return type** -- Same usage capture pattern.
5. **Add cost computation** -- `PRICING` constants + `computeCost()` function in analyze.ts.
6. **Modify handler** -- After `mergePassResults`, extract usage from each `settledResult.value.usage`, aggregate totals, compute per-pass and total cost, write `analysis_usage` row after contract/findings/dates writes.
7. **Include usage in response** -- Add `analysisUsage` field to the JSON response so the client can display it immediately without a second fetch.

**Test:** Run a real analysis via `vercel dev` and verify: (a) `analysis_usage` row created with plausible token counts; (b) existing contract/findings/dates data unchanged; (c) all existing tests still pass (usage capture is additive).

### Phase 2: Token/Cost Tracking (Client Display)

**Why second:** Depends on Phase 1 data being available in the response and DB.

8. **Create `src/types/usage.ts`** -- Define `AnalysisUsage`, `PassUsageDetail` client types.
9. **Create `src/utils/costs.ts`** -- Formatting: `formatCost(0.042) -> "$0.04"`, `formatTokens(12345) -> "12.3K"`, `formatCacheRate(creation, read, total) -> "85% cache hit"`.
10. **Modify `useContractStore.ts`** -- Fetch `analysis_usage` in the initial load (4th parallel query alongside contracts, findings, dates). Stitch `analysisUsage` onto Contract objects. For contracts without usage data (pre-v2.2 contracts), field is `undefined`.
11. **Create `TokenUsageDisplay` component** -- Collapsible panel showing: total cost, per-pass breakdown table (pass name, input tokens, output tokens, cache hit rate, cost), total duration, model name.
12. **Add to `ContractReview.tsx`** -- Show usage display in a collapsible section below the review header, only when `analysisUsage` is present.
13. **Add portfolio cost stats to Dashboard** -- New stat card: "Total API Cost" with aggregate cost, average cost per contract.

### Phase 3: Contract Lifecycle Status

**Why third:** Independent of token tracking, simpler than date intelligence. Must come before date intelligence because urgency filtering benefits from knowing which contracts are Active.

14. **DB migration: expand status CHECK** -- Drop and recreate CHECK constraint with new values.
15. **Update `Contract.status` type** -- Expand union type in `src/types/contract.ts`.
16. **Audit all status consumers** -- Search for `'Reviewed'`, `'Analyzing'`, `'Draft'`, `status ===`, `status in` across codebase. Update any conditional logic that assumes only 3 statuses (e.g., Dashboard stats filter, ContractCard status badge).
17. **Create `LifecycleStatusSelect` component** -- Dropdown with color-coded options. Only shows lifecycle statuses (not `Analyzing`). Disabled while contract is in `Analyzing` state.
18. **Add `updateContractStatus()` to store** -- Optimistic update pattern (identical to `renameContract`).
19. **Add to `ContractReview.tsx`** -- Status dropdown in review header area.
20. **Add status badge to `ContractCard.tsx`** and `AllContracts.tsx` -- Color-coded lifecycle badge.
21. **Add status filter to `AllContracts.tsx`** -- Multi-select filter (same pattern as existing severity/category filters).

### Phase 4: Date Intelligence and Portfolio Timeline

**Why last:** Builds on lifecycle status (urgency matters more for Active contracts), purely additive, lowest risk.

22. **Extract `src/utils/dates.ts`** -- Move `getDateUrgency()` from Dashboard.tsx. Add `buildPortfolioTimeline()` that aggregates dates across contracts, computes urgency, sorts by proximity.
23. **Create `PortfolioTimeline` component** -- Grouped by urgency band (overdue, this week, this month, later). Each entry shows contract name, date label, date value, urgency indicator. Clickable to navigate to contract.
24. **Add to Dashboard** -- Replace inline date urgency logic with imported utility. Add PortfolioTimeline section (above or below the existing upcoming deadlines section).
25. **Add tests** -- Unit tests for `getDateUrgency()` and `buildPortfolioTimeline()` utilities. Component tests for `TokenUsageDisplay`, `LifecycleStatusSelect`, `PortfolioTimeline`.

## Scalability Considerations

| Concern | Current (1 user, <50 contracts) | At 100 contracts | At 1000 contracts |
|---------|----------------------------------|-------------------|-------------------|
| Token tracking data volume | ~1 row per analysis, JSONB for pass detail | No concern | No concern -- analysis_usage is append-only, tiny rows |
| Portfolio timeline computation | Instant (client-side filter/sort) | Instant | May need to limit to Active/Negotiating contracts only |
| Contract store load | 3 parallel queries (contracts, findings, dates) | Add 4th for analysis_usage -- still fast | May need pagination on contracts list |
| Analysis cost per contract | ~$0.03-0.08 estimated (shared cache across 16 passes) | Cumulative tracking becomes important | Budget alerts could be useful (future feature) |
| Lifecycle status queries | Simple equality filter | Index on status if filtering becomes slow | Add `idx_contracts_status` |

## Confidence Assessment

| Decision | Confidence | Rationale |
|----------|------------|-----------|
| Usage capture via streaming events | **HIGH** | Anthropic docs confirm `message_start` and `message_delta` carry usage fields |
| Beta streaming type gap | **MEDIUM** | The `client.beta.messages.create({ stream: true })` may not have full TypeScript types for usage in `message_start`/`message_delta`. May need `as any` access. Must verify with actual API call |
| Separate `analysis_usage` table | **HIGH** | Standard pattern, avoids column bloat, supports re-analyze history |
| Client-side date intelligence | **HIGH** | Dataset is tiny, computation is trivial, avoids server infrastructure |
| Lifecycle status via CHECK expansion | **HIGH** | Simplest approach, consistent with existing schema pattern |
| Pricing constants hardcoded server-side | **MEDIUM** | Prices change infrequently; works for now, could externalize to env vars if needed |
| Cache behavior with Files API | **MEDIUM** | The `cache_control: { type: 'ephemeral' }` on the document block should produce cache hits across the 16 parallel passes for the same file. Actual cache behavior depends on Anthropic's caching implementation. Token tracking will reveal actual cache hit rates |

## Sources

- [Anthropic Streaming Messages API](https://platform.claude.com/docs/en/api/messages-streaming) -- Event types, usage fields in `message_start` and `message_delta`, cumulative token counts
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Sonnet 4.5: $3/$15 per million tokens, cache write 1.25x, cache read 0.1x
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages) -- Usage object structure with cache token fields
- Existing codebase analysis: `api/analyze.ts` (streaming loop lines 140-148, parallel execution lines 383-387), `api/merge.ts`, `api/passes.ts`, `api/pdf.ts`, `api/scoring.ts`
- Existing DB schema: `supabase/migrations/00000000000000_initial_schema.sql`
- Existing client: `src/hooks/useContractStore.ts` (mutation patterns), `src/pages/Dashboard.tsx` (date urgency logic)
