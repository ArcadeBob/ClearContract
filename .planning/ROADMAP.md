# Roadmap: ClearContract

## Milestones

- v1.0 Enhanced Analysis Release -- Phases 1-6 (shipped 2026-03-06)
- v1.1 Domain Intelligence -- Phases 7-10 (shipped 2026-03-10)
- v1.2 UX Foundations -- Phases 11-14 (shipped 2026-03-12)
- v1.3 Workflow Completion -- Phases 15-21 (shipped 2026-03-13)
- v1.4 Production Readiness -- Phases 22-25 (in progress)

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

<details>
<summary>v1.3 Workflow Completion (Phases 15-21) -- SHIPPED 2026-03-13</summary>

- [x] Phase 15: URL-based Routing (1/1 plan) -- completed 2026-03-13
- [x] Phase 16: Finding Actions (2/2 plans) -- completed 2026-03-13
- [x] Phase 17: Settings Validation (1/1 plan) -- completed 2026-03-13
- [x] Phase 18: Re-analyze Contract (1/1 plan) -- completed 2026-03-13
- [x] Phase 19: Export Report (1/1 plan) -- completed 2026-03-13
- [x] Phase 20: Fix All Contracts Navigation (1/1 plan) -- completed 2026-03-13 [GAP CLOSURE]
- [x] Phase 21: Fix Filtered CSV Export (1/1 plan) -- completed 2026-03-13 [GAP CLOSURE]

See `.planning/milestones/v1.3-ROADMAP.md` for full details.

</details>

### v1.4 Production Readiness (In Progress)

**Milestone Goal:** Clean up tech debt, strengthen the analysis pipeline, and deliver actionable output formats and cross-contract intelligence.

- [x] **Phase 22: Polish & Trust** - Eliminate tech debt and deliver UX quick wins that build confidence in the tool (completed 2026-03-14)
- [x] **Phase 23: Analysis Quality** - Strengthen the analysis pipeline with cross-pass synthesis, better knowledge, and cleaner scoring (completed 2026-03-14)
- [ ] **Phase 24: Actionable Output** - Give the user deliverables they can hand to others -- PDF reports, prioritized actions, negotiation checklists
- [ ] **Phase 25: Portfolio Intelligence** - Enable cross-contract insights, comparison, and smarter re-analysis across stored contracts

## Phase Details

### Phase 22: Polish & Trust
**Goal**: The codebase is clean of known debt and the UI communicates contract status with precision
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, DEBT-06, UX-01, UX-02, UX-03, UX-04, UX-05, UX-06
**Success Criteria** (what must be TRUE):
  1. No duplicate type definitions, dead code, or redundant schema copies exist in the codebase (DEBT-01 through DEBT-05 resolved)
  2. Browser back/forward behavior is consistent across all navigation paths including replaceState vs pushState (DEBT-06)
  3. User can rename a contract from the review page and see the new name reflected on dashboard, sidebar, and all contracts list (UX-01)
  4. Dashboard cards, review page, and date timeline show data-driven status -- open/resolved counts, days-until urgency coloring, bid signal factor breakdown, and upcoming deadlines replacing the static compliance card (UX-02, UX-03, UX-04, UX-05)
  5. Upload flow has a back/cancel escape and re-analyze failure returns user to the review page instead of the upload view (UX-06)
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md -- Tech debt cleanup (DEBT-01 through DEBT-06)
- [ ] 22-02-PLAN.md -- Contract rename, finding counts, upcoming deadlines (UX-01, UX-02, UX-05)
- [ ] 22-03-PLAN.md -- Timeline urgency, bid signal breakdown, upload escape (UX-03, UX-04, UX-06)

### Phase 23: Analysis Quality
**Goal**: The 16-pass analysis pipeline produces more accurate, better-scored, and more comprehensive findings
**Depends on**: Phase 22
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06
**Success Criteria** (what must be TRUE):
  1. After all 16 passes complete, a synthesis pass identifies compound risks that span multiple clause types and surfaces them as distinct findings (PIPE-01)
  2. Currently-empty passes gain CA knowledge modules for insurance law, public works payment, and dispute resolution statutes (PIPE-02)
  3. Risk score uses category-weighted formula and excludes synthetic error findings from computation; ca-title24 module reflects 2025 code cycle with staleness warning system (PIPE-03, PIPE-05)
  4. Verbiage pass findings focus on missing standard protections without duplicating legal pass output (PIPE-04)
  5. Bid signal match functions query structured metadata fields instead of scanning finding text strings (PIPE-06)
**Plans**: 3 plans

Plans:
- [ ] 23-01-PLAN.md -- Knowledge modules, staleness warnings, Title 24 update (PIPE-02, PIPE-05)
- [ ] 23-02-PLAN.md -- Category-weighted scoring, bid signal fix, verbiage refocus (PIPE-03, PIPE-04, PIPE-06)
- [ ] 23-03-PLAN.md -- Cross-pass synthesis pass for compound risk detection (PIPE-01)

### Phase 24: Actionable Output
**Goal**: Users can produce shareable deliverables and work through findings in priority order
**Depends on**: Phase 23
**Requirements**: OUT-01, OUT-02, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):
  1. User can generate and download a PDF report containing header, risk score, all findings grouped by category, and extracted dates for any analyzed contract (OUT-01)
  2. Every finding displays an action priority label -- pre-bid, pre-sign, or monitor -- so the user knows when to act on each item (OUT-02)
  3. Bid signal widget shows each of the 5 weighted factors with individual scores and the overall traffic light result (OUT-03)
  4. User can open a negotiation checklist view that collects all findings with negotiation positions into a single actionable list (OUT-04)
**Plans**: TBD

Plans:
- [ ] 24-01: TBD
- [ ] 24-02: TBD

### Phase 25: Portfolio Intelligence
**Goal**: Users gain insights across their stored contracts and can manage findings across re-analysis cycles
**Depends on**: Phase 22
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04
**Success Criteria** (what must be TRUE):
  1. Dashboard shows common finding patterns (recurring categories, severities, clause types) that appear across multiple stored contracts (PORT-01)
  2. User can select two contracts and view a side-by-side comparison showing findings diff and risk score delta (PORT-02)
  3. Findings list supports multi-select filtering by severity, category, resolved status, and presence of negotiation position simultaneously (PORT-03)
  4. When re-analyzing a contract, previously resolved findings and user notes are preserved by matching against new findings on composite key (PORT-04)
**Plans**: TBD

Plans:
- [ ] 25-01: TBD
- [ ] 25-02: TBD

## Progress

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
| 15. URL-based Routing | v1.3 | 1/1 | Complete | 2026-03-13 |
| 16. Finding Actions | v1.3 | 2/2 | Complete | 2026-03-13 |
| 17. Settings Validation | v1.3 | 1/1 | Complete | 2026-03-13 |
| 18. Re-analyze Contract | v1.3 | 1/1 | Complete | 2026-03-13 |
| 19. Export Report | v1.3 | 1/1 | Complete | 2026-03-13 |
| 20. Fix All Contracts Navigation | v1.3 | 1/1 | Complete | 2026-03-13 |
| 21. Fix Filtered CSV Export | v1.3 | 1/1 | Complete | 2026-03-13 |
| 22. Polish & Trust | v1.4 | 3/3 | Complete | 2026-03-14 |
| 23. Analysis Quality | 3/3 | Complete   | 2026-03-14 | - |
| 24. Actionable Output | v1.4 | 0/? | Not started | - |
| 25. Portfolio Intelligence | v1.4 | 0/? | Not started | - |
