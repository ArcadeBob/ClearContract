# Requirements: ClearContract

**Defined:** 2026-03-08
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v1.1 Requirements

Requirements for Domain Intelligence milestone. Each maps to roadmap phases.

### Knowledge Architecture

- [x] **ARCH-01**: System loads domain knowledge as TypeScript modules with per-pass selective mapping
- [x] **ARCH-02**: Each analysis pass receives only its relevant knowledge files (not everything)
- [x] **ARCH-03**: Token budget enforcement validates knowledge injection fits within 1500-token cap per pass before API call
- [x] **ARCH-04**: Knowledge modules display effective date and review-by date
- [x] **ARCH-05**: Prompt builder composes base prompt + domain knowledge + company profile into system prompt

### Company Profile

- [x] **PROF-01**: User can enter insurance coverage limits (GL, auto, WC, umbrella) in Settings
- [x] **PROF-02**: User can enter bonding capacity (single and aggregate limits) in Settings
- [x] **PROF-03**: User can enter license info (C-17 number, DIR registration) in Settings
- [x] **PROF-04**: User can enter company capabilities (employee count, service area, typical project size range) in Settings
- [x] **PROF-05**: Company profile persists in localStorage across sessions
- [x] **PROF-06**: Settings pre-populated with Clean Glass Installation defaults

### Company-Specific Intelligence

- [x] **INTEL-01**: Analysis compares contract insurance requirements against company profile and shows specific gaps
- [x] **INTEL-02**: Analysis compares bonding requirements against company capacity with pass/fail flag
- [x] **INTEL-03**: Findings are severity-downgraded when company already meets/exceeds the requirement
- [x] **INTEL-04**: Review page displays bid/no-bid signal widget with weighted scoring (bonding, insurance, scope, payment, retainage factors)

### CA Regulatory Knowledge

- [x] **CAREG-01**: Lien Rights pass receives CA mechanics lien law knowledge (prelim notice, recording deadlines, foreclosure, anti-waiver)
- [x] **CAREG-02**: Labor Compliance pass receives prevailing wage/DIR knowledge (public works detection, CPR, apprenticeship threshold, penalties)
- [x] **CAREG-03**: Severity overrides enforce CA void-by-law clauses as Critical (pay-if-paid CC 8814, broad-form indemnity CC 2782, pre-payment lien waiver CC 8122)
- [x] **CAREG-04**: Relevant passes receive Title 24 climate-zone glazing requirements for energy code awareness
- [x] **CAREG-05**: Labor Compliance pass receives Cal/OSHA safety requirements for glazing (fall protection, glass handling)

### Industry & Trade Knowledge

- [x] **TRADE-01**: Scope pass receives Division 08 section knowledge and flags non-glazing scope assigned to sub
- [x] **TRADE-02**: Technical passes validate AAMA/ASTM standard references are current (flag obsolete, handle AAMA-to-FGIA rebrand)
- [x] **TRADE-03**: Analysis detects contract standard form family (AIA A401, ConsensusDocs 750, EJCDC) and flags deviations from standard defaults

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Knowledge Management

- **KMGT-01**: Knowledge versioning UI with update history
- **KMGT-02**: Multi-state regulatory support (OR, NV, AZ)
- **KMGT-03**: Custom rule builder UI for analysis rules

## Out of Scope

| Feature | Reason |
|---------|--------|
| RAG / vector database | Knowledge base is under 50K tokens total; structured TypeScript files are simpler and type-safe |
| Full standard form document storage | Copyright issues with AIA/ConsensusDocs; store clause patterns only |
| Real-time regulatory monitoring | CA regulations change 1-2x/year; manual updates sufficient for single user |
| AI fine-tuning / model training | Using Claude API -- cannot fine-tune; prompt engineering with knowledge injection is correct approach |
| Automated "safe to sign" verdict | Legal liability; tool identifies risks, does not practice law |
| Contract clause library / precedent search | Not a law firm tool; single-contract analysis focus |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 7 | Complete |
| ARCH-02 | Phase 7 | Complete |
| ARCH-03 | Phase 7 | Complete |
| ARCH-04 | Phase 7 | Complete |
| ARCH-05 | Phase 7 | Complete |
| PROF-01 | Phase 7 | Complete |
| PROF-02 | Phase 7 | Complete |
| PROF-03 | Phase 7 | Complete |
| PROF-04 | Phase 7 | Complete |
| PROF-05 | Phase 7 | Complete |
| PROF-06 | Phase 7 | Complete |
| INTEL-01 | Phase 8 | Complete |
| INTEL-02 | Phase 8 | Complete |
| INTEL-03 | Phase 8 | Complete |
| INTEL-04 | Phase 8 | Complete |
| CAREG-01 | Phase 9 | Complete |
| CAREG-02 | Phase 9 | Complete |
| CAREG-03 | Phase 9 | Complete |
| CAREG-04 | Phase 9 | Complete |
| CAREG-05 | Phase 9 | Complete |
| TRADE-01 | Phase 10 | Complete |
| TRADE-02 | Phase 10 | Complete |
| TRADE-03 | Phase 10 | Complete |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation*
