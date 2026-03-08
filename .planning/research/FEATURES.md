# Feature Landscape: v1.1 Domain Intelligence

**Domain:** Domain-specific knowledge system for glazing subcontract AI analysis
**Researched:** 2026-03-08
**Scope:** NEW features only -- v1.0 analysis engine (16 passes, clause quoting, severity, categories) already shipped

## Table Stakes

Features the user expects from a "domain intelligence" upgrade. Without these, injecting knowledge is theater -- the AI still guesses about things it should know.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Company profile data entry (Settings UI) | User must input actual insurance limits, bonding capacity, license info so AI can compare against contract requirements | Medium | Existing Settings page (currently placeholder toggles + fake stats) | Form with localStorage persistence. Fields: GL limit, umbrella, auto, WC, bond capacity, C-17 license, DIR registration, employee count, geographic service area, typical project size range |
| Insurance requirement comparison | Insurance pass already extracts required limits -- comparing against actual company limits is the obvious next step | Low | Company profile + existing Insurance pass output | When contract requires $2M GL and company carries $1M, flag as Critical with specific gap. Currently AI guesses "isAboveStandard" without knowing the company's actual limits |
| Bonding capacity check | Contract bonding requirements vs company capacity is pass/fail | Low | Company profile + existing Financial Terms findings | Flag when required bond exceeds capacity. Direct bid/no-bid signal |
| CA mechanics lien law knowledge | Lien rights pass exists but lacks CA-specific statutory deadlines and enforceability rules | Medium | Existing Lien Rights pass | Inject CA Civil Code 8000-9566: 20-day prelim notice, 90-day recording (30 after NOC for subs), 90-day foreclosure. Flag contracts attempting to waive statutory lien rights (unenforceable in CA) |
| Prevailing wage / DIR knowledge | Labor compliance pass exists but needs CA-specific triggers for public works detection | Medium | Existing Labor Compliance pass | Detect public works (agency owner, funding source mentions) and activate: DIR registration check, CPR requirements, apprenticeship >$30K threshold, penalty exposure ($200/day/worker) |
| Per-pass selective knowledge loading | Each pass receives only its relevant knowledge -- not everything dumped into every prompt | Medium | All knowledge modules + existing pass architecture in api/analyze.ts | Insurance pass gets company insurance data. Lien pass gets CA lien law. Scope pass gets Division 08 knowledge. Critical for token budget |
| False positive filtering via company capabilities | Stop flagging things the company already handles | Low-Medium | Company profile + completed analysis findings | If company has $2M GL and contract requires $1M, downgrade from High to Info. Post-processing filter after all passes complete |

## Differentiators

Features that make ClearContract a genuine glazing contract expert, not just a generic contract reviewer with a glazing prompt. These separate it from Document Crunch and general-purpose tools.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Bid/no-bid signal aggregation | Synthesize all findings into explicit bid/no-bid recommendation with weighted factors: bonding gap, insurance gap, scope beyond C-17, payment risk, geographic distance | Medium | Company profile + all analysis passes complete | Post-analysis synthesis. Show as prominent widget on review page. Factors: (1) bonding exceeds capacity, (2) insurance gap >50% of limit, (3) scope includes non-C-17 work, (4) pay-if-paid present, (5) LD uncapped, (6) retainage >10% |
| Contract standard recognition (AIA/ConsensusDocs/EJCDC) | Detect base standard form and flag deviations. Deviations from standard = intentional risk shifting by the GC | Medium-High | Risk overview pass or new pass | AIA A401 uses Articles 1-15 with specific numbering. ConsensusDocs 750 has different indemnification defaults (mutual vs broad). EJCDC has engineer-centric provisions. Detect form family, flag what was changed |
| Division 08 scope intelligence | Know CSI Division 08 sections (08 44 13 curtain walls, 08 44 16 storefronts, 08 80 00 glazing, 08 51 13 aluminum windows) and flag non-glazing scope pushed to the sub | Medium | Existing Scope of Work pass | Flag when scope references Division 07 (waterproofing), Division 05 (structural steel), Division 09 (finishes), Division 22 (plumbing for louvers) being assigned to glazing sub |
| AAMA/ASTM standard reference validation | When contract references AAMA 501, 503, ASTM E2190 etc., validate standards are current and applicable | Medium | Existing Scope/Technical Standards passes | Maintain lookup of key standards with current versions. AAMA merged into FGIA. Flag obsolete references. Key standards: AAMA 501 (water testing), AAMA 503 (field testing), ASTM E2190 (IG unit durability), ASTM E1300 (glass load design) |
| Title 24 energy code awareness | Detect Title 24 Part 6 references and flag climate-zone-specific glazing requirements that affect material costs | Medium | Scope/Technical Standards passes | 2025 Title 24 (effective Jan 2026) changed to climate-zone-specific U-factor/SHGC. Contract may reference old standards. Flag climate zone mismatch if project location is known |
| Cal/OSHA safety requirement detection | Cross-reference safety obligations with Cal/OSHA Title 8 for glazing: fall protection, glass handling, scaffolding | Low-Medium | Existing Labor Compliance pass | Relevant for curtain wall work at height. Flag contracts shifting employer OSHA compliance burden inappropriately. Cal/OSHA Articles 5, 6, 24 for fall protection |
| Severity recalibration with domain rules | Override AI-judged severity with deterministic CA-specific legal rules | Medium | All knowledge modules + existing severity weights | Pay-if-paid in CA = always Critical (void per Civil Code 8814). Broad-form indemnity = always Critical (void per Civil Code 2782). Lien waiver before payment = always Critical (void). These override AI judgment with statutory certainty |
| Knowledge versioning with effective dates | Each knowledge module displays version and currency date in Settings | Low | All knowledge modules exist | "CA Lien Law: current as of 2026-03-08". "AAMA Standards: current as of 2026-01-15". Builds trust, signals when updates needed |

