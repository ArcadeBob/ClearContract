# Phase 37: API Integration Tests - Research

**Researched:** 2026-03-16
**Domain:** Vitest integration testing for Vercel serverless handler with mocked Anthropic SDK
**Confidence:** HIGH

## Summary

Phase 37 tests the `/api/analyze` endpoint handler as an integration test -- the handler's own validation, error paths, and the full 16-pass + synthesis pipeline with mocked Anthropic SDK responses. All Anthropic SDK interactions and PDF preparation are mocked at module level; the real merge, scoring, and bid signal logic runs unmocked. The existing test file `api/analyze.test.ts` is a placeholder from Phase 33 (environment check only) and will be replaced.

The primary challenge is constructing a realistic mock for the Anthropic SDK that returns streaming async iterables for each of the 16 analysis passes plus synthesis. Each pass must return pass-specific JSON that the real `mergePassResults` function processes. The VercelRequest/VercelResponse types extend Node's IncomingMessage/ServerResponse, so minimal mock objects with `method`, `body`, `setHeader`, `status`, `json`, and `end` methods suffice.

**Primary recommendation:** Mock `@anthropic-ai/sdk` and `./pdf` at module level. Build a fixture file mapping each pass name to its factory-generated response. Use async generator functions to simulate streaming. Assert response shape and validate every finding against `MergedFindingSchema`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Mock Anthropic SDK at module level: `vi.mock('@anthropic-ai/sdk')` -- replace entire SDK, handler runs real validation/merge logic but never calls Anthropic
- Mock `preparePdfForAnalysis` at module level: `vi.mock('./pdf')` -- return a fake fileId, keeps tests focused on handler path
- Each mocked pass returns realistic pass-specific JSON using Phase 34's factory functions (createIndemnificationPassResult, etc.)
- Mock returns async iterable of streaming chunks (content_block_delta events) to test the handler's streaming collection loop
- Two Anthropic client instances (uploadClient + client) both use the mocked SDK
- Create fake VercelRequest/VercelResponse objects with crafted bodies -- no supertest or HTTP server needed
- 400: missing/malformed pdfBase64 in request body -- tests Zod validation path
- 401: unset ANTHROPIC_API_KEY env var -- tests handler's early return for missing config
- 405: send GET request instead of POST -- tests method check
- 422 (image-based PDF): NOT tested at this level
- 429 (rate limit): NOT tested at integration level
- Focus on handler-owned validation logic, not re-testing utilities
- All 16 analysis passes return distinct realistic data via pass-specific factories
- Synthesis pass (17th) included: mock returns compound risk findings
- Every finding in the full pipeline response validated through MergedFindingSchema.parse()
- Single file: `api/analyze.test.ts` colocated next to `api/analyze.ts`
- Describe blocks: validation tests, error tests, full pipeline test
- Uses `// @vitest-environment node` per-file comment
- Separate fixtures file: `api/test-fixtures/pass-responses.ts`
- Fixtures built using Phase 34's pass-specific factories from `src/test/factories.ts`

### Claude's Discretion
- Exact mock implementation details for streaming async iterable
- VercelRequest/VercelResponse mock shape (minimal viable interface)
- Describe/it nesting structure within the single test file
- Whether to test CORS headers and OPTIONS handling
- File cleanup mock (client.beta.files.delete) testing depth

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-01 | /api/analyze endpoint accepts valid PDF payload and returns structured response | Full pipeline test with mocked SDK; response shape assertions for all top-level fields |
| INTG-02 | /api/analyze returns correct HTTP errors (400 bad input, 401 missing key, 422 image PDF, 429 rate limit) | Handler-owned errors tested (400, 401, 405); 422/429 deferred per CONTEXT decisions |
| INTG-03 | Full pipeline mocked test: PDF upload -> 16 passes + synthesis -> merged findings with risk score | 16 pass-specific factory fixtures + synthesis fixture; real mergePassResults and computeRiskScore run |
| INTG-04 | API response validates against Zod schemas (MergedFindingSchema for each finding) | Every finding in response parsed through MergedFindingSchema.parse() with no errors |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 3.2.x | Test runner | Already configured in vite.config.ts, `api/**/*.test.ts` included |
| vi.mock | (Vitest built-in) | Module-level mocking | Established pattern from Phase 33-36 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | (already installed) | Schema validation in assertions | MergedFindingSchema.parse() for INTG-04 |
| Phase 34 factories | N/A | Test data generation | Building pass-specific finding fixtures |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fake req/res objects | supertest + HTTP server | Supertest adds dependency and startup overhead; fake objects are simpler for single-handler tests |
| vi.mock SDK | MSW (Mock Service Worker) | MSW is out of scope per REQUIREMENTS.md |

