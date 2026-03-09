# Roadmap: ClearContract

## Milestones

- **v1.0 Enhanced Analysis Release** -- Phases 1-6 (shipped 2026-03-06)
- **v1.1 Domain Intelligence** -- Phases 7-10 (in progress)

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

### v1.1 Domain Intelligence (In Progress)

**Milestone Goal:** Make the AI a true glazing contract domain expert -- company-specific thresholds, CA regulatory knowledge, industry standards, and structured knowledge architecture that loads selectively per analysis pass.

- [ ] **Phase 7: Knowledge Architecture and Company Profile** - Knowledge module system, prompt builder, per-pass selective loading, and company profile Settings UI with localStorage persistence
- [x] **Phase 8: Pipeline Integration and Company-Specific Intelligence** - Wire knowledge into analysis pipeline, insurance/bonding comparison against company profile, false positive filtering, bid/no-bid signals (completed 2026-03-09)
- [ ] **Phase 9: CA Regulatory Knowledge** - Mechanics lien law, prevailing wage/DIR, CA contract law severity overrides, Title 24, Cal/OSHA knowledge modules
- [ ] **Phase 10: Industry and Trade Knowledge** - Division 08 scope intelligence, AAMA/ASTM standard validation, contract standard form detection and deviation flagging

## Phase Details

### Phase 7: Knowledge Architecture and Company Profile
**Goal**: Users can configure their company profile and the system has a working knowledge module infrastructure ready to receive domain content
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06
**Success Criteria** (what must be TRUE):
  1. User can enter and save insurance, bonding, license, and capability data in Settings, and it persists across browser sessions
  2. Settings page loads with pre-populated Clean Glass Installation defaults on first visit
  3. Knowledge modules exist as TypeScript files with effective date and review-by date metadata
  4. A prompt builder function composes system prompts from base prompt + domain knowledge + company profile, with each pass receiving only its mapped knowledge (not everything)
  5. Token budget enforcement rejects knowledge injection that exceeds the 1500-token cap before any API call is made
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Knowledge module infrastructure (types, registry, token budget, prompt builder)
- [ ] 07-02-PLAN.md — Company profile hook and Settings page rewrite

### Phase 8: Pipeline Integration and Company-Specific Intelligence
**Goal**: Analysis pipeline uses domain knowledge and company profile to deliver company-specific findings -- insurance gap detection, bonding capacity checks, severity adjustments, and bid/no-bid signals
**Depends on**: Phase 7
**Requirements**: INTEL-01, INTEL-02, INTEL-03, INTEL-04
**Success Criteria** (what must be TRUE):
  1. After analysis, the review page shows specific insurance coverage gaps (e.g., "Contract requires $2M GL, your policy covers $1M") by comparing contract requirements against user's company profile
  2. After analysis, bonding requirements show pass/fail against company's bonding capacity with clear over/under amounts
  3. Findings for requirements the company already meets are severity-downgraded with an explanation (e.g., "Downgraded from High to Low: company meets this insurance requirement")
  4. Review page displays a bid/no-bid signal widget with weighted scoring across bonding, insurance, scope, payment, and retainage factors
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Pipeline wiring: profile transport, prompt enhancement, schema extensions, bid signal computation
- [ ] 08-02-PLAN.md — UI: SeverityBadge downgrade annotation, BidSignalWidget, CoverageComparisonTab, warning banner

### Phase 9: CA Regulatory Knowledge
**Goal**: Analysis passes receive California-specific regulatory knowledge that transforms generic legal findings into CA-specific analysis with correct statute references and legally-mandated severity levels
**Depends on**: Phase 8
**Requirements**: CAREG-01, CAREG-02, CAREG-03, CAREG-04, CAREG-05
**Success Criteria** (what must be TRUE):
  1. Lien Rights findings reference CA mechanics lien law specifics (preliminary notice deadlines, recording deadlines, anti-waiver provisions under CC 8122) rather than generic lien language
  2. Labor Compliance findings detect public works contracts and reference DIR registration, prevailing wage, CPR, and apprenticeship requirements with correct penalty amounts
  3. Pay-if-paid clauses are automatically flagged Critical citing CC 8814, broad-form indemnity clauses are flagged Critical citing CC 2782, and pre-payment lien waivers are flagged Critical citing CC 8122
  4. Relevant passes receive Title 24 climate-zone glazing requirements and Cal/OSHA safety requirements for glazing work (fall protection, glass handling)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

### Phase 10: Industry and Trade Knowledge
**Goal**: Analysis demonstrates deep glazing industry expertise -- recognizing contract standard forms, validating technical standard references, and flagging scope assignments outside the glazing trade
**Depends on**: Phase 8
**Requirements**: TRADE-01, TRADE-02, TRADE-03
**Success Criteria** (what must be TRUE):
  1. Scope findings identify and flag non-glazing work (outside Division 08) being assigned to the subcontractor, with specific CSI section references
  2. Findings referencing AAMA or ASTM standards validate whether those references are current, flagging obsolete standards and handling the AAMA-to-FGIA rebrand
  3. Analysis detects the contract standard form family (AIA A401, ConsensusDocs 750, EJCDC) and flags clauses that deviate from that form's standard defaults
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Pipeline Foundation | v1.0 | 4/4 | Complete | 2026-03-04 |
| 2. Core Legal Risk Analysis | v1.0 | 2/2 | Complete | 2026-03-05 |
| 3. Extended Legal Coverage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 4. Scope, Compliance, and Verbiage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 5. Negotiation Output and Organization | v1.0 | 2/2 | Complete | 2026-03-06 |
| 6. CategoryFilter Display Fix | v1.0 | 1/1 | Complete | 2026-03-06 |
| 7. Knowledge Architecture and Company Profile | v1.1 | 0/2 | Not started | - |
| 8. Pipeline Integration and Company-Specific Intelligence | 2/2 | Complete   | 2026-03-09 | - |
| 9. CA Regulatory Knowledge | v1.1 | 0/? | Not started | - |
| 10. Industry and Trade Knowledge | v1.1 | 0/? | Not started | - |