## Anti-Features

Features to explicitly NOT build. Each is tempting but wrong for this product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| RAG with vector database | Single user, reference data changes quarterly. This is structured reference data, not a retrieval problem. Vector DB adds infrastructure complexity (embeddings, indexing, similarity search) for data that fits in 2K tokens per pass | Hardcode domain knowledge as TypeScript objects imported directly into pass definitions. Version-controlled, type-safe, zero infrastructure |
| Full standard form document storage | Copyright issues with AIA/ConsensusDocs forms. Cannot legally embed full document text | Store clause patterns and structural signatures for detection (article numbering, section structure, key phrase patterns), not full document text |
| Real-time regulatory monitoring | CA regulations change 1-2x/year. Building a monitoring pipeline for a single user is massive over-engineering | Manual knowledge updates with version dates visible in Settings. Developer updates modules when regulations change |
| Multi-state regulatory support | User operates exclusively in California. Adding other states bloats every prompt with unused knowledge | CA-only knowledge modules. If expansion needed, make modules state-scoped but only implement CA |
| Custom rule builder UI | Single user, rules change rarely. A drag-and-drop rule editor is weeks of work for something that changes quarterly | Domain rules live in TypeScript code. Developer updates them. Settings UI is for company data that the user changes (insurance, bonding), not analysis rules |
| AI fine-tuning or model training | Using Claude API -- cannot fine-tune third-party models. And knowledge injection via prompts is more maintainable | Prompt engineering with structured knowledge. This is the correct architecture for API-based LLM usage |
| Automated "safe to sign" verdict | Legal liability. Tool identifies risks, does not practice law | Bid/no-bid is a business signal ("this contract has 5 deal-breaker terms for your company profile"), not legal advice |
| Contract clause library / precedent search | Not a law firm tool. User reviews one contract at a time | Focus on single-contract analysis enhanced with domain knowledge |

## Feature Dependencies

```
Company Profile UI (Settings)
  |
  +-> Insurance Comparison (needs company GL/umbrella/auto/WC limits)
  |
  +-> Bonding Capacity Check (needs company bond limit)
  |
  +-> False Positive Filtering (needs company capabilities to downgrade)
  |
  +-> Bid/No-Bid Signals (needs all company thresholds)
  |
  +-> Geographic Reach Check (needs service area definition)

Knowledge Architecture (module system + per-pass loader)
  |
  +-> Per-Pass Selective Loading (infrastructure for all knowledge injection)
  |
  +-> CA Regulatory Knowledge
  |     +-> Lien Law Module -> injected into Lien Rights pass
  |     +-> Prevailing Wage Module -> injected into Labor Compliance pass
  |     +-> Title 24 Module -> injected into Scope/Technical passes
  |     +-> Cal/OSHA Module -> injected into Labor Compliance pass
  |     +-> CA Contract Law (CC 2782, 8814) -> injected into relevant legal passes
  |
  +-> Contract Standards Knowledge
  |     +-> AIA/ConsensusDocs/EJCDC patterns -> injected into Risk Overview pass
  |
  +-> Trade Knowledge
  |     +-> Division 08 Specs -> injected into Scope of Work pass
  |     +-> AAMA/ASTM Standards -> injected into Technical Standards / Scope passes
  |
  +-> Domain Severity Rules -> post-analysis recalibration (no prompt injection)

Existing 16-Pass Analysis Engine (already built, v1.0)
  |
  +-> System prompt augmentation points (knowledge injected here)
  |
  +-> Post-analysis processing pipeline
        +-> False positive filter (compare findings vs company profile)
        +-> Severity recalibration (apply domain rules)
        +-> Bid/no-bid synthesis (aggregate signals)
```

