# Architecture Patterns

**Domain:** Feature integration for ClearContract v1.3 (Workflow Completion)
**Researched:** 2026-03-12
**Confidence:** HIGH (full codebase analyzed, all integration points verified against source)

## Current Architecture Summary

The app uses a single `useContractStore` hook (React `useState`) for all contract state, view-based routing via `ViewState` string union, `localStorage` persistence through `contractStorage.ts` and `profileLoader.ts`, and a Vercel serverless function at `api/analyze.ts` for the AI pipeline. Navigation is managed by `navigateTo(view, contractId?)` in App.tsx which sets `activeView` and `activeContractId` state. Company profile is managed separately via `useCompanyProfile` hook with its own localStorage key.

---

## Feature Integration Map

### 1. URL-based Routing

**What changes:** Replace in-memory `ViewState` + `activeContractId` with browser URL as source of truth.

**Why build first:** Every other feature benefits from deep links. Export can link to a contract. Re-analyze can preserve URL after completion. Settings gets a bookmarkable URL.

**Approach:** Custom hook using History API `pushState` + `popstate` listener. No library needed -- the app has 5 routes and no nested routing. React Router would add ~15KB gzipped for zero benefit here.

**URL scheme:**

| Route | ViewState | Notes |
|-------|-----------|-------|
| `/` | `dashboard` | Default |
| `/upload` | `upload` | |
| `/contracts` | `contracts` | |
| `/contracts/:id` | `review` | Deep link to specific contract |
| `/settings` | `settings` | |

**New files:**
- `src/hooks/useRouter.ts` -- custom hook wrapping `window.history` and `popstate`

**Modified files:**
- `src/hooks/useContractStore.ts` -- remove `activeView` and `activeContractId` state; the store no longer manages navigation
- `src/App.tsx` -- consume `useRouter` instead of `activeView`/`activeContractId` from store; derive `activeContract` from URL param + contracts array
- `src/components/Sidebar.tsx` -- replace `onNavigate` callbacks with `navigate()` calls from router hook
- All components calling `navigateTo()` -- replace with `navigate()` from router hook (Dashboard, AllContracts, ContractReview onBack)

**Data flow change:**

```
BEFORE: User clicks -> navigateTo('review', id) -> sets activeView + activeContractId state -> App re-renders
AFTER:  User clicks -> navigate('/contracts/c-123') -> pushState -> hook reads URL -> App re-renders
        Browser back -> popstate event -> hook reads URL -> App re-renders
```

**Component boundary:** The router hook is independent of the contract store. App.tsx becomes the integration point that derives `activeContract` from URL param + `contracts` array.

**Pattern:**
```typescript
// src/hooks/useRouter.ts
interface RouteState {
  view: ViewState;
  contractId: string | null;
}

function useRouter(): {
  route: RouteState;
  navigate: (path: string) => void;
}
```

The hook parses `window.location.pathname` into a `RouteState`, calls `history.pushState` on navigate, and listens to `popstate` for back/forward. A `parseRoute(pathname: string): RouteState` pure function handles the mapping and can be unit tested trivially.

**Critical integration detail:** The `handleUploadComplete` flow in App.tsx navigates to the review page with a freshly-created ID. This must use `navigate('/contracts/${id}')` instead of `navigateTo('review', id)`. The placeholder contract must be added to state before navigation so the URL-derived lookup finds it. The existing code already does this correctly (addContract before navigateTo), so the migration is a direct replacement.

---

### 2. Finding Actions (Resolve/Annotate)

**What changes:** Findings gain mutable user-state (resolved/active, user notes) persisted alongside the contract.

**Type changes in `src/types/contract.ts`:**

```typescript
// Add to Finding interface (all optional = backward compatible)
export interface Finding {
  // ... existing fields ...
  resolved?: boolean;        // User marked as addressed
  annotation?: string;       // User's note/comment
  resolvedAt?: string;       // ISO timestamp
}
```

Adding optional fields to `Finding` is backward-compatible -- existing contracts loaded from localStorage without these fields render as unresolved with no annotation. No migration step needed.

