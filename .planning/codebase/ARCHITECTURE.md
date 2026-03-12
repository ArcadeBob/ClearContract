# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** Client-server SPA with serverless backend, multi-pass AI analysis pipeline

**Key Characteristics:**
- Single-page React application with view-based routing (no router library)
- Centralized in-memory state via a single custom hook (`useContractStore`)
- Vercel serverless function as the sole backend endpoint (`/api/analyze`)
- Multi-pass parallel AI analysis pipeline using Claude structured outputs
- Domain knowledge module system for injecting regulatory/trade context into AI prompts
- Zod schemas enforce type-safe structured responses from Claude API
- No database or persistence layer; state resets on page refresh

## Layers

**Presentation Layer (Pages + Components):**
- Purpose: Render UI, handle user interactions, display analysis results
- Location: `src/pages/`, `src/components/`
- Contains: React functional components using Tailwind CSS and Framer Motion
- Depends on: State layer (useContractStore), types
- Used by: `src/App.tsx` (view router)

**State Layer:**
- Purpose: Manage application state (contracts, active view, upload status)
- Location: `src/hooks/useContractStore.ts`
- Contains: Single hook wrapping `useState` calls; no Context API or Redux
- Depends on: `src/types/contract.ts`, `src/data/mockContracts.ts`
- Used by: `src/App.tsx` exclusively (state is prop-drilled to pages)

**Client API Layer:**
- Purpose: Encode PDF to base64, POST to serverless function, handle response/errors
- Location: `src/api/analyzeContract.ts`
- Contains: `analyzeContract()` function, `readFileAsBase64()` helper
- Depends on: `src/types/contract.ts`, `src/knowledge/profileLoader.ts`
- Used by: `src/App.tsx` (upload handler)

**Server API Layer:**
- Purpose: Receive PDF, extract text, run multi-pass Claude analysis, merge results
- Location: `api/analyze.ts` (Vercel serverless function, 1745 lines)
- Contains: Pass definitions, PDF preparation, Claude API calls, result merging, deduplication, risk scoring
- Depends on: `src/schemas/`, `src/knowledge/`, `src/utils/bidSignal.ts`, `src/types/contract.ts`
- Used by: Client API layer via HTTP POST to `/api/analyze`

**Schema Layer:**
- Purpose: Define Zod schemas for Claude structured output responses; ensure type-safe AI results
- Location: `src/schemas/`
- Contains: `analysis.ts` (core/merged schemas), `legalAnalysis.ts` (11 legal pass schemas), `scopeComplianceAnalysis.ts` (4 scope pass schemas)
- Depends on: `zod`
- Used by: `api/analyze.ts` (converted to JSON Schema for Claude output_config)

**Knowledge Layer:**
- Purpose: Inject domain-specific regulatory, trade, and standards context into AI prompts
- Location: `src/knowledge/`
- Contains: Module registry, token budget enforcement, prompt composition, company profile
- Depends on: Nothing external
- Used by: `api/analyze.ts` (via `composeSystemPrompt()`), `src/api/analyzeContract.ts` (via `loadCompanyProfile()`)

**Types Layer:**
- Purpose: Define all domain types used across client and server
- Location: `src/types/contract.ts`
- Contains: `Contract`, `Finding`, `ContractDate`, `Severity`, `Category`, `ViewState`, `LegalMeta`, `ScopeMeta`, `BidSignal`, `CompanyProfile`
- Depends on: Nothing
- Used by: All other layers

**Utilities Layer:**
- Purpose: Pure computation functions
- Location: `src/utils/`
- Contains: `bidSignal.ts` (bid/no-bid signal computation), `categoryIcons.ts` (icon mapping)
- Depends on: `src/types/contract.ts`
- Used by: `api/analyze.ts`, presentation components

## Data Flow

**Contract Upload and Analysis Flow:**

1. User drops PDF onto `UploadZone` component (react-dropzone, max 10MB, PDF only)
2. `App.tsx` `handleUploadComplete()` creates a placeholder `Contract` with `status: 'Analyzing'`, adds it to state via `addContract()`, and navigates to review page
3. `analyzeContract()` in `src/api/analyzeContract.ts` reads file as base64 via `FileReader`, loads company profile from localStorage, POSTs both to `/api/analyze`
4. `api/analyze.ts` serverless function:
   a. Decodes base64 PDF to buffer, validates size
   b. Uploads PDF to Anthropic Files API (or falls back to text extraction via `unpdf`)
   c. Runs all 16 analysis passes in parallel via `Promise.allSettled()`
   d. Each pass calls Claude (`claude-sonnet-4-5-20250929`) with pass-specific system prompt, structured output schema, and file reference
   e. Merges results: collects findings/dates, deduplicates by clauseReference+category then by title (specialized passes win over general), computes deterministic risk score
   f. Applies CA void-by-law severity guard (display-only upgrade)
   g. Computes bid/no-bid signal from deduplicated findings
   h. Returns merged JSON response, cleans up uploaded file
