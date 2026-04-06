# Requirements: ClearContract v3.0 Scope Intelligence

**Defined:** 2026-04-05
**Core Value:** Upload a contract, walk away with a complete breakdown — risks, scope, dates, compliance — with exact contract language quoted so you can act immediately.

**Milestone Goal:** Transform scope extraction from surface findings into estimator-grade intelligence that catches what expert reviewers miss. Multi-document input (contract + bid/estimate) enables cross-document reconciliation.

## v3.0 Requirements

### Scope Extraction (SCOPE)

- [x] **SCOPE-01**: User sees extracted submittal register (shop drawings, samples, mockups, product data) with durations, parties, and review cycles
- [ ] **SCOPE-02**: User sees schedule-conflict warnings when submittal durations + lead times push past contract milestones
- [ ] **SCOPE-03**: User sees inferred spec-reconciliation gaps for Div 08 / ASTM / AAMA cites — what's typically required but absent from declared scope
- [ ] **SCOPE-04**: User sees exclusion stress-test findings that challenge declared exclusions against inferred spec requirements
- [x] **SCOPE-05**: User sees quantity ambiguity flags ("approximately", "as required", "sufficient") on scope items as bid-risk warnings

### Multi-Doc Input & Bid Reconciliation (BID)

- [ ] **BID-01**: User can optionally attach a bid/estimate PDF at contract upload
- [ ] **BID-02**: User sees bid-vs-contract reconciliation findings: exclusion parity, quantity deltas, scope items not in bid
- [ ] **BID-03**: User can re-analyze a contract and choose whether to re-upload or update the bid PDF
- [ ] **BID-04**: Each reconciliation finding has both `contractQuote` and `bidQuote` attributed to the correct document
- [ ] **BID-05**: Contracts uploaded without a bid analyze normally — no missing functionality, bid-dependent UI hides gracefully

### New Clause Passes (CLS)

- [ ] **CLS-01**: User sees warranty clause findings (duration, exclusions, transferability, defect coverage, call-back period)
- [ ] **CLS-02**: User sees safety/OSHA compliance findings (site safety requirements, fall protection, GC safety-plan coordination)

### Knowledge Modules (KNOW)

- [ ] **KNOW-01**: AAMA submittal standards module drives spec-reconciliation and submittal-extraction passes
- [ ] **KNOW-02**: Div 08 MasterFormat deliverables module lists typical required submittals per section (084113, 088000, 088413, etc.)

### Portfolio Intelligence (PORT)

- [ ] **PORT-01**: User sees cross-contract scope trends on dashboard (most-declared exclusions, recurring scope items, exclusions that GCs commonly reject)

### Scope Intelligence UX (UX)

- [ ] **UX-01**: Scope-intel findings surface as subcategories under existing "Scope of Work" category (not new top-level categories) to prevent UI noise
- [ ] **UX-02**: User has a dedicated Scope Intelligence view-mode for submittal timeline, spec-gap matrix, and bid/contract diff

### Architecture Enablers (ARCH)

- [x] **ARCH-01**: Analysis pipeline adds Stage 3 parallel wave for reconciliation passes (runs after Stage 2 scope extraction completes)
- [x] **ARCH-02**: Inference-based findings include mandatory `inferenceBasis` schema field citing knowledge module source
- [x] **ARCH-03**: Scope-of-work pass knowledge module capacity resolved (pass split OR cap raised) to unblock scope-intel module additions

## Future Requirements (v3.x+)

### Scope Intelligence Deepening

- **SCOPE-06**: Responsibility matrix extraction (who submits, who reviews, who approves — per submittal/scope item)
- **SCOPE-07**: Submittal critical-path visualization with resubmittal buffer calculations
- **SCOPE-08**: SOV (Schedule of Values) line-item reconciliation with bid pricing

### Multi-Doc Expansion

- **BID-06**: Full spec section PDF upload (beyond inference-based reconciliation)
- **BID-07**: Bid PDF persistence in Supabase Storage for re-viewing without re-upload

### Clause Pass Expansion

- **CLS-03**: Assignment / anti-assignment clause pass
- **CLS-04**: IP / work-product ownership clause pass
- **CLS-05**: Audit rights clause pass

### Portfolio Extension

- **PORT-02**: Per-GC scope behavior profile (which GCs push broadest scope)
- **PORT-03**: Exclusion acceptance tracking — requires revisiting "negotiation outcome" out-of-scope decision

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full spec section PDF upload | Deferred to v3.x — inference-based reconciliation first; validates value before adding upload surface |
| Bid PDF persistence in Supabase Storage | Files API only for v3.0 — avoids second storage surface; re-upload accepted for re-analyze |
| Automated takeoff from drawings | No drawing OCR / vision parsing — quantity signals only |
| Negotiation outcome tracking | Decision to stay out-of-scope confirmed 2026-04-05 — cross-contract trends stay pattern-level |
| Multi-state / federal regulatory expansion | v3.0 stays CA-focused — geographic expansion is separate milestone |
| Anthropic Citations API | Evaluate post-v3.0 — `contractQuote`/`bidQuote` schema fields provide attribution for now |
| Exhaustive AAMA/Div 08 encyclopedia | Knowledge modules stay narrow-facts scope, not comprehensive reference |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCOPE-01 | Phase 57 | Complete |
| SCOPE-02 | Phase 57 | Pending |
| SCOPE-03 | Phase 59 | Pending |
| SCOPE-04 | Phase 59 | Pending |
| SCOPE-05 | Phase 57 | Complete |
| BID-01 | Phase 58 | Pending |
| BID-02 | Phase 60 | Pending |
| BID-03 | Phase 58 | Pending |
| BID-04 | Phase 60 | Pending |
| BID-05 | Phase 58 | Pending |
| CLS-01 | Phase 61 | Pending |
| CLS-02 | Phase 61 | Pending |
| KNOW-01 | Phase 58 | Pending |
| KNOW-02 | Phase 58 | Pending |
| PORT-01 | Phase 62 | Pending |
| UX-01 | Phase 62 | Pending |
| UX-02 | Phase 62 | Pending |
| ARCH-01 | Phase 56 | Complete |
| ARCH-02 | Phase 56 | Complete |
| ARCH-03 | Phase 56 | Complete |

**Coverage:**
- v3.0 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation (all 20 requirements mapped to Phases 56-62)*