**New files:**
- `src/components/FindingActions.tsx` -- resolve toggle button + annotation input, rendered inside FindingCard

**Modified files:**
- `src/types/contract.ts` -- add `resolved`, `annotation`, `resolvedAt` to `Finding`
- `src/components/FindingCard.tsx` -- render `FindingActions`, apply visual dimming when resolved (e.g., `opacity-50` on the card body)
- `src/pages/ContractReview.tsx` -- add resolved/active filter toggle in the filter bar; pass `onUpdateFinding` handler down; wire to store
- `src/hooks/useContractStore.ts` -- add `updateFinding(contractId, findingId, updates)` method

**Data flow:**

```
User clicks Resolve -> FindingActions calls onResolve(findingId)
-> ContractReview calls updateFinding(contract.id, findingId, { resolved: true, resolvedAt: now })
-> useContractStore patches the finding in the contracts array
-> persistAndSet writes to localStorage
-> React re-renders with updated finding (dimmed style)
```

**State management decision:** `updateFinding` belongs in `useContractStore` because findings live inside contracts, and contracts are the persisted unit. A separate finding store would create sync issues (what if a contract is deleted?).

**Pattern for updateFinding:**
```typescript
const updateFinding = (contractId: string, findingId: string, updates: Partial<Finding>) => {
  persistAndSet((prev) =>
    prev.map((c) =>
      c.id === contractId
        ? {
            ...c,
            findings: c.findings.map((f) =>
              f.id === findingId ? { ...f, ...updates } : f
            ),
          }
        : c
    )
  );
};
```

**Storage impact:** Each annotation adds ~100-500 bytes. With 50+ findings per contract and 10+ contracts, this stays well under the 5MB localStorage limit. Not a concern.

---

### 3. Re-analyze Contract

**What changes:** A "Re-analyze" button on the review page re-runs the analysis pipeline for an existing contract using the current company profile.

**Core problem:** The current `analyzeContract` function requires a `File` object (for base64 encoding). After upload, the original PDF is not stored -- only the extracted findings. Re-analysis requires the original PDF data.

**Approach:** Store the PDF base64 string on the Contract object at upload time, but only in React state (in-memory), NOT in localStorage.

**Type changes:**
```typescript
// Add to Contract interface
export interface Contract {
  // ... existing fields ...
  pdfBase64?: string;  // Original PDF for re-analysis (in-memory only)
}
```

**Storage concern:** A 3MB PDF = ~4MB base64. localStorage limit is ~5MB total. Storing even one PDF base64 in localStorage would exhaust it.

**Modified persistence layer:**
```typescript
// In contractStorage.ts saveContracts()
// Strip pdfBase64 before persisting
const stripped = contracts.map(({ pdfBase64, ...rest }) => rest);
localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(stripped));
```

**New files:** None -- the re-analyze button lives in ContractReview.tsx header.

**Modified files:**
- `src/types/contract.ts` -- add optional `pdfBase64` to `Contract`
- `src/storage/contractStorage.ts` -- strip `pdfBase64` from persistence
- `src/App.tsx` -- modify `handleUploadComplete` to store `pdfBase64` on the placeholder contract; add `handleReanalyze(contractId)` function
- `src/pages/ContractReview.tsx` -- add Re-analyze button in header; accept `onReanalyze` prop
- `src/api/analyzeContract.ts` -- extract `analyzeContractFromBase64(pdfBase64, fileName, companyProfile)` so both upload and re-analyze can call the API without needing a File object

**Data flow:**

```
User clicks Re-analyze
-> ContractReview calls onReanalyze(contract.id)
-> App.tsx reads contract.pdfBase64, sets contract.status = 'Analyzing'
-> POSTs base64 to /api/analyze with CURRENT company profile
-> On success: updateContract with new findings, dates, riskScore, status = 'Reviewed'
-> On failure: toast error, revert status to 'Reviewed' (keep old findings intact)
```

