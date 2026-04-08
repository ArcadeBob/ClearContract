---
phase: 58-knowledge-modules-multi-document-input
plan: 04
subsystem: ui
tags: [react, framer-motion, modal, re-analyze, document-selection]

# Dependency graph
requires:
  - phase: 58-02
    provides: Server-side bid pipeline with Supabase Storage
  - phase: 58-03
    provides: Client-side bid upload UI and analyzeContract bidFile parameter
provides:
  - ReAnalyzeModal component with full document selection (keep/replace contract, keep/replace/remove bid)
  - Documents badge ("Contract + Bid") on ReviewHeader for bid-attached contracts
  - AnalyzeOptions interface for keepCurrentContract and removeBid flags
  - App.tsx re-analyze flow accepting ReAnalyzeResult instead of raw File
affects: [Phase 59 re-analyze flows, Phase 60 bid reconciliation UX]

# Tech tracking
tech-stack:
  added: []
  patterns: [portal-based modal with fieldset/legend radio groups, AnalyzeOptions parameter object pattern]

key-files:
  created: [src/components/ReAnalyzeModal.tsx]
  modified: [src/components/ReviewHeader.tsx, src/App.tsx, src/api/analyzeContract.ts]

key-decisions:
  - "hasStoredContract hardcoded true in ReviewHeader -- server handles false case; avoids threading storage state to client"
  - "AnalyzeOptions as 5th parameter with keepCurrentContract sending minimal base64 placeholder -- server uses Storage when flag is true"

patterns-established:
  - "ReAnalyzeModal portal pattern: fieldset/legend radio groups with inline file pickers for document selection"

requirements-completed: [BID-03, BID-05]

# Metrics
duration: 5min
completed: 2026-04-06
---

# Phase 58 Plan 04: Re-Analyze Document Selection Summary

**ReAnalyzeModal replaces confirm dialog with document selection UX -- keep/replace contract, keep/replace/remove bid -- plus "Contract + Bid" badge on review header**

## Performance

- **Duration:** ~5 min (continuation -- docs only; implementation completed in prior session)
- **Started:** 2026-04-06T23:55:00Z
- **Completed:** 2026-04-07T00:18:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- ReAnalyzeModal with full document selection: radio groups for contract (keep/upload) and bid (none/keep/upload/remove), inline file pickers, portal rendering with escape/backdrop dismiss
- ReviewHeader shows emerald "Contract + Bid" badge when bidFileName is present on contract
- App.tsx handleReanalyze accepts ReAnalyzeResult with keepCurrentContract and removeBid options flowing through to analyzeContract
- analyzeContract extended with AnalyzeOptions parameter -- sends minimal base64 placeholder when keeping current contract, removeBid flag for bid deletion

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ReAnalyzeModal and update ReviewHeader** - `b226499` (feat)
2. **Task 2: Wire re-analyze document selection through App.tsx** - `ec67ab3` (feat)
3. **Task 3: Verify upload and re-analyze flows** - approved via code review (no commit)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/ReAnalyzeModal.tsx` - Portal-based modal with contract/bid radio groups, inline file pickers, ReAnalyzeResult interface
- `src/components/ReviewHeader.tsx` - Replaced ConfirmDialog re-analyze flow with ReAnalyzeModal, added "Contract + Bid" badge
- `src/App.tsx` - handleReanalyze accepts ReAnalyzeResult, passes keepCurrentContract/removeBid to analyzeContract
- `src/api/analyzeContract.ts` - Added AnalyzeOptions interface, 5th parameter support for keep-current and remove-bid flags

## Decisions Made
- hasStoredContract hardcoded to true in ReviewHeader -- server handles the false case for pre-v3.0 contracts; avoids threading storage availability state to the client
- AnalyzeOptions as a separate 5th parameter object rather than overloading the existing positional params -- cleaner extension point
- When keepCurrentContract is true, client sends minimal valid base64 ('AA==') as placeholder -- server uses Supabase Storage copy instead

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 58 is now complete (4/4 plans) -- all knowledge modules and multi-document input infrastructure shipped
- Phase 59 (Spec Reconciliation + Exclusion Stress-Test) is unblocked -- Stage 3 passes can consume knowledge modules and bid documents
- Phase 60 (Bid Reconciliation Capstone) is unblocked -- full document selection and attribution pipeline available

---
*Phase: 58-knowledge-modules-multi-document-input*
*Completed: 2026-04-06*

## Self-Check: PASSED
