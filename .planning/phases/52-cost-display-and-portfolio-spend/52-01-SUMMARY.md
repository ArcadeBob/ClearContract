---
phase: 52-cost-display-and-portfolio-spend
plan: 01
subsystem: ui
tags: [react, supabase, framer-motion, cost-tracking, tokens]

requires:
  - phase: 51-analysis-pipeline-parallelization-and-token-capture
    provides: analysis_usage table with per-pass token counts, cost, duration
provides:
  - formatTokens/formatCost/formatDuration shared utilities
  - useAnalysisUsage hook for querying per-contract usage data
  - CostSummaryBar collapsible component with per-pass breakdown
affects: [52-02-dashboard-cost-stats]

tech-stack:
  added: []
  patterns: [collapsible-detail-table, pass-order-sorting, numeric-coercion-from-postgres]

key-files:
  created:
    - src/utils/formatCost.ts
    - src/hooks/useAnalysisUsage.ts
    - src/components/CostSummaryBar.tsx
  modified:
    - src/pages/ContractReview.tsx

key-decisions:
  - "costUsd coerced with Number() after mapRows since Postgres numeric returns string"

patterns-established:
  - "PASS_ORDER constant for fixed pipeline display order (17 entries)"
  - "computeSummary pattern for aggregating token/cost data across usage rows"

requirements-completed: [COST-03]

duration: 4min
completed: 2026-03-22
---

# Phase 52 Plan 01: Cost Display Summary

**Collapsible CostSummaryBar on contract review page showing total cost, tokens, cache hit rate with expandable per-pass breakdown table**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T16:36:33Z
- **Completed:** 2026-03-22T16:40:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Shared formatting utilities for tokens (K/M suffixes), costs (smart decimal places), and durations (ms/s/m)
- useAnalysisUsage hook fetches from analysis_usage table, filters to latest run_id, coerces numeric types
- CostSummaryBar shows 3-stat collapsed view (cost, tokens, cache hit rate) with expandable 17-row per-pass table
- Skeleton loading state, hidden when no usage data, Framer Motion expand/collapse animation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create formatting utilities and useAnalysisUsage hook** - `ce72e89` (feat)
2. **Task 2: Create CostSummaryBar component and wire into ContractReview** - `ed875ed` (feat)

## Files Created/Modified
- `src/utils/formatCost.ts` - Token, cost, and duration formatting utilities
- `src/hooks/useAnalysisUsage.ts` - Supabase query hook for analysis_usage table with latest run filtering
- `src/components/CostSummaryBar.tsx` - Collapsible cost display with per-pass breakdown table
- `src/pages/ContractReview.tsx` - Added CostSummaryBar between ReviewHeader and findings content

## Decisions Made
- costUsd coerced with Number() after mapRows since Postgres numeric type returns as string through Supabase client

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- formatCost utilities available for reuse in 52-02 dashboard cost stats
- useAnalysisUsage pattern can inform dashboard portfolio-wide usage query
- Build and lint pass cleanly

---
*Phase: 52-cost-display-and-portfolio-spend*
*Completed: 2026-03-22*
