# Phase 46: Test Restoration - Research

**Researched:** 2026-03-19
**Domain:** Vitest mocking for Supabase-migrated API handler and React auth gate
**Confidence:** HIGH

## Summary

All 23 test failures stem from two root causes introduced by the Supabase migration (v2.0):

1. **API handler tests (22 failures):** The `api/analyze.ts` handler added JWT authentication (`req.headers.authorization`) and Supabase DB writes (`createClient`, `.from().insert()`, etc.), but the test fixtures (`createMockReq`) do not provide `headers` at all, and `@supabase/supabase-js` is not mocked. Every test that calls `handler(req, res)` crashes at line 268 with `TypeError: Cannot read properties of undefined (reading 'authorization')`.

2. **App.test.tsx (1 failure):** The "renders full app when session exists" test provides a mock session via `useAuth`, but does not mock `useContractStore`. The real `useContractStore` calls `supabase.from('contracts')` in its `useEffect`, starts with `isLoading: true`, and renders `<LoadingScreen />` instead of the expected Sidebar with "Sign Out" button.

**Primary recommendation:** Add a `vi.mock('@supabase/supabase-js')` to the API test files with a chainable query builder mock, add `Authorization: Bearer test-token` to `createMockReq` defaults, and mock `useContractStore` in `App.test.tsx` to return `{ isLoading: false, contracts: [], ... }`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | api/analyze.test.ts passes all 18 tests with Supabase-aware mocks | Mock `@supabase/supabase-js` createClient with chainable builder; add auth headers + env vars to `createMockReq`; mock Supabase auth.getUser to return test user |
| TEST-02 | api/regression.test.ts passes all 6 tests with Supabase-aware pipeline replay | Same Supabase mock pattern as TEST-01 (both files share `createMockReq` from `test-fixtures/pass-responses.ts`) |
| TEST-03 | App.test.tsx passes all 3 tests including auth gate rendering | Mock `useContractStore` hook to return non-loading state with empty contracts array |
| TEST-04 | `npm run test` exits with 0 failures (269/269 pass) | All fixes from TEST-01 through TEST-03 combined; no other files are failing |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.2.4 | Test runner | Already configured in vite.config.ts |
| @testing-library/react | ^16.3.2 | Component testing | Already used for App.test.tsx |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers | Already in setup.ts |
| @supabase/supabase-js | ^2.99.2 | Auth + DB (production dep, must be mocked) | Already installed |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | ^26.1.0 | Browser env for component tests | Default vitest environment |

### No New Dependencies Needed
This phase requires zero new packages. All fixes are mock additions/updates to existing test files.

## Architecture Patterns

### Failure Root Cause Map

```
api/analyze.ts (handler)
  Line 268: req.headers.authorization    <-- createMockReq has no `headers`
  Line 274: createClient(SUPABASE_URL)   <-- @supabase/supabase-js not mocked
  Line 280: supabaseAdmin.auth.getUser() <-- needs mock returning { data: { user: { id } } }
  Line 308: supabaseAdmin.from('...')    <-- needs chainable query builder mock
  Line 414-533: DB writes (insert/update/select/delete) <-- all need chainable mocks

src/App.tsx (component)
  Line 281: useAuth() -> session exists -> renders AuthenticatedApp
  Line 23:  useContractStore() -> isLoading: true -> renders LoadingScreen
  (Test expects Sidebar/"Sign Out" but gets LoadingScreen instead)
```

### Pattern 1: Supabase Client Mock for API Tests
**What:** Mock `@supabase/supabase-js` at module level with chainable query builder
**When to use:** Any test that imports a module which calls `createClient`
**Example:**
```typescript
// Chainable mock that handles: .from('x').select('*').eq('a','b').maybeSingle()
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi.fn().mockResolvedValue({ data: { id: 'contract-123', user_id: 'user-123' }, error: null }),
};
// For insert().select() pattern: make select return the query object
mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnValue(mockSupabaseQuery),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue(mockSupabaseClient),
}));
```

### Pattern 2: Auth Header in createMockReq
**What:** Add `headers` with `Authorization: Bearer test-token` to mock request defaults
**When to use:** The `createMockReq` function in `api/test-fixtures/pass-responses.ts`
**Example:**
```typescript
export function createMockReq(
  overrides?: Record<string, unknown>
): VercelRequest {
  const defaults = {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-jwt-token',
    },
    body: { pdfBase64: Buffer.from('fake-pdf').toString('base64') },
  };
  return { ...defaults, ...overrides } as unknown as VercelRequest;
}
```

### Pattern 3: Supabase Environment Variables
**What:** Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in test beforeEach
**When to use:** API tests that exercise the handler's `createClient` call
**Example:**
```typescript
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  // ... existing setup
});
```

