# Architecture Patterns: Test Framework Integration

**Domain:** Testing infrastructure for Vite+React+TypeScript contract review app
**Researched:** 2026-03-15
**Confidence:** HIGH (direct codebase inspection + official Vitest/RTL docs)

## Recommended Architecture

The testing architecture integrates with the existing codebase without modifying any production code. The key insight: ClearContract has three distinct testable layers, each requiring different tooling and mock strategies.

```
Layer 1: Pure Logic (no DOM, no React)
  api/scoring.ts, api/merge.ts, src/utils/*, src/storage/*, src/schemas/*

Layer 2: React Components + Hooks (jsdom, RTL)
  src/hooks/*, src/components/*, src/pages/*

Layer 3: Vercel API Handlers (Node.js, mocked Anthropic SDK)
  api/analyze.ts, api/passes.ts, api/pdf.ts
```

The existing architecture is already highly testable:
- Pure functions (`computeRiskScore`, `classifyError`, `computeBidSignal`) take typed input, return typed output
- Hooks (`useContractStore`) use `useState` with no global state -- `renderHook` works directly
- Zod schemas (`MergedFindingSchema`, `AnalysisResultSchema`) are importable validators
- Storage layer (`storageManager.ts`) wraps localStorage with typed API -- spyable in jsdom
- Server code imports shared schemas from `src/schemas/` -- testable in same TypeScript environment

### Directory Structure

```
clearcontract/
  src/
    __tests__/                # Client-side test files
      hooks/                  # Hook tests
        useContractStore.test.ts
        useContractFiltering.test.ts
        useFieldValidation.test.ts
        useInlineEdit.test.ts
        useRouter.test.ts
      components/             # Component tests
        FindingCard.test.tsx
        UploadZone.test.tsx
        FilterToolbar.test.tsx
        SeverityBadge.test.tsx
        RiskScoreDisplay.test.tsx
        BidSignalWidget.test.tsx
        ConfirmDialog.test.tsx
      pages/                  # Page-level integration tests
        Dashboard.test.tsx
        ContractReview.test.tsx
        Settings.test.tsx
      utils/                  # Pure utility tests
        errors.test.ts
        bidSignal.test.ts
        exportContractCsv.test.ts
        palette.test.ts
      schemas/                # Zod schema validation tests
        finding.test.ts
        analysisResult.test.ts
      storage/                # Storage utility tests
        storageManager.test.ts
        contractStorage.test.ts
    test-utils/               # Shared test infrastructure
      render.tsx              # Custom render with ToastProvider wrapper
      factories.ts            # Type-safe fixture factories for Contract, Finding
      storage-mock.ts         # localStorage seed/clear helpers
  api/
    __tests__/                # Server-side test files
      scoring.test.ts
      merge.test.ts
      analyze.test.ts
  test/
    fixtures/                 # Captured API response fixtures
      analysis-response-simple.json
      analysis-response-complex.json
      pass-result-legal.json
      pass-result-scope.json
      synthesis-result.json
    setup.ts                  # Global Vitest setup (cleanup, matchers)
  vitest.config.ts            # Vitest configuration (separate from vite.config.ts)
  tsconfig.test.json          # Test-specific TypeScript config
```

**Why `__tests__/` directories mirroring `src/` structure:** Co-location by layer. Tests for `src/hooks/useContractStore.ts` live at `src/__tests__/hooks/useContractStore.test.ts`. This keeps the source tree clean. The alternative (`.test.ts` files next to source) clutters the existing tree and shows up in file glob patterns that currently target only production code.

**Why `test/fixtures/` at project root:** Fixtures are shared between client and server tests. API response fixtures captured from real analysis runs are used by both `api/__tests__/merge.test.ts` (verifying merge logic) and `src/__tests__/pages/ContractReview.test.tsx` (verifying UI rendering with realistic data).

