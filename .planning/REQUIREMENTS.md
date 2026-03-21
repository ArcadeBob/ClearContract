# Requirements: ClearContract

**Defined:** 2026-03-19
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v2.1 Requirements

Requirements for Quality Restoration milestone. Each maps to roadmap phases.

### Test Restoration

- [x] **TEST-01**: api/analyze.test.ts passes all 18 tests with Supabase-aware mocks (JWT auth, DB writes)
- [x] **TEST-02**: api/regression.test.ts passes all 6 tests with Supabase-aware pipeline replay
- [x] **TEST-03**: App.test.tsx passes all 3 tests including auth gate rendering
- [x] **TEST-04**: `npm run test` exits with 0 failures (269/269 pass)

### Security

- [x] **SEC-01**: `npm audit` reports zero high or critical vulnerabilities
- [x] **SEC-02**: All dependency upgrades pass existing test suite

### Tooling

- [x] **TOOL-01**: ESLint upgraded to v10+ with flat config (eslint.config.js)
- [x] **TOOL-02**: @typescript-eslint upgraded to v8+
- [x] **TOOL-03**: All ESLint plugins compatible with new config format
- [x] **TOOL-04**: `npm run lint` passes with zero errors on current codebase

### Coverage

- [x] **COV-01**: Statement coverage >= 60% (CI threshold passes)
- [x] **COV-02**: Function coverage >= 60% (maintained from v1.6)
- [x] **COV-03**: New tests target uncovered API and component code paths

### Cleanup

- [x] **CLEAN-01**: isUploading/setIsUploading removed from useContractStore
- [x] **CLEAN-02**: .env.example corrected (VITE_SUPABASE_ANON_KEY, not SUPABASE_ANON_KEY)
- [x] **CLEAN-03**: mockContracts.ts excluded from coverage (already in config) or deleted if unused

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### End-to-End Testing

- **E2E-01**: Browser-level tests for auth gate + analysis + review flow
- **E2E-02**: Playwright or Cypress test infrastructure

### Additional Coverage

- **COV-04**: Statement coverage >= 80%
- **COV-05**: Branch coverage tracking and thresholds

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New user-facing features | Quality milestone -- no new functionality |
| React 19 upgrade | Separate migration effort, not quality restoration |
| Vitest 4 upgrade | Major version; defer unless needed for coverage tooling |
| Rewriting test architecture | Fix existing tests, don't redesign test patterns |
| Supabase integration tests (live DB) | Would require test database provisioning; mock-based is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 46 | Complete |
| TEST-02 | Phase 46 | Complete |
| TEST-03 | Phase 46 | Complete |
| TEST-04 | Phase 46 | Complete |
| SEC-01 | Phase 47 | Complete |
| SEC-02 | Phase 47 | Complete |
| TOOL-01 | Phase 48 | Complete |
| TOOL-02 | Phase 48 | Complete |
| TOOL-03 | Phase 48 | Complete |
| TOOL-04 | Phase 48 | Complete |
| COV-01 | Phase 49 | Complete |
| COV-02 | Phase 49 | Complete |
| COV-03 | Phase 49 | Complete |
| CLEAN-01 | Phase 50 | Complete |
| CLEAN-02 | Phase 50 | Complete |
| CLEAN-03 | Phase 50 | Complete |

**Coverage:**
- v2.1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
