# Phase 52: Cost Display and Portfolio Spend - Research

**Researched:** 2026-03-22
**Domain:** Client-side UI for displaying API cost/usage data from Supabase
**Confidence:** HIGH

## Summary

This phase is a pure client-side UI phase. The `analysis_usage` table already exists (created in Phase 51) with per-pass token counts, cost, and duration. The work is: (1) a new `useAnalysisUsage` hook that queries this table, (2) a collapsible `CostSummaryBar` component on the contract review page, and (3) two new `StatCard` instances on the dashboard for portfolio-wide cost aggregation.

All patterns are well-established in the codebase. The Supabase anon client query pattern, `mapRows` for snake-to-camelCase conversion, `StatCard` component with color variants, and Framer Motion expand/collapse are all in active use. No new dependencies are needed.

**Primary recommendation:** Follow existing hook and component patterns exactly. The only novel elements are the Supabase query for `analysis_usage`, client-side cost aggregation, and a pass-name-to-label mapping.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New cost summary bar between ReviewHeader and findings area
- Summary bar shows 3 collapsed stats: total cost, total tokens, overall cache hit rate
- Collapsible with "View per-pass detail" expanding a breakdown table
- Hidden when no analysis_usage rows exist for the contract
- Shows most recent run only (latest run_id)
- Per-pass table columns: Pass Name | Tokens (In/Out) | Cache Hit % | Cost | Duration
- Fixed row order matching pipeline execution (primer, parallel, synthesis) -- no sorting
- Footer row with totals
- Pass names as human-readable labels
- Cache hit rate = cache_read_tokens / (cache_read_tokens + input_tokens)
- Dashboard expands from 4 to 6 stat cards (3-column layout on desktop)
- Two new StatCards: "Total API Spend" and "Avg Cost / Contract"
- Total API Spend shows dollar amount + token count
- Avg Cost / Contract shows dollar amount only
- Both cards use slate color
- Only contracts with usage data included in average
- Direct Supabase anon client queries with RLS
- New useAnalysisUsage(contractId) hook
- Dashboard fetches all cost_usd values, aggregates client-side
- Skeleton placeholder while loading

### Claude's Discretion
- Exact Tailwind styling for cost summary bar and expanded table
- Token formatting (K/M suffixes, decimal places)
- Skeleton placeholder implementation details
- Icon choice for cost stat cards (DollarSign, Coins from lucide-react)
- Whether to extract a shared token formatting utility or inline it
- Grid breakpoint adjustments for 6-card layout

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COST-03 | Contract review page shows total cost and per-pass breakdown (tokens, cache hit rate, cost, duration) | CostSummaryBar component + useAnalysisUsage hook querying analysis_usage table; pass name label mapping; collapsible detail table |
| COST-04 | Dashboard shows portfolio cost stats (total API spend, average cost per contract) | Two new StatCard instances; aggregation query across all analysis_usage rows; grid layout change from 4 to 6 cards |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI components | Already in project |
| @supabase/supabase-js | (existing) | DB queries via anon client | Already configured with RLS |
| Tailwind CSS | (existing) | Styling | Project convention |
| Framer Motion | (existing) | Expand/collapse animation | Already used in ContractReview |
| Lucide React | (existing) | Icons (DollarSign, Coins, ChevronDown) | Already imported throughout |

### Supporting
No new libraries needed. All functionality builds on existing stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side aggregation | Supabase aggregate functions (`.select('cost_usd.sum()')`) | PostgREST aggregate syntax is limited; client-side SUM/AVG on small dataset (~17 rows/contract) is simpler and avoids learning PostgREST aggregate quirks |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### New Files
```
src/
├── hooks/
│   └── useAnalysisUsage.ts    # Hook: fetches analysis_usage rows for a contract
├── components/
│   └── CostSummaryBar.tsx     # Collapsible cost display for review page
└── utils/
    └── formatTokens.ts        # Token count formatting (K/M suffixes) -- optional, could inline
```

