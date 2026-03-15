# Project Research Summary

**Project:** ClearContract v1.6 Quality & Validation
**Domain:** Test infrastructure for existing React+Vite+TypeScript AI contract review app
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

ClearContract v1.6 adds a comprehensive test suite to a shipped 10,809-LOC application that currently has zero test infrastructure. The project has a clean three-layer architecture (pure logic / React components+hooks / Vercel API handlers) that is already highly testable without modifying any production code. The recommended approach is Vitest 3.2.4 (constrained to 3.x by the existing Vite 5 dependency) with React Testing Library, jsdom, and direct handler import for API tests — a total of 7 dev-only dependencies with zero runtime impact.

The central challenge is the 17-pass AI analysis pipeline: it calls Claude 17 times per analysis run, is non-deterministic, and costs real money per invocation. The correct solution is a strict separation between fast/free/deterministic mock-based regression tests (which run on every change) and a separate manual live-API test suite (which runs before releases). This separation must be established in Phase 1 and maintained throughout; blurring it is the most costly mistake possible in this milestone.

The work must be phased strictly: infrastructure first, pure logic tests second, component and hook tests third, API integration tests last. Attempting to configure Vitest and write tests simultaneously is the leading cause of wasted time when retrofitting test coverage onto an existing codebase. The existing architecture (pure functions for scoring/merge, Zod schemas as runtime validators, hooks using plain useState) makes this work straightforward once infrastructure is proven with a trivial passing test.

---

## Key Findings

### Recommended Stack

Vitest 3.2.4 is the only viable test runner choice: it reuses the existing Vite 5 transform pipeline so TypeScript, JSX, and path aliases work identically between tests and production. Vitest 4.x requires Vite 6 and is out of scope. The full testing stack is 7 dev dependencies with zero runtime additions and zero production bundle impact.

**Core technologies:**
- `vitest@^3.2.4`: Test runner and assertion library — native Vite integration, Jest-compatible API, zero separate transform config needed
- `@vitest/coverage-v8@^3.2.4`: Code coverage — V8-native, zero-config, accurate AST remapping; must match vitest major.minor
- `jsdom@^20.8.4`: DOM environment for component tests — more complete ARIA implementation than happy-dom; `byRole` queries work correctly
- `@testing-library/react@^16.3.2`: Component rendering and queries — React 18 compatible, industry standard
- `@testing-library/jest-dom@^6.9.1`: DOM assertion matchers (`.toBeInTheDocument()`, `.toHaveTextContent()`, etc.)
- `@testing-library/user-event@^14.6.1`: Realistic user interaction simulation for drag-and-drop, form inputs, keyboard
- `msw@^2.12.11`: Network-level API mocking for component tests — exercises the full fetch pipeline including headers, status codes, and error handling

**What not to add:** Jest (separate transform pipeline), Playwright/Cypress (E2E out of scope), Storybook (design system tool, not a test framework), happy-dom (incomplete ARIA breaks Testing Library), supertest (Express-specific, not applicable to Vercel functions).

### Expected Features

The "features" of this milestone are test suites and infrastructure, not user-facing functionality. The critical organizing principle is the mock-based / live-API split.

**Must have (table stakes):**
- Vitest + RTL setup with vitest.config.ts — unblocks everything; nothing runs without this
- Test fixtures module (`src/test-utils/factories.ts`) — type-safe Contract/Finding builders; prevents test data rot across all subsequent tests
- Unit tests: `computeRiskScore` + `applySeverityGuard` — most important business logic in the app
- Unit tests: `computeBidSignal`, `classifyError`, `storageManager` — pure functions, high value, low complexity
- Unit tests: `mergePassResults` — most complex pure logic; requires fixture data for all 16 pass schemas
- Unit tests: `contractStorage` — migration logic (v1->v2) and first-visit seeding behavior
- Unit tests: Zod schema validation — discriminated unions (11 LegalMeta + 4 ScopeMeta variants), invalid input rejection
- Component tests: SeverityBadge, FindingCard, RiskScoreDisplay, BidSignalWidget, FilterToolbar
- API endpoint integration tests (mocked Claude) — validates request/response pipeline, all error paths (400/401/405/422/429)
- Manual UAT checklist — structured human verification document replacing ad-hoc testing
- `npm run test` and `npm run test:coverage` scripts

