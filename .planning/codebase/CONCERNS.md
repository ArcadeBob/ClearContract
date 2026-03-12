# Codebase Concerns

**Analysis Date:** 2026-03-12

## Tech Debt

**Monolithic Serverless Function (1745 lines):**
- Issue: `api/analyze.ts` is a single 1745-line file containing all analysis pass definitions, PDF processing, result merging, deduplication, severity guards, and the HTTP handler. It handles 16+ analysis passes with inline system prompts as template literals.
- Files: `api/analyze.ts`
- Impact: Extremely difficult to modify individual analysis passes, test in isolation, or review changes. A typo in one pass prompt can break the entire endpoint.
- Fix approach: Extract each analysis pass definition into its own file under `api/passes/`. Extract `mergePassResults`, `preparePdfForAnalysis`, `computeRiskScore`, and `applySeverityGuard` into separate utility modules. Keep `handler()` as a thin orchestrator.

**No Data Persistence:**
- Issue: All contract data lives in React `useState` via `useContractStore`. Data resets completely on page refresh. Company profile is stored in `localStorage` but analyzed contracts are lost.
- Files: `src/hooks/useContractStore.ts`
- Impact: Users lose all analyzed contracts on refresh. No ability to compare contracts over time. Every contract must be re-uploaded and re-analyzed (costing API credits).
- Fix approach: Add a persistence layer -- either `localStorage` for MVP or a database (Supabase, etc.) for multi-device access. At minimum, serialize the `contracts` array to `localStorage` on change and restore on mount.

**Multiple `as unknown as` Type Casts in API:**
- Issue: Four instances of `as unknown as Record<string, unknown>` and `as unknown as` casts in `api/analyze.ts` (lines 1071, 1397, 1406, 1685) bypass TypeScript's type safety for converting between pass-specific finding shapes and the unified finding type.
- Files: `api/analyze.ts` (lines 1071, 1397, 1406, 1685)
- Impact: Runtime type errors can silently produce malformed findings that crash the UI. The type system cannot catch mismatches between Zod schemas and TypeScript interfaces.
- Fix approach: Define proper type guards or use Zod's `.parse()` / `.safeParse()` to validate findings at runtime before conversion. Create a shared base finding interface that all pass-specific schemas extend.

**Mock Data Ships in Production:**
- Issue: `MOCK_CONTRACTS` is imported and used as default state in `useContractStore`. Three hardcoded sample contracts appear on every fresh load.
- Files: `src/data/mockContracts.ts`, `src/hooks/useContractStore.ts` (line 6)
- Impact: Every user sees fake contract data on first load, which is confusing in production. Mock data inflates dashboard statistics.
- Fix approach: Initialize `contracts` as an empty array in production. Gate mock data behind an environment variable or remove entirely.

**Package Name Mismatch:**
- Issue: `package.json` has `"name": "magic-patterns-vite-template"` -- a leftover from the template used to scaffold the project.
- Files: `package.json` (line 2)
- Impact: Minor -- affects npm registry, logging, and developer confusion.
- Fix approach: Rename to `"clearcontract"`.

**Outdated CLAUDE.md Documentation:**
- Issue: `CLAUDE.md` references `pdf-parse` for PDF extraction and `3MB max` file size, but the actual code uses `unpdf` (via `extractText`) and enforces a `10MB` limit. It also references `claude-sonnet-4-20250514` but the code uses `claude-sonnet-4-5-20250929`.
- Files: `CLAUDE.md`
- Impact: Misleads developers and AI assistants working on the codebase.
- Fix approach: Update CLAUDE.md to reflect current dependencies (`unpdf`), file size limits (10MB), model version, and multi-pass architecture.

## Known Bugs

**Share and Export Buttons Are Non-Functional:**
- Symptoms: "Share" and "Export Report" buttons in the contract review header render but have no `onClick` handlers -- they do nothing when clicked.
- Files: `src/pages/ContractReview.tsx` (lines 146-154)
- Trigger: Click either button on any reviewed contract.
- Workaround: None -- features are not implemented.

**No Upload Cancellation:**
- Symptoms: Once a PDF upload and analysis begins, there is no way to cancel. The user must wait for the full multi-pass analysis (which can take 60-300 seconds) or refresh the page (losing all data).
- Files: `src/App.tsx` (lines 38-70), `src/api/analyzeContract.ts`
- Trigger: Upload any PDF and attempt to navigate away or cancel.
- Workaround: Refresh the page (loses all contract data).

**Race Condition on Rapid Uploads:**
- Symptoms: If a user uploads multiple PDFs quickly, `updateContract(id, ...)` calls from concurrent analyses can interleave, and the `contracts` state array may not reflect all updates correctly due to closure-captured state.
- Files: `src/App.tsx` (lines 38-70), `src/hooks/useContractStore.ts` (line 18-21)
- Trigger: Upload two PDFs in rapid succession.
- Workaround: Wait for each analysis to complete before uploading the next.

## Security Considerations

