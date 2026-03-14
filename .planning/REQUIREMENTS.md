# Requirements: ClearContract

**Defined:** 2026-03-13
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v1.4 Requirements

Requirements for Production Readiness milestone. Each maps to roadmap phases.

### Tech Debt

- [x] **DEBT-01**: Duplicate BidSignal types consolidated to single import
- [x] **DEBT-02**: useContractStore calls loadContracts() once instead of twice
- [x] **DEBT-03**: merge.ts uses Zod-typed results instead of `as` casts on Record<string, unknown>
- [x] **DEBT-04**: Dead updateField removed from useCompanyProfile
- [x] **DEBT-05**: ContractDateSchema extracted to shared module instead of 3 copies
- [x] **DEBT-06**: useRouter replaceState/pushState asymmetry fixed for consistent back-button behavior

### UX Quick Wins

- [ ] **UX-01**: User can rename a contract inline from the review page
- [ ] **UX-02**: Dashboard and contract cards show open vs resolved finding counts
- [ ] **UX-03**: Date timeline shows urgency indicators (days until/past, color-coded)
- [ ] **UX-04**: Bid signal expanded to show factor breakdown
- [ ] **UX-05**: Dashboard compliance card replaced with data-driven content (upcoming deadlines)
- [ ] **UX-06**: Upload page has back/cancel button; re-analyze failure navigates to review (not upload)

### Analysis Pipeline

- [ ] **PIPE-01**: Cross-pass synthesis pass detects compound risks after all 16 passes complete
- [ ] **PIPE-02**: 3-4 new CA knowledge modules added to currently-empty passes (insurance law, public works payment, dispute statutes)
- [ ] **PIPE-03**: Risk score uses category-weighted formula; synthetic error findings excluded from score
- [ ] **PIPE-04**: Verbiage analysis pass refocused on missing standard protections (not overlap with legal passes)
- [ ] **PIPE-05**: ca-title24 updated to 2025 code cycle; module staleness warning system added
- [ ] **PIPE-06**: Bid signal match functions use structured metadata fields instead of fragile text search

### Actionable Output

- [ ] **OUT-01**: User can generate a PDF report of contract analysis (header, risk score, findings, dates)
- [ ] **OUT-02**: Findings have action priority classification (pre-bid / pre-sign / monitor)
- [ ] **OUT-03**: Bid signal widget shows full factor breakdown with weighted scores
- [ ] **OUT-04**: Negotiation checklist view generated from findings with negotiationPosition data

### Portfolio Intelligence

- [ ] **PORT-01**: Dashboard shows common finding patterns across all stored contracts
- [ ] **PORT-02**: User can compare two contracts side-by-side (findings diff, risk score delta)
- [ ] **PORT-03**: Advanced multi-select filters on findings (severity, category, resolved, has negotiation position)
- [ ] **PORT-04**: Re-analyze preserves resolved status and notes by matching findings

## Future Requirements

None deferred -- all agent-identified features scoped into v1.4.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Saved/named filter presets | Advanced filters (PORT-03) sufficient for sole user without persistence |
| Custom tags/bookmarks on findings | Resolved + notes + filters cover annotation needs |
| Negotiation status tracking (Open/Proposed/Agreed) | Checklist view (OUT-04) is read-only extract; status tracking adds workflow complexity |
| Cross-contract trend graphs over time | Pattern detection (PORT-01) covers insights; time-series charts are premature |
| Template negotiation scripts | negotiationPosition from AI is per-finding; generic templates add legal liability |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 22 | Complete |
| DEBT-02 | Phase 22 | Complete |
| DEBT-03 | Phase 22 | Complete |
| DEBT-04 | Phase 22 | Complete |
| DEBT-05 | Phase 22 | Complete |
| DEBT-06 | Phase 22 | Complete |
| UX-01 | Phase 22 | Pending |
| UX-02 | Phase 22 | Pending |
| UX-03 | Phase 22 | Pending |
| UX-04 | Phase 22 | Pending |
| UX-05 | Phase 22 | Pending |
| UX-06 | Phase 22 | Pending |
| PIPE-01 | Phase 23 | Pending |
| PIPE-02 | Phase 23 | Pending |
| PIPE-03 | Phase 23 | Pending |
| PIPE-04 | Phase 23 | Pending |
| PIPE-05 | Phase 23 | Pending |
| PIPE-06 | Phase 23 | Pending |
| OUT-01 | Phase 24 | Pending |
| OUT-02 | Phase 24 | Pending |
| OUT-03 | Phase 24 | Pending |
| OUT-04 | Phase 24 | Pending |
| PORT-01 | Phase 25 | Pending |
| PORT-02 | Phase 25 | Pending |
| PORT-03 | Phase 25 | Pending |
| PORT-04 | Phase 25 | Pending |

**Coverage:**
- v1.4 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
