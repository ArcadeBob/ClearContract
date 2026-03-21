# Technology Stack

**Project:** ClearContract v2.2 -- Analysis Parallelization, Token/Cost Tracking, Contract Lifecycle & Date Intelligence
**Researched:** 2026-03-21

## Executive Summary

v2.2 requires **zero new npm dependencies**. All three features build on capabilities already present in the existing stack:

1. **Analysis parallelization** -- Already implemented via `Promise.allSettled` (line 383 of `api/analyze.ts`). The work is about capturing per-pass timing and handling concurrency limits, not adding libraries.
2. **Token/cost tracking** -- The Anthropic SDK streaming events already emit `usage` data in `message_start` and `message_delta` events. The current code ignores these events. Capturing them requires only code changes to `runAnalysisPass` and `runSynthesisPass`, plus a new Supabase table.
3. **Contract lifecycle & date intelligence** -- Requires a schema migration (new status values, new columns) and client-side UI. No new libraries needed; native `Date` operations already handle all date math in the codebase.

## Recommended Stack

### No New Dependencies

| Category | Decision | Rationale |
|----------|----------|-----------|
| Parallelization | Native `Promise.allSettled` | Already in use. No orchestration library needed for 16 concurrent API calls. |
| Token tracking | `@anthropic-ai/sdk` ^0.78.0 (existing) | Streaming events already contain `usage` fields; we just need to capture them. |
| Cost calculation | Pure TypeScript constants | Pricing is a lookup table ($3/$15 per MTok for sonnet-4.5). No SDK or service needed. |
| Date intelligence UI | Native `Date` + existing Tailwind | Current codebase already does date diff, sorting, urgency coloring. Extend, don't replace. |
| Date formatting | `Intl.DateTimeFormat` (browser built-in) | Already used via `toLocaleDateString`. No date-fns/dayjs needed. |
| Database schema | Supabase Postgres (existing) | New migration file for `analysis_usage` table and `contracts.lifecycle_status` column. |
| Lifecycle state machine | Pure TypeScript enum + transition map | 4 states, 5 transitions. State machine libraries are overkill. |

### Existing Stack (Unchanged)

| Technology | Version | Purpose |
|------------|---------|---------|
| @anthropic-ai/sdk | ^0.78.0 | Claude API -- streaming usage data available in existing events |
| @supabase/supabase-js | ^2.99.2 | Postgres + Auth -- new tables via migration |
| React 18 | ^18.3.1 | UI framework |
| TypeScript | ^5.5.4 | Type safety |
| Vite | ^5.2.0 | Build tool |
| Tailwind CSS | 3.4.17 | Styling |
| Zod | ^3.25.76 | Schema validation |
| Vitest | ^3.2.4 | Testing |
| Framer Motion | ^11.5.4 | Animations |
| undici | ^7.22.0 | HTTP client with configurable timeouts |

## Feature-Specific Technical Details

### 1. Analysis Parallelization (Already Done -- Enhance Only)

**Current state:** `api/analyze.ts` line 383 already runs all 16 passes via `Promise.allSettled`. The undici Agent is configured with `connections: 20` to handle peak concurrency.

**What to add:**
- Per-pass timing: wrap each `runAnalysisPass` call with `Date.now()` bookends
- Per-pass status tracking: the `passResults` array already captures success/failed -- extend with `durationMs` and `usage` fields
- Concurrency awareness: the existing 20-connection pool is sufficient. Anthropic's rate limits (not connection pool) are the real constraint. No `p-limit` or similar needed.

**What NOT to add:**
- `p-limit` / `p-queue` -- unnecessary; Anthropic's API handles backpressure via 429s, and the SDK's `maxRetries: 0` means we fail fast. The 300s Vercel timeout is the real constraint, not local concurrency.
- Worker threads -- API calls are I/O bound, not CPU bound. Node's event loop handles 16 concurrent HTTP streams efficiently.

### 2. Token/Cost Tracking

**How the Anthropic SDK streaming exposes usage data:**

The `client.beta.messages.create({ stream: true })` call returns an async iterable of SSE events. The current code only captures `content_block_delta` events. Two additional event types contain usage data:

