# Feature Landscape: v1.3 Workflow Completion

**Domain:** Contract Review AI -- Export, Routing, Re-analysis, Finding Actions
**Researched:** 2026-03-12
**Scope:** NEW features only -- v1.0 analysis engine and v1.1 domain intelligence already shipped
**Confidence:** HIGH (features are well-understood patterns; implementation details verified against existing codebase)

## Table Stakes

Features users expect given what already exists. Missing = workflow feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Export Report (PDF)** | "Export Report" button already visible in ContractReview header (line 161) and does nothing. A non-functional button is worse than no button. Users need to share findings with legal counsel, PMs, or attach to Procore. | Medium | Contract data model, FindingCard layout (existing) | Must include findings with clause quotes, risk score, dates, bid signal, disclaimer |
| **Export Report (CSV)** | Spreadsheet format for users who want to sort/filter findings in Excel or track remediation. Complementary to PDF. | Low | Contract data model (existing) | Flat tabular export: one row per finding with all fields |
| **Settings Validation** | Settings currently accept any string for dollar amounts and dates. Entering "abc" for GL Per Occurrence breaks insurance comparison silently. Users expect form fields to reject invalid input. | Low | useCompanyProfile hook, Settings page, ProfileField component (existing) | Dollar fields need currency validation; date fields need expiry warnings; inline error display |
| **Save Feedback** | Settings save silently on blur with no confirmation (useCompanyProfile line 12-17). User has no idea if save succeeded or if localStorage quota was exceeded. Standard form UX requires visible feedback. | Low | useCompanyProfile hook (existing), Toast component (existing) | Brief "Saved" indicator or toast on success; error toast on failure |
| **URL-based Routing** | Browser back button does nothing. Refreshing loses current view (ViewState resets to 'dashboard' on mount). Cannot bookmark or share a link to a contract review. These are baseline web app behaviors. | Medium | ViewState type, navigateTo(), App.tsx switch/case (existing) | Must sync URL with ViewState bidirectionally; handle deep links on load; preserve back/forward |
| **Finding Actions: Resolve** | Users review findings and want to mark items as "addressed" or "not applicable" to track progress. Without this, findings are static -- no remediation workflow. | Medium | Finding interface, FindingCard component, contract persistence (existing) | Adds `status` field to Finding. Resolved findings visually dim but remain visible. Toggleable. |
| **Finding Actions: Annotate** | Users want to add notes like "Discussed with attorney -- acceptable risk" or "Negotiate per Bob's guidance." Institutional knowledge that makes the review actionable. | Medium | Finding interface, FindingCard component, contract persistence (existing) | Adds `userNote` field to Finding. Plain text, not rich text. |
| **Re-analyze Contract** | After updating company profile (insurance limits, bonding), existing analyses are stale -- severity downgrades and bid signals reflect old profile. No way to refresh without re-uploading. | High | Analysis pipeline (api/analyze.ts), company profile, handleUploadComplete in App.tsx (existing). **Critical constraint: original PDF not stored.** | User must re-select file from disk. Refactor upload handler to support update-in-place. |

## Differentiators

Features beyond expected that add clear value for this user and use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Findings Progress Tracker** | Dashboard shows "12 of 28 findings resolved" per contract. Tracks remediation across contracts. Computed from finding status -- zero new data needed. | Low | Pure UI addition on Dashboard and ContractReview sidebar |
| **Export Filtered Findings** | Export only Critical/High findings, or only a specific category. Attorneys only need Legal Issues, PMs only need Important Dates. | Low | Apply existing filter state (selectedCategory, severity filter) before generating PDF/CSV |
| **Deep Link Sharing** | URL like `/review/c-123456` bookmarkable directly to a specific contract. Falls out naturally from URL routing. | Low | Free consequence of URL routing implementation |
| **PDF Report with Branding** | Professional cover page with company name, formatted sections, severity color-coding. Looks credible when shared with GCs. | Medium | jsPDF supports custom fonts and colors. Company name from profile. Logo upload is out of scope. |
| **Re-analyze Diff** | After re-analysis, show what changed: new findings, removed findings, severity changes. Shows whether profile updates actually affected the analysis. | High | Requires storing previous findings snapshot. Significant diff UI work. v1.4 candidate. |

## Anti-Features

