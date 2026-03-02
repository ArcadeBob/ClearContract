# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Status:**
- **No test framework configured** — Project has no testing setup (no Jest, Vitest, or other runner)
- **No test files** — No `.test.ts`, `.spec.ts`, or similar files exist in codebase
- **npm script:** No `npm test` command defined in `package.json`

**Note:** This codebase is a work-in-progress web application with 0% test coverage. Future testing guidance should establish a testing framework first.

## Potential Testing Approach (Recommendations for Future Setup)

Based on the tech stack and conventions, if testing were to be added, consider:

**Unit Test Framework:**
- Vitest (modern, fast, Vite-native) or Jest (industry standard)

**Component Testing:**
- React Testing Library for UI component tests
- Focus on user behavior over implementation details

**Test File Organization:**
- Co-locate tests with components: `ComponentName.tsx` and `ComponentName.test.tsx` in same directory
- Or use separate `__tests__` directory structure

**API/Integration Testing:**
- Fetch mocking with Mock Service Worker (MSW) or node-fetch mocks
- Test `api/analyze.ts` Vercel handler with mock `VercelRequest`/`VercelResponse`

## Current Code Structure Supporting Future Testing

**Testable patterns already in place:**

**Pure utility functions (easily testable without mocking):**
- `readFileAsBase64()` in `src/api/analyzeContract.ts` — Promise-based file reader, test with mock File/FileReader
- `analyzeContract()` in `src/api/analyzeContract.ts` — Validation logic testable with invalid inputs (file size, file type)
- `useContractStore()` hook in `src/hooks/useContractStore.ts` — Pure hook logic, test with React hooks testing library

**Type-safe domain code (interfaces define contracts):**
- `src/types/contract.ts` — Type definitions for Finding, Contract, etc. (no runtime logic)
- `Contract`, `Finding`, `Category` types enforce structure during testing

**Presentational components (minimal logic, props-driven):**
- `SeverityBadge` (`src/components/SeverityBadge.tsx`) — Takes `severity` prop, renders color-coded badge; easily snapshot-testable
- `FindingCard` (`src/components/FindingCard.tsx`) — Takes `finding` and `index` props; can test icon mapping and conditional rendering
- `CategoryFilter` (`src/components/CategoryFilter.tsx`) — Takes categories and callback; test button renders and onClick handling

**API handler (testable with mocked dependencies):**
- `api/analyze.ts` — Vercel serverless function with clear input validation and error responses
  - Test with mock `pdfBase64` payloads (valid, missing, invalid formats)
  - Mock Anthropic SDK to test response parsing and error handling
  - Test error cases (rate limit 429, auth 401, syntax errors, truncation logic)

## Testing Challenges & Gaps

**No tests for:**
- React component rendering and user interactions (click handlers, form submissions)
- App-level navigation logic (ViewState transitions, contract switching)
- Hook state management in `useContractStore` (state updates, derived values)
- Integration between client `analyzeContract()` and server `api/analyze.ts`
- Framer Motion animations
- PDF text extraction via `pdf-parse` library
- Claude API integration (model invocation, response parsing, truncation at 100k chars)

**Integration risk:**
- End-to-end contract analysis flow untested (upload → placeholder creation → analysis → UI update)
- No validation that error handling bubbles correctly from server → client → UI Finding

**Type coverage:**
- TypeScript strict mode enabled, so type safety is enforced at compile time
- But no runtime validation of JSON responses from Claude or API errors

## Suggested Test Coverage Areas (Priority Order)

**High Priority (core functionality):**
1. `analyzeContract()` validation and error handling (file size, file type)
2. `useContractStore()` contract CRUD operations (add, update, navigate)
3. `api/analyze.ts` error responses (400, 401, 422, 429, 500) and JSON parsing

**Medium Priority (UI correctness):**
4. Component rendering and prop mapping (`SeverityBadge`, `FindingCard`, `CategoryFilter`)
5. `ContractReview` filtering and sorting logic (category filter, severity sort)
6. `Dashboard` stats calculation (totalContracts, totalFindings, criticalFindings)

**Lower Priority (visual consistency):**
7. Snapshot tests for components with complex styling
8. Framer Motion animation trigger tests (if visual regressions are concern)

## Mock/Fixture Needs (If Testing Were Implemented)

**API Response Mocks:**
```typescript
// Mock successful analysis response
const mockAnalysisResult = {
  client: 'Test Client',
  contractType: 'Subcontract',
  riskScore: 65,
  findings: [
    {
      id: 'f-test-1',
      severity: 'Critical',
      category: 'Legal Issues',
      title: 'Indemnification Clause',
      description: 'Unfavorable indemnification terms detected.',
      recommendation: 'Negotiate to limit exposure.',
    }
  ],
  dates: [
    { label: 'Project Start', date: '2024-01-15', type: 'Start' }
  ]
};
```

**Mock Contracts (already available):**
- `MOCK_CONTRACTS` in `src/data/mockContracts.ts` provides 3 sample contracts at varying risk levels (low, medium, high)
- Can be used as test fixtures

**Mock File (for upload testing):**
```typescript
const mockPdfFile = new File(
  ['mock pdf content'],
  'test-contract.pdf',
  { type: 'application/pdf' }
);
```

**Mock Anthropic SDK:**
```typescript
// Would need to mock messages.create() to return controlled response
jest.mock('@anthropic-ai/sdk');
```

## State & Context Testing Notes

**No Context API or Redux:**
- `useContractStore` is a custom hook using `useState` — test by calling hook with `renderHook()` from React Testing Library
- State updates are synchronous — no async middleware or thunks

**Async Operations:**
- `analyzeContract()` is async and returns a Promise — test with `async/await` and Jest's `done` callback or async test syntax
- No Redux saga, no Redux thunk — async logic is imperative in components (see `App.tsx` `.then().catch()` pattern)

---

*Testing analysis: 2026-03-01*
