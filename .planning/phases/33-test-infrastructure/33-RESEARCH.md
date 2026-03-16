# Phase 33: Test Infrastructure - Research

**Researched:** 2026-03-15
**Domain:** Vitest + React Testing Library + test utilities for a Vite 5 / React 18 / TypeScript project
**Confidence:** HIGH

## Summary

This phase sets up the complete test infrastructure for ClearContract: Vitest as the test runner, React Testing Library with jest-dom matchers for component testing, a Framer Motion global mock, and Zod-validated fixture factories. The project uses Vite 5, so Vitest 3.x is the correct choice (Vitest 4.x requires Vite >= 6). All decisions are locked in CONTEXT.md -- colocated test files, inline Vitest config in `vite.config.ts`, jsdom default environment with per-file node override, and a `src/test/` directory for shared utilities.

The main technical risks are: (1) the Framer Motion Proxy-based mock must handle all `motion.*` element access dynamically, (2) the ToastProvider wraps AnimatePresence which also needs mocking, and (3) Zod schema factories must produce objects that survive `MergedFindingSchema.parse()` including discriminated unions for `legalMeta` and `scopeMeta`.

**Primary recommendation:** Install vitest 3.x, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, and jsdom as devDependencies. Configure inline in vite.config.ts with setupFiles pointing to `src/test/setup.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Colocated test files: `FindingCard.test.tsx` next to `FindingCard.tsx` in same directory
- API tests colocated in `api/` directory: `api/analyze.test.ts` next to `api/analyze.ts`
- Shared test utilities in `src/test/` directory (setup, render wrapper, factories, mocks)
- Default environment is jsdom; API test files use `// @vitest-environment node` per-file comment
- Custom render wrapper includes ToastProvider only (the sole context provider)
- Override-style factories: `createFinding({severity: 'Critical'})` returns valid defaults with selective overrides
- Factories validate output against Zod schemas (MergedFindingSchema.parse) to guarantee correctness
- localStorage uses jsdom's built-in implementation; clear in beforeEach
- Quota exceeded testing uses `vi.spyOn(Storage.prototype, 'setItem')` to throw DOMException
- Global module mock via vi.mock('framer-motion') in setup file
- motion.div/span/etc replaced with plain HTML elements via Proxy
- AnimatePresence renders children directly
- Auto-loaded via Vitest setupFiles -- no per-test imports needed
- Three scripts: `test` (vitest run), `test:watch` (vitest), `test:coverage` (vitest run --coverage)
- Vitest config inline in existing `vite.config.ts` (no separate config file)
- Test include paths: `src/**/*.test.{ts,tsx}` and `api/**/*.test.ts`
- Two trivial tests: classifyError (pure function) and SeverityBadge (component render)
- FM mock verified by SeverityBadge rendering without animation errors

### Claude's Discretion
- Exact Vitest version selection
- jest-dom import pattern (global vs per-file)
- cleanup configuration (auto vs manual)
- TypeScript config adjustments for test files

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Vitest configured with dual environments (jsdom for client, node for API tests) | Vitest 3.x supports `environment: 'jsdom'` as default + `// @vitest-environment node` per-file directive. Inline config in vite.config.ts. |
| INFRA-02 | React Testing Library with jest-dom matchers and user-event installed and working | @testing-library/react, @testing-library/jest-dom (import vitest extension in setup), @testing-library/user-event |
| INFRA-03 | Framer Motion globally mocked so component tests render without animation errors | Proxy-based mock in setup file replacing motion.* with plain HTML elements, AnimatePresence passthrough |
| INFRA-04 | Test utility kit: custom render wrapper, localStorage mock helpers, fixture factories for Zod schemas | src/test/ directory with setup.ts, render.tsx, factories.ts, mocks/ subdirectory |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.2.0 | Test runner | Last major compatible with Vite 5; native ESM, inline config, per-file environments |
| @testing-library/react | ^16.3.0 | Component testing | Standard React testing library; renders components, queries DOM |
| @testing-library/jest-dom | ^6.9.0 | DOM matchers | toBeInTheDocument, toHaveTextContent, etc. via vitest extension |
| @testing-library/user-event | ^14.6.0 | User interaction simulation | Realistic click/type/keyboard events |
| jsdom | ^26.1.0 | Browser environment | Required peer for Vitest jsdom environment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.25.76 | Schema validation | Already installed -- factories use MergedFindingSchema.parse() |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsdom | happy-dom | happy-dom is faster but less complete; jsdom is safer for first setup |
| vitest 4.x | vitest 3.x | v4 requires Vite 6+; project uses Vite 5 |

