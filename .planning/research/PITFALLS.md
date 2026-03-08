# Domain Pitfalls

**Domain:** Adding domain intelligence layers to an existing AI contract analysis pipeline
**Researched:** 2026-03-08
**Applies to:** v1.1 Domain Intelligence milestone for ClearContract

## Critical Pitfalls

### Pitfall 1: Context Window Bloat Killing Analysis Quality

**What goes wrong:**
You inject company profile, CA regulatory data, AAMA standards, AIA clause patterns, and evaluation criteria into every analysis pass's system prompt. Each pass already has a substantial system prompt (300-600 tokens) plus the full PDF document (potentially 100k+ tokens). Adding 2,000-5,000 tokens of domain knowledge per pass pushes the context deeper into the degradation zone. Research from Chroma confirms that every LLM tested shows output quality degradation as context length increases -- no exceptions. Stanford research shows 15-47% performance drops as context grows. The model develops recency bias, attending to the domain knowledge block nearest the end and neglecting contract content or analysis instructions.

**Why it happens:**
The intuition is "more context = better analysis." Developers load everything relevant into the prompt because it seems helpful. But LLMs are not databases -- they are attention-weighted pattern matchers, and attention quality degrades with volume. The existing 16-pass architecture already sends the full PDF 16 times; adding domain knowledge to each pass multiplies the noise.

**Consequences:**
- Findings become generic ("this indemnification clause may be broad") instead of specific ("this is a Type I broad-form indemnification, which California Civil Code Section 2782 makes unenforceable for construction contracts")
- The model starts ignoring parts of the system prompt instructions (especially severity rules and output format constraints) because they are buried under domain knowledge
- Structured output compliance drops -- the model starts producing malformed or incomplete JSON because instruction-following degrades

**Prevention:**
1. **Per-pass selective loading only.** Each pass gets ONLY the domain knowledge relevant to its analysis. The insurance pass gets company insurance limits. The indemnification pass gets CA anti-indemnity statute info. The scope pass gets AAMA standards. No pass gets everything.
2. **Token budget per pass: hard cap of 1,500 tokens of injected domain knowledge.** The system prompt (instructions + domain knowledge) should not exceed 2,500 tokens total. Measure this before deployment.
3. **Put domain knowledge AFTER instructions, BEFORE the user prompt.** Claude processes system prompts linearly -- instructions first establishes the task frame, then domain knowledge provides reference data, then the contract document is the primary input.
4. **Test with and without domain knowledge on the same contract.** If adding knowledge makes findings worse (more generic, less specific to the actual contract language), the knowledge is noise, not signal.

**Detection:**
- A/B test: analyze the same contract with and without domain knowledge injection. Compare finding specificity and clause quote accuracy.
- Monitor structured output parse failures -- an increase after adding domain knowledge means the context is too heavy.
- Check that severity rules are still being followed (the most common casualty of prompt bloat).

---

### Pitfall 2: False Confidence from Domain Knowledge (The Authoritative Hallucination Problem)

**What goes wrong:**
You inject CA regulatory information (e.g., "California Civil Code Section 2782 limits indemnification in construction contracts") into the system prompt. The model now confidently states legal conclusions as if it has verified them against the current statute, even when the injected knowledge is outdated, incomplete, or inapplicable to the specific contract. Stanford research shows LLM hallucination rates of 69-88% for specific legal queries, and crucially, all models show overconfidence regardless of actual accuracy.

Before domain knowledge, the model would say "this indemnification clause may be problematic." After domain knowledge injection, it says "this clause violates California Civil Code Section 2782(a) and is unenforceable" -- which sounds authoritative but may be wrong because: (a) Section 2782 was amended and the injected text reflects the old version, (b) the contract is governed by Nevada law, not California, (c) the specific exception in 2782(d) applies but was not included in the injected knowledge.

**Why it happens:**
LLMs treat injected context as ground truth. When you put regulatory text in the system prompt, the model does not critically evaluate whether it applies -- it assumes you provided it because it is relevant and correct. The model's training on legal corpora reinforces this: it has seen thousands of legal analyses citing statutes, so it pattern-matches the citation style without the underlying legal reasoning about applicability.

**Consequences:**
- User negotiates a contract position based on an AI assertion about California law that is wrong or inapplicable
- The tool becomes more dangerous with domain knowledge than without it, because users trust authoritative-sounding output more
- Legal liability exposure if the user relies on the tool's regulatory assertions

