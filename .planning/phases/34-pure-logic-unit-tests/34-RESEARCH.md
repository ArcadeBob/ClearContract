# Phase 34: Pure Logic Unit Tests - Research

**Researched:** 2026-03-16
**Domain:** Vitest unit testing for pure TypeScript business logic
**Confidence:** HIGH

## Summary

Phase 34 tests 6 pure logic modules: risk scoring (`api/scoring.ts`), finding merge (`api/merge.ts`), bid signal (`src/utils/bidSignal.ts`), error classification (`src/utils/errors.ts`), storage manager (`src/storage/storageManager.ts`), and contract storage (`src/storage/contractStorage.ts`). All modules are already written, well-typed, and have clear input/output contracts. The test infrastructure from Phase 33 (Vitest 3.x, factories, jest-dom) is fully operational.

The merge module is the highest-complexity target at 554 LOC with 15 specialized pass handlers, a two-phase deduplication algorithm (clauseReference+category then title-based fallback), and external dependencies on `getAllModules()` from the knowledge registry. Tests for this module will need pass-specific factory functions and careful mocking of the registry. The scoring and bid signal modules are deterministic math functions -- straightforward to test exhaustively. Error classification and storage are small modules with well-defined branches.

**Primary recommendation:** Build pass-specific factory functions in `src/test/factories.ts` first (extending Phase 33 pattern), then write one test file per module colocated with source. Use `vi.mock` for the knowledge registry in merge tests and `vi.spyOn` for localStorage in storage tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Test ALL 16 pass schemas individually -- each has unique fields (duty_to_defend, coverage_types, etc.)
- Exhaustive composite key dedup testing: exact match, partial match, different severity same clause, cross-pass duplicates
- Every test assertion validates merged output through MergedFindingSchema.parse() -- catches type drift between merge logic and schemas
- Pass-specific factory functions added to `src/test/factories.ts` (e.g., createIndemnificationPassResult) -- extends Phase 33 pattern
- Full boundary testing for computeRiskScore: empty findings, single finding per severity, all-Critical, all-Info, exact threshold values (0, 50, 100), category weight edge cases
- computeBidSignal: both individual factor isolation AND realistic multi-factor combinations; tests weighting math and traffic light thresholds
- Valid-but-extreme inputs only -- no malformed/null/undefined testing (TypeScript guards the boundary at compile time)
- Test BOTH storageManager (generic CRUD: load/save/loadRaw/saveRaw/remove) AND contractStorage (domain logic: loadContracts migration, saveContracts, mock seeding)
- Hand-crafted v1 fixtures for migration testing: minimal contract objects missing v2 fields (resolved, note, recommendation, clauseReference, negotiationPosition, actionPriority) -- verify migrateContracts backfills defaults
- Single quota exceeded test: vi.spyOn throws DOMException on setItem, verify structured error result (not crash)
- Pure isolation with factories -- each test file creates its own input data via factories, no cross-module mocking
- Replace the Phase 33 trivial errors.test.ts with comprehensive coverage (network, API, validation, unknown errors)
- One test file per module, colocated with source: scoring.test.ts, merge.test.ts, bidSignal.test.ts, errors.test.ts, storageManager.test.ts, contractStorage.test.ts