```
message_start event:
  message.usage.input_tokens: number    // Total input tokens for this request
  message.usage.output_tokens: number   // Initially 1 (placeholder)
  message.usage.cache_creation_input_tokens?: number
  message.usage.cache_read_input_tokens?: number

message_delta event:
  usage.output_tokens: number           // Cumulative output tokens (final count)
```

**Confidence: HIGH** -- Verified from official Anthropic streaming docs at https://platform.claude.com/docs/en/build-with-claude/streaming. The `message_start` event contains `input_tokens` and the `message_delta` event contains the final cumulative `output_tokens`.

**Implementation approach:**

Modify `runAnalysisPass` to capture usage from streaming events:

```typescript
// In the for-await loop, add:
let inputTokens = 0;
let outputTokens = 0;
let cacheCreationTokens = 0;
let cacheReadTokens = 0;

for await (const event of response) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    responseText += event.delta.text;
  } else if (event.type === 'message_start') {
    inputTokens = event.message.usage.input_tokens;
    cacheCreationTokens = event.message.usage.cache_creation_input_tokens ?? 0;
    cacheReadTokens = event.message.usage.cache_read_input_tokens ?? 0;
  } else if (event.type === 'message_delta') {
    outputTokens = event.usage.output_tokens;
  }
}
```

**Note on beta streaming types:** The current code uses `client.beta.messages.create` (not `client.messages.stream`) because it needs the Files API beta. The beta streaming response emits the same SSE event types (`message_start`, `content_block_delta`, `message_delta`, `message_stop`). The TypeScript types for beta events may require type narrowing or casting -- verify during implementation.

**Cost calculation -- hardcoded constants, not an API call:**

| Model | Input (per MTok) | Output (per MTok) | Cache Write (per MTok) | Cache Read (per MTok) |
|-------|-------------------|--------------------|------------------------|-----------------------|
| claude-sonnet-4-5-20250929 | $3.00 | $15.00 | $3.75 (1.25x input) | $0.30 (0.1x input) |

**Confidence: HIGH** -- Verified from Anthropic pricing page. These are stable rates (unchanged since model launch Sep 2025).

Store as TypeScript constants:

```typescript
const PRICING = {
  'claude-sonnet-4-5-20250929': {
    inputPerMTok: 3.00,
    outputPerMTok: 15.00,
    cacheWritePerMTok: 3.75,
    cacheReadPerMTok: 0.30,
  }
} as const;
```

**Database schema for usage tracking:**

New `analysis_usage` table:

```sql
create table analysis_usage (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  pass_name text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_creation_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_analysis_usage_contract_id on analysis_usage(contract_id);
create index idx_analysis_usage_user_id on analysis_usage(user_id);
```

RLS policies follow the same pattern as other tables (user owns their rows).

**Why a separate table (not JSONB on contracts):**
- Per-pass granularity: 17 rows per analysis (16 passes + synthesis), each with own tokens/cost/duration
- Queryable: SUM costs across contracts, find most expensive passes, track spending over time
- Re-analysis: old usage rows stay (historical cost tracking), new ones added
- Contracts table already has `pass_results` JSONB but that's for success/fail status, not billing data

### 3. Contract Lifecycle & Date Intelligence

**Lifecycle status expansion:**

Current status: `'Analyzing' | 'Reviewed' | 'Draft'`

Proposed: Add `lifecycle_status` as a separate column (not replacing `status`):

```typescript
type LifecycleStatus = 'Draft' | 'Under Review' | 'Negotiating' | 'Executed' | 'Active' | 'Closed';
```

**Why a separate column from `status`:**
- `status` tracks analysis state (Analyzing/Reviewed/Draft) -- server-controlled
- `lifecycle_status` tracks contract business state -- user-controlled
- Orthogonal concerns: a contract can be "Reviewed" (analysis done) and "Negotiating" (business state)
- No breaking change to existing code that reads `status`

Schema migration:

```sql
alter table contracts add column lifecycle_status text
  not null default 'Under Review'
  check (lifecycle_status in ('Draft', 'Under Review', 'Negotiating', 'Executed', 'Active', 'Closed'));
```

**State transitions (pure TypeScript, no library):**

```typescript
const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  'Draft':         ['Under Review'],
  'Under Review':  ['Negotiating', 'Executed', 'Draft'],
  'Negotiating':   ['Executed', 'Under Review', 'Draft'],
  'Executed':      ['Active'],
  'Active':        ['Closed'],
  'Closed':        [],  // terminal state
};
```

