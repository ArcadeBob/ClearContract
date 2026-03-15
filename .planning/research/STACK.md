# Technology Stack

**Project:** ClearContract v1.6 Quality & Validation
**Researched:** 2026-03-15
**Confidence:** HIGH

## Context

ClearContract v1.5 shipped with zero test infrastructure. The v1.6 milestone adds comprehensive testing: unit tests on core logic, component tests for UI flows, integration tests on the API endpoint, and API mocking for deterministic test runs. This research covers ONLY the new testing libraries needed. The existing runtime stack (React 18, TypeScript, Vite 5, Tailwind, Zod v3, Anthropic SDK, jsPDF, Vercel) is validated and unchanged.

---

## Recommended Stack

### Test Runner + Assertion

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vitest | ^3.2.4 | Test runner, assertion library, mocking | Native Vite integration -- shares the same config, transforms, and plugin pipeline. Jest-compatible API means zero learning curve. **Must use 3.x because project uses Vite 5; Vitest 4.x requires Vite >= 6.** |
| @vitest/coverage-v8 | ^3.2.4 | Code coverage reporting | V8-native coverage with AST-based remapping (accurate as Istanbul in Vitest 3.x). Zero-config with Vitest. Outputs lcov for CI integration. |

**Why Vitest over Jest:** Vitest reuses the Vite transform pipeline, so TypeScript, JSX, and ES modules work out of the box without separate Babel/ts-jest configuration. The project already uses Vite 5 -- adding Vitest means test files go through the exact same module resolution as production code.

**Why 3.x, not 4.x:** Vitest 4.0 requires Vite >= 6.0.0. Upgrading Vite to 6 is a separate migration with its own breaking changes (new Environment API, changed SSR defaults). That upgrade is out of scope for a testing milestone. Vitest 3.2.4 supports Vite 5 fully.

### DOM Environment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| jsdom | ^20.8.4 | DOM simulation for component tests | More complete browser API implementation than happy-dom. Testing Library's `byRole` queries (which rely on ARIA computation) work correctly with jsdom. happy-dom is 3-10x faster but has known gaps with `byRole` and ARIA -- that tradeoff is wrong for a project with ~50-200 tests where correctness matters more than speed. |

### Component Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @testing-library/react | ^16.3.2 | React component rendering + queries | Industry standard for testing React components as users interact with them (not implementation details). Works with React 18. |
| @testing-library/jest-dom | ^6.9.1 | DOM assertion matchers | Adds `.toBeInTheDocument()`, `.toHaveTextContent()`, `.toBeVisible()`, etc. Makes assertions readable. |
| @testing-library/user-event | ^14.6.1 | Simulated user interactions | Fires events the way a real user would (click, type, tab). More realistic than `fireEvent` for testing drag-and-drop uploads, form inputs, keyboard navigation. |

### API Mocking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| msw | ^2.12.11 | Network-level API mocking | Intercepts at the network layer (not by patching `fetch`), so the entire fetch/response pipeline is exercised. Handlers are reusable across test suites. The `/api/analyze` endpoint returns structured JSON from Claude -- MSW lets us mock that response with real fixture data. Also works if we later want Storybook or E2E mocks. |

**Why MSW over vi.fn() / vi.mock('fetch'):** Patching `fetch` with `vi.fn()` tests that your code calls fetch. MSW tests that your code correctly handles the HTTP response. The project's `analyzeContract.ts` does base64 encoding, sets headers, handles error status codes (400, 401, 422, 429) -- MSW exercises all of that. `vi.mock` would skip it.

---

## What NOT to Add

| Library | Why Not | What to Use Instead |
|---------|---------|---------------------|
| Jest | Requires separate Babel/ts-jest config for TypeScript + JSX. Vitest does this natively via Vite. Adding Jest to a Vite project means maintaining two transform pipelines. | Vitest |
| Playwright / Cypress | E2E testing is out of scope for v1.6. The milestone focuses on unit, component, and integration tests. E2E requires a running server, browser automation, and significantly more infrastructure. Defer to a future milestone if needed. | MSW + Testing Library for integration-level tests |
| Storybook | Component documentation tool, not a test framework. Useful for design systems with many variants. ClearContract has ~15 components, sole developer -- Storybook adds maintenance overhead without proportional value. | @testing-library/react for component behavior verification |
| happy-dom | Faster than jsdom but incomplete ARIA implementation causes `byRole` query failures with Testing Library. Speed is irrelevant for a test suite under 500 tests. | jsdom |
| nock | HTTP mocking library that patches Node's `http` module. Only works in Node, not in browser-like environments. MSW works in both and intercepts at a higher level. | msw |
| @vitest/browser | Runs tests in a real browser via Playwright/WebDriverIO. Adds complexity (browser binary management, slower execution). jsdom is sufficient for ClearContract's component tests -- no WebGL, canvas, or complex browser API usage. | jsdom environment |
| supertest | Express middleware testing. The API endpoint is a Vercel serverless function (not Express). Testing it directly by importing the handler function is simpler and more accurate. | Direct handler import + MSW for client-side tests |
| c8 | Standalone V8 coverage tool. @vitest/coverage-v8 wraps this with Vitest integration, so installing c8 separately is redundant. | @vitest/coverage-v8 |

---

## Integration with Existing Stack

### Vite Config Extension

Vitest reads from `vite.config.ts` by default. Add a `test` block -- no separate config file needed:

```typescript
// vite.config.ts (additions only)
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/data/mockContracts.ts'],
    },
  },
  // ... existing server config unchanged
})
```