### Claude's Discretion
- Exact number of test cases per module
- describe/it nesting structure
- Whether to use test.each for parameterized boundary tests
- Order of test cases within files

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UNIT-01 | Risk scoring tested (computeRiskScore with various finding distributions and category weights) | scoring.ts has deterministic math: SEVERITY_WEIGHTS (Critical=25, High=15, Medium=8, Low=3, Info=0), CATEGORY_WEIGHTS (two tiers: 1.0x and 0.75x), logarithmic scaling formula `50 * log2(1 + rawScore/25)`. Also applySeverityGuard with 6 regex patterns for CA void-by-law statutes. |
| UNIT-02 | Merge logic tested (mergePassResults deduplication, composite key matching, all 16 pass schemas) | merge.ts has 15 specialized handlers in passHandlers map + generic overview handler = 16 pass types. Two-phase dedup: clauseRef+category composite key (specialized preferred over generic), then title-based fallback. Calls `getAllModules()` for staleness check (needs vi.mock). |
| UNIT-03 | Bid signal tested (computeBidSignal with all 5 weighted factors and edge cases) | bidSignal.ts has 5 factors: Bonding(0.25), Insurance(0.25), Scope(0.2), Payment(0.15), Retainage(0.15). Each starts at 100, subtracts severity penalties. Thresholds: >=70 bid, >=40 caution, <40 no-bid. Also generateFactorReasons returns worst finding title per factor. |
| UNIT-04 | Error classification tested (classifyError for all error types: network, API, validation, unknown) | errors.ts classifyError has 5 branches: network (TypeError "Failed to fetch" or "NetworkError"), timeout ("HeadersTimeoutError"/"timeout"/"ETIMEDOUT"), storage (DOMException QuotaExceeded), API (object with numeric status: 429/401/other), unknown fallback. Also formatApiError transforms ClassifiedError to ApiErrorResponse. |
| UNIT-05 | Storage manager tested (storageManager get/set/delete, quota exceeded handling, v1-v2 migration) | storageManager.ts exports: load (JSON parse), save (JSON stringify + quota detect), loadRaw (string), saveRaw (string + quota detect), remove (swallows errors). contractStorage.ts: loadContracts (version check, migration, mock seeding), saveContracts (quota handling), migrateContracts (backfills resolved, note, recommendation, clauseReference, negotiationPosition, actionPriority). |
| UNIT-06 | Zod schema validation tested (MergedFindingSchema, pass-specific schemas, edge cases for required vs optional fields) | MergedFindingSchema in src/schemas/finding.ts has LegalMetaSchema (11 discriminated union variants) and ScopeMetaSchema (4 variants). Tests validate through factory parse pattern + merge output assertions. Each pass-specific schema has unique required fields. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 3.x | Test runner | Already configured in vite.config.ts with jsdom environment |
| @testing-library/jest-dom | installed | DOM matchers | Already in setup.ts, provides toBeInTheDocument etc |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | installed | Schema validation in assertions | MergedFindingSchema.parse() in merge tests |

### No Additional Dependencies Needed
All test infrastructure is in place from Phase 33. No new packages required.

## Architecture Patterns

### Test File Locations
```
api/
├── scoring.ts
├── scoring.test.ts          # NEW -- @vitest-environment node
├── merge.ts
└── merge.test.ts            # NEW -- @vitest-environment node
src/
├── utils/
│   ├── bidSignal.ts
│   ├── bidSignal.test.ts    # NEW
│   ├── errors.ts
│   └── errors.test.ts       # REPLACE existing trivial test
├── storage/
│   ├── storageManager.ts
│   ├── storageManager.test.ts   # NEW
│   ├── contractStorage.ts
│   └── contractStorage.test.ts  # NEW
└── test/
    └── factories.ts          # EXTEND with pass-specific factories
```

### Pattern 1: Environment Directive for API Tests
**What:** Files in `api/` directory need the `node` environment, not `jsdom`
**When to use:** All test files under `api/`
**Example:**
```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';
```

### Pattern 2: Factory-Based Test Data
**What:** Use override-style factories from `src/test/factories.ts` for all test inputs
**When to use:** Every test case that needs Finding, Contract, or pass-specific data
**Example:**
```typescript
import { createFinding } from '../test/factories';

const finding = createFinding({ severity: 'Critical', category: 'Legal Issues' });
```

### Pattern 3: Pass-Specific Factories
**What:** New factory functions for each of the 15 specialized pass schemas
**When to use:** Merge tests that need typed pass findings with all required fields
**Example:**
```typescript
// In factories.ts
export function createIndemnificationFinding(
  overrides?: Partial<z.infer<typeof IndemnificationFindingSchema>>
): z.infer<typeof IndemnificationFindingSchema> {
  const defaults = {
    severity: 'Medium' as const,
    category: 'Legal Issues' as const,
    title: 'Test Indemnification Finding',
    description: 'Test description',
    recommendation: 'Test recommendation',
    clauseReference: 'Section 12.1',
    clauseText: 'Sample clause text',
    explanation: 'Sample explanation',
    crossReferences: [],
    riskType: 'limited' as const,
    hasInsuranceGap: false,
    negotiationPosition: 'Request amendment',
    actionPriority: 'monitor' as const,
  };
  return IndemnificationFindingSchema.parse({ ...defaults, ...overrides });
}
```

### Pattern 4: Mocking Knowledge Registry in Merge Tests
**What:** `mergePassResults` calls `getAllModules()` internally for staleness check
**When to use:** All merge.test.ts tests
**Example:**
```typescript
vi.mock('../src/knowledge/registry', () => ({
  getAllModules: () => [],
}));
```

