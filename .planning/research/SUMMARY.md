# Project Research Summary

**Project:** ClearContract v1.3 -- Workflow Completion
**Domain:** Contract Review AI -- completing the review-to-action workflow loop
**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

ClearContract v1.3 completes the workflow loop from "upload and review a contract" to "act on findings and share results." The five features -- URL-based routing, finding actions (resolve/annotate), settings validation, re-analyze contract, and export report (PDF/CSV) -- are all well-understood patterns with minimal novel technical risk. The existing stack (React 18, TypeScript, Vite, Tailwind, Vercel) handles all of them. Only three new dependencies are needed: jsPDF and jspdf-autotable for PDF export (lazy-loaded, ~79KB gzipped, zero impact on initial page load), and wouter for routing (~1.5KB gzipped). Every other feature is built with existing tools.

The recommended approach is to build routing first (it refactors the navigation system everything else touches), then finding actions (they extend the data model that export and re-analyze depend on), then settings validation (small, isolated), then re-analyze (touches the analysis pipeline), and finally export (purely additive, benefits from all data being in final shape). This order minimizes rework and ensures each feature builds on stable foundations.

The key risks are: (1) Vercel rewrite ordering breaking the `/api/analyze` endpoint when SPA routing is added -- mitigated by explicit API route exclusion in vercel.json, (2) URL/localStorage state divergence on deep links -- mitigated by making the URL the single source of truth and removing navigation state from the contract store, and (3) re-analyze race conditions if the button is clicked while analysis is in-flight -- mitigated by disabling the button during analysis and using AbortController. All three are preventable with deliberate implementation choices documented in the architecture research.

## Key Findings

### Recommended Stack

The existing stack requires only three new npm packages. The research explicitly evaluated and rejected heavier alternatives (React Router, TanStack Router, @react-pdf/renderer, pdfmake, papaparse, file-saver, form libraries, client-side Zod). The "what NOT to add" list is as important as the additions. See [STACK.md](./STACK.md) for full details.

**New dependencies:**
- **jsPDF v4.2+ + jspdf-autotable v5.0+**: Client-side PDF generation for export reports -- mature (30K+ GitHub stars, 2.6M weekly downloads), TypeScript declarations included, lazy-loadable via dynamic import
- **wouter v3.9+**: Minimal client-side router (1.5KB gzipped) -- hooks-first API matches existing codebase patterns, supports History API and route params with type inference

**No new dependencies needed for:** CSV export (native JS), settings validation (custom validation functions), re-analyze (existing pipeline), finding actions (data model extension + UI)

**Bundle impact:** ~1.5KB on initial load (wouter only). ~79KB lazy-loaded on-demand when user exports PDF.

### Expected Features

See [FEATURES.md](./FEATURES.md) for the full prioritization matrix and dependency graph.

**Must have (table stakes -- workflow feels broken without these):**
- **URL-based routing** -- back button does nothing, refresh loses view, no bookmarks or deep links
- **Export report (PDF + CSV)** -- the Export button already exists in the UI and does nothing
- **Finding actions (resolve + annotate)** -- findings are static with no way to track remediation
- **Settings validation + save feedback** -- invalid input silently corrupts company profile data
- **Re-analyze contract** -- profile changes make existing analyses stale with no refresh option

**Should have (differentiators, low incremental effort):**
- Findings progress tracker on dashboard ("12 of 28 resolved") -- pure UI, zero new data
- Export filtered findings (only Critical/High, or only Legal Issues) -- apply existing filters to export
- Deep link sharing -- free consequence of URL routing
- Branded PDF report with company name header -- jsPDF supports this natively

**Defer to v1.4+:**
- Re-analyze diff view (what changed between analyses) -- High complexity, significant UI work
- Batch export across multiple contracts
- Rich text annotations (WYSIWYG) -- overkill for single user

### Architecture Approach

All five features integrate into the existing architecture of a single `useContractStore` hook, localStorage persistence via `contractStorage.ts`, and Vercel serverless API. The key structural change is replacing the in-memory `ViewState` + `activeContractId` navigation with URL-based routing, making the browser URL the single source of truth for navigation. Finding state (resolved, annotations) stays inside the Contract object in `useContractStore` -- no separate store. PDF retention for re-analyze lives in React state only, explicitly excluded from localStorage to avoid blowing the 5MB quota. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full data flow and component design.

