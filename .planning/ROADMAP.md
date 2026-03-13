# Roadmap: ClearContract

## Milestones

- **v1.0 Enhanced Analysis Release** -- Phases 1-6 (shipped 2026-03-06)
- **v1.1 Domain Intelligence** -- Phases 7-10 (shipped 2026-03-10)
- **v1.2 UX Foundations** -- Phases 11-14 (shipped 2026-03-12)
- **v1.3 Workflow Completion** -- Phases 15-19 (in progress)

## Phases

<details>
<summary>v1.0 Enhanced Analysis Release (Phases 1-6) -- SHIPPED 2026-03-06</summary>

- [x] Phase 1: Pipeline Foundation (4/4 plans) -- completed 2026-03-04
- [x] Phase 2: Core Legal Risk Analysis (2/2 plans) -- completed 2026-03-05
- [x] Phase 3: Extended Legal Coverage (2/2 plans) -- completed 2026-03-05
- [x] Phase 4: Scope, Compliance, and Verbiage (2/2 plans) -- completed 2026-03-05
- [x] Phase 5: Negotiation Output and Organization (2/2 plans) -- completed 2026-03-06
- [x] Phase 6: CategoryFilter Display Fix (1/1 plan) -- completed 2026-03-06 [GAP CLOSURE]

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.1 Domain Intelligence (Phases 7-10) -- SHIPPED 2026-03-10</summary>

- [x] Phase 7: Knowledge Architecture and Company Profile (2/2 plans) -- completed 2026-03-08
- [x] Phase 8: Pipeline Integration and Company-Specific Intelligence (2/2 plans) -- completed 2026-03-09
- [x] Phase 9: CA Regulatory Knowledge (2/2 plans) -- completed 2026-03-09
- [x] Phase 10: Industry and Trade Knowledge (2/2 plans) -- completed 2026-03-10

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.2 UX Foundations (Phases 11-14) -- SHIPPED 2026-03-12</summary>

- [x] Phase 11: Data Persistence (1/1 plan) -- completed 2026-03-12
- [x] Phase 12: Contract Management (1/1 plan) -- completed 2026-03-12
- [x] Phase 13: Upload Error Feedback (2/2 plans) -- completed 2026-03-12
- [x] Phase 14: Empty States and Dashboard Polish (1/1 plan) -- completed 2026-03-12

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

### v1.3 Workflow Completion (In Progress)

**Milestone Goal:** Complete stubbed features, add routing, and enable the full contract review workflow with export, re-analysis, and finding actions.

- [x] **Phase 15: URL-based Routing** - Browser navigation, deep links, bookmarkable URLs, refresh persistence (completed 2026-03-13)
- [x] **Phase 16: Finding Actions** - Resolve findings, annotate with notes, hide resolved, resolved counts in summary (completed 2026-03-13)
- [x] **Phase 17: Settings Validation** - Inline validation errors on Settings fields with save confirmation feedback (completed 2026-03-13)
- [x] **Phase 18: Re-analyze Contract** - Re-trigger analysis from review page with PDF re-selection and failure rollback (completed 2026-03-13)
- [ ] **Phase 19: Export Report** - CSV export of findings from review page, respecting active filters

## Phase Details

### Phase 15: URL-based Routing
**Goal**: Users can navigate with the browser and share links -- back/forward buttons, refresh, deep links, and bookmarks all work
**Depends on**: Phase 14
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04
**Success Criteria** (what must be TRUE):
  1. User clicks browser back button after navigating from dashboard to a contract review and returns to the dashboard
  2. User refreshes the page while viewing a contract review and the same contract review reloads
  3. User pastes a contract review URL into a new browser tab and lands on that contract's review page
  4. User navigates to a non-existent URL (e.g., `/contracts/bad-id`) and sees the dashboard instead of a blank screen
**Plans:** 1/1 plans complete
Plans:
- [ ] 15-01-PLAN.md — Create useRouter hook, wire into App.tsx, update vercel.json for SPA routing

### Phase 16: Finding Actions
**Goal**: Users can track remediation progress by resolving findings and adding notes during contract review
**Depends on**: Phase 15
**Requirements**: FIND-01, FIND-02, FIND-03, FIND-04, FIND-05
**Success Criteria** (what must be TRUE):
  1. User clicks a resolve button on a finding, sees it visually marked as resolved, and can toggle it back to unresolved
  2. User adds a text note to a finding and sees it displayed on the finding card
  3. User edits an existing note and sees the updated text; user deletes a note and it disappears
  4. User toggles "Hide resolved" and resolved findings disappear from the list; toggling back restores them
  5. User sees a count of resolved findings in the risk summary section (e.g., "5 of 12 findings resolved")
