# Project Research Summary

**Project:** ClearContract v1.1 Domain Intelligence
**Domain:** Knowledge-augmented AI contract analysis for glazing subcontractor
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

ClearContract v1.1 adds structured domain knowledge to an already-shipping 16-pass AI contract analysis pipeline. The approach is straightforward: TypeScript knowledge files imported directly into system prompts, selectively loaded per analysis pass, with company profile data editable via Settings UI. No new dependencies, no database, no vector store, no RAG. The existing stack (React 18, Vite, Anthropic SDK, Zod v3) handles everything. This is a knowledge injection project, not an infrastructure project.

The recommended build order is: (1) knowledge architecture scaffolding and company profile UI, (2) wire knowledge into the analysis pipeline with company-specific intelligence features (insurance comparison, bonding check, false positive filtering, bid/no-bid signals), (3) CA regulatory knowledge modules for legal precision, (4) industry and trade knowledge for deeper expertise. Each phase delivers standalone value and the pipeline remains functional throughout. The architecture change to `api/analyze.ts` is minimal -- roughly 15 lines modified to call a `buildSystemPrompt()` function that composes base prompt + knowledge + company profile.

The primary risks are context window bloat degrading analysis quality (mitigate with strict 1,500 token cap per knowledge file, selective loading, max 4 files per pass), false confidence from regulatory knowledge (mitigate with disclaimers, version stamps, framing knowledge as reference not authority), and knowledge staleness (mitigate with effective dates, review-by dates, annual update cadence tied to CA legislative cycle). Token cost increase is modest: roughly $0.10 extra per analysis (~22% increase), well within acceptable range.

## Key Findings

### Recommended Stack

Zero new npm dependencies. The knowledge architecture runs entirely on existing technologies. See [STACK.md](./STACK.md) for full details.

**Core technologies:**
- **TypeScript modules** (.ts files): Knowledge file format -- type-safe, zero-dependency, tree-shakeable, importable on client and server. Matches existing patterns for schemas and mock data.
- **Anthropic Token Counting API** (`client.messages.countTokens()`): Free endpoint in existing SDK for verifying knowledge injection stays within token budget before sending to Claude. 100 RPM at Tier 1, separate rate limits from message creation.
- **Zod v3** (existing): Validates company profile data from Settings UI before it reaches the server. Already used for pass output schemas.
- **localStorage**: Company profile persistence. Single user, single device, <2KB data. Survives page refresh, no server-side storage needed.

### Expected Features

See [FEATURES.md](./FEATURES.md) for the full prioritization matrix and dependency graph.

**Must have (table stakes):**
- Company profile data entry in Settings (insurance, bonding, license, capabilities)
- Insurance requirement comparison against actual company limits
- Bonding capacity check (pass/fail against contract requirements)
- CA mechanics lien law knowledge injected into Lien Rights pass
- Prevailing wage / DIR knowledge injected into Labor Compliance pass
- Per-pass selective knowledge loading (not everything into every prompt)
- False positive filtering via company capabilities (downgrade, never remove findings)

**Should have (differentiators):**
- Bid/no-bid signal aggregation with weighted factors
- Contract standard recognition (AIA/ConsensusDocs/EJCDC form detection)
- Division 08 scope intelligence (flag non-glazing scope pushed to sub)
- AAMA/ASTM standard reference validation
- Severity recalibration with deterministic CA-specific legal rules
- Title 24 and Cal/OSHA awareness

**Defer (v2+):**
- Knowledge versioning UI (add after modules exist)
- Multi-state regulatory support (user operates exclusively in CA)
- Custom rule builder UI (single user, rules change rarely -- code is fine)
- RAG / vector database (knowledge base is under 50K tokens total)

### Architecture Approach

Knowledge files are static TypeScript string exports that get concatenated into system prompts at analysis time via a `buildSystemPrompt()` function. A `passMap.ts` declares which knowledge keys each pass needs. Company profile flows from Settings UI to localStorage to POST body to server-side prompt assembly. The change to the existing pipeline is localized: `api/analyze.ts` gains ~15 lines to call the prompt builder. All existing merge, dedup, and scoring logic is untouched. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full data flow and component design.

