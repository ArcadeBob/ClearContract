---
phase: 52-cost-display-and-portfolio-spend
plan: 02
subsystem: ui
tags: [react, supabase, dashboard, cost-tracking, stat-cards]

requires:
  - phase: 52-01
    provides: formatCost, formatTokens utilities and analysis_usage table
provides:
  - Portfolio-wide cost stat cards on Dashboard (Total API Spend, Avg Cost / Contract)
  - 6-card stat grid layout (3-column on desktop)
affects: [dashboard, cost-display]

tech-stack:
  added: []
  patterns: [portfolio-level Supabase aggregation in component useEffect]

key-files:
  created: []
  modified: [src/pages/Dashboard.tsx]

key-decisions:
  - "Aggregate analysis_usage in-component via useEffect rather than a dedicated hook -- single consumer, simple query"
  - "Use byContract.size for average denominator -- naturally excludes pre-Phase 51 contracts without usage rows"

patterns-established:
  - "Portfolio cost aggregation: group by contract_id, sum costs/tokens, derive averages from distinct contract count"

requirements-completed: [COST-04]

duration: 3min
completed: 2026-03-22
---

# Phase 52 Plan 02: Dashboard Portfolio Cost Stats Summary

**Portfolio-wide Total API Spend and Avg Cost / Contract stat cards with 3-column 6-card grid layout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T16:45:21Z
- **Completed:** 2026-03-22T16:48:25Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added Total API Spend stat card showing dollar amount + token count with K/M suffixes
- Added Avg Cost / Contract stat card showing dollar amount only
- Expanded stat grid from 4-column to 3-column layout (6 cards in 2 rows)
- Both cost cards use slate color to differentiate from finding-related stats
- Average calculation correctly excludes contracts without usage data via byContract.size

## Task Commits

Each task was committed atomically:

1. **Task 1: Add portfolio cost stats and 6-card grid to Dashboard** - `6037b6e` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/pages/Dashboard.tsx` - Added portfolio cost state/fetching, two new StatCards, 3-column grid

## Decisions Made
- Aggregated analysis_usage data directly in Dashboard via useEffect rather than creating a separate hook -- this is the only consumer of portfolio-level cost data
- Used byContract.size as the denominator for average cost -- naturally excludes contracts analyzed before Phase 51 that have no usage rows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 52 complete -- all cost display features shipped
- Dashboard shows portfolio cost stats; contract review page shows per-analysis cost breakdown (from 52-01)
- Ready for Phase 53 (Contract Lifecycle Status)

---
*Phase: 52-cost-display-and-portfolio-spend*
*Completed: 2026-03-22*
