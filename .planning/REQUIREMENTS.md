# Requirements: ClearContract

**Defined:** 2026-03-02
**Core Value:** Upload a contract, walk away with a complete breakdown — risks, scope, dates, compliance — with exact contract language quoted so you can act immediately.

## v1 Requirements

Requirements for the enhanced analysis release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Analysis bug is fixed — user can upload a PDF and receive analysis results without errors
- [ ] **INFRA-02**: Multi-pass analysis engine sends multiple focused Claude API calls per contract instead of one 4096-token call
- [ ] **INFRA-03**: Native PDF support replaces pdf-parse — Claude reads PDFs directly via document content blocks, with unpdf fallback for large contracts
- [ ] **INFRA-04**: Structured output via Zod schemas guarantees valid JSON responses with no parsing failures

### Legal Risk Analysis

- [ ] **LEGAL-01**: Every finding includes the exact verbatim clause text from the contract plus a plain-English explanation of why it's problematic
- [ ] **LEGAL-02**: Indemnification clauses are identified by type (limited, intermediate, broad) with risk explanation and insurance alignment check
- [ ] **LEGAL-03**: Pay-if-paid and pay-when-paid provisions are detected with enforceability context
- [ ] **LEGAL-04**: Liquidated damages clauses are flagged with amount/rate, proportionality assessment, and cap status
- [ ] **LEGAL-05**: Retainage terms are extracted — percentage, release conditions, and whether tied to sub's work or project completion
- [ ] **LEGAL-06**: Insurance requirements are extracted into a structured checklist — coverage types, limits, endorsements, certificate holder details
- [ ] **LEGAL-07**: Termination clauses are analyzed — types, notice periods, compensation upon termination, cure periods
- [ ] **LEGAL-08**: Flow-down provisions are identified with warnings about obligations beyond the sub's scope or insurance coverage
- [ ] **LEGAL-09**: No-damage-for-delay clauses are detected and flagged with severity
- [ ] **LEGAL-10**: Lien rights risks are identified — no-lien clauses, unconditional waiver language, broad release provisions
- [ ] **LEGAL-11**: Dispute resolution terms are analyzed — venue, arbitration requirements, mediation steps, attorney fee shifting
- [ ] **LEGAL-12**: Change order process is analyzed — unilateral change rights, notice requirements, pricing mechanisms, proceed-pending clauses

### Scope & Verbiage

- [ ] **SCOPE-01**: Full scope of work is extracted with inclusions, exclusions, specification references, and scope rules
- [ ] **SCOPE-02**: All dates and deadlines are extracted including notice periods, cure periods, payment terms, and project milestones
- [ ] **SCOPE-03**: Questionable verbiage is flagged — ambiguous clauses, one-sided terms favoring GC, missing standard protections, undefined terms with legal significance
- [ ] **SCOPE-04**: Each Critical/High finding includes a negotiation position — the problematic language, why it's problematic, and suggested replacement language or position

### Compliance

- [ ] **COMP-01**: Labor compliance requirements are extracted into an actionable checklist with items, associated dates, responsible parties, and contacts where specified

### Output

- [ ] **OUT-01**: Analysis results are organized by category so the user can work through the contract systematically

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### UX Enhancements

- **UX-01**: Progressive rendering shows findings as each analysis pass completes instead of waiting for full analysis
- **UX-02**: PDF report export generates a downloadable report for sharing with attorney or business partner
- **UX-03**: Section-by-section contract map provides a structured TOC with page/section references

### Advanced Analysis

- **ADV-01**: Scope gap detection compares extracted scope to standard glazing scope items and flags missing/ambiguous items
- **ADV-02**: Bid-to-scope comparison allows uploading bid proposal alongside contract to detect scope differences
- **ADV-03**: State-specific legal context tailors findings to jurisdiction (e.g., pay-if-paid enforceability by state)
- **ADV-04**: Contract version comparison highlights changes between original and revised contracts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated redlining / markup | Legal liability risk — user or attorney should draft replacement language |
| Multi-document comparison | Single-user reviewing individual contracts, not a doc management platform |
| Playbook / template customization | Single user — the AI prompt IS the playbook, hardcode glazing sub perspective |
| Real-time chat with contract | Comprehensive upfront analysis makes Q&A unnecessary |
| Contract storage / database | No persistence needed — user stores PDFs in file system, analysis is the artifact |
| Multi-user / authentication | Sole user tool |
| Mobile app | Web-only is sufficient |
| Procore / PM integration | Export report as PDF, user attaches to their own PM system |
| Multi-language support | US glazing contracts are in English |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |
| LEGAL-01 | — | Pending |
| LEGAL-02 | — | Pending |
| LEGAL-03 | — | Pending |
| LEGAL-04 | — | Pending |
| LEGAL-05 | — | Pending |
| LEGAL-06 | — | Pending |
| LEGAL-07 | — | Pending |
| LEGAL-08 | — | Pending |
| LEGAL-09 | — | Pending |
| LEGAL-10 | — | Pending |
| LEGAL-11 | — | Pending |
| LEGAL-12 | — | Pending |
| SCOPE-01 | — | Pending |
| SCOPE-02 | — | Pending |
| SCOPE-03 | — | Pending |
| SCOPE-04 | — | Pending |
| COMP-01 | — | Pending |
| OUT-01 | — | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 0
- Unmapped: 22

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