**New components and their boundaries:**
1. **`useRouter` hook (or wouter)** -- URL parsing, `pushState` navigation, `popstate` listener; replaces `activeView`/`activeContractId` in store
2. **`FindingActions` component** -- resolve toggle + annotation input; renders inside FindingCard
3. **`ExportMenu` component** -- PDF/CSV format picker dropdown; replaces stub Export button
4. **`exportPdf` / `exportCsv` utilities** -- pure functions: Contract data in, file download out
5. **`profileValidation` utilities** -- pure validation functions for dollar amounts, dates, identifiers

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the complete list of 14 pitfalls with recovery strategies.

1. **Vercel rewrite ordering breaks API** -- A catch-all SPA rewrite intercepts `/api/analyze`, returning HTML. Prevention: add explicit API passthrough rule before the catch-all, test in Vercel preview deployment.
2. **URL/localStorage state divergence** -- Deep link to a contract that does not exist in localStorage crashes or shows blank. Prevention: URL is the sole navigation authority; add "contract not found" fallback; remove `activeView`/`activeContractId` from the store.
3. **Re-analyze race condition** -- Two concurrent analyses for the same contract; last-to-resolve wins with potentially stale results. Prevention: disable button during analysis, use AbortController on fetch.
4. **Finding schema drift** -- Existing localStorage contracts lack `resolved`/`annotation` fields; `=== false` checks silently exclude them. Prevention: optional fields with nullish coalescing (`finding.resolved ?? false`), migration normalizer in `contractStorage.ts`.
5. **Settings auto-save conflicts with validation** -- Validation gate blocks persistence but auto-save already wrote the value. Prevention: informational-only validation (warn, do not block) or refactor to validate-then-persist with draft state.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: URL-based Routing
**Rationale:** Foundational infrastructure that changes how every component navigates. Building other features on the old `navigateTo` system and then migrating doubles the work. Routing must be stable before anything else ships.
**Delivers:** Browser back/forward, deep links, bookmarkable URLs, refresh preserves view
**Addresses:** URL Routing (table stakes)
**Avoids:** Pitfall 1 (Vercel rewrites), Pitfall 2 (state divergence), Pitfall 9 (upload flow timing)
**Stack:** wouter v3.9+
**Effort:** 0.5-1 day

### Phase 2: Finding Actions (Resolve + Annotate)
**Rationale:** Extends the Finding data model that both Export and Re-analyze depend on. Export needs to include resolution status and annotations. Re-analyze needs defined behavior for clearing resolved state. Shipping this second locks the data shape for downstream features.
**Delivers:** Mark findings resolved, add user notes, visual dimming for resolved items, "Hide resolved" filter
**Addresses:** Finding Actions (table stakes), lays groundwork for Findings Progress Tracker (differentiator)
**Avoids:** Pitfall 5 (schema migration), Pitfall 13 (resolved findings distorting risk score), Pitfall 14 (annotation storage limits)
**Stack:** No new dependencies
**Effort:** 1-1.5 days

### Phase 3: Settings Validation + Save Feedback
**Rationale:** Small, fully isolated, zero cross-feature dependencies. Good palate cleanser between heavier phases. Builds validation/feedback patterns. Ensures company profile data is valid before re-analyze feature ships (Phase 4 sends profile to API).
**Delivers:** Field-level validation on dollar/date fields, inline error display, "Saved" confirmation indicator
**Addresses:** Settings Validation + Save Feedback (table stakes)
**Avoids:** Pitfall 6 (auto-save conflict with validation gate)
**Stack:** No new dependencies
**Effort:** 0.5 day

### Phase 4: Re-analyze Contract
**Rationale:** Most complex feature, touches the analysis pipeline and persistence layer. Depends on Finding Actions being settled (re-analyze clears resolved state -- user must be warned). Benefits from Settings Validation being complete (profile data sent to API is valid).
**Delivers:** Re-analyze button on review page, file re-selection dialog, in-place update of findings/scores, rollback on failure
**Addresses:** Re-analyze Contract (table stakes, deferral candidate if time-constrained)
**Avoids:** Pitfall 3 (race condition), Pitfall 7 (stale findings on failure), Pitfall 10 (stale profile in UI)
**Stack:** No new dependencies (reuses existing analysis pipeline)
**Effort:** 1-1.5 days

### Phase 5: Export Report (PDF + CSV)
**Rationale:** Purely additive -- no existing code modified beyond replacing the stub Export button. Benefits from all data being in final shape (findings with resolved/annotation fields, valid profile data). Lazy-loaded dependencies mean zero impact on existing performance.
**Delivers:** Professional PDF report with findings tables, severity colors, dates, disclaimers; CSV with flattened finding metadata; filter-aware export
**Addresses:** Export Report (table stakes), Filtered Export (differentiator), Branded PDF (differentiator)
**Avoids:** Pitfall 4 (html2canvas), Pitfall 8 (lost CSV metadata), Pitfall 12 (UI thread blocking)
**Stack:** jsPDF v4.2+, jspdf-autotable v5.0+ (lazy-loaded)
**Effort:** 1.5-2 days

