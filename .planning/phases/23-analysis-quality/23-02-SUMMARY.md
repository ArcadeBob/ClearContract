---
phase: 23-analysis-quality
plan: 02
subsystem: api, ui
tags: [risk-scoring, category-weights, bid-signal, tooltip, verbiage-analysis]

requires:
  - phase: 01-pipeline-foundation
    provides: Multi-pass analysis pipeline, merge.ts, scoring.ts, schemas
provides:
  - Category-weighted risk scoring with ScoreBreakdown return type
  - Fixed matchesBonding using structured metadata (sourcePass + scopeMeta)
  - Refocused verbiage-analysis pass on missing protections
  - RiskScoreDisplay component with hover tooltip showing category breakdown
affects: [23-03-PLAN, api, scoring, bid-signal]

tech-stack:
  added: []
  patterns: [category-weighted scoring, structured metadata matching, tooltip via group-hover]

key-files:
  created:
    - src/components/RiskScoreDisplay.tsx
  modified:
    - api/scoring.ts
    - api/merge.ts
    - api/analyze.ts
    - src/utils/bidSignal.ts
    - src/types/contract.ts
    - src/schemas/analysis.ts
    - src/api/analyzeContract.ts
    - src/App.tsx
    - src/pages/ContractReview.tsx

key-decisions:
  - "Two-tier category weights: 1.0x for legal/financial/insurance/risk, 0.75x for scope/compliance/dates/technical"
  - "Compound Risk category weight set to 0 for Plan 03 synthesis findings exclusion"
  - "matchesBonding primary path uses sourcePass + scopeMeta.requirementType, narrow risk-overview fallback for downgraded findings only"
  - "RiskScoreDisplay uses CSS group-hover for tooltip, no Framer Motion needed"

patterns-established:
  - "ScoreBreakdown type flows from scoring.ts through merge.ts to API response to client"
  - "Structured metadata matching preferred over text search for bid signal factors"

requirements-completed: [PIPE-03, PIPE-04, PIPE-06]

duration: 4min
completed: 2026-03-14
---

# Phase 23 Plan 02: Scoring, Bid Signal & Verbiage Summary

**Category-weighted risk scoring with ScoreBreakdown tooltip, structured bonding matching, and missing-protections-focused verbiage pass**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T18:53:36Z
- **Completed:** 2026-03-14T18:57:41Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- computeRiskScore now uses two-tier category weights (legal/financial at 1.0x, scope/compliance at 0.75x) and returns ScoreBreakdown with per-category point contributions
- Synthetic error findings and Compound Risk category excluded from risk score computation
- matchesBonding replaced text search with structured sourcePass + scopeMeta.requirementType matching
- Verbiage pass prompt refocused to lead with missing-protections checklist audit, explicit exclusion list for all 11 legal passes
- RiskScoreDisplay component with hover tooltip showing category breakdown wired into ContractReview

## Task Commits

Each task was committed atomically:

1. **Task 1: Category-weighted scoring with ScoreBreakdown and error finding exclusion** - `dfc758f` (feat)
2. **Task 2: Fix matchesBonding to use structured metadata and refocus verbiage pass prompt** - `f083e79` (feat)
3. **Task 3: Create RiskScoreDisplay component with hover tooltip showing category breakdown** - `ab06de9` (feat)

## Files Created/Modified
- `api/scoring.ts` - Category-weighted computeRiskScore returning ScoreBreakdown
- `api/merge.ts` - Updated to handle ScoreBreakdown, passes scoreBreakdown in return object
- `api/analyze.ts` - Verbiage pass prompt rewrite + scoreBreakdown in API response
- `src/utils/bidSignal.ts` - Fixed matchesBonding with structured metadata matching
- `src/types/contract.ts` - Added scoreBreakdown field to Contract interface
- `src/schemas/analysis.ts` - Added scoreBreakdown to MergedAnalysisResultSchema
- `src/api/analyzeContract.ts` - Added scoreBreakdown to client AnalysisResult
- `src/App.tsx` - Passes scoreBreakdown through to Contract state in both analysis paths
- `src/components/RiskScoreDisplay.tsx` - New component with risk score and hover tooltip
- `src/pages/ContractReview.tsx` - Uses RiskScoreDisplay instead of inline score rendering

## Decisions Made
- Two-tier category weights per user decision: legal/financial/insurance/risk at 1.0x, scope/compliance/dates/technical at 0.75x
- Compound Risk weight set to 0 to prepare for Plan 03 synthesis findings
- matchesBonding primary path uses sourcePass + scopeMeta, narrow risk-overview fallback only for downgraded findings in Financial Terms or Contract Compliance
- Simple CSS group-hover tooltip for RiskScoreDisplay, no animation library needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added scoreBreakdown passthrough in App.tsx**
- **Found during:** Task 1 (after updating types)
- **Issue:** App.tsx maps AnalysisResult to Contract state in two locations but plan did not mention updating App.tsx
- **Fix:** Added scoreBreakdown to both updateContract calls in App.tsx
- **Files modified:** src/App.tsx
- **Verification:** Build compiles clean, data flows end-to-end
- **Committed in:** dfc758f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for scoreBreakdown data to reach the client. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ScoreBreakdown flows end-to-end from scoring through API to client tooltip display
- Compound Risk category weight (0) ready for Plan 03 synthesis findings
- matchesBonding consistent with other bid signal factors using structured metadata
- Verbiage pass refocused to complement rather than overlap legal passes

---
## Self-Check: PASSED

All 10 files verified present. All 3 task commits verified in git log.

---
*Phase: 23-analysis-quality*
*Completed: 2026-03-14*
