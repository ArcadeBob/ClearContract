---
phase: 51-analysis-pipeline-parallelization-and-token-capture
plan: 02
subsystem: api
tags: [anthropic, streaming, abort-controller, token-capture, cost-tracking, prompt-cache]

# Dependency graph
requires:
  - phase: 51-analysis-pipeline-parallelization-and-token-capture
    plan: 01
    provides: analysis_usage table, PassUsage/PassWithUsage types, computePassCost function, Partial status constraint
provides:
  - Two-stage cache pipeline (primer then 15 parallel) in api/analyze.ts
  - Per-pass AbortController timeouts (90s) with global safety timeout (250s)
  - Streaming token usage capture from message_start and message_delta events
  - analysis_usage DB writes with per-pass cost computation
  - Progressive save path with Partial contract status on global timeout
affects: [52-cost-display]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-stage cache pipeline, per-pass AbortController with global timeout, streaming usage capture]

key-files:
  created: []
  modified:
    - api/analyze.ts

key-decisions:
  - "Independent AbortControllers per pass (no parent-child hierarchy) -- simpler and more debuggable"
  - "Defensive as-casts with ?? 0 for streaming usage fields -- beta types may have nullable fields"
  - "Abort errors filtered before mergePassResults to prevent 'Pass Failed' findings for timeouts"
  - "SDK timeout kept at 280s as last-resort safety net behind per-pass 90s and global 250s timeouts"

patterns-established:
  - "Two-stage cache pipeline: primer pass creates cache, parallel passes read from it"
  - "Per-pass AbortController + global timeout pattern for resilient parallel API calls"
  - "Streaming event usage capture: message_start for input/cache tokens, message_delta for output tokens"

requirements-completed: [PERF-01, PERF-02, PERF-03, COST-01, COST-02]

# Metrics
duration: 7min
completed: 2026-03-22
---

# Phase 51 Plan 02: Pipeline Restructure Summary

**Two-stage cache pipeline with primer-then-parallel execution, per-pass AbortController timeouts, global 250s safety timeout with Partial status progressive saves, and streaming token usage capture written to analysis_usage table**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-22T03:53:24Z
- **Completed:** 2026-03-22T04:00:33Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Restructured api/analyze.ts from flat 16-pass parallel to two-stage cache pipeline (primer then 15 parallel)
- Added per-pass AbortController timeouts (90s) and global safety timeout (250s) with progressive save path
- Implemented streaming token usage capture from message_start and message_delta events with defensive access
- Added analysis_usage bulk insert with per-pass cost computation via computePassCost
- Synthesis pass skipped on timeout path, contract written with Partial status
- Timed-out passes filtered before mergePassResults to prevent spurious "Pass Failed" findings

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure runAnalysisPass, runSynthesisPass, and handler pipeline** - `b7e4c0e` (feat)

## Files Created/Modified
- `api/analyze.ts` - Restructured with two-stage cache pipeline, AbortController timeouts, streaming usage capture, analysis_usage writes, Partial status support

## Decisions Made
- Used independent AbortControllers per pass rather than parent-child hierarchy -- simpler to reason about, global timeout just iterates all controllers
- Used defensive `as` casts with `?? 0` for streaming event usage fields since beta types may have nullable fields
- Filtered abort errors from settled results before passing to mergePassResults so timed-out passes produce no "Analysis Pass Failed" findings
- Kept SDK timeout at 280s as a last-resort safety net -- per-pass 90s and global 250s fire first

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
The analysis_usage migration (from Plan 01) must be applied to Supabase before deploying this pipeline change. The Partial status constraint must also be in place.

## Next Phase Readiness
- Pipeline captures full token usage per pass -- ready for Phase 52 cost display UI
- analysis_usage table populated with per-pass rows on every analysis run
- Cache hit rates logged server-side for empirical validation of prompt caching effectiveness

## Self-Check: PASSED

All files and commits verified below.

---
*Phase: 51-analysis-pipeline-parallelization-and-token-capture*
*Completed: 2026-03-22*
