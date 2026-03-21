# Phase 49: Coverage Push - Research

**Researched:** 2026-03-20
**Domain:** Vitest coverage, React Testing Library, knowledge module testing
**Confidence:** HIGH

## Summary

The project currently sits at 45.79% statement coverage (3167/6916) and 50.75% function coverage (101/199). The CI threshold is 60% for both; the user wants a 65% target for buffer. That means covering approximately 1329 additional statements and 29 additional functions.

The largest uncovered areas are: knowledge modules (~977 LOC at 0%), untested components (~2489 LOC mostly at 0-9%), utility functions (~507 LOC at 5-13%), useContractStore hook (182 LOC at 0%), and pages (~1232 LOC at 1-30%). The existing test infrastructure (Vitest + jsdom + RTL + custom render wrapper + Framer Motion mock + Zod-validated factories) is solid and requires no changes.

**Primary recommendation:** Follow the priority order from CONTEXT.md decisions -- knowledge modules first (easiest coverage per effort), then components, then utilities, then hooks, then shallow page renders. Knowledge modules alone could add ~600+ statements of coverage since they are pure data exports plus registry logic.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Broadest coverage first -- prioritize easy wins that cover the most lines with least effort
- Order: knowledge modules (600 LOC at 0%) -> components (800 LOC at 0-9%) -> utilities -> hooks -> pages
- Pages get shallow render-only tests (mount with mocked providers, no interaction testing)
- Components get render + snapshot tests (verify render with mock props, check key elements exist)
- Utilities: core happy path + one error case per function. Mock jsPDF/Blob for PDF/CSV tests
- useContractStore: test key mutations only (addContract, updateContract, deleteContract, navigateTo). Skip exhaustive setter coverage
- Schema validation tests for all 16 knowledge modules: import each, validate required fields, token count under limit, correct domain/tags
- Registry.ts gets its own test: registerModule, getModulesForPass, token budget enforcement
- Covers registry + all barrel exports (index.ts files)
- Aim for 65% statements and 65% functions (5% buffer over CI threshold)
- CI threshold in vite.config.ts stays at 60% -- don't bump it
- No thorough edge case testing -- this is coverage push, not comprehensive validation