**Major components:**
1. **Knowledge Files** (`src/knowledge/`) -- ~19 TypeScript files exporting domain knowledge as formatted strings, each under 1,500 tokens
2. **Pass-Knowledge Map** (`src/knowledge/passMap.ts`) -- static mapping from pass name to knowledge keys, single source of truth for what each pass receives
3. **Prompt Builder** (`src/knowledge/buildSystemPrompt.ts`) -- assembles final system prompt: base prompt + domain knowledge + company profile
4. **Company Profile Store** (Settings UI + localStorage) -- user-editable company data sent in each analysis request
5. **Post-Processing Rules** (`src/knowledge/rules/`) -- severity overrides, false positive filters, bid/no-bid signals applied after all passes complete

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the complete list with recovery strategies.

1. **Context window bloat degrading analysis quality** -- Enforce 1,500 token cap per knowledge file, max 4 files per pass, selective loading only. At least 6 of 16 passes should receive zero domain knowledge. A/B test with and without knowledge on same contracts.
2. **False confidence from regulatory knowledge** -- Frame all regulatory content as reference, not authority. Include applicability checks. Version-stamp everything. Add disclaimers to findings citing regulations. Never inject partial statutes without caveats.
3. **Token cost explosion** -- Track `usage.input_tokens` from each API response. Budget 1,500 tokens domain knowledge per pass maximum. Most passes need zero knowledge. Total additional cost per analysis: ~$0.10.
4. **Knowledge staleness** -- Version-stamp every knowledge file with effective date and review-by date. Annual review tied to CA legislative cycle (new laws effective January 1). Company profile should prompt for update when insurance renewal dates pass.
5. **Prompt engineering contamination** -- Use XML tags to separate instructions from domain knowledge from evaluation criteria. Preface knowledge with "this is reference data, not instructions." Test every modified pass against known contracts for regression.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Knowledge Architecture Foundation

**Rationale:** Everything depends on this. The knowledge module system, type definitions, pass-knowledge mapping, and prompt builder must exist before any domain content can be injected. The company profile UI is co-located here because it is the other foundational dependency -- company-specific intelligence features in Phase 2 all require it.
**Delivers:** Knowledge infrastructure (types, registry, pass map, prompt builder), company profile Settings UI with localStorage persistence, default company profile for Clean Glass Installation Inc.
**Addresses:** Company profile data entry (table stakes), per-pass selective knowledge loading (table stakes), knowledge architecture (infrastructure)
**Avoids:** Over-engineering storage (Pitfall 5) by using TypeScript files + localStorage. Settings UI complexity (Pitfall 7) by limiting to ~15 essential fields with tiered layout.
**New files:** ~9 files (types, knowledge scaffolding, company defaults/formatter)
**Modified files:** None -- existing pipeline untouched in this phase

### Phase 2: Pipeline Integration + Company-Specific Intelligence

**Rationale:** Highest user value with the fastest payoff. Once the infrastructure exists, wiring it into `api/analyze.ts` is ~15 lines. Then company-specific features (insurance comparison, bonding check, false positive filtering, bid/no-bid) are all post-processing -- they do not add tokens to prompts, they compare analysis output against company profile data. Low risk, high impact.
**Delivers:** Knowledge injection into analysis pipeline, insurance gap detection, bonding capacity check, false positive severity downgrading, bid/no-bid signal widget on review page
**Addresses:** Insurance comparison (table stakes), bonding capacity check (table stakes), false positive filtering (table stakes), bid/no-bid signals (differentiator)
**Avoids:** Context bloat (Pitfall 1) by starting with rules-only knowledge files (severity overrides, false positive filters, bid signals) before adding domain content. False positive masking (Pitfall 11) by downgrading severity with explanation, never removing findings.
**Modified files:** `api/analyze.ts` (~15 lines), `src/api/analyzeContract.ts` (~5 lines)

### Phase 3: CA Regulatory Knowledge