5. On success, `App.tsx` calls `updateContract(id, result)` to replace placeholder data
6. On failure, `updateContract()` creates a single Critical "Analysis Failed" finding

**State Management:**
- All state lives in `useContractStore()` hook, called once in `App.tsx`
- State is prop-drilled to pages: `contracts`, `activeContract`, `navigateTo`
- No persistence: `contracts` initializes from `MOCK_CONTRACTS` on every page load
- Company profile persisted separately in localStorage via `src/knowledge/profileLoader.ts`

**Navigation:**
- `ViewState` type: `'dashboard' | 'upload' | 'review' | 'contracts' | 'settings'`
- `navigateTo(view, contractId?)` sets active view and optional contract ID
- `App.tsx` `renderContent()` switch renders the corresponding page component
- `Sidebar` component renders nav items, calls `onNavigate` callback

## Key Abstractions

**Multi-Pass Analysis Pipeline:**
- Purpose: Break contract analysis into 16 specialized Claude API calls run in parallel
- Defined in: `api/analyze.ts` `ANALYSIS_PASSES` array (lines 108+)
- Pattern: Each `AnalysisPass` has `name`, `systemPrompt`, `userPrompt`, `schema` (Zod), and flags (`isOverview`, `isLegal`, `isScope`)
- Pass categories: 1 risk-overview, 11 legal clause passes, 4 scope/compliance passes
- Execution: `runAnalysisPass()` calls Claude with pass-specific schema via `output_config`
- Merging: `mergePassResults()` deduplicates, computes risk score, applies severity guards

**Knowledge Module System:**
- Purpose: Inject domain-specific context (regulations, trade standards) into per-pass prompts
- Registry: `src/knowledge/registry.ts` - `PASS_KNOWLEDGE_MAP` maps pass names to module IDs
- Registration: Modules self-register via side-effect imports (e.g., `src/knowledge/regulatory/index.ts`)
- Composition: `composeSystemPrompt()` appends matched modules and company profile to base prompt
- Budget: `src/knowledge/tokenBudget.ts` enforces 10K token cap per module, max 4 modules per pass

**Finding Model:**
- Purpose: Unified representation of a contract analysis finding across all pass types
- Definition: `src/types/contract.ts` `Finding` interface
- Extensions: `LegalMeta` (11 discriminated union variants by `clauseType`) and `ScopeMeta` (4 variants by `passType`)
- Conversion: `api/analyze.ts` `convertLegalFinding()` and `convertScopeFinding()` map pass-specific flat fields into the `legalMeta`/`scopeMeta` nested structure

**Company Profile:**
- Purpose: Customize analysis by comparing contract requirements against company capabilities
- Definition: `src/knowledge/types.ts` `CompanyProfile` interface
- Storage: localStorage key `clearcontract:company-profile`
- Loader: `src/knowledge/profileLoader.ts` merges stored values with `DEFAULT_COMPANY_PROFILE`
- Usage: Sent to server with each analysis request; injected into prompts of select passes

## Entry Points

**Client Entry:**
- Location: `src/index.tsx`
- Triggers: Browser loads `index.html` which loads Vite-bundled JS
- Responsibilities: Renders `<App />` into DOM root

**Application Root:**
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Initializes state via `useContractStore()`, renders `Sidebar` + active page, orchestrates upload-to-analysis flow

**Server Entry:**
- Location: `api/analyze.ts` `export default handler()`
- Triggers: POST to `/api/analyze`
- Responsibilities: Validates request, orchestrates multi-pass analysis, returns merged results

## Error Handling

**Strategy:** Defensive with graceful degradation; errors surface as findings in the UI rather than crashes

**Patterns:**
- Client API (`src/api/analyzeContract.ts`): Parses HTTP error responses (JSON or HTML), throws typed `Error` with descriptive message
- `App.tsx` catch block: Converts any analysis error into a Critical finding with "Analysis Failed" title, so the user sees it in the review page
- Server (`api/analyze.ts`): `Promise.allSettled()` ensures individual pass failures don't abort other passes; failed passes become Critical "Analysis Pass Failed" findings
- Server error codes: 400 (bad input), 401/500 (API key), 405 (wrong method), 429 (rate limit), 504 (timeout)
- File cleanup: `finally` block deletes uploaded file from Anthropic Files API (best-effort)
- Knowledge system: Throws on missing modules or token budget violations (fail-fast during development)

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` in `api/analyze.ts` for timing and failure tracking; no structured logging framework

**Validation:** Zod schemas enforce structured output from Claude; input validation in serverless handler (size, type, required fields); client-side file type/size validation in `analyzeContract()`

**Authentication:** No user authentication; API key (`ANTHROPIC_API_KEY`) is server-side only; CORS restricts to `ALLOWED_ORIGIN`

**PDF Processing:** Anthropic Files API (primary) with `unpdf` text extraction fallback; 10MB size limit; 100-page threshold for fallback decision

---

*Architecture analysis: 2026-03-12*
