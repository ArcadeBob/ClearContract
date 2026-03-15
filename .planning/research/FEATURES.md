# Feature Landscape

**Domain:** Test framework, UAT tooling, and automated regression for React+Vite AI contract review app
**Researched:** 2026-03-15
**Confidence:** HIGH (stack decisions based on Vite ecosystem norms; feature scope from direct codebase inspection)

---

## Context: What This Milestone Is

v1.6 adds test coverage and validation to a shipped, working application with ~10,809 LOC. There are zero user-facing features. The "features" are test infrastructure, test suites, and a UAT protocol. The app has no test framework today -- `package.json` has zero test-related dependencies.

The primary challenge is not "what to test" but "how to test a 17-pass AI pipeline that costs real money per invocation and produces non-deterministic output." The answer is a clear separation: mock-based regression tests run on every change (fast, free, deterministic); live API tests run manually before releases (slow, expensive, validates real behavior).

---

## Table Stakes

Features the test suite must have. Missing any of these means the test infrastructure is incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Vitest + RTL setup with Vite config | Vitest is the canonical test runner for Vite projects. React Testing Library (RTL) is the standard for component tests. Must configure `vitest.config.ts` with jsdom environment, path aliases matching `vite.config.ts`, and Tailwind CSS handling (stub or import). | LOW | Single config file. Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` to devDependencies. Add `test` and `test:coverage` npm scripts. |
| Unit tests: `computeRiskScore` | Pure function in `api/scoring.ts`. Takes findings array, returns `{ score, categories }`. Deterministic. Two-tier category weights (1.0x and 0.75x), logarithmic scaling, skip-on-error-title logic. Most important business logic in the app. | LOW | Test boundary conditions: 0 findings = 0 score, all-Critical findings, mixed severities, Compound Risk category excluded (weight 0), "Analysis Pass Failed:" title skipped. ~10-15 test cases. |
| Unit tests: `applySeverityGuard` | Pure function in `api/scoring.ts`. Upgrades finding severity to Critical if clauseText or explanation matches CA void-by-law patterns (CC 8814, 2782, 8122). Display-only -- should not affect risk score. | LOW | Test each regex pattern variant, already-Critical passthrough, non-matching text, empty fields. ~8 test cases. |
| Unit tests: `computeBidSignal` | Pure function in `src/utils/bidSignal.ts`. 5 weighted factors, severity-based penalties, threshold-based level assignment. | LOW | Test threshold boundaries (score = 70 exactly, 69, 40, 39), empty findings = bid, all-Critical findings, individual factor matching (bonding vs insurance vs scope etc). ~12 test cases. |
| Unit tests: `classifyError` | Pure function in `src/utils/errors.ts`. Classifies unknown errors into typed categories with retryable flag. | LOW | Test each error type branch: TypeError("Failed to fetch"), timeout strings, DOMException QuotaExceeded, API status codes (429, 401, 500), unknown fallback. ~8 test cases. |
| Unit tests: `mergePassResults` | Pure function in `api/merge.ts`. Takes `PromiseSettledResult[]` and pass info, produces merged output with deduplication. Most complex pure logic in the codebase. | HIGH | This is the hardest unit test to write well. Needs: fixture data for each pass type (16 pass schemas), deduplication by clauseReference+category, title-based fallback dedup, severity ranking preference, specialized-pass preference over generic, failed pass -> Critical finding generation, staleness check injection. Must mock `getAllModules()` from knowledge registry. ~20+ test cases. |
| Unit tests: `storageManager` | Pure functions (`load`, `save`, `loadRaw`, `saveRaw`, `remove`) in `src/storage/storageManager.ts`. Wraps localStorage with typed registry and StorageResult. | LOW | Mock `localStorage` (jsdom provides it). Test: successful read/write, missing key returns null, JSON parse error, QuotaExceededError detection, remove swallows errors. ~10 test cases. |
| Unit tests: `contractStorage` (load + save + migration) | `loadContracts()` in `src/storage/contractStorage.ts`. Handles first visit (seed mocks), schema migration v1->v2, quota exceeded, corrupted data. | MEDIUM | Depends on storageManager (mock or use jsdom localStorage). Test: first visit seeds MOCK_CONTRACTS, existing v1 data migrates (fills defaults), v2 data loads directly, corrupted JSON returns empty array, saveContracts quota exceeded returns error. ~8 test cases. |
| Unit tests: Zod schema validation | `MergedFindingSchema` in `src/schemas/finding.ts` is the single source of truth. Test that valid findings parse, invalid findings reject, all 11 LegalMeta discriminants parse, all 4 ScopeMeta discriminants parse. | MEDIUM | Test each discriminated union variant with valid data. Test missing required fields reject. Test optional fields accept undefined. Use real finding shapes from mockContracts.ts as fixtures. ~15 test cases. |
| API endpoint integration tests (mocked Claude) | `api/analyze.ts` handler tested with mocked Anthropic SDK. Validates: request validation (400 on missing pdfBase64), CORS headers, method checking (405 on GET), file size limit, error classification. | HIGH | Must mock: `Anthropic` class (constructor + `beta.messages.create` + `beta.files.create` + `beta.files.delete`), `preparePdfForAnalysis`, `undici` Agent. The 17-pass parallel execution with `Promise.allSettled` needs fixture responses per pass. This is the most complex test setup in the project. |
| Component tests: key UI rendering | Verify components render correctly with mock data. Focus on: `SeverityBadge` (5 severity variants), `FindingCard` (expand/collapse, resolve toggle, note), `RiskScoreDisplay` (color thresholds), `BidSignalWidget` (3 signal levels), `FilterToolbar` (multi-select state). | MEDIUM | RTL renders with mock props. No API calls. Test visible text, ARIA attributes, click handlers. Use `mockContracts.ts` findings as fixture data. ~5-8 test files, 3-5 tests each. |
| Manual UAT checklist document | Written checklist for the sole user to walk through with a real contract and live API. Covers every user-facing flow: upload, analysis progress, review, filtering, resolve/notes, re-analyze, export CSV, export PDF, comparison, settings, routing. | LOW | Markdown document in `.planning/`. No code. The checklist is the feature -- it replaces ad-hoc "click around and see if it works" with structured verification. |
| `npm run test` and `npm run test:coverage` scripts | Test command must work from project root. Coverage report for tracking progress. | LOW | Add to package.json scripts. Vitest v8 coverage provider. |

## Differentiators

Features that add significant value but the test suite functions without them.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Snapshot tests for API response shapes | Capture a known-good API response as a JSON snapshot. Future regressions that change the response shape are caught automatically. | LOW | `toMatchSnapshot()` on a fixture response object. One snapshot per pass type. Useful for catching accidental schema drift. |
| Component tests: upload flow | Test `UploadZone` accepts PDF, rejects non-PDF, rejects oversize files. Test `ContractUpload` page renders dropzone and navigates on upload. | MEDIUM | Requires mocking `react-dropzone` callbacks or firing drop events. File validation is the critical path to test. |
| Component tests: routing via `useRouter` | Test that `useRouter` hook correctly parses URL paths (`/`, `/contracts`, `/contracts/:id`, `/compare/:id1/:id2`). Test `navigateTo` updates `window.location`. | MEDIUM | `useRouter` is a custom hook wrapping History API. Can test with `renderHook` and manual `pushState` calls. Verifies deep link support. |
| Live API integration test suite (manual trigger) | Separate test file that actually calls `/api/analyze` with a real PDF and real Claude API key. Validates: response shape matches Zod schema, risk score is 0-100, findings have required fields, dates parse correctly. Run with `npm run test:live` (requires `ANTHROPIC_API_KEY`). | HIGH | Costs ~$0.50-1.00 per run (17 Claude API calls). Takes 30-120 seconds. Non-deterministic output -- test structure not content. Must skip in CI. Guards against Anthropic API breaking changes. |
| Hook tests: `useContractFiltering` | Test filter state management: toggle severity, toggle category, hideResolved, derived `visibleFindings` matches expected subset. | MEDIUM | `renderHook` with mock findings array. Test each filter dimension independently and in combination. Verifies filter logic without rendering full ContractReview page. |
| Hook tests: `useContractStore` | Test CRUD operations: addContract, updateContract, deleteContract, toggleFindingResolved, updateFindingNote. Test localStorage persistence via storageManager. | MEDIUM | `renderHook` with jsdom localStorage. Verify state updates and side effects (localStorage writes). |
| Coverage threshold enforcement | Fail CI if coverage drops below a threshold (e.g., 60% for utils, 40% for components). Prevents test rot. | LOW | Vitest config `coverage.thresholds`. Set conservatively at first, increase as coverage grows. |
| Test fixtures module | Shared test data: mock contracts, mock findings (one per severity, one per category, one per legal meta type), mock API responses per pass. Eliminates copy-paste test data across test files. | MEDIUM | `src/__tests__/fixtures/` directory with exported constants. Derive from `mockContracts.ts` where possible. Type-safe (satisfies `Contract`, `Finding`, etc.). |
| PDF report output verification | Test `exportContractPdf` produces a valid jsPDF document with expected sections. Cannot pixel-compare, but can verify: document has pages, title text present, finding count matches input. | LOW | jsPDF runs in jsdom. Call function with mock contract, check `doc.internal.pages.length > 0` and `doc.output('datauristring')` is non-empty. Smoke test, not visual verification. |

## Anti-Features

Features to explicitly NOT build for this testing milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| End-to-end tests with Playwright/Cypress | The app is a single-user tool with no multi-step workflows that span multiple pages. E2E tests add a browser automation dependency, slow CI by minutes, and provide marginal value over component tests + UAT checklist for an app this size. The API integration is the critical path, not the click-through flow. | Component tests for UI rendering; manual UAT checklist for end-to-end verification; live API test for integration confidence. |
| Visual regression testing (Chromatic, Percy) | Screenshot comparison tools cost money, require CI infrastructure, and solve a problem this project doesn't have -- the sole user/developer sees every UI change before deploying. | Manual UAT includes visual inspection. Tailwind utility classes make accidental style changes uncommon. |
| Test database or test API server | The app uses localStorage (no database) and a single serverless function. Standing up a test server adds infrastructure complexity for zero gain. | Mock localStorage in jsdom. Mock Anthropic SDK in unit/integration tests. Use real API only in live test suite. |
| 100% code coverage target | Chasing 100% coverage leads to brittle tests on animation code, icon imports, and CSS utility mappings. The app has ~23 components, ~7 hooks, and ~10 utility modules -- testing all branches of all files is not worth the effort for a sole-user tool. | Target meaningful coverage: 90%+ on pure utility functions, 70%+ on hooks, 50%+ on components. Skip animation-only code and icon/palette constants. |
| Contract mocking with MSW (Mock Service Worker) | MSW intercepts fetch at the network level, which is useful for apps with many API endpoints. ClearContract has exactly one API endpoint (`/api/analyze`). MSW adds complexity (service worker registration, handler definitions) for intercepting one call. | Mock `fetch` directly in test files (`vi.fn()` or `vi.spyOn(globalThis, 'fetch')`). One endpoint = one mock. |
| Automated UAT (converting checklist to automation) | The UAT checklist exists for a human to verify subjective qualities: "Does the risk score feel right for this contract?", "Are the findings useful?", "Is the PDF report readable?" These cannot be automated meaningfully. | Keep UAT as a manual document. The human judgment IS the test. |
| Testing knowledge module content | The 16 knowledge modules contain domain-specific text (CA regulations, ASTM standards, AIA forms). Testing that the text is "correct" is not a software test -- it's a domain expert review. | Knowledge modules have expiration dates and staleness warnings. Content correctness is a domain concern, not a test concern. Test that the staleness check fires on expired dates (already in unit tests for merge.ts). |

---

## Feature Dependencies

```
[Vitest + RTL setup]
    |
    +---> [Unit tests: scoring, bidSignal, errors, storageManager]
    |         (pure functions, zero dependencies between them, can parallelize)
    |
    +---> [Unit tests: Zod schemas]
    |         (standalone, tests schema validity)
    |
    +---> [Unit tests: contractStorage]
    |         (depends on storageManager being testable; uses jsdom localStorage)
    |
    +---> [Test fixtures module]
    |         (shared data, other tests import from here)
    |
    +---> [Unit tests: mergePassResults]
    |         (depends on fixtures for each pass type, mocks knowledge registry)
    |
    +---> [API endpoint integration tests]
    |         (depends on fixtures, most complex mock setup)
    |
    +---> [Component tests: badges, cards, widgets]
    |         (depends on RTL setup, uses fixture data)
    |
    +---> [Hook tests: filtering, store]
    |         (depends on RTL renderHook, uses fixture data)
    |
    +---> [Live API test suite]
              (independent of unit/component tests, requires API key)