**Prevention:**
1. **Frame all regulatory knowledge as reference, not authority.** Prompt: "The following is reference information about California regulations. Use it to inform your analysis but DO NOT assert legal conclusions. Always caveat regulatory references with 'based on reference data provided -- verify with legal counsel.'"
2. **Include applicability checks in the prompt.** "Before citing any regulation, verify: (a) the contract specifies California as governing law, (b) the regulation applies to the specific contract type (private vs public works), (c) no exceptions in the regulation would change the conclusion."
3. **Never inject partial statutes.** Either include the full relevant section (with exceptions and amendments) or include only a summary with an explicit note: "This is a summary -- the actual statute may contain exceptions not listed here."
4. **Add a `regulatoryDisclaimer` field to findings that cite regulations.** Make it structurally impossible for the output to cite a regulation without an attached disclaimer.
5. **Version-stamp all injected knowledge.** "CA Civil Code Section 2782 (as of January 2026)." This signals to both the model and the user that the information has a shelf life.

**Detection:**
- Review findings that cite specific statutes. Check: Does the contract actually specify CA as governing law? Is the cited statute section correct and current? Are exceptions noted?
- Track user feedback on regulatory findings specifically.

---

### Pitfall 3: Token Cost Explosion from Uncontrolled Knowledge Loading

**What goes wrong:**
The current 16-pass architecture already runs 16 Claude API calls per contract upload. Each call includes the full PDF document. Adding domain knowledge to each pass increases the input token count per call. If you naively load 3,000 tokens of domain knowledge into each of 16 passes, that is 48,000 additional input tokens per analysis. At Claude Sonnet 4.5 pricing ($3/M input tokens), that is $0.144 additional cost per analysis -- a 15-30% cost increase depending on contract length. But the real danger is scope creep: as knowledge bases grow (more regulations, more standards, more company data), the per-analysis cost grows silently.

**Why it happens:**
Knowledge loading happens in the system prompt, which developers rarely audit for token count. Each domain knowledge addition seems small ("just 200 more tokens for AAMA standards"), but they accumulate across 16 passes. Nobody tracks the total token budget across all passes.

**Consequences:**
- Monthly API costs increase 2-5x without corresponding value increase
- Vercel function duration increases (more input tokens = longer inference time), risking timeout regressions
- The cost makes the tool economically impractical for reviewing multiple contracts

**Prevention:**
1. **Establish a token budget: 1,500 tokens of domain knowledge per pass maximum, tracked in code.** Add a constant like `MAX_DOMAIN_KNOWLEDGE_TOKENS = 1500` and measure injected knowledge against it.
2. **Build a knowledge-to-pass mapping matrix.** Document exactly which knowledge each pass receives. Example:

| Pass | Knowledge Loaded | Est. Tokens |
|------|-----------------|-------------|
| legal-indemnification | CA 2782 summary, company insurance limits | ~400 |
| legal-insurance | Company insurance coverage, standard endorsements | ~600 |
| scope-of-work | AAMA standards list, Division 08 specs, company capabilities | ~800 |
| labor-compliance | CA prevailing wage rules, DIR requirements | ~700 |
| risk-overview | Company bid/no-bid thresholds, bonding limits | ~300 |
| dates-deadlines | (none -- no domain knowledge needed) | 0 |

3. **Most passes need zero domain knowledge.** The dates-deadlines pass, verbiage-analysis pass, legal-payment-contingency pass, and several others analyze contract language patterns that do not benefit from domain knowledge injection. Do not inject knowledge "just in case."
4. **Cache token counts.** Log the actual input token count from each API response and alert if any pass exceeds the budget.

**Detection:**
- Monitor `usage.input_tokens` from each API response. Track the trend over time.
- Calculate total cost per analysis and compare to pre-domain-knowledge baseline.
- If any single pass exceeds 1,500 tokens of domain knowledge, it needs splitting or trimming.

---

### Pitfall 4: Knowledge Staleness (Regulations Change, Insurance Renews)

**What goes wrong:**
You hardcode CA regulatory information (lien filing deadlines, prevailing wage thresholds, retainage caps) into knowledge files. Then California passes SB 440 (Private Works Change Order Fair Payment Act, effective January 1, 2026) and SB 517 (subcontractor disclosure requirements). AB 2295 caps private works retainage at 5% across all tiers. Your knowledge files still reflect 2025 law. The tool now gives outdated regulatory guidance that the user relies on.