### Modified Files
```
src/pages/ContractReview.tsx   # Insert CostSummaryBar between ReviewHeader and content
src/pages/Dashboard.tsx        # Add 2 StatCards, change grid to 6-card layout, fetch portfolio usage
```

### Pattern 1: useAnalysisUsage Hook
**What:** Custom hook that queries `analysis_usage` table filtered by contract_id, ordered to get the latest run_id, returns typed usage rows.
**When to use:** On ContractReview mount.
**Example:**
```typescript
// Follows useCompanyProfile pattern exactly
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { mapRows } from '../lib/mappers';

export interface AnalysisUsageRow {
  id: string;
  contractId: string;
  runId: string;
  passName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  durationMs: number;
  createdAt: string;
}

export function useAnalysisUsage(contractId: string) {
  const [rows, setRows] = useState<AnalysisUsageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fetch all usage rows for this contract, newest first
      const { data, error } = await supabase
        .from('analysis_usage')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      const mapped = mapRows<AnalysisUsageRow>(data);
      // Filter to latest run_id only
      const latestRunId = mapped[0].runId;
      const latestRun = mapped.filter(r => r.runId === latestRunId);
      setRows(latestRun);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [contractId]);

  return { rows, isLoading };
}
```

### Pattern 2: Pass Name Label Mapping
**What:** Map from kebab-case pass names to human-readable labels.
**Why:** The 16 pass names + synthesis need display-friendly labels.
```typescript
const PASS_LABELS: Record<string, string> = {
  'risk-overview': 'Risk Overview',
  'dates-deadlines': 'Dates & Deadlines',
  'scope-of-work': 'Scope of Work',
  'legal-indemnification': 'Indemnification',
  'legal-payment-contingency': 'Payment Contingency',
  'legal-liquidated-damages': 'Liquidated Damages',
  'legal-retainage': 'Retainage',
  'legal-insurance': 'Insurance',
  'legal-termination': 'Termination',
  'legal-flow-down': 'Flow-Down',
  'legal-no-damage-delay': 'No Damage for Delay',
  'legal-lien-rights': 'Lien Rights',
  'legal-dispute-resolution': 'Dispute Resolution',
  'legal-change-order': 'Change Order',
  'verbiage-analysis': 'Verbiage Analysis',
  'labor-compliance': 'Labor Compliance',
  'synthesis': 'Synthesis',
};

function getPassLabel(passName: string): string {
  return PASS_LABELS[passName] ?? passName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
```

### Pattern 3: Fixed Pass Order
**What:** Rows must be displayed in pipeline execution order, not alphabetical or DB order.
```typescript
const PASS_ORDER = [
  'risk-overview',       // primer -- always first
  'dates-deadlines',     // parallel passes in definition order
  'scope-of-work',
  'legal-indemnification',
  'legal-payment-contingency',
  'legal-liquidated-damages',
  'legal-retainage',
  'legal-insurance',
  'legal-termination',
  'legal-flow-down',
  'legal-no-damage-delay',
  'legal-lien-rights',
  'legal-dispute-resolution',
  'legal-change-order',
  'verbiage-analysis',
  'labor-compliance',
  'synthesis',           // always last
];

function sortByPassOrder(rows: AnalysisUsageRow[]): AnalysisUsageRow[] {
  return [...rows].sort((a, b) => {
    const ai = PASS_ORDER.indexOf(a.passName);
    const bi = PASS_ORDER.indexOf(b.passName);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
```

### Pattern 4: Dashboard Portfolio Aggregation
**What:** Fetch all cost_usd values across all contracts for the logged-in user, compute SUM and AVG client-side.
```typescript
// In Dashboard.tsx or a usePortfolioCost hook
const { data } = await supabase
  .from('analysis_usage')
  .select('contract_id, cost_usd, input_tokens, output_tokens, cache_read_tokens');

// Group by contract_id to get per-contract totals, then SUM/AVG
```

