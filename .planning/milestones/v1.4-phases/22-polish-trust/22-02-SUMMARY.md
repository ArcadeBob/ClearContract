---
phase: 22-polish-trust
plan: 02
subsystem: ui
tags: [react, tailwind, inline-edit, badges, deadlines, dashboard]

requires:
  - phase: 22-polish-trust
    provides: planning context and research for UX improvements
provides:
  - inline contract rename on review page
  - open/resolved finding badges on cards and review header
  - open findings stat card on dashboard
  - upcoming deadlines widget on dashboard with urgency coloring
affects: [22-03]

tech-stack:
  added: []
  patterns: [click-to-edit with ref-based value read, urgency color helper, cross-contract date aggregation]

key-files:
  created: []
  modified:
    - src/pages/ContractReview.tsx
    - src/components/ContractCard.tsx
    - src/pages/Dashboard.tsx
    - src/App.tsx

key-decisions:
  - "Used group-hover/title scoping for pencil icon to avoid triggering on parent group hover"
  - "Read input value from ref in commitRename to avoid stale closure on blur"
  - "getDateUrgency helper placed in Dashboard.tsx for now; Plan 03 can extract to shared util if needed"

patterns-established:
  - "Click-to-edit pattern: isEditing state + ref-based value read on commit"
  - "Urgency coloring: red <=7d, amber <=30d, green >30d, muted for past dates"

requirements-completed: [UX-01, UX-02, UX-05]

duration: 3min
completed: 2026-03-14
---

# Phase 22 Plan 02: Contract Rename & Dashboard Data Summary

**Inline contract rename with pencil hover affordance, open/resolved finding badges on all contract touchpoints, and upcoming deadlines widget replacing static compliance card**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T17:04:55Z
- **Completed:** 2026-03-14T17:08:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Contract title on review page is click-to-edit with pencil icon hover affordance, Enter/blur saves, Escape cancels
- Open/resolved finding count badges shown on ContractCard, ContractReview header
- Dashboard stat card changed from "Total Findings" to "Open Findings" counting only unresolved
- Static compliance card replaced with Upcoming Deadlines widget showing next 5 dates with urgency coloring and click-to-navigate

## Task Commits

Each task was committed atomically:

1. **Task 1: Inline contract rename on review page** - `df19197` (feat)
2. **Task 2: Open/resolved badges and Upcoming Deadlines widget** - `5ed16c2` (feat)

## Files Created/Modified
- `src/pages/ContractReview.tsx` - Added inline rename (isEditing/editValue/renameInputRef), open/resolved badges in header
- `src/components/ContractCard.tsx` - Added open/resolved badge pair, removed unused AlertTriangle import
- `src/pages/Dashboard.tsx` - Changed Total to Open Findings stat, added getDateUrgency helper, replaced compliance card with Upcoming Deadlines widget
- `src/App.tsx` - Wired onRename prop to ContractReview via updateContract

## Decisions Made
- Used `group-hover/title` Tailwind scoping for pencil icon visibility to avoid conflict with parent group classes
- Read input value from ref (`renameInputRef.current?.value`) in commitRename to avoid stale closure pitfall on blur
- Placed `getDateUrgency` helper in Dashboard.tsx; Plan 03 may extract to shared util if DateTimeline also needs it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused AlertTriangle import in ContractCard**
- **Found during:** Task 2
- **Issue:** Replacing the findings count text with badges left AlertTriangle imported but unused, causing lint warning
- **Fix:** Removed AlertTriangle from import statement
- **Files modified:** src/components/ContractCard.tsx
- **Verification:** npm run build passes, lint warning resolved
- **Committed in:** 5ed16c2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial cleanup of unused import. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 (DateTimeline enhancements) can build on the urgency coloring pattern established here
- getDateUrgency helper is available for extraction to shared util if Plan 03 needs it

---
*Phase: 22-polish-trust*
*Completed: 2026-03-14*