This is not hypothetical -- California enacted seven significant construction law changes effective January 1, 2026, including the new 5% retainage cap (previously 10% was common), new change order dispute procedures, and expanded prevailing wage requirements for affordable housing projects.

**Why it happens:**
Regulatory knowledge is treated as static data ("write it once, ship it"). Nobody owns the update process. The knowledge files sit in the codebase with no expiration dates, no update reminders, and no mechanism to flag when they might be stale.

**Consequences:**
- Tool advises user that 10% retainage is standard when CA now caps it at 5%
- Lien filing deadline guidance reflects old statute, not current amendments
- User trusts tool's regulatory knowledge because "it is a specialized tool" -- more dangerous than a generic AI that does not claim domain expertise

**Prevention:**
1. **Version-stamp every knowledge file with an effective date and review-by date.**
```
// knowledge/ca-regulations.ts
export const CA_RETAINAGE = {
  content: "California Civil Code Section 8811: retention cannot exceed 5% at any tier...",
  effectiveDate: "2026-01-01",
  reviewBy: "2027-01-15",  // Review after next legislative session
  source: "SB 7 (2024), codified as Civil Code Section 8811",
  lastVerified: "2026-03-08"
};
```
2. **Build a staleness check into the Settings UI.** Show knowledge freshness: "CA Regulations: Last verified March 2026. Review recommended by January 2027." Color-code: green (current), yellow (review approaching), red (past review date).
3. **Scope regulatory knowledge narrowly.** Do not try to encode all of California construction law. Focus on the specific areas the 16 passes analyze: indemnification (CCC 2782), payment contingency (pay-if-paid enforceability), retainage (CCC 8811), lien rights (CCC 8400-8494 mechanics lien deadlines), prevailing wage (when it applies). That is five regulatory areas, not fifty.
4. **Annual review cadence tied to California legislative cycle.** New laws take effect January 1. Schedule a knowledge review for mid-January each year.
5. **Insurance and bonding data changes on renewal.** Company profile data (insurance limits, bonding capacity, license expiration) should prompt for update when the expiration date passes.

**Detection:**
- Automated check: if `Date.now() > reviewBy`, surface a warning in the Settings UI
- On every contract analysis, compare governing law state against the knowledge base. If the contract is governed by a state not in the knowledge base, the finding should note "regulatory analysis limited to California -- this contract may be governed by [State] law."

---

## Moderate Pitfalls

### Pitfall 5: Over-Engineering Storage When Flat Files Suffice

**What goes wrong:**
Developer instinct says "we need a database for domain knowledge" and introduces SQLite, Supabase, or a vector store. This adds: a database dependency, a migration system, connection pooling for serverless, a knowledge management CRUD API, and an admin UI. All for what amounts to ~20 static text snippets that change annually.

**Why it happens:**
Database thinking is default for "data that the user can update." But the actual data volume is tiny: company profile (one object), 5 regulatory summaries, 10 industry standards references, 15 evaluation criteria modifications. Total: maybe 50KB of structured text.

**Prevention:**
1. **Start with TypeScript files in the codebase.** Knowledge is code: typed, version-controlled, deployed with the app. Example: `src/knowledge/ca-regulations.ts`, `src/knowledge/company-profile.ts`, `src/knowledge/aama-standards.ts`.
2. **Company profile data that changes (insurance limits, bonding capacity) goes in localStorage.** The user updates it in Settings, it persists in the browser. No server-side storage needed for a single-user app.
3. **Graduate to a database ONLY if:** (a) multiple users need different knowledge bases, (b) knowledge exceeds 500KB, or (c) knowledge needs to be updated without redeployment. None of these apply for v1.1.
4. **If you must have server-side user-editable knowledge,** use a single JSON file on Vercel Blob or a KV store. Not a relational database.

**Detection:**
- If the PR introduces a database migration file, question whether it is necessary.
- If the knowledge management code exceeds the knowledge content itself, the architecture is over-engineered.

---

### Pitfall 6: Prompt Engineering Pitfalls with Injected Knowledge

**What goes wrong:**
Domain knowledge is injected into system prompts without clear structural separation from instructions. The model confuses knowledge content with instructions. Example: you inject "Standard glazing subcontractor insurance: CGL $1M/$2M, Umbrella $5M" and the model starts evaluating ALL contracts against these exact numbers, even when the company profile specifies different limits.