**Edge case:** If `pdfBase64` is missing (contract loaded from localStorage after refresh), show a disabled "Re-analyze" button with tooltip "Re-upload the PDF to re-analyze" or hide the button entirely. This handles graceful degradation.

**Finding actions interaction:** Re-analyze replaces all findings with fresh AI output, which clears any resolved/annotation state. This is correct behavior -- the user is explicitly requesting a fresh analysis. The UI should confirm this with a dialog: "Re-analyzing will replace all findings and clear any notes. Continue?"

---

### 4. Export Report (PDF/CSV)

**What changes:** "Export Report" button on ContractReview generates a downloadable PDF or CSV file client-side.

**Approach:** Use `jsPDF` + `jspdf-autotable` for PDF generation. Client-side only, no server round-trip. For CSV, plain string construction with Blob download -- no library needed.

**Why jsPDF over @react-pdf/renderer:** The export is a formatted data report (tables, text blocks), not a visual replica of React components. jsPDF with autotable is purpose-built for tabular data reports. @react-pdf/renderer would require building a parallel JSX component tree for PDF layout -- unnecessary complexity for this use case.

**New files:**
- `src/export/exportPdf.ts` -- takes a `Contract` object, generates PDF using jsPDF, triggers browser download
- `src/export/exportCsv.ts` -- takes a `Contract` object, generates CSV string, triggers download via Blob URL
- `src/components/ExportMenu.tsx` -- dropdown on the Export Report button with PDF/CSV options

**Modified files:**
- `src/pages/ContractReview.tsx` -- replace the stubbed "Export Report" button with `ExportMenu` component

**PDF report structure:**
1. Header: contract name, client, type, upload date, risk score
2. Bid signal summary (if present)
3. Dates/milestones table
4. Findings grouped by category, each with: severity, title, description, clause quote, recommendation, resolved status
5. Footer: "Generated by ClearContract" + timestamp + AI disclaimer

**CSV structure:** Flat row per finding: severity, category, title, description, clauseReference, clauseText, recommendation, resolved, annotation.

**Data flow:**
```
User clicks Export -> ExportMenu shows PDF/CSV options
-> User picks PDF -> exportPdf(contract) -> jsPDF builds document -> browser downloads .pdf
-> User picks CSV -> exportCsv(contract) -> Blob URL -> browser downloads .csv
```

**New dependencies:**
```bash
npm install jspdf jspdf-autotable
```

Note: jsPDF v2.x bundles its own TypeScript types. `jspdf-autotable` provides types via `@types/jspdf-autotable` or its own declarations -- verify at install time.

**Font handling:** jsPDF ships with Helvetica/Courier/Times only. The app uses Inter, but for the export report Helvetica is appropriate -- this is a professional data report, not a branded marketing piece. Do not attempt to embed custom fonts.

---

### 5. Settings Validation + Save Feedback

**What changes:** Add field-level validation to Settings inputs and show save confirmation feedback.

**Current behavior:** `useCompanyProfile` calls `updateField` on every onChange event, which immediately persists to localStorage via `localStorage.setItem`. There is no validation, no save button, no visual feedback.

**Approach:** Keep the auto-save-on-change pattern (it works well for this use case -- immediate persistence, no "forgot to save" problem) but add:
1. Field-level validation with visual error states
2. A subtle "Saved" indicator that appears briefly after valid changes

**Validation rules:**

| Field Pattern | Rule | Example Fields |
|--------------|------|----------------|
| Dollar amounts | Must match `$X,XXX` or `$X,XXX,XXX` pattern, or be empty | `glPerOccurrence`, `bondingSingleProject` |
| Dates | Must be valid date (handled by `type="date"` input) or empty | `contractorLicenseExpiry`, `dirExpiry` |
| Identifiers | Non-empty string when filled, no format enforcement | `contractorLicenseNumber`, `dirRegistration` |
| Ranges | Non-empty string, flexible format ("15-25", "20+") | `employeeCount` |

**New files:**
- `src/utils/profileValidation.ts` -- validation functions: `validateDollarAmount(v)`, `validateDate(v)`, etc. Each returns `{ valid: boolean; error?: string }`