Features to explicitly NOT build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Server-side PDF generation** | Adds serverless function complexity (wkhtmltopdf/Puppeteer), cold start latency, Vercel function size limits, and a new dependency chain. Client-side is simpler and sufficient for single user. | Use jsPDF + jspdf-autotable client-side. Both are well-maintained (jsPDF: 2.6M weekly npm downloads; autotable: v3.8+). |
| **Full react-router-dom adoption** | The app has 5 views with one parameterized route (`/review/:id`). React Router v7 brings ~45KB gzipped, framework mode, loaders, actions -- massive overhead for a problem solvable in ~80 lines. | Custom router hook using History API (pushState + popstate), syncing directly with existing ViewState. Zero dependencies added. |
| **Hash-based routing (#)** | Hash URLs look outdated (`/#/review/c-123`). Modern browsers universally support pushState. Vercel handles SPA routing natively with rewrites. | Clean path URLs (`/review/c-123`) via History API. Add Vercel rewrite rule in vercel.json. |
| **Rich text annotations** | Markdown/WYSIWYG editor for finding notes is overkill. Single user writing quick notes. Adds editor dependencies and complexity. | Plain text textarea, max 500 chars. Enough for "Discussed with attorney -- acceptable" or "Negotiate clause 12.3." |
| **Finding edit/override** | Letting users edit AI-generated titles, descriptions, or severities blurs the line between AI analysis and user opinion. Creates liability confusion about what the AI said vs what the user changed. | Resolve (mark as addressed) and Annotate (add note) keep original AI output intact. User workflow actions are separate from AI analysis. |
| **Automatic re-analysis on profile change** | Auto-triggering re-analysis burns API credits silently and surprises user with changed results. | Manual "Re-analyze" button with explicit confirmation dialog explaining what will happen. |
| **PDF storage in localStorage** | Storing base64 PDFs for re-analysis would blow the ~5MB localStorage quota instantly (a 3MB PDF = ~4MB base64). Even IndexedDB is fragile for this. | User re-selects the file from disk for re-analysis. Clear UX guidance: "Select the original PDF to re-analyze with your updated profile." |
| **Batch export** | Exporting multiple contracts at once. Single user reviews one contract at a time. | Export from individual contract review page only. |

## Feature Details

### 1. Export Report (PDF/CSV)

**Expected behavior:**
- "Export Report" button (already exists, line 161-164 of ContractReview.tsx) opens a dropdown menu with "Export as PDF" and "Export as CSV" options
- PDF layout: header section (contract name, client, type, date, risk score, bid signal level), findings grouped by category with severity color-coding, clause quotes in blockquote style, recommendations in callout boxes, dates timeline, disclaimer footer ("AI-generated analysis -- verify with legal counsel")
- CSV format: one row per finding, columns: Severity, Category, Title, Description, Clause Reference, Clause Text, Recommendation, Negotiation Position, Status (active/resolved), User Note
- If category filter is active, export only filtered findings (with a note indicating the filter)
- Generation happens entirely client-side; triggers browser download via Blob + URL.createObjectURL

**Technology:**
- **PDF:** jsPDF (v2.5+) + jspdf-autotable (v3.8+). jsPDF handles document creation, headers, and text. AutoTable handles the findings table layout with automatic pagination and column sizing. Severity colors map to cell background colors matching existing Tailwind palette (red-100 for Critical, amber-100 for High, etc.).
- **CSV:** Native string concatenation with proper escaping (double-quote fields containing commas/newlines). Blob with `text/csv` MIME type. No library needed.

**Complexity breakdown:**
- PDF layout + formatting + severity colors: Medium (bulk of work; ~200-300 lines for report builder)
- CSV generation: Low (~50 lines)
- Dropdown UI on Export button: Low (existing button, add menu)
- Filter-aware export: Low (pass current filter state to export function)

### 2. Settings Validation + Save Feedback

**Expected behavior:**
- Dollar fields (GL Per Occurrence, GL Aggregate, Umbrella, Auto, WC Employer's Liability, Bonding Single/Aggregate, Project Size Min/Max): validate on blur as currency-parseable. Accept formats like "$1,000,000", "1000000", "1M", "$2M". Show red border + "Enter a valid dollar amount" on invalid.
- Date fields (License Expiry, DIR Expiry): show amber warning if date is in the past ("This date has expired"). Red error if format invalid.
- License number: format hint placeholder text, no strict validation (formats vary).
- On successful save: brief green "Saved" text appears next to the section header, auto-fades after 2 seconds via Framer Motion (already available).
- On save failure (localStorage quota exceeded): amber warning toast using existing Toast component.

**Important design choice:** Validation should be non-blocking -- warn but do not prevent saving. These are reference values, not transactional data. Users might enter approximate amounts or notes. Warning is enough.

**Complexity breakdown:**
- Validation rules per field type: Low (regex for currency, Date comparison for expiry)
- Error/warning display UI: Low (inline colored text, border color change on ProfileField)
- Save feedback animation: Low (Framer Motion AnimatePresence fade, already used throughout app)
- Auto-format currency display on blur: Low (optional nicety)

### 3. URL-based Routing

**Expected behavior:**
- URL path maps to ViewState:
  - `/` or `/dashboard` -> `'dashboard'`
  - `/upload` -> `'upload'`
  - `/review/:contractId` -> `'review'` (with activeContractId set)
  - `/contracts` -> `'contracts'`
  - `/settings` -> `'settings'`
- Browser back/forward buttons navigate between views correctly
- Page refresh preserves current view (URL parsed on mount to derive initial ViewState)
- Direct URL entry and bookmarks work (requires Vercel SPA rewrite)
- `navigateTo()` internally calls `history.pushState()` -- no full page reload

**Implementation approach:** Custom `useRouter` hook (~80 lines), not react-router.
- On mount: parse `window.location.pathname` to derive initial `activeView` and `activeContractId`
- On `navigateTo(view, contractId?)`: call `history.pushState({}, '', path)` alongside existing state updates
- Listen for `popstate` event to handle back/forward, updating ViewState accordingly
- Fallback: if URL contains an unknown path or a contract ID that does not exist in storage, redirect to dashboard

**Vercel config addition:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Complexity breakdown:**
- URL-to-ViewState mapping + parsing: Low (simple switch on pathname segments)
- History API integration (pushState + popstate listener): Low
- Initial load from URL with validation: Medium (contract ID existence check, graceful fallback)
- Vercel rewrite config: Low (one line in vercel.json)
- Refactoring navigateTo to include URL sync: Medium (touches useContractStore hook)

### 4. Re-analyze Contract

**Expected behavior:**
- "Re-analyze" button on ContractReview page header (next to Export Report and Delete)
- Button only appears for contracts in "Reviewed" status (not while "Analyzing")
- Clicking opens a dialog: "Re-analyze with current company profile? Select the original PDF file to proceed." with a file picker area inside the dialog
- User selects PDF, confirms, analysis begins
- Contract status changes to "Analyzing", review page shows AnalysisProgress (existing component)
- On completion: findings, risk score, bid signal, dates all update in-place; old findings are fully replaced
- On failure: revert to previous "Reviewed" status with old data intact, show error toast

**Critical constraint:** Original PDF is not stored. The File object from the initial upload is garbage-collected after the analysis promise resolves. localStorage cannot store PDFs (size). The user MUST re-select the file from disk. This is unavoidable without adding server-side file storage (out of scope).

**Implementation notes:**
- Refactor `handleUploadComplete` in App.tsx to accept an optional `existingContractId` parameter. When provided, set existing contract to "Analyzing" and update in-place on completion instead of creating a new entry.
- Before overwriting, snapshot the current contract data so failure can restore it.
- The file picker in the re-analyze dialog should be a simple `<input type="file" accept=".pdf">`, not the full UploadZone component.

**Complexity breakdown:**
- Re-analyze button + confirmation dialog with file picker: Medium
- Refactoring handleUploadComplete for update mode: Medium (most significant change)
- Snapshot/rollback on failure: Low (save copy of contract before analysis)
- Status management during re-analysis: Low (existing "Analyzing" status works)

### 5. Finding Actions (Resolve + Annotate)

**Expected behavior:**

**Resolve:**
- Each FindingCard gets a subtle action bar at the bottom with a "Mark Resolved" button (checkmark icon)
- Clicking toggles the finding between `active` and `resolved` states
- Resolved findings: reduced opacity (opacity-50), green checkmark overlay, subtle strikethrough on title
- Resolved findings remain in the list (not hidden by default)
- Optional "Hide resolved" toggle in the filter bar to suppress resolved findings
- Toggling back to active restores full appearance
- Risk Summary sidebar shows resolved count: "3 of 7 Critical findings resolved"

**Annotate:**
- "Add Note" button (pencil icon) in the action bar next to Resolve
- Clicking expands an inline textarea below the finding card content
- User types note (max 500 chars), clicks "Save" or presses Ctrl+Enter
- Saved note displays in a distinct callout (slate-50 background, "Your Note" header) below the finding
- Notes can be edited (click to re-open textarea) or deleted (X button on note)
- Notes persist immediately to localStorage via updateContract

**Type changes to Finding interface:**
```typescript
// Add to Finding interface in src/types/contract.ts
status?: 'active' | 'resolved';   // undefined treated as 'active' for backward compat
userNote?: string;                  // user annotation, max 500 chars
resolvedAt?: string;                // ISO date string when resolved
```

**Backward compatibility:** Existing contracts with findings that lack `status` or `userNote` fields work without migration. The UI treats `undefined` status as `'active'` and absent `userNote` as no note. No data migration step needed.

**Persistence approach:** When a finding action occurs, update the contract's findings array and call `updateContract(contractId, { findings: updatedFindings })`. This uses the existing `persistAndSet` path in useContractStore which writes to localStorage.

**Complexity breakdown:**
- Finding type extension: Low (3 optional fields)
- Resolve toggle UI + visual treatment: Medium (opacity, checkmark, strikethrough, color changes)
- Annotate UI (textarea expand/collapse, save/edit/delete): Medium
- Contract persistence on finding change: Low (existing updateContract path)
- "Hide resolved" filter toggle: Low
- Risk Summary resolved counts: Low

## Feature Dependencies

```
Settings Validation --> Save Feedback (validation errors need feedback UI patterns)

URL Routing (standalone -- no dependencies on other v1.3 features)

Finding Actions: Resolve --> Finding Actions: Annotate (share action bar UI component)
Finding Actions -----------> Export Report (export includes status + userNote columns)

Re-analyze Contract (standalone, but refactors upload handler shared with initial upload)
```

**Build order rationale:**
1. **URL Routing** -- foundational infrastructure. Changes how navigation works throughout the app. Other features (Export, Re-analyze) produce URLs or navigate, so routing should be stable first.
2. **Settings Validation + Save Feedback** -- small, self-contained, quick win. Builds the validation/feedback patterns reused elsewhere.
3. **Finding Actions (Resolve + Annotate)** -- extends core Finding data model. Must ship before Export so PDF/CSV can include status and notes.
4. **Export Report (PDF + CSV)** -- benefits from having resolve/annotate data to include in output. The "complete" export with all fields is better than adding columns later.
5. **Re-analyze Contract** -- most complex feature, touches the analysis pipeline. Depends on nothing else but benefits from shipping last so the full workflow (resolve findings -> update profile -> re-analyze -> export new report) is testable end-to-end.

## MVP Recommendation

**Must ship in v1.3 (all five, ordered by priority):**
1. **URL Routing** -- broken back button and lost-on-refresh are usability bugs disguised as missing features
2. **Export Report (PDF + CSV)** -- the button already exists and does nothing; this is the most visible gap
3. **Finding Actions (Resolve + Annotate)** -- transforms static analysis into actionable workflow
4. **Settings Validation + Save Feedback** -- small effort, prevents silent data corruption in company profile
5. **Re-analyze Contract** -- completes the review lifecycle (upload -> review -> update profile -> re-analyze)

**Defer to v1.4 if time-constrained:**
- Re-analyze Contract is the deferral candidate. Users can work around it by re-uploading the PDF (creates a new contract entry). The real compelling version of re-analyze includes a diff view showing what changed, which is High complexity. Shipping re-analyze without diff is functional but underwhelming.
- PDF branding (cover page, company name header) can ship as basic PDF first and polish later.
- Re-analyze Diff is clearly v1.4+.
- Findings Progress Tracker on Dashboard is a quick add anytime after Finding Actions ships.

## Complexity Budget

| Feature | Effort Estimate | Risk Level | Notes |
|---------|----------------|------------|-------|
| URL Routing | 0.5-1 day | Low | Well-understood pattern, clean ViewState mapping |
| Settings Validation + Save Feedback | 0.5 day | Low | Simple validation rules, existing Toast component |
| Finding Actions (Resolve + Annotate) | 1-1.5 days | Low-Medium | Type changes + FindingCard UI + persistence |
| Export Report (PDF + CSV) | 1.5-2 days | Medium | PDF layout is the bulk of work; CSV is trivial |
| Re-analyze Contract | 1-1.5 days | Medium | Upload handler refactor + file re-selection UX |
| **Total** | **~5-6.5 days** | | |

## Sources

- ClearContract codebase: ContractReview.tsx (Export button lines 157-164, findings display), FindingCard.tsx (current card layout), useContractStore.ts (navigateTo, persistAndSet), useCompanyProfile.ts (onBlur save pattern), Settings.tsx (ProfileField component), App.tsx (handleUploadComplete, view routing)
- [jsPDF npm](https://www.npmjs.com/package/jspdf) -- 30K+ GitHub stars, 2.6M weekly downloads, v2.5+
- [jsPDF-AutoTable GitHub](https://github.com/simonbengtsson/jsPDF-AutoTable) -- table plugin, v3.8+, automatic pagination
- [React Router v7 SPA docs](https://reactrouter.com/how-to/spa) -- evaluated, rejected (overkill for 5 flat routes)
- [History API popstate in SPAs](https://www.frontendgeek.com/blogs/understanding-popstate-in-single-page-applications-spas) -- lightweight routing pattern
- [Lightweight SPA routing without framework](https://namastedev.com/blog/routing-without-a-framework-building-a-minimal-spa-router/) -- pushState + popstate pattern reference

---
*Feature research for: v1.3 Workflow Completion*
*Researched: 2026-03-12*
*Supersedes: 2026-03-08 v1.1 feature research (all v1.1 features now shipped)*