**Installation:**
```bash
npm install -D vitest@^3.2.0 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^26
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── test/
│   ├── setup.ts              # Global setup: jest-dom matchers + framer-motion mock
│   ├── render.tsx             # Custom render with ToastProvider wrapper
│   ├── factories.ts           # createFinding(), createContract() -- Zod-validated
│   └── mocks/
│       └── framer-motion.ts   # Proxy-based motion.* mock (imported by setup.ts)
├── components/
│   ├── SeverityBadge.tsx
│   └── SeverityBadge.test.tsx # Colocated component test
├── utils/
│   ├── errors.ts
│   └── errors.test.ts         # Colocated unit test
api/
├── analyze.ts
└── analyze.test.ts            # Colocated, uses // @vitest-environment node
```

### Pattern 1: Vitest Inline Config in vite.config.ts
**What:** Add `test` property to existing defineConfig
**When to use:** Always -- locked decision, no separate vitest.config.ts

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config'  // Note: import from vitest/config, not vite
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    css: false,
  },
})
```

**Critical:** The `defineConfig` import MUST come from `vitest/config` (not `vite`) to get TypeScript types for the `test` property.

### Pattern 2: jest-dom Global Setup
**What:** Import jest-dom vitest extension once in setup file
**When to use:** Global -- all tests get matchers automatically

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

This is the recommended pattern for Vitest. The `/vitest` entry point auto-extends `expect` with all jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.) without needing per-file imports.

### Pattern 3: Framer Motion Proxy Mock
**What:** Replace all motion.* components with plain HTML elements
**When to use:** Global setup -- prevents animation errors in all component tests

```typescript
// src/test/mocks/framer-motion.ts
import { vi } from 'vitest';
import React from 'react';

vi.mock('framer-motion', () => {
  // Cache created components to avoid re-creation on every access
  const componentCache = new Map<string, React.FC>();

  const motionProxy = new Proxy({} as Record<string, React.FC>, {
    get: (_target, prop: string) => {
      if (!componentCache.has(prop)) {
        // Forward ref so components using ref= don't break
        const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
          (props, ref) => {
            // Filter out framer-motion-specific props
            const filteredProps: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
              if (
                !key.startsWith('animate') &&
                !key.startsWith('initial') &&
                !key.startsWith('exit') &&
                !key.startsWith('transition') &&
                !key.startsWith('variants') &&
                !key.startsWith('whileHover') &&
                !key.startsWith('whileTap') &&
                !key.startsWith('whileFocus') &&
                !key.startsWith('whileInView') &&
                !key.startsWith('layout') &&
                key !== 'drag' &&
                key !== 'dragConstraints' &&
                key !== 'onAnimationComplete'
              ) {
                filteredProps[key] = value;
              }
            }
            return React.createElement(prop, { ...filteredProps, ref });
          }
        );
        Component.displayName = `motion.${prop}`;
        componentCache.set(prop, Component as unknown as React.FC);
      }
      return componentCache.get(prop);
    },
  });

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: vi.fn(),
      onChange: vi.fn(),
    }),
    useTransform: (value: unknown, input: unknown, output: unknown[]) => ({
      get: () => output?.[0] ?? 0,
      set: vi.fn(),
      onChange: vi.fn(),
    }),
  };
});
```

### Pattern 4: Custom Render Wrapper
**What:** Wraps rendered components with ToastProvider
**When to use:** All component tests should use this instead of bare `render()`

```typescript
// src/test/render.tsx
import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';
import { ToastProvider } from '../contexts/ToastProvider';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
export { screen, within, waitFor } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