**Modified files:**
- `src/hooks/useCompanyProfile.ts` -- add validation state tracking; `updateField` runs validation; invalid values update UI state (so user can keep typing) but show error; only valid values persist
- `src/pages/Settings.tsx` -- `ProfileField` shows error styling (red border + error text) for invalid fields; add a "Saved" indicator in the header that fades after 2s

**Pattern for validation integration:**
```typescript
// In useCompanyProfile
const [errors, setErrors] = useState<Partial<Record<keyof CompanyProfile, string>>>({});
const [lastSaved, setLastSaved] = useState<number | null>(null);

const updateField = useCallback(
  <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    const validation = validateField(key, value);
    setErrors(prev => {
      const next = { ...prev };
      if (validation.valid) delete next[key]; else next[key] = validation.error;
      return next;
    });
    setProfile(prev => {
      const next = { ...prev, [key]: value };
      if (validation.valid) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setLastSaved(Date.now());
      }
      return next;
    });
  }, []
);
```

**Save feedback approach:** After `updateField` succeeds with a valid value, set `lastSaved` timestamp. Settings header displays "Changes saved" with a green checkmark that fades after 2s via a `useEffect` timeout.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `useRouter` (new) | URL parsing, navigation, back/forward | App.tsx (provides route state) |
| `useContractStore` (modified) | Contract CRUD, finding updates, persistence | App.tsx, pages |
| `useCompanyProfile` (modified) | Profile CRUD with validation, error state | Settings page |
| `ExportMenu` (new) | PDF/CSV format selection dropdown | ContractReview |
| `exportPdf` / `exportCsv` (new) | Pure functions: Contract -> file download | Called by ExportMenu |
| `FindingActions` (new) | Resolve toggle + annotation text input | FindingCard |
| `profileValidation` (new) | Pure validation functions | useCompanyProfile |

---

## Build Order (Dependency-Driven)

```
Phase 1: URL-based Routing
  No dependencies on other features.
  All other features benefit from deep links.
  Touches: useContractStore, App.tsx, Sidebar, Dashboard, AllContracts, ContractReview.
  Risk: Medium -- refactors the navigation system that every component uses.

Phase 2: Finding Actions (Resolve/Annotate)
  Benefits from: routing (resolved state accessible via deep link)
  Touches: contract types, useContractStore, FindingCard, ContractReview.
  Risk: Low -- additive type changes, new component, contained UI.

Phase 3: Settings Validation + Save Feedback
  Independent of other features.
  Touches: useCompanyProfile, Settings page only.
  Risk: Low -- fully isolated, no cross-feature dependencies.

Phase 4: Re-analyze Contract
  Depends on: Finding Actions decided (so re-analyze behavior re: clearing resolved state is defined)
  Touches: contract types, contractStorage, App.tsx, ContractReview, analyzeContract.
  Risk: Medium -- modifies persistence layer and upload flow.

Phase 5: Export Report (PDF/CSV)
  Benefits from: Finding Actions (export includes resolved status + annotations)
  Touches: ContractReview (button replacement), new export module.
  New dependency: jspdf + jspdf-autotable.
  Risk: Low -- purely additive, no existing code modifications beyond button swap.
```

**Phase ordering rationale:**
- Routing first because it refactors the navigation system that every other feature touches. Building features on the old `navigateTo` system and then migrating to URL routing doubles the work.
- Finding Actions second because both Re-analyze and Export depend on knowing the final shape of the Finding type (resolved, annotation fields).
- Settings Validation is fully isolated and slots in as a contained task between heavier features.
- Re-analyze before Export because the re-analyze flow's impact on finding state must be settled before export can finalize what data it includes.
- Export last because it is purely additive and benefits from all data being in its final shape.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing PDF base64 in localStorage
**What:** Saving `pdfBase64` alongside contract data in localStorage.
**Why bad:** A single 3MB PDF as base64 is ~4MB, which consumes nearly all of localStorage's ~5MB limit. Even one stored PDF would break persistence for all other contracts.
**Instead:** Keep `pdfBase64` in React state only. Strip it in `saveContracts()`. Accept that re-analyze is session-only.

