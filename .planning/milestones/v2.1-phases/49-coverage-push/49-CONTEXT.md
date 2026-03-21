# Phase 49: Coverage Push - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Push statement and function coverage past the 60% CI threshold by writing new tests targeting previously uncovered code paths. No new features, no test architecture changes — just add tests to existing infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Test targeting strategy
- Broadest coverage first — prioritize easy wins that cover the most lines with least effort
- Order: knowledge modules (600 LOC at 0%) → components (800 LOC at 0-9%) → utilities → hooks → pages
- Pages get shallow render-only tests (mount with mocked providers, no interaction testing)
- Components get render + snapshot tests (verify render with mock props, check key elements exist)

### Testing depth
- Utilities (exportContractCsv, exportContractPdf, profileValidation): core happy path + one error case per function. Mock jsPDF/Blob for PDF/CSV tests.
- useContractStore: test key mutations only (addContract, updateContract, deleteContract, navigateTo). Skip exhaustive setter coverage.
- No thorough edge case testing — this is coverage push, not comprehensive validation

### Knowledge module coverage
- Schema validation tests for all 16 knowledge modules: import each, validate required fields, token count under limit, correct domain/tags
- Registry.ts gets its own test: registerModule, getModulesForPass, token budget enforcement
- Covers registry + all barrel exports (index.ts files)

### Coverage ceiling
- Aim for 65% statements and 65% functions (5% buffer over CI threshold)
- CI threshold in vite.config.ts stays at 60% — don't bump it. Buffer protects against regressions without making CI brittle
- Threshold bump deferred to a future milestone

### Claude's Discretion
- Exact test file organization and naming
- Which specific component props to use in render tests
- Order of test files within the broad targeting strategy
- Whether to group small component tests or use one file per component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test infrastructure
- `vite.config.ts` — Coverage config (thresholds, includes/excludes, provider)
- `src/test/setup.ts` — Test setup with Framer Motion mock and custom render wrapper
- `src/test/factories.ts` — Zod-validated test data factories
- `src/test/factories.test.ts` — Factory validation pattern to follow

### Existing test patterns
- `src/components/FindingCard.test.tsx` — Component render + snapshot pattern
- `src/components/FilterToolbar.test.tsx` — Component with interaction testing pattern
- `src/hooks/__tests__/useContractFiltering.test.ts` — Hook testing pattern
- `src/contexts/AuthContext.test.tsx` — Auth context mocking pattern
- `src/pages/LoginPage.test.tsx` — Page render with auth mocks pattern

### Requirements
- `.planning/REQUIREMENTS.md` §Coverage — COV-01 (statements >= 60%), COV-02 (functions >= 60%), COV-03 (new tests target uncovered code)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts`: Zod-validated factories for Contract, Finding, ContractDate — use for all new test data
- `src/test/setup.ts`: Proxy-based Framer Motion mock — already handles all motion.* elements in component tests
- `createTableMock` pattern from Phase 46: Supabase query builder mock for any DB-dependent tests
- Custom `render` wrapper in setup.ts: includes necessary providers

### Established Patterns
- Component tests: render with mock props → check key elements via `screen.getByText` / `getByRole`
- Hook tests: `renderHook` from React Testing Library
- Supabase mocking: `vi.mock('@supabase/supabase-js')` at module level with `createTableMock`
- Auth mocking: mock `useAuth` to return `{ user, session }` for authenticated component tests
- localStorage spy: `vi.spyOn(Storage.prototype, 'getItem')` pattern for storage tests

### Integration Points
- Coverage report runs via `npx vitest run --coverage` — same command CI uses
- All test files must be in `src/` or `api/` directories, matching `**/*.test.{ts,tsx}` pattern
- Coverage excludes: `src/test/**`, `api/test-fixtures/**`, `src/index.tsx`, `src/data/mockContracts.ts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing test patterns established in v1.6.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 49-coverage-push*
*Context gathered: 2026-03-20*
