# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** View-based SPA with client-side state management and server-side AI analysis pipeline.

**Key Characteristics:**
- Single-page application with view routing (no Next.js, no React Router)
- Centralized in-memory state via custom `useContractStore` hook
- Asynchronous AI processing via Vercel serverless function
- Immediate UI feedback with placeholder contracts during analysis
- Two-tier contract analysis: client-side validation + server-side Claude API integration

## Layers

**Presentation Layer (Components):**
- Purpose: Render UI and handle user interactions
- Location: `src/components/` and `src/pages/`
- Contains: Functional React components with hooks, Tailwind styling, Framer Motion animations
- Depends on: React, custom hooks, types, Lucide icons
- Used by: `App.tsx` root component

**Business Logic Layer (Hooks & Services):**
- Purpose: Manage application state and coordinate data flow
- Location: `src/hooks/useContractStore.ts`, `src/api/analyzeContract.ts`
- Contains: Custom hooks for state management, API wrapper functions
- Depends on: React hooks, types, Anthropic SDK (indirectly via server)
- Used by: Page components and `App.tsx`

**Data Layer (Types & Data):**
- Purpose: Define domain contracts and provide mock data for initialization
- Location: `src/types/contract.ts`, `src/data/mockContracts.ts`
- Contains: TypeScript interfaces (Contract, Finding, ContractDate, ViewState), constants for mock data
- Depends on: None (foundational layer)
- Used by: All other layers

**API/Integration Layer:**
- Purpose: Handle external service integration and PDF processing
- Location: `api/analyze.ts` (Vercel serverless), `src/api/analyzeContract.ts` (client wrapper)
- Contains: Vercel request/response handler, PDF extraction, Claude API communication
- Depends on: Anthropic SDK, pdf-parse, @vercel/node
- Used by: `App.tsx` when handling file uploads

## Data Flow

**Contract Upload & Analysis Flow:**

1. User selects PDF in `UploadZone` component (via `ContractUpload` page)
2. `App.tsx` `handleUploadComplete` called with File object
3. Placeholder contract created in "Analyzing" state and added to store
4. Navigation redirects to review page immediately (placeholder visible)
5. `analyzeContract()` in `src/api/analyzeContract.ts` triggers:
   - Converts PDF to base64 in browser
   - POST to `/api/analyze` with encoded PDF
6. `api/analyze.ts` (serverless) receives request:
   - Decodes base64 → Buffer
   - `pdf-parse` extracts text (validates 100+ chars, rejects image PDFs)
   - Truncates text to 100k chars to fit Claude context
   - Sends to Claude API with domain-specific system prompt
   - Parses JSON response, validates data, normalizes findings & dates
   - Returns AnalysisResult with client, contractType, riskScore, findings, dates
7. Response flows back to client, `updateContract()` called in store
8. Contract status changes to "Reviewed", placeholder updated with real data
9. Component re-renders with findings visible
10. On error: Critical finding created with error message

**State Transitions:**

```
Contract created with status: "Analyzing" → "Reviewed" (on success)
                                           → "Reviewed" (on error, with error finding)
```

**State Management:**

- Single source of truth: `contracts` array in `useContractStore`
- Active contract: `activeContractId` tracks currently viewed contract
- Active view: `activeView` tracks which page is rendered (dashboard, upload, review, contracts, settings)
- Uploads in flight: `isUploading` flag (defined but not actively used in current code)
- State is ephemeral: Lost on page refresh, no persistence layer

## Key Abstractions

**Contract:**
- Purpose: Represents a single glazing/construction contract with analysis results
- Examples: `src/types/contract.ts` (type definition), `src/data/mockContracts.ts` (instances)
- Pattern: Immutable data structure with id, metadata (name, client, type), analysis results (riskScore, findings, dates), status

**Finding:**
- Purpose: Represents a single issue or risk flagged during contract analysis
- Examples: All findings within Contract objects in `src/data/mockContracts.ts`
- Pattern: Severity-based classification (Critical, High, Medium, Low, Info), category-based organization (9 categories: Legal Issues, Scope of Work, etc.), includes title, description, optional recommendation and clause reference

**ViewState:**
- Purpose: Type-safe navigation between application pages
- Pattern: Literal union type ('dashboard' | 'upload' | 'review' | 'contracts' | 'settings') rather than route objects

**AnalysisResult:**
- Purpose: Structured response from AI analysis API
- Pattern: Validated and normalized output from Claude, matching Contract data structure

## Entry Points

**Application Root:**
- Location: `src/index.tsx`
- Triggers: Page load, renders React app into DOM element with id="root"
- Responsibilities: React mounting point

**Main App Component:**
- Location: `src/App.tsx`
- Triggers: Loaded by `src/index.tsx`
- Responsibilities:
  - Render Sidebar + active page via view-based routing
  - Manage navigation via `navigateTo()`
  - Handle file uploads via `handleUploadComplete()`
  - Coordinate placeholder creation and background analysis
  - Error handling for analysis failures

**Page Components (Routable):**
- `src/pages/Dashboard.tsx`: Overview of all contracts, recent uploads, statistics
- `src/pages/ContractUpload.tsx`: PDF upload interface
- `src/pages/ContractReview.tsx`: Detailed analysis view with findings, timeline, filtering
- `src/pages/AllContracts.tsx`: List view of all contracts
- `src/pages/Settings.tsx`: Application settings (placeholder)

**Vercel Serverless Function:**
- Location: `api/analyze.ts`
- Triggers: HTTP POST request to `/api/analyze`
- Responsibilities: Orchestrate PDF processing and Claude API call

## Error Handling

**Strategy:** Try-catch at integration points, errors converted to Critical findings in contract.

**Patterns:**

1. **File Validation:** `analyzeContract()` in `src/api/analyzeContract.ts` validates file size (≤3MB) and type (application/pdf) before processing
2. **PDF Processing:** `api/analyze.ts` validates text extraction (≥100 chars), rejects image-based PDFs with specific 422 error
3. **API Errors:** Catch Anthropic SDK errors, check status codes (429=rate limit, 401=auth, others=500), return user-friendly messages
4. **JSON Parsing:** Try-parse response, handle markdown code fence wrapping, fallback on SyntaxError
5. **Contract Update:** On analysis error, `updateContract()` creates Critical finding with error message rather than leaving contract in "Analyzing" state indefinitely

## Cross-Cutting Concerns

**Logging:**
- Client: Console errors from API wrapper
- Server: `console.error()` in serverless function error handler
- No structured logging framework

**Validation:**
- Client: File type/size checks in UploadZone and analyzeContract
- Server: pdfBase64 presence, text extraction length, JSON structure
- Type safety: TypeScript strict mode enabled, all domain types exported from `src/types/contract.ts`

**Authentication:**
- API Key: `ANTHROPIC_API_KEY` in environment variables (Vercel project settings)
- No user authentication; app assumes single-user/organization context
- API key protected on server-side only (never exposed to client)

**Caching & Optimization:**
- No caching layer; each analysis re-runs Claude API (costs money, but fresh results)
- Placeholder contracts enable immediate UX feedback while background task runs
- PDF text truncated to 100k chars to reduce API costs and stay within token limits
- react-dropzone handles file drag-drop with built-in validation

---

*Architecture analysis: 2026-03-01*