### Anti-Pattern 2: Adding React Router for 5 flat routes
**What:** Installing `react-router-dom` (~15KB gzipped) for the routing feature.
**Why bad:** The app has no nested routes, no route guards, no code splitting, no loader patterns -- none of the features that justify React Router's complexity. It also requires wrapping the app in `<BrowserRouter>` and changes how all navigation works via its own context.
**Instead:** Custom `useRouter` hook with ~50 lines of code using the History API directly. Matches the app's existing architecture pattern of custom hooks for state management.

### Anti-Pattern 3: Separate Finding Actions Store
**What:** Creating a standalone context or store for finding resolved/annotation state, separate from contract data.
**Why bad:** Findings belong to contracts. Splitting them creates sync issues -- what happens when a contract is deleted? When re-analyzed? Two sources of truth for the same data guarantees bugs.
**Instead:** Extend `useContractStore` with `updateFinding()` that patches findings within their parent contract.

### Anti-Pattern 4: Server-Side PDF Generation for Export
**What:** Sending contract data to a Vercel serverless function to generate the PDF report.
**Why bad:** Adds API latency, function timeout risk, and complexity for a task that is entirely client-side. The contract data is already fully available in the browser. Serverless cold starts could add 2-5s delay for no benefit.
**Instead:** Client-side jsPDF generation. Zero network calls, instant download.

### Anti-Pattern 5: Adding a Save Button to Settings
**What:** Replacing auto-save with an explicit Save button + dirty state tracking.
**Why bad:** The current auto-persist pattern eliminates "forgot to save" entirely. Adding a save button requires dirty state detection, unsaved changes warnings on navigation, and a "discard changes?" dialog. All of this complexity for a form that a single user edits once, maybe updates quarterly.
**Instead:** Keep auto-save on change. Add validation to prevent invalid values from persisting. Show brief "Saved" feedback so the user knows it worked.

---

## Scalability Considerations

| Concern | Current (1-10 contracts) | At 50 contracts | At 200 contracts |
|---------|-------------------------|-----------------|------------------|
| localStorage size | ~50KB per contract (findings JSON) | ~2.5MB, fine | ~10MB, exceeds 5MB limit |
| URL routing | Trivial | Trivial | Trivial |
| Finding actions (annotations) | Adds ~5KB per contract | ~250KB extra, fine | ~1MB extra, compounds storage issue |
| Export PDF generation | <1s | <1s per contract | <1s per contract |
| Re-analyze (in-memory PDF) | ~4MB per contract in RAM | ~200MB if all retained | Not viable without eviction |

The localStorage limit is the primary scaling concern at 200+ contracts, but the project explicitly scopes out persistence as a non-goal ("Data persistence across sessions" in Out of Scope). At 50 contracts the current architecture holds comfortably.

For re-analyze, in-memory PDF retention should evict oldest PDFs if memory is a concern, but with the single-user context and typical usage (analyzing 1-2 contracts per session), this is not a practical issue.

---

## Sources

- Codebase analysis: `useContractStore.ts`, `App.tsx`, `ContractReview.tsx`, `contract.ts`, `analyzeContract.ts`, `contractStorage.ts`, `useCompanyProfile.ts`, `Settings.tsx`, `FindingCard.tsx`, `Sidebar.tsx`, `profileLoader.ts`
- [MDN History API pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState) -- browser history manipulation API
- [jsPDF GitHub](https://github.com/parallax/jsPDF) -- 30K+ stars, 2.6M weekly downloads, client-side PDF generation
- [Lightweight React routing patterns](https://medium.com/front-end-weekly/routing-in-react-without-react-router-36d16e2baa23) -- custom routing with History API
- [PDF library comparison 2025](https://dev.to/ansonch/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025-13g0) -- jsPDF vs @react-pdf/renderer vs pdfmake
