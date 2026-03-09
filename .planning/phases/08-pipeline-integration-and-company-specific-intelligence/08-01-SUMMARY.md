---
phase: 08-pipeline-integration-and-company-specific-intelligence
plan: 01
subsystem: api
tags: [pipeline, company-profile, bid-signal, prompt-engineering, zod-schemas]

# Dependency graph
requires:
  - phase: 07-knowledge-architecture-and-company-profile
    provides: CompanyProfile type, composeSystemPrompt, knowledge registry, useCompanyProfile hook
provides:
  - Standalone profileLoader.ts for non-hook profile access
  - Company profile injection into 6 analysis passes via PASSES_RECEIVING_PROFILE
  - Insurance gap and bonding capacity comparison instructions in AI prompts
  - downgradedFrom field on Finding for severity downgrade tracking
  - Deterministic computeBidSignal with 5 weighted factors
  - BidSignal type on Contract and in API response
affects: [08-02, 09-pipeline, ui-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [selective-profile-injection, severity-downgrade-metadata, deterministic-bid-signal]

key-files:
  created:
    - src/knowledge/profileLoader.ts
    - src/utils/bidSignal.ts
  modified:
    - src/hooks/useCompanyProfile.ts
    - src/types/contract.ts
    - src/api/analyzeContract.ts
    - api/analyze.ts
    - src/schemas/analysis.ts
    - src/schemas/legalAnalysis.ts
    - src/schemas/scopeComplianceAnalysis.ts

key-decisions:
  - "Standalone profileLoader.ts extracts loadCompanyProfile from hook for reuse in API wrapper"
  - "computeBidSignal uses 5 weighted factors (Bonding 0.25, Insurance 0.25, Scope 0.20, Payment 0.15, Retainage 0.15)"
  - "downgradedFrom added to ALL 15 finding schemas, not just profile-receiving passes, for uniform API shape"
  - "bidSignal computed server-side after mergePassResults for consistent results"

patterns-established:
  - "PASSES_RECEIVING_PROFILE set pattern: centralized control of which passes get company context"
  - "Severity downgrade metadata: downgradedFrom preserves original severity for UI display"
  - "Factor-based bid signal: deterministic scoring with named factors and weights"

requirements-completed: [INTEL-01, INTEL-02, INTEL-03, INTEL-04]

# Metrics
duration: 6min
completed: 2026-03-09
---

# Phase 8 Plan 1: Pipeline Integration Summary

**Company profile injection into 6 analysis passes with insurance/bonding comparison prompts, severity downgrade metadata, and deterministic bid/no-bid signal computation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T01:04:25Z
- **Completed:** 2026-03-09T01:10:24Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Company profile flows from client localStorage through POST body to server, injected into 6 relevant passes
- AI prompts enhanced with comparison instructions for insurance gaps (specific dollar amounts) and bonding capacity checks
- Deterministic bid/no-bid signal computed from findings with 5 weighted factors and 3 threshold levels
- Finding type extended with downgradedFrom metadata across all 15 Zod schemas

## Task Commits

Each task was committed atomically:

1. **Task 1: Profile loader, type extensions, bid signal utility, and client-side wiring** - `7e8db18` (feat)
2. **Task 2: Server-side pipeline wiring** - `9a0c3b3` (feat)

## Files Created/Modified
- `src/knowledge/profileLoader.ts` - Standalone loadCompanyProfile function for non-hook contexts
- `src/utils/bidSignal.ts` - Deterministic computeBidSignal with 5 weighted factors
- `src/types/contract.ts` - Added downgradedFrom, BidSignal, BidFactor, BidSignalLevel types
- `src/hooks/useCompanyProfile.ts` - Delegates to profileLoader, eliminates duplication
- `src/api/analyzeContract.ts` - Sends companyProfile in POST body, added bidSignal to AnalysisResult
- `api/analyze.ts` - Pipeline wiring: composeSystemPrompt, PASSES_RECEIVING_PROFILE, comparison prompts, bidSignal computation
- `src/schemas/analysis.ts` - Added downgradedFrom to FindingSchema
- `src/schemas/legalAnalysis.ts` - Added downgradedFrom to all 11 legal finding schemas
- `src/schemas/scopeComplianceAnalysis.ts` - Added downgradedFrom to all 4 scope/compliance finding schemas

## Decisions Made
- Standalone profileLoader.ts extracts loadCompanyProfile from hook -- enables reuse in analyzeContract.ts without React dependency
- computeBidSignal uses 5 weighted factors with severity-based penalty subtraction from 100-point starting score
- downgradedFrom added to ALL finding schemas uniformly, not just profile-receiving passes, ensuring consistent API shape
- bidSignal computed server-side after deduplication to ensure consistent results regardless of client

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pipeline is fully wired: company profile flows end-to-end from localStorage to AI prompts
- UI components can now display bidSignal and downgradedFrom metadata (next plan)
- Integration testing with live API recommended before deployment

---
*Phase: 08-pipeline-integration-and-company-specific-intelligence*
*Completed: 2026-03-09*
