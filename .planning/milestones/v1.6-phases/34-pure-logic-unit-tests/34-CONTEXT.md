# Phase 34: Pure Logic Unit Tests - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove correctness of 6 pure logic modules through automated unit tests: risk scoring, finding merge, bid signal, error classification, storage manager, and Zod schema validation. No hook tests, component tests, or API integration tests -- those are Phases 35-37.

</domain>

<decisions>
## Implementation Decisions

### Merge test depth
- Test ALL 16 pass schemas individually -- each has unique fields (duty_to_defend, coverage_types, etc.)
- Exhaustive composite key dedup testing: exact match, partial match, different severity same clause, cross-pass duplicates
- Every test assertion validates merged output through MergedFindingSchema.parse() -- catches type drift between merge logic and schemas
- Pass-specific factory functions added to `src/test/factories.ts` (e.g., createIndemnificationPassResult) -- extends Phase 33 pattern

### Edge case boundaries
- Full boundary testing for computeRiskScore: empty findings, single finding per severity, all-Critical, all-Info, exact threshold values (0, 50, 100), category weight edge cases
- computeBidSignal: both individual factor isolation AND realistic multi-factor combinations; tests weighting math and traffic light thresholds
- Valid-but-extreme inputs only -- no malformed/null/undefined testing (TypeScript guards the boundary at compile time)

### Storage testing
- Test BOTH storageManager (generic CRUD: load/save/loadRaw/saveRaw/remove) AND contractStorage (domain logic: loadContracts migration, saveContracts, mock seeding)
- Hand-crafted v1 fixtures for migration testing: minimal contract objects missing v2 fields (resolved, note, recommendation, clauseReference, negotiationPosition, actionPriority) -- verify migrateContracts backfills defaults
- Single quota exceeded test: vi.spyOn throws DOMException on setItem, verify structured error result (not crash)

### Test isolation strategy
- Pure isolation with factories -- each test file creates its own input data via factories, no cross-module mocking
- Replace the Phase 33 trivial errors.test.ts with comprehensive coverage (network, API, validation, unknown errors)
- One test file per module, colocated with source: scoring.test.ts, merge.test.ts, bidSignal.test.ts, errors.test.ts, storageManager.test.ts, contractStorage.test.ts

### Claude's Discretion
- Exact number of test cases per module
- describe/it nesting structure
- Whether to use test.each for parameterized boundary tests
- Order of test cases within files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test targets (source modules to test)
- `api/scoring.ts` -- computeRiskScore, applySeverityGuard (106 LOC)
- `api/merge.ts` -- mergePassResults, all 16 pass schema imports (554 LOC, HIGH complexity)
- `api/passes.ts` -- Pass-specific Zod schemas (IndemnificationPassResultSchema, etc.)
- `src/utils/bidSignal.ts` -- computeBidSignal, generateFactorReasons, FACTOR_DEFS (137 LOC)
- `src/utils/errors.ts` -- classifyError, formatApiError (112 LOC)
- `src/storage/storageManager.ts` -- load, save, loadRaw, saveRaw, remove (generic CRUD)
- `src/storage/contractStorage.ts` -- loadContracts, saveContracts, migrateContracts (domain + v1-v2 migration)

### Test infrastructure (from Phase 33)
- `src/test/factories.ts` -- Existing override-style factories (createContract, createFinding); extend with pass-specific factories
- `src/test/setup.ts` -- Vitest setup file with Framer Motion mock and jest-dom
- `src/test/render.tsx` -- Custom render wrapper with ToastProvider
- `vite.config.ts` -- Vitest config (inline), dual environments

### Type system
- `src/types/contract.ts` -- Contract, Finding, Severity, Category types; MergedFindingSchema if present

### Requirements
- `.planning/REQUIREMENTS.md` -- UNIT-01 through UNIT-06 define acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts`: Override-style factories validated against Zod schemas -- extend with pass-specific factories (createIndemnificationPassResult, etc.)
- `src/data/mockContracts.ts`: 3 sample contracts at varying risk levels -- reference for realistic test data but factories preferred
- Existing `src/utils/errors.test.ts`: Trivial verification test from Phase 33 -- replace with comprehensive tests

### Established Patterns
- TypeScript strict mode: test utilities must follow noUnusedLocals/noUnusedParameters
- ES modules throughout (`"type": "module"` in package.json)
- Vitest config inline in `vite.config.ts`
- API test files use `// @vitest-environment node` per-file comment
- Factory pattern: `createX({overrides})` returns Zod-validated defaults

### Integration Points
- `api/*.test.ts` files colocated alongside `api/scoring.ts`, `api/merge.ts`
- `src/utils/*.test.ts` files colocated alongside `bidSignal.ts`, `errors.ts`
- `src/storage/*.test.ts` files colocated alongside storage modules
- `src/test/factories.ts` extended with new factory functions

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 34-pure-logic-unit-tests*
*Context gathered: 2026-03-16*