**Why separate `vitest.config.ts`:** Keeps test concerns (jsdom environment, setup files, coverage targets) out of the production `vite.config.ts`. Uses `mergeConfig` to inherit Vite plugins without duplicating them.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `vitest.config.ts` | Test runner config, environment, setup files | vite.config.ts (extends plugins) |
| `test/setup.ts` | Global matchers, cleanup, localStorage reset | All test files (via setupFiles) |
| `src/test-utils/render.tsx` | Custom RTL render wrapping ToastProvider | Component/page tests |
| `src/test-utils/factories.ts` | Type-safe test data builders | All test files needing Contract/Finding data |
| `src/test-utils/storage-mock.ts` | localStorage seed/clear helpers | Hook and storage tests |
| `test/fixtures/*.json` | Captured real API responses | API, merge, and integration tests |

### Data Flow

**Unit tests (pure logic):** Direct import -> call function -> assert return value. No mocking needed for `scoring.ts`, `bidSignal.ts`, `errors.ts`, `palette.ts`. These functions accept typed arguments and return typed results.

**Schema tests:** Import Zod schema -> call `safeParse()` with valid/invalid data -> assert success/failure and error messages. No DOM or React involvement.

**Hook tests:** `renderHook()` from RTL -> interact via `act()` -> assert returned state values. localStorage seeded before render, verified after mutations.

**Component tests:** Custom `render()` wrapping ToastProvider -> `screen.getByRole()` queries -> `userEvent` interactions -> assert DOM changes. Real hooks with controlled localStorage state.

**API handler tests:** Mock `VercelRequest`/`VercelResponse` objects -> import handler directly -> assert response status and body. Anthropic SDK mocked via `vi.mock()`.

**Fixture-based tests:** Load JSON fixture -> pass to merge functions or render in components -> assert output matches expectations. Zod validation catches stale fixtures automatically.

## Patterns to Follow

### Pattern 1: Separate Vitest Config via mergeConfig

**What:** A dedicated `vitest.config.ts` that extends Vite config using `mergeConfig`.
**When:** Always -- avoids polluting production build config with test concerns.

```typescript
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      include: [
        'src/**/*.test.{ts,tsx}',
        'api/**/*.test.ts',
      ],
      coverage: {
        provider: 'v8',
        include: [
          'src/utils/**',
          'src/hooks/**',
          'src/storage/**',
          'src/schemas/**',
          'api/scoring.ts',
          'api/merge.ts',
        ],
      },
    },
  })
);
```

**Why mergeConfig instead of inline:** The existing `vite.config.ts` configures the React plugin and dev server proxy. `mergeConfig` inherits the React plugin (needed for JSX transform in tests) without duplicating it.

### Pattern 2: Global Setup File

**What:** A `test/setup.ts` that extends Vitest matchers with jest-dom and cleans up after each test.
**When:** Always -- loaded via `setupFiles` in vitest config.

```typescript
// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

**Key detail:** `@testing-library/jest-dom/vitest` is the correct import for Vitest (not `@testing-library/jest-dom` which targets Jest). This provides `toBeInTheDocument()`, `toHaveTextContent()`, etc.

The `localStorage.clear()` in `afterEach` ensures tests start with clean storage state. jsdom provides a working `localStorage` implementation -- no external mock package needed.

### Pattern 3: TypeScript Config for Tests

**What:** A `tsconfig.test.json` extending the base config with test-specific type references.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "noUnusedLocals": false
  },
  "include": ["src", "api", "test"]
}
```

**Why needed:** The base `tsconfig.json` has `"include": ["src"]` only -- tests in `api/__tests__/` and `test/` would be excluded. It also has `"noUnusedLocals": true` which is unnecessarily strict for test files where you may import helpers speculatively. The `"types"` array provides global type declarations for `describe`, `it`, `expect`, `vi` (from Vitest globals) and `.toBeInTheDocument()` (from jest-dom).

### Pattern 4: Custom Render with Providers

The app uses `ToastProvider` context. Every component test needs this wrapper.