**Should have (differentiators):**
- Hook tests: `useContractFiltering`, `useContractStore` — state management with localStorage side effects
- Live API integration test suite (manual trigger, `npm run test:live`) — real API, validates end-to-end against schema drift
- Coverage threshold enforcement in vitest.config.ts — fail CI below conservative thresholds; ratchet up over time
- Snapshot tests for API response shapes — catches accidental schema drift automatically
- `test/fixtures/*.json` — captured real API responses validated against Zod schemas at test time

**Defer to later:**
- Component tests for upload flow — react-dropzone event mocking is finicky; manual UAT covers this adequately
- Routing hook tests — History API in jsdom is unreliable; navigation covered by UAT
- PDF export verification — jsPDF in jsdom is smoke-test only; visual inspection is more valuable
- E2E tests (Playwright/Cypress) — browser automation overhead for marginal value on a sole-developer tool
- Visual regression testing — overkill; sole developer sees every UI change before deploying

### Architecture Approach

The test architecture maps directly to the existing three-layer production structure. A separate `vitest.config.ts` (using `mergeConfig` from `vite.config.ts`) keeps test concerns out of the production build config and inherits the React plugin without duplication. The `environmentMatchGlobs` config assigns jsdom to `src/**` and node to `api/**`, resolving the dual-environment requirement without per-file annotations.

**Major components:**
1. `vitest.config.ts` — test runner config extending vite.config.ts; environmentMatchGlobs splits jsdom (src) from node (api); coverage targets focus on utils/hooks/schemas
2. `test/setup.ts` — global jest-dom matchers, RTL cleanup afterEach, localStorage.clear() afterEach
3. `src/test-utils/` — custom render wrapping ToastProvider context, type-safe factories for Contract/Finding, localStorage seed helpers
4. `test/fixtures/*.json` — captured real API responses; Zod-validated in a dedicated test so schema drift breaks tests automatically
5. `src/__tests__/` and `api/__tests__/` — test files in `__tests__/` directories mirroring production structure; keeps production source tree clean

**Key patterns:**
- Vercel handlers tested by direct import with mock VercelRequest/VercelResponse objects — no HTTP overhead, no supertest
- Anthropic SDK mocked at class level via `vi.mock('@anthropic-ai/sdk')` — all 17 pass calls intercepted with `mockResolvedValueOnce()` chains
- localStorage spied via `Storage.prototype` (not `localStorage` directly) — jsdom proxies through prototype; direct spies miss calls
- All fixture data validated against Zod schemas in their own test — stale fixtures break tests rather than silently passing

### Critical Pitfalls

1. **Infrastructure and tests in the same phase** — Attempting to configure Vitest and write real tests simultaneously makes failures ambiguous. Prove infrastructure with a trivial test (`expect(1+1).toBe(2)` plus one component render) before writing any business logic tests. If your first real test has more than 5 lines of setup imports, infrastructure is not ready.

2. **Framer Motion crashes in jsdom** — The project uses Framer Motion extensively (staggered FindingCard animations, AnimatePresence on filtered lists). jsdom lacks Web Animations API, causing `requestAnimationFrame is not defined` errors or test hangs. Create a global mock in `src/__mocks__/framer-motion.ts` replacing `motion.*` with plain elements and making `AnimatePresence` a pass-through. Must exist before any component test.

3. **Single Vitest environment for both client and server code** — `src/` needs jsdom; `api/` needs Node. A single environment breaks one or the other. Fix with `environmentMatchGlobs` in vitest.config.ts: `['src/**/*.test.{ts,tsx}', 'jsdom']` and `['api/**/*.test.ts', 'node']`.

