# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**LLM/AI Analysis:**
- Claude API (Anthropic) - Contract analysis via LLM
  - SDK/Client: `@anthropic-ai/sdk` (0.78.0)
  - Model: `claude-sonnet-4-20250514`
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Usage: `api/analyze.ts` sends contract text to Claude for structured JSON analysis (findings, risk score, dates)
  - Rate limiting: Handles 429 status with user-friendly error message

## Data Storage

**Databases:**
- None - Application uses in-memory state only

**File Storage:**
- Local filesystem only - PDF uploads handled by browser via `FileReader` API
  - Client-side: `src/api/analyzeContract.ts` converts PDF to base64 before sending
  - Server-side: `api/analyze.ts` receives base64, decodes to Buffer, processes with pdf-parse
  - Max upload size: 3MB (enforced client-side in `src/api/analyzeContract.ts`)

**Caching:**
- None - All contract data is session-based in-memory state via `useContractStore` hook

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system
- API key authentication: `ANTHROPIC_API_KEY` sent server-to-server from Vercel to Anthropic API

## PDF Processing

**Library:**
- pdf-parse (2.4.5) - Server-side PDF text extraction
  - Location: `api/analyze.ts`
  - Input: Base64-encoded PDF from client
  - Output: Plain text extracted from PDF
  - Processing: Text truncated to 100k characters before sending to Claude

## Monitoring & Observability

**Error Tracking:**
- None - Built-in error handling in `api/analyze.ts` with HTTP status codes
  - 400: Missing/invalid pdfBase64
  - 401: Invalid API key
  - 405: Non-POST requests
  - 422: Image-based PDFs (insufficient text extraction)
  - 429: Rate limit exceeded
  - 500: Server errors with console.error logging

**Logs:**
- Console logging only: `console.error()` in `api/analyze.ts` for debugging
- No external logging service configured

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless platform for both frontend and API

**Serverless Functions:**
- `api/analyze.ts` - Vercel Node.js function
  - Max duration: 60 seconds (configured in `vercel.json`)
  - Runtime: Node.js (via @vercel/node)

**CI Pipeline:**
- Not detected - No CI/CD configuration files found

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic API authentication key
  - Stored in `.env.local` (development, git-ignored)
  - Configured in Vercel project settings (production)

**Secrets location:**
- Development: `.env.local` (git-ignored)
- Production: Vercel project environment variables
- Runtime access: `process.env.ANTHROPIC_API_KEY` in `api/analyze.ts`

## Webhooks & Callbacks

**Incoming:**
- None - Application is request-response only

**Outgoing:**
- None - No webhooks to external services

## Network & Communication

**API Communication:**
- Client → Vercel: HTTP POST to `/api/analyze`
  - Content-Type: application/json
  - Body: `{ pdfBase64: string, fileName: string }`
  - Response: `{ client, contractType, riskScore, findings, dates }`

- Vercel → Anthropic Claude API: HTTPS REST API
  - Uses `@anthropic-ai/sdk` for all communication
  - Handles authentication via `ANTHROPIC_API_KEY`
  - Response parsing: Handles both JSON and markdown-wrapped JSON code fences

**CORS:**
- Handled implicitly via Vercel same-origin requests

## Security Considerations

**API Key Handling:**
- Never exposed to client-side JavaScript
- Only available in Vercel serverless function environment
- Error messages sanitize to avoid key exposure

**File Upload Validation:**
- File type check: PDF only (enforced in `src/api/analyzeContract.ts`)
- File size limit: 3MB maximum
- Server validation: Checks for minimum 100 characters extracted text to reject image PDFs

**Data Flow:**
- PDFs converted to base64 for transmission (JSON-serializable)
- Text extraction limited to 100k characters
- No persistent storage of contract data (session-based only)

---

*Integration audit: 2026-03-01*