**What:** A custom `render` function that wraps components in required providers, re-exported alongside all RTL utilities.

```typescript
// src/test-utils/render.tsx
import { render, type RenderOptions } from '@testing-library/react';
import { ToastProvider } from '../contexts/ToastProvider';
import type { ReactElement } from 'react';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

Test files import from `../test-utils/render` instead of `@testing-library/react`. This is the standard RTL pattern for apps with providers.

### Pattern 5: Type-Safe Fixture Factories

The codebase has complex nested types: `Finding` has discriminated unions for `LegalMeta` (11 variants) and `ScopeMeta` (4 variants), plus required fields like `actionPriority`, `negotiationPosition`, `resolved`, `note`. Factories prevent test data rot and ensure type safety.

**What:** Builder functions that produce valid typed objects with sensible defaults, overridable per-test.

```typescript
// src/test-utils/factories.ts
import type { Finding, Contract, ContractDate, Severity, Category } from '../types/contract';

let findingCounter = 0;

export function buildFinding(overrides: Partial<Finding> = {}): Finding {
  findingCounter++;
  return {
    id: `test-f-${findingCounter}`,
    severity: 'Medium' as Severity,
    category: 'Legal Issues' as Category,
    title: `Test Finding ${findingCounter}`,
    description: 'Test description',
    recommendation: 'Test recommendation',
    clauseReference: 'Section 1.1',
    negotiationPosition: '',
    actionPriority: 'monitor',
    resolved: false,
    note: '',
    ...overrides,
  };
}

export function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: `test-c-${Date.now()}`,
    name: 'Test Contract',
    client: 'Test Client',
    type: 'Subcontract',
    uploadDate: '2026-01-15',
    status: 'Reviewed',
    riskScore: 50,
    findings: [buildFinding()],
    dates: [],
    ...overrides,
  };
}

// Specialized builders for discriminated union variants
export function buildLegalFinding(
  clauseType: 'indemnification',
  overrides: Partial<Finding> = {}
): Finding {
  return buildFinding({
    category: 'Legal Issues',
    legalMeta: {
      clauseType: 'indemnification',
      riskType: 'broad',
      hasInsuranceGap: false,
    },
    ...overrides,
  });
}
```

**Why factories over raw object literals:** The `Finding` type has 11 required fields. Typing them out per test is error-prone and breaks when the schema changes. A factory encodes the required shape once. Adding a new required field to `MergedFindingSchema` only requires updating one factory function, not dozens of test files.

### Pattern 6: localStorage Isolation via jsdom

**What:** jsdom provides a working `localStorage` implementation. Clear it in `afterEach`. Seed it before tests that depend on stored data.

```typescript
// src/test-utils/storage-mock.ts
import type { Contract } from '../types/contract';

export function seedContracts(contracts: Contract[]) {
  localStorage.setItem('clearcontract:contracts', JSON.stringify(contracts));
  localStorage.setItem('clearcontract:schema-version', '2');
}

export function seedCompanyProfile(profile: Record<string, string>) {
  localStorage.setItem('clearcontract:company-profile', JSON.stringify(profile));
}
```

**Critical detail:** When spying on localStorage in jsdom, attach spies to `Storage.prototype`:

```typescript
const getSpy = vi.spyOn(Storage.prototype, 'getItem');
const setSpy = vi.spyOn(Storage.prototype, 'setItem');
```

Do NOT spy on `localStorage.getItem` directly -- jsdom proxies through the prototype, and direct spies miss calls.

### Pattern 7: Testing Hooks Without Components

`useContractStore` uses `useState` directly (no Redux, no Context). Test with `renderHook` from `@testing-library/react`.

**What:** Import hook, render in isolation, interact via returned API.

```typescript
import { renderHook, act } from '@testing-library/react';
import { useContractStore } from '../../hooks/useContractStore';
import { buildContract } from '../../test-utils/factories';