### Pattern 5: localStorage Mocking in Storage Tests
**What:** jsdom provides localStorage automatically; use vi.spyOn for error simulation
**When to use:** Quota exceeded tests, error path tests
**Example:**
```typescript
beforeEach(() => {
  localStorage.clear();
});

it('handles quota exceeded', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota exceeded', 'QuotaExceededError');
  });
  const result = save('clearcontract:contracts', []);
  expect(result.ok).toBe(false);
  expect(result.quotaExceeded).toBe(true);
});
```

### Pattern 6: PromiseSettledResult Construction for Merge Tests
**What:** mergePassResults takes `PromiseSettledResult[]` -- need helpers to build these
**When to use:** All merge.test.ts tests
**Example:**
```typescript
function fulfilled(passName: string, result: PassResult | RiskOverviewResult) {
  return {
    status: 'fulfilled' as const,
    value: { passName, result },
  };
}

function rejected(reason: Error) {
  return {
    status: 'rejected' as const,
    reason,
  };
}
```

### Anti-Patterns to Avoid
- **Importing MOCK_CONTRACTS for test data:** Use factories instead -- mock contracts are for UI seeding, not test isolation
- **Testing with malformed inputs:** TypeScript guards boundaries at compile time; test valid-but-extreme inputs only
- **Cross-module mocking in pure logic tests:** Each module should be tested with its own factories; only mock external dependencies (knowledge registry, localStorage)
- **Snapshot tests:** Assertion-based tests preferred per project conventions (REQUIREMENTS.md out-of-scope section)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test data | Manual object literals | Factory functions (createFinding, createContract, pass-specific) | Factories validate via Zod, provide unique IDs, guarantee type safety |
| localStorage mock | Custom mock implementation | jsdom built-in localStorage + vi.spyOn for errors | jsdom already provides working localStorage; only need spies for edge cases |
| Pass result wrappers | Inline PromiseSettledResult objects | Helper functions (fulfilled/rejected) | Reduces boilerplate in merge tests, improves readability |

## Common Pitfalls

### Pitfall 1: Merge Module External Dependency
**What goes wrong:** `mergePassResults` calls `getAllModules()` from the knowledge registry for staleness checks; without mocking, it returns whatever modules are registered (empty in test context)
**Why it happens:** The staleness check is inline in mergePassResults, not a separate function
**How to avoid:** `vi.mock('../src/knowledge/registry', () => ({ getAllModules: () => [] }))` at module level in merge.test.ts
**Warning signs:** Unexpected "Knowledge Module Outdated" findings in test output

### Pitfall 2: Counter Reset Between Test Files
**What goes wrong:** Factory counters (_findingCounter, _contractCounter) accumulate across tests, making IDs unpredictable
**Why it happens:** Module-level counters persist within a test file's execution
**How to avoid:** Don't rely on specific ID values; use pattern matching or just check that IDs exist. Or if needed, the factories could export a reset function.
**Warning signs:** Tests passing individually but failing when run together

### Pitfall 3: Scoring Logarithmic Formula Precision
**What goes wrong:** `50 * Math.log2(1 + rawScore/25)` combined with `Math.round()` can produce unexpected boundary values
**Why it happens:** Floating-point math with log2
**How to avoid:** Pre-compute expected values manually for known inputs; test with exact expected outputs, not approximate ranges
**Warning signs:** Off-by-one scores at boundaries

