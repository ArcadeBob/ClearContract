# External Integrations

**Analysis Date:** 2026-03-12

## APIs & External Services

**AI/LLM:**
- Anthropic Claude API - Core contract analysis engine
  - SDK: `@anthropic-ai/sdk` ^0.78.0
  - Client initialized in `api/analyze.ts` with custom `undici` fetch agent
  - Model: `claude-sonnet-4-5-20250929`
  - Beta features: `files-api-2025-04-14` (PDF file upload via Files API)
  - Auth: `ANTHROPIC_API_KEY` env var (server-side only)
  - Max tokens per pass: 8192
  - Structured output via `output_config.format` using Zod-to-JSON-Schema conversion
  - Custom HTTP agent: `undici.Agent` with 5-minute connect/body timeouts

**Analysis Pipeline (multi-pass):**
The serverless function in `api/analyze.ts` runs 16 sequential Claude API calls per contract:

1. `risk-overview` - Client name, contract type, top risks
2. `dates-deadlines` - Timeline extraction
3. `scope-of-work` - Scope analysis
4. `legal-indemnification` - Indemnification clauses
5. `legal-payment-contingency` - Pay-if-paid / pay-when-paid
6. `legal-liquidated-damages` - LD provisions
7. `legal-retainage` - Retainage terms
8. `legal-insurance` - Insurance requirements
9. `legal-termination` - Termination clauses
10. `legal-flow-down` - Flow-down provisions
11. `legal-no-damage-delay` - No-damage-for-delay clauses
12. `legal-lien-rights` - Lien rights analysis
13. `legal-dispute-resolution` - Dispute resolution mechanisms
14. `legal-change-order` - Change order procedures
15. `scope-verbiage` - Contract language analysis
16. `scope-labor-compliance` - Labor compliance requirements

Each pass uses a dedicated Zod schema for structured output validation:
- Legal schemas: `src/schemas/legalAnalysis.ts`
- Scope schemas: `src/schemas/scopeComplianceAnalysis.ts`
- Overview schema: `src/schemas/analysis.ts`

## PDF Processing

**Text Extraction:**
- `unpdf` library (v1.4.0) - Server-side PDF text extraction in `api/analyze.ts`
- Also uses Anthropic Files API beta for direct PDF upload to Claude
- Max file size: 10 MB (enforced client-side in `src/api/analyzeContract.ts` and server-side)
- Page count threshold: 100 pages

**Client-side:**
- PDF converted to base64 via `FileReader` API in `src/api/analyzeContract.ts`
- Sent as JSON payload to `/api/analyze` endpoint

## Data Storage

**Databases:**
- None - No database. All data is in-memory React state only.

**Client-side Persistence:**
- `localStorage` - Company profile settings only
  - Key: `clearcontract:company-profile`
  - Loader: `src/knowledge/profileLoader.ts`
  - Merged with defaults from `src/knowledge/types.ts` (`DEFAULT_COMPANY_PROFILE`)
- Contract analysis results are NOT persisted - lost on page refresh

**File Storage:**
- None - PDFs are processed in-memory and not stored

**Caching:**
- None - Each analysis triggers fresh API calls

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system
- The application is a single-user tool with no login flow
- API key authentication is server-to-server only (Anthropic API)

## Domain Knowledge System

**Knowledge Modules** (injected into Claude prompts per-pass):
- Regulatory: `src/knowledge/regulatory/` - California-specific regulations
  - `ca-lien-law.ts` - CA mechanics lien law
  - `ca-prevailing-wage.ts` - CA prevailing wage requirements
  - `ca-title24.ts` - CA Title 24 building standards
  - `ca-calosha.ts` - CA-OSHA requirements
- Trade: `src/knowledge/trade/`
  - `div08-scope.ts` - Division 08 (Openings) scope definitions
- Standards: `src/knowledge/standards/`
  - `standards-validation.ts` - Glass/glazing industry standards
  - `contract-forms.ts` - Standard contract form references

**Registry:** `src/knowledge/registry.ts` maps knowledge modules to analysis passes
**Token Budget:** `src/knowledge/tokenBudget.ts` enforces per-module token limits

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- `console.warn` and `console.error` in serverless function (`api/analyze.ts`)
- Pass-level error logging: each analysis pass catches errors individually and reports status

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless deployment
- Configuration: `vercel.json` (max duration 300s for `api/analyze.ts`)

**CI Pipeline:**
- None detected - No GitHub Actions, no CI configuration files

**Build:**
- Vite production build (`npm run build`)
- Output: `dist/` directory

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude access (server-side only)

**Secrets location:**
- Local: `.env.local` (git-ignored)
- Production: Vercel project environment variables

## Webhooks & Callbacks

**Incoming:**
- `/api/analyze` - POST endpoint accepting PDF base64 + company profile, returns analysis results
  - CORS headers set in response
  - HTTP error codes: 400 (bad request), 401 (missing API key), 405 (wrong method), 422 (image-based PDF), 429 (rate limit)

**Outgoing:**
- None - No outbound webhooks

## API Request Flow

```
Browser                    Vercel Serverless              Anthropic API
  |                              |                              |
  |-- POST /api/analyze -------->|                              |
  |   (base64 PDF + profile)     |                              |
  |                              |-- Upload PDF via Files API ->|
  |                              |<- file_id -------------------|
  |                              |                              |
  |                              |-- Pass 1: risk-overview ---->|
  |                              |<- structured JSON -----------|
  |                              |-- Pass 2: dates-deadlines -->|
  |                              |<- structured JSON -----------|
  |                              |   ... (16 passes total) ...  |
  |                              |                              |
  |                              |-- Delete uploaded file ----->|
  |                              |                              |
  |<- merged analysis result ----|                              |
```

---

*Integration audit: 2026-03-12*