4 of 5 transitions are forward-moving. Back-transitions allow returning to earlier states during negotiation. This is simple enough for a `Record<string, string[]>` -- no xstate or robot needed.

**Date intelligence -- no new dependencies:**

The existing `DateTimeline` component and `Dashboard` already compute:
- Days until deadline (urgency coloring: red <7d, amber <30d, green >30d)
- Past-date detection
- Date sorting

What to ADD (pure code, no libraries):
- Portfolio-wide deadline aggregation across all contracts
- Grouped timeline view (by week/month)
- Overdue deadline alerts
- Upcoming deadline count in sidebar badge

All achievable with native `Date`, `Intl.DateTimeFormat`, and `Array.prototype.reduce`. The date operations are simple arithmetic (day diffs, month grouping). A library like date-fns would add ~20KB gzipped for functions the app uses maybe 3-4 of.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Concurrency control | Native Promise.allSettled | p-limit | 16 parallel API calls work fine; Anthropic handles backpressure via 429; adding p-limit adds complexity for no measurable benefit |
| Date library | Native Date + Intl | date-fns | Only need day-diff, sorting, and formatting -- all trivial with native APIs. Not worth 20KB+ for 3-4 functions. |
| State machine | TypeScript Record map | xstate / robot | 4 states, 5 transitions. A state machine library adds conceptual overhead and bundle size for a problem solvable in 10 lines. |
| Cost tracking service | Hardcoded pricing constants | Helicone / LangSmith | Sole user app; overkill to add an observability SaaS. Constants + DB table suffice. |
| Usage dashboard | Custom React component | Recharts / Chart.js | Token/cost display is a summary table + a few stat cards. Charts can be added later if needed. |

## What NOT to Add

| Library/Tool | Why Avoid |
|--------------|-----------|
| p-limit / p-queue | Already using Promise.allSettled with 16 concurrent calls. Anthropic rate limits are the constraint, not local concurrency. |
| date-fns / dayjs / luxon | Native Date handles all current and planned date operations. Tree-shaking concerns with date-fns v3 ESM; dayjs has timezone bugs. |
| xstate | 4 lifecycle states do not justify a state machine framework. |
| Recharts / Chart.js | No charts needed yet. Token costs displayed as summary tables and stat cards. |
| Helicone / LangSmith / LangFuse | Observability SaaS for a sole-user app. DB-stored usage data + custom UI is simpler and has no external dependency. |
| Temporal API polyfill | Temporal is Stage 3 but not shipped in any runtime ClearContract targets. Native Date is sufficient. |

## Database Migration Summary

Single migration file adds:

1. **`analysis_usage` table** -- per-pass token counts, cost, duration
2. **`lifecycle_status` column on contracts** -- user-controlled business state
3. **RLS policies** -- same owner-based pattern as existing tables
4. **Indexes** -- on contract_id and user_id for usage queries

## Integration Points

### Server (api/analyze.ts)

- `runAnalysisPass`: Add `message_start` and `message_delta` event capture for usage data. Return usage alongside passName/result.
- `handler`: After `Promise.allSettled`, collect per-pass usage. Bulk insert into `analysis_usage` table. Include total tokens/cost in response.
- No changes to `runSynthesisPass` structure -- same event capture pattern.

### Client (src/)

- New `useAnalysisUsage` hook: fetch usage data for a contract from Supabase
- Extend `Contract` type with `lifecycleStatus` field
- New `LifecycleStatusBadge` component with transition dropdown
- Extend `Dashboard` with portfolio-wide deadline aggregation
- New settings/usage summary view (total tokens, cost per contract, cost per pass)

### Database (supabase/)

- New migration: `20260321000000_analysis_usage_and_lifecycle.sql`
- No changes to existing tables beyond adding `lifecycle_status` column to `contracts`

## Sources

- Anthropic Streaming Docs: https://platform.claude.com/docs/en/build-with-claude/streaming (HIGH confidence -- official docs, verified event structure)
- Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing (HIGH confidence -- official pricing page)
- Anthropic SDK TypeScript: https://github.com/anthropics/anthropic-sdk-typescript (HIGH confidence -- source code)
- Supabase JS v2 Docs: Already validated in v2.0 milestone (HIGH confidence)
