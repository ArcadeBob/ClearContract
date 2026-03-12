# Requirements: ClearContract

**Defined:** 2026-03-12
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v1.3 Requirements

Requirements for Workflow Completion milestone. Each maps to roadmap phases.

### Routing

- [ ] **ROUTE-01**: User can navigate with browser back/forward buttons between views
- [ ] **ROUTE-02**: User can refresh the page and stay on the current view
- [ ] **ROUTE-03**: User can bookmark or share a URL that deep links to a specific contract review
- [ ] **ROUTE-04**: User sees dashboard when navigating to an unknown URL or non-existent contract

### Export

- [ ] **EXPORT-01**: User can export contract findings as a CSV file from the review page
- [ ] **EXPORT-02**: User's CSV export respects active category/severity filters

### Finding Actions

- [ ] **FIND-01**: User can mark a finding as resolved (toggleable)
- [ ] **FIND-02**: User can add a text note to any finding
- [ ] **FIND-03**: User can edit or delete their note on a finding
- [ ] **FIND-04**: User can toggle "Hide resolved" to filter resolved findings from view
- [ ] **FIND-05**: User sees resolved finding counts in the risk summary

### Settings

- [ ] **SET-01**: User sees inline validation errors on invalid dollar amounts or dates in Settings
- [ ] **SET-02**: User sees "Saved" feedback after Settings fields persist successfully

### Re-analyze

- [ ] **REANA-01**: User can trigger re-analysis of a contract from the review page
- [ ] **REANA-02**: User must re-select the PDF file to start re-analysis
- [ ] **REANA-03**: User's previous analysis is preserved if re-analysis fails

## Future Requirements

Deferred to v1.4+.

### Export Enhancements

- **EXPORT-03**: User can export contract analysis as a branded PDF report
- **EXPORT-04**: User can export with a professional cover page and severity color-coding

### Re-analyze Enhancements

- **REANA-04**: User sees a diff view showing what changed after re-analysis
- **REANA-05**: User sees which findings were added, removed, or changed severity

### Dashboard Enhancements

- **DASH-01**: User sees findings progress tracker (resolved counts) on dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side PDF generation | Adds serverless complexity; client-side CSV sufficient for v1.3 |
| React Router / TanStack Router | Overkill for 5 flat routes; custom hook with History API is simpler |
| Hash-based routing | Outdated look; pushState universally supported |
| Rich text annotations | Overkill for single user; plain text sufficient |
| Finding edit/override | Blurs AI analysis vs user opinion; liability concern |
| Auto re-analysis on profile change | Burns API credits silently; manual trigger preferred |
| PDF storage in localStorage | Blows 5MB quota; user re-selects file instead |
| Batch export | Single user reviews one contract at a time |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUTE-01 | — | Pending |
| ROUTE-02 | — | Pending |
| ROUTE-03 | — | Pending |
| ROUTE-04 | — | Pending |
| EXPORT-01 | — | Pending |
| EXPORT-02 | — | Pending |
| FIND-01 | — | Pending |
| FIND-02 | — | Pending |
| FIND-03 | — | Pending |
| FIND-04 | — | Pending |
| FIND-05 | — | Pending |
| SET-01 | — | Pending |
| SET-02 | — | Pending |
| REANA-01 | — | Pending |
| REANA-02 | — | Pending |
| REANA-03 | — | Pending |

**Coverage:**
- v1.3 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 ⚠️

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