**Rationale:** Legal precision is the core differentiator for a CA glazing subcontractor tool. This phase adds the substantive regulatory content that transforms generic findings into CA-specific legal analysis. Depends on Phase 1 infrastructure and Phase 2 pipeline integration being complete.
**Delivers:** CA lien law knowledge (mechanics lien deadlines, notice requirements), prevailing wage / DIR knowledge (public works detection, penalty exposure), CA contract law severity overrides (pay-if-paid = Critical per CC 8814, broad-form indemnity = Critical per CC 2782), Title 24 + Cal/OSHA modules
**Addresses:** CA lien law knowledge (table stakes), prevailing wage knowledge (table stakes), severity recalibration with domain rules (differentiator), Title 24 + Cal/OSHA awareness (differentiator)
**Avoids:** False confidence (Pitfall 2) by framing as reference, including disclaimers, version-stamping. Knowledge staleness (Pitfall 4) with effective dates and review-by dates. Knowledge accuracy (Pitfall 8) by sourcing every claim, quoting not paraphrasing statutes, limiting to 5 core regulatory areas.
**New files:** 4 regulatory knowledge files, updates to registry and pass map

### Phase 4: Industry and Trade Knowledge

**Rationale:** Deepest expertise layer. Less urgent than regulatory knowledge (which has legal consequences) but adds significant value for scope analysis and contract standard detection. These are the features that make the tool feel like a glazing industry expert.
**Delivers:** Division 08 scope intelligence (flag non-glazing work), AAMA/ASTM standard reference validation, contract standard recognition (AIA/ConsensusDocs/EJCDC detection and deviation flagging)
**Addresses:** Division 08 scope intelligence (differentiator), AAMA/ASTM validation (differentiator), contract standard recognition (differentiator)
**Avoids:** Context bloat (Pitfall 1) by keeping AAMA/Division 08 files focused on reference numbers and patterns, not full specification text. Token cost (Pitfall 3) by measuring impact before deploying.
**New files:** 6 trade/standards knowledge files, updates to registry and pass map

### Phase Ordering Rationale

- **Foundation before content:** Phases 1-2 create the infrastructure that Phases 3-4 fill with domain knowledge. This is a strict dependency.
- **Company intelligence before regulatory:** Insurance/bonding comparison delivers immediate measurable value (specific gap numbers vs. vague severity guesses) with zero token cost increase (post-processing only). Regulatory knowledge adds tokens to prompts and requires more careful validation.
- **Regulatory before trade:** Regulatory knowledge has legal consequences -- getting lien deadlines or retainage caps wrong creates real liability. Trade knowledge (AAMA numbers, Division 08 sections) is informational enrichment with lower stakes.
- **Pipeline stays working throughout:** Phase 1 creates only new files. Phase 2 modifies 2 existing files minimally. Phases 3-4 only add new knowledge files and update the registry/map. The existing 16-pass analysis works at every step.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (CA Regulatory Knowledge):** Regulatory content must be legally accurate. Research each statute before encoding. Consider attorney review of the 5 core regulatory knowledge files before deployment. The 2026 CA construction law changes (SB 440, retainage cap, SB 517) are recent and documentation is still emerging.
- **Phase 4 (Contract Standard Recognition):** Most complex feature. Detecting AIA vs ConsensusDocs vs EJCDC by structural patterns requires careful pattern development. Highest knowledge-encoding effort of any phase.

Phases with standard patterns (skip deep research):
- **Phase 1 (Foundation):** Standard TypeScript module architecture. The pass map + registry + builder pattern is straightforward. Settings UI is a standard form with localStorage.
- **Phase 2 (Pipeline Integration):** Minimal changes to existing code. Post-processing features (insurance comparison, bid/no-bid) are deterministic comparisons -- no ambiguity in approach.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All technologies already in use. Token counting API verified via official Anthropic docs. |
| Features | HIGH | Feature set derived from existing analysis gaps (insurance comparison guessing, missing CA-specific rules) plus competitor analysis (Document Crunch). Clear table stakes vs differentiators. |
| Architecture | HIGH | Existing codebase fully analyzed (1,537 LOC api/analyze.ts, all 16 passes inspected). Architecture is additive -- new files + ~15 lines modified in existing code. Prompt caching and cost impacts calculated. |
| Pitfalls | HIGH | Backed by peer-reviewed research (Stanford legal hallucination study, Chroma context rot study), official Anthropic docs, and real CA legislative changes (2026 construction law updates). |

