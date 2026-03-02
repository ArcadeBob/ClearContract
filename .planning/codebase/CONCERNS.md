# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**In-Memory State Only (No Persistence):**
- Issue: All contract data lives in `useContractStore` via React `useState`. No database or storage layer. Data disappears completely on page refresh.
- Files: `src/hooks/useContractStore.ts`
- Impact: Users lose all uploaded contracts and analysis results on refresh. Severely limits production viability and user trust.
- Fix approach: Add persistence layer (localStorage for immediate fix, backend database for production). Either persist to localStorage on every state change or integrate a real database with API endpoints for CRUD operations on contracts.

**Weak Type Safety in Navigation Props:**
- Issue: `Dashboard.tsx` and `AllContracts.tsx` accept `onNavigate: (view: any, id?: string)` with `any` type instead of proper `ViewState` union type.
- Files: `src/pages/Dashboard.tsx` (line 16), `src/pages/AllContracts.tsx` (line 8)
- Impact: No compile-time safety for navigation targets. Could navigate to non-existent views. Defeats TypeScript strict mode purpose.
- Fix approach: Change to `(view: ViewState, id?: string) => void` to match `useContractStore` signature already correctly defined.

**No Error Recovery for Long Analyses:**
- Issue: Server-side analysis timeout is 60 seconds per `vercel.json`. Large PDFs or slow API responses could exceed this silently with no user feedback mechanism.
- Files: `api/analyze.ts`, `src/App.tsx` (lines 40-67), `vercel.json`
- Impact: User sees "Analyzing..." state indefinitely. No indication of timeout or failure until manual page reload. No retry mechanism.
- Fix approach: Add explicit timeout handling in client (`src/api/analyzeContract.ts`). Implement exponential backoff retry with user notification on failure.

**ID Generation Collision Risk:**
- Issue: `App.tsx` generates contract IDs as `c-${Date.now()}` (line 22). Multiple simultaneous uploads in same millisecond would collide.
- Files: `src/App.tsx` (line 22)
- Impact: Duplicate IDs could overwrite contracts in the store, losing data.
- Fix approach: Use UUID library (e.g., `uuid` package) or append random suffix: `c-${Date.now()}-${Math.random().toString(36).substr(2,9)}`.

**Hardcoded Claude Model Version:**
- Issue: Model is pinned to `claude-sonnet-4-20250514` in `api/analyze.ts` (line 87).
- Files: `api/analyze.ts` (line 87)
- Impact: No flexibility to upgrade AI model without code change. If Anthropic deprecates this version, analysis breaks.
- Fix approach: Move model name to environment variable `ANTHROPIC_MODEL` with fallback default.

## Known Bugs

**Missing Export Report Button Implementation:**
- Symptoms: "Export Report" button in `ContractReview.tsx` header renders but does nothing when clicked.
- Files: `src/pages/ContractReview.tsx` (lines 63-66)
- Trigger: Click "Export Report" button on any contract review page.
- Workaround: None. Button is non-functional placeholder.
- Fix approach: Implement PDF export using library like `jsPDF` or `html2pdf`.

**Share Button Not Implemented:**
- Symptoms: "Share" button in `ContractReview.tsx` header renders but does nothing when clicked.
- Files: `src/pages/ContractReview.tsx` (lines 59-62)
- Trigger: Click "Share" button on any contract review page.
- Workaround: None.
- Fix approach: Implement sharing mechanism (generate shareable link, email, or copy-to-clipboard).

**Generate Monthly Report Button Non-Functional:**
- Symptoms: "Generate Monthly Report" button on Dashboard renders but does nothing.
- Files: `src/pages/Dashboard.tsx` (lines 106-109)
- Trigger: Click button on dashboard Quick Actions section.
- Workaround: None.
- Fix approach: Implement monthly reporting functionality with aggregated statistics and PDF generation.

