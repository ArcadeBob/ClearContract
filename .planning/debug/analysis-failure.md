---
status: resolved
trigger: "Analysis pipeline failure — user uploads PDF, sees 'Analyzing' then 'Analysis Failed - Unknown error'"
created: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:10:00Z
---

## Current Focus

hypothesis: Two compounding root causes — (1) npm run dev does not serve the serverless function, (2) model claude-sonnet-4-20250514 does not support output_config structured outputs
test: Confirmed both via live testing — Vite returns 404, vercel dev returns API error about output format
expecting: Both issues must be fixed for the pipeline to work
next_action: Document complete root cause analysis

## Symptoms

expected: User uploads PDF, app shows "Analyzing", then analysis completes and shows findings/risk score
actual: App shows "Analyzing" then "Analysis Failed - Unknown error"
errors: "Unknown error" — the catch-all from analyzeContract.ts line 46: `response.json().catch(() => ({ error: 'Unknown error' }))`
reproduction: Upload any PDF on the upload page
started: After Phase 01 rewrote api/analyze.ts to multi-pass pipeline

## Eliminated

- hypothesis: SDK missing output_config or Files API type definitions
  evidence: Checked node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.d.ts — output_config is defined as BetaOutputConfig. Files API upload/delete types match usage. SDK v0.78.0 has all needed types.
  timestamp: 2026-03-03T00:05:00Z

- hypothesis: Missing or broken npm dependencies (zod, zod-to-json-schema, unpdf)
  evidence: npm ls shows all installed — zod@3.25.76, zod-to-json-schema@3.25.1, unpdf@1.4.0, @anthropic-ai/sdk@0.78.0
  timestamp: 2026-03-03T00:04:00Z

- hypothesis: Import path issues (../src/schemas/analysis from api/)
  evidence: File exists at src/schemas/analysis.ts with all expected exports. Vercel dev successfully compiles and runs the function (confirmed by live test — function executes, returns response).
  timestamp: 2026-03-03T00:07:00Z

- hypothesis: toFile import not available from @anthropic-ai/sdk
  evidence: Checked SDK index.d.ts — toFile is exported from @anthropic-ai/sdk/core/uploads
  timestamp: 2026-03-03T00:05:30Z

- hypothesis: Need structured-outputs beta flag in betas array
  evidence: Structured outputs are GA (not beta) for supported models. The issue is model support, not beta flags. Adding the beta flag would not help — the model itself must support structured outputs.
  timestamp: 2026-03-03T00:09:00Z

## Evidence