### Pattern 5: Override-Style Factories with Zod Validation
**What:** Functions that return valid defaults, accept partial overrides, validate with Zod
**When to use:** Any test needing Finding or Contract data

```typescript
// src/test/factories.ts
import { MergedFindingSchema } from '../schemas/finding';
import type { Finding, Contract, ContractDate } from '../types/contract';

let _findingCounter = 0;

export function createFinding(overrides: Partial<Finding> = {}): Finding {
  _findingCounter++;
  const defaults: Finding = {
    id: `finding-${_findingCounter}`,
    severity: 'Medium',
    category: 'Scope of Work',
    title: `Test Finding ${_findingCounter}`,
    description: 'Test description for finding.',
    recommendation: 'Test recommendation.',
    clauseReference: 'Section 1.1',
    negotiationPosition: 'Request amendment.',
    actionPriority: 'monitor',
    resolved: false,
    note: '',
  };

  // Parse through Zod to guarantee shape correctness
  return MergedFindingSchema.parse({ ...defaults, ...overrides });
}

let _contractCounter = 0;

export function createContract(overrides: Partial<Contract> = {}): Contract {
  _contractCounter++;
  return {
    id: `contract-${_contractCounter}`,
    name: `Test Contract ${_contractCounter}`,
    client: 'Test Client',
    type: 'Subcontract',
    uploadDate: new Date().toISOString(),
    status: 'Reviewed',
    findings: [],
    dates: [],
    riskScore: 45,
    ...overrides,
  };
}

export function createContractDate(overrides: Partial<ContractDate> = {}): ContractDate {
  return {
    label: 'Substantial Completion',
    date: '2026-06-15',
    type: 'Deadline',
    ...overrides,
  };
}
```

### Pattern 6: Per-File Environment Override for API Tests
**What:** Use magic comment to switch from jsdom to node
**When to use:** Any test file in `api/` directory

```typescript
// @vitest-environment node
// api/analyze.test.ts

import { describe, it, expect } from 'vitest';

describe('API analyze module', () => {
  it('can import without jsdom contamination', () => {
    expect(typeof globalThis.window).toBe('undefined');
    expect(typeof globalThis.document).toBe('undefined');
  });
});
```

### Anti-Patterns to Avoid
- **Importing from `vite` instead of `vitest/config`:** Will lose TypeScript types for the `test` property in defineConfig
- **Using `vi.mock()` inside test files for framer-motion:** Defeats global mock purpose, causes inconsistency
- **Building Contract objects by hand without factories:** Leads to stale data shapes when schemas change
- **Using `render()` from @testing-library/react directly:** Misses ToastProvider context; always import from `src/test/render`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM matchers | Custom expect extensions | @testing-library/jest-dom/vitest | 20+ matchers, maintained, TypeScript typed |
| User interactions | fireEvent wrappers | @testing-library/user-event | Simulates real browser event sequences (focus, keydown, keyup, input) |
| Test data | Inline object literals | Zod-validated factories | Schema changes caught at factory level, not in 50 test files |
| Animation mocking | MotionConfig with duration:0 | Global vi.mock with Proxy | MotionConfig still runs animation code paths; mock eliminates them entirely |

**Key insight:** The Framer Motion mock is the trickiest piece. The library uses Proxy internally for `motion.*`, so a naive `{ motion: { div: 'div' } }` mock breaks when any new element type is accessed. The Proxy-based mock handles all element types dynamically.

## Common Pitfalls

### Pitfall 1: defineConfig Import Source
**What goes wrong:** TypeScript shows no `test` property on config object
**Why it happens:** Importing `defineConfig` from `'vite'` instead of `'vitest/config'`
**How to avoid:** Always `import { defineConfig } from 'vitest/config'`
**Warning signs:** Red squigglies on `test:` property in vite.config.ts

