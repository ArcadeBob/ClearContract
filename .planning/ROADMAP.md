# Roadmap: ClearContract

## Overview

ClearContract transforms from a broken proof-of-concept into a comprehensive glazing subcontract analysis tool. The journey starts by fixing the production pipeline and building multi-pass analysis infrastructure, then progressively adds legal risk analysis (core clauses, then full coverage), scope/compliance/verbiage extraction, and finally assembles everything into organized, negotiation-ready output. Each phase delivers independently testable value -- Phase 1 makes analysis work at all, Phase 2 produces the first real legal findings with exact quotes, and by Phase 5 the user gets a complete contract breakdown they can act on immediately.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Pipeline Foundation** - Fix production bugs, build multi-pass analysis engine with native PDF and structured output
- [ ] **Phase 2: Core Legal Risk Analysis** - First legal analysis pass producing findings with exact clause quotes for the 4 most critical clause types
- [ ] **Phase 3: Extended Legal Coverage** - Complete legal clause coverage across insurance, termination, flow-down, delays, liens, disputes, and change orders
- [ ] **Phase 4: Scope, Compliance, and Verbiage** - Extract full scope of work, dates/deadlines, labor compliance checklist, and flag questionable verbiage
- [ ] **Phase 5: Negotiation Output and Organization** - Add negotiation positions to Critical/High findings and organize all results into a systematic, actionable format

## Phase Details

### Phase 1: Pipeline Foundation
**Goal**: User can upload a PDF and receive a complete, valid analysis result -- the pipeline works end-to-end on real 50+ page contracts
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User uploads a 50+ page glazing subcontract PDF and receives analysis results without errors
  2. Analysis produces findings across multiple categories from separate focused API calls (not a single truncated response)
  3. PDFs that previously caused errors (scanned, image-heavy, large) are handled gracefully with clear error messages
  4. Every API response is valid structured JSON -- no parsing failures, no truncated responses
**Plans**: 4 plans

Plans:
- [x] 01-01: Zod schemas, extended types, dependency updates
- [x] 01-02: Server pipeline rewrite (Files API, multi-pass, structured outputs)
- [x] 01-03: Client-side integration (response mapping, 10MB upload limit)
- [ ] 01-04: Gap closure -- fix model for structured outputs, add Vite dev proxy

### Phase 2: Core Legal Risk Analysis
**Goal**: User receives detailed legal risk findings with exact verbatim clause text and plain-English explanations for the highest-priority clause types
**Depends on**: Phase 1
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05
**Success Criteria** (what must be TRUE):
  1. Every finding includes the exact verbatim clause text quoted from the contract alongside a plain-English explanation of why it is problematic
  2. Indemnification clauses are identified and classified by type (limited, intermediate, broad) with risk explanation
  3. Pay-if-paid and pay-when-paid provisions are detected with enforceability context
  4. Liquidated damages clauses show amount/rate, proportionality assessment, and cap status
  5. Retainage terms show percentage, release conditions, and whether tied to sub's work or overall project completion
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Extended Legal Coverage
**Goal**: User gets comprehensive legal clause analysis covering all major risk areas a glazing subcontractor faces in a contract
**Depends on**: Phase 2
**Requirements**: LEGAL-06, LEGAL-07, LEGAL-08, LEGAL-09, LEGAL-10, LEGAL-11, LEGAL-12
**Success Criteria** (what must be TRUE):
  1. Insurance requirements appear as a structured checklist -- coverage types, limits, endorsements, and certificate holder details
  2. Termination clauses show types, notice periods, compensation upon termination, and cure periods
  3. Flow-down provisions are flagged when they impose obligations beyond the sub's scope or insurance coverage
  4. No-damage-for-delay clauses, lien rights risks, dispute resolution terms, and change order processes are each detected and analyzed with relevant details
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Scope, Compliance, and Verbiage
**Goal**: User gets full scope extraction, all dates and deadlines, a labor compliance checklist, and flagged questionable verbiage -- completing the non-legal analysis categories
**Depends on**: Phase 1
**Requirements**: SCOPE-01, SCOPE-02, SCOPE-03, COMP-01
**Success Criteria** (what must be TRUE):
  1. Full scope of work is extracted with inclusions, exclusions, specification references, and scope rules
  2. All dates and deadlines are extracted including notice periods, cure periods, payment terms, and project milestones
  3. Questionable verbiage is flagged -- ambiguous clauses, one-sided terms favoring GC, missing standard protections, and undefined terms with legal significance
  4. Labor compliance requirements appear as an actionable checklist with items, associated dates, responsible parties, and contacts
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Negotiation Output and Organization
**Goal**: User can work through the entire contract analysis systematically, with Critical/High findings including suggested negotiation positions
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: SCOPE-04, OUT-01
**Success Criteria** (what must be TRUE):
  1. Every Critical and High severity finding includes the problematic language, why it is problematic, and a suggested replacement language or negotiation position
  2. Analysis results are organized by category so the user can work through findings systematically (legal risks, scope, compliance, verbiage) rather than in a flat list
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
Note: Phase 4 depends only on Phase 1 (not on Phase 2/3), so Phases 2-3 and Phase 4 could theoretically be built in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pipeline Foundation | 3/4 | Gap closure needed | - |
| 2. Core Legal Risk Analysis | 0/2 | Not started | - |
| 3. Extended Legal Coverage | 0/2 | Not started | - |
| 4. Scope, Compliance, and Verbiage | 0/2 | Not started | - |
| 5. Negotiation Output and Organization | 0/1 | Not started | - |