test('addContract persists to localStorage', () => {
  const { result } = renderHook(() => useContractStore());
  const contract = buildContract({ id: 'new-1' });

  act(() => {
    result.current.addContract(contract);
  });

  expect(result.current.contracts).toHaveLength(1);
  expect(result.current.contracts[0].id).toBe('new-1');
  // Verify persistence side effect
  const stored = JSON.parse(localStorage.getItem('clearcontract:contracts')!);
  expect(stored).toHaveLength(1);
});
```

**No wrapper needed:** `useContractStore` does not consume any Context. The default RTL `renderHook` wrapper suffices. If a hook consumes `ToastProvider`, wrap with the custom render's `AllProviders`.

### Pattern 8: Vercel Handler Testing via Direct Import

Vercel serverless functions export a default handler `(req: VercelRequest, res: VercelResponse) => void`. Test by constructing minimal mock request/response objects.

**What:** Create mock req/res matching the Vercel interface shape, call handler directly, assert on `res.status()` and `res.json()` calls.

```typescript
// api/__tests__/analyze.test.ts
import { vi, describe, it, expect } from 'vitest';

// Mock Anthropic SDK BEFORE importing handler
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    files: { upload: vi.fn().mockResolvedValue({ id: 'file-123' }) },
    messages: { create: vi.fn() },
  })),
}));

// Mock PDF parsing
vi.mock('../pdf', () => ({
  preparePdfForAnalysis: vi.fn().mockResolvedValue({
    fileId: 'file-123',
    textContent: 'Sample contract text',
  }),
}));

function createMockReq(overrides = {}) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: { pdfBase64: 'dGVzdA==', fileName: 'test.pdf' },
    ...overrides,
  } as unknown as import('@vercel/node').VercelRequest;
}

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn(),
  };
  return res as unknown as import('@vercel/node').VercelResponse;
}
```

**Why not supertest/MSW for handler tests:** Supertest needs an HTTP server. MSW intercepts at the network level but the handler is a plain function -- direct invocation is simpler, faster, and tests the actual handler code without HTTP overhead.

**When to use MSW instead:** For component tests where `analyzeContract.ts` calls `fetch('/api/analyze')`. MSW intercepts that fetch and returns fixture data without needing a running server.

### Pattern 9: Fixture Capture and Maintenance

Real API responses are large (50+ findings, complex nested structures with LegalMeta/ScopeMeta discriminated unions). Captured fixtures ensure tests exercise realistic data shapes.

**Capture process:**
1. Run a real analysis via `vercel dev` against a test PDF
2. Copy response JSON from browser DevTools Network tab
3. Save to `test/fixtures/analysis-response-{descriptor}.json`
4. Validate fixture: add a test that runs `AnalysisResultSchema.safeParse(fixture)` -- this catches schema drift automatically

**Maintenance strategy:** Fixtures are versioned with the codebase. When schema changes (new required fields on Finding, new pass types), `safeParse` tests fail first, signaling that fixtures need regeneration. This is intentional -- stale fixtures should break tests, not silently pass.

```typescript
// src/__tests__/schemas/analysisResult.test.ts
import fixture from '../../../test/fixtures/analysis-response-simple.json';
import { AnalysisResultSchema } from '../../schemas/analysisResult';

