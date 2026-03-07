---
phase: 05-negotiation-output-and-organization
plan: 01
subsystem: api
tags: [zod, structured-outputs, negotiation, pipeline, prompts]

# Dependency graph
requires:
  - phase: 01-pipeline-foundation
    provides: FindingSchema, PassResultSchema, structured output pipeline
  - phase: 02-core-legal-risk-analysis
    provides: Legal finding schemas, convertLegalFinding, UnifiedFinding
  - phase: 04-scope-compliance-verbiage
    provides: Scope finding schemas, convertScopeFinding
provides:
  - negotiationPosition field on Finding interface (client type)
  - negotiationPosition field on all 16 finding Zod schemas
  - negotiationPosition mapping in convertLegalFinding, convertScopeFinding, and risk-overview merge
  - Negotiation position prompt instructions across all 16 analysis passes
affects: [05-02, ui-rendering, finding-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "negotiationPosition as REQUIRED z.string() in schemas (empty string for non-Critical/High, populated for Critical/High)"
    - "Negotiation Positions instruction block appended to all pass prompts"

key-files:
  created: []
  modified:
    - src/types/contract.ts
    - src/schemas/analysis.ts
    - src/schemas/legalAnalysis.ts
    - src/schemas/scopeComplianceAnalysis.ts
    - api/analyze.ts

key-decisions:
  - "negotiationPosition is REQUIRED (z.string) in schemas, optional on client type -- follows Phase 2 convention for maximizing structured output quality"
  - "Prompt instructs empty string for Medium/Low/Info findings rather than making field optional in schema"
  - "risk-overview prompt includes extra distinction note: negotiationPosition vs recommendation"

patterns-established:
  - "negotiationPosition follows same pattern as other metadata fields: required in schema, optional on client type"

requirements-completed: [SCOPE-04]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 5 Plan 1: Negotiation Position Pipeline Integration Summary

**negotiationPosition field added to all 16 finding schemas, both convert functions, and all 16 pass prompts with mandatory Critical/High instructions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T05:46:09Z
- **Completed:** 2026-03-06T05:50:43Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added negotiationPosition to Finding interface and all 16 Zod finding schemas as required z.string()
- Updated UnifiedFinding, convertLegalFinding, convertScopeFinding, and risk-overview merge to map negotiationPosition
- Added "Negotiation Positions" instruction block to all 16 analysis pass prompts with Critical/High mandate
- TypeScript compiles cleanly with all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add negotiationPosition to types and all schemas** - `ae95acf` (feat)
2. **Task 2: Update UnifiedFinding, convert functions, and all 16 pass prompts** - `072f0a2` (feat)

## Files Created/Modified
- `src/types/contract.ts` - Added negotiationPosition?: string to Finding interface
- `src/schemas/analysis.ts` - Added negotiationPosition: z.string() to FindingSchema
- `src/schemas/legalAnalysis.ts` - Added negotiationPosition: z.string() to all 11 legal finding schemas
- `src/schemas/scopeComplianceAnalysis.ts` - Added negotiationPosition: z.string() to all 4 scope/compliance finding schemas
- `api/analyze.ts` - Updated UnifiedFinding, both convert functions, risk-overview merge, and all 16 pass prompts

## Decisions Made
- negotiationPosition is REQUIRED (z.string()) in all schemas -- follows Phase 2 convention where all metadata fields are required for structured output quality. The prompt instructs empty string for non-Critical/High findings.
- risk-overview prompt includes extra distinction note clarifying negotiationPosition vs recommendation (recommendation = what to do, negotiationPosition = what to say to GC).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- negotiationPosition field flows from structured output through convert functions to client-side Finding type
- Plan 05-02 can now render negotiationPosition in the UI and organize findings by negotiation priority

## Self-Check: PASSED

All files found. All commits verified (ae95acf, 072f0a2).

---
*Phase: 05-negotiation-output-and-organization*
*Completed: 2026-03-06*
