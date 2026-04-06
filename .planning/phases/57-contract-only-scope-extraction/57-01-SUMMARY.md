---
phase: 57-contract-only-scope-extraction
plan: 01
subsystem: api
tags: [zod, structured-outputs, submittals, scope-extraction, supabase, merge-pipeline]

requires:
  - phase: 56-architecture-foundation
    provides: Multi-pass pipeline with scope-extraction pass, merge pipeline, structured output schemas
provides:
  - SubmittalEntry Zod schema and TypeScript interface
  - ScopeOfWorkPassResultSchema with submittals array
  - quantity-ambiguity scopeItemType value
  - Contract.submittals field
  - Scope-extraction prompt with submittal extraction and quantity-ambiguity detection
  - Merge pipeline submittal passthrough
  - DB submittals jsonb column with empty array default
affects: [57-02, 57-03, schedule-conflicts, submittal-register-ui, quantity-ambiguity-ui]

tech-stack:
  added: []
  patterns: [statedFields provenance tracking for downstream schedule-conflict computation]

key-files:
  created:
    - supabase/migrations/20260405_add_submittals.sql
  modified:
    - src/schemas/scopeComplianceAnalysis.ts
    - src/types/contract.ts
    - api/passes.ts
    - api/merge.ts
    - api/analyze.ts
    - src/test/factories.ts
    - src/pages/Dashboard.test.tsx

key-decisions:
  - "statedFields array tracks which numeric fields the LLM found explicit values for -- enables schedule-conflict to distinguish stated vs default values"
  - "No .nullable()/.optional() on SubmittalEntrySchema -- structured outputs requirement; numeric fields use 0 when unstated"

patterns-established:
  - "statedFields provenance: LLM reports which fields had explicit contract values, downstream logic checks statedFields.includes() before applying defaults"

requirements-completed: [SCOPE-01, SCOPE-05]

duration: 10min
completed: 2026-04-06
---

# Phase 57 Plan 01: Scope Extraction Data Foundation Summary

**SubmittalEntry schema with statedFields provenance, quantity-ambiguity scopeItemType, and full pipeline wiring from LLM response through merge to DB write**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-06T04:09:33Z
- **Completed:** 2026-04-06T04:19:23Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Defined SubmittalEntrySchema (Zod) and SubmittalEntry (TypeScript) with statedFields provenance tracking for downstream schedule-conflict computation
- Extended scope-extraction pass prompt with Submittal Register Extraction and Quantity Ambiguity Detection instruction sections
- Wired submittals through merge pipeline (accumulator, scope-extraction extraction, return object) to analyze.ts DB write
- Created DB migration adding submittals jsonb column with empty array default for backward compatibility
- Added quantity-ambiguity to scopeItemType enum for scope findings

## Task Commits

Each task was committed atomically:

1. **Task 1: SubmittalEntry schema + type definitions + DB migration + scopeItemType extension** - `b1c5a88` (feat)
2. **Task 2: Extend scope-extraction pass prompt + merge pipeline + analyze.ts DB write** - `64755d5` (feat)

## Files Created/Modified
- `src/schemas/scopeComplianceAnalysis.ts` - SubmittalEntrySchema, quantity-ambiguity enum value, submittals in ScopeOfWorkPassResultSchema
- `src/types/contract.ts` - SubmittalEntry interface, Contract.submittals field
- `supabase/migrations/20260405_add_submittals.sql` - submittals jsonb column with empty array default
- `api/passes.ts` - Submittal Register Extraction and Quantity Ambiguity Detection prompt sections
- `api/merge.ts` - SubmittalEntry import, MergedResult.submittals, allSubmittals accumulator, scope-extraction extraction
- `api/analyze.ts` - submittals passed through to contract payload DB write
- `src/test/factories.ts` - Added submittals and lifecycleStatus to createContract defaults
- `src/pages/Dashboard.test.tsx` - Added submittals and lifecycleStatus to test contract objects

## Decisions Made
- statedFields array tracks which numeric fields the LLM found explicit values for in the contract text -- this enables downstream schedule-conflict computation to distinguish between stated durations and industry defaults
- No .nullable()/.optional() on SubmittalEntrySchema fields -- structured outputs requires all fields present; numeric fields use 0 when unstated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test factories and Dashboard test missing submittals and lifecycleStatus**
- **Found during:** Task 1 (type verification)
- **Issue:** Adding submittals to Contract interface caused type errors in test factories and Dashboard test which construct Contract objects without the new field. lifecycleStatus was also missing (pre-existing).
- **Fix:** Added `submittals: []` and `lifecycleStatus: 'Draft'` to createContract factory defaults and Dashboard test contract objects
- **Files modified:** src/test/factories.ts, src/pages/Dashboard.test.tsx
- **Verification:** tsc --noEmit shows no errors related to submittals or SubmittalEntry
- **Committed in:** b1c5a88 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for type correctness after Contract interface change. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SubmittalEntry data type and schema ready for Plan 02 (submittal register UI) and Plan 03 (schedule conflict computation)
- Scope-extraction pass will now return submittals array and quantity-ambiguity findings on next contract upload
- DB column ready to receive submittal data

---
*Phase: 57-contract-only-scope-extraction*
*Completed: 2026-04-06*
