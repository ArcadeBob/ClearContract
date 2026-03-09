---
phase: 08-pipeline-integration-and-company-specific-intelligence
plan: 02
subsystem: ui
tags: [bid-signal-widget, severity-downgrade, coverage-comparison, company-profile, react-components]

# Dependency graph
requires:
  - phase: 08-pipeline-integration-and-company-specific-intelligence
    plan: 01
    provides: BidSignal type, downgradedFrom on Finding, pipeline wiring, computeBidSignal
  - phase: 07-knowledge-architecture-and-company-profile
    provides: useCompanyProfile hook, CompanyProfile type, Settings page
provides:
  - BidSignalWidget traffic light component for bid/no-bid display
  - CoverageComparisonTab comparing contract requirements vs company insurance/bonding
  - SeverityBadge extension with downgradedFrom annotation
  - Coverage view mode in ContractReview alongside by-category/by-severity
  - Incomplete profile warning banner in review page
affects: [09-deployment, ui-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [coverage-comparison-matching, traffic-light-widget, severity-downgrade-annotation]

key-files:
  created:
    - src/components/BidSignalWidget.tsx
    - src/components/CoverageComparisonTab.tsx
  modified:
    - src/components/SeverityBadge.tsx
    - src/pages/ContractReview.tsx
    - src/components/FindingCard.tsx
    - src/App.tsx
    - api/analyze.ts

key-decisions:
  - "Traffic light style for bid signal: colored circle + label + score, consistent with industry UX patterns"
  - "Coverage table shows only what contract requires -- no empty rows for unmentioned coverage types"
  - "$refStrategy: 'none' fix for zodToJsonSchema to prevent $ref errors in Anthropic structured output"

patterns-established:
  - "Coverage comparison matching: coverageType string mapped to CompanyProfile fields via keyword matching"
  - "View mode extensibility: viewMode union type extended with 'coverage' alongside existing modes"
  - "Severity downgrade annotation: 'was [Original]' text appended to SeverityBadge when downgradedFrom present"

requirements-completed: [INTEL-01, INTEL-02, INTEL-03, INTEL-04]

# Metrics
duration: 8min
completed: 2026-03-08
---

# Phase 8 Plan 2: Company-Specific Intelligence UI Summary

**Bid/no-bid traffic light widget, coverage comparison tab with Met/Gap status, severity downgrade annotations, and incomplete profile warning banner in contract review page**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-09T01:12:00Z
- **Completed:** 2026-03-09T01:20:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- BidSignalWidget renders traffic light (green/amber/red circle) with label and score next to risk score in review header
- CoverageComparisonTab shows table of contract insurance/bonding requirements vs company profile with Met/Gap/N-A status
- SeverityBadge extended to show "was [Original]" annotation when findings have been severity-downgraded
- Coverage view mode added as third tab alongside by-category and by-severity
- Incomplete profile warning banner with dismiss capability shown when profile fields are empty
- Fixed schema $ref errors and bidSignal wiring discovered during verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UI components -- SeverityBadge extension, BidSignalWidget, CoverageComparisonTab** - `dae6f0b` (feat)
2. **Task 2: Wire components into ContractReview page with coverage tab, bid signal, and warning banner** - `a1ce3f5` (feat)
3. **Task 3: Verify company-specific intelligence UI (fixes)** - `bac4bc6` (fix)

## Files Created/Modified
- `src/components/BidSignalWidget.tsx` - Traffic light bid/no-bid widget with Framer Motion fade-in
- `src/components/CoverageComparisonTab.tsx` - Insurance/bonding comparison table with Met/Gap/N-A status
- `src/components/SeverityBadge.tsx` - Extended with downgradedFrom annotation ("was High" etc.)
- `src/pages/ContractReview.tsx` - Integrated BidSignalWidget, CoverageComparisonTab, warning banner, coverage view mode
- `src/components/FindingCard.tsx` - Passes downgradedFrom to SeverityBadge
- `src/App.tsx` - Wires bidSignal from analysis result to contract state
- `api/analyze.ts` - Fixed zodToJsonSchema $refStrategy to prevent $ref errors

## Decisions Made
- Traffic light style for bid signal per user decision: colored circle with label text
- Coverage table only shows rows for requirements found in the contract (no empty placeholder rows)
- $refStrategy: 'none' added to zodToJsonSchema to avoid $ref in structured output schemas

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zodToJsonSchema $ref errors in API response**
- **Found during:** Task 3 (verification)
- **Issue:** zodToJsonSchema generated $ref references that Anthropic API does not support
- **Fix:** Added `$refStrategy: 'none'` option to inline all schema definitions
- **Files modified:** api/analyze.ts
- **Committed in:** bac4bc6

**2. [Rule 1 - Bug] Fixed bidSignal not passed to contract state**
- **Found during:** Task 3 (verification)
- **Issue:** bidSignal from analysis result was not included in updateContract call, so BidSignalWidget never rendered
- **Fix:** Added `bidSignal: result.bidSignal` to the updateContract spread in App.tsx
- **Files modified:** src/App.tsx
- **Committed in:** bac4bc6

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correct rendering of company-specific intelligence UI. No scope creep.

## Issues Encountered
None beyond the auto-fixed bugs above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete company-specific intelligence pipeline: profile -> AI analysis -> UI display
- All INTEL requirements satisfied: bid signal, coverage comparison, severity downgrade, profile warning
- Ready for Phase 9 deployment preparation
- Live API testing with real contracts recommended

## Self-Check: PASSED

All 7 key files verified present. All 3 task commits (dae6f0b, a1ce3f5, bac4bc6) verified in git history.

---
*Phase: 08-pipeline-integration-and-company-specific-intelligence*
*Completed: 2026-03-08*