test('fixture validates against current schema', () => {
  const result = AnalysisResultSchema.safeParse(fixture);
  expect(result.success).toBe(true);
});
```

### Pattern 10: Handling Framer Motion in Tests

Several components use Framer Motion for animations (`AnimatePresence`, `motion.div` with stagger delays). This can cause `waitFor` timing issues in tests.

**What:** Mock framer-motion to render plain elements without animation delays.

```typescript
// In test/setup.ts or per-file vi.mock:
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) =>
      createElement('div', filterMotionProps(props), children),
    // Add other elements as needed
  },
  AnimatePresence: ({ children }: any) => children,
}));
```

**When needed:** Only mock if animations cause test flakiness or `waitFor` timeouts. Try without the mock first -- jsdom processes animations synchronously in many cases. Add the mock only if a specific test proves flaky.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Testing Implementation Details of Hooks
**What:** Spying on internal `useState` calls or checking `setContracts` was called.
**Why bad:** Tests break on any refactor (e.g., moving to `useReducer`). The hook's public API is its return value.
**Instead:** Assert on returned state values and side effects (localStorage writes). Test what the hook does, not how.

### Anti-Pattern 2: Mocking Everything in Component Tests
**What:** Mocking `useContractStore`, `useRouter`, every child component.
**Why bad:** Tests verify mocks, not behavior. Misses integration bugs between components and state.
**Instead:** Use real hooks with controlled initial state (seed localStorage before render). Mock only external boundaries (fetch, Anthropic SDK). Let internal component composition work naturally.

### Anti-Pattern 3: Snapshot-Heavy Component Tests
**What:** `expect(container).toMatchSnapshot()` on large component trees.
**Why bad:** Snapshots break on any Tailwind class change. Large snapshots go unreviewed. ClearContract uses ~50 Tailwind utilities per component.
**Instead:** Assert specific behaviors: "displays risk score 78", "shows 5 findings", "filter removes Critical". Use inline snapshots only for small computed text output.

### Anti-Pattern 4: Testing Zod Schemas with Valid Data Only
**What:** Only testing that valid data passes validation.
**Why bad:** Misses the primary value of schema validation -- rejecting bad data.
**Instead:** Test boundary cases: missing required fields, wrong discriminant values (`clauseType: 'nonexistent'`), invalid enums. These are the regressions that matter when API responses evolve.

### Anti-Pattern 5: Merging Test Config into vite.config.ts
**What:** Adding `test: {}` block directly to `vite.config.ts`.
**Why bad:** Mixes concerns. TypeScript may complain about the `test` property if `vitest/config` types are not loaded in the main config. Test dependencies (jsdom, RTL types) conceptually pollute the build config.
**Instead:** Separate `vitest.config.ts` using `mergeConfig`.

### Anti-Pattern 6: Using vitest-localstorage-mock Package
**What:** Installing `vitest-localstorage-mock` npm package.
**Why bad:** jsdom already provides a working localStorage. An extra package adds a dependency for something that works out of the box. The package also replaces localStorage entirely, preventing tests of the actual jsdom storage behavior.
**Instead:** Use jsdom's built-in localStorage. Clear in `afterEach`. Spy via `Storage.prototype` when asserting specific calls.

### Anti-Pattern 7: Testing the Anthropic API in Unit/Integration Tests
**What:** Making real API calls in the test suite.
**Why bad:** Slow (60s+ per analysis), costs money ($0.50+ per run), flaky (rate limits, network issues), non-deterministic (Claude output varies).
**Instead:** Mock the Anthropic SDK entirely. Real API testing is a separate manual/triggered suite (UAT checklist) that runs outside the automated test suite.

## Integration Points: New vs Modified Files

### New Files (test infrastructure)

| File | Purpose | Depends On |
|------|---------|-----------|
| `vitest.config.ts` | Test runner configuration | vite.config.ts (plugins) |
| `tsconfig.test.json` | Test TypeScript config | tsconfig.json (extends) |
| `test/setup.ts` | Global setup: matchers, cleanup, localStorage clear | @testing-library/jest-dom/vitest |
| `src/test-utils/render.tsx` | Custom RTL render with ToastProvider | src/contexts/ToastProvider |
| `src/test-utils/factories.ts` | Type-safe test data builders | src/types/contract.ts |
| `src/test-utils/storage-mock.ts` | localStorage seed/clear helpers | None (pure localStorage calls) |
| `test/fixtures/*.json` | Captured API response data | None (static JSON) |
| `src/__tests__/**/*.test.{ts,tsx}` | All client test files | Production modules + test-utils |
| `api/__tests__/*.test.ts` | All server test files | Production modules |

### Modified Files (minimal changes only)

| File | Change | Why |
|------|--------|-----|
| `package.json` | Add devDependencies + `"test"` script | vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event |
| `.gitignore` | Add `coverage/` directory | Vitest v8 coverage output |

### Files NOT Modified

| File | Why Left Alone |
|------|---------------|
| `vite.config.ts` | Test config is separate via mergeConfig |
| `tsconfig.json` | Base config unchanged; test config extends it |
| All `src/**/*.ts(x)` | Zero production code changes needed for testability |
| All `api/*.ts` | Server code unchanged; handlers tested via direct import |

This is critical: the existing architecture (hooks returning state, pure utility functions, Zod schemas as validation gates, storageManager with typed API) is already highly testable without modification.

## Build Order (Dependency-Aware)

Each phase produces tested infrastructure the next phase depends on.

```
Phase 1: Foundation (no test files yet)
  1. npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
  2. Create vitest.config.ts (mergeConfig from vite.config.ts)
  3. Create tsconfig.test.json (extends tsconfig.json)
  4. Create test/setup.ts (jest-dom matchers + cleanup + localStorage.clear)
  5. Add "test" and "test:run" scripts to package.json
  6. Add coverage/ to .gitignore
  7. Verify: `npm run test:run` exits cleanly with 0 tests found
  Dependencies: None

Phase 2: Test Utilities (shared infrastructure)
  8. Create src/test-utils/factories.ts (depends on types/contract.ts)
  9. Create src/test-utils/storage-mock.ts (depends on nothing)
  10. Create src/test-utils/render.tsx (depends on contexts/ToastProvider)
  Dependencies: Phase 1 (vitest must be installed)

Phase 3: Pure Logic Tests (no DOM, no React -- fastest to write, highest value)
  11. src/__tests__/utils/errors.test.ts (classifyError: 5 error types)
  12. src/__tests__/utils/bidSignal.test.ts (computeBidSignal: factor weights)
  13. src/__tests__/utils/palette.test.ts (severity color mapping)
  14. src/__tests__/schemas/finding.test.ts (MergedFindingSchema valid + invalid)
  15. src/__tests__/schemas/analysisResult.test.ts (AnalysisResultSchema)
  16. src/__tests__/storage/storageManager.test.ts (load/save/loadRaw/saveRaw)
  17. api/__tests__/scoring.test.ts (computeRiskScore, applySeverityGuard)
  18. api/__tests__/merge.test.ts (mergePassResults with fixture data)
  Dependencies: Phase 2 (factories for building test data)

Phase 4: Hook Tests (React + jsdom, no components)
  19. src/__tests__/hooks/useContractStore.test.ts (CRUD + persistence)
  20. src/__tests__/hooks/useContractFiltering.test.ts (filter logic)
  21. src/__tests__/hooks/useFieldValidation.test.ts (onBlur validation)
  22. src/__tests__/hooks/useInlineEdit.test.ts (edit lifecycle)
  Dependencies: Phase 2 (storage-mock for seeding), Phase 3 proves storage layer works

Phase 5: Component Tests (RTL + jsdom)
  23. src/__tests__/components/SeverityBadge.test.tsx (simple, validates pattern)
  24. src/__tests__/components/FindingCard.test.tsx (complex, uses LegalMeta)
  25. src/__tests__/components/UploadZone.test.tsx (file drop interaction)
  26. src/__tests__/components/FilterToolbar.test.tsx (multi-select state)
  27. src/__tests__/components/ConfirmDialog.test.tsx (modal interaction)
  Dependencies: Phase 2 (custom render), Phase 3 (factories proven)

Phase 6: Page-Level Integration Tests
  28. src/__tests__/pages/Dashboard.test.tsx (seed contracts, verify stats)
  29. src/__tests__/pages/ContractReview.test.tsx (seed contract, verify findings)
  30. src/__tests__/pages/Settings.test.tsx (profile persistence)
  Dependencies: Phases 2-5 (all test utilities and patterns proven)

Phase 7: API Handler Tests
  31. api/__tests__/analyze.test.ts (mocked SDK, validation, error paths)
  Dependencies: Phase 3 (scoring/merge proven), fixtures captured

Phase 8: Fixture Capture (manual, one-time after automated tests work)
  32. Run real analysis via vercel dev, capture response JSON
  33. Save to test/fixtures/, add validation test
  34. Wire fixture into merge and component tests
  Dependencies: Working test infrastructure from Phases 1-7
```

**Ordering rationale:** Pure logic tests (Phase 3) are the highest-value, lowest-cost tests -- they validate the core business logic (risk scoring, error classification, schema validation) with no mocking complexity. Hook tests (Phase 4) build on proven storage mocking. Component tests (Phase 5) build on the proven custom render wrapper. Each phase proves its tooling before the next phase relies on it.

## Mock Strategy Summary

| What to Mock | How | Why |
|-------------|-----|-----|
| localStorage | jsdom provides it natively; `localStorage.clear()` in `afterEach`; spy via `Storage.prototype` | Hooks read on init; tests need clean state |
| `fetch` | `vi.fn()` for simple cases; MSW for component tests calling `analyzeContract()` | Network boundary; control response shape |
| Anthropic SDK | `vi.mock('@anthropic-ai/sdk')` in API handler tests | External service; expensive, slow, non-deterministic |
| `window.history` | Not needed; jsdom supports `location.pathname` and `pushState` | `useRouter` reads location which jsdom handles |
| PDF parsing (`unpdf`) | `vi.mock('unpdf')` in API tests returning extracted text | Binary dependency; returns text string |
| `FileReader` | jsdom provides it; works with react-dropzone in tests | No mock needed for basic file reading |
| `jsPDF` | Mock only if testing PDF export output; otherwise skip | PDF generation is output-only, hard to assert on content |
| Framer Motion | Mock only if animations cause test flakiness | Try without first; jsdom often handles it fine |

## Scalability Considerations

| Concern | Now (v1.6) | If suite grows to 200+ tests | If adding E2E/Playwright later |
|---------|------------|------------------------------|-------------------------------|
| Test speed | <5s for full suite with Vitest | Enable `--pool=threads` (default), `--reporter=verbose` only in CI | E2E in separate config, separate npm script |
| Fixture size | 2-3 JSON files, ~50KB each | Extract common fixture data into factory compositions | E2E uses real API (manual trigger only) |
| Coverage | Focus on utils/hooks/schemas | Add `--coverage` threshold in CI (70% lines for targeted dirs) | E2E coverage not meaningful |
| CI integration | `npm run test:run` in build pipeline | Same command, parallelism is built into Vitest | Playwright needs separate job with browser install |

## Sources

- [Vitest Getting Started](https://vitest.dev/guide/) -- configuration, globals, environment setup
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) -- vi.mock, vi.spyOn, module mocking
- [Vitest Snapshot Testing](https://vitest.dev/guide/snapshot) -- toMatchSnapshot, toMatchInlineSnapshot
- [Mocking localStorage in Vitest](https://dylanbritz.dev/writing/mocking-local-storage-vitest/) -- Storage.prototype spy pattern for jsdom
- [Configuring Vitest with TypeScript and RTL](https://johnsmilga.com/articles/2024/10/15) -- mergeConfig, tsconfig integration
- [MSW with Vitest](https://stevekinney.com/courses/testing/testing-with-mock-service-worker) -- network-level fetch mocking for component tests
- [React Testing Library setup](https://testing-library.com/docs/svelte-testing-library/setup/) -- custom render pattern, renderHook
- Direct codebase inspection of all production files referenced above (HIGH confidence)

---
*Architecture research for: ClearContract v1.6 test framework integration*
*Researched: 2026-03-15*
