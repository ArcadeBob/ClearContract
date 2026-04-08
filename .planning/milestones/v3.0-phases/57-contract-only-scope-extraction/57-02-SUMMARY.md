---
phase: 57-contract-only-scope-extraction
plan: 02
subsystem: api, ui
tags: [schedule-conflict, submittals, deterministic-computation, framer-motion, tailwind]

requires:
  - phase: 57-contract-only-scope-extraction
    provides: "SubmittalEntry schema, scope-extraction pass with submittal extraction, merge.ts submittal aggregation"
provides:
  - "computeScheduleConflicts deterministic function generating conflict findings"
  - "SubmittalRegister component with conflict-annotated rows and expand/collapse"
  - "SubmittalTypeBadge pill badge component"
  - "FilterToolbar ViewMode extended with 'submittals'"
  - "ContractReview Submittals tab wiring"
affects: [59-spec-reconciliation, 62-scope-intelligence-ux]

tech-stack:
  added: []
  patterns: ["deterministic post-merge computation injected before synthesis", "conditional tab rendering based on data availability"]

key-files:
  created:
    - api/conflicts.ts
    - src/components/SubmittalRegister.tsx
    - src/components/SubmittalTypeBadge.tsx
  modified:
    - api/analyze.ts
    - src/components/FilterToolbar.tsx
    - src/pages/ContractReview.tsx

key-decisions:
  - "Schedule-conflict computation placed after merge, before synthesis -- conflict findings visible to compound-risk detection"
  - "Lucide AlertTriangle title attribute applied via wrapper span -- Lucide React does not support title prop directly"

patterns-established:
  - "Deterministic post-merge computation: pure function receives merged data, returns findings injected before synthesis"
  - "Conditional tab visibility: tab button rendered only when data array is non-empty"

requirements-completed: [SCOPE-01, SCOPE-02, SCOPE-05]

duration: 9min
completed: 2026-04-06
---

# Phase 57 Plan 02: Schedule Conflicts + Submittals Tab Summary

**Deterministic schedule-conflict computation with severity tiers (Critical >14d, High 7-14d, Medium 1-7d) and Submittals tab UI with conflict-annotated register table**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-06T04:23:10Z
- **Completed:** 2026-04-06T04:31:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Deterministic schedule-conflict computation that compares submittal durations against milestone dates, generating findings with correct severity tiers and explicit assumption labels
- Submittals tab on contract review page with register table showing type badges, conflict row highlighting (amber), expandable conflict details, and responsive mobile card layout
- Quantity-ambiguity findings render through existing FindingCard in the Findings tab (no changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schedule-conflict computation function + analyze.ts integration** - `bcf6c9c` (feat)
2. **Task 2: Submittals tab UI -- SubmittalRegister, SubmittalTypeBadge, FilterToolbar extension, ContractReview wiring** - `f78f058` (feat)

## Files Created/Modified
- `api/conflicts.ts` - Deterministic schedule-conflict computation with severity tiers and assumption labeling
- `api/analyze.ts` - Import and call computeScheduleConflicts after merge, before synthesis
- `src/components/SubmittalTypeBadge.tsx` - Pill badge for submittal type (indigo/teal/purple/cyan)
- `src/components/SubmittalRegister.tsx` - Register table with conflict annotations, expansion panels, responsive layout
- `src/components/FilterToolbar.tsx` - ViewMode extended with 'submittals', conditional tab button, hidden filter dropdowns
- `src/pages/ContractReview.tsx` - SubmittalRegister wired into viewMode chain with conflict findings filter

## Decisions Made
- Schedule-conflict computation placed after merge, before synthesis -- conflict findings are visible to compound-risk detection in the synthesis pass
- Lucide AlertTriangle wrapped in span for title attribute -- Lucide React TypeScript types do not expose title prop directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Lucide AlertTriangle title prop TypeScript error**
- **Found during:** Task 2 (SubmittalRegister component)
- **Issue:** Lucide React does not accept `title` prop on icon components (TS2322)
- **Fix:** Wrapped AlertTriangle in `<span title="Schedule conflict">` to provide mouse-hover tooltip while keeping aria-label on the icon
- **Files modified:** src/components/SubmittalRegister.tsx
- **Verification:** `npx tsc --noEmit` passes with zero new errors
- **Committed in:** f78f058 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor implementation adjustment to satisfy TypeScript types. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 57 complete: all three SCOPE requirements delivered (submittal register, schedule conflicts, quantity ambiguity)
- Ready for Phase 58 (Knowledge Modules + Multi-Doc Input) or Phase 59 (Spec Reconciliation)
- Schedule-conflict findings tagged with `sourcePass: 'schedule-conflict'` for downstream filtering

---
*Phase: 57-contract-only-scope-extraction*
*Completed: 2026-04-06*
