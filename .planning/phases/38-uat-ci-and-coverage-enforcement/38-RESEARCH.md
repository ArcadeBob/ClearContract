# Phase 38: UAT, CI, and Coverage Enforcement - Research

**Researched:** 2026-03-16
**Domain:** Testing infrastructure, CI/CD, coverage enforcement
**Confidence:** HIGH

## Summary

Phase 38 closes the v1.6 Quality & Validation milestone with four deliverables: a manual UAT checklist, a mocked regression test suite, a live API test script, a GitHub Actions CI pipeline, and coverage thresholds. No new feature code is involved -- this is purely validation and automation.

The project already has Vitest 3.2 configured inline in `vite.config.ts`, 19 test files across unit/hook/component/integration layers, and comprehensive fixtures in `api/test-fixtures/pass-responses.ts`. The regression suite can reuse the Phase 37 mock patterns directly. Coverage enforcement requires installing `@vitest/coverage-v8` and adding threshold config. GitHub Actions CI is straightforward -- Node.js 20, npm ci, lint, test with coverage.

**Primary recommendation:** Build on existing test infrastructure. The regression suite extends `api/analyze.test.ts` patterns, coverage config goes in the existing `vite.config.ts` test block, and CI is a single workflow file. The UAT checklist is a markdown document referencing all user-facing workflows.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- UAT checklist: Markdown file in `.planning/` with checkbox steps grouped by workflow area, each step includes action + expected result
- Covers ALL user-facing workflows: upload, analyze, review findings, resolve/annotate, filter, CSV export, PDF export, compare contracts, settings, re-analyze, URL routing, empty states
- Dedicated Vercel Pro config verification section (UAT-04)
- Regression fixtures: Hand-craft from existing factories and `api/test-fixtures/` -- no live API capture
- Live API test: `npm run test:live`, validates response shape only via Zod schema, TEST_PDF_PATH env var with fallback, manual trigger only, never run by CI
- CI pipeline: GitHub Actions on push to main + PRs targeting main, steps: lint, test:coverage, upload coverage to console
- Cache node_modules based on package-lock.json hash
- Coverage printed in CI logs; build fails if below threshold. No external services (no Codecov)
- @vitest/coverage-v8 provider, 60% statements + 60% functions thresholds, fixed (no auto-ratchet)

### Claude's Discretion
- GitHub Actions workflow file structure and Node.js version matrix
- Exact npm caching action configuration
- UAT checklist grouping and ordering of workflow sections
- Regression test file organization (colocated vs dedicated directory)
- Whether to include a bundled small test PDF in the repo for live tests fallback
- Coverage report format details

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UAT-01 | Manual UAT checklist created covering full user workflow (upload, analyze, review, actions, export) | UAT checklist pattern documented; all workflow areas identified from codebase |
| UAT-02 | Mocked regression suite with captured real API response fixtures, validates pipeline without live API | Existing `api/test-fixtures/pass-responses.ts` + `api/analyze.test.ts` mock patterns provide foundation |
| UAT-03 | Live API test suite (manual trigger) validates response structure against Zod schemas | `test:live` script pattern documented; Zod schema validation approach verified |
| UAT-04 | Vercel Pro config verified (300s maxDuration confirmed working on deployed endpoint) | `vercel.json` already has `maxDuration: 300`; UAT checklist includes verification step |
| INFRA-05 | GitHub Actions CI pipeline runs tests on push/PR with coverage reporting | GitHub Actions workflow pattern documented with node_modules caching |
| INFRA-06 | Coverage thresholds enforced (starting ~60% statements/functions, fail CI if below) | @vitest/coverage-v8 threshold config verified via official docs |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vitest/coverage-v8 | ^3.2.4 (match vitest) | V8-based coverage collection | Faster than Istanbul, native V8 instrumentation, official Vitest provider |
| vitest | ^3.2.4 (existing) | Test runner | Already configured, used by all 19 existing test files |
| zod | ^3.25.76 (existing) | Schema validation for live API tests | Already used for all finding schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| actions/checkout@v4 | v4 | CI: clone repo | GitHub Actions workflow |
| actions/setup-node@v4 | v4 | CI: install Node.js | GitHub Actions workflow |
| actions/cache@v4 | v4 | CI: cache node_modules | GitHub Actions workflow, keyed on package-lock.json |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vitest/coverage-v8 | @vitest/coverage-istanbul | Istanbul is slower but more compatible; V8 is the decision |
| No external coverage service | Codecov/Coveralls | External services add complexity; decision is console-only |

**Installation:**
```bash
npm install -D @vitest/coverage-v8
```

## Architecture Patterns

### File Organization
```
.github/
└── workflows/
    └── ci.yml                    # GitHub Actions CI workflow
.planning/
└── UAT-CHECKLIST.md              # Manual UAT checklist
api/
├── analyze.test.ts               # Existing integration tests
├── regression.test.ts            # NEW: Mocked regression suite
├── test-fixtures/
│   └── pass-responses.ts         # Existing fixtures (reuse)
└── live-api.test.ts              # NEW: Live API test (manual trigger)
vite.config.ts                    # Add coverage config here
package.json                      # Add test:live script, @vitest/coverage-v8
```