**Compliance Link Not Functional:**
- Symptoms: "Read more" link in Dashboard Compliance Update section is a dead `#` link.
- Files: `src/pages/Dashboard.tsx` (line 119)
- Trigger: Click link in bottom-right compliance alert.
- Workaround: None; is purely informational.
- Fix approach: Link to external documentation or internal page with compliance updates.

## Security Considerations

**Missing CORS Validation:**
- Risk: `/api/analyze` endpoint accepts POST requests from any origin without explicit CORS validation. Could be exploited for unauthorized API calls from third-party sites.
- Files: `api/analyze.ts`
- Current mitigation: Vercel automatically applies CORS restrictions for serverless functions.
- Recommendations: Add explicit CORS headers. Validate `origin` header against whitelist. Consider requiring authentication token for API calls.

**Base64 PDF Encoding Over HTTP in Development:**
- Risk: During development, PDFs are base64-encoded and sent as JSON POST body over HTTP (not HTTPS). Captures file content in cleartext on network.
- Files: `src/api/analyzeContract.ts` (lines 36-42)
- Current mitigation: Vercel deployment uses HTTPS. Local dev uses HTTP.
- Recommendations: Use HTTPS even locally (ngrok, local cert). Consider multipart form-data upload instead of base64 encoding. Add Content-Security-Policy headers to prevent data exfiltration.

**API Key Exposure Risk:**
- Risk: `ANTHROPIC_API_KEY` is passed to Vercel environment and must never be committed. `.env.local` is git-ignored, but a developer could accidentally create `.env` instead.
- Files: `api/analyze.ts` (line 58), `.gitignore`
- Current mitigation: `.env.*` in .gitignore.
- Recommendations: Use Vercel's secrets manager instead of `.env` files. Add pre-commit hook to prevent `.env` from being staged. Document in CONTRIBUTING.md.

**No Input Validation on PDF Content:**
- Risk: `api/analyze.ts` validates PDF is >100 chars and PDFs are limited to 3MB, but doesn't validate the extracted text contains meaningful contract language. Malicious PDFs with padding could bypass checks.
- Files: `api/analyze.ts` (lines 75-79), `src/api/analyzeContract.ts` (lines 28-34)
- Current mitigation: Text truncation to 100k chars limits token usage.
- Recommendations: Add content validation (minimum word count, presence of legal keywords). Sanitize extracted text before sending to Claude API.

**Unpaginated Contract List:**
- Risk: No pagination or virtual scrolling on `AllContracts.tsx`. Loading thousands of contracts will render thousands of DOM nodes, causing browser memory issues and UI lag.
- Files: `src/pages/AllContracts.tsx` (lines 174-200)
- Current mitigation: Currently only 3 mock contracts.
- Recommendations: Implement pagination (page size 20-50) or infinite scroll with React hooks. Use `react-window` for virtualization if maintaining full search/filter across all contracts.

## Performance Bottlenecks

**Synchronous PDF Text Extraction on Serverless Function:**
- Problem: `pdf-parse` blocks the serverless function thread while extracting text. With 60s max duration, large PDFs slow down analysis significantly.
- Files: `api/analyze.ts` (lines 71-73)
- Cause: Single-threaded event loop in Node.js. No async PDF parsing.
- Improvement path: Consider async PDF library or offload to background job queue (AWS SQS + Lambda, or Google Cloud Tasks). Stream large PDFs instead of loading entirely into memory.

**Full List Recomputation on Every State Change:**
- Problem: `AllContracts.tsx` uses `useMemo` with dependency array including `contracts`, `searchQuery`, `typeFilter`, `sortBy`. Re-renders entire filtered/sorted list on any prop change.
- Files: `src/pages/AllContracts.tsx` (lines 44-82)
- Cause: No index or database query optimization. O(n) filter + O(n log n) sort on every render.
- Improvement path: For 10k+ contracts, implement server-side filtering/sorting or pagination. Cache sorted results. Use indexes if database backed.

