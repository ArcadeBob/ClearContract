# Phase 52: Cost Display and Portfolio Spend - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Display per-analysis cost breakdown on the contract review page and portfolio-wide cost stats on the dashboard. All data comes from the `analysis_usage` table populated by Phase 51. No server-side changes -- this is purely client-side UI that reads existing DB data via Supabase anon client.

</domain>

<decisions>
## Implementation Decisions

### Review page cost placement
- New cost summary bar component positioned between ReviewHeader and the findings/tabs area
- Summary bar shows 3 stats when collapsed: total cost ($X.XX), total tokens (XXK), overall cache hit rate (XX%)
- Collapsible -- clicking "View per-pass detail" expands the per-pass breakdown table below the summary
- Hidden entirely when no analysis_usage rows exist for the contract (pre-Phase 51 contracts)
- Shows most recent run only (latest run_id) -- no run history toggle

### Per-pass breakdown format
- Compact table with columns: Pass Name | Tokens (In/Out) | Cache Hit % | Cost | Duration
- Fixed row order matching pipeline execution: primer first, then parallel passes, synthesis last -- no sortable columns
- Footer row with totals across all columns
- Pass names displayed as human-readable labels (e.g., 'risk-overview' -> 'Risk Overview')
- Cache hit rate formula: cache_read_tokens / (cache_read_tokens + input_tokens) as percentage

### Dashboard cost stats
- Expand stat card grid from 4 to 6 cards (3-column layout on desktop, wraps to 2 rows)
- Two new StatCards: "Total API Spend" and "Avg Cost / Contract"
- Total API Spend shows dollar amount + token count (e.g., "$12.47 (1.2M tokens)")
- Avg Cost / Contract shows dollar amount only
- Both cards use slate color to differentiate from finding-related stat cards
- Only contracts with usage data included in average calculation (exclude pre-Phase 51 contracts)

### Data loading
- Direct Supabase anon client queries with RLS -- same pattern as contracts/findings
- New `useAnalysisUsage(contractId)` hook for per-contract usage on review page
- Dashboard portfolio totals: fetch all cost_usd values, aggregate client-side (SUM, AVG)
- Fetch per contract on navigation, no in-memory caching (data is small, ~17 rows per contract)
- Skeleton placeholder in cost bar area while usage data loads (prevents layout shift)

### Claude's Discretion
- Exact Tailwind styling for cost summary bar and expanded table
- Token formatting (K/M suffixes, decimal places)
- Skeleton placeholder implementation details
- Icon choice for the cost stat cards (e.g., DollarSign, Coins from lucide-react)
- Whether to extract a shared token formatting utility or inline it
- Grid breakpoint adjustments for 6-card layout on different screen sizes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- COST-03 (review page cost display), COST-04 (dashboard portfolio stats)

### Phase 51 context (upstream)
- `.planning/phases/51-analysis-pipeline-parallelization-and-token-capture/51-CONTEXT.md` -- Token capture decisions, analysis_usage table schema, pricing constants, run_id grouping

### Server-side cost utilities
- `api/types.ts` -- PassUsage interface, PassWithUsage interface, PRICING constants
- `api/cost.ts` -- computePassCost() function (may be useful for client-side reference)

### Pipeline pass definitions
- `api/passes.ts` -- ANALYSIS_PASSES array with pass names (needed for human-readable label mapping)

### UI components to modify/reference
- `src/pages/ContractReview.tsx` -- Review page layout where cost bar will be inserted
- `src/components/ReviewHeader.tsx` -- Header component above the new cost bar
- `src/pages/Dashboard.tsx` -- Dashboard with existing 4-card stat grid to expand
- `src/components/StatCard.tsx` -- Reusable stat card component for dashboard

### Data layer patterns
- `src/hooks/useContractStore.ts` -- Existing Supabase query patterns with anon client
- `src/lib/mappers.ts` -- mapRow() / mapRows() for snake_case -> camelCase conversion

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` component: takes label, value, icon, color -- ready for 2 new cost cards
- `api/cost.ts` computePassCost() and PRICING constants -- reference for client-side cost verification
- `mapRow()` / `mapRows()` mappers for converting analysis_usage DB rows to camelCase
- Lucide React icon library already imported throughout -- has DollarSign, Coins, etc.

### Established Patterns
- Supabase anon client queries with `.from().select().eq()` chain (used in useContractStore)
- Custom hooks returning `{ data, loading, error }` style (see useCompanyProfile)
- Tailwind utility classes for all styling, no CSS modules
- Framer Motion for expand/collapse animations (AnimatePresence used in ContractReview)

### Integration Points
- `ContractReview.tsx` line ~76: between ReviewHeader and findings content -- insert cost bar here
- `Dashboard.tsx` line ~110: stat card grid `grid-cols-4` -- change to `grid-cols-3` for 6 cards in 2 rows
- `analysis_usage` table in Supabase with RLS policies (created in Phase 51)

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

*Phase: 52-cost-display-and-portfolio-spend*
*Context gathered: 2026-03-22*
