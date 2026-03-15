---
phase: 30-type-safety-hardening
plan: 03
subsystem: types
tags: [typescript, tsc, type-safety, zod]

requires:
  - phase: 30-01
    provides: Zod schemas and MergedFinding type in schemas/finding.ts
  - phase: 30-02
    provides: Re-export of MergedFinding as Finding in contract.ts
provides:
  - tsc --noEmit clean compilation for contract.ts and contractStorage.ts
  - Finding type available in local scope for Contract interface
  - Type-safe migration cast pattern in contractStorage.ts
affects: [31-server-modularization]

tech-stack:
  added: []
  patterns: ["import type + export type for local + external type consumption", "as unknown as T double-cast for intentional coercion"]

key-files:
  created: []
  modified: [src/types/contract.ts, src/storage/contractStorage.ts]

key-decisions:
  - "Added import type alongside existing export type to serve both local scope and external consumers"

patterns-established:
  - "Double-cast through unknown for migration functions where source type doesn't structurally overlap target"

requirements-completed: [TYPE-01, TYPE-02, TYPE-03]

duration: 2min
completed: 2026-03-15
---

# Phase 30 Plan 03: TSC Strict Mode Fix Summary

**Fixed two tsc --noEmit errors (TS2304, TS2352) by adding Finding import for local scope and double-cast for migration coercion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T17:38:40Z
- **Completed:** 2026-03-15T17:40:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed TS2304 in contract.ts by importing MergedFinding as Finding for local scope resolution
- Fixed TS2352 in contractStorage.ts by using `as unknown as Contract` double-cast pattern
- Verified build and lint continue to pass with zero new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Finding type resolution in contract.ts** - `2c2f05d` (fix)
2. **Task 2: Fix migration cast in contractStorage.ts** - `47cc2ad` (fix)

## Files Created/Modified
- `src/types/contract.ts` - Added `import type { MergedFinding as Finding }` at top for local scope
- `src/storage/contractStorage.ts` - Changed `as Contract` to `as unknown as Contract` in migrateContracts

## Decisions Made
- Added import type alongside existing export type rather than replacing: the export serves external consumers, the import serves the local Contract interface

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing tsc errors in CoverageComparisonTab.tsx (TS6133, unused var) and useContractStore.ts (TS2322, note type mismatch) are out of scope per plan specification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 30 type safety hardening is now complete with clean tsc compilation for all phase-30 files
- Ready for Phase 31 server modularization

---
*Phase: 30-type-safety-hardening*
*Completed: 2026-03-15*