4. **Mocking Anthropic SDK at the wrong level** — The SDK uses nested chained calls (`client.files.upload()` then `client.messages.create()` × 17). Mock at the class level with `vi.mock('@anthropic-ai/sdk')`. Validate all mock fixture objects against their Zod schemas — if a fixture fails `schema.safeParse()`, the test is testing a fiction, not the real code path.

5. **Tests that cannot fail (false confidence)** — Retrofitting tests on working code means every test passes on first run. After writing a critical test, temporarily break the code under test and verify the test fails. Assert specific values (`expect(score).toBe(67)`), not existence (`expect(score).toBeDefined()`). Most important for `computeRiskScore` and `mergePassResults`.

6. **localStorage timing in hook tests** — `useContractStore` calls `loadContracts()` inside its `useState` initializer. Pre-populate localStorage BEFORE calling `renderHook`, not after. Spy via `Storage.prototype.getItem`, not `localStorage.getItem` directly — jsdom proxies through the prototype and direct spies miss calls.

---

## Implications for Roadmap

Based on combined research, the milestone maps cleanly into four phases with strict dependency ordering. Each phase produces a proven foundation the next phase depends on.

### Phase 1: Infrastructure Foundation
**Rationale:** Nothing else runs without this. Every subsequent test depends on Vitest config, the environment split, the Framer Motion mock, the global setup file, and the test utilities. Ambiguous failures compound if infrastructure is not isolated and proven first. This phase ends with one trivial passing test and a confirmed `npm run test` that exits cleanly.
**Delivers:** `vitest.config.ts` (mergeConfig + environmentMatchGlobs), `tsconfig.test.json`, `test/setup.ts` (jest-dom + cleanup + localStorage.clear), `src/test-utils/factories.ts` + `render.tsx` + `storage-mock.ts`, `.gitignore coverage/` entry, package.json scripts, Framer Motion global mock.
**Addresses:** Table stakes — "Vitest + RTL setup", "test scripts", "test fixtures module"
**Avoids:** Pitfall 1 (infrastructure/tests mixed), Pitfall 2 (Framer Motion), Pitfall 3 (dual environments), Pitfall 7 (vite config conflicts), Pitfall 11 (CI secrets — mock SDK at module level so tests cannot reach real API), Pitfall 12 (CI runner performance — VITEST_MAX_FORKS=2 in CI config)

### Phase 2: Pure Logic Tests
**Rationale:** Pure functions (no DOM, no React) are the highest-value, lowest-complexity tests. They validate the core business logic driving every user-visible output. Writing these first builds confidence in the test infrastructure before adding DOM or mock complexity. They also produce the fixture data shapes all subsequent phases depend on.
**Delivers:** Unit tests for `computeRiskScore`, `applySeverityGuard`, `computeBidSignal`, `classifyError`, `storageManager`, `contractStorage`, Zod schemas (`finding.ts`, `analysisResult.ts`), and `mergePassResults`. Fixture data covering all 16 pass schemas, validated against Zod schemas.
**Addresses:** All "Must have" unit tests from FEATURES.md
**Avoids:** Pitfall 6 (false confidence — mutation testing mindset established here; temporarily break code and verify test fails), Pitfall 13 (api/ side effects — test scoring/merge in isolation, not through analyze.ts), Pitfall 14 (Zod tests duplicating TypeScript — focus on invalid inputs and discriminated union dispatch)

### Phase 3: Component and Hook Tests
**Rationale:** Component tests depend on the custom render wrapper, fixture factories, and proven Framer Motion mock from Phases 1-2. Hook tests depend on proven localStorage mock patterns from Phase 2 storage tests. Writing these after pure logic tests means any RTL setup issues are isolated to this phase rather than intermingled with business logic failures.
**Delivers:** Component tests for SeverityBadge, FindingCard, RiskScoreDisplay, BidSignalWidget, FilterToolbar, ConfirmDialog. Hook tests for `useContractFiltering` and `useContractStore` (CRUD + localStorage persistence verification).
**Addresses:** "Must have" component tests; "Should have" hook tests from FEATURES.md
**Avoids:** Pitfall 8 (localStorage timing — pre-populate before renderHook, pattern proven in Phase 2 storage tests), Pitfall 10 (coverage target pressure — defer threshold configuration until Phase 3 baseline is complete)

