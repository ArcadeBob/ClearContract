---
phase: 49-coverage-push
plan: 02
subsystem: testing
tags: [vitest, jspdf, supabase-mock, csv-export, hook-testing]

requires:
  - phase: 46-test-restoration
    provides: "Passing test suite with Supabase-aware mock patterns"
  - phase: 49-coverage-push-01
    provides: "Test infrastructure and factory patterns"
provides:
  - "67 new tests covering CSV/PDF export, settings validation, palette utilities, and useContractStore hook"
  - "useContractStore 0% to tested coverage with all mutations verified"
affects: [49-coverage-push-03, 50-dead-code-cleanup]

tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for mock variables referenced in vi.mock() factory functions"
    - "Chainable Supabase query builder mock with thenable for Promise.all resolution"

key-files:
  created:
    - src/utils/exportContractCsv.test.ts
    - src/utils/exportContractPdf.test.ts
    - src/utils/settingsValidation.test.ts
    - src/utils/palette.test.ts
    - src/hooks/__tests__/useContractStore.test.ts
  modified: []

key-decisions:
  - "Used vi.hoisted() to solve jsPDF mock hoisting issue instead of inline factory"
  - "Mocked mappers as identity pass-through to simplify useContractStore testing"
  - "Used thenable pattern on query mock to support Promise.all in initial fetch"

patterns-established:
  - "vi.hoisted() pattern: declare mock variables inside vi.hoisted() when vi.mock() factory needs them"
  - "Supabase chainable mock: createQueryMock() returns object with self-referencing chain methods"

requirements-completed: [COV-02, COV-03]

duration: 5min
completed: 2026-03-20
---

# Phase 49 Plan 02: Utility and Hook Test Coverage Summary

**67 new tests covering CSV/PDF export, settings validation, palette utilities, and useContractStore hook mutations with mocked Supabase**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T03:20:46Z
- **Completed:** 2026-03-21T03:26:15Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- 4 utility test files (56 tests): CSV export with escapeCsv/sanitizeFilename/downloadCsv, PDF export with jsPDF/autoTable mocks, settings validation for all field types, palette color mappings
- 1 hook test file (11 tests): useContractStore covering initial fetch, stitching, error handling, addContract, updateContract, deleteContract (success + revert), toggleFindingResolved, renameContract, isUploading
- All 67 new tests passing with zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Utility function tests (CSV, PDF, settings, palette)** - `9d732a7` (test)
2. **Task 2: useContractStore hook mutation tests** - `2be0cf7` (test)

## Files Created/Modified
- `src/utils/exportContractCsv.test.ts` - 21 tests for CSV export functions (escapeCsv, sanitizeFilename, exportContractCsv, downloadCsv)
- `src/utils/exportContractPdf.test.ts` - 7 tests for PDF generation with jsPDF/autoTable mocks
- `src/utils/settingsValidation.test.ts` - 16 tests for dollar, date, employeeCount, and text validation
- `src/utils/palette.test.ts` - 12 tests for SEVERITY_BADGE_COLORS, getRiskScoreColor, getRiskBadgeColor
- `src/hooks/__tests__/useContractStore.test.ts` - 11 tests for contract store hook mutations

## Decisions Made
- Used `vi.hoisted()` to solve the jsPDF mock variable hoisting issue (vi.mock factories are hoisted above variable declarations)
- Mocked `../../lib/mappers` as identity pass-through to avoid needing snake_case test data
- Created chainable query mock with `then` method to support `Promise.all` resolution pattern used in useContractStore's initial fetch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed toEndWith matcher not available in vitest**
- **Found during:** Task 1 (PDF export tests)
- **Issue:** Used `toEndWith` which is not a built-in vitest/chai matcher
- **Fix:** Replaced with `toMatch(/-report\.pdf$/)` regex matcher
- **Files modified:** src/utils/exportContractPdf.test.ts
- **Verification:** All 7 PDF tests pass
- **Committed in:** 9d732a7 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed vi.mock hoisting with vi.hoisted()**
- **Found during:** Task 1 (PDF export tests)
- **Issue:** `vi.mock('jspdf')` factory referenced `mockJsPdfInstance` variable declared below, but vi.mock is hoisted above declarations
- **Fix:** Wrapped all mock variables in `vi.hoisted()` block so they are available at hoist time
- **Files modified:** src/utils/exportContractPdf.test.ts
- **Verification:** All 7 PDF tests pass

**3. [Rule 3 - Blocking] Fixed self-referencing const in createQueryMock**
- **Found during:** Task 2 (useContractStore tests)
- **Issue:** `const mock = { select: vi.fn().mockReturnValue(mock) }` fails because `mock` is used in its own initializer (TDZ)
- **Fix:** Changed to `const mock: Record<...> = {}; mock.select = vi.fn(() => mock);` pattern
- **Files modified:** src/hooks/__tests__/useContractStore.test.ts
- **Verification:** All 11 hook tests pass

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 67 new tests added to the suite, pushing toward 60% statement coverage
- Plan 49-03 (component render tests and coverage gate) is unblocked

---
*Phase: 49-coverage-push*
*Completed: 2026-03-20*
