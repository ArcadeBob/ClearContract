# Roadmap: ClearContract

## Milestones

- ✅ **v1.0 Enhanced Analysis Release** -- Phases 1-6 (shipped 2026-03-06)
- ✅ **v1.1 Domain Intelligence** -- Phases 7-10 (shipped 2026-03-10)
- ✅ **v1.2 UX Foundations** -- Phases 11-14 (shipped 2026-03-12)
- ✅ **v1.3 Workflow Completion** -- Phases 15-21 (shipped 2026-03-13)
- ✅ **v1.4 Production Readiness** -- Phases 22-26 (shipped 2026-03-15)
- ✅ **v1.5 Code Health** -- Phases 27-32 (shipped 2026-03-15)
- 🚧 **v1.6 Quality & Validation** -- Phases 33-38 (in progress)

## Phases

<details>
<summary>✅ v1.0 Enhanced Analysis Release (Phases 1-6) -- SHIPPED 2026-03-06</summary>

- [x] Phase 1: Pipeline Foundation (4/4 plans) -- completed 2026-03-04
- [x] Phase 2: Core Legal Risk Analysis (2/2 plans) -- completed 2026-03-05
- [x] Phase 3: Extended Legal Coverage (2/2 plans) -- completed 2026-03-05
- [x] Phase 4: Scope, Compliance, and Verbiage (2/2 plans) -- completed 2026-03-05
- [x] Phase 5: Negotiation Output and Organization (2/2 plans) -- completed 2026-03-06
- [x] Phase 6: CategoryFilter Display Fix (1/1 plan) -- completed 2026-03-06 [GAP CLOSURE]

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Domain Intelligence (Phases 7-10) -- SHIPPED 2026-03-10</summary>

- [x] Phase 7: Knowledge Architecture and Company Profile (2/2 plans) -- completed 2026-03-08
- [x] Phase 8: Pipeline Integration and Company-Specific Intelligence (2/2 plans) -- completed 2026-03-09
- [x] Phase 9: CA Regulatory Knowledge (2/2 plans) -- completed 2026-03-09
- [x] Phase 10: Industry and Trade Knowledge (2/2 plans) -- completed 2026-03-10

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.2 UX Foundations (Phases 11-14) -- SHIPPED 2026-03-12</summary>

- [x] Phase 11: Data Persistence (1/1 plan) -- completed 2026-03-12
- [x] Phase 12: Contract Management (1/1 plan) -- completed 2026-03-12
- [x] Phase 13: Upload Error Feedback (2/2 plans) -- completed 2026-03-12
- [x] Phase 14: Empty States and Dashboard Polish (1/1 plan) -- completed 2026-03-12

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.3 Workflow Completion (Phases 15-21) -- SHIPPED 2026-03-13</summary>

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
<summary>✅ v1.4 Production Readiness (Phases 22-26) -- SHIPPED 2026-03-15</summary>

- [x] Phase 22: Polish & Trust (3/3 plans) -- completed 2026-03-14
- [x] Phase 23: Analysis Quality (3/3 plans) -- completed 2026-03-14
- [x] Phase 24: Actionable Output (2/2 plans) -- completed 2026-03-15
- [x] Phase 25: Portfolio Intelligence (2/2 plans) -- completed 2026-03-15
- [x] Phase 26: Audit Gap Closure (1/1 plan) -- completed 2026-03-15 [GAP CLOSURE]

