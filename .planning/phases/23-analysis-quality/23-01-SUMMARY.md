---
phase: 23-analysis-quality
plan: 01
subsystem: api
tags: [knowledge-modules, california-law, staleness-check, glazing]

# Dependency graph
requires:
  - phase: 21-analysis-pipeline
    provides: knowledge module system, registry, PASS_KNOWLEDGE_MAP
provides:
  - 5 new knowledge modules (ca-insurance-law, ca-public-works-payment, ca-dispute-resolution, ca-liquidated-damages, glazing-sub-protections)
  - expirationDate field on all KnowledgeModule instances
  - staleness warning system via checkModuleStaleness in merge.ts
  - ca-title24 updated to 2025 code cycle
affects: [23-analysis-quality, api-analyze]

# Tech tracking
tech-stack:
  added: []
  patterns: [knowledge-module-staleness-check, expiration-date-metadata]

key-files:
  created:
    - src/knowledge/regulatory/ca-insurance-law.ts
    - src/knowledge/regulatory/ca-public-works-payment.ts
    - src/knowledge/regulatory/ca-dispute-resolution.ts
    - src/knowledge/regulatory/ca-liquidated-damages.ts
    - src/knowledge/trade/glazing-sub-protections.ts
  modified:
    - src/knowledge/types.ts
    - src/knowledge/registry.ts
    - src/knowledge/regulatory/index.ts
    - src/knowledge/regulatory/ca-title24.ts
    - src/knowledge/regulatory/ca-lien-law.ts
    - src/knowledge/regulatory/ca-prevailing-wage.ts
    - src/knowledge/regulatory/ca-calosha.ts
    - src/knowledge/trade/div08-scope.ts
    - src/knowledge/trade/index.ts
    - src/knowledge/standards/contract-forms.ts
    - src/knowledge/standards/standards-validation.ts
    - api/merge.ts

key-decisions:
  - "Set all new regulatory module expirationDate to 2027-06-01 (18 months) given legislative cycle frequency"
  - "Placed staleness check after dedup but before risk score so Info findings do not affect scoring"
  - "Used medium-confidence label on ca-title24 2025 values since exact prescriptive numbers are directional"

patterns-established:
  - "Knowledge module expiration: all modules must include expirationDate for staleness tracking"
  - "Staleness findings use sourcePass 'staleness-check' and severity 'Info' to avoid score impact"

requirements-completed: [PIPE-02, PIPE-05]

# Metrics
duration: 6min
completed: 2026-03-14
---

# Phase 23 Plan 01: Knowledge Modules & Staleness Summary

**5 CA-law knowledge modules for empty analysis passes, universal expirationDate metadata, and post-merge staleness warning system**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-14T18:53:44Z
- **Completed:** 2026-03-14T18:59:44Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Created 4 new CA regulatory knowledge modules covering insurance law, public works payment, dispute resolution, and liquidated damages
- Created glazing-sub-protections trade module with 7-item standard protections checklist for verbiage analysis
- Added expirationDate field to KnowledgeModule interface and all 12 modules (7 existing + 5 new)
- Implemented staleness warning system that produces Info-severity findings for expired modules
- Updated ca-title24 to reflect 2025 code cycle with directional prescriptive values
- Filled all previously-empty PASS_KNOWLEDGE_MAP entries for target passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend KnowledgeModule type and create 5 new knowledge modules with registry assignments** - `5f71e3f` (feat)
2. **Task 2: Implement staleness warning system as post-merge check** - `aefeab6` (feat)

## Files Created/Modified
- `src/knowledge/types.ts` - Added expirationDate field to KnowledgeModule interface
- `src/knowledge/registry.ts` - Updated PASS_KNOWLEDGE_MAP, added getAllModules() export
- `src/knowledge/regulatory/ca-insurance-law.ts` - CIC 11580 additional insured, GL/WC minimums, subrogation waivers
- `src/knowledge/regulatory/ca-public-works-payment.ts` - Prompt Payment Act, PCC 7107 retention limits, stop notice rights
- `src/knowledge/regulatory/ca-dispute-resolution.ts` - CCP 1281 arbitration, venue/choice-of-law, mediation-first, fee-shifting
- `src/knowledge/regulatory/ca-liquidated-damages.ts` - CC 1671 enforceability, flow-down LD, proportionality analysis
- `src/knowledge/trade/glazing-sub-protections.ts` - Force majeure, liability cap, warranty, right to cure, notice, weather delay, material escalation
- `src/knowledge/regulatory/ca-title24.ts` - Updated to 2025 code cycle with medium-confidence directional values
- `api/merge.ts` - Added checkModuleStaleness() and integration into mergePassResults

## Decisions Made
- Set regulatory module expirationDate to 2027-06-01 (18-month horizon) to balance freshness with maintenance burden
- Placed staleness check after deduplication but before risk score computation so Info-severity staleness findings do not inflate scores
- Labeled ca-title24 2025 values as "MEDIUM CONFIDENCE" since exact prescriptive numbers depend on published CEC standards

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All target passes now have knowledge module assignments
- Staleness system is passive (no modules currently expired) and will activate automatically when expirationDate passes
- Ready for plan 23-02 (prompt engineering improvements)

---
*Phase: 23-analysis-quality*
*Completed: 2026-03-14*