## Architecture Patterns

### Recommended Project Structure
```
api/
  analyze.ts              # Handler under test (existing)
  analyze.test.ts         # Integration tests (replace placeholder)
  test-fixtures/
    pass-responses.ts     # Pre-built responses for all 16 passes + synthesis
```

### Pattern 1: Streaming Async Iterable Mock
**What:** The Anthropic SDK's `client.beta.messages.create({ stream: true })` returns an async iterable of SSE events. The handler collects `content_block_delta` events with `text_delta` type.
**When to use:** Every mocked pass call.
**Example:**
```typescript
// Creates an async iterable that yields streaming events
function createStreamResponse(jsonText: string) {
  const chunks = [jsonText]; // Can split into multiple chunks if needed
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield {
          type: 'content_block_delta' as const,
          delta: { type: 'text_delta' as const, text: chunk },
        };
      }
    },
  };
}
```

### Pattern 2: VercelRequest/VercelResponse Mocks
**What:** Minimal objects satisfying the handler's usage of req.method, req.body, res.setHeader, res.status, res.json, res.end.
**When to use:** Every test case.
**Example:**
```typescript
function createMockReq(overrides: Partial<{ method: string; body: unknown }> = {}) {
  return {
    method: 'POST',
    body: { pdfBase64: btoa('fake-pdf-content') },
    ...overrides,
  } as unknown as VercelRequest;
}

function createMockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    headers: {} as Record<string, string>,
    setHeader: vi.fn((key: string, value: string) => { res.headers[key] = value; }),
    status: vi.fn((code: number) => { res.statusCode = code; return res; }),
    json: vi.fn((data: unknown) => { res.body = data; return res; }),
    end: vi.fn(() => res),
  };
  return res as unknown as VercelResponse & typeof res;
}
```

### Pattern 3: Pass-Routing Mock
**What:** The mocked `client.beta.messages.create` must return different JSON for each of the 16 passes + synthesis. Route based on the system prompt or user prompt content.
**When to use:** Full pipeline test.
**Example:**
```typescript
// In the vi.mock factory, the create method inspects the messages
// to determine which pass is running, then returns the corresponding fixture
mockCreate.mockImplementation(async (params: any) => {
  // Determine pass by checking system prompt or user prompt content
  const systemPrompt = params.system || '';
  const passName = identifyPassFromPrompt(systemPrompt);
  const fixture = passFixtures[passName];
  return createStreamResponse(JSON.stringify(fixture));
});
```

### Pattern 4: Knowledge Module Mocking
**What:** The handler imports knowledge modules at the top level and calls `validateAllModulesRegistered()`. These must be mocked to avoid filesystem dependencies.
**When to use:** Required for all tests -- handler will throw at import time without it.
**Example:**
```typescript
vi.mock('../src/knowledge/registry', () => ({
  getAllModules: () => [],
  getModulesForPass: () => [],
  validateAllModulesRegistered: () => {},
  PASS_KNOWLEDGE_MAP: {},
}));

vi.mock('../src/knowledge/index', () => ({
  composeSystemPrompt: (base: string) => base,
  validateTokenBudget: () => {},
}));

// Also mock the side-effect imports
vi.mock('../src/knowledge/regulatory/index', () => ({}));
vi.mock('../src/knowledge/trade/index', () => ({}));
vi.mock('../src/knowledge/standards/index', () => ({}));
```

### Anti-Patterns to Avoid
- **Testing internal SDK behavior:** Don't verify SDK constructor params or internal streaming mechanics -- just verify the handler produces correct output
- **Re-testing merge logic:** The merge function is already tested in Phase 34's `merge.test.ts` -- integration tests verify end-to-end flow, not individual merge behaviors
- **Shared mutable state between tests:** Each test should set up its own env vars and mock responses; use `beforeEach` to reset

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pass-specific finding data | Manual JSON objects | Phase 34 factory functions | Factories are Zod-validated and cover all required fields |
| Request/response testing | HTTP server + supertest | Fake req/res objects | Handler is a function(req, res), no server needed |
| Streaming simulation | Complex event emitter | Simple async generator | Handler only reads `content_block_delta` + `text_delta` events |

## Common Pitfalls

### Pitfall 1: Module-Level Side Effects in analyze.ts
**What goes wrong:** `api/analyze.ts` calls `validateAllModulesRegistered()` at module level (line 271). If knowledge modules are not mocked, import fails.
**Why it happens:** Knowledge module imports (`../src/knowledge/regulatory/index`, etc.) register modules as side effects.
**How to avoid:** Mock ALL knowledge-related imports: `registry`, `index`, `regulatory/index`, `trade/index`, `standards/index`. Must be vi.mock calls (hoisted above imports).
**Warning signs:** "Knowledge modules not registered" error at import time.