See `.planning/milestones/v1.4-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.5 Code Health (Phases 27-32) -- SHIPPED 2026-03-15</summary>

- [x] Phase 27: Foundation Utilities (2/2 plans) -- completed 2026-03-15
- [x] Phase 28: Hook Extraction (2/2 plans) -- completed 2026-03-15
- [x] Phase 29: Component Decomposition + Toast Context (3/3 plans) -- completed 2026-03-15
- [x] Phase 30: Type Safety Hardening (3/3 plans) -- completed 2026-03-15
- [x] Phase 31: Server-side API Modularization (1/1 plan) -- completed 2026-03-15
- [x] Phase 32: Type Safety Gap Closure (1/1 plan) -- completed 2026-03-15 [GAP CLOSURE]

See `.planning/milestones/v1.5-ROADMAP.md` for full details.

</details>

### v1.6 Quality & Validation (In Progress)

**Milestone Goal:** Establish comprehensive test coverage and validation for a shipped 10,809-LOC application that currently has zero test infrastructure. Proves correctness of core business logic, UI components, API pipeline, and deployment configuration through automated tests and manual UAT.

- [x] **Phase 33: Test Infrastructure** - Vitest, RTL, Framer Motion mock, test utilities, and a passing trivial test (completed 2026-03-16)
- [x] **Phase 34: Pure Logic Unit Tests** - Risk scoring, merge, bid signal, error classification, storage, and Zod schemas (completed 2026-03-16)
- [x] **Phase 35: Hook Tests** - Contract store, inline edit, filtering, and field validation hooks (completed 2026-03-16)
- [x] **Phase 36: Component Tests** - FindingCard, SeverityBadge, UploadZone, FilterToolbar, and Sidebar (completed 2026-03-16)
- [x] **Phase 37: API Integration Tests** - Endpoint validation, error paths, full pipeline mock, and schema conformance (completed 2026-03-16)
- [x] **Phase 38: UAT, CI, and Coverage Enforcement** - Manual UAT checklist, regression suite, live API tests, Vercel config, CI pipeline, coverage thresholds (completed 2026-03-16)

## Phase Details

### Phase 33: Test Infrastructure
**Goal**: Developer can run `npm run test` and see a passing test suite with both jsdom and node environments working
**Depends on**: Nothing (first phase of v1.6)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Running `npm run test` executes Vitest and exits with zero failures (at least one trivial test passes)
  2. A component test file renders a React component in jsdom without errors (RTL + jest-dom matchers work)
  3. An API test file imports a server module in node environment without jsdom contamination
  4. Framer Motion components render in tests without animation errors or hangs
  5. Test utility factories produce valid Contract and Finding objects that pass Zod schema validation
**Plans:** 2/2 plans complete

Plans:
- [ ] 33-01-PLAN.md -- Install deps, configure Vitest, create setup files and custom render wrapper
- [ ] 33-02-PLAN.md -- Create fixture factories and verification tests proving the stack works

### Phase 34: Pure Logic Unit Tests
**Goal**: Core business logic is proven correct through automated tests that catch regressions in risk scoring, finding merge, bid signals, error handling, storage, and schema validation
**Depends on**: Phase 33
**Requirements**: UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05, UNIT-06
**Success Criteria** (what must be TRUE):
  1. Risk score computation returns deterministic values for known finding distributions and correctly applies category weights
  2. Merge logic deduplicates findings by composite key, prefers specialized-pass findings, and handles all 16 pass schema shapes
  3. Bid signal computation produces correct traffic light values for all 5 weighted factor combinations including edge cases
  4. Error classifier maps network errors, API errors, validation errors, and unknown errors to their correct categories
  5. Storage manager handles get/set/delete operations, quota exceeded errors, and v1-to-v2 migration correctly
**Plans:** 3/3 plans complete

Plans:
- [ ] 34-01-PLAN.md -- Extend factories with pass-specific functions, scoring tests, error classification tests
- [ ] 34-02-PLAN.md -- Bid signal tests, storage manager tests, contract storage migration tests
- [ ] 34-03-PLAN.md -- Merge module tests with all 15 pass handlers and Zod schema validation

### Phase 35: Hook Tests
**Goal**: React hooks that manage application state, filtering, inline editing, and field validation are proven to behave correctly through renderHook-based tests
**Depends on**: Phase 34
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. useContractStore correctly performs CRUD on contracts, transitions contract state, and updates finding resolved/note fields
  2. useInlineEdit follows the edit state machine (idle -> editing -> saving -> idle) and handles cancel and error paths
  3. useContractFiltering produces correct filtered/grouped/sorted output for multi-select filter combinations
  4. useFieldValidation calls onBlur validate, reverts to last good value on invalid input, and saves on valid input
**Plans:** 2/2 plans complete

Plans:
- [ ] 35-01-PLAN.md -- useContractStore CRUD/finding mutations and useInlineEdit state machine tests
- [ ] 35-02-PLAN.md -- useContractFiltering filter/group/sort tests and useFieldValidation validation/timer tests

### Phase 36: Component Tests
**Goal**: Key UI components render correctly with all data variations, respond to user interaction, and display appropriate visual states
**Depends on**: Phase 34
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. FindingCard renders clause text, explanation, severity badge, and metadata for all severity levels including Critical, High, Medium, Low, and Info
  2. SeverityBadge displays correct color and label text for every severity value in the system
  3. UploadZone accepts PDF files within size limits, rejects non-PDF files, rejects oversized files, and shows appropriate error messages
  4. FilterToolbar toggles filter selections on click, visually indicates active filters, and updates the filtered results
  5. Sidebar renders all navigation views, highlights the currently active view, and triggers navigation on click
**Plans:** 2/2 plans complete

Plans:
- [ ] 36-01-PLAN.md -- FindingCard and SeverityBadge component tests
- [ ] 36-02-PLAN.md -- UploadZone, FilterToolbar, and Sidebar component tests

### Phase 37: API Integration Tests
**Goal**: The /api/analyze endpoint correctly validates input, handles all error conditions, and processes the full 17-pass pipeline through to merged findings with risk score
**Depends on**: Phase 33
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04
**Success Criteria** (what must be TRUE):
  1. A valid PDF payload sent to /api/analyze returns a 200 response with structured analysis containing findings, risk score, and dates
  2. The endpoint returns 400 for missing/malformed body, 401 for missing API key, 422 for image-based PDFs, and 429 for rate-limited requests
  3. A full pipeline mock test exercises all 16 passes plus synthesis and produces merged findings with correct deduplication and risk scoring
  4. Every finding in the API response validates against MergedFindingSchema with no Zod parse errors
**Plans:** 2/2 plans complete

Plans:
- [ ] 37-01-PLAN.md -- Test fixtures, mock infrastructure, endpoint validation and error path tests
- [ ] 37-02-PLAN.md -- Full pipeline mock test and Zod schema conformance validation

### Phase 38: UAT, CI, and Coverage Enforcement
**Goal**: The application is validated end-to-end through manual UAT, regression fixtures, live API verification, deployment config check, CI pipeline, and coverage thresholds
**Depends on**: Phase 35, Phase 36, Phase 37
**Requirements**: UAT-01, UAT-02, UAT-03, UAT-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. A written UAT checklist exists covering the full user workflow (upload, analyze, review findings, resolve/annotate, filter, export CSV, export PDF, compare contracts)
  2. A mocked regression suite replays captured API response fixtures and validates the pipeline produces correct output without calling the live API
  3. A live API test suite (manual trigger via `npm run test:live`) validates real API responses against Zod schemas
  4. Vercel Pro configuration is verified with 300s maxDuration working on the deployed endpoint
  5. GitHub Actions CI runs tests on push/PR and fails the build if coverage drops below configured thresholds
**Plans:** 2/2 plans complete

Plans:
- [ ] 38-01-PLAN.md -- Coverage config, UAT checklist, mocked regression suite
- [ ] 38-02-PLAN.md -- Live API test, GitHub Actions CI workflow

## Progress

**Execution Order:**
Phases execute in numeric order: 33 -> 34 -> 35 -> 36 -> 37 -> 38
(Phases 35 and 36 both depend on 34; Phase 37 depends only on 33 but benefits from 34's fixtures)

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
| 27. Foundation Utilities | v1.5 | 2/2 | Complete | 2026-03-15 |
| 28. Hook Extraction | v1.5 | 2/2 | Complete | 2026-03-15 |
| 29. Component Decomposition + Toast Context | v1.5 | 3/3 | Complete | 2026-03-15 |
| 30. Type Safety Hardening | v1.5 | 3/3 | Complete | 2026-03-15 |
| 31. Server-side API Modularization | v1.5 | 1/1 | Complete | 2026-03-15 |
| 32. Type Safety Gap Closure | v1.5 | 1/1 | Complete | 2026-03-15 |
| 33. Test Infrastructure | 2/2 | Complete    | 2026-03-16 | - |
| 34. Pure Logic Unit Tests | 3/3 | Complete    | 2026-03-16 | - |
| 35. Hook Tests | 2/2 | Complete    | 2026-03-16 | - |
| 36. Component Tests | 2/2 | Complete    | 2026-03-16 | - |
| 37. API Integration Tests | 2/2 | Complete    | 2026-03-16 | - |
| 38. UAT, CI, and Coverage Enforcement | 2/2 | Complete    | 2026-03-16 | - |
