# Requirements: ClearContract

**Defined:** 2026-03-19
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v2.1 Requirements

Requirements for Quality Restoration milestone. Each maps to roadmap phases.

### Test Restoration

- [ ] **TEST-01**: api/analyze.test.ts passes all 18 tests with Supabase-aware mocks (JWT auth, DB writes)
- [ ] **TEST-02**: api/regression.test.ts passes all 6 tests with Supabase-aware pipeline replay
- [ ] **TEST-03**: App.test.tsx passes all 3 tests including auth gate rendering
- [ ] **TEST-04**: `npm run test` exits with 0 failures (269/269 pass)

### Security

- [ ] **SEC-01**: `npm audit` reports zero high or critical vulnerabilities
- [ ] **SEC-02**: All dependency upgrades pass existing test suite

### Tooling

- [ ] **TOOL-01**: ESLint upgraded to v10+ with flat config (eslint.config.js)
- [ ] **TOOL-02**: @typescript-eslint upgraded to v8+
- [ ] **TOOL-03**: All ESLint plugins compatible with new config format
- [ ] **TOOL-04**: `npm run lint` passes with zero errors on current codebase

### Coverage

- [ ] **COV-01**: Statement coverage >= 60% (CI threshold passes)
- [ ] **COV-02**: Function coverage >= 60% (maintained from v1.6)
- [ ] **COV-03**: New tests target uncovered API and component code paths

### Cleanup

- [ ] **CLEAN-01**: isUploading/setIsUploading removed from useContractStore
- [ ] **CLEAN-02**: .env.example corrected (VITE_SUPABASE_ANON_KEY, not SUPABASE_ANON_KEY)
- [ ] **CLEAN-03**: mockContracts.ts excluded from coverage (already in config) or deleted if unused

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
| TEST-01 | - | Pending |
| TEST-02 | - | Pending |
| TEST-03 | - | Pending |
| TEST-04 | - | Pending |
| SEC-01 | - | Pending |
| SEC-02 | - | Pending |
| TOOL-01 | - | Pending |
| TOOL-02 | - | Pending |
| TOOL-03 | - | Pending |
| TOOL-04 | - | Pending |
| COV-01 | - | Pending |
| COV-02 | - | Pending |
| COV-03 | - | Pending |
| CLEAN-01 | - | Pending |
| CLEAN-02 | - | Pending |
| CLEAN-03 | - | Pending |

**Coverage:**
- v2.1 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