### Pattern 5: Collapsible Section with Framer Motion
**What:** Expand/collapse animation for the per-pass detail table.
```typescript
// Existing pattern from the codebase
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      {/* table content */}
    </motion.div>
  )}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Fetching usage data inside useContractStore:** Usage is per-view, not global state. Keep it in a dedicated hook fetched on navigation to review page.
- **Server-side aggregation endpoint:** Overkill for ~17 rows per contract. Client-side aggregation is fine.
- **Caching usage rows in memory across navigations:** Data is tiny and may change after re-analysis. Fresh fetch on each navigation is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snake-to-camelCase conversion | Custom mapper | Existing `mapRows()` from `src/lib/mappers.ts` | Already handles all edge cases |
| Expand/collapse animation | CSS transitions | Framer Motion `AnimatePresence` | Project convention, handles height: auto |
| Number formatting | Custom formatter | `Intl.NumberFormat` | Handles locale, currency, compact notation |

## Common Pitfalls

### Pitfall 1: cost_usd is numeric(10,6) in Postgres
**What goes wrong:** Supabase returns `numeric` columns as strings, not numbers.
**Why it happens:** PostgreSQL `numeric` type has arbitrary precision; JS `number` is IEEE 754 float.
**How to avoid:** Parse with `Number()` or `parseFloat()` when mapping rows. The `mapRow()` utility does NOT do type coercion -- it only renames keys.
**Warning signs:** Seeing `"0.003450"` as a string instead of `0.00345` as a number.

### Pitfall 2: Empty usage data for pre-Phase 51 contracts
**What goes wrong:** Cost bar renders with $0.00 for old contracts.
**Why it happens:** Contracts analyzed before Phase 51 have no `analysis_usage` rows.
**How to avoid:** Check `rows.length === 0` and hide the entire CostSummaryBar component. The CONTEXT.md explicitly requires this: "Hidden entirely when no analysis_usage rows exist."
**Warning signs:** Cost bar showing zeros on older contracts.

### Pitfall 3: Dashboard grid layout shift
**What goes wrong:** Going from 4 to 6 stat cards breaks the responsive grid.
**Why it happens:** Current grid is `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. Six cards in `lg:grid-cols-4` gives an awkward 4+2 layout.
**How to avoid:** Change to `lg:grid-cols-3` for a clean 2x3 grid, or use `lg:grid-cols-3 xl:grid-cols-6` depending on card width.
**Warning signs:** Uneven card widths or orphaned cards on the last row.

### Pitfall 4: Latest run_id determination
**What goes wrong:** Picking wrong run_id when a contract has been re-analyzed.
**Why it happens:** Multiple run_ids exist for the same contract_id after re-analysis.
**How to avoid:** Order by `created_at DESC`, take the `run_id` from the first row, then filter all rows to that run_id. This is the pattern shown in the hook example above.
**Warning signs:** Mixing data from different analysis runs in the same display.

### Pitfall 5: Cache hit rate division by zero
**What goes wrong:** NaN or Infinity when computing cache_read_tokens / (cache_read_tokens + input_tokens).
**Why it happens:** The primer pass may have 0 cache_read_tokens AND 0 input_tokens in edge cases (or if a pass failed before receiving usage).
**How to avoid:** Guard: `const cacheHitRate = total > 0 ? (cacheRead / total) * 100 : 0`.
**Warning signs:** NaN% displayed in the UI.

## Code Examples

### Token Formatting Utility
```typescript
/**
 * Format token counts with K/M suffixes.
 * 1234 -> "1.2K", 1234567 -> "1.2M", 500 -> "500"
 */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}
```

### Cost Formatting
```typescript
/**
 * Format USD cost. Uses 2 decimal places for display, 4 for small amounts.
 * 12.47 -> "$12.47", 0.0034 -> "$0.0034"
 */
export function formatCost(cost: number): string {
  if (cost < 0.01 && cost > 0) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
```

### Duration Formatting
```typescript
/**
 * Format milliseconds to human-readable duration.
 * 1500 -> "1.5s", 65000 -> "1m 5s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
```