### Pattern 4: Mock useContractStore for App.test.tsx
**What:** Mock the hook to return controlled state (not loading, empty contracts)
**When to use:** App.test.tsx test for "renders full app when session exists"
**Example:**
```typescript
vi.mock('./hooks/useContractStore', () => ({
  useContractStore: () => ({
    contracts: [],
    isLoading: false,
    error: null,
    addContract: vi.fn(),
    updateContract: vi.fn(),
    deleteContract: vi.fn(),
    toggleFindingResolved: vi.fn(),
    updateFindingNote: vi.fn(),
    renameContract: vi.fn(),
  }),
}));
```
**Note:** This also requires mocking `useRouter`, `useToast`, and any other hooks that `AuthenticatedApp` uses internally, OR mocking only `useContractStore` to prevent the Supabase call while letting other hooks work naturally.

### Anti-Patterns to Avoid
- **Mocking at wrong scope:** Do NOT add supabase mock to `src/test/setup.ts` globally. The API tests run in `node` environment (via `@vitest-environment node` pragma), not jsdom. Global setup mocks would miss them.
- **Over-mocking the response shape:** The handler now returns `mapRow(contractRow)` with DB-assigned fields. Tests that assert on response body structure must account for the Supabase response shape (snake_case DB rows mapped to camelCase via `mapRow`).
- **Modifying production code:** The REQUIREMENTS.md explicitly states "Fix existing tests, don't redesign test patterns." All fixes go in test files only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase query builder mock | Custom proxy-based mock | Simple vi.fn().mockReturnThis() chain | The handler uses a limited set of methods; chainable mocks cover all paths |
| JWT verification mock | Real JWT parsing | Mock `supabaseAdmin.auth.getUser()` directly | Tests don't need real JWT validation |

## Common Pitfalls

### Pitfall 1: Handler Response Shape Changed
**What goes wrong:** The handler previously returned raw merged results (`{ client, contractType, riskScore, findings, dates }`). Now it returns `mapRow(contractRow)` with DB-assigned IDs, plus `mapRows(findingRows)` for findings. The response shape depends on what the Supabase mock returns from `.insert().select().single()`.
**Why it happens:** Supabase migration changed the response construction at lines 528-533.
**How to avoid:** The mock's `.single()` must return a row matching the expected output shape. The insert mock's `.select()` must return rows with `id` fields (since mapRow converts snake_case to camelCase). Tests asserting `body.findings[n].id` matching `^f-` will need the mock to return IDs with that prefix, OR the merge logic already assigns them before insert.
**Warning signs:** Tests pass the auth gate but fail on response body assertions.

### Pitfall 2: Supabase Mock Must Be Hoisted
**What goes wrong:** `vi.mock('@supabase/supabase-js')` must appear before any `import` that transitively imports it.
**Why it happens:** Vitest hoists `vi.mock()` calls, but the mock factory must not reference variables defined after hoisting.
**How to avoid:** Define mock const variables at module scope above the `vi.mock` call (same pattern already used for `mockCreate` in these test files).

### Pitfall 3: App.test.tsx Has Multiple Blocking Layers
**What goes wrong:** Fixing the auth mock alone doesn't fix the third test because `AuthenticatedApp` calls `useContractStore()` which calls `supabase.from()`.
**Why it happens:** The component renders `AuthenticatedApp` when session exists, which has its own loading state.
**How to avoid:** Mock `useContractStore` to return `isLoading: false` and empty data. Also may need to mock `useRouter` and `useToast` if they have Supabase dependencies.

### Pitfall 4: Handler Creates Two Anthropic Clients
**What goes wrong:** The handler creates `uploadClient` (default fetch) and `client` (custom undici fetch). Both are created with `new Anthropic()`. The existing mock handles this correctly since it mocks the constructor.
**Why it happens:** Architecture choice for different timeout configurations.
**How to avoid:** No action needed -- existing Anthropic mock covers both instantiations. Just be aware when debugging.

### Pitfall 5: Tests That Assert 401 vs Tests That Need Auth Success
**What goes wrong:** Some validation tests (e.g., "returns 400 for missing pdfBase64") now hit the auth check first and return 401 instead of the expected 400.
**Why it happens:** Auth check runs before body validation in the handler.
**How to avoid:** All tests except GET/OPTIONS must provide valid auth headers AND the Supabase getUser mock must return a valid user. Tests for "missing API key" must still provide auth headers (auth runs before API key check).

## Code Examples

### Fix 1: Updated createMockReq (test-fixtures/pass-responses.ts)
```typescript
export function createMockReq(
  overrides?: Record<string, unknown>
): VercelRequest {
  const defaults = {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-jwt-token',
    },
    body: { pdfBase64: Buffer.from('fake-pdf').toString('base64') },
  };
  return { ...defaults, ...overrides } as unknown as VercelRequest;
}
```

### Fix 2: Supabase Mock Block (top of analyze.test.ts and regression.test.ts)
```typescript
// Supabase mock -- must be hoisted above handler import
const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: 'test-user-id' } },
  error: null,
});

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi.fn().mockResolvedValue({
    data: { id: 'contract-db-123', user_id: 'test-user-id' },
    error: null,
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => mockSupabaseChain),
  })),
}));
```