### Claude's Discretion
- Exact test file organization and naming
- Which specific component props to use in render tests
- Order of test files within the broad targeting strategy
- Whether to group small component tests or use one file per component

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COV-01 | Statement coverage >= 60% (CI threshold passes) | Coverage math shows need ~1329 more statements; knowledge modules + components + utils provide ~3500+ coverable LOC |
| COV-02 | Function coverage >= 60% (maintained from v1.6) | Need 29 more functions; registry (5 fns), tokenBudget (2 fns), index.ts (2 fns), utils (~8 fns), component renders (~20+ fns) easily cover this |
| COV-03 | New tests target uncovered API and component code paths | Research identifies all 0% coverage areas: knowledge/*, useContractStore, exportContractCsv/Pdf, settingsValidation, palette, 19 untested components, 5 untested pages |

</phase_requirements>

## Coverage Math

### Current Baseline (269 tests passing)
| Metric | Current | Target (65%) | Deficit |
|--------|---------|-------------|---------|
| Statements | 45.79% (3167/6916) | 4496 needed | +1329 statements |
| Functions | 50.75% (101/199) | 130 needed | +29 functions |
| Branches | 79.72% (405/508) | N/A (no threshold) | -- |

### Estimated Coverage Gains by Target Area

| Area | Approx Uncovered Stmts | Functions to Cover | Effort |
|------|----------------------|-------------------|--------|
| Knowledge modules (16 data files) | ~600 | 0 (data exports) | LOW -- just import and assert fields |
| Knowledge registry.ts | ~66 | 5 | LOW -- pure functions |
| Knowledge tokenBudget.ts | ~24 | 2 | LOW -- pure functions |
| Knowledge index.ts (composeSystemPrompt) | ~59 | 2 | LOW -- pure functions |
| Knowledge barrel exports (3 index.ts) | ~30 | 0 (side-effect imports) | LOW -- import triggers registerModule |
| Untested components (~19 files) | ~800+ | 20+ | MEDIUM -- need render + props |
| LegalMetaBadge + ScopeMetaBadge (~15 files) | ~700+ | 15+ | MEDIUM -- repetitive pattern |
| exportContractCsv.ts | ~100 | 4 | LOW -- pure functions |
| exportContractPdf.ts | ~260 | 2+ | MEDIUM -- needs jsPDF mock |
| settingsValidation.ts | ~60 | 4 | LOW -- pure functions |
| palette.ts | ~16 | 2 | LOW -- pure functions |
| useContractStore.ts | ~182 | 10+ | MEDIUM -- needs Supabase mock |
| Pages (6 untested) | ~800+ | 10+ | MEDIUM -- shallow render with mocked hooks |
| ToastProvider.tsx | ~30 | 2+ | LOW-MEDIUM |

**Conservative estimate:** Knowledge modules alone (~780 stmts) + utilities (~430 stmts) + a handful of components gets past the 65% target with room to spare.

## Architecture Patterns

### Knowledge Module Test Pattern
All 16 knowledge modules export a single `KnowledgeModule` object. They share an identical structure. One parameterized test can cover all of them:

```typescript
import { caLienLaw } from '../knowledge/regulatory/ca-lien-law';
// ... all 16 imports

const ALL_MODULES = [
  { mod: caLienLaw, expectedDomain: 'regulatory' },
  // ... 15 more
];

describe.each(ALL_MODULES)('Knowledge module: $mod.id', ({ mod, expectedDomain }) => {
  it('has required fields', () => {
    expect(mod.id).toBeTruthy();
    expect(mod.title).toBeTruthy();
    expect(mod.domain).toBe(expectedDomain);
    expect(mod.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.content.length).toBeGreaterThan(0);
  });

  it('token estimate is under cap', () => {
    expect(mod.tokenEstimate).toBeLessThanOrEqual(10000);
    expect(mod.tokenEstimate).toBe(Math.ceil(mod.content.length / 4));
  });
});
```

### Registry Test Pattern
The registry uses a module-level `Map` store. Tests need to be careful about test isolation since `registerModule` mutates shared state. The barrel index files (regulatory/index.ts, standards/index.ts, trade/index.ts) call `registerModule` on import as a side effect.

```typescript
// Option A: Import barrel exports to trigger registration, then test retrieval
import '../knowledge/regulatory/index';
import '../knowledge/standards/index';
import '../knowledge/trade/index';
import { getModulesForPass, getAllModules, PASS_KNOWLEDGE_MAP } from '../knowledge/registry';

describe('registry', () => {
  it('all mapped modules are registered', () => {
    // validateAllModulesRegistered throws if any are missing
    expect(() => validateAllModulesRegistered()).not.toThrow();
  });

  it('getModulesForPass returns correct modules', () => {
    const mods = getModulesForPass('legal-indemnification');
    expect(mods).toHaveLength(1);
    expect(mods[0].id).toBe('ca-lien-law');
  });
});
```

### Component Shallow Render Pattern
Follow the existing FindingCard.test.tsx pattern but simpler (no interaction):

```typescript
import { render, screen } from '../test/render';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total" value={42} icon={FileText} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
```

### MetaBadge Component Pattern
The 11 LegalMetaBadge and 4 ScopeMetaBadge components follow identical patterns. Each receives a typed finding prop and renders conditional UI. Use the pass-specific factories from `src/test/factories.ts`:

```typescript
import { createIndemnificationFinding } from '../test/factories';
import { IndemnificationBadge } from './LegalMetaBadge/IndemnificationBadge';

describe('IndemnificationBadge', () => {
  it('renders with factory data', () => {
    const finding = createIndemnificationFinding();
    render(<IndemnificationBadge finding={finding} />);
    // Assert key rendered text
  });
});
```

### Utility Pure Function Pattern
```typescript
import { escapeCsv, sanitizeFilename, exportContractCsv } from './exportContractCsv';
import { createContract, createFinding } from '../test/factories';

describe('exportContractCsv', () => {
  it('produces valid CSV for contract with findings', () => {
    const contract = createContract({ findings: [createFinding()] });
    const csv = exportContractCsv(contract);
    expect(csv).toContain('Contract Name');
    expect(csv).toContain(contract.name);
  });
});
```

### useContractStore Hook Pattern
This hook depends on Supabase and useToast. Use the established mocking patterns:

```typescript
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createTableMock([])),
  },
}));
vi.mock('./useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
```

### Page Shallow Render Pattern
Pages need mocked hooks (useContractStore, useAuth, useRouter). Follow LoginPage.test.tsx pattern:

```typescript
vi.mock('../hooks/useContractStore', () => ({
  useContractStore: () => ({
    contracts: [],
    isLoading: false,
    error: null,
    // ... minimal return shape
  }),
}));
```

### Recommended Project Structure for New Tests
```
src/
  knowledge/
    __tests__/
      modules.test.ts          # All 16 knowledge modules (parameterized)
      registry.test.ts         # Registry functions
      tokenBudget.test.ts      # Token budget functions
      composeSystemPrompt.test.ts  # index.ts composeSystemPrompt
  components/
    [existing tests stay]
    StatCard.test.tsx          # Per-component or grouped
    ActionPriorityBadge.test.tsx
    LegalMetaBadge/
      __tests__/
        badges.test.tsx        # All 11 badges parameterized
    ScopeMetaBadge/
      __tests__/
        badges.test.tsx        # All 4 badges parameterized
  utils/
    exportContractCsv.test.ts
    exportContractPdf.test.ts
    settingsValidation.test.ts
    palette.test.ts
  hooks/
    __tests__/
      useContractStore.test.ts
  pages/
    Dashboard.test.tsx
    AllContracts.test.tsx
    ContractUpload.test.tsx
    ContractReview.test.tsx
    Settings.test.tsx
    ContractComparison.test.tsx
  contexts/
    ToastProvider.test.tsx
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test data | Manual object literals | `src/test/factories.ts` (createFinding, createContract, 15 pass-specific factories) | Zod-validated, sensible defaults, consistent |
| Component rendering in tests | Custom render setup | `src/test/render.tsx` (wraps AllProviders) | Already includes ToastProvider, handles framer-motion mock |
| Supabase query mocking | Manual mock chains | `createTableMock` pattern from Phase 46 | Handles `.select().eq().single()` chains correctly |
| Auth mocking | Custom auth state | `vi.mock` useAuth pattern from AuthContext.test.tsx | Established pattern, includes user/session shape |

## Common Pitfalls

### Pitfall 1: Knowledge Registry Shared State
**What goes wrong:** Knowledge module registry uses a module-level `Map`. If tests run in different orders or register conflicting modules, state leaks between tests.
**Why it happens:** `registerModule` mutates global state; barrel imports (`regulatory/index.ts`) are side effects.
**How to avoid:** Either (a) import all barrel exports once at test file top and test against the fully-loaded registry, or (b) if testing registration in isolation, clear the store between tests. Since the `moduleStore` is private, option (a) is simpler -- just verify the fully-registered state.
**Warning signs:** Tests pass individually but fail when run together, or vice versa.

### Pitfall 2: Framer Motion Props Leaking to DOM
**What goes wrong:** JSX warnings about unknown props (animate, initial, exit, etc.) on DOM elements.
**Why it happens:** Component tests render motion.div but the mock doesn't filter all framer-motion props.
**How to avoid:** The existing `src/test/mocks/framer-motion.ts` proxy mock already handles this. Just use the custom `render` from `src/test/render.tsx` which loads setup.ts.
**Warning signs:** Console warnings about invalid DOM attributes in test output.

### Pitfall 3: useContractStore Supabase Mock Timing
**What goes wrong:** Hook tests for useContractStore hang or return stale state because the Supabase fetch in useEffect never resolves.
**Why it happens:** The hook calls `supabase.from('contracts').select('*')` etc. in a useEffect. Mock must return resolved promises.
**How to avoid:** Use `createTableMock` with the data arrays and ensure mock returns `{ data: [...], error: null }`. Use `waitFor` for async state updates.
**Warning signs:** Tests timeout or assertions fail because isLoading stays true.

### Pitfall 4: jsPDF Mock for exportContractPdf
**What goes wrong:** Tests fail because jsPDF constructor or methods aren't available in jsdom.
**Why it happens:** jsPDF uses canvas/DOM APIs not available in jsdom.
**How to avoid:** Mock the entire jsPDF module: `vi.mock('jspdf', () => ({ default: vi.fn(() => ({ text: vi.fn(), save: vi.fn(), ... })) }))`. Similarly mock `jspdf-autotable`.
**Warning signs:** "Cannot read property of undefined" errors from jsPDF internals.

### Pitfall 5: Page Components Depending on Multiple Hooks
**What goes wrong:** Page render tests fail because unmocked hooks throw or return undefined.
**Why it happens:** Pages like Dashboard and ContractReview depend on useContractStore, useAuth, useRouter, and possibly useContractFiltering.
**How to avoid:** Mock ALL consumed hooks at module level before import. Check each page's imports to identify required mocks.
**Warning signs:** "Cannot destructure property X of undefined" errors during render.

### Pitfall 6: Coverage Counting for Data-Only Files
**What goes wrong:** Knowledge module data files show 0% coverage even though they're "just data."
**Why it happens:** V8 coverage counts the module-level statements (const assignment, object literal, etc.) as uncovered until the file is actually imported/executed in a test.
**How to avoid:** Simply importing the module in a test file triggers execution and covers those statements. The test just needs to exist and import the module.
**Warning signs:** Data files stuck at 0% despite being "trivial."

## Code Examples

### Knowledge Module Parameterized Test (verified pattern)
```typescript
// src/knowledge/__tests__/modules.test.ts
import { describe, it, expect } from 'vitest';
import { TOKEN_CAP_PER_MODULE } from '../tokenBudget';

// Import all modules directly
import { caLienLaw } from '../regulatory/ca-lien-law';
import { caPrevailingWage } from '../regulatory/ca-prevailing-wage';
import { caTitle24 } from '../regulatory/ca-title24';
import { caCalosha } from '../regulatory/ca-calosha';
import { caInsuranceLaw } from '../regulatory/ca-insurance-law';
import { caPublicWorksPayment } from '../regulatory/ca-public-works-payment';
import { caDisputeResolution } from '../regulatory/ca-dispute-resolution';
import { caLiquidatedDamages } from '../regulatory/ca-liquidated-damages';
import { div08Scope } from '../trade/div08-scope';
import { glazingSubProtections } from '../trade/glazing-sub-protections';
import { standardsValidation } from '../standards/standards-validation';
import { contractForms } from '../standards/contract-forms';

const ALL_MODULES = [
  { mod: caLienLaw, domain: 'regulatory' },
  { mod: caPrevailingWage, domain: 'regulatory' },
  { mod: caTitle24, domain: 'regulatory' },
  { mod: caCalosha, domain: 'regulatory' },
  { mod: caInsuranceLaw, domain: 'regulatory' },
  { mod: caPublicWorksPayment, domain: 'regulatory' },
  { mod: caDisputeResolution, domain: 'regulatory' },
  { mod: caLiquidatedDamages, domain: 'regulatory' },
  { mod: div08Scope, domain: 'trade' },
  { mod: glazingSubProtections, domain: 'trade' },
  { mod: standardsValidation, domain: 'standards' },
  { mod: contractForms, domain: 'standards' },
] as const;

describe.each(ALL_MODULES)('Knowledge: $mod.id', ({ mod, domain }) => {
  it('has all required fields', () => {
    expect(mod.id).toBeTruthy();
    expect(mod.title).toBeTruthy();
    expect(mod.domain).toBe(domain);
    expect(mod.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.reviewByDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.content).toBeTruthy();
  });

  it('token estimate matches content and is under cap', () => {
    expect(mod.tokenEstimate).toBe(Math.ceil(mod.content.length / 4));
    expect(mod.tokenEstimate).toBeLessThanOrEqual(TOKEN_CAP_PER_MODULE);
  });
});
```

### Registry Test
```typescript
// src/knowledge/__tests__/registry.test.ts
import { describe, it, expect } from 'vitest';
// Trigger all registrations via barrel imports
import '../regulatory/index';
import '../standards/index';
import '../trade/index';
import {
  getModulesForPass,
  getAllModules,
  validateAllModulesRegistered,
  PASS_KNOWLEDGE_MAP,
} from '../registry';

describe('registry', () => {
  it('all mapped modules are registered', () => {
    expect(() => validateAllModulesRegistered()).not.toThrow();
  });

  it('getAllModules returns all 12 modules', () => {
    expect(getAllModules()).toHaveLength(12);
  });

  it('getModulesForPass returns mapped modules', () => {
    const mods = getModulesForPass('legal-indemnification');
    expect(mods.map(m => m.id)).toEqual(['ca-lien-law']);
  });

  it('getModulesForPass returns empty for unmapped pass', () => {
    expect(getModulesForPass('dates-deadlines')).toEqual([]);
  });

  it('getModulesForPass throws for unregistered module', () => {
    expect(() => getModulesForPass('nonexistent-pass')).not.toThrow(); // returns []
  });
});
```

### Pure Utility Test (settingsValidation)
```typescript
// src/utils/settingsValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validateField } from './settingsValidation';

describe('validateField', () => {
  it('validates dollar amounts', () => {
    expect(validateField('$1,000,000', 'dollar')).toEqual({ valid: true, formatted: '$1,000,000' });
  });

  it('rejects invalid dollar', () => {
    const result = validateField('abc', 'dollar');
    expect(result.valid).toBe(false);
  });

  it('validates date', () => {
    expect(validateField('2027-01-01', 'date').valid).toBe(true);
  });

  it('validates employee count range', () => {
    expect(validateField('15-25', 'employeeCount').valid).toBe(true);
  });

  it('returns valid for empty string', () => {
    expect(validateField('', 'dollar')).toEqual({ valid: true });
  });
});
```

## Existing Test Infrastructure (No Changes Needed)

| Component | Location | Status |
|-----------|----------|--------|
| Vitest 3.2.4 | `vite.config.ts` | Configured with jsdom, v8 coverage |
| RTL 16.3.2 | `package.json` | Available with user-event 14.6.1 |
| Custom render | `src/test/render.tsx` | Wraps ToastProvider |
| Framer Motion mock | `src/test/mocks/framer-motion.ts` | Proxy-based, handles all motion.* |
| Test factories | `src/test/factories.ts` | 17 factories (1 generic finding, 1 contract, 1 date, 15 pass-specific) |
| Coverage thresholds | `vite.config.ts` | statements: 60, functions: 60 |
| Coverage provider | v8 | via @vitest/coverage-v8 3.2.4 |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + @vitest/coverage-v8 3.2.4 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COV-01 | Statements >= 60% | coverage | `npx vitest run --coverage` (check exit code) | N/A -- coverage threshold built into config |
| COV-02 | Functions >= 60% | coverage | `npx vitest run --coverage` (check exit code) | N/A -- coverage threshold built into config |
| COV-03 | New tests target uncovered code | unit | `npx vitest run` (new test files must exist and pass) | Wave 0 -- all new test files |

### Sampling Rate
- **Per task commit:** `npx vitest run` (fast, no coverage)
- **Per wave merge:** `npx vitest run --coverage` (verify threshold progress)
- **Phase gate:** `npx vitest run --coverage` must exit 0 (all thresholds pass)

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. No new framework, config, or fixture files needed. Only new test files targeting uncovered source code.

## Sources

### Primary (HIGH confidence)
- Direct coverage run output: `npx vitest run --coverage` on current codebase (3167/6916 stmts, 101/199 fns)
- Source file inspection: all files in src/knowledge/, src/components/, src/utils/, src/hooks/, src/pages/, api/
- Existing test patterns: FindingCard.test.tsx, FilterToolbar.test.tsx, LoginPage.test.tsx, AuthContext.test.tsx
- vite.config.ts: coverage thresholds (60/60), include/exclude patterns, v8 provider

### Secondary (MEDIUM confidence)
- Coverage gain estimates based on LOC counts and statement density ratios from existing covered files

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no changes to test infrastructure, all tools verified in place
- Architecture: HIGH - patterns directly observed from 22 existing test files
- Pitfalls: HIGH - derived from actual codebase analysis (Supabase mocks, registry shared state, jsPDF)
- Coverage math: MEDIUM - statement counts are exact but gain estimates assume ~80% statement density

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable -- no dependency changes expected)