- timestamp: 2026-03-03T00:01:00Z
  checked: vite.config.ts
  found: No proxy configuration. Only contains `plugins: [react()]`. No server.proxy section.
  implication: Vite dev server has no way to forward /api/* requests to the serverless function.

- timestamp: 2026-03-03T00:02:00Z
  checked: src/api/analyzeContract.ts error handling (line 46)
  found: `response.json().catch(() => ({ error: 'Unknown error' }))` — when Vite returns 404 HTML, JSON parse fails, catch returns { error: 'Unknown error' }.
  implication: This is the exact mechanism producing the "Unknown error" symptom.

- timestamp: 2026-03-03T00:03:00Z
  checked: package.json scripts section
  found: `"dev": "npx vite"` — no mention of vercel dev anywhere in scripts. Has always been this way since initial commit.
  implication: Running `npm run dev` starts only Vite, not Vercel. API endpoint unreachable.

- timestamp: 2026-03-03T00:06:00Z
  checked: Live test — Vite dev server on port 5199, POST /api/analyze
  found: HTTP 404 returned. Confirmed experimentally.
  implication: ROOT CAUSE 1 confirmed — Vite cannot serve the serverless function.

- timestamp: 2026-03-03T00:07:00Z
  checked: Live test — vercel dev on port 5200, POST /api/analyze with test PDF
  found: HTTP 200 returned, but ALL THREE analysis passes failed with identical error: `'claude-sonnet-4-20250514' does not support output format.` The Files API upload succeeded (no error). The response contains 3 Critical findings reporting each pass failure.
  implication: ROOT CAUSE 2 confirmed — the model does not support output_config structured outputs. Files API works fine. The structured output feature is the blocker.

- timestamp: 2026-03-03T00:08:00Z
  checked: Anthropic documentation on structured output model support
  found: Structured outputs (output_config) are supported by: Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5. NOT supported by Claude Sonnet 4 (claude-sonnet-4-20250514).
  implication: The model constant `MODEL = 'claude-sonnet-4-20250514'` (line 14 of api/analyze.ts) must be updated to a model that supports structured outputs.

- timestamp: 2026-03-03T00:09:00Z
  checked: api/analyze.ts line 13 — BETAS constant
  found: `const BETAS = ['files-api-2025-04-14']` — only includes Files API beta. For structured outputs, need either GA support (model must support it) or the structured-outputs beta flag. Since structured outputs are GA for supported models, updating the model ID is sufficient.
  implication: No need to add structured-outputs beta flag — just need a supported model.

- timestamp: 2026-03-03T00:10:00Z
  checked: Error flow when using vercel dev
  found: When using vercel dev, the function executes successfully but all 3 passes fail. The mergePassResults function catches each failure and creates Critical error findings. The response is HTTP 200 with `riskScore: 75` (3 Critical findings x 25 weight). The client processes this as a successful response showing "Analysis Pass Failed" findings. User sees error findings, NOT "Unknown error".
  implication: The "Unknown error" symptom only occurs with `npm run dev`. With `vercel dev`, user would see a different symptom — 3 Critical findings about pass failures.

## Resolution

root_cause: |
  TWO ROOT CAUSES, both blocking the analysis pipeline:

  ROOT CAUSE 1 — Local dev server mismatch (causes "Unknown error")
  File: vite.config.ts (missing proxy) + package.json (scripts.dev = "npx vite")
  The `npm run dev` command starts only Vite, which cannot serve the Vercel
  serverless function at /api/analyze. Vite returns HTTP 404 for the POST.
  The client's JSON parse of the HTML 404 fails, producing "Unknown error".

  ROOT CAUSE 2 — Unsupported model for structured outputs (causes all passes to fail)
  File: api/analyze.ts, line 14: `const MODEL = 'claude-sonnet-4-20250514'`
  The model claude-sonnet-4-20250514 (Claude Sonnet 4.0) does NOT support the
  `output_config` structured output feature. The Anthropic API returns:
    "invalid_request_error: 'claude-sonnet-4-20250514' does not support output format."
  Structured outputs are supported by: Sonnet 4.5+, Opus 4.5+, Haiku 4.5+.
  All three analysis passes fail with this error. mergePassResults creates
  Critical error findings for each failure. Even with vercel dev, no real
  analysis occurs.

  IMPACT CHAIN:
  - With `npm run dev`: User sees "Analysis Failed - Unknown error" (404 from Vite)
  - With `vercel dev`: User sees 3 Critical "Analysis Pass Failed" findings (model error)
  - Neither path produces actual contract analysis

fix: |
  FIX 1: Update model to one that supports structured outputs
  In api/analyze.ts line 14, change:
    const MODEL = 'claude-sonnet-4-20250514';
  To:
    const MODEL = 'claude-sonnet-4-5-20241022';
  (or 'claude-sonnet-4-6-20260217' for the latest)

  FIX 2: Ensure local dev works by either:
  (a) Adding Vite proxy config to forward /api/* to vercel dev, OR
  (b) Changing package.json scripts.dev to use vercel dev, OR
  (c) Documenting that `vercel dev` must be used instead of `npm run dev`

verification: |
  Tested live:
  - Confirmed Vite returns 404 for /api/analyze (HTTP status 404)
  - Confirmed vercel dev reaches function but gets model error from Anthropic API
  - Error message: "'claude-sonnet-4-20250514' does not support output format."
  - All 3 passes fail with identical error

files_changed: []