### Phase 4: Integration Tests + Validation Artifacts
**Rationale:** API handler tests require the most elaborate mock setup (Anthropic SDK class mock, 17 `mockResolvedValueOnce()` calls, VercelRequest/Response factories). Writing these last means all mock patterns are proven and fixture data exists. The UAT checklist and live API test suite complete the validation milestone.
**Delivers:** `api/__tests__/analyze.test.ts` (mocked Claude, all validation paths: 400/401/405/422/429), captured `test/fixtures/*.json` with schema-validation regression tests, manual UAT checklist document in `.planning/`, live API test suite (`npm run test:live`, manual trigger only, never in CI), coverage thresholds configured.
**Addresses:** "Must have" API integration tests; "Should have" live suite and coverage enforcement from FEATURES.md
**Avoids:** Pitfall 5 (Anthropic SDK mock depth — class-level mock, fixture Zod-validation), Pitfall 9 (VercelRequest/Response complexity — reusable factory pattern applied from Phase 1 established convention)

### Phase Ordering Rationale

- Infrastructure before everything: no test of any kind runs without vitest.config.ts, jsdom, and the Framer Motion mock. One trivial test verifies the full chain before any real test is written.
- Pure functions before components: pure functions have no DOM or mock dependencies. They find infrastructure bugs cheaply (wrong path alias, missing type, broken import) without introducing RTL or animation complexity.
- Fixtures during Phase 2: `mergePassResults` requires fixture data for all 16 pass schemas; component tests use realistic Contract/Finding data. Building fixtures once during Phase 2 eliminates copy-paste across all later test files.
- API handler tests last: they require the most elaborate mock chains. By Phase 4, every pattern used (vi.mock module level, fixture factories, mock factories for req/res) has been proven at a simpler level in earlier phases.
- Live API tests always manual: this is a hard architectural constraint, not a convenience deferral. Tests that call the real Anthropic API must never run in CI.

### Research Flags

Phases likely needing extra time — budget accordingly:
- **Phase 2 (mergePassResults):** Rated HIGH complexity in FEATURES.md. The merge function handles 16 pass schemas, deduplication by clauseReference+category, severity ranking preference, specialized-pass preference over generic, and failed-pass-to-Critical-finding conversion. Fixture data must cover all 16 schema variants as valid Zod-parseable objects. The test file alone may be 200+ lines. Budget at least a full day.
- **Phase 4 (API handler tests):** Rated HIGH complexity in FEATURES.md. The Anthropic mock must handle 17 sequential calls returning different schema shapes. Use `mockResolvedValueOnce()` chained × 17 or a stateful mock dispatching on system prompt content. VercelRequest/Response mock factories must cover all tested code paths (method check, body validation, CORS headers, error classification).

Phases with well-documented patterns — standard execution:
- **Phase 1 (infrastructure):** The mergeConfig pattern, environmentMatchGlobs, jsdom setup, and Framer Motion mock are all official features with extensive documentation and community examples.
- **Phase 3 (component/hook tests):** React Testing Library `renderHook` and custom render wrappers are standard documented patterns. No novel approaches required.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version constraints verified against npm registry (2026-03-15 direct queries) and official changelogs. Vitest 3.x / Vite 5 compatibility confirmed via Vitest 4.0 announcement. All 7 libraries version-compatible with existing deps. |
| Features | HIGH | Feature scope derived from direct codebase inspection of all 23 components, 7 hooks, and 10 utility modules. Zero assumptions about unseen code. Complexity ratings grounded in actual LOC and dependency depth. |
| Architecture | HIGH | Patterns from official Vitest and RTL docs cross-referenced against direct production code inspection. The three-layer separation (pure logic / React / Vercel handler) already exists in production and maps cleanly to test tooling. |
| Pitfalls | HIGH | All 6 critical pitfalls verified against codebase: Framer Motion usage confirmed in FindingCard/ContractReview, localStorage in useState initializer confirmed in useContractStore, dual environments confirmed by api/ vs src/ split, Anthropic SDK nested API confirmed in api/analyze.ts. |

