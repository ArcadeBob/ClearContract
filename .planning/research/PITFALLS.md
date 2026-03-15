# Domain Pitfalls: Adding Test Coverage to Untested React+Vite+TypeScript Codebase

**Domain:** Test infrastructure and coverage for existing 10,800 LOC app
**Researched:** 2026-03-15
**Overall confidence:** HIGH (Vitest/RTL well-documented; project-specific pitfalls verified against codebase)

---

## Critical Pitfalls

Mistakes that cause wasted days, broken CI, or tests that provide false confidence.

### Pitfall 1: Testing Infrastructure and Tests in the Same Phase

**What goes wrong:** Trying to configure Vitest, jsdom, RTL, mocks, CI, and write tests all at once. When tests fail, you cannot tell if the problem is your test logic, your mock setup, your Vitest config, or your CI environment.

**Why it happens:** Natural impulse to "just start writing tests." Without a known-good infrastructure, every failure is ambiguous.

**Consequences:** Hours debugging a test that is actually a config issue. False confidence when tests pass for wrong reasons (e.g., mock returning undefined silently).

**Prevention:** Phase the work strictly:
1. **Infrastructure first:** Vitest config, jsdom/happy-dom, RTL setup, global mocks, CI pipeline -- all verified with ONE trivial test (e.g., `expect(1+1).toBe(2)` and one simple component render).
2. **Core logic tests second:** Pure functions (scoring, merge, bidSignal, storage) that need no DOM.
3. **Component tests third:** Only after mocks and environment are proven.
4. **Integration tests last:** API endpoint tests with full mock chains.

**Detection:** If your first real test file has more than 5 lines of setup/config imports, infrastructure is not ready.

**Phase:** Address in Phase 1 (infrastructure setup), before any test writing.

---

### Pitfall 2: Framer Motion Crashes in jsdom/happy-dom

**What goes wrong:** Components using `motion.div`, `AnimatePresence`, and `useAnimation` throw errors or hang in test environments because jsdom lacks Web Animations API, `requestAnimationFrame` behaves differently, and `AnimatePresence` exit animations never complete.

**Why it happens:** Framer Motion relies on browser animation APIs that jsdom/happy-dom do not fully implement. This project uses Framer Motion extensively -- staggered animations on `FindingCard`, `AnimatePresence` on filtered lists, page transitions.

**Consequences:** Every component test that renders an animated component fails or hangs. Developers waste time debugging "why does my component not render" when it is actually the animation library.

**Prevention:** Create a global Framer Motion mock in `src/__mocks__/framer-motion.ts` that:
- Replaces `motion.div` (and all `motion.*`) with plain HTML elements
- Makes `AnimatePresence` a pass-through wrapper
- Stubs `useAnimation`, `useInView`, etc.

```typescript
// src/__mocks__/framer-motion.ts
import React from 'react';

const actual = await vi.importActual('framer-motion');

// Replace all motion.* with plain elements
const motion = new Proxy({}, {
  get: (_target, prop: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(prop, { ...props, ref })
    ),
});

const AnimatePresence = ({ children }: { children: React.ReactNode }) => children;

export { motion, AnimatePresence };
export const useAnimation = () => ({ start: vi.fn(), stop: vi.fn() });
// Re-export everything else from actual
```

Register via `vi.mock('framer-motion')` in setup file or per-test.

**Detection:** Component tests throw `ReferenceError: requestAnimationFrame is not defined` or tests hang indefinitely.

**Phase:** Address in Phase 1 (infrastructure). This mock must exist before any component test.

