---
phase: 04-scope-compliance-verbiage
plan: 01
subsystem: api
tags: [zod, structured-outputs, scope-analysis, compliance, verbiage, anthropic]

# Dependency graph
requires:
  - phase: 01-pipeline-foundation
    provides: "Multi-pass analysis pipeline, PassResultSchema, zodToOutputFormat, merge/dedup infrastructure"
  - phase: 02-core-legal-risk-analysis
    provides: "Legal pass pattern (self-contained Zod schemas, convertLegalFinding, isLegal routing)"
provides:
  - "4 specialized scope/compliance/verbiage Zod schemas with structured metadata"
  - "ScopeMeta discriminated union type on Finding interface"
  - "convertScopeFinding function for scopeMeta packing"
  - "isScope routing in merge logic"
  - "isSpecializedPass helper for unified dedup (legal + scope)"
affects: [04-02-PLAN, ui-rendering, finding-display]

# Tech tracking
tech-stack:
  added: []
  patterns: ["isScope flag on AnalysisPass for scope/compliance pass routing", "convertScopeFinding mirroring convertLegalFinding pattern", "isSpecializedPass helper for unified dedup"]

key-files:
  created:
    - "src/schemas/scopeComplianceAnalysis.ts"
  modified:
    - "src/types/contract.ts"
    - "api/analyze.ts"

key-decisions:
  - "Scope pass schemas follow exact same pattern as legal pass schemas: self-contained local enums, all metadata REQUIRED"
  - "isSpecializedPass helper unifies legal + scope pass detection for dedup, replacing isLegal-only checks"
  - "Old dates-deadlines and scope-financial passes fully replaced (not supplemented) to avoid duplicate findings"

patterns-established:
  - "isScope flag: scope/compliance passes use isScope=true for merge routing, mirroring isLegal pattern"
  - "convertScopeFinding: same structure as convertLegalFinding, switch on passName to pack scopeMeta"
  - "isSpecializedPass helper: single function for dedup preference logic across all specialized pass types"

requirements-completed: [SCOPE-01, SCOPE-02, SCOPE-03, COMP-01]

# Metrics
duration: 10min
completed: 2026-03-06
---

# Phase 04 Plan 01: Scope/Compliance/Verbiage Schemas and Pipeline Integration Summary

**4 specialized analysis passes (scope-of-work, dates-deadlines, verbiage-analysis, labor-compliance) with self-contained Zod schemas, ScopeMeta type, and convertScopeFinding merge routing**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-06T04:53:15Z
- **Completed:** 2026-03-06T05:04:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created 4 self-contained Zod schemas for scope, dates, verbiage, and labor compliance passes with structured metadata fields
- Extended Finding type with ScopeMeta discriminated union (4 variants) and ComplianceChecklistItem interface
- Replaced 2 general passes (dates-deadlines, scope-financial) with 4 specialized passes with severity-calibrated prompts
- Added convertScopeFinding function and isScope merge routing matching the established legal pass pattern
- Updated dedup logic with isSpecializedPass helper to prefer both legal and scope passes over general passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scope/compliance/verbiage schemas and extend types** - `03885e9` (feat)
2. **Task 2: Replace general passes with 4 specialized passes, add convertScopeFinding, update merge logic** - `5063e79` (feat)

## Files Created/Modified
- `src/schemas/scopeComplianceAnalysis.ts` - 4 Zod schemas (ScopeOfWork, DatesDeadlines, Verbiage, LaborCompliance) with self-contained enums
- `src/types/contract.ts` - ScopeMeta discriminated union, ComplianceChecklistItem interface, scopeMeta field on Finding
- `api/analyze.ts` - 4 new analysis passes, convertScopeFinding function, isScope routing, isSpecializedPass dedup helper

## Decisions Made
- Scope pass schemas follow exact same pattern as legal pass schemas: self-contained local enums, all metadata REQUIRED, no min/max constraints
- isSpecializedPass helper unifies legal + scope pass detection for dedup, replacing the previous isLegal-only checks in both dedup phases
- Old dates-deadlines and scope-financial passes fully replaced (not supplemented) to avoid duplicate findings and wasted API calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript full-project compilation ran out of memory with default Node.js heap (pre-existing issue). Used --max-old-space-size=8192 and --skipLibCheck for verification. All errors in output are pre-existing (unused React imports, unrelated type issues in existing components). No errors in modified files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 scope/compliance/verbiage schemas export correctly and are imported in api/analyze.ts
- ScopeMeta type available on Finding for UI rendering in Plan 04-02
- Total analysis passes: 16 (1 overview + 11 legal + 4 scope/compliance)
- convertScopeFinding ready to produce structured scopeMeta through existing merge/dedup pipeline

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 04-scope-compliance-verbiage*
*Completed: 2026-03-06*
