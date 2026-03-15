# Roadmap: ClearContract

## Milestones

- v1.0 Enhanced Analysis Release -- Phases 1-6 (shipped 2026-03-06)
- v1.1 Domain Intelligence -- Phases 7-10 (shipped 2026-03-10)
- v1.2 UX Foundations -- Phases 11-14 (shipped 2026-03-12)
- v1.3 Workflow Completion -- Phases 15-21 (shipped 2026-03-13)
- v1.4 Production Readiness -- Phases 22-26 (shipped 2026-03-15)
- v1.5 Code Health -- Phases 27-31 (in progress)

## Phases

<details>
<summary>v1.0 Enhanced Analysis Release (Phases 1-6) -- SHIPPED 2026-03-06</summary>

- [x] Phase 1: Pipeline Foundation (4/4 plans) -- completed 2026-03-04
- [x] Phase 2: Core Legal Risk Analysis (2/2 plans) -- completed 2026-03-05
- [x] Phase 3: Extended Legal Coverage (2/2 plans) -- completed 2026-03-05
- [x] Phase 4: Scope, Compliance, and Verbiage (2/2 plans) -- completed 2026-03-05
- [x] Phase 5: Negotiation Output and Organization (2/2 plans) -- completed 2026-03-06
- [x] Phase 6: CategoryFilter Display Fix (1/1 plan) -- completed 2026-03-06 [GAP CLOSURE]

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.1 Domain Intelligence (Phases 7-10) -- SHIPPED 2026-03-10</summary>

- [x] Phase 7: Knowledge Architecture and Company Profile (2/2 plans) -- completed 2026-03-08
- [x] Phase 8: Pipeline Integration and Company-Specific Intelligence (2/2 plans) -- completed 2026-03-09
- [x] Phase 9: CA Regulatory Knowledge (2/2 plans) -- completed 2026-03-09
- [x] Phase 10: Industry and Trade Knowledge (2/2 plans) -- completed 2026-03-10

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.2 UX Foundations (Phases 11-14) -- SHIPPED 2026-03-12</summary>

- [x] Phase 11: Data Persistence (1/1 plan) -- completed 2026-03-12
- [x] Phase 12: Contract Management (1/1 plan) -- completed 2026-03-12
- [x] Phase 13: Upload Error Feedback (2/2 plans) -- completed 2026-03-12
- [x] Phase 14: Empty States and Dashboard Polish (1/1 plan) -- completed 2026-03-12

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.3 Workflow Completion (Phases 15-21) -- SHIPPED 2026-03-13</summary>

- [x] Phase 15: URL-based Routing (1/1 plan) -- completed 2026-03-13
- [x] Phase 16: Finding Actions (2/2 plans) -- completed 2026-03-13
- [x] Phase 17: Settings Validation (1/1 plan) -- completed 2026-03-13
- [x] Phase 18: Re-analyze Contract (1/1 plan) -- completed 2026-03-13
- [x] Phase 19: Export Report (1/1 plan) -- completed 2026-03-13
- [x] Phase 20: Fix All Contracts Navigation (1/1 plan) -- completed 2026-03-13 [GAP CLOSURE]
- [x] Phase 21: Fix Filtered CSV Export (1/1 plan) -- completed 2026-03-13 [GAP CLOSURE]

