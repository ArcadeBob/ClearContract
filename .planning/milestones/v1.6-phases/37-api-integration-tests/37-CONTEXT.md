# Phase 37: API Integration Tests - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Test that the /api/analyze endpoint correctly validates input, handles all error conditions, and processes the full 17-pass pipeline (16 analysis + synthesis) through to merged findings with risk score. No live API calls -- all Anthropic SDK interactions are mocked. No new feature code -- test-only phase.

</domain>

<decisions>
## Implementation Decisions

### Mocking strategy
- Mock Anthropic SDK at module level: `vi.mock('@anthropic-ai/sdk')` -- replace entire SDK, handler runs real validation/merge logic but never calls Anthropic
- Mock `preparePdfForAnalysis` at module level: `vi.mock('./pdf')` -- return a fake fileId, keeps tests focused on handler path
- Each mocked pass returns realistic pass-specific JSON using Phase 34's factory functions (createIndemnificationPassResult, etc.)
- Mock returns async iterable of streaming chunks (content_block_delta events) to test the handler's streaming collection loop
- Two Anthropic client instances (uploadClient + client) both use the mocked SDK

### Error simulation
- Create fake VercelRequest/VercelResponse objects with crafted bodies -- no supertest or HTTP server needed
- 400: missing/malformed pdfBase64 in request body -- tests Zod validation path
- 401: unset ANTHROPIC_API_KEY env var -- tests handler's early return for missing config
- 405: send GET request instead of POST -- tests method check
- 422 (image-based PDF): NOT tested at this level -- that's preparePdfForAnalysis's concern, tested via unit tests if needed
- 429 (rate limit): NOT tested at integration level -- classifyError mapping already tested in Phase 34's errors.test.ts
- Focus on handler-owned validation logic, not re-testing utilities

### Pipeline coverage depth
- All 16 analysis passes return distinct realistic data via pass-specific factories -- proves every pass schema flows through merge correctly
- Synthesis pass (17th) included: mock returns compound risk findings, verifies they're appended to merged output with unique IDs
- Every finding in the full pipeline response validated through MergedFindingSchema.parse() -- no spot-checking, catches any finding missing required fields
- Response shape verified: client, contractType, riskScore, scoreBreakdown, bidSignal, findings, dates, passResults all present and typed

### Test file organization
- Single file: `api/analyze.test.ts` colocated next to `api/analyze.ts` -- matches Phase 33 convention
- Describe blocks: validation tests, error tests, full pipeline test
- Uses `// @vitest-environment node` per-file comment (API tests run in node, not jsdom)
- Separate fixtures file: `api/test-fixtures/pass-responses.ts` with pre-built responses for all 16 passes + synthesis
- Fixtures built using Phase 34's pass-specific factories from `src/test/factories.ts`

### Claude's Discretion
- Exact mock implementation details for streaming async iterable
- VercelRequest/VercelResponse mock shape (minimal viable interface)
- Describe/it nesting structure within the single test file
- Whether to test CORS headers and OPTIONS handling
- File cleanup mock (client.beta.files.delete) testing depth

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test target (the handler under test)
- `api/analyze.ts` -- Main handler: validation, PDF upload, 16 parallel passes, merge, synthesis, response
- `api/merge.ts` -- mergePassResults function called by handler (real logic, not mocked)
- `api/pdf.ts` -- preparePdfForAnalysis (mocked at module level)
- `api/passes.ts` -- ANALYSIS_PASSES array defining all 16 passes + schemas
- `api/scoring.ts` -- computeRiskScore called during merge (real logic, not mocked)

### Schemas (for response validation)
- `src/schemas/analysis.ts` -- PassResultSchema, RiskOverviewResultSchema, MergedAnalysisResult
- `src/schemas/legalAnalysis.ts` -- 11 legal pass-specific schemas
- `src/schemas/scopeComplianceAnalysis.ts` -- 4 scope/compliance pass-specific schemas
- `src/schemas/synthesisAnalysis.ts` -- SynthesisPassResultSchema
- `src/schemas/finding.ts` -- MergedFindingSchema (validation target for INTG-04)

### Test infrastructure (from Phase 33/34)
- `src/test/factories.ts` -- Pass-specific factories to reuse for fixture generation
- `vite.config.ts` -- Vitest config, test include paths cover `api/**/*.test.ts`

### Utilities tested through handler
- `src/utils/bidSignal.ts` -- computeBidSignal called in handler
- `src/utils/errors.ts` -- classifyError, formatApiError used in catch block

### Requirements
- `.planning/REQUIREMENTS.md` -- INTG-01 through INTG-04 define acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts`: Pass-specific factories (createIndemnificationPassResult, etc.) from Phase 34 -- reuse to build all 16 pass response fixtures
- `api/passes.ts`: ANALYSIS_PASSES array defines pass names and schemas -- iterate to build mock routing
- Phase 34's merge.test.ts patterns for constructing PromiseSettledResult arrays

### Established Patterns
- `// @vitest-environment node` per-file comment for API tests (Phase 33)
- vi.mock at module level for isolation (Phase 35: vi.mock contractStorage)
- Factory pattern: `createX({overrides})` returns Zod-validated defaults (Phase 33/34)
- MergedFindingSchema.parse() for all finding assertions (Phase 34)

### Integration Points
- `api/analyze.test.ts` colocated alongside `api/analyze.ts`
- `api/test-fixtures/pass-responses.ts` new fixtures file in api/ directory
- `src/test/factories.ts` factories reused (not modified) for fixture building

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

*Phase: 37-api-integration-tests*
*Context gathered: 2026-03-16*