**No Authentication or Authorization:**
- Risk: The `/api/analyze` endpoint is publicly accessible. Anyone with the URL can submit PDFs for analysis, consuming Anthropic API credits. No user accounts, sessions, or API keys protect the endpoint.
- Files: `api/analyze.ts` (lines 1560-1574)
- Current mitigation: CORS is restricted to `ALLOWED_ORIGIN` env var (defaults to `clearcontract.vercel.app`), but CORS is browser-enforced only -- a direct `curl` call bypasses it entirely.
- Recommendations: Add rate limiting per IP (e.g., Vercel KV or Upstash), require an API key or session token, or add Vercel authentication middleware.

**Misleading "Secure Encryption" Claim:**
- Risk: The upload zone displays "Secure Encryption" text, but no encryption is implemented. PDFs are base64-encoded and sent as plain JSON over HTTPS. There is no at-rest encryption, no client-side encryption, and no document access controls.
- Files: `src/components/UploadZone.tsx` (line 49)
- Current mitigation: HTTPS provides transport encryption (standard for all Vercel deployments).
- Recommendations: Remove the misleading "Secure Encryption" label, or implement actual document encryption and clarify what is encrypted.

**Company Profile Sent to Server Unvalidated:**
- Risk: The `companyProfile` object from `localStorage` is sent in the request body to `/api/analyze` and injected directly into LLM prompts. A malicious user could craft a profile with prompt injection content.
- Files: `src/api/analyzeContract.ts` (line 57), `api/analyze.ts` (lines 1588-1592), `src/knowledge/index.ts` (lines 53-56)
- Current mitigation: The profile is formatted through `formatCompanyProfile()` which only reads specific keys, limiting injection surface.
- Recommendations: Validate and sanitize `companyProfile` fields on the server side with Zod schema validation before injecting into prompts. Set max length limits on all string fields.

**No Input Validation on PDF Content:**
- Risk: The server accepts any base64 string, decodes it, and attempts to process it as a PDF. Malformed input could cause crashes or resource exhaustion in `unpdf`.
- Files: `api/analyze.ts` (lines 1594-1606)
- Current mitigation: Size check (10MB max) and text length check (100 chars minimum after extraction).
- Recommendations: Validate PDF magic bytes (`%PDF-`) before processing. Add a timeout wrapper around `extractText()`.

## Performance Bottlenecks

**16 Parallel API Calls per Analysis:**
- Problem: Each contract analysis fires 16 parallel Claude API calls (one per analysis pass), all running concurrently via `Promise.allSettled`.
- Files: `api/analyze.ts` (lines 1664-1668, line 108 `ANALYSIS_PASSES` array)
- Cause: The multi-pass architecture requires separate LLM calls for each analysis dimension (indemnification, payment, insurance, scope, etc.).
- Improvement path: Batch related passes together where possible. Consider whether all 16 passes are needed for every contract type (e.g., skip labor compliance for Purchase Orders). Add pass concurrency limits to avoid rate-limiting.

**Full PDF Base64 in Request Body:**
- Problem: The entire PDF file is base64-encoded on the client and sent as a JSON string in the request body. Base64 encoding adds ~33% overhead, so a 10MB PDF becomes ~13.3MB in the request.
- Files: `src/api/analyzeContract.ts` (lines 24-36, 49-58)
- Cause: Using JSON body instead of `multipart/form-data` file upload.
- Improvement path: Switch to `multipart/form-data` upload to avoid base64 overhead. This also enables streaming uploads and reduces client memory pressure.

**No Caching of Analysis Results:**
- Problem: Re-uploading the same PDF triggers a full re-analysis (16 API calls). There is no content hashing or result caching.
- Files: `api/analyze.ts`, `src/api/analyzeContract.ts`
- Cause: No persistence layer exists to store or compare previous results.
- Improvement path: Compute a SHA-256 hash of the PDF content and check against cached results before running analysis. Store results keyed by content hash.

**Findings Recomputed Every Render:**
- Problem: `ContractReview` component recomputes `groupedFindings` and `flatFindings` on every render, including sorting and filtering operations on potentially large arrays.
- Files: `src/pages/ContractReview.tsx` (lines 100-121)
- Cause: No `useMemo` wrapping the computation.
- Improvement path: Wrap `groupedFindings` and `flatFindings` in `useMemo` with `[contract.findings, selectedCategory]` dependencies.

## Fragile Areas

**Analysis Pass Result Merging:**
- Files: `api/analyze.ts` (lines 1354-1554, `mergePassResults` function)
- Why fragile: The merge function handles 16 different pass types with two deduplication phases, severity ranking, and special-case logic for legal vs. scope vs. overview passes. The `convertLegalFinding` and `convertScopeFinding` functions use a large switch statement with `as` casts for each pass type.
- Safe modification: When adding a new analysis pass, update `ANALYSIS_PASSES` array, create its Zod schema, add a case to the appropriate converter (`convertLegalFinding` or `convertScopeFinding`), and add its meta type to the `LegalMeta` or `ScopeMeta` union in `src/types/contract.ts`.
- Test coverage: No tests exist. A single malformed pass result can corrupt the entire merged output.