Worse: injected knowledge fragments interact unpredictably. CA regulations say "pay-if-paid clauses are unenforceable in California," but the indemnification pass's existing instruction says "note that enforceability varies by jurisdiction." The model gets contradictory signals and produces inconsistent output.

**Why it happens:**
System prompts are already long and dense. Adding domain knowledge without clear XML-tag separation creates an ambiguous blob. Claude 4.x models take instructions literally -- if knowledge text reads like an instruction ("retention cannot exceed 5%"), the model may treat it as a hard rule rather than reference data.

**Prevention:**
1. **Use XML tags to separate concerns in every system prompt:**
```
<instructions>
[Existing analysis instructions -- unchanged]
</instructions>

<domain_knowledge>
[Injected knowledge -- clearly marked as reference data]
</domain_knowledge>

<evaluation_criteria>
[Modified severity rules that incorporate domain knowledge]
</evaluation_criteria>
```
2. **Preface domain knowledge with a framing instruction:** "The following domain knowledge is REFERENCE DATA for your analysis. It does not override your analysis instructions. Use it to enrich your findings, not to replace contract-specific analysis."
3. **Test for instruction contamination.** After adding domain knowledge, verify that severity rules are still followed correctly. The most common failure mode is domain knowledge overriding the severity rules.
4. **Never mix company-specific data with regulatory data in the same block.** The model needs to distinguish "our company has $5M umbrella coverage" from "California requires statutory workers comp."

**Detection:**
- Analyze a contract with known characteristics against the domain-enhanced prompts. Verify findings match expected severity levels.
- Check for "parrot findings" -- findings that simply restate the injected knowledge rather than analyzing the actual contract.

---

### Pitfall 7: Settings UI Complexity Creep

**What goes wrong:**
The Settings page starts simple: company name, insurance limits, bonding capacity. Then someone adds: license numbers, license expiration dates, workforce size, equipment list, bid/no-bid thresholds per contract type, preferred GC list, regulatory jurisdiction selection, AAMA certification levels, Division 08 subcategory capabilities, safety record metrics, EMR rating... The Settings page becomes a 40-field data entry form that the user fills out once and never revisits.

**Why it happens:**
Every domain knowledge area suggests "the user should be able to configure this." The instinct to make everything editable is strong, especially when the alternative is hardcoding. But configurability has a cost: UI complexity, validation logic, state management, and the cognitive burden on the user.

**Prevention:**
1. **Tier the settings into three levels:**
   - **Essential (shown by default):** Company name, insurance limits (CGL, umbrella, auto, WC), bonding capacity, CA contractor license number
   - **Important (collapsible section):** Bid/no-bid thresholds, workforce size, key capabilities, license expiration date
   - **Advanced (hidden behind "Show Advanced"):** AAMA certifications, specific Division 08 capabilities, preferred markup percentages, EMR rating
2. **Use smart defaults.** Pre-fill with typical glazing subcontractor values. The user only changes what differs from the default.
3. **Show the impact.** Next to each field, briefly state how it affects analysis: "Used by Insurance pass to flag coverage gaps" or "Used by Scope pass to identify work outside your capabilities."
4. **Maximum 15 fields visible on initial Settings load.** If you need more, the feature scope is too broad for v1.1.

**Detection:**
- Count the fields on the Settings page. If it exceeds 20 visible fields, simplify.
- Track which settings the user actually changes. If 80% of users only change 5 fields, the rest should be defaults or hidden.

---

### Pitfall 8: Maintaining Knowledge Accuracy for CA-Specific Regulations

**What goes wrong:**
You research California construction regulations and encode them into knowledge files. But you encode them wrong: you paraphrase a statute imprecisely, you miss an exception, you conflate two separate code sections, or you apply a 2025 amendment retroactively to your summary of the base statute. The AI then confidently presents your incorrect summary as California law.

**Why it happens:**
Developers are not lawyers. Reading statutes requires legal training to understand scope, exceptions, and interplay with other statutes. The temptation is to "simplify for the AI" -- but simplification of legal text almost always loses critical nuance.

