---
phase: 51-analysis-pipeline-parallelization-and-token-capture
plan: 01
subsystem: database
tags: [supabase, migration, rls, typescript, cost-tracking]

# Dependency graph
requires:
  - phase: 50-dead-code-cleanup
    provides: clean codebase baseline for v2.2
provides:
  - analysis_usage table with per-pass token tracking
  - Partial contract status in CHECK constraint
  - PassUsage and PassWithUsage TypeScript interfaces
  - PRICING constants for Claude Sonnet rates
  - computePassCost pure function for cost calculation
affects: [51-02-PLAN, 52-cost-display]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared api types module, pure cost computation function]

key-files:
  created:
    - supabase/migrations/20260322_add_analysis_usage.sql
    - api/types.ts
    - api/cost.ts
  modified: []

key-decisions:
  - "RLS policies use (SELECT auth.uid()) subquery pattern for performance"
  - "PRICING constants use as const for type narrowing"
  - "PassWithUsage.result typed as unknown to avoid circular imports"

patterns-established:
  - "Shared API types in api/types.ts for cross-module use"
  - "Pure cost computation extracted to api/cost.ts for testability"

requirements-completed: [COST-01, COST-02]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 51 Plan 01: DB Migration + Shared Types Summary

**analysis_usage table migration with RLS, Partial status constraint, PassUsage types, and computePassCost utility at locked Sonnet pricing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T03:18:51Z
- **Completed:** 2026-03-22T03:21:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created analysis_usage migration with full schema, indexes, RLS policies, and service_role grant
- Extended contracts status CHECK constraint to include 'Partial' for progressive save support
- Defined PassUsage, PassWithUsage interfaces and PRICING constants for pipeline integration
- Implemented computePassCost pure function matching locked formula from CONTEXT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Create analysis_usage migration and Partial status** - `ffb0a73` (feat)
2. **Task 2: Create shared types and cost computation utility** - `8d2acae` (feat)

## Files Created/Modified
- `supabase/migrations/20260322_add_analysis_usage.sql` - Migration: analysis_usage table, Partial status, RLS, indexes
- `api/types.ts` - PassUsage, PassWithUsage interfaces, PRICING constants
- `api/cost.ts` - computePassCost pure function

## Decisions Made
- RLS policies use `(SELECT auth.uid())` subquery pattern consistent with existing project conventions
- PRICING constants use `as const` assertion for type narrowing in downstream consumers
- PassWithUsage.result typed as `unknown` to avoid circular imports with analysis schema types

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
The migration file must be applied to Supabase before deploying pipeline changes (Plan 02). Apply via Supabase dashboard SQL editor or `supabase db push`.

## Next Phase Readiness
- analysis_usage table schema ready for Plan 02 to write usage rows
- PassUsage/PassWithUsage types ready for streaming event capture wrapper
- computePassCost ready for cost calculation before DB insert
- Partial status constraint ready for progressive save timeout path

## Self-Check: PASSED

All 3 files found. All 2 commit hashes verified.

---
*Phase: 51-analysis-pipeline-parallelization-and-token-capture*
*Completed: 2026-03-22*
