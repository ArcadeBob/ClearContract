# Testing Patterns

**Analysis Date:** 2026-03-12

## Test Framework

**Runner:**
- No test framework is configured
- No test runner, assertion library, or test configuration files exist
- No `jest.config.*`, `vitest.config.*`, or equivalent

**Run Commands:**
```bash
# No test commands available
# npm run lint         # Only linting is available (ESLint)
# npm run format:check # Prettier format checking
```

## Test File Organization

**Location:**
- No test files exist in the source tree (`src/`, `api/`)
- Zero test coverage

**Naming:**
- Not established -- no convention exists

## Test Structure

**No tests exist.** When adding tests, follow these recommendations based on the codebase:

**Recommended framework:** Vitest (aligns with Vite build tool already in use)

**Recommended setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Recommended config (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

## Mocking

**Framework:** Not established

**What to mock (when tests are added):**
- `fetch` calls in `src/api/analyzeContract.ts` (API wrapper)
- `FileReader` for base64 encoding in `analyzeContract`
- `localStorage` for `useCompanyProfile` hook
- Anthropic SDK client in `api/analyze.ts`
- `unpdf` text extraction in `api/analyze.ts`
- `react-dropzone` interactions in `UploadZone` component tests

**What NOT to mock:**
- Pure utility functions: `computeBidSignal` (`src/utils/bidSignal.ts`), `computeRiskScore` (in `api/analyze.ts`)
- Type definitions and Zod schemas
- Component rendering logic (test with Testing Library)
- Knowledge registry functions (`src/knowledge/registry.ts`)

## Fixtures and Factories

**Existing test data (usable as fixtures):**
- `src/data/mockContracts.ts` contains 3 sample `Contract` objects at varying risk levels
- These are used as initial state in `useContractStore` and could serve as test fixtures

**When creating test data, follow these patterns:**
```typescript
// Use the domain types from src/types/contract.ts
import type { Contract, Finding, ContractDate } from '../types/contract';

const testFinding: Finding = {
  id: 'f-test-1',
  severity: 'Critical',
  category: 'Legal Issues',
  title: 'Test Finding',
  description: 'Test description',
  recommendation: 'Test recommendation',
};

const testContract: Contract = {
  id: 'c-test-1',
  name: 'Test Contract',
  client: 'Test Client',
  type: 'Subcontract',
  uploadDate: '2026-01-15',
  status: 'Reviewed',
  riskScore: 65,
  findings: [testFinding],
  dates: [],
};
```

## Coverage

**Requirements:** None enforced

**Priority areas for future testing:**
1. `src/utils/bidSignal.ts` -- `computeBidSignal()` is pure logic, easy to unit test
2. `src/hooks/useContractStore.ts` -- core state management hook
3. `src/api/analyzeContract.ts` -- client-side API wrapper with validation
4. `api/analyze.ts` -- `computeRiskScore()`, `mergePassResults()`, `applySeverityGuard()` are pure functions
5. `src/knowledge/registry.ts` -- module registration and retrieval
6. `src/knowledge/tokenBudget.ts` -- token estimation and budget validation
7. `src/components/SeverityBadge.tsx` -- simple component, good first component test

## Test Types

**Unit Tests (not implemented):**
- Target: utility functions (`computeBidSignal`, `computeRiskScore`), hooks, schema validation
- Scope: single function/module in isolation

**Integration Tests (not implemented):**
- Target: API endpoint (`api/analyze.ts`) with mocked Anthropic client
- Target: full upload flow (file selection -> API call -> state update)

**E2E Tests (not implemented):**
- Not used, no framework configured
- Potential framework: Playwright or Cypress

## Testable Pure Functions

These functions have no side effects and are highest-priority test candidates:

**`src/utils/bidSignal.ts` -- `computeBidSignal(findings)`:**
```typescript
// Input: array of Finding objects
// Output: BidSignal with level, label, score, factors
// Deterministic: same findings always produce same score
// Thresholds: >= 70 = 'bid', >= 40 = 'caution', < 40 = 'no-bid'
```

**`api/analyze.ts` -- `computeRiskScore(findings)`:**
```typescript
// Input: array of { severity: string }
// Output: number clamped to 0-100
// Weights: Critical=25, High=15, Medium=8, Low=3, Info=0
```

**`api/analyze.ts` -- `applySeverityGuard(finding)`:**
```typescript
// Mutates finding.severity to 'Critical' if clauseText/explanation
// references void-by-law California statutes (CC 8814, CC 2782, CC 8122)
```

**`src/knowledge/tokenBudget.ts` -- `estimateTokens(text)`:**
```typescript
// Estimates token count from text length (chars / 4 heuristic)
```

## Validation

**Runtime validation:**
- Zod schemas in `src/schemas/` validate all AI-generated responses at the API boundary
- Client-side: file type and size validated before upload in `src/api/analyzeContract.ts`
- Server-side: request body validated in `api/analyze.ts` handler

**Type-level validation:**
- TypeScript strict mode catches type errors at build time
- Discriminated unions (`LegalMeta`, `ScopeMeta`) provide exhaustive type checking in switch statements

---

*Testing analysis: 2026-03-12*