**Prevention:**
1. **Do not paraphrase statutes. Quote them or summarize with explicit caveats.**
   - BAD: "California prohibits pay-if-paid clauses"
   - GOOD: "California Civil Code Section 8122 provides that an owner's failure to pay the direct contractor does not excuse the direct contractor's obligation to pay subcontractors. Courts have interpreted this as limiting pay-if-paid enforceability, though specific applications vary. Verify current applicability with legal counsel."
2. **Limit regulatory knowledge to five core areas where the app already analyzes:**
   - Indemnification: CCC 2782 (anti-indemnity statute for construction)
   - Payment: CCC 8122 (payment obligations), new SB 440 change order procedures
   - Retainage: CCC 8811 (5% cap, effective 2026)
   - Liens: CCC 8400-8494 (mechanic's lien framework, deadlines)
   - Prevailing Wage: When it applies (public works, certain affordable housing per AB 3190)
3. **Source every regulatory claim.** Every piece of regulatory knowledge in the codebase must have: statute citation, effective date, source URL, and last-verified date.
4. **Add a prominent disclaimer in the UI:** "Regulatory references are for informational purposes only and may not reflect the most current law. This tool does not provide legal advice. Consult a construction attorney for legal guidance."

**Detection:**
- Have a construction attorney review the regulatory knowledge files before deployment. Budget for this -- it is a one-time cost that prevents ongoing liability.
- Cross-reference every statute citation against the official California Legislative Information website (leginfo.legislature.ca.gov).

---

## Minor Pitfalls

### Pitfall 9: Coupling Knowledge Loading to the analyze.ts Monolith

**What goes wrong:**
Domain knowledge loading logic gets added directly to the 1,537-line `api/analyze.ts` file. Knowledge selection, template rendering, and pass-specific knowledge mapping all live in the same file. The file grows to 2,500+ lines and becomes unmaintainable.

**Prevention:**
1. Create a separate `src/knowledge/` directory with one file per knowledge domain.
2. Create a `src/knowledge/loader.ts` that maps pass names to their required knowledge and returns the formatted prompt fragment.
3. The analyze.ts file calls `getKnowledgeForPass(passName)` and injects the result. One line per pass, not inline knowledge blocks.

---

### Pitfall 10: Bid/No-Bid Signals Creating Decision Liability

**What goes wrong:**
The tool surfaces "bid/no-bid" signals based on contract terms matching company thresholds. The user passes on a profitable contract because the tool flagged "no-bid" based on an insurance requirement that was actually negotiable. Or worse, the user bids on a dangerous contract because no threshold was triggered.

**Prevention:**
1. Frame bid/no-bid as "signals" or "flags," never as recommendations.
2. Always show the underlying data: "Insurance requirement ($10M umbrella) exceeds your coverage ($5M). This is a bid decision factor, not a recommendation."
3. Never auto-calculate a bid/no-bid score. Surface the individual factors and let the user decide.

---

### Pitfall 11: False Positive Reduction Masking Real Risks

**What goes wrong:**
You add company capability data to filter "false positive" findings. The scope pass flags "curtain wall installation" as outside capabilities, but you add the company's capabilities and the filter removes the finding because curtain wall is listed. Except the contract specifies unitized curtain wall, which the company does not do -- the capability list said "curtain wall" generically.

**Prevention:**
1. Never silently remove findings. Downgrade severity instead: "Your company lists curtain wall as a capability. Verify this scope matches your specific curtain wall experience."
2. Capability matching should be fuzzy, not exact. "Curtain wall" in capabilities should not auto-suppress all curtain wall findings.
3. Log every finding that was modified by domain knowledge so the user can review the filter's decisions.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Knowledge architecture | Over-engineering storage (Pitfall 5) | Start with TypeScript files + localStorage. No database. |
| Company profile integration | Settings UI complexity (Pitfall 7) | Maximum 15 visible fields. Tier into essential/important/advanced. |
| CA regulatory knowledge | False confidence (Pitfall 2) + Staleness (Pitfall 4) + Accuracy (Pitfall 8) | Version-stamp everything. Disclaimers on every regulatory finding. Attorney review before launch. |
| Contract standards recognition | Context bloat (Pitfall 1) | AIA/ConsensusDocs pattern matching needs minimal knowledge -- just clause number patterns, not full standard text. |
| Industry/trade knowledge | Context bloat (Pitfall 1) + Cost explosion (Pitfall 3) | AAMA standards list is short. Do not embed full specification text. Reference numbers only. |
| Per-pass selective loading | Prompt engineering (Pitfall 6) | XML tag separation. Test every modified pass against a known contract. |
| Enhanced severity rules | Instruction contamination (Pitfall 6) | Domain-specific severity rules must be clearly separated from base severity rules. Test for regression. |
| False positive reduction | Masking real risks (Pitfall 11) | Never remove findings. Downgrade severity with explanation. |
| Settings UI | Complexity creep (Pitfall 7) | Build the minimal version first. Add fields only when a pass actually uses the data. |
| Bid/no-bid signals | Decision liability (Pitfall 10) | Frame as informational flags, not recommendations. Show underlying data. |

## Token Budget Reference

Based on current architecture (16 parallel passes, each receiving full PDF):

| Metric | Current (v1.0) | With Domain Knowledge (v1.1 target) | Danger Zone |
|--------|---------------|--------------------------------------|-------------|
| System prompt per pass | 300-600 tokens | 500-1,200 tokens | >2,500 tokens |
| Domain knowledge per pass | 0 tokens | 200-800 tokens (selective) | >1,500 tokens |
| Total additional input tokens per analysis | 0 | 5,000-12,000 tokens | >25,000 tokens |
| Estimated cost increase per analysis | $0 | $0.015-$0.036 | >$0.075 |
| Passes needing domain knowledge | 0/16 | 8-10/16 | 16/16 (means not selective) |

**Rule of thumb:** If every pass gets domain knowledge, the loading is not selective enough. At least 6 passes should receive zero domain knowledge.

## Knowledge Freshness Strategy

| Knowledge Type | Update Trigger | Update Frequency | Owner |
|---------------|----------------|-------------------|-------|
| Company profile (insurance, bonding) | Policy renewal date | Annually (or on renewal) | User via Settings UI |
| CA regulations | January 1 (new laws effective) | Annual review mid-January | Developer, attorney-verified |
| Contract standards (AIA, ConsensusDocs) | New edition published | Every 3-5 years | Developer |
| Industry standards (AAMA, ASTM) | Standard revision published | Every 5-10 years | Developer |
| Evaluation criteria / severity rules | Analysis quality feedback | Continuous as issues found | Developer |

## Sources

- [Context Rot: How Increasing Input Tokens Impacts LLM Performance (Chroma Research)](https://research.trychroma.com/context-rot) -- HIGH confidence, systematic testing of 18 models
- [Understanding LLM Performance Degradation: Context Window Limits](https://demiliani.com/2025/11/02/understanding-llm-performance-degradation-a-deep-dive-into-context-window-limits/) -- MEDIUM confidence, cites Stanford research showing 15-47% performance drops
- [Large Legal Fictions: Profiling Legal Hallucinations in LLMs (Stanford/Oxford)](https://academic.oup.com/jla/article/16/1/64/7699227) -- HIGH confidence, peer-reviewed research, 69-88% hallucination rate on specific legal queries
- [Hallucinating Law: Legal Mistakes with LLMs Are Pervasive (Stanford HAI)](https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive) -- HIGH confidence, Stanford research
- [2026 Construction Law Update (Nomos LLP)](https://calconstructionlawblog.com/2026/01/04/2026-construction-law-update/) -- HIGH confidence, law firm analysis of new CA construction laws
- [California's New Rules for Private Construction Contracts (Brownstein)](https://www.bhfs.com/insight/californias-new-rules-for-private-construction-contracts-take-effect-jan-1-2026/) -- HIGH confidence, law firm analysis of SB 440 and retainage cap
- [New California Construction Laws for 2026 (Smith Currie)](https://www.smithcurrie.com/publications/common-sense-contract-law/new-california-construction-laws-for-2026/) -- HIGH confidence, construction law firm
- [Reduce LLM Token Usage in RAG (apxml.com)](https://apxml.com/courses/optimizing-rag-for-production/chapter-5-cost-optimization-production-rag/minimize-llm-token-usage-rag) -- MEDIUM confidence, practical guidance on token cost management
- [Prompting Best Practices - System Prompts (Claude API Docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/system-prompts) -- HIGH confidence, official Anthropic documentation
- [Claude Prompt Engineering Best Practices (Anthropic Blog)](https://claude.com/blog/best-practices-for-prompt-engineering) -- HIGH confidence, official Anthropic guidance

---
*Pitfalls research for: v1.1 Domain Intelligence milestone (ClearContract)*
*Researched: 2026-03-08*
