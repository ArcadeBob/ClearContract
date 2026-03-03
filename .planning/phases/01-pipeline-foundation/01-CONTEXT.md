# Phase 1: Pipeline Foundation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken production analysis pipeline and build a multi-pass analysis engine with native PDF support and structured output. User can upload a 50+ page glazing subcontract PDF and receive a complete, valid analysis result. This phase delivers working plumbing — later phases add the specialized analysis prompts.

</domain>

<decisions>
## Implementation Decisions

### Multi-pass strategy
- Focused passes by category — each API call gets the full contract text with a targeted prompt for one analysis domain
- Phase 1 implements 2-3 basic passes to prove the engine works (e.g., general risk overview + dates/deadlines + scope extraction)
- Later phases add and refine passes for legal specifics, compliance, and verbiage
- All passes run in parallel via Promise.all() for speed (~15-30s total vs ~45-90s sequential)
- Full contract text sent to each pass — no chunking, Claude's 200k token window handles 100+ page contracts easily

### PDF handling
- Native PDF is the primary approach — send raw PDF bytes to Claude via document content blocks
- Claude reads the PDF directly for better understanding of tables, headers, and formatting
- Text extraction (unpdf, replacing pdf-parse) is the fallback for contracts exceeding Claude's native PDF limits (~100 pages)
- Max file size increased from 3MB to 25MB to handle real subcontracts with exhibits
- Scanned/image-based PDFs: attempt native PDF analysis anyway (Claude vision can read them), but warn user results may be incomplete
- Graceful degradation: native PDF first, text extraction fallback, never reject outright

### Error handling & timeouts
- Single /api/analyze endpoint fires all passes in parallel within Vercel's 60-second function timeout
- Partial results displayed when some passes succeed and others fail — user sees what worked plus clear indicators of what failed
- Simple loading state during analysis ("Analyzing...") — no per-pass progress tracking needed for ~15-30s wait
- Each pass is independent — one failure doesn't block others

### Analysis output shape
- Finding type extended now with optional fields for later phases (clauseText, explanation, riskType, negotiation) — no breaking changes when Phase 2+ fills them in
- Existing 9 categories kept as-is (Legal Issues, Scope of Work, Contract Compliance, Labor Compliance, Insurance Requirements, Important Dates, Financial Terms, Technical Standards, Risk Assessment)
- Keep Claude Sonnet model — good cost/quality balance for contract analysis
- Risk score (0-100) computed deterministically from findings count and severity, not AI-determined — explainable and consistent
- Structured output via Zod schemas for every API response — guaranteed valid JSON, no parsing failures

### Claude's Discretion
- Exact Zod schema structure and validation rules
- How to detect scanned vs text-based PDFs
- unpdf integration details and fallback threshold
- Pass prompt design and category-to-pass mapping
- Risk score computation weights per severity level
- Error retry logic (if any) before showing partial results

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/analyze.ts`: Current serverless function — will be significantly rewritten but provides the CORS handling, error response patterns, and Anthropic SDK usage
- `src/api/analyzeContract.ts`: Client-side API wrapper with base64 encoding and fetch — needs update for larger files and new response shape
- `src/types/contract.ts`: Core type definitions (Finding, ContractDate, Contract, Severity, Category) — will be extended with optional fields
- `src/hooks/useContractStore.ts`: Central state hook with addContract/updateContract — partial result updates can use existing updateContract()
- `src/components/UploadZone.tsx`: Drag-and-drop upload with react-dropzone — needs max size config update
- `src/components/FindingCard.tsx`, `SeverityBadge.tsx`, `CategoryFilter.tsx`: UI components that render findings — no changes needed in Phase 1

### Established Patterns
- Vercel serverless functions in `api/` directory with `@vercel/node` types
- Anthropic SDK initialized per-request with env var API key
- Client sends base64-encoded PDF, server decodes and processes
- Contract enters "Analyzing" state immediately, updated on completion via updateContract()
- Color-coded severity system (red/amber/yellow/blue/slate) used throughout

### Integration Points
- `api/analyze.ts` is the only endpoint — multi-pass logic goes here
- `App.tsx` orchestrates upload flow: create placeholder contract -> call analyzeContract -> updateContract with results
- `vercel.json` configures function timeout (currently 60s) and may need body size limits for 25MB uploads

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the infrastructure foundation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-pipeline-foundation*
*Context gathered: 2026-03-02*