## MVP Recommendation

### Phase 1: Foundation (build first, everything depends on it)

1. **Knowledge architecture + module system** -- TypeScript interfaces for knowledge modules. Each module declares which passes consume it (`passTargets: string[]`). A loader function takes a pass name and returns the relevant knowledge snippets. This is scaffolding.

2. **Company profile Settings UI** -- Replace the placeholder Settings page. Data entry for: GL limit ($), umbrella limit ($), auto limit ($), WC status (yes/no), bonding capacity ($), C-17 license number, DIR registration (yes/no + number), employee count, typical project size range (min/max $), geographic service area (counties/radius). Persist to localStorage. Load into analysis request payload.

3. **Per-pass selective knowledge loading** -- Modify `api/analyze.ts` pass runner to accept optional knowledge context. Each pass's system prompt gets a `## Domain Knowledge` section appended with relevant module data. Token budget: max ~2K additional tokens per pass.

### Phase 2: Company-Specific Intelligence (highest user value, fastest payoff)

4. **Insurance comparison** -- Post-processing: compare InsuranceCoverageItem[] from insurance pass against company profile limits. Replace `isAboveStandard` guesswork with calculated gaps. Transform findings: "Contract requires $2M GL; your current limit is $1M. Gap: $1M."

5. **Bonding capacity check** -- Post-processing: extract bond requirement from financial findings, compare against company profile. Binary flag.

6. **False positive filtering** -- Post-processing pass over all findings. Rules: if company meets/exceeds requirement, downgrade severity (High->Info). If company has DIR registration and contract requires it, downgrade from Medium->Info.

7. **Bid/no-bid signal aggregation** -- Post-analysis synthesis widget. Weighted scoring: insurance gap (weight 3), bonding gap (weight 5 -- deal-breaker), scope beyond C-17 (weight 4), pay-if-paid present (weight 3), uncapped LD (weight 3), retainage >10% (weight 2). Display as green/yellow/red recommendation.

### Phase 3: CA Regulatory Knowledge (legal precision)

8. **CA lien law module** -- Knowledge injected into Lien Rights pass. Data: preliminary notice 20-day requirement, 90-day recording deadline (30 days after NOC for subs), 90-day foreclosure deadline, unconditional vs conditional waivers (CC 8132-8138), anti-waiver provisions.

9. **Prevailing wage / DIR module** -- Knowledge injected into Labor Compliance pass. Public works detection rules, DIR registration verification, CPR obligations, apprenticeship threshold ($30K+), penalty structure ($200/day/worker underpaid).

10. **CA contract law severity rules** -- Post-processing severity overrides. Pay-if-paid = Critical (void per CC 8814). Broad-form indemnity = Critical (void per CC 2782 for construction). Lien waiver before payment = Critical (void per CC 8122). Contractual limitation on mechanics lien = Critical (unenforceable).

11. **Title 24 + Cal/OSHA modules** -- Lower priority regulatory knowledge. Title 24 climate-zone glazing requirements. Cal/OSHA fall protection thresholds for glazing at height.

### Phase 4: Industry & Trade Knowledge (expertise depth)

12. **Division 08 scope intelligence** -- Inject CSI section knowledge into Scope of Work pass. Flag non-08 scope assigned to glazing sub.

13. **AAMA/ASTM standard validation** -- Reference table of current standards with versions. Flag obsolete or superseded references.

14. **Contract standard recognition** -- Detect AIA A401, ConsensusDocs 750, EJCDC base forms by structural patterns. Flag deviations from standard form defaults.

### Defer

- **Knowledge versioning UI**: Add after modules exist. Simple version strings in Settings.
- **Contract standard recognition**: Most knowledge-encoding effort. Build after simpler modules prove the architecture.

## Complexity Budget

| Feature Group | Effort | Token Impact per Pass | Risk Level |
|---------------|--------|----------------------|------------|
| Knowledge architecture + module system | 1-2 days | None (infrastructure) | Low |
| Company profile Settings UI | 1-2 days | None (client-side) | Low |
| Per-pass selective loading | 1 day | +500-2000 tokens | Medium -- context limits |
| Insurance/bonding comparison | 0.5 days | +200 tokens on insurance pass | Low |
| False positive filter | 1 day | None (post-processing) | Low |
| Bid/no-bid signals | 1 day | None (post-processing) | Low |
| CA lien law module | 1 day | +800 tokens on lien pass | Low |
| Prevailing wage module | 1 day | +600 tokens on labor pass | Low |
| CA severity rules | 1 day | None (post-processing) | Medium -- must not break scores |
| Title 24 + Cal/OSHA | 1 day | +400 tokens on relevant passes | Low |
| Division 08 / AAMA / ASTM | 1-2 days | +500-800 tokens on scope passes | Low |
| Contract standard recognition | 2-3 days | +1000 tokens on overview pass | Medium-High |