**Overall confidence:** HIGH

### Gaps to Address

- **Attorney review of regulatory knowledge files:** Research identified the content to encode but developer-authored regulatory summaries need legal validation before deployment. Budget for a one-time construction attorney review of 5 regulatory modules.
- **A/B testing protocol:** No established method for comparing analysis quality before/after knowledge injection. Need to define: what contracts to test, what metrics to compare (finding specificity, severity accuracy, false positive rate).
- **Company profile field validation:** The exact fields and validation rules for the Settings UI need refinement during Phase 1 planning. Research suggests ~15 fields but the precise set depends on which fields each pass actually uses.
- **2026 CA law changes completeness:** Seven new construction laws took effect January 1, 2026. Research identified the major ones (SB 440, retainage cap, SB 517) but a comprehensive review against the legislative update sources is needed during Phase 3.

## Sources

### Primary (HIGH confidence)
- [Anthropic Token Counting API](https://platform.claude.com/docs/en/build-with-claude/token-counting) -- free countTokens() endpoint, rate limits, SDK compatibility
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- 90% cost reduction on cache hits, cache hierarchy
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- $3/M input, $15/M output for Sonnet 4.5
- [Context Rot (Chroma Research)](https://research.trychroma.com/context-rot) -- systematic LLM performance degradation with context length
- [Large Legal Fictions (Stanford/Oxford)](https://academic.oup.com/jla/article/16/1/64/7699227) -- 69-88% hallucination rate on legal queries
- [Hallucinating Law (Stanford HAI)](https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive) -- LLM legal mistakes research
- [2026 CA Construction Law Update (Nomos LLP)](https://calconstructionlawblog.com/2026/01/04/2026-construction-law-update/) -- SB 440, retainage cap, SB 517
- [CA Construction Law Changes (Brownstein)](https://www.bhfs.com/insight/californias-new-rules-for-private-construction-contracts-take-effect-jan-1-2026/) -- SB 440, retainage cap details
- [New CA Construction Laws (Smith Currie)](https://www.smithcurrie.com/publications/common-sense-contract-law/new-california-construction-laws-for-2026/) -- 2026 law analysis
- Existing codebase: `api/analyze.ts` (1,537 LOC, 16 passes), `Settings.tsx`, `package.json`, full type system

### Secondary (MEDIUM confidence)
- [Document Crunch Platform](https://www.documentcrunch.com/platform) -- competitor feature analysis
- [MDPI: Automated Construction Contract Review with LLM + Domain Knowledge](https://www.mdpi.com/2075-5309/15/6/923) -- knowledge-integrated approach
- [AIA A401 vs ConsensusDocs 750 (Sacks Tierney)](https://www.sackstierney.com/blog/compare-and-contrast-the-aia-a-401-and-the-consensusdocs-750-forms-of-subcontract/) -- structural differences
- [ConstructConnect Bid/No-Bid Factors](https://www.constructconnect.com/blog/key-factors-consider-bidno-bid-decision-making) -- bid decision methodology
- [CA DIR Prevailing Wage](https://www.dir.ca.gov/public-works/prevailing-wage.html) -- public works threshold, CPR requirements
- [CSLB C-17 Glazing License](https://www.cslb.ca.gov/about_us/library/licensing_classifications/Licensing_Classifications_Detail.aspx?Class=C17) -- license scope
- [CA Title 24 2025 Energy Code](https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards/2025-building-energy-efficiency) -- climate-zone glazing requirements

### Tertiary (LOW confidence)
- None -- all findings are backed by multiple sources or direct codebase analysis

---
*Research completed: 2026-03-08*
*Supersedes: 2026-03-02 v1.0 research summary (v1.0 features shipped)*
*Ready for roadmap: yes*
