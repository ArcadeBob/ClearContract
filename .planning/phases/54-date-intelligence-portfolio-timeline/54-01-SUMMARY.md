---
phase: 54-date-intelligence-portfolio-timeline
plan: 01
subsystem: ui
tags: [date-urgency, timeline, framer-motion, vitest, utility]

requires:
  - phase: none
    provides: standalone utility and component
provides:
  - dateUrgency utility with urgency grouping, relative labels, 7-day count
  - DeadlineTimeline component with grouped entries and empty state
affects: [54-02 Dashboard/Sidebar integration]

tech-stack:
  added: []
  patterns: [urgency-bucket grouping, local date parsing for timezone safety]

key-files:
  created:
    - src/utils/dateUrgency.ts
    - src/utils/dateUrgency.test.ts
    - src/components/DeadlineTimeline.tsx
  modified: []

key-decisions:
  - "Local date parsing via split/Number to avoid UTC offset issues with YYYY-MM-DD strings"
  - "Global stagger index across all urgency groups for smooth sequential animation"

patterns-established:
  - "Urgency grouping: overdue(<0, >=-30), this-week(0-7), this-month(8-30), later(>30), null(< -30)"
  - "Date formatting with replace(/-/g, '/') for consistent toLocaleDateString across browsers"

requirements-completed: [DATE-01]

duration: 4min
completed: 2026-03-22
---

# Phase 54 Plan 01: Date Urgency Utility and DeadlineTimeline Component Summary

**Date urgency grouping utility with 21 passing tests and DeadlineTimeline component with urgency-colored sections, staggered animation, and empty state**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T22:42:49Z
- **Completed:** 2026-03-22T22:47:09Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Date urgency utility with 5 exported functions: getUrgencyGroup, getRelativeLabel, countDeadlinesWithin7Days, groupDatesByUrgency, plus URGENCY_GROUPS config
- 21 deterministic unit tests using vi.useFakeTimers covering all bucket boundaries and edge cases
- DeadlineTimeline component with urgency-grouped sections, color-coded headers, Framer Motion stagger, and empty state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dateUrgency utility with tests (TDD RED)** - `7d2fa02` (test)
2. **Task 1: Create dateUrgency utility with tests (TDD GREEN)** - `65a21eb` (feat)
3. **Task 2: Create DeadlineTimeline component** - `3395de4` (feat)

_TDD task had RED + GREEN commits_

## Files Created/Modified
- `src/utils/dateUrgency.ts` - Urgency grouping logic, relative labels, 7-day count, timeline entry grouping
- `src/utils/dateUrgency.test.ts` - 21 vitest tests with fake timers for deterministic date testing
- `src/components/DeadlineTimeline.tsx` - Portfolio deadline timeline grouped by urgency with Framer Motion animation

## Decisions Made
- Used local date parsing (split + new Date(y, m-1, d)) instead of new Date(dateStr) to avoid UTC midnight offset causing off-by-one errors in timezone-positive environments
- Global stagger index across all urgency groups (not per-group) for smooth sequential animation entry
- Date formatting uses replace(/-/g, '/') before toLocaleDateString to ensure consistent cross-browser parsing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UTC date parsing causing off-by-one day calculation**
- **Found during:** Task 1 (GREEN phase, test failures)
- **Issue:** `new Date('2026-03-22')` parses as UTC midnight, but `new Date()` uses local time. After setHours(0,0,0,0), the diff was off by 1 day in UTC+ timezones
- **Fix:** Parse date strings by splitting on '-' and using `new Date(year, month-1, day)` for local time construction
- **Files modified:** src/utils/dateUrgency.ts
- **Verification:** All 21 tests pass with fake timers
- **Committed in:** 65a21eb (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness across timezones. No scope creep.

## Issues Encountered
None beyond the UTC parsing fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- dateUrgency utility and DeadlineTimeline component ready for Plan 02 integration
- Plan 02 will wire DeadlineTimeline into Dashboard (replacing existing widget) and add sidebar badge

---
*Phase: 54-date-intelligence-portfolio-timeline*
*Completed: 2026-03-22*

## Self-Check: PASSED
