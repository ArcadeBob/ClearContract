---
phase: 25-portfolio-intelligence
plan: 02
subsystem: ui
tags: [react, comparison, re-analysis, routing, framer-motion]

requires:
  - phase: 22-contract-interaction
    provides: resolved/note fields on Finding, toggleFindingResolved, updateFindingNote
provides:
  - Side-by-side contract comparison view at /compare?a=id1&b=id2
  - Checkbox selection (max 2) on All Contracts page
  - Re-analyze finding preservation by clauseReference+category composite key
affects: [portfolio-intelligence, contract-interaction]

tech-stack:
  added: []
  patterns: [composite-key-matching, checkbox-selection-with-max, deep-linkable-compare-route]

key-files:
  created:
    - src/pages/ContractComparison.tsx
  modified:
    - src/types/contract.ts
    - src/hooks/useRouter.ts
    - src/pages/AllContracts.tsx
    - src/components/ContractCard.tsx
    - src/App.tsx

key-decisions:
  - "Used clauseReference+category composite key for finding preservation across re-analysis"
  - "Compare route is transient (no sidebar entry) -- accessed only via All Contracts selection"
  - "GitCompareArrows icon for Compare button to differentiate from Upload button"

patterns-established:
  - "Composite key matching: clauseReference::category for finding identity across analysis runs"
  - "Max-N selection pattern: Set-based with size guard before add"

requirements-completed: [PORT-02, PORT-04]

duration: 4min
completed: 2026-03-15
---

# Phase 25 Plan 02: Contract Comparison & Re-Analyze Preservation Summary

**Side-by-side contract comparison with risk delta and category-grouped findings, plus resolved/note preservation across re-analysis cycles**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T01:32:40Z
- **Completed:** 2026-03-15T01:36:22Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Contract comparison page with risk score delta visualization and findings grouped by category side-by-side
- Checkbox selection on All Contracts limited to exactly 2, with Compare Selected button
- Deep-linkable /compare?a=id1&b=id2 URL with graceful handling of missing contracts
- Re-analyze preserves user's resolved statuses and notes via composite key matching
- Toast reports preservation counts after re-analysis

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ViewState, router, AllContracts selection, and ContractCard checkbox** - `b987bef` (feat)
2. **Task 2: Create ContractComparison page, wire into App.tsx, and add re-analyze preservation** - `a53cdfa` (feat)
3. **Task 3: Update Sidebar and vercel.json for compare route** - no-op (existing catch-all rewrite and sidebar logic already handle 'compare' view correctly)

## Files Created/Modified
- `src/pages/ContractComparison.tsx` - Side-by-side comparison view with risk delta and category-grouped findings
- `src/types/contract.ts` - Added 'compare' to ViewState union
- `src/hooks/useRouter.ts` - Added /compare route with query param parsing and compareIds support
- `src/pages/AllContracts.tsx` - Checkbox selection state, max-2 guard, Compare Selected button
- `src/components/ContractCard.tsx` - Optional checkbox with stopPropagation, selected ring styling
- `src/App.tsx` - Compare route case, re-analyze finding preservation logic with toast

## Decisions Made
- Used clauseReference+category composite key for finding identity -- matches across re-analysis when the same clause is found again. Keys with 'N/A' or 'Not Found' are excluded from matching.
- Compare is a transient view with no sidebar entry -- highlighted sidebar item is none (or nothing), which is the desired UX since comparison is always accessed from All Contracts.
- GitCompareArrows icon chosen to visually differentiate the Compare button from the Upload button which uses Plus.

## Deviations from Plan

None - plan executed exactly as written. Task 3 was a verification task; both Sidebar and vercel.json already handled the new view correctly without modifications.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Comparison and re-analyze preservation features are complete
- Ready for remaining portfolio intelligence plans (if any)
- Pre-existing type errors in ContractReview.tsx are unrelated to this plan's changes

## Self-Check: PASSED

All 6 key files verified present. Both task commits (b987bef, a53cdfa) verified in git log.

---
*Phase: 25-portfolio-intelligence*
*Completed: 2026-03-15*