**Category Filter Dynamically Computes from Findings:**
- Problem: `ContractReview.tsx` derives available categories from current contract findings on every render using `new Set()` (lines 18-20).
- Files: `src/pages/ContractReview.tsx` (lines 18-20)
- Cause: Not actually a performance issue with small finding counts, but creates implicit coupling to Finding data structure.
- Improvement path: Could memoize with `useMemo` to avoid recomputation, though current impact is minimal.

**No Lazy Loading of Contract Details:**
- Problem: Full contract data with all findings loaded in memory for every contract in store.
- Files: `src/hooks/useContractStore.ts`
- Cause: No backend pagination or data streaming.
- Improvement path: Load contract metadata initially, fetch detailed findings on demand. Lazy load dates and findings arrays.

## Fragile Areas

**AI Response JSON Parsing:**
- Files: `api/analyze.ts` (lines 104-111)
- Why fragile: Parses Claude's JSON response with regex-based code fence detection, then `JSON.parse()`. If Claude returns markdown fence, or fails to wrap output, or includes trailing text, parsing silently fails at line 111 and crashes.
- Safe modification: Test with various Claude response formats. Add try-catch around `JSON.parse()` with detailed error message. Log raw response for debugging.
- Test coverage: No test for JSON parsing failure scenarios. Unit tests needed.

**Finding ID Generation (Time-Based):**
- Files: `api/analyze.ts` (line 117), `src/App.tsx` (line 58)
- Why fragile: Uses `Date.now()` which can collide if multiple findings generated in same millisecond. No guarantee of uniqueness.
- Safe modification: Use UUID or append random component.
- Test coverage: No tests for ID collision scenarios.

**Contract Status State Machine:**
- Files: `src/types/contract.ts` (line 36), `src/App.tsx` (lines 24-37, 40-67)
- Why fragile: Status transitions are implicit (`'Analyzing'` → `'Reviewed'`) with no validation. No state machine enforces valid transitions. Could navigate to 'review' while contract is still in 'Analyzing' and UI shows inconsistent state.
- Safe modification: Add explicit state transition function. Add guards to prevent invalid state changes.
- Test coverage: No tests for state transitions.

**Truncated PDF Text Loss:**
- Files: `api/analyze.ts` (lines 81-82)
- Why fragile: Large PDFs (>100k chars) are silently truncated at analysis time. User doesn't know important contract sections were excluded from AI analysis.
- Safe modification: Return metadata indicating truncation occurred. Show warning to user.
- Test coverage: No test for truncation scenario.

## Scaling Limits

**3MB PDF Upload Limit:**
- Current capacity: 3MB max file size (enforced client and server).
- Limit: Some complex construction contracts with scans/images exceed 3-5MB easily.
- Scaling path: Increase limit to 10-20MB. Consider chunked upload for larger files. Add progress tracking for multi-part uploads.

**100k Character Truncation on PDF Extract:**
- Current capacity: Full PDF text up to 100k chars sent to Claude.
- Limit: Large contracts (>100k chars) lose content at analysis time. No way to re-analyze with different sections.
- Scaling path: Implement multi-pass analysis. Chunk large documents and run Claude analysis on each chunk separately, then aggregate findings. Add option to user to select which sections matter most.

**In-Memory Contract Store (No Pagination):**
- Current capacity: Fits in browser memory comfortably up to 1000 contracts.
- Limit: Beyond 10,000 contracts, browser performance degrades. DOM becomes unwieldy.
- Scaling path: Implement backend database. Add pagination (50 contracts per page). Use React virtualization for large lists.

**Vercel Serverless Function 60s Timeout:**
- Current capacity: Handles contracts that PDF extract in <30s and Claude analyzes in <30s.
- Limit: Large PDFs or slow API responses near 60s boundary will timeout.
- Scaling path: Increase max duration if possible (Vercel Pro tier). Use background job queue for async analysis (webhook callback). Split analysis into multiple API calls.

## Dependencies at Risk

