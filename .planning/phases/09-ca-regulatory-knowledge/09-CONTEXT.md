# Phase 9: CA Regulatory Knowledge - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Create California-specific regulatory knowledge modules that get injected into analysis passes via the existing knowledge architecture (Phase 7). Transforms generic legal findings into CA-specific analysis with correct statute references and legally-mandated severity levels. No new infrastructure — this phase creates content modules and a post-processing severity guard. No UI changes.

</domain>

<decisions>
## Implementation Decisions

### Module granularity
- 4 separate knowledge modules in `src/knowledge/regulatory/`:
  - `ca-lien-law.ts` — CA mechanics lien law + CC 8814 (pay-if-paid void) + CC 8122 (pre-payment lien waiver void) + CC 2782 (broad-form indemnity void)
  - `ca-prevailing-wage.ts` — DIR/prevailing wage, CPR, apprenticeship thresholds, penalties
  - `ca-title24.ts` — Title 24 energy code glazing requirements (U-factor, SHGC by climate zone, fenestration limits)
  - `ca-calosha.ts` — Cal/OSHA glazing-specific hazards (fall protection, glass handling, scaffold, overhead work)
- Each module under 1,500 token cap
- Void-by-law statutes (CC 8814, CC 2782, CC 8122) embedded in topic modules, not a separate contract-law module

### Pass mapping (1:many allowed)
- `ca-lien-law` → `legal-lien-rights`, `legal-indemnification`, `legal-payment-contingency` (CC 2782 indemnity + CC 8814 payment need to reach those passes)
- `ca-prevailing-wage` → `labor-compliance`
- `ca-title24` → `scope-of-work` only
- `ca-calosha` → `labor-compliance` only
- Modules may map to multiple passes where the content is relevant; max 4 modules per pass still enforced

### Severity override mechanism
- **Prompt + post-processing guard (belt and suspenders)**
- Knowledge module content instructs Claude to flag void-by-law clauses as Critical with statute citation
- Post-processing guard in server code scans findings for statute references (CC 8814, CC 2782, CC 8122) — if found and severity isn't Critical, silently upgrade to Critical
- Guard triggers on statute reference string matching in finding clauseText or explanation — not keyword/category matching
- **No annotation on upgrade** — silent enforcement, no `upgradedFrom` field (unlike Phase 8 downgrades)
- **Display only** — upgraded severity shows as Critical badge, but original severity weight used for risk score calculation (avoids score inflation from post-processing)

### Public works detection
- AI detection within the labor compliance pass — no separate detection step
- ca-prevailing-wage module instructs Claude: first determine if public works (government entity, public funding, public building), then apply prevailing wage rules if yes
- If contract is NOT public works, prevailing wage findings are skipped entirely — no Info-level note

### Title 24 content depth
- Glazing-specific requirements: U-factor and SHGC by climate zone, fenestration area limits, current code cycle references
- Helps flag when contracts reference outdated code cycles (e.g., 2019 vs 2022 Title 24 Part 6)

### Cal/OSHA content depth
- Glazing-specific hazards: fall protection (Title 8 §3210+), glass handling safety, overhead work, scaffold requirements
- Flag when contracts shift OSHA responsibility to sub without adequate provisions
- Specific Title 8 section references included

### Lien law content depth
- Specific CA deadlines: 20-day preliminary notice, 90-day recording for direct contractors, 60-day for subs
- Stop notice procedures
- Anti-waiver provisions (CC 8122)
- Current penalty amounts with effective date; reviewByDate metadata flags when to re-verify

### Prevailing wage content depth
- Current penalty amounts with effective date (e.g., $200/day per worker for CPR violations)
- DIR registration requirements, apprenticeship thresholds
- reviewByDate metadata for re-verification

### Claude's Discretion
- Exact content wording within each knowledge module (within the constraints above)
- Token optimization — how to pack maximum useful info under 1,500 tokens per module
- Which specific Title 8 sections to reference for Cal/OSHA
- Climate zone groupings for Title 24 (individual zones vs zone ranges)
- Post-processing guard implementation details (where in api/analyze.ts, exact regex patterns)

</decisions>

<specifics>
## Specific Ideas

- Statute references should be exact (CC 8814, CC 2782, CC 8122, Title 8 §3210) — these are what the post-processing guard matches on
- Penalty amounts are real and current — this tool is used for actual contract review, not demo purposes
- The lien law module does triple duty: maps to lien-rights, indemnification, AND payment-contingency passes
- The prevailing wage module should make Claude smart enough to detect public works on its own from contract language (entity names, funding sources, etc.)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KnowledgeModule` type in `src/knowledge/types.ts`: id, domain, title, effectiveDate, reviewByDate, content, tokenEstimate
- `registerModule()` in `src/knowledge/registry.ts`: Registers modules in Map-based store
- `PASS_KNOWLEDGE_MAP` in `src/knowledge/registry.ts`: All 16 passes with empty arrays — ready to populate
- `composeSystemPrompt()` in `src/knowledge/index.ts`: Already composes base + knowledge + profile
- `validateTokenBudget()` in `src/knowledge/tokenBudget.ts`: Enforces 1,500 token cap per module, max 4 per pass
- `src/knowledge/regulatory/` directory exists but is empty — ready for modules

### Established Patterns
- Knowledge modules are TypeScript files exporting `KnowledgeModule` objects
- Central registry with `registerModule()` called at module load
- `PASS_KNOWLEDGE_MAP` maps pass names to module ID arrays
- `composeSystemPrompt()` appends `## Domain Knowledge` section with module content
- Deterministic risk score uses `SEVERITY_WEIGHTS`: Critical=25, High=15, Medium=8, Low=3, Info=0
- `downgradedFrom` field on findings for Phase 8 severity downgrades — post-processing guard does NOT add `upgradedFrom`

### Integration Points
- `src/knowledge/registry.ts` PASS_KNOWLEDGE_MAP — populate with module IDs for mapped passes
- `api/analyze.ts` — add post-processing severity guard after structured output parsing, before risk score calculation
- `src/knowledge/regulatory/` — create 4 new TypeScript module files
- Module registration — modules must call `registerModule()` (or be imported and registered in index.ts)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-ca-regulatory-knowledge*
*Context gathered: 2026-03-09*