### Pitfall 4: Vitest Environment Mismatch for API Tests
**What goes wrong:** `api/scoring.test.ts` and `api/merge.test.ts` default to jsdom (from vite.config.ts) but should run in node
**Why it happens:** The vite.config.ts sets `environment: 'jsdom'` globally
**How to avoid:** Add `// @vitest-environment node` comment at top of each api/*.test.ts file
**Warning signs:** Tests work but have unnecessary DOM overhead; worse, some Node APIs may behave differently

### Pitfall 5: contractStorage Imports MOCK_CONTRACTS
**What goes wrong:** `contractStorage.ts` imports `MOCK_CONTRACTS` from `../data/mockContracts` for first-visit seeding; tests exercising `loadContracts()` will trigger this import
**Why it happens:** The seeding path in loadContracts checks `clearcontract:contracts-seeded` flag
**How to avoid:** Either set the seeded flag in beforeEach, or accept mock contracts as part of the first-visit test case
**Warning signs:** Unexpected contracts appearing in "empty" storage tests

### Pitfall 6: DOMException Constructor in jsdom
**What goes wrong:** Creating `new DOMException('msg', 'QuotaExceededError')` works in jsdom but the mock approach matters
**Why it happens:** Need to throw from localStorage.setItem, not just test classifyError with a pre-built DOMException
**How to avoid:** Use `vi.spyOn(Storage.prototype, 'setItem')` to throw; for classifyError tests, construct DOMException directly
**Warning signs:** Tests pass locally but error types don't match

## Code Examples

### Scoring Test Structure
```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { computeRiskScore, applySeverityGuard } from './scoring';

describe('computeRiskScore', () => {
  it('returns 0 for empty findings', () => {
    const result = computeRiskScore([]);
    expect(result.score).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('applies severity weights correctly', () => {
    // Single Critical finding in Legal Issues (weight 1.0): rawScore = 25
    // score = 50 * log2(1 + 25/25) = 50 * log2(2) = 50 * 1 = 50
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Legal Issues', title: 'Test' },
    ]);
    expect(result.score).toBe(50);
  });

  it('applies category weights (0.75x tier)', () => {
    // Single Critical in Scope of Work (weight 0.75): rawScore = 25 * 0.75 = 18.75
    // score = 50 * log2(1 + 18.75/25) = 50 * log2(1.75) = 50 * 0.807... = ~40
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Scope of Work', title: 'Test' },
    ]);
    expect(result.score).toBe(40); // Verify: Math.round(50 * Math.log2(1.75)) = 40
  });

  it('skips "Analysis Pass Failed:" findings', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Risk Assessment', title: 'Analysis Pass Failed: test' },
    ]);
    expect(result.score).toBe(0);
  });

  it('skips Compound Risk category (weight 0)', () => {
    const result = computeRiskScore([
      { severity: 'Critical', category: 'Compound Risk', title: 'Test' },
    ]);
    expect(result.score).toBe(0);
  });
});

describe('applySeverityGuard', () => {
  it('upgrades to Critical when clauseText mentions CC 2782', () => {
    const finding = { severity: 'Medium', clauseText: 'per CC 2782 provisions' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });

  it('does not downgrade existing Critical', () => {
    const finding = { severity: 'Critical', clauseText: 'no statute reference' };
    applySeverityGuard(finding);
    expect(finding.severity).toBe('Critical');
  });
});
```

### Merge Test with Pass-Specific Factory
```typescript
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { mergePassResults } from './merge';
import type { AnalysisPassInfo } from './merge';

vi.mock('../src/knowledge/registry', () => ({
  getAllModules: () => [],
}));

function fulfilled(passName: string, findings: unknown[], dates: unknown[] = []) {
  return {
    status: 'fulfilled' as const,
    value: { passName, result: { findings, dates } },
  };
}

const pass = (name: string, isOverview = false): AnalysisPassInfo => ({
  name,
  isOverview,
});
```

### Bid Signal Test with Factor Isolation
```typescript
import { describe, it, expect } from 'vitest';
import { computeBidSignal } from './bidSignal';
import { createFinding } from '../test/factories';

describe('computeBidSignal', () => {
  it('returns 100 (bid) with no findings', () => {
    const result = computeBidSignal([]);
    expect(result.score).toBe(100);
    expect(result.level).toBe('bid');
    expect(result.label).toBe('Bid Recommended');
  });

  it('isolates Insurance factor', () => {
    const findings = [
      createFinding({ severity: 'Critical', category: 'Insurance Requirements' }),
    ];
    const result = computeBidSignal(findings);
    // Insurance factor: 100 - 25 = 75, weight 0.25
    // All others: 100, weights sum to 0.75
    // Weighted: 75*0.25 + 100*0.75 = 18.75 + 75 = 93.75 => 94
    expect(result.score).toBe(94);
    expect(result.level).toBe('bid');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic analysis | 16-pass pipeline with merge | v1.4 | Merge tests need pass-level factories |
| Simple string Finding type | MergedFindingSchema with Zod validation | v1.4 | All test findings should validate through schema |
| No v1-v2 migration | contractStorage migrateContracts | v1.2 | Need hand-crafted v1 fixtures for migration tests |

## Open Questions

1. **Knowledge registry module staleness in merge tests**
   - What we know: `mergePassResults` appends staleness findings for expired modules via `getAllModules()`
   - What's unclear: Whether to test staleness logic (it's tightly coupled to merge) or mock it away
   - Recommendation: Mock `getAllModules()` to return empty array by default; add ONE test with a mock expired module to verify staleness finding is appended. This covers the behavior without deep-testing the registry.

2. **Exact count of 16 pass schemas**
   - What we know: `passHandlers` map has 15 entries (11 legal + 4 scope). The 16th is the generic/overview handler path.
   - What's unclear: Whether "all 16 pass schemas" means 15 specialized + 1 overview, or 16 specialized
   - Recommendation: Test all 15 specialized handlers individually (each has unique fields) PLUS the overview/generic path = 16 total test groups.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (inline in vite.config.ts) |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UNIT-01 | Risk score computation + severity guard | unit | `npx vitest run api/scoring.test.ts -x` | No -- Wave 0 |
| UNIT-02 | Merge dedup + 16 pass schemas | unit | `npx vitest run api/merge.test.ts -x` | No -- Wave 0 |
| UNIT-03 | Bid signal 5 factors + thresholds | unit | `npx vitest run src/utils/bidSignal.test.ts -x` | No -- Wave 0 |
| UNIT-04 | Error classification all types | unit | `npx vitest run src/utils/errors.test.ts -x` | Exists (trivial, replace) |
| UNIT-05 | Storage CRUD + quota + migration | unit | `npx vitest run src/storage/storageManager.test.ts src/storage/contractStorage.test.ts -x` | No -- Wave 0 |
| UNIT-06 | Zod schema validation | unit | Covered by merge.test.ts assertions (MergedFindingSchema.parse) + factory validation | No dedicated file -- embedded in UNIT-02 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/scoring.test.ts` -- covers UNIT-01
- [ ] `api/merge.test.ts` -- covers UNIT-02, UNIT-06
- [ ] `src/utils/bidSignal.test.ts` -- covers UNIT-03
- [ ] `src/utils/errors.test.ts` -- replace trivial with comprehensive (covers UNIT-04)
- [ ] `src/storage/storageManager.test.ts` -- covers UNIT-05 (generic CRUD)
- [ ] `src/storage/contractStorage.test.ts` -- covers UNIT-05 (domain + migration)
- [ ] `src/test/factories.ts` -- extend with 15 pass-specific factory functions

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of all 6 target modules
- `api/scoring.ts` (107 LOC) -- SEVERITY_WEIGHTS, CATEGORY_WEIGHTS, computeRiskScore, applySeverityGuard
- `api/merge.ts` (554 LOC) -- passHandlers map (15 entries), mergePassResults with two-phase dedup
- `src/utils/bidSignal.ts` (137 LOC) -- FACTOR_DEFS (5 factors), computeBidSignal, generateFactorReasons
- `src/utils/errors.ts` (112 LOC) -- classifyError (5 branches), formatApiError
- `src/storage/storageManager.ts` (127 LOC) -- load, save, loadRaw, saveRaw, remove
- `src/storage/contractStorage.ts` (104 LOC) -- loadContracts, saveContracts, migrateContracts
- `src/schemas/legalAnalysis.ts` -- 11 specialized legal finding schemas
- `src/schemas/scopeComplianceAnalysis.ts` -- 4 scope/compliance finding schemas
- `src/schemas/finding.ts` -- MergedFindingSchema, LegalMetaSchema, ScopeMetaSchema
- `src/schemas/analysis.ts` -- PassResultSchema, RiskOverviewResultSchema, MergedAnalysisResultSchema
- `vite.config.ts` -- Vitest configuration (globals, jsdom, include patterns, setup files)
- `src/test/factories.ts` -- existing createFinding, createContract, createContractDate
- `src/test/setup.ts` -- jest-dom + framer-motion mock
- Phase 33 completed infrastructure (INFRA-01 through INFRA-04)

### Secondary (MEDIUM confidence)
- Phase 34 CONTEXT.md -- locked decisions on test depth and strategy

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and configured from Phase 33
- Architecture: HIGH -- direct inspection of all 6 source modules, clear input/output contracts
- Pitfalls: HIGH -- identified from actual code analysis (knowledge registry coupling, counter persistence, environment directives)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- testing pure logic modules with established infrastructure)