[Manual UAT checklist]
    (no code dependency, can be written in parallel with everything else)
```

### Key Ordering Constraints

1. **Vitest setup first** -- nothing runs without the test runner.
2. **Pure function unit tests before component tests** -- pure functions have no dependencies and build confidence in test infrastructure.
3. **Test fixtures early** -- avoids copy-pasting mock data across test files. Every test file that needs a Finding or Contract should import from fixtures.
4. **mergePassResults tests after per-pass schema fixtures** -- the merge function operates on outputs from all 16 passes. Fixture data must cover each pass type's schema.
5. **API endpoint tests last among automated tests** -- requires the most elaborate mocking (Anthropic SDK, undici, PDF processing). Build mock patterns in simpler tests first.
6. **Live API tests are always manual** -- never in CI, never automated.

---

## MVP Recommendation

### Phase 1: Foundation + Pure Logic (do first)

1. **Vitest + RTL setup** -- unblocks everything else
2. **Test fixtures module** -- shared data for all subsequent tests
3. **Unit tests: computeRiskScore** -- most important business logic
4. **Unit tests: applySeverityGuard** -- small, critical correctness check
5. **Unit tests: computeBidSignal** -- another deterministic business rule
6. **Unit tests: classifyError** -- small, 6 branches, fast to write
7. **Unit tests: storageManager** -- foundation for storage tests
8. **Unit tests: Zod schema validation** -- validates the type system's runtime backbone

### Phase 2: Complex Logic + Components (do second)

9. **Unit tests: contractStorage** -- migration logic, seeding behavior
10. **Unit tests: mergePassResults** -- the hardest test, but the most valuable
11. **Component tests: SeverityBadge, FindingCard, RiskScoreDisplay, BidSignalWidget, FilterToolbar** -- core UI rendering
12. **Hook tests: useContractFiltering, useContractStore** -- state management verification

### Phase 3: Integration + Validation (do last)

13. **API endpoint integration tests** -- mocked Claude, validates request/response pipeline
14. **Manual UAT checklist** -- written document for human verification
15. **Live API test suite** -- manual trigger, real API, validates end-to-end

### Defer

- **Component tests for upload flow** -- react-dropzone mocking is finicky, low ROI vs manual UAT
- **Routing hook tests** -- History API mocking in jsdom is unreliable; manual UAT covers this
- **Coverage thresholds** -- add after initial coverage baseline is established
- **PDF export tests** -- jsPDF in jsdom is smoke-test only; manual UAT with visual inspection is more valuable

---

## Complexity Notes for Downstream

### Mocking the 17-Pass Pipeline

The biggest test engineering challenge is `mergePassResults`. Each of the 16 analysis passes has a distinct Zod schema with different fields:

- 11 legal passes: each has unique `legalMeta` fields (e.g., `IndemnificationFindingSchema` has `riskType` + `hasInsuranceGap`)
- 4 scope passes: each has unique `scopeMeta` fields (e.g., `LaborComplianceFindingSchema` has `checklistItems`)
- 1 risk overview pass: returns `client` + `contractType` + generic findings

The test fixtures module must include at least one valid finding per pass schema. These fixtures should be derived from the Zod schemas themselves (use `z.parse()` to validate fixture data at fixture-creation time).

### API Endpoint Test Isolation

`api/analyze.ts` imports from 8 modules: `@anthropic-ai/sdk`, `zod`, `zod-to-json-schema`, `../src/schemas/*`, `../src/knowledge/*`, `./pdf`, `./merge`, `./passes`, `undici`. The handler function itself orchestrates:

1. Request validation (Zod)
2. PDF buffer decoding
3. Anthropic client construction (2 clients: upload + message)
4. File upload via Files API
5. 16 parallel analysis passes
6. Result merging
7. Synthesis pass (17th)
8. Bid signal computation
9. File cleanup

Testing the handler directly requires mocking `Anthropic`, `preparePdfForAnalysis`, and `undici.Agent`. The simplest approach: mock `preparePdfForAnalysis` to return a fake `fileId`, mock each `client.beta.messages.create` to return canned JSON for each pass, and verify the merged output shape.

### Zod Schema as Test Contract

The existing Zod schemas (`MergedFindingSchema`, `PassResultSchema`, `RiskOverviewResultSchema`, `SynthesisPassResultSchema`) are the canonical contracts for test assertions. Tests should assert `schema.safeParse(result).success === true` rather than checking individual fields -- this ensures the test validates the same shape the runtime validates.

---

## Sources

- Direct inspection of `api/analyze.ts` (443 lines, 17-pass orchestration)
- Direct inspection of `api/merge.ts` (555 lines, pass handler dispatch map, deduplication)
- Direct inspection of `api/scoring.ts` (107 lines, risk score + severity guard)
- Direct inspection of `src/utils/bidSignal.ts` (138 lines, 5-factor bid signal)
- Direct inspection of `src/utils/errors.ts` (113 lines, error classification)
- Direct inspection of `src/storage/storageManager.ts` (127 lines, typed localStorage wrapper)
- Direct inspection of `src/storage/contractStorage.ts` (105 lines, load/save/migrate)
- Direct inspection of `src/schemas/finding.ts` (175 lines, MergedFindingSchema)
- Direct inspection of `package.json` (zero test dependencies currently)
- Direct inspection of all 23 components and 7 hooks for testable surface identification
- `.planning/PROJECT.md` -- v1.6 active requirements (test framework, unit tests, integration tests, component tests, UAT)

---

*Feature research for: Test framework, UAT tooling, and automated regression (v1.6 Quality and Validation)*
*Researched: 2026-03-15*
*Supersedes: 2026-03-14 v1.5 feature research (v1.5 features are all shipped)*