See `.planning/milestones/v1.3-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.4 Production Readiness (Phases 22-26) -- SHIPPED 2026-03-15</summary>

- [x] Phase 22: Polish & Trust (3/3 plans) -- completed 2026-03-14
- [x] Phase 23: Analysis Quality (3/3 plans) -- completed 2026-03-14
- [x] Phase 24: Actionable Output (2/2 plans) -- completed 2026-03-15
- [x] Phase 25: Portfolio Intelligence (2/2 plans) -- completed 2026-03-15
- [x] Phase 26: Audit Gap Closure (1/1 plan) -- completed 2026-03-15 [GAP CLOSURE]

See `.planning/milestones/v1.4-ROADMAP.md` for full details.

</details>

### v1.5 Code Health (In Progress)

**Milestone Goal:** Broad refactoring sweep -- decompose god components, fix type safety gaps, consolidate scattered patterns, extract reusable hooks. No new user-facing features.

- [x] **Phase 27: Foundation Utilities** - Storage manager, error handling, severity palette, and POST body validation (completed 2026-03-15)
- [x] **Phase 28: Hook Extraction** - useInlineEdit, useContractFiltering, useFieldValidation (completed 2026-03-15)
- [ ] **Phase 29: Component Decomposition + Toast Context** - LegalMetaBadge split, ScopeMetaBadge split, toast context, ContractReview wired to hooks
- [ ] **Phase 30: Type Safety Hardening** - Zod/TS reconciliation, client response validation, merge.ts type guards
- [ ] **Phase 31: Server-side API Modularization** - analyze.ts split into passes/lib/conversion, merge.ts extraction

## Phase Details

### Phase 27: Foundation Utilities
**Goal**: Shared utility primitives exist that later phases depend on -- storage, errors, colors, and request validation
**Depends on**: Nothing (first phase of v1.5)
**Requirements**: PATN-01, PATN-02, PATN-03, TYPE-04
**Success Criteria** (what must be TRUE):
  1. All localStorage reads/writes go through a single storage manager; no direct localStorage calls remain in components or hooks
  2. Error classification and formatting is handled by one shared utility; App.tsx, analyze.ts, and storage layer all import from the same source
  3. Severity-to-Tailwind-class mapping lives in one palette map file; no inline ternary chains for severity colors remain across the codebase
  4. POST requests to /api/analyze with missing or malformed pdfBase64/fileName fields return a clean 400 response with a descriptive error message
  5. Production build (`npm run build`) succeeds with no Tailwind purge issues -- all severity colors render correctly
**Plans**: 2 plans

Plans:
- [ ] 27-01-PLAN.md — Create utility files (storage manager, error classifier, palette) and request validation schema
- [ ] 27-02-PLAN.md — Refactor all call sites to use shared utilities

### Phase 28: Hook Extraction
**Goal**: Reusable state-logic hooks exist that encapsulate inline edit, contract filtering, and field validation patterns
**Depends on**: Phase 27 (useContractFiltering imports from storage manager)
**Requirements**: HOOK-01, HOOK-02, HOOK-03
**Success Criteria** (what must be TRUE):
  1. Inline rename on ContractReview and note editing on FindingCard both use the shared useInlineEdit hook -- click to edit, type, Enter to commit, Escape to cancel all work identically in both locations
  2. All multi-select filter state and visibleFindings computation lives in useContractFiltering; ContractReview imports the hook instead of owning 5+ useState calls and a complex useMemo
  3. Settings ProfileField validation uses useFieldValidation; onBlur validates, saves valid input with flash feedback, and reverts invalid input to last good value
  4. `npm run lint` passes with zero exhaustive-deps warnings on all three extracted hooks
**Plans**: 2 plans

Plans:
- [ ] 28-01-PLAN.md — Create useInlineEdit and useContractFiltering hooks, wire into ContractReview and FindingCard
- [ ] 28-02-PLAN.md — Create useFieldValidation hook, wire into Settings ProfileField

### Phase 29: Component Decomposition + Toast Context
**Goal**: God components are split into focused subcomponents, and toast notifications work without prop drilling
**Depends on**: Phase 28 (ContractReview decomposition requires hooks to be extracted first)
**Requirements**: DECOMP-01, DECOMP-02, DECOMP-03, PATN-04
**Success Criteria** (what must be TRUE):
  1. ContractReview.tsx is under 350 lines; filter/sort logic lives in useContractFiltering hook, and the component imports it cleanly
  2. LegalMetaBadge is a directory with barrel-exported index.tsx dispatcher and 11+ focused subcomponents (one per clause type); existing import paths (`from './LegalMetaBadge'` or `from '../components/LegalMetaBadge'`) resolve unchanged
  3. ScopeMetaBadge follows the same directory pattern with subcomponents for each passType branch
  4. Any component can call `useToast().showToast()` without receiving toast props from a parent; the `onShowToast` prop is removed from ContractReview's interface
  5. Filter toggle animations (AnimatePresence exit) still work correctly after all structural splits -- toggling a filter animates items in and out
**Plans**: 3 plans

Plans:
- [ ] 29-01-PLAN.md — Split LegalMetaBadge and ScopeMetaBadge into directory modules with barrel-exported dispatchers
- [ ] 29-02-PLAN.md — Create ToastProvider context and useToast hook
- [ ] 29-03-PLAN.md — Decompose ContractReview into subcomponents and wire toast context throughout app

### Phase 30: Type Safety Hardening
**Goal**: Zod schemas and TypeScript interfaces agree on field optionality, API responses are validated on the client, and merge.ts uses type guards instead of assertion casts
**Depends on**: Phase 29 (type guards written against stable post-decomposition schemas)
**Requirements**: TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):
  1. Every field that is `required` in a Zod schema is also required (non-optional) in the corresponding TypeScript interface, and vice versa; no optionality drift exists
  2. Existing contracts stored in localStorage before v1.5 load correctly after the Zod/TS reconciliation -- a migration function fills any newly-required fields with safe defaults
  3. The client-side analyzeContract.ts validates the API response with Zod `.safeParse()` before returning it; malformed responses produce a user-visible error instead of silent bad data at render time
  4. merge.ts contains zero `as string` or `as unknown` assertion casts; all type narrowing uses discriminated union checks or type guard functions
**Plans**: TBD

Plans:
- [ ] 30-01: TBD
- [ ] 30-02: TBD

### Phase 31: Server-side API Modularization
**Goal**: The 1,510-line api/analyze.ts monolith is decomposed into focused modules while preserving the Vercel entry-point contract
**Depends on**: Phase 30 (all client-side phases verified before touching server pipeline)
**Requirements**: DECOMP-04, DECOMP-05
**Success Criteria** (what must be TRUE):
  1. api/analyze.ts is under 200 lines and contains only the handler default export, `export const config`, and orchestration calls to extracted modules
  2. Pass definitions live in api/passes/ as separate modules; schema definitions are co-located or extracted to api/lib/
  3. Finding conversion functions and deduplication logic from merge.ts live in focused modules under api/conversion/ or similar
  4. A Vercel preview deployment successfully analyzes a 3-5MB PDF contract through all 16 passes -- the full pipeline works end-to-end after modularization
**Plans**: TBD

Plans:
- [ ] 31-01: TBD
- [ ] 31-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 27 -> 28 -> 29 -> 30 -> 31

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Pipeline Foundation | v1.0 | 4/4 | Complete | 2026-03-04 |
| 2. Core Legal Risk Analysis | v1.0 | 2/2 | Complete | 2026-03-05 |
| 3. Extended Legal Coverage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 4. Scope, Compliance, and Verbiage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 5. Negotiation Output and Organization | v1.0 | 2/2 | Complete | 2026-03-06 |
| 6. CategoryFilter Display Fix | v1.0 | 1/1 | Complete | 2026-03-06 |
| 7. Knowledge Architecture and Company Profile | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Pipeline Integration and Company-Specific Intelligence | v1.1 | 2/2 | Complete | 2026-03-09 |
| 9. CA Regulatory Knowledge | v1.1 | 2/2 | Complete | 2026-03-09 |
| 10. Industry and Trade Knowledge | v1.1 | 2/2 | Complete | 2026-03-10 |
| 11. Data Persistence | v1.2 | 1/1 | Complete | 2026-03-12 |
| 12. Contract Management | v1.2 | 1/1 | Complete | 2026-03-12 |
| 13. Upload Error Feedback | v1.2 | 2/2 | Complete | 2026-03-12 |
| 14. Empty States and Dashboard Polish | v1.2 | 1/1 | Complete | 2026-03-12 |
| 15. URL-based Routing | v1.3 | 1/1 | Complete | 2026-03-13 |
| 16. Finding Actions | v1.3 | 2/2 | Complete | 2026-03-13 |
| 17. Settings Validation | v1.3 | 1/1 | Complete | 2026-03-13 |
| 18. Re-analyze Contract | v1.3 | 1/1 | Complete | 2026-03-13 |
| 19. Export Report | v1.3 | 1/1 | Complete | 2026-03-13 |
| 20. Fix All Contracts Navigation | v1.3 | 1/1 | Complete | 2026-03-13 |
| 21. Fix Filtered CSV Export | v1.3 | 1/1 | Complete | 2026-03-13 |
| 22. Polish & Trust | v1.4 | 3/3 | Complete | 2026-03-14 |
| 23. Analysis Quality | v1.4 | 3/3 | Complete | 2026-03-14 |
| 24. Actionable Output | v1.4 | 2/2 | Complete | 2026-03-15 |
| 25. Portfolio Intelligence | v1.4 | 2/2 | Complete | 2026-03-15 |
| 26. Audit Gap Closure | v1.4 | 1/1 | Complete | 2026-03-15 |
| 27. Foundation Utilities | 2/2 | Complete    | 2026-03-15 | - |
| 28. Hook Extraction | 2/2 | Complete    | 2026-03-15 | - |
| 29. Component Decomposition + Toast Context | 1/3 | In Progress|  | - |
| 30. Type Safety Hardening | v1.5 | 0/TBD | Not started | - |
| 31. Server-side API Modularization | v1.5 | 0/TBD | Not started | - |
