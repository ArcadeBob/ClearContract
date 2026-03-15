---
phase: 23-analysis-quality
plan: 03
subsystem: api
tags: [anthropic, zod, synthesis, compound-risk, structured-output]

# Dependency graph
requires:
  - phase: 23-01
    provides: multi-pass analysis pipeline with merge and dedup
  - phase: 23-02
    provides: scoring with Compound Risk category weight 0, bid signal computation
provides:
  - 17th synthesis pass detecting compound risks across findings
  - Compound Risk category in type system
  - isSynthesis exclusion flag on findings
  - SynthesisPassResultSchema for structured output
affects: [ui-components, contract-review]

# Tech tracking
tech-stack:
  added: []
  patterns: [synthesis-pass-after-dedup, graceful-failure-non-critical-pass]

key-files:
  created:
    - src/schemas/synthesisAnalysis.ts
  modified:
    - src/types/contract.ts
    - api/merge.ts
    - api/analyze.ts

key-decisions:
  - "Synthesis pass uses streaming pattern consistent with runAnalysisPass to avoid HeadersTimeoutError"
  - "Synthesis findings appended after mergePassResults (double-safe scoring exclusion)"
  - "max_tokens set to 4096 (not 8192) to keep synthesis fast and avoid timeout"

patterns-established:
  - "Non-critical passes fail gracefully: log error, return empty array, do not create error findings"

requirements-completed: [PIPE-01]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 23 Plan 03: Synthesis Pass Summary

**17th synthesis pass detecting compound risks across multiple clause types using Claude API with structured output**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T19:01:25Z
- **Completed:** 2026-03-14T19:04:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added Compound Risk category to CATEGORIES tuple and isSynthesis flag to Finding/UnifiedFinding interfaces
- Created SynthesisPassResultSchema with Zod for structured output validation
- Implemented runSynthesisPass function with streaming API call pattern, compact finding summaries, and graceful failure handling
- Integrated synthesis pass into pipeline after mergePassResults but before ID assignment, ensuring double-safe exclusion from risk score and bid signal

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Compound Risk category, isSynthesis flag, and synthesis schema** - `c6b1d6e` (feat)
2. **Task 2: Implement runSynthesisPass and integrate into analysis pipeline** - `08e29a2` (feat)

## Files Created/Modified
- `src/schemas/synthesisAnalysis.ts` - Zod schema for synthesis pass structured output (SynthesisPassResultSchema, SynthesisFindingSchema)
- `src/types/contract.ts` - Added 'Compound Risk' to CATEGORIES, isSynthesis flag to Finding interface
- `api/merge.ts` - Added isSynthesis flag to UnifiedFinding interface
- `api/analyze.ts` - runSynthesisPass function and pipeline integration after mergePassResults

## Decisions Made
- Used streaming API pattern consistent with runAnalysisPass to avoid HeadersTimeoutError
- Set max_tokens to 4096 (half of normal 8192) to keep synthesis pass fast and avoid timeout
- Synthesis findings appended after mergePassResults so they skip dedup (they are new findings) and are double-safe excluded from scoring (appended after score computation + Compound Risk weight 0)
- Synthesis failure is non-fatal: logs error, returns empty array, does not create error findings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Synthesis pass complete and integrated into pipeline
- Compound Risk findings will appear in contract review UI automatically (category/severity rendering already handles any valid Category value)
- Phase 23 analysis quality improvements complete (all 3 plans done)

---
*Phase: 23-analysis-quality*
*Completed: 2026-03-14*
