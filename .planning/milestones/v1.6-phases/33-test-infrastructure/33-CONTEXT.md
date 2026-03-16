# Phase 33: Test Infrastructure - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Vitest, React Testing Library, jest-dom, Framer Motion mock, and test utilities so that `npm run test` executes and passes. Includes dual-environment support (jsdom for client, node for API), fixture factories validated against Zod schemas, and trivial verification tests proving the stack works. No actual feature tests -- those are Phases 34-37.

</domain>

<decisions>
## Implementation Decisions

### Test file organization
- Colocated test files: `FindingCard.test.tsx` next to `FindingCard.tsx` in same directory
- API tests colocated in `api/` directory: `api/analyze.test.ts` next to `api/analyze.ts`
- Shared test utilities in `src/test/` directory (setup, render wrapper, factories, mocks)
- Default environment is jsdom; API test files use `// @vitest-environment node` per-file comment

### Test utilities & factories
- Custom render wrapper includes ToastProvider only (the sole context provider)
- Override-style factories: `createFinding({severity: 'Critical'})` returns valid defaults with selective overrides
- Factories validate output against Zod schemas (MergedFindingSchema.parse) to guarantee correctness
- localStorage uses jsdom's built-in implementation; clear in beforeEach
- Quota exceeded testing uses `vi.spyOn(Storage.prototype, 'setItem')` to throw DOMException

### Framer Motion mock strategy
- Global module mock via vi.mock('framer-motion') in setup file
- motion.div/span/etc replaced with plain HTML elements via Proxy
- AnimatePresence renders children directly
- Auto-loaded via Vitest setupFiles -- no per-test imports needed

### npm scripts & DX
- Three scripts: `test` (vitest run), `test:watch` (vitest), `test:coverage` (vitest run --coverage)
- Vitest config inline in existing `vite.config.ts` (no separate config file)
- Test include paths: `src/**/*.test.{ts,tsx}` and `api/**/*.test.ts`

### Verification tests
- Two trivial tests to prove the stack: one pure function test (classifyError) and one component render test (SeverityBadge)
- Proves both jsdom component path and utility import path work
- FM mock verified by SeverityBadge rendering without animation errors

### Claude's Discretion
- Exact Vitest version selection
- jest-dom import pattern (global vs per-file)
- cleanup configuration (auto vs manual)
- TypeScript config adjustments for test files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Type system (Zod schemas for factories)
- `src/types/contract.ts` -- MergedFindingSchema, Contract type, Finding type, all severity/category enums

### Existing utilities (verification test targets)
- `src/utils/errors.ts` -- classifyError function (trivial test target)
- `src/components/SeverityBadge.tsx` -- SeverityBadge component (trivial test target)

### Context provider (render wrapper)
- `src/components/Toast.tsx` -- ToastProvider that the custom render wrapper must include

### Build config
- `vite.config.ts` -- Vitest config will be added inline here
- `tsconfig.json` -- May need types adjustment for vitest globals
- `package.json` -- Scripts and devDependencies to add

### Requirements
- `.planning/REQUIREMENTS.md` -- INFRA-01 through INFRA-04 define acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/data/mockContracts.ts` -- 3 sample contracts at varying risk levels; useful as reference for factory defaults but factories should use Zod-validated overrides
- `src/types/contract.ts` -- Zod schemas are the single source of truth; factories must parse through them
- `src/components/Toast.tsx` -- ToastProvider is the only React context in the app

### Established Patterns
- TypeScript strict mode with noUnusedLocals/noUnusedParameters -- test utilities must follow
- ES modules throughout (`"type": "module"` in package.json)
- `@vitejs/plugin-react` already configured -- Vitest inherits React transform

### Integration Points
- `vite.config.ts` -- test config added inline alongside existing server/proxy config
- `package.json` -- new devDependencies (vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom) and scripts
- `tsconfig.json` -- may need vitest types reference

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

*Phase: 33-test-infrastructure*
*Context gathered: 2026-03-15*