### Skeleton Placeholder Pattern
```typescript
// Simple Tailwind skeleton -- no library needed
function CostBarSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="h-4 w-20 bg-slate-200 rounded" />
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-4 w-16 bg-slate-200 rounded" />
      </div>
    </div>
  );
}
```

### CostSummaryBar Aggregate Computation
```typescript
function computeSummary(rows: AnalysisUsageRow[]) {
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheRead = 0;
  let totalCacheCreation = 0;

  for (const r of rows) {
    totalCost += Number(r.costUsd);  // numeric comes as string from Postgres
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    totalCacheRead += r.cacheReadTokens;
    totalCacheCreation += r.cacheCreationTokens;
  }

  const totalTokens = totalInputTokens + totalOutputTokens + totalCacheRead + totalCacheCreation;
  const cacheHitDenom = totalCacheRead + totalInputTokens;
  const cacheHitRate = cacheHitDenom > 0 ? (totalCacheRead / cacheHitDenom) * 100 : 0;

  return { totalCost, totalTokens, cacheHitRate, totalInputTokens, totalOutputTokens, totalCacheRead };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No cost visibility | DB-stored per-pass usage (Phase 51) | 2026-03-22 | Enables this phase's UI work |
| 4-card dashboard grid | 6-card grid with cost stats | This phase | Layout adjustment needed |

## Open Questions

1. **Supabase numeric type coercion**
   - What we know: PostgreSQL `numeric(10,6)` may be returned as string by PostgREST
   - What's unclear: Whether `@supabase/supabase-js` auto-coerces or preserves string
   - Recommendation: Defensively wrap with `Number()` when reading `costUsd` field. Test with a real query during implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none |
| Quick run command | `npm run build` (type-checks + builds) |
| Full suite command | `npm run lint && npm run build` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COST-03 | Cost bar renders on review page with correct totals | manual-only | Visual verification on review page with analyzed contract | N/A |
| COST-03 | Cost bar hidden for pre-Phase 51 contracts | manual-only | Navigate to old contract, verify no cost bar | N/A |
| COST-03 | Per-pass detail expands/collapses | manual-only | Click "View per-pass detail", verify table | N/A |
| COST-04 | Dashboard shows Total API Spend and Avg Cost cards | manual-only | View dashboard with analyzed contracts | N/A |
| COST-04 | Average excludes contracts without usage data | manual-only | Mix of old and new contracts on dashboard | N/A |

**Justification for manual-only:** No test framework is configured per CLAUDE.md. Validation relies on `npm run build` for type safety and `npm run lint` for code quality, plus manual visual verification.

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run lint && npm run build`
- **Phase gate:** Build green + visual verification of all success criteria

### Wave 0 Gaps
None -- no test infrastructure to set up. Build and lint are the automated gates.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260322_add_analysis_usage.sql` -- exact table schema with column types
- `api/types.ts` -- PassUsage interface and PRICING constants
- `api/cost.ts` -- computePassCost() function
- `api/passes.ts` -- all 16 pass names extracted via grep
- `src/hooks/useCompanyProfile.ts` -- canonical hook pattern for Supabase queries
- `src/components/StatCard.tsx` -- component interface (label, value, icon, color with slate option)
- `src/pages/Dashboard.tsx` -- current 4-card grid layout at line 110
- `src/pages/ContractReview.tsx` -- insertion point between ReviewHeader and content
- `src/lib/mappers.ts` -- mapRow/mapRows utilities
- `.planning/phases/51-analysis-pipeline-parallelization-and-token-capture/51-CONTEXT.md` -- upstream decisions

### Secondary (MEDIUM confidence)
- Supabase PostgREST behavior for `numeric` columns (known from general PostgREST documentation)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing patterns
- Architecture: HIGH -- hook pattern, component structure, and data flow are all established in codebase
- Pitfalls: HIGH -- identified from direct code reading (numeric type, empty data, grid layout, run_id filtering, division by zero)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- no external dependencies changing)