### Phase Ordering Rationale

- Routing first because it refactors the navigation system every component uses. Building on the old system creates migration debt.
- Finding Actions second because it defines the final shape of the `Finding` type. Export and Re-analyze both consume this shape.
- Settings Validation third because it is isolated, quick, and guarantees valid profile data before Re-analyze ships.
- Re-analyze fourth because it modifies the analysis pipeline and persistence layer. Its interaction with Finding Actions (clearing resolved state) must be explicitly designed.
- Export last because it is read-only and purely additive. It benefits from every other feature being complete so the export includes the full data model.

Total estimated effort: ~5-6.5 days across all phases.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Routing):** Needs careful integration plan for replacing `navigateTo` across all components. The upload-then-navigate flow (Pitfall 9) requires specific attention. Consider research-phase to map all navigation call sites.
- **Phase 4 (Re-analyze):** The PDF retention strategy (in-memory only, stripped from localStorage) and the finding state clearing behavior need explicit design decisions during planning.
- **Phase 5 (Export PDF):** The report layout design (section order, table formatting, severity color mapping, page break logic) benefits from a mockup or specification before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Finding Actions):** Well-understood CRUD pattern. Optional fields on existing type, new UI component, existing persistence.
- **Phase 3 (Settings Validation):** Standard form validation. Regex for currency, date comparison, inline error display.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies verified on npm with recent publish dates, download stats, TypeScript support. Alternatives evaluated and rejected with clear rationale. |
| Features | HIGH | All features mapped to existing codebase with line-number references. Complexity estimates grounded in actual code structure. |
| Architecture | HIGH | Full codebase analyzed. Integration points, data flows, and component boundaries verified against source files. |
| Pitfalls | HIGH | 14 pitfalls identified with specific prevention strategies. Critical pitfalls backed by Vercel docs, MDN references, and codebase analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **Router library choice:** STACK.md recommends wouter; FEATURES.md and ARCHITECTURE.md suggest a custom `useRouter` hook (~80 lines). Both are viable. Recommendation: use wouter -- the 1.5KB cost is negligible and it handles edge cases (popstate, base paths) that a custom hook might miss. Settle this during Phase 1 planning.
- **Settings validation strategy:** Informational-only (warn but persist) vs. validate-then-persist (draft state). The research leans toward informational-only to preserve the auto-save UX, but this means the API could receive malformed profile data. Decide during Phase 3 planning.
- **Re-analyze UX on refresh:** If the user refreshes the page, `pdfBase64` is lost from memory. The re-analyze button must gracefully degrade (disabled with tooltip, or hidden). The exact UX needs design during Phase 4 planning.
- **PDF report layout:** No mockup exists. The report structure is described (header, bid signal, dates, findings by category, footer) but visual design decisions (column widths, color intensity, font sizes) will be made during implementation.

## Sources

### Primary (HIGH confidence)
- [jsPDF on npm](https://www.npmjs.com/package/jspdf) -- v4.2.0, 2.6M weekly downloads
- [jspdf-autotable on npm](https://www.npmjs.com/package/jspdf-autotable) -- v5.0.7, table rendering
- [wouter on npm](https://www.npmjs.com/package/wouter) -- v3.9.0, 1.5KB gzipped router
- [Vercel Rewrites Documentation](https://vercel.com/docs/rewrites) -- rewrite ordering, API exclusion
- [MDN History API pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState) -- browser history manipulation
- ClearContract codebase (all source files analyzed with line-number references)

### Secondary (MEDIUM confidence)
- [CVE-2025-68428 GitHub Advisory](https://github.com/advisories/GHSA-f8cm-6447-x5h2) -- jsPDF path traversal fix
- [PDF library comparison 2025](https://dev.to/ansonch/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025-13g0) -- jsPDF vs alternatives
- [Persisting React State in localStorage (Josh Comeau)](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) -- schema migration patterns
- [React SPA Routing Issues](https://medium.com/@taghiyev.ahad/react-single-page-application-spa-routing-issues-and-solutions-433910ddcdb1) -- refresh/deep link problems

### Tertiary (LOW confidence)
- None -- all findings are backed by multiple sources or direct codebase analysis

---
*Research completed: 2026-03-12*
*Supersedes: 2026-03-08 v1.1 research summary (v1.1 features shipped)*
*Ready for roadmap: yes*