### Fix 3: App.test.tsx Additional Mocks
```typescript
vi.mock('./hooks/useContractStore', () => ({
  useContractStore: () => ({
    contracts: [],
    isLoading: false,
    error: null,
    addContract: vi.fn(),
    updateContract: vi.fn(),
    deleteContract: vi.fn(),
    toggleFindingResolved: vi.fn(),
    updateFindingNote: vi.fn(),
    renameContract: vi.fn(),
  }),
}));
```

### Fix 4: Environment Variables in beforeEach
```typescript
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  // ... existing ANTHROPIC_API_KEY setup
});
```

## Detailed Failure Analysis

### api/analyze.test.ts (18 tests, 16 failing)

| Test | Status | Root Cause |
|------|--------|------------|
| returns 405 for GET | PASS | Auth check runs after method check |
| returns 200 for OPTIONS | PASS | Auth check runs after OPTIONS check |
| returns 400 for missing pdfBase64 | FAIL | Auth check runs BEFORE body validation; `req.headers` is undefined |
| returns 400 for empty pdfBase64 | FAIL | Same as above |
| returns 500 for missing API key | FAIL | Auth check runs BEFORE API key check; `req.headers` is undefined |
| sets CORS headers | FAIL | Crashes at auth check before reaching CORS assertion |
| All 10 successful analysis / pipeline tests | FAIL | Same auth + Supabase createClient crash |
| All 2 schema conformance tests | FAIL | Same root cause |

### api/regression.test.ts (6 tests, all 6 failing)
All tests call `handler(req, res)` and crash at the same auth check line.

### src/App.test.tsx (3 tests, 1 failing)
| Test | Status | Root Cause |
|------|--------|------------|
| renders LoginPage when session is null | PASS | No AuthenticatedApp rendered |
| renders LoadingScreen when isLoading is true | PASS | LoadingScreen expected and found |
| renders full app when session exists | FAIL | AuthenticatedApp's useContractStore starts with isLoading:true, rendering LoadingScreen |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | 18 API tests pass with Supabase mocks | unit (mock fixes) | `npx vitest run api/analyze.test.ts` | Exists, needs mock updates |
| TEST-02 | 6 regression tests pass with Supabase mocks | unit (mock fixes) | `npx vitest run api/regression.test.ts` | Exists, needs mock updates |
| TEST-03 | 3 App tests pass including auth gate | unit (mock fixes) | `npx vitest run src/App.test.tsx` | Exists, needs mock addition |
| TEST-04 | Full suite 269/269 pass | full suite | `npx vitest run` | All files exist |

### Sampling Rate
- **Per task commit:** `npx vitest run {changed_test_file}`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npx vitest run` exits 0 with 269/269 (or more) passing

### Wave 0 Gaps
None -- all test files exist and the test framework is fully configured. Only mock updates needed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct Anthropic API call, no auth | JWT auth + Supabase DB writes | v2.0 (Phases 39-45) | Tests need auth headers + Supabase mocks |
| In-memory state via useState | Supabase persistence via useContractStore | v2.0 | Component tests need useContractStore mock |
| Handler returns merged JSON directly | Handler returns mapRow(DB row) | v2.0 | Response shape may differ; mock DB row must match expected structure |

## Open Questions

1. **Response shape after DB roundtrip**
   - What we know: Handler now does `mapRow(contractRow)` which converts snake_case DB columns to camelCase. Findings come from `mapRows(findingRows)`.
   - What's unclear: Whether the test assertions on response body (e.g., `body.client`, `body.findings[n].id`) need updates because the DB mock returns different keys than the old direct-return format.
   - Recommendation: Make the Supabase insert mock's `.select().single()` return a row that, when passed through `mapRow`, produces the same shape the tests expect. If needed, adjust test assertions to match the new shape.

2. **Additional hooks used by AuthenticatedApp**
   - What we know: `AuthenticatedApp` uses `useContractStore`, `useRouter`, `useToast`. The test already renders inside `ToastProvider` (via custom render).
   - What's unclear: Whether `useRouter` also has Supabase dependencies that would cause failures.
   - Recommendation: Start by mocking only `useContractStore`. If `useRouter` fails, mock it too. `useRouter` likely only uses `window.history` which jsdom provides.

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of all failing test files and production modules
- `npx vitest run` output showing exact error locations (line 268 of analyze.ts)
- `api/analyze.ts` lines 268-284 (auth gate), 308-316 (company profile query), 414-533 (DB writes)
- `api/test-fixtures/pass-responses.ts` lines 297-304 (createMockReq missing headers)
- `src/App.tsx` lines 20-52 (AuthenticatedApp with useContractStore isLoading guard)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all tools already in place
- Architecture: HIGH -- root causes are definitively identified from error output and source code
- Pitfalls: HIGH -- verified by tracing exact execution paths in production code

**Research date:** 2026-03-19
**Valid until:** indefinite (test infrastructure is stable, fixes are deterministic)
