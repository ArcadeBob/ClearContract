---
phase: 54-date-intelligence-portfolio-timeline
plan: 02
subsystem: ui
tags: [react, timeline, sidebar, deadline-badge, dashboard]

requires:
  - phase: 54-01
    provides: dateUrgency utility and DeadlineTimeline component
provides:
  - DeadlineTimeline wired into Dashboard replacing old Upcoming Deadlines widget
  - Sidebar red deadline badge showing 7-day deadline count
  - App-level deadline count computation via countDeadlinesWithin7Days
affects: []

tech-stack:
  added: []
  patterns: [urgentBadge pattern for sidebar nav items, useMemo for derived deadline count]

key-files:
  created: []
  modified:
    - src/pages/Dashboard.tsx
    - src/components/Sidebar.tsx
    - src/App.tsx

key-decisions:
  - "Separate urgentBadge field on navItems (red) vs existing badge (slate) -- keeps contract count and deadline count visually distinct"

patterns-established:
  - "urgentBadge nav pattern: red bg-red-600 badge for time-sensitive counts, separate from existing slate badges"

requirements-completed: [DATE-01, DATE-02]

duration: 7min
completed: 2026-03-22
---

# Phase 54 Plan 02: Wire Timeline into Dashboard + Sidebar Deadline Badge Summary

**Portfolio deadline timeline integrated into Dashboard with urgency-grouped entries, and sidebar shows red badge for deadlines within 7 days**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-22T22:51:08Z
- **Completed:** 2026-03-22T22:58:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced old Upcoming Deadlines widget with DeadlineTimeline component showing urgency-grouped portfolio deadlines
- Removed legacy getDateUrgency function and upcomingDates useMemo (replaced by dateUrgency utility from Plan 01)
- Added red deadline badge to Sidebar Dashboard nav item showing count of deadlines within 7 days

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire DeadlineTimeline into Dashboard and remove old widget** - `e1df8c6` (feat)
2. **Task 2: Add deadline badge to Sidebar and thread count from App.tsx** - `20c0a2d` (feat)

## Files Created/Modified
- `src/pages/Dashboard.tsx` - Replaced old Upcoming Deadlines widget with DeadlineTimeline, removed getDateUrgency and upcomingDates, removed unused useMemo/Calendar imports
- `src/components/Sidebar.tsx` - Added deadlineBadge prop, urgentBadge field on dashboard nav item, red badge rendering
- `src/App.tsx` - Added useMemo import, countDeadlinesWithin7Days import, deadlineCount computation, deadlineBadge prop threading to Sidebar

## Decisions Made
- Used separate `urgentBadge` field on navItems rather than overloading existing `badge` field -- keeps red deadline badge visually distinct from slate contract count badge

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in ReviewHeader.test.tsx (LifecycleSelect missing lifecycle_status) -- not caused by this plan's changes, out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 54 complete -- all DATE-01 and DATE-02 requirements fulfilled
- v2.2 milestone (Performance & Intelligence) ready for completion

---
*Phase: 54-date-intelligence-portfolio-timeline*
*Completed: 2026-03-22*
