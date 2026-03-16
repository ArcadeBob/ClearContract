---
phase: 37-api-integration-tests
plan: 01
subsystem: testing
tags: [vitest, api, mock, anthropic-sdk, vercel]

# Dependency graph
requires:
  - phase: 33-test-infrastructure
    provides: "Vitest config, factory functions, test patterns"
  - phase: 34-schema-logic-tests
    provides: "Pass-specific factory functions in src/test/factories.ts"
provides:
  - "Test fixture infrastructure for all 16 analysis passes + synthesis"
  - "Mock patterns for Anthropic SDK, PDF module, knowledge registry"
  - "Endpoint validation and error path tests for /api/analyze"
affects: [37-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [vi.mock hoisting for SDK/module mocking, createStreamResponse async iterable pattern, createMockReq/Res factory helpers]

key-files:
  created:
    - api/test-fixtures/pass-responses.ts
  modified:
    - api/analyze.test.ts

key-decisions:
  - "Raw flat-field fixtures instead of factory-generated: fixtures match API JSON shape (flat pass-specific fields) not Zod-parsed MergedFinding shape"
  - "Mock callIndex routing: sequential mockCreate calls map to PASS_NAMES array for deterministic pass-to-fixture mapping"
  - "mockClear before preparePdfForAnalysis assertion: isolates call count from prior tests sharing mock state"

patterns-established:
  - "Anthropic SDK mock: vi.mock default export with beta.messages.create, beta.files.delete"
  - "Stream simulation: createStreamResponse yields single content_block_delta with full JSON text"
  - "Knowledge module mock: must mock registry, index, and all 3 side-effect imports (regulatory, trade, standards)"

requirements-completed: [INTG-01, INTG-02]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 37 Plan 01: Test Fixtures & Endpoint Validation Summary

**Mock infrastructure for 16-pass API handler with 9 integration tests covering validation, error codes, CORS, and successful response structure**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T15:56:32Z
- **Completed:** 2026-03-16T16:01:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created complete fixture data for all 16 analysis passes with raw flat-field objects matching Anthropic API response shape
- Established mock infrastructure: Anthropic SDK, PDF module, knowledge registry/index, 3 knowledge side-effect modules
- 9 integration tests proving handler validation (405, 400, 500), CORS, OPTIONS preflight, and successful 200 response with full structure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pass response fixtures and test helpers** - `3c239ce` (feat)
2. **Task 2: Write endpoint validation and error path tests** - `e730086` (feat)

## Files Created/Modified
- `api/test-fixtures/pass-responses.ts` - 16 pass fixtures, synthesis fixture, stream helper, mock req/res factories, PASS_NAMES constant
- `api/analyze.test.ts` - 9 integration tests in 2 describe blocks (validation + successful analysis)

## Decisions Made
- Used raw flat-field objects for fixtures rather than factory functions, since handler receives raw JSON from API (not Zod-parsed MergedFinding shape)
- Sequential mockCreate call routing via callIndex maps to PASS_NAMES array for deterministic fixture selection
- Used mockClear() before preparePdfForAnalysis assertion to isolate from prior test state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed preparePdfForAnalysis call count assertion**
- **Found during:** Task 2 (endpoint validation tests)
- **Issue:** `toHaveBeenCalledTimes(1)` failed because prior tests also invoke handler with valid requests, accumulating mock call count
- **Fix:** Added `mockClear()` before the specific test to reset call count
- **Files modified:** api/analyze.test.ts
- **Verification:** All 9 tests pass
- **Committed in:** e730086 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test isolation fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Mock infrastructure fully established and reusable by Plan 02
- passFixtures, synthesisFixture, and all helpers exported for Plan 02's pass result and synthesis tests

---
*Phase: 37-api-integration-tests*
*Completed: 2026-03-16*
