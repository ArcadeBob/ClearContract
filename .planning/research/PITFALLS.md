# Domain Pitfalls

**Domain:** Adding Export Report (PDF/CSV), Settings Validation, URL-based Routing, Re-analyze Contract, and Finding Actions (Resolve/Annotate) to an existing React SPA with localStorage state
**Researched:** 2026-03-12
**Applies to:** v1.3 Workflow Completion milestone for ClearContract

## Critical Pitfalls

### Pitfall 1: Vercel Rewrite Ordering Breaks API Routes When Adding SPA Routing

**What goes wrong:** Adding a catch-all rewrite `"/(.*)" -> "/index.html"` for client-side routing intercepts `/api/analyze` requests, returning HTML instead of the API response. The analysis endpoint silently breaks in production while working locally (Vite dev server proxies differently).

**Why it happens:** Vercel processes rewrites in array order. The current `vercel.json` only configures `functions` -- it has no `rewrites` array. Adding SPA routing means adding rewrites, and if the catch-all appears before API routes (or without an API exclusion), all API traffic gets swallowed.

**Consequences:** Contract analysis completely breaks in production. Users see "Server returned HTML instead of JSON" errors. The app already has this error handling in `analyzeContract.ts` line 70, which confirms this failure mode was anticipated.

**Prevention:** API routes MUST come before the SPA catch-all in `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
Test the `/api/analyze` endpoint in a Vercel preview deployment before merging routing changes. Do not rely on local dev testing alone -- `vercel dev` may not replicate rewrite behavior.

**Detection:** POST to `/api/analyze` returns Content-Type `text/html` instead of `application/json`.

---

### Pitfall 2: URL Routing State and localStorage State Diverge on Deep Link Load

**What goes wrong:** A user bookmarks `/review/c-1710288000000`. On a fresh page load, the URL says "show review for contract X" but `useContractStore` initializes from localStorage which may not contain that contract (data was deleted, different browser, or localStorage was cleared). The app either crashes on null access or shows a blank review page.

**Why it happens:** The current `App.tsx` handles this for in-session navigation (lines 114-122: when `activeContract` is null in review mode, it falls back to Dashboard). But with URL routing, the contract ID comes from URL parameters, not from `navigateTo()`. The hook initializes `activeContractId` via `useState(null)`, not from the URL. Two sources of truth (URL vs. React state) must be reconciled on every page load.

**Consequences:** Broken deep links, confusing UX where URLs don't match displayed content, potential null reference errors if fallback logic isn't extended to router-driven navigation.

**Prevention:**
1. URL is the single source of truth for navigation state. The router reads the URL, looks up the contract in the store, and renders accordingly.
2. Add an explicit "contract not found" state that shows a message and redirects to dashboard, rather than silently falling back.
3. Remove `activeContractId` and `activeView` from `useContractStore`. Let the router own navigation entirely. The store should only manage data (contracts, upload state), not navigation.

**Detection:** Test every deep link URL with empty localStorage. Test with a URL containing a contract ID that does not exist in storage.

---

### Pitfall 3: Re-analyze Race Condition Corrupts Contract State

**What goes wrong:** User clicks "Re-analyze" while a previous analysis is still running (status is "Analyzing"). Two concurrent `analyzeContract()` promises race, and whichever resolves last overwrites the other's results via `updateContract()`. If the first (stale) analysis resolves after the second (fresh) one, the contract shows outdated results -- computed without the updated company profile.

**Why it happens:** The current `handleUploadComplete` in `App.tsx` creates a closure over the contract `id` and calls `updateContract(id, ...)` on completion. There is no guard against concurrent analyses for the same contract. Re-analyze is a new trigger for an already-existing contract, unlike initial upload which always creates a new ID.

**Consequences:** Stale analysis results silently overwrite fresh ones. User sees wrong findings. No error is displayed because both analyses "succeed."

**Prevention:**
1. Track an `analysisVersion` counter or timestamp per contract. When the analysis callback fires, compare versions -- if a newer analysis was triggered, discard the stale result.
2. Disable the "Re-analyze" button while analysis is in progress (`contract.status === 'Analyzing'`).
3. Use an `AbortController` on the fetch call in `analyzeContract.ts`. When re-analyze is triggered, abort the in-flight request before starting the new one.

**Detection:** Click "Re-analyze" twice rapidly. Check which result set appears. If findings change after the second click and then revert, the race condition exists.

---

### Pitfall 4: PDF Export via html2canvas Produces Blurry, Unsearchable Output

**What goes wrong:** Using html2canvas + jsPDF to export the review page captures a rasterized screenshot. The PDF has blurry text (not vector), is not searchable or copy-pasteable, produces enormous file sizes for contracts with 50+ findings, and page breaks land mid-finding or mid-table.

**Why it happens:** html2canvas renders DOM to a canvas bitmap. This is fundamentally wrong for generating a professional report. The review page also has scroll containers, Framer Motion animations, and dynamically expanded sections that html2canvas cannot reliably capture.

**Consequences:** Unprofessional export that the user would be embarrassed to attach to a Procore project or share with a GC. Defeats the purpose of the feature.

**Prevention:** Use `@react-pdf/renderer` to build a dedicated PDF layout from the contract data (not from the DOM). Design a report template using React PDF components that:
- Renders vector text (searchable, selectable, professional)
- Has explicit page break logic between findings
- Includes a cover page with contract summary, risk score, bid signal
- Uses the same severity color scheme as the UI
- Handles contracts with 50+ findings without performance issues

For CSV export, serialize the findings array directly -- no PDF library needed.

**Detection:** Generate a PDF from a contract with 40+ findings. Try to select/search text. Check file size. Check if page breaks land sensibly.

---

## Moderate Pitfalls

### Pitfall 5: Finding Actions Mutate Contract Shape Without Schema Migration

**What goes wrong:** Adding `resolved`, `annotation`, or `resolvedAt` fields to the `Finding` type means existing contracts in localStorage have findings without these fields. Code that checks `finding.resolved === false` fails (it is `undefined`, not `false`). Filtering logic like `findings.filter(f => f.resolved === false)` silently excludes all legacy findings.

**Why it happens:** localStorage has no schema migration. The `loadContracts()` function in `contractStorage.ts` parses raw JSON and returns it as `Contract[]` without validation or normalization.

**Prevention:**
1. Use optional fields with explicit checks: `finding.resolved ?? false`.
2. Add a migration function in `contractStorage.ts` that runs after `JSON.parse()` to normalize old data shapes -- for example, setting `resolved: false` on every finding that lacks the field.
3. Never use strict equality (`=== false`) on fields that might be `undefined`. Always use nullish coalescing.

**Detection:** Load the app with pre-existing contracts in localStorage. Check that all findings appear and that filter/count logic includes them correctly.

---

### Pitfall 6: Settings Validation Conflicts with Existing Auto-Save Pattern

**What goes wrong:** The current `useCompanyProfile` hook saves to localStorage on every field change (line 13: `localStorage.setItem` inline in `updateField`). If validation is added as a gate before save, it conflicts with the auto-save pattern. If validation runs on a "Save" button but the hook already persisted the invalid value, the button is cosmetic -- bad data is already in storage and will be sent to the next analysis via `loadCompanyProfile()`.

**Why it happens:** The architecture decision (documented in PROJECT.md) is "onBlur persistence." Validation was not part of the original design. Adding it after the fact creates a tension between auto-save and gated-save.

**Consequences:** Either (a) validation blocks save and breaks the existing auto-save UX, or (b) validation shows errors but data is already persisted, creating a false sense of protection.

**Prevention:** Two viable approaches:
1. **Inline field-level validation (informational, not blocking):** Validate on change/blur and show errors immediately, but still persist. The validation warns ("This doesn't look like a dollar amount") without blocking. This preserves the existing auto-save UX.
2. **Refactor to draft + save pattern:** Local component state holds the draft, validation runs on explicit save, only valid data persists. This is more correct but requires refactoring the hook.

Do NOT add a "Save" button that validates already-persisted data -- it creates UX where the button does nothing meaningful.

**Detection:** Enter an invalid value (e.g., "abc" for a dollar field), navigate away, come back. Is the invalid value still there? If yes, validation is not preventing persistence.

---

### Pitfall 7: Re-analyze Does Not Clear Previous Findings Before Starting

**What goes wrong:** User clicks "Re-analyze." The contract keeps its existing findings and "Reviewed" status while the new analysis runs. If the analysis fails or times out (300s on Vercel), the contract still shows old findings as if they are current. The user doesn't realize those findings were computed without the updated company profile.

**Why it happens:** The current upload flow creates a fresh placeholder with `status: 'Analyzing'` and empty findings. Re-analyze needs to do the same for an existing contract, but the natural impulse is to just start the API call and update on completion -- leaving stale data visible during analysis.

**Prevention:**
1. On re-analyze trigger, immediately update: `updateContract(id, { status: 'Analyzing', findings: [], dates: [], riskScore: 0, bidSignal: undefined })`.
2. Show a confirmation dialog: "Re-analyzing will replace current findings. Continue?"
3. On failure, show a clear error state rather than reverting to old findings. Do NOT silently restore the previous analysis -- the user needs to know the re-analysis failed.

**Detection:** Update company profile insurance limits, trigger re-analyze, force a network error mid-analysis. Check if old findings reappear.

---

### Pitfall 8: CSV Export Loses Structured Metadata

**What goes wrong:** Naively flattening the `Finding` type to CSV drops discriminated union fields (`legalMeta` with 11 clause types, `scopeMeta` with 4 pass types), nested arrays (`crossReferences`, `checklistItems`), and structured data like `negotiationPosition`. A CSV with just `title, severity, description` loses 60% of the analysis value.

**Why it happens:** The `Finding` interface (contract.ts lines 130-146) has 15 fields including deeply nested discriminated unions. Flat CSV cannot represent this natively.

**Prevention:**
1. Define a clear CSV schema that flattens key nested fields: `legalMeta.clauseType`, `scopeMeta.passType`, `negotiationPosition`. These are the most actionable fields.
2. For labor compliance checklists, create a separate CSV section or serialize checklist items as pipe-delimited strings.
3. Include contract-level metadata as header rows (contract name, risk score, bid signal, analysis date).
4. Test CSV output with a real contract that has findings across all 9 categories -- ensure Legal Issues findings export their `legalMeta` clause type.

**Detection:** Export CSV for a contract with Legal Issues findings. Open in Excel. Check if indemnification risk type, payment type, retainage percentage are visible columns.

---

### Pitfall 9: URL Routing Breaks the Upload-Then-Navigate Flow

**What goes wrong:** The current flow in `handleUploadComplete` (App.tsx line 42-106) creates a placeholder contract via `addContract()` and immediately calls `navigateTo('review', id)`. With URL routing, this becomes a programmatic navigation (e.g., `navigate('/review/c-123')`). But if the router reads the URL before the contract state update propagates, it hits the "contract not found" fallback.

**Why it happens:** `addContract` is a `setState` call that React may batch. The URL navigation and state update need to be synchronized from the router's perspective. Additionally, the `analyzeContract()` promise callback (lines 61-105) uses `updateContract` and `navigateTo` -- both need to work with the router instead of internal state.

**Prevention:**
1. Ensure `addContract` and navigation happen in the same synchronous handler (React 18 batches these in event handlers).
2. The review page already handles "contract exists but analyzing" state (line 180-183: `AnalysisProgress`). Preserve this guard.
3. Test the full upload flow end-to-end after routing migration: upload -> navigate to review -> see analyzing state -> see results.

**Detection:** Upload a contract. Check if URL updates to `/review/{id}`. Refresh during analysis. Verify analyzing state persists.

---

### Pitfall 10: Multiple useCompanyProfile Hooks Show Stale Data

**What goes wrong:** The `useCompanyProfile` hook (used in both `Settings.tsx` and `ContractReview.tsx` line 70) creates independent `useState` instances. If the user edits their insurance limits in Settings and then navigates to a contract review (without full page reload), the review page's profile state is stale -- it was initialized when the component first mounted. The incomplete-profile warning banner (ContractReview lines 73-86) may show incorrectly.

**Why it happens:** Each `useCompanyProfile()` call creates its own `useState` initialized from `loadCompanyProfile()`. There is no cross-instance synchronization. React state is local to the component tree.

**Prevention:**
1. Use a shared context provider for company profile state, or lift profile state to `App.tsx` and pass down.
2. Alternatively, re-read from localStorage on every navigation to a review page (in a `useEffect` keyed to the contract ID).
3. For the re-analyze feature specifically: `analyzeContract.ts` line 57 calls `loadCompanyProfile()` directly from localStorage at call time, so the API call will use fresh data. The stale state is only a UI display issue, not an analysis accuracy issue.

**Detection:** Open Settings and ContractReview side by side (or navigate between them). Edit a field in Settings. Check if ContractReview's profile-dependent UI updates.

---

## Minor Pitfalls

### Pitfall 11: Browser Back Button Ignores Modal State

**What goes wrong:** The delete confirmation dialog (`ConfirmDialog`) and any future annotation modals don't push history entries. Pressing browser back while a modal is open navigates away from the page instead of closing the modal, potentially losing unsaved annotation text.

**Prevention:** Accept this as a minor UX limitation. Route-based modals add complexity disproportionate to the benefit for a single-user app. If annotations are important, add a "discard unsaved changes?" prompt via `beforeunload`.

---

### Pitfall 12: PDF Generation Blocks UI Thread on Large Contracts

**What goes wrong:** PDF generation for a contract with 50+ findings (common for 100-page contracts) freezes the UI for several seconds using `@react-pdf/renderer`. The user thinks the app crashed.

**Prevention:** Show a loading indicator ("Generating report...") before starting generation. Use `React.lazy` or dynamic import for the PDF library to avoid adding it to the main bundle. If generation consistently takes more than 2 seconds, consider generating in a Web Worker.

---

### Pitfall 13: Resolved Findings Distort Risk Score

**What goes wrong:** If "resolved" findings are excluded from risk score recalculation, the score changes when the user marks findings resolved. This is misleading -- the contract's inherent risk has not changed, only the user's acknowledgment. If the user exports the report, the risk score won't match the original analysis.

**Prevention:** Keep the risk score as originally computed (it is deterministic from the analysis, per PROJECT.md key decisions). Display resolved count separately: "42 findings (7 resolved)." The risk score reflects the CONTRACT's risk, not the user's review progress. Never recalculate risk score based on user actions.

---

### Pitfall 14: Annotations Stored in localStorage Balloon Storage Size

**What goes wrong:** Each annotation adds free-text data per finding. With 50+ findings per contract and multiple contracts, annotation text pushes localStorage toward its ~5MB limit. The app already has quota handling in `contractStorage.ts` but hitting the limit means new contracts cannot be saved.

**Prevention:** Add a character limit on annotations (e.g., 500 chars). The existing `storageWarning` mechanism (useContractStore line 13-14) surfaces quota errors. Consider trimming annotations from mock/sample contracts that are not needed.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| URL-based Routing | Vercel rewrite breaks `/api/analyze` (Pitfall 1) | Add rewrites with API exclusion first, test in Vercel preview deployment |
| URL-based Routing | Deep link to missing contract (Pitfall 2) | Add "contract not found" fallback, derive nav state from URL only |
| URL-based Routing | Upload flow timing (Pitfall 9) | Test full upload-navigate-review flow end-to-end |
| Export Report (PDF) | html2canvas produces unusable output (Pitfall 4) | Use @react-pdf/renderer with dedicated report template |
| Export Report (CSV) | Nested metadata lost (Pitfall 8) | Define explicit CSV schema that flattens legalMeta/scopeMeta |
| Export Report | Large contract freezes UI (Pitfall 12) | Loading indicator, lazy-load PDF library |
| Re-analyze Contract | Race condition (Pitfall 3) | AbortController on fetch, disable button during analysis |
| Re-analyze Contract | Old findings persist on failure (Pitfall 7) | Clear findings on re-analyze start, explicit error state |
| Re-analyze Contract | Stale company profile in review UI (Pitfall 10) | Re-read profile on navigation, or use shared context |
| Finding Actions | Schema migration for existing contracts (Pitfall 5) | Optional fields, nullish coalescing, migration function in contractStorage |
| Finding Actions | Resolved findings change risk score (Pitfall 13) | Keep original score, display resolved count separately |
| Finding Actions | Annotations balloon storage (Pitfall 14) | Character limit, existing quota warning mechanism |
| Settings Validation | Auto-save conflicts with validation gate (Pitfall 6) | Inline validation (informational) or refactor to draft+save |

## Integration Risk: Feature Interaction Effects

These five features are not independent -- they interact in ways that compound pitfalls:

1. **Routing + Re-analyze:** If re-analyze changes the URL (e.g., adds a query param like `?version=2`), deep links to re-analyzed contracts need to work. If re-analyze does NOT change the URL, browser back/forward after re-analyze shows the same URL but different content.

2. **Finding Actions + Export:** The export must reflect the current state of findings (which are resolved, what annotations exist). If export is built first and finding actions added later, the export template needs to be updated to include resolution status and annotations.

3. **Settings Validation + Re-analyze:** The re-analyze feature should check if the company profile has changed since the last analysis. If settings validation prevents saving invalid data, the profile sent to re-analysis is guaranteed valid. If validation is informational-only, the API receives whatever the user typed.

4. **Routing + Export:** Deep links to an exported contract should work. If the user shares a URL `/review/c-123` and the recipient doesn't have the contract in their localStorage, they see "contract not found" -- the export PDF is the offline shareable artifact, not the URL.

**Recommendation:** Build URL-based routing first (it touches the most code and is a prerequisite for stable deep links), then export (standalone feature), then finding actions (modifies the data model), then re-analyze (depends on understanding the full data flow), then settings validation (lowest risk, most contained).

## Sources

- [Vercel Rewrites Documentation](https://vercel.com/docs/rewrites) -- rewrite ordering, catch-all patterns
- [Vercel SPA Fallback Discussion](https://github.com/vercel/vercel/discussions/5448) -- API route exclusion pattern
- [JS PDF Generation Libraries Comparison (2025)](https://dmitriiboikov.com/posts/2025/01/pdf-generation-comarison/) -- jsPDF vs @react-pdf/renderer tradeoffs
- [npm-compare: PDF libraries](https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf) -- download stats, feature comparison
- [html2canvas resolution issues](https://github.com/niklasvh/html2canvas/issues/3009) -- blurry PDF output confirmation
- [React SPA Routing Issues](https://medium.com/@taghiyev.ahad/react-single-page-application-spa-routing-issues-and-solutions-433910ddcdb1) -- refresh/deep link problems
- [Keeping React State and localStorage in sync](https://thomasderleth.de/keeping-react-state-and-local-storage-in-sync/) -- schema drift, multi-hook sync
- [Persisting React State in localStorage (Josh Comeau)](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) -- schema migration, hydration
- [Syncing localStorage across tabs (useSyncExternalStore)](https://oakhtar147.medium.com/sync-local-storage-state-across-tabs-in-react-using-usesyncexternalstore-613d2c22819e) -- multi-instance hook problems
- Current codebase: `App.tsx`, `useContractStore.ts`, `useCompanyProfile.ts`, `contractStorage.ts`, `analyzeContract.ts`, `ContractReview.tsx`, `FindingCard.tsx`, `vercel.json`, `contract.ts`

---
*Pitfalls research for: v1.3 Workflow Completion milestone (ClearContract)*
*Researched: 2026-03-12*