### TypeScript Config

Add Vitest types to tsconfig. The `globals: true` setting makes `describe`, `it`, `expect`, `vi` available without imports:

```jsonc
// tsconfig.json — add to compilerOptions.types
"types": ["vitest/globals"]
```

### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

This single import registers all jest-dom matchers (`.toBeInTheDocument()`, etc.) with Vitest's `expect`. No per-file imports needed.

### MSW Setup Pattern

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/analyze', () => {
    return HttpResponse.json({
      // fixture data matching the AnalysisResponse schema
    })
  }),
]

// src/test/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Server-Side (api/) Testing

The Vercel serverless function (`api/analyze.ts`) uses Node APIs and the Anthropic SDK. Test these with Vitest in the default `node` environment (not jsdom). Use per-file environment override:

```typescript
// @vitest-environment node
```

Or configure in vite.config.ts with `environmentMatchGlobs`:

```typescript
test: {
  environmentMatchGlobs: [
    ['src/**', 'jsdom'],
    ['api/**', 'node'],
  ],
}
```

---

## Installation

```bash
# Core test framework
npm install -D vitest@^3.2.4 @vitest/coverage-v8@^3.2.4

# DOM environment
npm install -D jsdom@^20.8.4

# Component testing
npm install -D @testing-library/react@^16.3.2 @testing-library/jest-dom@^6.9.1 @testing-library/user-event@^14.6.1

# API mocking
npm install -D msw@^2.12.11
```

Total: 7 dev dependencies. Zero runtime dependencies added. Zero impact on production bundle.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Test runner | Vitest 3.2.4 | Jest 29 | Requires ts-jest or @swc/jest for TypeScript. Separate module resolution from Vite. Double maintenance. |
| Test runner | Vitest 3.2.4 | Vitest 4.1.0 | Requires Vite >= 6. Upgrading Vite is out of scope for a testing milestone. |
| DOM env | jsdom | happy-dom | Incomplete ARIA support breaks Testing Library's `byRole` queries. Speed irrelevant at this test suite size. |
| Coverage | @vitest/coverage-v8 | @vitest/coverage-istanbul | V8 is native, faster, zero-config. Istanbul requires instrumentation. V8 accuracy improved in Vitest 3.x with AST remapping. |
| API mock | msw 2.x | vi.mock('fetch') | vi.mock skips the actual fetch pipeline (headers, status codes, error handling). MSW exercises the full client-side API layer. |
| Component test | Testing Library | Enzyme | Enzyme is dead (no React 18 support). Testing Library is the community standard. |
| E2E | Deferred | Playwright | Out of scope. Would require running Vercel dev server, browser binaries, CI browser setup. Not needed for v1.6 goals. |

---

## Version Compatibility Matrix

| Dependency | Required By | Constraint | Status |
|------------|-------------|------------|--------|
| vitest 3.x | Project | Vite >= 5.0 | Vite 5.2.0 installed -- compatible |
| @vitest/coverage-v8 3.x | vitest | Must match vitest major.minor | Will install 3.2.4 to match |
| jsdom 20.x | vitest | Node >= 18 | Node 22.18.0 on this machine -- compatible |
| @testing-library/react 16.x | Project | React >= 18 | React 18.3.1 installed -- compatible |
| @testing-library/jest-dom 6.x | @testing-library/react | vitest or jest | vitest with globals -- compatible |
| @testing-library/user-event 14.x | @testing-library/react | @testing-library/dom >= 9 | Pulled in by @testing-library/react 16 -- compatible |
| msw 2.x | Project | Node >= 18 | Node 22.18.0 -- compatible |

---

## CI Integration Notes

For Vercel-based CI or GitHub Actions:

1. **Coverage thresholds** can be set in vite.config.ts:
   ```typescript
   coverage: {
     thresholds: {
       statements: 60,
       branches: 50,
       functions: 60,
       lines: 60,
     }
   }
   ```
   Start conservative (60%) and ratchet up as coverage grows.

2. **GitHub Actions** workflow needs only `npm ci && npm test` -- no browser binaries, no Docker, no services.

3. **Vercel build** can optionally run tests before deploy by modifying the build command: `npm test && npm run build`. However, a separate GitHub Actions workflow is cleaner (does not block deploy preview generation).

4. **lcov reporter** output integrates with most CI coverage visualization tools (Codecov, Coveralls) if needed later.

---

## Sources

- [Vitest 4.0 announcement -- Vite >= 6 requirement](https://vitest.dev/blog/vitest-4) -- HIGH confidence
- [Vitest coverage guide -- V8 vs Istanbul](https://vitest.dev/guide/coverage.html) -- HIGH confidence
- [MSW Node.js integration docs](https://mswjs.io/docs/integrations/node) -- HIGH confidence
- [MSW Vitest recipe](https://mswjs.io/docs/recipes/vitest-browser-mode/) -- HIGH confidence
- [Testing Library install docs](https://testing-library.com/docs/dom-testing-library/install/) -- HIGH confidence
- [Vitest/jsdom vs happy-dom discussion](https://github.com/vitest-dev/vitest/discussions/1607) -- MEDIUM confidence (community discussion, multiple reports corroborate byRole issues)
- npm registry version checks (2026-03-15) -- HIGH confidence (direct `npm view` queries)

---
*Stack research for: ClearContract v1.6 Quality & Validation (testing infrastructure)*
*Researched: 2026-03-15*
