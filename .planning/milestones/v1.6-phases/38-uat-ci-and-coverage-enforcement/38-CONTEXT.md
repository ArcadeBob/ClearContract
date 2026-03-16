# Phase 38: UAT, CI, and Coverage Enforcement - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate the application end-to-end through a manual UAT checklist, mocked regression suite, live API verification, Vercel config check, GitHub Actions CI pipeline, and coverage thresholds. No new feature code -- validation and automation only.

</domain>

<decisions>
## Implementation Decisions

### UAT checklist design
- Markdown checklist file in `.planning/` with checkbox steps grouped by workflow area
- Each step includes action + expected result (e.g., "Upload a 5-page PDF -> status changes to Analyzing, findings appear within 60s")
- Covers ALL user-facing workflows: upload, analyze, review findings, resolve/annotate, filter, CSV export, PDF export, compare contracts, settings, re-analyze, URL routing, empty states
- Dedicated section for Vercel Pro config verification (UAT-04): upload a long contract, confirm it doesn't timeout at 60s

### Regression fixture strategy
- Hand-craft fixtures from existing factory functions in `src/test/factories.ts` and `api/test-fixtures/`
- No live API capture needed -- Phase 37 already has realistic pass responses for all 16 passes + synthesis
- Mocked regression suite replays these fixtures through the pipeline and validates output

### Live API test suite
- `npm run test:live` validates response shape only via Zod schema (MergedFindingSchema for each finding, correct top-level shape)
- No content assertions -- AI output varies, only structure matters
- TEST_PDF_PATH env var points to a PDF; flexible for any contract. Falls back to a small bundled test PDF if not set
- Manual trigger only -- never run by CI. Zero API costs in automation
- Developer runs manually when verifying live API behavior

### CI pipeline design
- GitHub Actions workflow triggered on push to main + PRs targeting main
- Steps: npm run lint, npm run test:coverage, upload coverage report to console
- Cache node_modules based on package-lock.json hash for fast subsequent runs
- Coverage printed in CI logs; build fails if below threshold. No external services (no Codecov)

### Coverage thresholds
- @vitest/coverage-v8 provider (V8 built-in, faster than Istanbul)
- Enforce 60% statements + 60% functions as starting thresholds
- CI fails build if either metric drops below threshold
- Fixed thresholds for now -- no auto-ratchet. Bump manually as coverage grows

### Claude's Discretion
- GitHub Actions workflow file structure and Node.js version matrix
- Exact npm caching action configuration
- UAT checklist grouping and ordering of workflow sections
- Regression test file organization (colocated vs dedicated directory)
- Whether to include a bundled small test PDF in the repo for live tests fallback
- Coverage report format details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- UAT-01 through UAT-04 and INFRA-05, INFRA-06 define acceptance criteria

### Test infrastructure (from Phase 33)
- `vite.config.ts` -- Vitest config inline, test include paths, coverage config to be added here
- `src/test/setup.ts` -- Global test setup (Framer Motion mock, jest-dom)
- `src/test/factories.ts` -- Factory functions for all finding types, contracts, dates
- `src/test/render.tsx` -- Custom render wrapper with ToastProvider

### Existing test fixtures (from Phase 37)
- `api/test-fixtures/pass-responses.ts` -- Pre-built responses for all 16 passes + synthesis
- `api/analyze.test.ts` -- Full pipeline mock patterns to reuse for regression suite

### Deployment config
- `vercel.json` -- maxDuration: 300 configuration to verify in UAT

### Build/lint
- `package.json` -- Scripts (test, test:watch, test:coverage, lint) and devDependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts`: Pass-specific factories for all 16 analysis passes -- reuse directly for regression fixtures
- `api/test-fixtures/pass-responses.ts`: Complete fixture set from Phase 37 -- foundation for regression suite
- `api/analyze.test.ts`: Mock patterns for Anthropic SDK, VercelRequest/Response, streaming -- regression suite can extend these

### Established Patterns
- Vitest 3.2 inline config in `vite.config.ts` -- coverage config goes here too
- `// @vitest-environment node` per-file for API tests
- vi.mock at module level for SDK isolation
- `npm run test` / `test:watch` / `test:coverage` scripts already defined
- Colocated test files convention

### Integration Points
- `vite.config.ts` -- Add coverage provider and threshold config
- `package.json` -- Add @vitest/coverage-v8 devDependency, add test:live script
- `.github/workflows/` -- New directory for CI workflow file
- `.planning/` -- UAT checklist markdown file location

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

*Phase: 38-uat-ci-and-coverage-enforcement*
*Context gathered: 2026-03-16*