**Total: ~13-17 days**

## Key Design Decisions

### Knowledge as Code, Not Database

Domain knowledge lives as TypeScript objects, not a database or JSON files fetched at runtime.

- Single user, reference data changes quarterly at most
- Type safety catches knowledge structure errors at compile time
- No infrastructure overhead (no DB, no embeddings, no similarity search)
- Version-controlled with the codebase -- git diff shows exactly what changed
- Modules import directly, zero I/O at runtime

### Two Mechanisms: Prompt Injection vs Post-Processing

| Mechanism | When to Use | Examples | Token Cost |
|-----------|-------------|----------|------------|
| Prompt injection | AI needs knowledge during reasoning | CA lien deadlines, Division 08 sections, AAMA standards, prevailing wage triggers | Yes (+500-2K per pass) |
| Post-processing | Mechanical comparison, no reasoning needed | Insurance gap calculation, severity override for void clauses, bid/no-bid scoring | None |

Use both. Prompt injection for knowledge the AI reasons about. Post-processing for deterministic comparisons.

### Token Budget Constraint

Current system prompts: ~300-500 tokens each. Adding knowledge must stay under 2,000 additional tokens per pass. At 16 passes with selective loading (not all passes get knowledge), total additional tokens: ~8-15K across all passes. Well within Claude's context window and manageable for API cost.

### Settings UI: Company Data Only

The Settings page collects data that changes (insurance renewed annually, bonding capacity changes with revenue, employee count fluctuates). Analysis rules do NOT go in Settings -- they are code. The user updates their company profile; the developer updates domain knowledge.

## Sources

- [Document Crunch Platform](https://www.documentcrunch.com/platform) -- competitor feature set, construction-specific AI knowledge base approach
- [MDPI: Automated Construction Contract Review Framework with LLM + Domain Knowledge](https://www.mdpi.com/2075-5309/15/6/923) -- structured knowledge-integrated RAG approach for construction contracts
- [CA Mechanics Lien Deadlines](https://cnslien.com/2025/03/19/california-mechanics-lien-deadlines-what-you-need-to-know/) -- 20-day prelim, 90-day recording, 30-day post-NOC for subs
- [CA DIR Prevailing Wage](https://www.dir.ca.gov/public-works/prevailing-wage.html) -- public works >$1K threshold, CPR requirements, apprenticeship rules
- [CSLB C-17 Glazing License](https://www.cslb.ca.gov/about_us/library/licensing_classifications/Licensing_Classifications_Detail.aspx?Class=C17) -- license scope definition, $500 threshold
- [CSLB Bond Requirements](https://www.cslb.ca.gov/contractors/maintain_license/bond_information/bond_requirements.aspx) -- $25K contractor's bond
- [AIA A401 vs ConsensusDocs 750 Comparison](https://www.sackstierney.com/blog/compare-and-contrast-the-aia-a-401-and-the-consensusdocs-750-forms-of-subcontract/) -- structural differences between standard subcontract forms
- [CA Title 24 2025 Energy Code](https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards/2025-building-energy-efficiency) -- climate-zone-specific glazing U-factor/SHGC requirements effective Jan 2026
- [AAMA IPCB-08 Commercial Installation Standard](https://store.fgiaonline.org/AAMA-IPCB-08/) -- commercial building window/door installation practices
- [Division 08 Entrances, Storefronts & Curtain Walls Spec](https://constructionpublicinfo.ua.edu/wp-content/uploads/Design-Guidelines/Section-III/Division-08-Openings/08-40-00-Entrances-Storefronts-and-Curtain-Walls.pdf) -- CSI section structure for glazing
- [ConstructConnect Bid/No-Bid Decision Factors](https://www.constructconnect.com/blog/key-factors-consider-bidno-bid-decision-making) -- critical factors: client payment ability, scope clarity, cash flow, labor availability
- [Cal/OSHA Fall Protection in Construction](https://www.dir.ca.gov/dosh/dosh_publications/Fall-Protection-in-Construction-fs.pdf) -- fall protection requirements for construction
- [Workyard: California Prevailing Wage Guide 2025](https://www.workyard.com/us-labor-laws/prevailing-wage-california) -- detailed CA prevailing wage rules and penalties

---
*Feature research for: v1.1 Domain Intelligence Knowledge System*
*Researched: 2026-03-08*
*Supersedes: 2026-03-02 v1.0 feature research (all v1.0 features now shipped)*