**Confidence:** HIGH -- well-documented issue ([framer/motion#285](https://github.com/framer/motion/issues/285), [framer/motion#1690](https://github.com/framer/motion/issues/1690)).

---

### Pitfall 3: Two Test Environments Needed (jsdom for Client, node for Server)

**What goes wrong:** Running all tests with `environment: 'jsdom'` causes server-side code (api/analyze.ts, api/merge.ts, api/scoring.ts) to break because they use Node APIs (Buffer, fs-like operations via unpdf, undici fetch). Running all with `environment: 'node'` breaks component tests that need DOM.

**Why it happens:** This project has a clear client/server split: `src/` is browser code, `api/` is Vercel serverless (Node). Vitest defaults to a single environment.

**Consequences:** Either server tests or client tests fail. Developers add hacks (conditional imports, polyfills) that pollute the test setup.

**Prevention:** Use Vitest's per-file environment control:
- Set default to `node` in vitest.config.ts
- Add `// @vitest-environment jsdom` at top of every component/hook test file
- OR use `environmentMatchGlobs` in config:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node', // default for api/ tests
    environmentMatchGlobs: [
      ['src/**/*.test.{ts,tsx}', 'jsdom'],
    ],
  },
});
```

**Detection:** Tests fail with `document is not defined` (missing jsdom) or `Buffer is not defined` (jsdom interfering with Node globals).

**Phase:** Address in Phase 1 (infrastructure).

**Confidence:** HIGH -- [Vitest docs: Test Environment](https://vitest.dev/guide/environment).

---

### Pitfall 4: localStorage Mocking Inconsistencies Between Environments

**What goes wrong:** Tests for `storageManager.ts`, `contractStorage.ts`, and `useContractStore.ts` behave differently depending on the test environment. In jsdom, `localStorage` exists but `vi.spyOn(localStorage, 'getItem')` throws. In happy-dom, direct spying works. In Node, `localStorage` may not exist at all (or behaves differently in Node 25+).

**Why it happens:** This project's `storageManager.ts` directly calls `localStorage.getItem/setItem/removeItem`. The `StorageResult<T>` wrapper means tests need to verify both success and error paths. The `contractStorage.ts` does JSON parse/stringify with migration logic.

**Consequences:** Tests pass locally but fail in CI (different Node version), or localStorage state leaks between tests causing order-dependent failures.

**Prevention:**
1. **Spy on `Storage.prototype`**, not `localStorage` directly (works in both jsdom and happy-dom):
   ```typescript
   vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
   ```
2. **Clear localStorage in `afterEach`:**
   ```typescript
   afterEach(() => { localStorage.clear(); });
   ```
3. **For `storageManager.ts` unit tests:** Test the pure functions by mocking `Storage.prototype` methods. Verify `StorageResult` shapes for success, parse errors, and `QuotaExceededError`.
4. **Pin Node version in CI** to avoid Node 25+ Web Storage API conflicts (use Node 20 LTS or 22 LTS).

**Detection:** Tests fail with `TypeError: Cannot spy on localStorage.getItem` or tests pass individually but fail when run together.

**Phase:** Address in Phase 1 (infrastructure -- setup file with localStorage cleanup) and Phase 2 (storage unit tests).

**Confidence:** HIGH -- verified against codebase's `storageManager.ts` using `localStorage` directly. [Vitest localStorage testing](https://runthatline.com/vitest-mock-localstorage/), [Node 25 issue](https://github.com/vitest-dev/vitest/issues/8757).

---

### Pitfall 5: Mocking the Anthropic SDK Incorrectly

**What goes wrong:** Tests for `api/analyze.ts` mock `@anthropic-ai/sdk` at the wrong level -- either too shallow (mock the class but not the chained method calls like `client.messages.create()`) or too deep (mock internal HTTP calls, breaking on SDK updates). The 17-pass pipeline means the mock must handle being called 17+ times with different structured output schemas.

**Why it happens:** The Anthropic SDK has a nested API: `new Anthropic() -> client.messages.create()` (and in this project, also `client.files.upload()` for the Files API). Additionally, the project uses `zodToJsonSchema()` to convert Zod schemas to JSON Schema for structured outputs, so mock responses must match the expected schema shapes.

**Consequences:** Tests silently return undefined instead of proper mock data, causing downstream code to throw on property access. Or tests are so tightly coupled to SDK internals that any SDK update breaks all tests.

**Prevention:**
1. **Mock at the SDK class level:**
   ```typescript
   vi.mock('@anthropic-ai/sdk', () => ({
     default: vi.fn().mockImplementation(() => ({
       files: { upload: vi.fn().mockResolvedValue({ id: 'file-mock-123' }) },
       messages: {
         create: vi.fn().mockResolvedValue({
           content: [{ type: 'text', text: JSON.stringify(mockPassResult) }],
         }),
       },
     })),
   }));
   ```
2. **Create fixture factory functions** that produce valid `PassResult`, `RiskOverviewResult`, and `SynthesisPassResult` objects matching the Zod schemas. Validate fixtures against schemas in a dedicated test:
   ```typescript
   expect(PassResultSchema.safeParse(mockPassResult).success).toBe(true);
   ```
3. **Do NOT mock `undici` or `fetch` inside the SDK.** Mock the SDK's public API only.
4. **For the 17-pass pipeline:** Use `mockResolvedValueOnce()` chained 17 times, or a stateful mock that returns different responses based on the system prompt content.

**Detection:** Tests pass but with `undefined` values propagating silently. Or tests break on Anthropic SDK minor version bumps.

**Phase:** Address in Phase 2 (API test fixtures) and Phase 4 (integration tests).

**Confidence:** HIGH -- verified against `api/analyze.ts` which uses `client.files.upload()` then `client.messages.create()` in a loop.

---

### Pitfall 6: Writing Tests That Cannot Fail (False Confidence)

**What goes wrong:** When adding tests to an existing working codebase, every test passes on first run. Developers never verify the test can actually catch a regression. Tests assert on implementation details that are always true, or assertions are too loose (e.g., `expect(result).toBeDefined()` on a function that always returns an object).

**Why it happens:** Unlike TDD where you write a failing test first, retrofitting tests means the code already works. The "red" phase is skipped entirely. Combined with complex mocks, it is easy to write tests where the mock silently satisfies the assertion without the real code path being exercised.

**Consequences:** 100% passing test suite that catches zero regressions. False confidence leads to removing manual verification too early.

**Prevention:**
1. **Mutation testing mindset:** After writing a test, temporarily break the code under test and verify the test fails. For critical paths (risk scoring, merge logic), this is mandatory.
2. **Assert on specific values, not existence:**
   ```typescript
   // BAD: always passes
   expect(computeRiskScore(findings)).toBeDefined();
   // GOOD: catches regressions
   expect(computeRiskScore(findings).score).toBe(67);
   ```
3. **For Zod validation tests:** Test both valid AND invalid inputs. Verify that `.safeParse()` returns `success: false` for malformed data.
4. **Coverage alone is not enough.** A line can be "covered" by a test that never asserts on it.

**Detection:** Run `vitest --coverage` and look for files with high coverage but only `toBeDefined`/`toBeTruthy` assertions.

**Phase:** Ongoing discipline, but establish the pattern in Phase 2 (first real tests).

**Confidence:** HIGH -- universal testing pitfall, especially acute for retrofit testing. [Stack Overflow: Making your code base better will make your code coverage worse](https://stackoverflow.blog/2025/12/22/making-your-code-base-better-will-make-your-code-coverage-worse/).

---

## Moderate Pitfalls

### Pitfall 7: Vitest Config Conflicts with Existing Vite Config

**What goes wrong:** Vitest reads `vite.config.ts` by default and inherits plugins, resolve aliases, and other settings. Some Vite plugins (e.g., ones that inject HTML, or Vercel-specific transforms) break in test context. Or the `define` config injects values that conflict with test globals.

**Prevention:**
- Use `vitest.config.ts` (separate file) that extends `vite.config.ts` with `mergeConfig`:
  ```typescript
  import { defineConfig, mergeConfig } from 'vitest/config';
  import viteConfig from './vite.config';

  export default mergeConfig(viteConfig, defineConfig({
    test: { /* vitest-specific settings */ },
  }));
  ```
- Exclude problematic plugins from the test config if needed.
- Verify `resolve.alias` settings work for both `src/` imports and `api/` imports in tests.

**Phase:** Phase 1 (infrastructure).

**Confidence:** HIGH -- [Vitest docs: Configuring](https://vitest.dev/config/).

---

### Pitfall 8: Testing Custom Hooks That Depend on localStorage

**What goes wrong:** `useContractStore` calls `loadContracts()` in its `useState` initializer, which reads from `localStorage`. Testing this hook with `renderHook` requires localStorage to be pre-populated BEFORE the hook renders. Developers mock localStorage AFTER render and wonder why initial state is empty.

**Prevention:**
- Pre-populate localStorage in `beforeEach` BEFORE calling `renderHook`:
  ```typescript
  beforeEach(() => {
    localStorage.setItem('clearcontract:contracts', JSON.stringify(mockContracts));
    localStorage.setItem('clearcontract:schema-version', '"2"');
  });
  ```
- Use `renderHook` from `@testing-library/react`, NOT the deprecated `@testing-library/react-hooks` package.
- Remember: `result.current` is reactive -- do NOT destructure it outside of assertions.

**Phase:** Phase 3 (hook tests).

**Confidence:** HIGH -- verified against `useContractStore.ts` which calls `loadContracts()` in initial `useState`.

---

### Pitfall 9: VercelRequest/VercelResponse Mocking Complexity

**What goes wrong:** `api/analyze.ts` expects `VercelRequest` and `VercelResponse` objects which are complex Node.js IncomingMessage/ServerResponse extensions. Naive mocks miss properties like `req.method`, `req.body` (already parsed by Vercel), `res.status().json()` chaining, or CORS headers.

**Prevention:**
- Create reusable mock factories:
  ```typescript
  function createMockReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
    return {
      method: 'POST',
      body: { contractPdf: 'base64...', fileName: 'test.pdf' },
      headers: {},
      ...overrides,
    } as VercelRequest;
  }

  function createMockRes(): VercelResponse & { _json: any; _status: number } {
    const res = {
      _json: null,
      _status: 200,
      status(code: number) { res._status = code; return res; },
      json(data: any) { res._json = data; return res; },
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    return res as any;
  }
  ```
- Test the handler function directly (it is a default export), not through HTTP.
- For CORS/validation tests, verify specific status codes (400, 401, 405, 422, 429).

**Phase:** Phase 4 (API integration tests).

**Confidence:** MEDIUM -- based on [mock VercelRequest gist](https://gist.github.com/unicornware/2a1b03ef53dfc55e6fc16265dabaf056) and `api/analyze.ts` code review.

---

### Pitfall 10: Attempting 80%+ Coverage Too Early

**What goes wrong:** Setting aggressive coverage targets before the testing infrastructure is mature. Teams write low-quality tests to hit numbers, skip edge cases, and avoid testing the hard parts (async API pipeline, error recovery, migration logic).

**Prevention:**
- **Start with zero target.** Focus on testing the highest-value code first:
  1. `api/scoring.ts` -- pure function, deterministic, easy to test, high business value
  2. `api/merge.ts` -- complex logic, dedup, finding unification
  3. `src/storage/storageManager.ts` -- storage wrapper with error handling
  4. `src/schemas/finding.ts` -- Zod schema validation
  5. `src/utils/bidSignal.ts` -- pure function, business logic
- **Set coverage targets only after Phase 2** (core logic tests) is complete.
- **Exclude certain files** from coverage initially: knowledge modules (static data), mock data, type-only files.

**Phase:** Coverage targets in Phase 3 or later, not Phase 1.

**Confidence:** HIGH -- universal best practice. [Codecov: Legacy Application Coverage](https://about.codecov.io/blog/how-to-incorporate-code-coverage-for-a-legacy-application/).

---

### Pitfall 11: CI Pipeline Secrets and Environment Variables

**What goes wrong:** Tests that touch `api/analyze.ts` fail in CI because `ANTHROPIC_API_KEY` is not set. Or worse, tests accidentally call the real Anthropic API in CI, consuming tokens and being flaky.

**Prevention:**
- **Never let tests reach the real API.** Mock the Anthropic SDK at module level so it is impossible for a test to make a real API call even if the env var is set.
- Set `ANTHROPIC_API_KEY=test-key-not-real` in CI environment to prevent "missing key" validation errors in code paths that check for the key's existence before mocking kicks in.
- For live integration tests (manual trigger), use a separate CI workflow with `workflow_dispatch` and actual secrets.
- **GitHub Actions secrets:** Add `ANTHROPIC_API_KEY` only to the manual integration test workflow, not the PR check workflow.

**Phase:** Phase 1 (CI setup -- ensure mocked tests never need real keys).

**Confidence:** HIGH -- project has `ANTHROPIC_API_KEY` check in `api/analyze.ts` that returns 401.

---

### Pitfall 12: GitHub Actions Runner Performance

**What goes wrong:** Tests that run in 5 seconds locally take 45+ seconds in CI. The GitHub-hosted runner has 2 CPU cores vs. your local 8+. Vitest's default thread pool creates too many workers, causing thrashing.

**Prevention:**
- Set `pool: 'forks'` and limit concurrency in CI:
  ```yaml
  - run: npx vitest run --reporter=github-actions
    env:
      VITEST_MAX_FORKS: 2
  ```
- Use `--reporter=github-actions` for inline annotations on test failures.
- For large test suites later, consider `--shard` to split across parallel jobs.
- Cache `node_modules` in GitHub Actions:
  ```yaml
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: 'npm'
  ```

**Phase:** Phase 1 (CI setup).

**Confidence:** HIGH -- [vitest-dev/vitest discussion #6223](https://github.com/vitest-dev/vitest/discussions/6223).

---

## Minor Pitfalls

### Pitfall 13: Importing from `api/` in Tests Pulls in Side Effects

**What goes wrong:** `api/analyze.ts` has top-level side-effect imports (`import '../src/knowledge/regulatory/index'`) that register knowledge modules globally. Importing the merge or scoring functions in a test inadvertently triggers module registration, which may conflict with mocks or cause ordering issues.

**Prevention:**
- Test `api/scoring.ts` and `api/merge.ts` in isolation -- they do not have side-effect imports.
- For `api/analyze.ts` integration tests, let the side effects run (they register knowledge modules, which is the correct behavior).
- If needed, use `vi.resetModules()` between tests that import from `api/analyze.ts`.

**Phase:** Phase 2 (when writing scoring/merge tests) and Phase 4 (API integration tests).

---

### Pitfall 14: Zod Schema Tests Duplicating What TypeScript Already Checks

**What goes wrong:** Writing tests that verify a Zod schema accepts valid data when TypeScript's type system already guarantees the fixture is well-typed. These tests add noise without catching real bugs.

**Prevention:**
- **DO test:** Invalid inputs, edge cases, discriminated union dispatch, migration compatibility (v1 data through v2 schema).
- **DO test:** That `MergedFindingSchema.safeParse()` rejects data missing required fields like `actionPriority` (tests the v1-to-v2 boundary).
- **DO NOT test:** That a correctly-typed TypeScript object passes validation (TypeScript already enforces this at compile time).
- **High-value Zod tests for this project:**
  - `LegalMetaSchema` discriminated union: verify each of the 11 clauseType variants
  - `ScopeMetaSchema` discriminated union: verify each of the 4 passType variants
  - API response validation: verify that malformed AI responses are caught

**Phase:** Phase 2 (schema tests alongside core logic tests).

---

### Pitfall 15: React Dropzone and File Upload Testing

**What goes wrong:** `UploadZone` uses `react-dropzone` which relies on drag-and-drop events and `File` objects. Creating realistic `File` objects in jsdom is awkward, and `DataTransfer` is not fully implemented.

**Prevention:**
- Use RTL's `fireEvent.drop()` with a manually constructed file:
  ```typescript
  const file = new File(['pdf-content'], 'test.pdf', { type: 'application/pdf' });
  const dropzone = screen.getByTestId('upload-zone');
  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
  ```
- For the 10MB limit validation, create a `File` with a mock `size` property.
- Consider these tests lower priority -- the upload flow is simple and the interesting logic is in the API, not the dropzone.

**Phase:** Phase 3 (component tests), lower priority.

---

### Pitfall 16: Test File Organization Mirroring Source Structure Too Rigidly

**What goes wrong:** Creating `src/utils/__tests__/bidSignal.test.ts` for every file leads to deeply nested test directories. Developers struggle to find tests or forget to create them for new files.

**Prevention:**
- **Co-locate test files:** `src/utils/bidSignal.test.ts` next to `src/utils/bidSignal.ts`. Vitest finds `*.test.ts` files anywhere by default.
- **For api/ tests:** Place in `api/__tests__/` or `api/scoring.test.ts` co-located.
- **Configure in vitest.config.ts:**
  ```typescript
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
  }
  ```

**Phase:** Phase 1 (convention decision, before any tests are written).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Infrastructure setup (Phase 1) | Config conflicts with vite.config.ts (#7), dual environments (#3) | Use separate vitest.config.ts, environmentMatchGlobs |
| Infrastructure setup (Phase 1) | Framer Motion crashes (#2) | Global mock in setup file, verified with one component render |
| Infrastructure setup (Phase 1) | CI runner perf (#12), secrets leaking (#11) | Pin Node version, cache deps, mock SDK at module level |
| Core logic tests (Phase 2) | Tests that cannot fail (#6) | Mutation testing mindset, assert on specific values |
| Core logic tests (Phase 2) | Side-effect imports from api/ (#13) | Test scoring/merge in isolation first |
| Schema tests (Phase 2) | Duplicating TypeScript checks (#14) | Focus on invalid inputs, discriminated unions, migration |
| Hook/Component tests (Phase 3) | localStorage timing (#8), renderHook misuse | Pre-populate storage before renderHook |
| Hook/Component tests (Phase 3) | Coverage target pressure (#10) | Defer targets until core logic is covered |
| API integration tests (Phase 4) | Anthropic SDK mock depth (#5) | Mock at class level, validate fixtures against Zod schemas |
| API integration tests (Phase 4) | VercelRequest/Response complexity (#9) | Reusable mock factories |

---

## Sources

### Official Documentation (HIGH confidence)
- [Vitest: Configuring](https://vitest.dev/config/)
- [Vitest: Test Environment](https://vitest.dev/guide/environment)
- [Vitest: Mocking](https://vitest.dev/guide/mocking)
- [Vitest: Mocking Requests](https://vitest.dev/guide/mocking/requests)

### Verified Community Sources (MEDIUM confidence)
- [React Testing Library + Vitest: Common Mistakes](https://medium.com/@samueldeveloper/react-testing-library-vitest-the-mistakes-that-haunt-developers-and-how-to-fight-them-like-ca0a0cda2ef8)
- [Vitest localStorage Testing](https://runthatline.com/vitest-mock-localstorage/)
- [Mocking framer-motion v9](https://dev.to/pgarciacamou/mocking-framer-motion-v9-7jh)
- [framer/motion#285: AnimatePresence with RTL](https://github.com/framer/motion/issues/285)
- [Mock VercelRequest/VercelResponse Gist](https://gist.github.com/unicornware/2a1b03ef53dfc55e6fc16265dabaf056)
- [Codecov: Legacy Application Coverage](https://about.codecov.io/blog/how-to-incorporate-code-coverage-for-a-legacy-application/)
- [Stack Overflow: Code Coverage Paradox](https://stackoverflow.blog/2025/12/22/making-your-code-base-better-will-make-your-code-coverage-worse/)

### Issue Trackers (MEDIUM confidence)
- [Node v25 breaks tests with Web Storage API (vitest#8757)](https://github.com/vitest-dev/vitest/issues/8757)
- [jsdom localStorage opaque origins (vitest#1605)](https://github.com/vitest-dev/vitest/issues/1605)
- [framer/motion#1690: Feature request for test mocks](https://github.com/framer/motion/issues/1690)
- [Slow CI test suite (vitest#6223)](https://github.com/vitest-dev/vitest/discussions/6223)

### Codebase Verification (HIGH confidence)
- `api/analyze.ts` -- verified Anthropic SDK usage pattern, VercelRequest/Response handler, ANTHROPIC_API_KEY check
- `src/storage/storageManager.ts` -- verified direct localStorage access, StorageResult wrapper
- `src/hooks/useContractStore.ts` -- verified localStorage read in useState initializer
- `src/schemas/finding.ts` -- verified Zod discriminated unions (11 LegalMeta + 4 ScopeMeta variants)
- `api/scoring.ts` -- verified pure function, ideal first test target