**Overall confidence:** HIGH

### Gaps to Address

- **MSW vs. vi.fn() for component tests:** STACK.md recommends MSW; FEATURES.md lists it as an anti-feature for a single-endpoint app. The resolution: use MSW for component tests that exercise `analyzeContract.ts` (verifies the full fetch pipeline including error codes); use `vi.spyOn(globalThis, 'fetch')` for simpler cases. Pick one convention in Phase 1 and document it in a comment in the setup file.

- **Test file co-location vs. `__tests__/` directories:** ARCHITECTURE.md recommends `__tests__/` directories; PITFALLS.md recommends co-location. Both work with Vitest's default glob. Decide in Phase 1 before any test files are created. Recommendation: `__tests__/` directories keep the production source tree visually clean — existing source files are familiar without test files interspersed.

- **Coverage threshold values:** Research recommends starting conservative (60% statements/functions, 50% branches) and ratcheting up. Actual achievable thresholds depend on how much animation code, icon/palette constants, and static mock data is excluded from coverage scope. Set thresholds after Phase 3 baseline is established, not before.

- **Fixture capture timing:** `test/fixtures/*.json` requires running a real analysis via `vercel dev` to capture. This should happen during or after Phase 4, not before. Until then, Phase 2 uses factory-built in-memory fixture objects; Phase 4 uses both in-memory factories and at least one captured real-response fixture.

---

## Sources

### Primary (HIGH confidence)
- Vitest official docs (configuration, environments, mocking, coverage) — https://vitest.dev/guide/
- Vitest 4.0 announcement (Vite >= 6 requirement) — https://vitest.dev/blog/vitest-4
- Vitest coverage guide (V8 vs Istanbul) — https://vitest.dev/guide/coverage.html
- MSW Node.js integration docs — https://mswjs.io/docs/integrations/node
- Testing Library install and setup — https://testing-library.com/docs/dom-testing-library/install/
- npm registry version checks (direct `npm view` queries) — 2026-03-15
- Direct codebase inspection: api/analyze.ts (443 lines), api/merge.ts (555 lines), api/scoring.ts (107 lines), src/utils/bidSignal.ts (138 lines), src/utils/errors.ts (113 lines), src/storage/storageManager.ts (127 lines), src/storage/contractStorage.ts (105 lines), src/schemas/finding.ts (175 lines), all 23 components, all 7 hooks, package.json (zero test deps confirmed)

### Secondary (MEDIUM confidence)
- Vitest/jsdom vs. happy-dom byRole issues — https://github.com/vitest-dev/vitest/discussions/1607
- framer/motion + RTL issues — https://github.com/framer/motion/issues/285, https://github.com/framer/motion/issues/1690
- Mock VercelRequest/VercelResponse — https://gist.github.com/unicornware/2a1b03ef53dfc55e6fc16265dabaf056
- Vitest localStorage testing — https://runthatline.com/vitest-mock-localstorage/
- Node v25 Web Storage API conflict — https://github.com/vitest-dev/vitest/issues/8757
- Slow CI thread pool — https://github.com/vitest-dev/vitest/discussions/6223
- Mocking framer-motion v9 — https://dev.to/pgarciacamou/mocking-framer-motion-v9-7jh

### Tertiary (LOW confidence)
- Coverage for legacy applications — https://about.codecov.io/blog/how-to-incorporate-code-coverage-for-a-legacy-application/ — general guidance, not project-specific
- Code coverage paradox — https://stackoverflow.blog/2025/12/22/making-your-code-base-better-will-make-your-code-coverage-worse/ — universal pitfall context

---
*Research completed: 2026-03-15*
*Supersedes: 2026-03-14 v1.5 research summary (v1.5 shipped; this is v1.6 research)*
*Ready for roadmap: yes*
