---
phase: 61-warranty-safety-osha-clause-passes
plan: 01
subsystem: api
tags: [zod, claude-ai, structured-outputs, warranty, osha, safety, contract-analysis]

requires:
  - phase: 60-bid-reconciliation-capstone
    provides: "Established pass definition + merge converter + handler + knowledge map pattern"
  - phase: 56-architecture-foundation
    provides: "Multi-pass pipeline, InferenceBasisSchema, enforceInferenceBasis, isSpecializedPass dedup"
provides:
  - "WarrantyFindingSchema and WarrantyPassResultSchema Zod schemas"
  - "SafetyOshaFindingSchema and SafetyOshaPassResultSchema Zod schemas"
  - "Warranty and safety-osha pass definitions in ANALYSIS_PASSES with full system prompts"
  - "Merge converters and passHandlers registrations for both passes"
  - "isSpecializedPass entries for dedup protection"
  - "PASS_KNOWLEDGE_MAP entries (warranty=[], safety-osha=['ca-calosha'])"
  - "ScopeMetaSchema warranty and safety-osha variants (9 total)"
affects: [61-02-warranty-safety-osha-ui-badges, phase-62]

tech-stack:
  added: []
  patterns: ["warranty pass follows 10-step pass pattern", "safety-osha pass uses inferenceBasis for knowledge-module attribution"]

key-files:
  created: []
  modified:
    - src/schemas/scopeComplianceAnalysis.ts
    - src/schemas/finding.ts
    - src/types/contract.ts
    - src/components/ScopeMetaBadge/index.tsx
    - api/passes.ts
    - api/merge.ts
    - src/knowledge/registry.ts

key-decisions:
  - "StubBadge entries in ScopeMetaBadge for TS compliance -- real warranty/safety UI deferred to Plan 02 (follows Phase 59 precedent)"
  - "ScopeMeta manual type in contract.ts updated alongside Zod schema -- keeps both type sources in sync"

patterns-established:
  - "Warranty pass: 6 warrantyAspect dimensions (duration, exclusion, transferability, defect-coverage, call-back-period, missing-warranty)"
  - "Safety-osha pass: 8 safetyAspect dimensions with inferenceBasis attribution (contract-quoted vs knowledge-module:ca-calosha)"

requirements-completed: [CLS-01, CLS-02]

duration: 5min
completed: 2026-04-07
---

# Phase 61 Plan 01: Warranty + Safety/OSHA Clause Passes Summary

**Warranty and safety/OSHA Zod schemas, pass definitions with full system prompts, merge converters, handler registrations, knowledge-module mapping, and dedup protection for two new Stage 2 analysis passes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-07T13:44:57Z
- **Completed:** 2026-04-07T13:50:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- WarrantyFindingSchema and SafetyOshaFindingSchema with pass-specific metadata fields (warrantyAspect/warrantyDuration/affectedParty and safetyAspect/regulatoryReference/responsibleParty/inferenceBasis)
- Both passes registered in ANALYSIS_PASSES as Stage 2 with comprehensive system prompts covering severity rules, negotiation positions, and action priorities
- Full merge pipeline integration: converters emit correct scopeMeta, handlers dispatch via createHandler, isSpecializedPass protects from dedup against risk-overview
- Safety-osha pass maps to ca-calosha knowledge module for Cal/OSHA Title 8 cross-referencing

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schemas + ScopeMetaSchema variants** - `c678c37` (feat)
2. **Task 2: Pass definitions, merge converters, handler registrations, knowledge map** - `96920d1` (feat)

## Files Created/Modified
- `src/schemas/scopeComplianceAnalysis.ts` - Added WarrantyFindingSchema, WarrantyPassResultSchema, SafetyOshaFindingSchema, SafetyOshaPassResultSchema
- `src/schemas/finding.ts` - Added warranty and safety-osha variants to ScopeMetaSchema (now 9 variants)
- `src/types/contract.ts` - Added warranty and safety-osha to ScopeMeta manual type union
- `src/components/ScopeMetaBadge/index.tsx` - StubBadge entries for TS compliance
- `api/passes.ts` - Two new pass definitions with full system prompts
- `api/merge.ts` - convertWarrantyFinding, convertSafetyOshaFinding, passHandlers entries, isSpecializedPass entries
- `src/knowledge/registry.ts` - PASS_KNOWLEDGE_MAP entries for warranty and safety-osha

## Decisions Made
- StubBadge entries in ScopeMetaBadge for TS compliance -- real warranty/safety UI deferred to Plan 02 (follows Phase 59 precedent)
- ScopeMeta manual type in contract.ts updated alongside Zod schema to prevent TS errors in FindingCard/ScopeMetaBadge

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added warranty/safety-osha to ScopeMeta manual type in contract.ts**
- **Found during:** Task 1 (Zod schemas)
- **Issue:** ScopeMetaSchema (Zod) gained 2 new variants but the manual ScopeMeta type in contract.ts was missing them, causing TS error in FindingCard.tsx
- **Fix:** Added warranty and safety-osha variant types to the ScopeMeta union in contract.ts
- **Files modified:** src/types/contract.ts
- **Verification:** TS error on FindingCard.tsx line 166 resolved
- **Committed in:** c678c37 (Task 1 commit)

**2. [Rule 3 - Blocking] Added StubBadge entries in ScopeMetaBadge BADGE_MAP**
- **Found during:** Task 1 (Zod schemas)
- **Issue:** BADGE_MAP is typed as Record<PassType, ...> -- adding new PassType variants without map entries causes TS2739
- **Fix:** Added StubBadge (returns null) for warranty and safety-osha keys, following Phase 59 precedent
- **Files modified:** src/components/ScopeMetaBadge/index.tsx
- **Verification:** TS compiles cleanly, build succeeds
- **Committed in:** c678c37 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for TypeScript compilation. No scope creep -- stub badges are standard practice (Phase 59 precedent).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both passes fully registered and runnable in Stage 2 parallel wave
- Plan 02 can replace StubBadge entries with real WarrantyBadge and SafetyOshaBadge components
- Safety-osha findings with inferenceBasis knowledge-module:ca-calosha will be auto-clamped to Medium by existing enforceInferenceBasis logic

---
*Phase: 61-warranty-safety-osha-clause-passes*
*Completed: 2026-04-07*
