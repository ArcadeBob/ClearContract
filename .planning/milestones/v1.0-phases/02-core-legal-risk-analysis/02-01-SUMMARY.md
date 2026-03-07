---
phase: 02-core-legal-risk-analysis
plan: 01
subsystem: api
tags: [zod, structured-outputs, legal-analysis, indemnification, pay-if-paid, liquidated-damages, retainage, anthropic]

# Dependency graph
requires:
  - phase: 01-pipeline-foundation
    provides: "Multi-pass analysis pipeline with structured outputs, Zod schemas, zodToOutputFormat, Files API integration"
provides:
  - "4 legal analysis Zod schemas (IndemnificationPassResultSchema, PaymentContingencyPassResultSchema, LiquidatedDamagesPassResultSchema, RetainagePassResultSchema)"
  - "LegalMeta discriminated union type for clause-type-specific metadata"
  - "Extended Finding interface with crossReferences, legalMeta, sourcePass fields"
  - "4 specialized legal analysis passes with severity-calibrated prompts"
  - "Enhanced merge/dedup logic preferring specialized legal findings over general pass findings"
  - "convertLegalFinding function mapping pass-specific fields to unified Finding shape"
affects: [02-02, 03-extended-legal-analysis, 04-scope-compliance-verbiage]

# Tech tracking
tech-stack:
  added: []
  patterns: ["per-pass Zod schema with clause-type-specific required fields", "convertLegalFinding metadata packing into legalMeta", "composite key dedup (clauseReference+category) with legal-pass preference"]

key-files:
  created: ["src/schemas/legalAnalysis.ts"]
  modified: ["src/types/contract.ts", "api/analyze.ts"]

key-decisions:
  - "Legal pass schemas are self-contained (local SeverityEnum, DateTypeEnum) to avoid cross-dependency during structured output compilation"
  - "All metadata fields in legal pass schemas are REQUIRED (not optional) to leverage structured outputs effectively"
  - "Composite key dedup uses clauseReference+category as primary key with title-based fallback for findings without clauseReference"
  - "Removed unused Severity and Category type imports from api/analyze.ts to keep imports clean"

patterns-established:
  - "Per-pass Zod schema pattern: each legal pass has its own schema with clause-type-specific required metadata fields"
  - "convertLegalFinding pattern: maps flat API response fields into unified Finding shape with legalMeta discriminated union"
  - "Enhanced dedup pattern: clauseReference+category composite key dedup preferring specialized passes, with title-based fallback"

requirements-completed: [LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 2 Plan 01: Legal Analysis Schemas & Passes Summary

**4 specialized legal analysis passes (indemnification, payment contingency, liquidated damages, retainage) with per-pass Zod schemas, LegalMeta discriminated union, severity-calibrated prompts, and composite-key deduplication**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T14:21:49Z
- **Completed:** 2026-03-04T14:29:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created 4 per-pass Zod schemas in `src/schemas/legalAnalysis.ts` with all metadata fields as REQUIRED, enabling structured output enforcement of verbatim clause text, explanations, and clause-type-specific metadata
- Extended `Finding` interface with `LegalMeta` discriminated union covering indemnification (riskType, hasInsuranceGap), payment contingency (paymentType, enforceabilityContext), liquidated damages (amountOrRate, capStatus, proportionalityAssessment), and retainage (percentage, releaseCondition, tiedTo)
- Added 4 legal analysis passes to `api/analyze.ts` with detailed prompts containing mandatory severity calibration rules, verbatim quoting instructions, missing-clause detection, and glazing-sub-specific explanations
- Enhanced merge/dedup logic to use clauseReference+category composite key, preferring specialized legal pass findings over general pass findings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create legal analysis schemas and extend Finding type with LegalMeta** - `8231402` (feat)
2. **Task 2: Add 4 legal analysis passes and enhanced merge/dedup to api/analyze.ts** - `9446c1a` (feat)

## Files Created/Modified
- `src/schemas/legalAnalysis.ts` - 4 legal pass Zod schemas (IndemnificationPassResultSchema, PaymentContingencyPassResultSchema, LiquidatedDamagesPassResultSchema, RetainagePassResultSchema) with self-contained enum values
- `src/types/contract.ts` - Added LegalMeta discriminated union type and extended Finding interface with crossReferences, legalMeta, sourcePass fields
- `api/analyze.ts` - Added 4 legal passes to ANALYSIS_PASSES (7 total), convertLegalFinding function, enhanced mergePassResults with composite key dedup, extended AnalysisPass interface with isLegal and schema fields

## Decisions Made
- Legal pass schemas use local enum values (SeverityEnum, DateTypeEnum, ContractDateSchema) rather than importing from analysis.ts to keep schemas self-contained for structured output compilation
- All metadata fields in legal pass schemas are REQUIRED (not optional) -- this maximizes structured output quality since Claude must populate every field
- Composite key dedup uses `${clauseReference}::${category}` as primary key; findings without clauseReference fall through to title-based dedup as secondary pass
- Cleaned up unused Severity and Category type imports from api/analyze.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 7-pass pipeline ready for production use (3 existing + 4 new legal passes)
- Plan 02-02 (UI updates to display clauseText, explanation, legalMeta) can proceed immediately
- Legal findings will carry full structured metadata that the UI can render once updated
- Existing risk score computation works unchanged with new legal findings since it's severity-based

## Self-Check: PASSED

- All 3 files verified present on disk
- Both task commits (8231402, 9446c1a) verified in git log

---
*Phase: 02-core-legal-risk-analysis*
*Completed: 2026-03-04*
