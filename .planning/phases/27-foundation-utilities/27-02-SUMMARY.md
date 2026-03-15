---
phase: 27-foundation-utilities
plan: 02
subsystem: utils
tags: [localStorage, error-handling, tailwind, refactoring, palette]

requires:
  - phase: 27-01
    provides: "storageManager, classifyError, formatApiError, SEVERITY_BADGE_COLORS, getRiskScoreColor, getRiskBadgeColor"
provides:
  - "All localStorage calls consolidated through storageManager (zero direct calls remain)"
  - "All error classification uses classifyError (zero ad-hoc error detection remains)"
  - "All severity/risk colors use palette imports (zero inline color objects remain)"
affects: [28, 29, 30, 31]

tech-stack:
  added: []
  patterns: [single-source-of-truth for storage/errors/colors]

key-files:
  created: []
  modified:
    - src/storage/contractStorage.ts
    - src/knowledge/profileLoader.ts
    - src/hooks/useCompanyProfile.ts
    - src/pages/ContractReview.tsx
    - src/App.tsx
    - api/analyze.ts
    - src/components/SeverityBadge.tsx
    - src/components/RiskScoreDisplay.tsx
    - src/components/ContractCard.tsx
    - src/pages/ContractComparison.tsx
    - src/utils/palette.ts

key-decisions:
  - "Added border classes to getRiskBadgeColor for ContractComparison compatibility (inert when no border-width set)"
  - "LegalMetaBadge and ScopeMetaBadge pass/fail colors left inline -- domain-specific, not severity/risk patterns"

patterns-established:
  - "All localStorage access via storageManager load/save/loadRaw/saveRaw/remove"
  - "All error classification via classifyError with retryable flag driving retry UI"
  - "All severity colors via SEVERITY_BADGE_COLORS, risk colors via getRiskScoreColor/getRiskBadgeColor"

requirements-completed: [PATN-01, PATN-02, PATN-03]

duration: 4min
completed: 2026-03-15
---

# Phase 27 Plan 02: Call Site Migration Summary

**Migrated 10 files to use shared storageManager, classifyError, and severity palette -- zero direct localStorage, zero inline error detection, zero inline severity colors remain**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T04:57:46Z
- **Completed:** 2026-03-15T05:01:18Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Eliminated all 12 direct localStorage calls across 4 files, routing through storageManager
- Replaced isNetworkError and inline error checks with classifyError in App.tsx and api/analyze.ts
- Replaced inline severity color objects and risk score ternary chains in 4 components with palette imports
- Added border classes to getRiskBadgeColor for ContractComparison border styling compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor storage and error call sites** - `5cb1831` (refactor)
2. **Task 2: Refactor severity and risk color call sites** - `9367e4c` (refactor)

## Files Created/Modified
- `src/storage/contractStorage.ts` - Uses storageManager load/save/loadRaw/saveRaw/remove instead of direct localStorage
- `src/knowledge/profileLoader.ts` - Uses storageManager load instead of localStorage.getItem + JSON.parse
- `src/hooks/useCompanyProfile.ts` - Uses storageManager save instead of localStorage.setItem
- `src/pages/ContractReview.tsx` - Uses storageManager loadRaw/saveRaw for hide-resolved preference
- `src/App.tsx` - Uses classifyError instead of isNetworkError for upload and reanalyze error handling
- `api/analyze.ts` - Uses classifyError + formatApiError instead of manual status/message checks
- `src/components/SeverityBadge.tsx` - Uses SEVERITY_BADGE_COLORS from palette
- `src/components/RiskScoreDisplay.tsx` - Uses getRiskScoreColor from palette
- `src/components/ContractCard.tsx` - Uses getRiskBadgeColor from palette
- `src/pages/ContractComparison.tsx` - Uses getRiskBadgeColor from palette
- `src/utils/palette.ts` - Added border classes to getRiskBadgeColor return values

## Decisions Made
- Added border classes (border-red-200, border-amber-200, border-emerald-200) to getRiskBadgeColor return values so ContractComparison can use a single function call. The extra border-color class is inert in ContractCard where no border-width is applied.
- Left LegalMetaBadge and ScopeMetaBadge inline colors alone -- those are domain-specific pass/fail indicators, not severity/risk patterns.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three pattern consolidations complete (PATN-01, PATN-02, PATN-03)
- Phase 27 Foundation Utilities fully done -- ready for Phase 28
- storageManager, errors.ts, and palette.ts are the single sources of truth for their respective concerns

---
*Phase: 27-foundation-utilities*
*Completed: 2026-03-15*
