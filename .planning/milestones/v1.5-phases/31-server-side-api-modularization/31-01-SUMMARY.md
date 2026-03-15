---
phase: 31-server-side-api-modularization
plan: 01
subsystem: api
tags: [refactor, modularization, serverless, vercel]

# Dependency graph
requires:
  - phase: 30-type-safety-hardening
    provides: Zod schemas for all pass result types
provides:
  - api/passes.ts module with 16 analysis pass definitions, AnalysisPass interface, SYNTHESIS_SYSTEM_PROMPT
  - Slimmed api/analyze.ts (~443 lines) containing only handler, config, constants, and orchestration
affects: [api-analyze, api-passes, server-side-modularization]

# Tech tracking
tech-stack:
  added: []
  patterns: [one-way module dependency (analyze imports from passes, never reverse), pure data extraction refactor]

key-files:
  created: [api/passes.ts]
  modified: [api/analyze.ts]

key-decisions:
  - "AnalysisPass.schema typed as z.ZodTypeAny in passes.ts instead of Parameters<typeof zodToOutputFormat>[0] to avoid circular dependency on analyze.ts"

patterns-established:
  - "One-way dependency: api/analyze.ts imports from api/passes.ts, never the reverse"
  - "Pass definitions are pure data declarations separated from imperative handler logic"

requirements-completed: [DECOMP-04, DECOMP-05]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 31 Plan 01: Pass Definitions Extraction Summary

**Extracted 16 analysis pass definitions and SYNTHESIS_SYSTEM_PROMPT from 1479-line api/analyze.ts monolith into api/passes.ts, reducing analyze.ts to 443 lines of handler/orchestration code**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T18:43:44Z
- **Completed:** 2026-03-15T18:47:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created api/passes.ts (1038 lines) with all 16 pass definitions, AnalysisPass interface, and SYNTHESIS_SYSTEM_PROMPT
- Reduced api/analyze.ts from 1479 to 443 lines (70% reduction)
- Zero behavior change: build succeeds, lint clean (0 errors), merge.ts untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Create api/passes.ts with extracted pass definitions** - `fddcff7` (feat)
2. **Task 2: Update api/analyze.ts to import from passes.ts and remove extracted code** - `b63882e` (refactor)

## Files Created/Modified
- `api/passes.ts` - New module with 16 analysis pass definitions, AnalysisPass interface, and SYNTHESIS_SYSTEM_PROMPT
- `api/analyze.ts` - Slimmed to handler, config, constants, zodToOutputFormat, runAnalysisPass, runSynthesisPass, and orchestration

## Decisions Made
- Used `z.ZodTypeAny` for AnalysisPass.schema field in passes.ts instead of `Parameters<typeof zodToOutputFormat>[0]` to avoid circular dependency (zodToOutputFormat lives in analyze.ts)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- api/analyze.ts is now modular: pass definitions in passes.ts, handler/orchestration in analyze.ts
- merge.ts unchanged at 554 lines (DECOMP-05 satisfied by Phase 30 type guard work)
- Ready for further modularization if needed (e.g., extracting handler utilities)

---
*Phase: 31-server-side-api-modularization*
*Completed: 2026-03-15*