### Pattern 1: Coverage Configuration in vite.config.ts
**What:** Add coverage provider and thresholds to existing inline Vitest config
**When to use:** Always -- this is the single configuration point
**Example:**
```typescript
// Source: https://vitest.dev/config/coverage
export default defineConfig({
  // ... existing plugins, server config ...
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        'src/test/**',
        'api/test-fixtures/**',
        '**/*.test.{ts,tsx}',
        'src/index.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 60,
        functions: 60,
      },
    },
  },
})
```

### Pattern 2: Regression Test Using Existing Mock Patterns
**What:** Replay Phase 37 fixtures through the pipeline handler, assert output structure
**When to use:** The regression suite reuses exact mock patterns from `api/analyze.test.ts`
**Example:**
```typescript
// @vitest-environment node
// Reuse existing mock setup from api/analyze.test.ts
// Import passFixtures, synthesisFixture, createStreamResponse from test-fixtures
// Call handler with mocked request, assert:
//   - All 16 passes + synthesis executed
//   - Output validates against MergedFindingSchema
//   - Risk score computed
//   - No live API calls made
```

### Pattern 3: Live API Test (Manual Trigger)
**What:** Separate test file that calls real API and validates response shape
**When to use:** Developer runs `npm run test:live` manually
**Example:**
```typescript
// @vitest-environment node
// Read PDF from TEST_PDF_PATH env var (or bundled fallback)
// POST to /api/analyze (or call handler directly)
// Validate each finding against MergedFindingSchema
// Validate top-level shape (client, contractType, findings[], dates[], riskScore)
// No content assertions -- only structural validation
```