### Pitfall 2: tsconfig.json Not Including Test Files
**What goes wrong:** TypeScript errors in test files; `describe`, `it`, `expect` not recognized
**Why it happens:** Current tsconfig `include` only covers `"src"` -- api/ tests and vitest globals are not included
**How to avoid:** Add `"vitest/globals"` to `compilerOptions.types` in tsconfig.json. Ensure `api/` is included or create a tsconfig for tests.
**Warning signs:** TS errors in .test.ts files but tests still run (Vitest uses esbuild, not tsc)

### Pitfall 3: Framer Motion Mock Not Filtering Props
**What goes wrong:** React warnings about unknown DOM attributes (animate, initial, exit, etc.)
**Why it happens:** Passing framer-motion-specific props through to plain HTML elements
**How to avoid:** Filter out all motion-specific props in the Proxy mock before forwarding to createElement
**Warning signs:** Console warnings like "Warning: React does not recognize the `animate` prop"

### Pitfall 4: AnimatePresence Returning Fragment vs Children
**What goes wrong:** Extra DOM wrapper element in test snapshots or query failures
**Why it happens:** AnimatePresence mock wrapping children in a Fragment or div
**How to avoid:** Mock returns `children` directly (not wrapped). Since React components must return ReactNode, this works when children is a single element. For multiple children, use Fragment.
**Warning signs:** Tests pass but DOM structure differs from expectations

### Pitfall 5: Factory Counter Pollution Between Tests
**What goes wrong:** Test IDs are non-deterministic across test files
**Why it happens:** Module-level counter increments across all tests in a run
**How to avoid:** Don't rely on specific counter values in assertions; use the returned object's id. Optionally reset counters in beforeEach if determinism matters.
**Warning signs:** Tests pass in isolation but fail when run together

### Pitfall 6: Vitest Cleanup
**What goes wrong:** DOM state leaks between tests causing false positives/negatives
**Why it happens:** Not cleaning up after render
**How to avoid:** Vitest + @testing-library/react enables automatic cleanup by default when `globals: true` is set. Verify this works; if not, add `afterEach(() => cleanup())` in setup.
**Warning signs:** Tests pass individually but fail in suite

## Code Examples

### SeverityBadge Verification Test (Component)
```typescript
// src/components/SeverityBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { SeverityBadge } from './SeverityBadge';

describe('SeverityBadge', () => {
  it('renders severity text', () => {
    render(<SeverityBadge severity="Critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders with downgrade indicator', () => {
    render(<SeverityBadge severity="Medium" downgradedFrom="High" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('was High')).toBeInTheDocument();
  });
});
```

### classifyError Verification Test (Pure Function)
```typescript
// src/utils/errors.test.ts
import { describe, it, expect } from 'vitest';
import { classifyError } from './errors';

describe('classifyError', () => {
  it('classifies network errors', () => {
    const err = new TypeError('Failed to fetch');
    const result = classifyError(err);
    expect(result.type).toBe('network');
    expect(result.retryable).toBe(true);
  });

  it('classifies unknown errors', () => {
    const result = classifyError('some string error');
    expect(result.type).toBe('unknown');
    expect(result.retryable).toBe(false);
  });
});
```

