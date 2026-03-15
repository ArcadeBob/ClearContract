# Requirements: ClearContract v1.5 Code Health

**Defined:** 2026-03-15
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v1.5 Requirements

Requirements for code health milestone. Each maps to roadmap phases.

### Component Decomposition

- [x] **DECOMP-01**: ContractReview.tsx split — extract filter/sort logic to custom hook, reduce from 608 to ~300 lines
- [x] **DECOMP-02**: LegalMetaBadge.tsx split — extract 12 clause-type branches into subcomponents, eliminate ~30 nested ternaries
- [x] **DECOMP-03**: ScopeMetaBadge.tsx split — extract scope metadata branches into subcomponents (same pattern as LegalMetaBadge)
- [x] **DECOMP-04**: api/analyze.ts modularized — extract schema definitions, pass configuration, and orchestration into separate modules
- [x] **DECOMP-05**: api/merge.ts refactored — extract finding conversion functions and deduplication logic into focused modules

### Type Safety

- [x] **TYPE-01**: Reconcile Zod schema / TypeScript interface optionality — required fields in schemas match required fields in types
- [x] **TYPE-02**: Validate API response on client — add Zod parse to analyzeContract.ts response handling
- [x] **TYPE-03**: Replace merge.ts assertion casts with type guards — eliminate 13+ `as string` casts using discriminated union narrowing
- [x] **TYPE-04**: Create request validation schema for /api/analyze POST body — typed end-to-end

### Pattern Consolidation

- [x] **PATN-01**: Centralize localStorage access — single storage manager with consistent error handling replaces 4 scattered locations
- [x] **PATN-02**: Centralize error handling — shared error classification and formatting utility used by App.tsx, analyze.ts, and storage layer
- [x] **PATN-03**: Centralize color/severity mapping — replace ~30 scattered ternary chains with a shared palette map using complete Tailwind class strings
- [x] **PATN-04**: Extract toast to useToast context — eliminate prop drilling from App.tsx through page components

### Hook Extraction

- [x] **HOOK-01**: Create useInlineEdit hook — shared by ContractReview (rename) and FindingCard (notes), replacing duplicated edit/commit/cancel pattern
- [x] **HOOK-02**: Create useContractFiltering hook — extract multi-select filter state and visibleFindings logic from ContractReview
- [x] **HOOK-03**: Create useFieldValidation hook — extract onBlur validation/save/revert logic from Settings ProfileField

## Future Requirements

Deferred to v1.6 or later. Tracked but not in current roadmap.

### Testing

- **TEST-01**: Set up test framework (Vitest) with initial configuration
- **TEST-02**: Unit tests for extracted hooks (useInlineEdit, useContractFiltering, useFieldValidation)
- **TEST-03**: Integration tests for API analysis pipeline

### ContractReview UI Subcomponents

- **UISPLIT-01**: Extract ReviewHeader subcomponent from ContractReview
- **UISPLIT-02**: Extract FindingsPanel subcomponent from ContractReview
- **UISPLIT-03**: Extract FilterToolbar subcomponent from ContractReview

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Wholesale ContractReview rewrite | Incremental extraction is safer; rewrite risks regression without tests |
| Consolidate all localStorage keys into one blob | Per-domain keys are correct; consolidation adds coupling |
| Add Zustand/Redux/state management library | useState + hooks sufficient for sole-user app |
| Migrate localStorage to IndexedDB | Overengineered for current data volume |
| Write tests during this refactor | Testing is a separate milestone; mixing test setup with refactoring adds risk |
| Add eslint-plugin-import | Optional improvement; not worth the configuration overhead this milestone |
| Enable noUncheckedIndexedAccess | May be worthwhile after Zod/TS audit, but could generate excessive changes |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PATN-01 | Phase 27 | Complete |
| PATN-02 | Phase 27 | Complete |
| PATN-03 | Phase 27 | Complete |
| TYPE-04 | Phase 27 | Complete |
| HOOK-01 | Phase 28 | Complete |
| HOOK-02 | Phase 28 | Complete |
| HOOK-03 | Phase 28 | Complete |
| DECOMP-01 | Phase 29 | Complete |
| DECOMP-02 | Phase 29 | Complete |
| DECOMP-03 | Phase 29 | Complete |
| PATN-04 | Phase 29 | Complete |
| TYPE-01 | Phase 32 | Complete |
| TYPE-02 | Phase 30 | Complete |
| TYPE-03 | Phase 30 | Complete |
| DECOMP-04 | Phase 31 | Complete |
| DECOMP-05 | Phase 31 | Complete |

**Coverage:**
- v1.5 requirements: 16 total
- Mapped to phases: 16 (TYPE-01 reassigned to Phase 32 gap closure)
- Unmapped: 0
- Satisfied: 15
- Pending: 1 (TYPE-01)

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
