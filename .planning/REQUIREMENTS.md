# Requirements: ClearContract

**Defined:** 2026-03-15
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v1.6 Requirements

Requirements for Quality & Validation milestone. Each maps to roadmap phases.

### Test Infrastructure

- [x] **INFRA-01**: Vitest configured with dual environments (jsdom for client, node for API tests)
- [x] **INFRA-02**: React Testing Library with jest-dom matchers and user-event installed and working
- [x] **INFRA-03**: Framer Motion globally mocked so component tests render without animation errors
- [x] **INFRA-04**: Test utility kit: custom render wrapper, localStorage mock helpers, fixture factories for Zod schemas
- [ ] **INFRA-05**: GitHub Actions CI pipeline runs tests on push/PR with coverage reporting
- [x] **INFRA-06**: Coverage thresholds enforced (starting ~60% statements/functions, fail CI if below)

### Unit Tests: Pure Logic

- [x] **UNIT-01**: Risk scoring tested (computeRiskScore with various finding distributions and category weights)
- [x] **UNIT-02**: Merge logic tested (mergePassResults deduplication, composite key matching, all 16 pass schemas)
- [x] **UNIT-03**: Bid signal tested (computeBidSignal with all 5 weighted factors and edge cases)
- [x] **UNIT-04**: Error classification tested (classifyError for all error types: network, API, validation, unknown)
- [x] **UNIT-05**: Storage manager tested (storageManager get/set/delete, quota exceeded handling, v1-v2 migration)
- [x] **UNIT-06**: Zod schema validation tested (MergedFindingSchema, pass-specific schemas, edge cases for required vs optional fields)

### Unit Tests: Hooks

- [x] **HOOK-01**: useContractStore tested (CRUD operations, state transitions, finding resolve/note updates)
- [x] **HOOK-02**: useInlineEdit tested (edit state machine: idle -> editing -> saving -> idle, cancel, error)
- [x] **HOOK-03**: useContractFiltering tested (filter/group/sort combinations, persistence to localStorage)
- [x] **HOOK-04**: useFieldValidation tested (onBlur validate, revert on invalid, save on valid)

### Component Tests

- [x] **COMP-01**: FindingCard renders all severity levels with correct styling and metadata
- [x] **COMP-02**: SeverityBadge renders correct colors and labels for all severity values
- [x] **COMP-03**: UploadZone accepts valid PDFs, rejects invalid files, shows error states
- [x] **COMP-04**: FilterToolbar toggles filters correctly, reflects active filter state
- [x] **COMP-05**: Sidebar navigation renders all views, highlights active view, triggers navigation

### Integration Tests: API

- [x] **INTG-01**: /api/analyze endpoint accepts valid PDF payload and returns structured response
- [x] **INTG-02**: /api/analyze returns correct HTTP errors (400 bad input, 401 missing key, 422 image PDF, 429 rate limit)
- [x] **INTG-03**: Full pipeline mocked test: PDF upload -> 16 passes + synthesis -> merged findings with risk score
- [x] **INTG-04**: API response validates against Zod schemas (MergedFindingSchema for each finding)

### Validation & UAT

- [x] **UAT-01**: Manual UAT checklist created covering full user workflow (upload, analyze, review, actions, export)
- [x] **UAT-02**: Mocked regression suite with captured real API response fixtures, validates pipeline without live API
- [ ] **UAT-03**: Live API test suite (manual trigger) validates response structure against Zod schemas
- [x] **UAT-04**: Vercel Pro config verified (300s maxDuration confirmed working on deployed endpoint)

## Future Requirements

### End-to-End Testing

- **E2E-01**: Playwright browser automation for critical user flows
- **E2E-02**: Visual regression testing for UI components

## Out of Scope

| Feature | Reason |
|---------|--------|
| Playwright/E2E browser testing | Single-user tool; component tests + manual UAT sufficient for v1.6 |
| Visual regression testing | No design system changes planned; premature |
| MSW (Mock Service Worker) | vi.fn() mocking is simpler for single API endpoint; MSW adds complexity without benefit |
| Performance/load testing | Single-user tool, no concurrent load scenarios |
| Snapshot testing | Brittle for this component structure; assertion-based tests preferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 33 | Complete |
| INFRA-02 | Phase 33 | Complete |
| INFRA-03 | Phase 33 | Complete |
| INFRA-04 | Phase 33 | Complete |
| INFRA-05 | Phase 38 | Pending |
| INFRA-06 | Phase 38 | Complete |
| UNIT-01 | Phase 34 | Complete |
| UNIT-02 | Phase 34 | Complete |
| UNIT-03 | Phase 34 | Complete |
| UNIT-04 | Phase 34 | Complete |
| UNIT-05 | Phase 34 | Complete |
| UNIT-06 | Phase 34 | Complete |
| HOOK-01 | Phase 35 | Complete |
| HOOK-02 | Phase 35 | Complete |
| HOOK-03 | Phase 35 | Complete |
| HOOK-04 | Phase 35 | Complete |
| COMP-01 | Phase 36 | Complete |
| COMP-02 | Phase 36 | Complete |
| COMP-03 | Phase 36 | Complete |
| COMP-04 | Phase 36 | Complete |
| COMP-05 | Phase 36 | Complete |
| INTG-01 | Phase 37 | Complete |
| INTG-02 | Phase 37 | Complete |
| INTG-03 | Phase 37 | Complete |
| INTG-04 | Phase 37 | Complete |
| UAT-01 | Phase 38 | Complete |
| UAT-02 | Phase 38 | Complete |
| UAT-03 | Phase 38 | Pending |
| UAT-04 | Phase 38 | Complete |

**Coverage:**
- v1.6 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