### Pattern 4: GitHub Actions CI Workflow
**What:** Single workflow file for lint + test + coverage
**When to use:** Triggers on push to main and PRs targeting main
**Example:**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
```

### Anti-Patterns to Avoid
- **Running live API tests in CI:** Never include `test:live` in CI -- it costs money and is non-deterministic
- **Using `actions/cache` manually when `setup-node` has built-in caching:** `actions/setup-node@v4` has a `cache: 'npm'` option that handles caching automatically using `package-lock.json`
- **Setting coverage thresholds too high initially:** 60% is realistic for a project adding tests retroactively; can ratchet up later
- **Including test files and fixtures in coverage:** Exclude `*.test.ts`, `src/test/**`, and `api/test-fixtures/**` from coverage measurement

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage collection | Custom instrumentation | @vitest/coverage-v8 | V8 native coverage is accurate and fast |
| CI caching | Manual cache scripts | `actions/setup-node` `cache: 'npm'` | Built-in, handles hash key automatically |
| Coverage threshold enforcement | Custom scripts checking coverage output | Vitest `thresholds` config | Built-in, fails process with exit code 1 |
| Test exclusion from coverage | Manual file lists | Vitest `coverage.exclude` globs | Glob patterns handle all edge cases |

**Key insight:** Vitest's built-in coverage thresholds produce a non-zero exit code when thresholds are not met, which naturally fails CI without any custom scripting.

## Common Pitfalls

### Pitfall 1: @vitest/coverage-v8 Version Mismatch
**What goes wrong:** Installing a different major version of @vitest/coverage-v8 than vitest itself
**Why it happens:** npm may resolve to a different version
**How to avoid:** Pin to same minor version as vitest (^3.2.4)
**Warning signs:** "Coverage provider version mismatch" errors

### Pitfall 2: Live API Test Running in CI
**What goes wrong:** `test:live` files get picked up by `vitest run` in CI
**Why it happens:** Default test include pattern matches all `*.test.ts` files
**How to avoid:** Either: (a) name the file differently (e.g., `live-api.live.ts`) and don't include `.live.ts` in test pattern, or (b) use a separate vitest config for live tests, or (c) put it outside the include paths
**Warning signs:** CI fails with API key errors or unexpected API calls

### Pitfall 3: Coverage Exclude Patterns Not Working
**What goes wrong:** Test utilities, fixtures, or entry points inflate/deflate coverage numbers
**Why it happens:** Exclude patterns don't match actual file paths
**How to avoid:** Use relative paths from project root in exclude patterns; test with `npx vitest run --coverage` locally first
**Warning signs:** Coverage report shows test files or fixtures in the report

### Pitfall 4: GitHub Actions Caching Not Working
**What goes wrong:** Every CI run does a full npm install
**Why it happens:** Missing `package-lock.json` or incorrect cache key
**How to avoid:** Ensure `package-lock.json` is committed; use `actions/setup-node` with `cache: 'npm'`
**Warning signs:** CI install step takes 30+ seconds on repeat runs

### Pitfall 5: Regression Test Fragility
**What goes wrong:** Regression tests break when pipeline logic changes
**Why it happens:** Tests assert too many implementation details instead of output shape
**How to avoid:** Assert on output structure (MergedFindingSchema validation, risk score range, findings count > 0) not exact values
**Warning signs:** Tests fail after unrelated refactors

## Code Examples

### Coverage Configuration (Verified)
```typescript
// Source: https://vitest.dev/config/coverage
// In vite.config.ts, add to existing test block:
test: {
  // ... existing config ...
  coverage: {
    provider: 'v8',
    reporter: ['text', 'text-summary'],
    include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
    exclude: [
      'src/test/**',
      'api/test-fixtures/**',
      '**/*.test.{ts,tsx}',
      '**/*.d.ts',
      'src/index.tsx',
      'src/data/mockContracts.ts',
    ],
    thresholds: {
      statements: 60,
      functions: 60,
    },
  },
},
```

### Live API Test Script (package.json)
```json
{
  "scripts": {
    "test:live": "vitest run --config vitest.live.config.ts"
  }
}
```
Alternative approach: use a separate config file that only includes the live test file, keeping it fully isolated from the main test suite.

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Istanbul coverage | V8 native coverage | Vitest 1.x+ | Faster, no source transform needed |
| Custom CI scripts for coverage | Vitest built-in thresholds | Vitest 0.30+ | Exit code 1 on threshold miss, no custom scripting |
| actions/setup-node + actions/cache | actions/setup-node with `cache` option | setup-node v3+ | Single action handles both Node setup and caching |

**Deprecated/outdated:**
- `c8` standalone: Vitest has built-in @vitest/coverage-v8, no need for standalone c8
- `jest --coverage`: Project uses Vitest, not Jest

## Open Questions

1. **Live test PDF bundling**
   - What we know: TEST_PDF_PATH env var is the primary mechanism; a small bundled fallback PDF is optional
   - What's unclear: Whether a minimal PDF can be created small enough to commit (a few KB)
   - Recommendation: Create a tiny 1-page test PDF with minimal text. If too large, skip the fallback and document TEST_PDF_PATH as required

2. **Live test isolation approach**
   - What we know: Must not run in CI; must be triggered separately
   - Options: (a) separate vitest config file, (b) file naming convention excluded from main pattern, (c) directory outside include paths
   - Recommendation: Use a separate `vitest.live.config.ts` with explicit include for just the live test file. Cleanest isolation.

3. **Current coverage baseline**
   - What we know: 19 test files exist across all layers
   - What's unclear: Actual current coverage percentage
   - Recommendation: Run `npm run test:coverage` locally before setting thresholds; 60% is the target but current baseline may be higher or lower

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vite.config.ts` (inline test config) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UAT-01 | UAT checklist document exists and covers all workflows | manual-only | N/A (markdown review) | No -- Wave 0 |
| UAT-02 | Regression suite replays fixtures, validates pipeline output | integration | `npx vitest run api/regression.test.ts` | No -- Wave 0 |
| UAT-03 | Live API test validates response structure | integration (manual) | `npm run test:live` | No -- Wave 0 |
| UAT-04 | Vercel Pro 300s maxDuration config | manual-only | N/A (deployment verification) | No -- UAT checklist item |
| INFRA-05 | CI pipeline runs tests on push/PR | integration | Push to GitHub and verify Actions run | No -- Wave 0 |
| INFRA-06 | Coverage thresholds enforced, CI fails if below | integration | `npx vitest run --coverage` (exits non-zero if below threshold) | No -- Wave 0 (config change) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + coverage thresholds met before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `@vitest/coverage-v8` -- install as devDependency
- [ ] Coverage config in `vite.config.ts` -- add provider, thresholds, exclude patterns
- [ ] `api/regression.test.ts` -- new regression test file
- [ ] `api/live-api.test.ts` or similar -- new live API test file
- [ ] `vitest.live.config.ts` -- separate config for live tests isolation
- [ ] `.github/workflows/ci.yml` -- new CI workflow file
- [ ] `.planning/UAT-CHECKLIST.md` -- new UAT checklist document
- [ ] `package.json` -- add `test:live` script

## Sources

### Primary (HIGH confidence)
- [Vitest Coverage Config](https://vitest.dev/config/coverage) -- threshold configuration, provider options, exclude patterns
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html) -- installation, setup instructions
- Project codebase: `vite.config.ts`, `package.json`, `api/analyze.test.ts`, `api/test-fixtures/pass-responses.ts` -- existing infrastructure

### Secondary (MEDIUM confidence)
- [GitHub Actions setup-node](https://github.com/actions/setup-node) -- cache option, Node.js version support
- [Vitest Coverage Report Action](https://github.com/marketplace/actions/vitest-coverage-report) -- referenced but NOT used per user decision (no external services)

### Tertiary (LOW confidence)
- None -- all findings verified against official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- @vitest/coverage-v8 is the official provider, verified via docs
- Architecture: HIGH -- extends existing patterns from Phases 33-37, all infrastructure in place
- Pitfalls: HIGH -- common issues well-documented in community, verified against project structure

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, Vitest 3.x is mature)