### API Environment Verification Test
```typescript
// api/analyze.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('API test environment', () => {
  it('runs in node environment without jsdom', () => {
    expect(typeof globalThis.window).toBe('undefined');
    expect(typeof globalThis.document).toBe('undefined');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest + babel | Vitest + native ESM | 2023-2024 | No babel config needed; Vite plugin reuse |
| @testing-library/jest-dom manual extend | @testing-library/jest-dom/vitest import | jest-dom v6 | Single import auto-extends vitest expect |
| jest.mock() | vi.mock() | Vitest adoption | Same API surface, different import |
| Manual cleanup | Auto-cleanup with globals:true | RTL + Vitest | No afterEach(cleanup) needed |

**Deprecated/outdated:**
- Vitest 4.x: Requires Vite >= 6; NOT compatible with this project's Vite 5
- jest-dom < 6: Did not have `/vitest` entry point; required manual `expect.extend()`

## Open Questions

1. **tsconfig adjustment for api/ test files**
   - What we know: Current tsconfig.json `include` only has `"src"`. API tests live in `api/`.
   - What's unclear: Whether to modify the main tsconfig or create a separate tsconfig for tests
   - Recommendation: Add `"api"` to the main tsconfig's `include` array, or add a `tsconfig.test.json` that extends it. Simplest is modifying the main tsconfig.

2. **Vitest globals type augmentation**
   - What we know: Setting `globals: true` makes describe/it/expect available without imports but TypeScript needs types
   - What's unclear: Whether `/// <reference types="vitest/globals" />` in setup.ts is sufficient or if tsconfig.json needs `types: ["vitest/globals"]`
   - Recommendation: Add `"types": ["vitest/globals"]` to tsconfig.json compilerOptions. This is the cleanest approach.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vite.config.ts (inline test config) -- created in this phase |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Vitest runs with dual environments | smoke | `npm run test` (verifies both jsdom and node tests pass) | No -- Wave 0 |
| INFRA-02 | RTL + jest-dom matchers work | smoke | `npx vitest run src/components/SeverityBadge.test.tsx` | No -- Wave 0 |
| INFRA-03 | FM mock prevents animation errors | smoke | `npx vitest run src/components/SeverityBadge.test.tsx` (SeverityBadge does not use motion but ToastProvider does via render wrapper) | No -- Wave 0 |
| INFRA-04 | Factories produce valid Zod objects | unit | `npx vitest run src/test/factories.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** All tests pass with zero failures

### Wave 0 Gaps
- [ ] `vite.config.ts` -- needs test config added inline
- [ ] `src/test/setup.ts` -- jest-dom import + framer-motion mock
- [ ] `src/test/render.tsx` -- custom render with ToastProvider
- [ ] `src/test/factories.ts` -- createFinding, createContract, createContractDate
- [ ] `src/test/mocks/framer-motion.ts` -- Proxy-based mock (imported by setup.ts)
- [ ] `src/components/SeverityBadge.test.tsx` -- verification test
- [ ] `src/utils/errors.test.ts` -- verification test
- [ ] `api/analyze.test.ts` -- node environment verification test
- [ ] `package.json` -- test/test:watch/test:coverage scripts + devDependencies
- [ ] `tsconfig.json` -- vitest/globals types

## Sources

### Primary (HIGH confidence)
- Project source code: vite.config.ts, package.json, tsconfig.json, src/schemas/finding.ts, src/contexts/ToastProvider.tsx, src/components/SeverityBadge.tsx, src/utils/errors.ts
- CONTEXT.md locked decisions (all implementation choices pre-determined)

### Secondary (MEDIUM confidence)
- [Vitest official docs](https://vitest.dev/) -- configuration, environments, mocking
- [@testing-library/jest-dom npm](https://www.npmjs.com/package/@testing-library/jest-dom) -- v6.9.x, /vitest entry point
- [Using jest-dom with Vitest](https://markus.oberlehner.net/blog/using-testing-library-jest-dom-with-vitest/) -- setup pattern
- [Mocking framer-motion v9](https://dev.to/pgarciacamou/mocking-framer-motion-v9-7jh) -- Proxy pattern for motion mock

### Tertiary (LOW confidence)
- [Vitest 3 + Vite 5 compatibility discussion](https://github.com/vitest-dev/vitest/discussions/7520) -- confirms Vitest 3 works with Vite 5
- [Vitest vs Jest 2026 benchmarks](https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/) -- ecosystem context

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- well-established stack, versions verified against project's Vite 5 constraint
- Architecture: HIGH -- all patterns locked by user decisions in CONTEXT.md, verified against actual source code
- Pitfalls: HIGH -- common issues documented across multiple sources, verified against project's specific setup

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable ecosystem, locked decisions)