### Pitfall 2: Environment Variable Lifecycle
**What goes wrong:** Tests that modify `process.env.ANTHROPIC_API_KEY` leak state to subsequent tests.
**Why it happens:** `process.env` is a shared global.
**How to avoid:** Save original value in `beforeEach`, restore in `afterEach`. Or use `vi.stubEnv`/`vi.unstubAllEnvs`.
**Warning signs:** Tests pass individually but fail when run together.

### Pitfall 3: Async Iterable vs Stream Object
**What goes wrong:** The mock returns a plain object instead of something with `Symbol.asyncIterator`, causing the `for await` loop to fail.
**Why it happens:** Confusion between Node streams, ReadableStream, and async iterables.
**How to avoid:** The mock only needs `[Symbol.asyncIterator]` returning an async generator. The handler does `for await (const event of response)`.
**Warning signs:** "response is not iterable" or "response[Symbol.asyncIterator] is not a function".

### Pitfall 4: MergedFindingSchema Requires Client-Side Fields
**What goes wrong:** INTG-04 validation fails because findings from the handler lack `id`, `resolved`, `note`, `negotiationPosition`, `actionPriority`.
**Why it happens:** The handler adds `id` (line 399) but NOT `resolved` or `note`. `MergedFindingSchema` requires those fields.
**How to avoid:** When validating INTG-04, either: (a) validate against a subset schema that matches the API response shape, or (b) augment findings with client-side defaults before parsing. The handler response findings have `id` but lack `resolved`/`note` -- these are added client-side in `useContractStore`. The INTG-04 requirement says "validates against MergedFindingSchema" but the API response findings are pre-client-augmentation. Test should validate: (1) all API-provided fields are present and typed, (2) adding `resolved: false, note: ''` makes them MergedFindingSchema-compatible.
**Warning signs:** ZodError for missing `resolved` or `note` fields.

### Pitfall 5: `undici` Import and Dispatcher
**What goes wrong:** The handler imports `{ fetch as undiciFetch, Agent }` from `undici`. In test env, undici may not behave as expected.
**Why it happens:** The handler creates a custom undici Agent and fetch wrapper.
**How to avoid:** Since we mock the entire Anthropic SDK, the custom fetch is never actually called. But the `new Agent()` constructor still runs. Mock `undici` if it causes issues, or let it construct harmlessly (Agent constructor should work in Node env).
**Warning signs:** "Cannot find module 'undici'" or Agent constructor errors.

### Pitfall 6: crypto.randomUUID in Node Test Environment
**What goes wrong:** The handler uses `crypto.randomUUID()` (line 399) which is available in Node 19+ and modern environments.
**Why it happens:** Vitest runs in Node, but older Node versions may not have it.
**How to avoid:** Should work fine with modern Node. If not, mock `crypto.randomUUID`.
**Warning signs:** "crypto.randomUUID is not a function".

## Code Examples

### Complete Pass Fixture Structure
```typescript
// api/test-fixtures/pass-responses.ts
import { ANALYSIS_PASSES } from '../passes';
import {
  createIndemnificationFinding,
  createPaymentContingencyFinding,
  // ... all 15 factory imports
} from '../../src/test/factories';

// Map pass names to factory-generated fixture responses
export const passFixtures: Record<string, { findings: unknown[]; dates: unknown[]; client?: string; contractType?: string }> = {
  'risk-overview': {
    findings: [{ severity: 'High', category: 'Risk Assessment', title: 'Overview finding', description: '...', recommendation: '...', clauseReference: 'Section 1' }],
    dates: [{ label: 'Substantial Completion', date: '2026-12-01', type: 'Deadline' }],
    client: 'Acme Construction',
    contractType: 'Subcontract',
  },
  'legal-indemnification': {
    findings: [createIndemnificationFinding()],
    dates: [],
  },
  'legal-payment-contingency': {
    findings: [createPaymentContingencyFinding()],
    dates: [],
  },
  // ... one entry per pass using corresponding factory
};

export const synthesisFixture = {
  findings: [
    {
      title: 'Cash Flow Squeeze',
      description: 'Pay-if-paid + high retainage creates cash flow risk',
      recommendation: 'Negotiate payment terms before signing',
      constituentFindings: ['Test PaymentContingency Finding 0', 'Test Retainage Finding 0'],
      actionPriority: 'pre-sign',
    },
  ],
};
```

