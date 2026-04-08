---
phase: 56-architecture-foundation
plan: 01
subsystem: api
tags: [analysis-passes, knowledge-modules, scope-extraction, stage-marker]

# Dependency graph
requires: []
provides:
  - "Renamed scope-extraction pass (from scope-of-work) across 12 files"
  - "Raised MAX_MODULES_PER_PASS constant from 4 to 6"
  - "AnalysisPass.stage optional field (2 | 3) for Stage 3 orchestration"
affects: [56-02, 56-03, 57-scope-extraction, 58-knowledge-modules, 59-spec-reconciliation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "stage?: 2 | 3 marker on AnalysisPass for wave filtering"
    - "Internal pass names are machine identifiers; human labels stay in PASS_LABELS map"

key-files:
  created: []
  modified:
    - api/passes.ts
    - api/analyze.ts
    - api/merge.ts
    - api/merge.test.ts
    - api/test-fixtures/pass-responses.ts
    - src/types/contract.ts
    - src/schemas/finding.ts
    - src/knowledge/registry.ts
    - src/knowledge/__tests__/registry.test.ts
    - src/components/CostSummaryBar.tsx
    - src/components/ScopeMetaBadge/index.tsx
    - src/components/ScopeMetaBadge/ScopeOfWorkBadge.tsx
    - src/knowledge/tokenBudget.ts

key-decisions:
  - "No scope-reconciliation stub registered in ANALYSIS_PASSES -- preserves testable empty Stage 3 wave path for Plan 03"
  - "Human-facing label 'Scope of Work' preserved in CostSummaryBar PASS_LABELS -- only internal key renamed"

patterns-established:
  - "Internal pass name !== display label: dispatch keys are machine identifiers, PASS_LABELS values are user-facing"
  - "stage field defaults to 2 when undefined, interpreted by orchestration (Plan 03)"

requirements-completed: [ARCH-03]

# Metrics
duration: 5min
completed: 2026-04-05
---

# Phase 56 Plan 01: Architecture Foundation - Pass Rename & Cap Raise Summary

**Renamed scope-of-work to scope-extraction across 12 files, raised MAX_MODULES_PER_PASS from 4 to 6, added stage marker to AnalysisPass interface**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-05T22:54:00Z
- **Completed:** 2026-04-05T23:03:14Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Raised MAX_MODULES_PER_PASS from 4 to 6 to accommodate additional knowledge modules for v3.0 scope-intel passes
- Renamed internal pass name from `scope-of-work` to `scope-extraction` across all 12 runtime and test files with zero stale references
- Added `stage?: 2 | 3` optional field to the AnalysisPass interface, enabling Stage 3 orchestration filtering in Plan 03
- All tests pass (471/472 -- 1 pre-existing failure in ReviewHeader unrelated to rename), build succeeds, lint clean (0 errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Raise MAX_MODULES_PER_PASS to 6** - `4565a40` (chore)
2. **Task 2: Rename scope-of-work to scope-extraction + add stage field** - `a406ac2` (feat)

## Files Created/Modified
- `src/knowledge/tokenBudget.ts` - MAX_MODULES_PER_PASS constant raised from 4 to 6
- `api/passes.ts` - AnalysisPass interface gains stage field; pass entry renamed
- `api/analyze.ts` - PASSES_RECEIVING_PROFILE set entry renamed
- `api/merge.ts` - passType assignment, passHandlers key, isSpecializedPass list renamed
- `api/merge.test.ts` - Test descriptions and assertions updated for scope-extraction
- `api/test-fixtures/pass-responses.ts` - Fixture key renamed
- `src/types/contract.ts` - ScopeMeta discriminated union passType literal renamed
- `src/schemas/finding.ts` - z.literal('scope-extraction') in ScopeMetaSchema
- `src/knowledge/registry.ts` - PASS_KNOWLEDGE_MAP key renamed
- `src/knowledge/__tests__/registry.test.ts` - Test description and getModulesForPass call renamed
- `src/components/CostSummaryBar.tsx` - PASS_ORDER and PASS_LABELS keys renamed (label value preserved)
- `src/components/ScopeMetaBadge/index.tsx` - Badge dispatch map key renamed
- `src/components/ScopeMetaBadge/ScopeOfWorkBadge.tsx` - Extract type filter renamed

## Decisions Made
- Did NOT register scope-reconciliation stub in ANALYSIS_PASSES -- CONTEXT.md Success Criterion #4 requires Stage 3 to be testable with zero registered passes (empty wave). Plan 03 will register the stub when wiring Stage 3 orchestration.
- Kept human-facing label "Scope of Work" in CostSummaryBar PASS_LABELS -- only the internal machine key changed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failure in `src/components/ReviewHeader.test.tsx` (LifecycleSelect component receives undefined `LIFECYCLE_TRANSITIONS[current]`). Confirmed pre-existing via git stash test. Not related to rename.
- Pre-existing TypeScript strict-mode warnings (unused vars, missing lifecycleStatus in test factories). Not related to rename.

## Deferred Items

- Vercel plugin recommends migrating `api/analyze.ts` from direct Anthropic SDK to Vercel AI SDK. Out of scope for ARCH-03 pass rename. Logged for future consideration.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- scope-extraction pass name is live across all runtime and test code
- MAX_MODULES_PER_PASS = 6 ready for Phase 58 knowledge module additions
- AnalysisPass.stage field ready for Plan 03 Stage 3 orchestration wiring
- Plan 02 (ARCH-02 inference basis) can proceed independently

---
*Phase: 56-architecture-foundation*
*Completed: 2026-04-05*