**Company Profile Flow:**
- Files: `src/knowledge/profileLoader.ts`, `src/hooks/useCompanyProfile.ts`, `src/api/analyzeContract.ts`, `api/analyze.ts`, `src/knowledge/index.ts`
- Why fragile: The company profile flows through 5 files: localStorage -> profileLoader -> analyzeContract (client) -> analyze (server) -> composeSystemPrompt. A schema mismatch at any point silently degrades analysis quality rather than failing visibly.
- Safe modification: Any field changes to `CompanyProfile` must be updated in `src/knowledge/types.ts` (interface + defaults), `src/knowledge/index.ts` (formatter), `src/pages/Settings.tsx` (UI fields), and `src/pages/ContractReview.tsx` (profile field check list).
- Test coverage: None.

**View-Based Navigation:**
- Files: `src/App.tsx` (lines 72-95), `src/hooks/useContractStore.ts` (lines 24-27)
- Why fragile: Navigation state is purely in-memory. No URL routing means browser back/forward buttons do not work. Refreshing always returns to dashboard. Deep linking to a specific contract review is impossible.
- Safe modification: Replace the `ViewState` string with a proper router (e.g., React Router or TanStack Router) to get URL-based navigation with history support.
- Test coverage: None.

## Scaling Limits

**Vercel Serverless Function Duration:**
- Current capacity: 300 seconds max duration (`vercel.json`), 16 parallel API calls.
- Limit: Large or complex contracts that require longer LLM processing may timeout. The 280-second Anthropic SDK timeout (line 1638) leaves only 20 seconds for upload, merge, and response.
- Scaling path: Move to a queue-based architecture (e.g., Vercel Background Functions, or a separate worker service) for long-running analysis. Stream partial results to the client.

**Single-Tenant In-Memory State:**
- Current capacity: One browser tab per user, no multi-user support.
- Limit: No persistence, no user isolation, no concurrent access.
- Scaling path: Add a database backend, user authentication, and server-side state management.

**Client-Side Memory for Large PDFs:**
- Current capacity: 10MB file size limit.
- Limit: Base64 encoding a 10MB PDF creates a ~13.3MB string in memory, plus the original file buffer. On low-memory devices this could cause browser tab crashes.
- Scaling path: Use `multipart/form-data` with streaming upload instead of base64 JSON body.

## Dependencies at Risk

**Anthropic SDK Beta APIs:**
- Risk: The codebase relies on `client.beta.files.upload`, `client.beta.files.delete`, and `client.beta.messages.create` with `betas: ['files-api-2025-04-14']`. Beta APIs can change or be removed without notice.
- Files: `api/analyze.ts` (lines 47, 993-998, 1057-1080, 1732)
- Impact: If the Files API beta changes, all PDF upload and analysis functionality breaks.
- Migration plan: Monitor Anthropic SDK changelogs. When the Files API graduates from beta, remove the `betas` parameter and update SDK types.

**Outdated ESLint/TypeScript Plugin Versions:**
- Risk: `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` are at `^5.54.0` while the current major version is 8.x. ESLint is at `^8.50.0` while current is 9.x with flat config.
- Files: `package.json` (lines 38-39, 42)
- Impact: Missing newer lint rules, potential compatibility issues with newer TypeScript features.
- Migration plan: Upgrade to ESLint 9 + `@typescript-eslint` v8 with flat config (`eslint.config.js`).

## Missing Critical Features

**No Test Suite:**
- Problem: Zero test files exist in the entire codebase. No test framework is configured. No unit tests, integration tests, or E2E tests.
- Blocks: Safe refactoring of the 1745-line `api/analyze.ts`, confident deployment of changes, regression prevention.

**No Error Boundary:**
- Problem: No React Error Boundary component exists. An unhandled exception in any component crashes the entire app with a white screen.
- Files: `src/App.tsx`
- Blocks: Graceful error recovery and user-facing error messages for component-level failures.

**No Accessibility (a11y):**
- Problem: No ARIA labels, roles, or keyboard navigation support. No screen reader compatibility. Color-coded severity badges rely solely on color differentiation.
- Files: All components in `src/components/` and `src/pages/`
- Blocks: Compliance with WCAG guidelines, usability for users with disabilities.

## Test Coverage Gaps

**Entire Codebase is Untested:**
- What's not tested: Every file in `src/` and `api/` -- zero test coverage.
- Files: All files
- Risk: Any change can introduce regressions in analysis merging, risk score computation, bid signal calculation, severity guards, or finding deduplication -- all of which are deterministic pure functions ideal for unit testing.
- Priority: High -- start with `api/analyze.ts` pure functions (`computeRiskScore`, `applySeverityGuard`, `mergePassResults`, `computeBidSignal`), then add component tests for critical UI flows.

---

*Concerns audit: 2026-03-12*