### Anthropic SDK Mock Pattern
```typescript
// In api/analyze.test.ts
const mockCreate = vi.fn();
const mockFileDelete = vi.fn().mockResolvedValue({});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      beta: {
        messages: { create: mockCreate },
        files: { delete: mockFileDelete },
      },
    })),
  };
});

vi.mock('./pdf', () => ({
  preparePdfForAnalysis: vi.fn().mockResolvedValue({
    fileId: 'file-test-123',
    usedFallback: false,
  }),
}));
```

### Identifying Pass from Mock Call
```typescript
// The handler calls runAnalysisPass for each ANALYSIS_PASSES entry.
// Promise.allSettled maps over ANALYSIS_PASSES, so calls arrive in order.
// Track call index to map to pass name:
let callIndex = 0;
const passNames = ANALYSIS_PASSES.map(p => p.name);

mockCreate.mockImplementation(async (params: any) => {
  const currentPass = passNames[callIndex] || 'synthesis';
  callIndex++;
  const fixture = currentPass === 'synthesis'
    ? synthesisFixture
    : passFixtures[currentPass];
  return createStreamResponse(JSON.stringify(fixture));
});
```

**Note on call ordering:** `Promise.allSettled` starts all promises immediately but the mock resolves synchronously in the same microtask. The call index approach works because `mockCreate` is called synchronously within each `.map()` iteration before any awaits. However, a safer approach is to inspect `params.system` content to identify the pass.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct JSON response mocking | Streaming async iterable mocking | Phase 27 (v1.5) added streaming | Must mock async iteration, not plain objects |
| Single API call | 16 parallel passes + synthesis | Phase 27 (v1.5) multi-pass pipeline | Fixtures needed for all 16 pass schemas |

## Open Questions

1. **Call order reliability in Promise.allSettled mock**
   - What we know: `ANALYSIS_PASSES.map()` calls `runAnalysisPass` synchronously for each pass, creating promises. The mock's `mockCreate` is invoked during each call.
   - What's unclear: Whether the call index approach is 100% reliable given that `mockCreate` is async.
   - Recommendation: Use call index as primary approach but add a safety check using `params.system` content to verify pass identity. If index approach proves unreliable, fall back to prompt-based routing.

2. **undici Agent constructor in test environment**
   - What we know: The handler creates `new Agent(...)` from undici. Since the SDK is fully mocked, the Agent's custom fetch is never used.
   - What's unclear: Whether undici Agent constructor has side effects that cause test issues.
   - Recommendation: Let it run. If it causes issues, add `vi.mock('undici')`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x (inline config in vite.config.ts) |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run api/analyze.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | Valid PDF returns structured response | integration | `npx vitest run api/analyze.test.ts -t "valid PDF"` | Placeholder only |
| INTG-02 | Error HTTP codes (400, 401, 405) | integration | `npx vitest run api/analyze.test.ts -t "error"` | Placeholder only |
| INTG-03 | Full 16-pass + synthesis pipeline | integration | `npx vitest run api/analyze.test.ts -t "pipeline"` | Placeholder only |
| INTG-04 | Findings validate against MergedFindingSchema | integration | `npx vitest run api/analyze.test.ts -t "schema"` | Placeholder only |

### Sampling Rate
- **Per task commit:** `npx vitest run api/analyze.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/analyze.test.ts` -- replace placeholder with real integration tests
- [ ] `api/test-fixtures/pass-responses.ts` -- new fixture file for all 16 passes + synthesis

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` -- Handler source code (lines 1-443), full understanding of validation, pipeline, and error paths
- `api/merge.ts` -- Merge function source, UnifiedFinding type, dedup logic
- `api/passes.ts` -- All 16 pass definitions with names and schemas
- `api/pdf.ts` -- preparePdfForAnalysis signature (mock target)
- `src/schemas/finding.ts` -- MergedFindingSchema (INTG-04 validation target)
- `src/schemas/synthesisAnalysis.ts` -- SynthesisPassResultSchema
- `src/test/factories.ts` -- All 15 pass-specific factory functions
- `@vercel/node` type definitions -- VercelRequest/VercelResponse interface
- `vite.config.ts` -- Vitest configuration confirming `api/**/*.test.ts` inclusion
- Existing tests: `api/merge.test.ts`, `api/analyze.test.ts` (placeholder)

### Secondary (MEDIUM confidence)
- `src/knowledge/registry.ts` -- Module registration and validation (mock target)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vitest already configured, patterns established in Phases 33-36
- Architecture: HIGH - Handler source fully understood, mock points clearly identified
- Pitfalls: HIGH - Derived from actual source code analysis (knowledge module side effects, MergedFindingSchema field requirements, env var lifecycle)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- no external dependencies changing)