**pdf-parse Deprecated in Some Ecosystems:**
- Risk: `pdf-parse` (v2.4.5) is commonly flagged as having maintenance concerns. No major updates in 12+ months.
- Impact: If abandoned, security vulnerabilities won't be patched. Breaking changes in PDFKit could occur.
- Migration plan: Monitor `npm audit`. Be prepared to switch to `pdfjs-dist` (Mozilla's maintained PDF.js library) or `pypdf` via Python service. Both are actively maintained.

**Framer Motion Version Gap:**
- Risk: Using `framer-motion@^11.5.4`. Major version 12 may have breaking changes not yet accounted for.
- Impact: Future npm updates could break animations. No constraints prevent major version bump.
- Migration plan: Lock major version: `framer-motion@^11` in package.json. Run regular updates to latest v11.x. Plan major version upgrade with full animation test pass.

**Old @typescript-eslint Versions:**
- Risk: Using `@typescript-eslint/eslint-plugin@^5.54.0` (v5 is old). Current is v7+.
- Impact: Rules may not catch modern TS patterns. Future dependencies might not support v5.
- Migration plan: Upgrade to v7: `npm install --save-dev @typescript-eslint/eslint-plugin@^7`. Requires eslint v8+, already satisfied.

## Missing Critical Features

**No Persistence / Data Loss on Refresh:**
- Problem: All contracts lost on page refresh. Blocks any production use.
- Blocks: Any real user workflow. Completely non-viable for actual contract management.
- Priority: CRITICAL — must be fixed before any production deployment.

**No Authentication / User Isolation:**
- Problem: No login system. All users share same contract store. No multi-tenant support.
- Blocks: Usage by Clean Glass or multiple companies. Single browser instance = shared access.
- Priority: CRITICAL for multi-user/company deployment.

**No Contract Editing:**
- Problem: Contracts are read-only after AI analysis. Users cannot mark issues as resolved, add notes, or track follow-ups.
- Blocks: Contract management workflow. Users need to track which risks were mitigated.
- Priority: HIGH — expected feature for contract review tool.

**No Export Formats (PDF, CSV):**
- Problem: "Export Report" button is non-functional. Users cannot generate reports for stakeholders.
- Blocks: Sharing analysis results. Legal/compliance teams can't review outside the app.
- Priority: HIGH — essential for enterprise adoption.

**No Model Configuration in UI:**
- Problem: AI analysis model is hardcoded. No way for user to choose model or adjust analysis depth.
- Blocks: Flexibility for different contract types (simple vs. complex).
- Priority: MEDIUM — could allow cost optimization or accuracy tuning.

**No Audit Log:**
- Problem: No record of who analyzed what contract when. No change history.
- Blocks: Compliance and accountability. Can't audit decisions.
- Priority: MEDIUM for enterprise, LOW for MVP.

## Test Coverage Gaps

**API Analysis Endpoint:**
- What's not tested: JSON parsing from Claude API, error handling for malformed JSON, timeout scenarios, rate limit handling.
- Files: `api/analyze.ts`
- Risk: Silent failures if Claude returns non-compliant JSON. No validation that all required fields exist.
- Priority: HIGH — core feature, affects all contracts.

**Contract Store State Management:**
- What's not tested: ID collision scenarios, state transitions (Analyzing → Reviewed), concurrent updates, contract deletion.
- Files: `src/hooks/useContractStore.ts`
- Risk: Data loss from ID collisions. Invalid state transitions cause UI inconsistencies.
- Priority: HIGH — all features depend on store.

**UI Component Integration:**
- What's not tested: File upload flow, category filtering, sort operations, finding card rendering with all severity levels.
- Files: `src/pages/ContractReview.tsx`, `src/pages/AllContracts.tsx`, `src/components/`
- Risk: Regressions in filtering/sorting. Silent failures in UI state.
- Priority: MEDIUM — should catch UI bugs early.

**Error Handling & Recovery:**
- What's not tested: Analysis timeout recovery, network failures, API errors, empty PDF handling.
- Files: `src/api/analyzeContract.ts`, `src/App.tsx`
- Risk: Poor user experience on failures. No indication what went wrong.
- Priority: MEDIUM — affects reliability perception.

---

*Concerns audit: 2026-03-01*