**Plans:** 2/2 plans complete
Plans:
- [ ] 16-01-PLAN.md — Extend Finding type, add store methods, build FindingCard resolve/notes UI
- [ ] 16-02-PLAN.md — Wire into ContractReview: hide-resolved toggle, resolved counts, empty state

### Phase 17: Settings Validation
**Goal**: Users get clear feedback when entering invalid data in Settings and confirmation when changes save successfully
**Depends on**: Phase 15
**Requirements**: SET-01, SET-02
**Success Criteria** (what must be TRUE):
  1. User enters an invalid dollar amount (e.g., "abc" or "-500") in a Settings field and sees an inline error message below that field
  2. User corrects the invalid field and the error message disappears
  3. User sees a brief "Saved" indicator after a Settings field value persists to localStorage
**Plans:** 1/1 plans complete
Plans:
- [ ] 17-01-PLAN.md — Validation utility, enhanced ProfileField with onBlur persistence, error/warning display, saved indicator

### Phase 18: Re-analyze Contract
**Goal**: Users can re-run AI analysis on a contract after updating their company profile, with safe rollback if it fails
**Depends on**: Phase 16, Phase 17
**Requirements**: REANA-01, REANA-02, REANA-03
**Success Criteria** (what must be TRUE):
  1. User clicks a re-analyze button on the contract review page and is prompted to re-select the PDF file
  2. User selects the PDF and analysis runs, replacing the previous findings and scores with fresh results
  3. If re-analysis fails (network error, API error), the previous analysis remains intact and the user sees an error message
**Plans:** 1/1 plans complete
Plans:
- [ ] 18-01-PLAN.md — Extend Toast/ConfirmDialog, add re-analyze button, confirmation dialog, file picker, overlay, rollback handler

### Phase 19: Export Report
**Goal**: Users can download their contract analysis as a CSV file to share or archive outside the app
**Depends on**: Phase 16
**Requirements**: EXPORT-01, EXPORT-02
**Success Criteria** (what must be TRUE):
  1. User clicks an export button on the contract review page and downloads a CSV file containing all findings with severity, category, clause text, and explanation
  2. User applies category or severity filters, exports, and the CSV contains only the filtered findings
**Plans:** 1 plan
Plans:
- [ ] 19-01-PLAN.md — CSV export utility and button wiring in ContractReview

## Progress

**Execution Order:**
Phases execute in numeric order: 15 -> 16 -> 17 -> 18 -> 19

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Pipeline Foundation | v1.0 | 4/4 | Complete | 2026-03-04 |
| 2. Core Legal Risk Analysis | v1.0 | 2/2 | Complete | 2026-03-05 |
| 3. Extended Legal Coverage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 4. Scope, Compliance, and Verbiage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 5. Negotiation Output and Organization | v1.0 | 2/2 | Complete | 2026-03-06 |
| 6. CategoryFilter Display Fix | v1.0 | 1/1 | Complete | 2026-03-06 |
| 7. Knowledge Architecture and Company Profile | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Pipeline Integration and Company-Specific Intelligence | v1.1 | 2/2 | Complete | 2026-03-09 |
| 9. CA Regulatory Knowledge | v1.1 | 2/2 | Complete | 2026-03-09 |
| 10. Industry and Trade Knowledge | v1.1 | 2/2 | Complete | 2026-03-10 |
| 11. Data Persistence | v1.2 | 1/1 | Complete | 2026-03-12 |
| 12. Contract Management | v1.2 | 1/1 | Complete | 2026-03-12 |
| 13. Upload Error Feedback | v1.2 | 2/2 | Complete | 2026-03-12 |
| 14. Empty States and Dashboard Polish | v1.2 | 1/1 | Complete | 2026-03-12 |
| 15. URL-based Routing | 1/1 | Complete    | 2026-03-13 | - |
| 16. Finding Actions | 2/2 | Complete    | 2026-03-13 | - |
| 17. Settings Validation | 1/1 | Complete    | 2026-03-13 | - |
| 18. Re-analyze Contract | 1/1 | Complete    | 2026-03-13 | - |
| 19. Export Report | v1.3 | 0/? | Not started | - |
