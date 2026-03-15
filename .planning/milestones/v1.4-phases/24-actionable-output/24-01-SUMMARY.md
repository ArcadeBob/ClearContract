---
phase: 24-actionable-output
plan: 01
subsystem: api, ui
tags: [zod, structured-output, action-priority, bid-signal, csv-export]

# Dependency graph
requires:
  - phase: 23-analysis-quality
    provides: multi-pass analysis pipeline with 16 passes, synthesis pass, bid signal computation
provides:
  - actionPriority field on Finding type and all Zod schemas
  - ActionPriorityBadge UI component
  - Action Priority column in CSV export
  - generateFactorReasons function for bid signal reason text
  - BidSignalWidget findings prop for reason text display
affects: [24-02-PLAN, ContractReview, future export features]

# Tech tracking
tech-stack:
  added: []
  patterns: [action-priority-enum-pattern, factor-reason-generation]

key-files:
  created:
    - src/components/ActionPriorityBadge.tsx
  modified:
    - src/types/contract.ts
    - src/schemas/analysis.ts
    - src/schemas/legalAnalysis.ts
    - src/schemas/scopeComplianceAnalysis.ts
    - src/schemas/synthesisAnalysis.ts
    - api/merge.ts
    - api/analyze.ts
    - src/components/FindingCard.tsx
    - src/utils/exportContractCsv.ts
    - src/utils/bidSignal.ts
    - src/components/BidSignalWidget.tsx

key-decisions:
  - "ActionPriority required in Zod schemas (AI always provides) but optional on TS Finding interface (backward compat for old contracts)"
  - "Contextual actionPriority prompt guidance per pass (e.g., bonding findings typically pre-bid, indemnification typically pre-sign)"
  - "SEVERITY_RANK in bidSignal.ts sorts worst-first (Critical=0) for reason text selection"

patterns-established:
  - "ActionPriorityEnum pattern: single export from analysis.ts imported by all schema files"
  - "Factor reason generation: worst-severity finding title used as one-line reason per factor"

requirements-completed: [OUT-02, OUT-03]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 24 Plan 01: Action Priority + Bid Signal Reasons Summary

**ActionPriority enum (pre-bid/pre-sign/monitor) flows through all 16+ schemas, merge pipeline, and AI prompts; FindingCard shows colored badge, CSV includes column, BidSignalWidget displays per-factor reason text**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T00:17:12Z
- **Completed:** 2026-03-15T00:25:07Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- actionPriority field added to Finding interface and all 16 Zod finding schemas (required in schema, optional in TS for backward compat)
- All 16 pass system prompts plus synthesis pass include contextual actionPriority assignment guidance
- ActionPriorityBadge component renders colored badges (orange pre-bid, blue pre-sign, slate monitor) next to severity badge
- CSV export includes Action Priority column after Severity
- generateFactorReasons function provides one-line reason text per bid signal factor based on worst-severity matched finding
- BidSignalWidget accepts optional findings prop and displays reason text per factor when expanded

## Task Commits

Each task was committed atomically:

1. **Task 1: Add actionPriority to schemas, pipeline, and merge** - `39a2a13` (feat)
2. **Task 2: ActionPriority badge in FindingCard, CSV export column, and bid signal reason text** - `b4dee11` (feat)

## Files Created/Modified
- `src/types/contract.ts` - Added actionPriority optional field to Finding interface
- `src/schemas/analysis.ts` - Added ActionPriorityEnum export and actionPriority to FindingSchema
- `src/schemas/legalAnalysis.ts` - Added actionPriority to all 11 legal finding schemas
- `src/schemas/scopeComplianceAnalysis.ts` - Added actionPriority to all 4 scope/compliance finding schemas
- `src/schemas/synthesisAnalysis.ts` - Added actionPriority to SynthesisFindingSchema
- `api/merge.ts` - Added actionPriority to UnifiedFinding interface and buildBaseFinding mapping
- `api/analyze.ts` - Added actionPriority prompt guidance to all 16 passes + synthesis pass, mapped in synthesis conversion
- `src/components/ActionPriorityBadge.tsx` - New colored badge component for action priority display
- `src/components/FindingCard.tsx` - Conditionally renders ActionPriorityBadge next to SeverityBadge
- `src/utils/exportContractCsv.ts` - Added Action Priority column to CSV header and data rows
- `src/utils/bidSignal.ts` - Added SEVERITY_RANK, exported FACTOR_DEFS, added generateFactorReasons function
- `src/components/BidSignalWidget.tsx` - Accepts findings prop, computes and renders per-factor reason text

## Decisions Made
- ActionPriority is required in Zod schemas (AI must always provide it) but optional on the TypeScript Finding interface (backward compatibility for contracts analyzed before this feature)
- Each pass gets contextual actionPriority guidance tailored to its domain (e.g., bonding findings are typically pre-bid, indemnification typically pre-sign)
- SEVERITY_RANK uses ascending order (Critical=0, Info=4) so sorting gives worst-severity first for reason text selection
- BidSignalWidget findings prop is optional for backward compatibility; reason text only renders when findings are provided (wired in Plan 24-02)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 24-02 needs to wire `findings={contract.findings}` on BidSignalWidget render call in ContractReview.tsx to activate reason text display
- ActionPriority badges will display automatically on newly analyzed contracts
- Old contracts without actionPriority display no badge and cause no errors

---
*Phase: 24-actionable-output*
*Completed: 2026-03-15*
