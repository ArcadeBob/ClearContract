# Feature Research

**Domain:** AI-powered construction subcontract review for glazing subcontractors
**Researched:** 2026-03-02
**Confidence:** MEDIUM-HIGH (domain knowledge well-established; AI implementation patterns verified via multiple sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features the user assumes exist. Missing these means the tool feels broken or useless for real contract review work.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Exact clause quoting** | User needs verbatim contract language to negotiate with GCs and discuss with counsel. Summaries alone are not actionable. | MEDIUM | Every finding must include the exact quoted text from the contract, not a paraphrase. Format: quoted text + plain-English explanation + recommendation. |
| **Comprehensive risk findings with severity** | The existing app already has this pattern (5 severity levels, 9 categories). Users expect thorough coverage, not a handful of bullet points. | MEDIUM | Current 4096 max_tokens is far too low for comprehensive analysis of 50-100 page contracts. Must produce 30-80+ findings for a real subcontract. |
| **Indemnification clause analysis** | Construction industry's #1 risk area. Three forms (limited, intermediate, broad) create vastly different liability exposure. Anti-indemnity statutes vary by state. | MEDIUM | Must identify the indemnification type, flag broad-form clauses, note if it extends beyond the sub's negligence, and check alignment with insurance coverage. |
| **Pay-if-paid / pay-when-paid detection** | Direct cash flow risk. Pay-if-paid shifts non-payment risk entirely to sub. Many states don't enforce it, but subs must know it's there. | LOW | Binary detection with explanation of which type and enforceability context. |
| **Liquidated damages analysis** | Monetary penalties for late completion. GCs frequently flow these down to subs disproportionately. | LOW | Flag the amount/rate, whether it's proportional, and if there's a cap. |
| **Retainage terms extraction** | Retainage directly impacts cash flow. Percentage, release conditions, and timeline matter. | LOW | Extract percentage, conditions for release, and whether final retainage is tied to project completion vs. sub's work completion. |
| **Insurance requirements extraction** | Subs must verify coverage matches contract requirements before signing. GL limits, additional insured endorsements, waiver of subrogation requirements. | MEDIUM | Pull specific coverage types, limits, endorsement requirements, and certificate holder details into a structured checklist format. |
| **Date and deadline extraction** | Missing notice deadlines or milestones creates liability exposure. The existing app has basic date extraction. | LOW | Needs enhancement: notice periods (5-14 day windows), cure periods, payment terms (Net 30, etc.), not just project milestones. |
| **Scope of work extraction** | The user specifically needs this: pull the full scope, identify what's included/excluded, and flag gaps that could lead to disputes. | HIGH | Must parse scope sections, specification references, drawing references, and exclusion language. For glazing: curtain wall, storefront, glass types, hardware, sealants, demolition, layout. |
| **Category-organized output** | Findings must be grouped by analysis area so the user can work through the contract systematically. Already exists in current app. | LOW | Current 9 categories are a good start but need refinement (see differentiators below). |
| **Risk score (0-100)** | Provides at-a-glance severity assessment. Already exists. | LOW | Keep existing approach. Consider making it a weighted composite of finding severities rather than an LLM-assigned number. |
| **PDF upload and text extraction** | Already exists. The fundamental input mechanism. | LOW | Current 3MB limit and 100k char truncation need addressing for 100+ page contracts, but that's an architecture concern, not a feature gap. |

### Differentiators (Competitive Advantage)

Features that set ClearContract apart from generic AI contract review tools and expensive enterprise platforms like Document Crunch ($$$) and Provision AI.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Questionable verbiage detection** | Goes beyond "is this clause risky?" to flag specific language patterns that are ambiguous, one-sided, or missing standard protections. This is what the user explicitly asked for. | HIGH | Detect: vague scope language ("reasonably inferable"), one-sided terms ("sole discretion"), missing mutual obligations, undefined terms with legal significance. Output each with the exact text, why it's questionable, and what it should say instead. |
| **Labor compliance checklist** | Extracts all compliance requirements into a structured, actionable checklist with associated dates and contacts. Not just findings -- a checklist the user can print and track. | MEDIUM | Items: prevailing wage requirements, certified payroll obligations (WH-347), OSHA requirements, licensing requirements, safety plans, drug testing, background checks, apprenticeship ratios. Each with deadline, responsible party, and contact info if specified. |
| **Flow-down clause analysis** | Identifies flow-down provisions that cascade prime contract terms to the sub. Critical because subs often unknowingly accept owner-level obligations. | MEDIUM | Flag which clauses flow down, highlight misalignments between prime and sub terms, and warn when flow-down creates obligations beyond the sub's scope or insurance coverage. |
| **Negotiation prep output** | Organize findings specifically for pushback discussions with the GC. Not just "here are the risks" but "here's what to ask for." | LOW | For each Critical/High finding, generate: (1) the problematic language, (2) why it's problematic, (3) suggested replacement language or negotiation position. This is mostly prompt engineering on top of existing finding structure. |
| **Scope gap detection** | Compare extracted scope to typical glazing subcontract scope items and flag what's missing or ambiguous. | HIGH | Maintain a reference checklist of standard glazing scope items (curtain wall, storefront, entrances, glass types, hardware, sealants, demolition, layout, shop drawings, thermal performance, protection/cleaning). Flag items present but vague, and items absent that are commonly expected. |
| **Change order / modification terms analysis** | How changes are handled determines whether the sub gets paid for extra work. GCs frequently have one-sided change processes. | MEDIUM | Flag: unilateral change rights, notice requirements for changes, pricing mechanisms, "proceed pending agreement" clauses, constructive change risks. |
| **Termination clause analysis** | Termination-for-convenience without fair compensation is a major risk. Termination-for-cause with unclear cure periods is also dangerous. | LOW | Extract termination types, notice periods, compensation upon termination, and cure period requirements. |
| **No-damage-for-delay detection** | Clauses eliminating monetary compensation for delays beyond the sub's control. Sub's sole remedy becomes time extension, which doesn't cover overhead costs. | LOW | Binary detection with severity flag. Often unenforceable but must be identified. |
| **Lien rights analysis** | No-lien or lien subordination clauses threaten the sub's primary payment protection mechanism. Many are unenforceable but must be flagged. | LOW | Detect no-lien clauses, unconditional waiver language, and provisions that could inadvertently waive lien rights (e.g., through broad release language in pay applications). |
| **Dispute resolution analysis** | Venue, jurisdiction, mediation-first requirements, and arbitration clauses significantly impact the sub's ability to resolve disputes affordably. | LOW | Flag unfavorable venue requirements, mandatory arbitration without mediation step, waiver of jury trial, and attorney fee shifting. |
| **Section-by-section contract map** | Provide a structured table of contents showing what the contract covers and where, so the user can navigate the document. | MEDIUM | Not just findings -- a map of all major sections with page/section references. Helps the user understand the full contract structure at a glance. |
| **PDF report export** | Generate a downloadable PDF report of the complete analysis. The "Export Report" button exists in the UI but isn't functional. | MEDIUM | Include: executive summary, risk score, organized findings with quotes, compliance checklist, dates/deadlines, negotiation items. Must be formatted for printing and sharing with counsel. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but would be actively harmful to build given this project's context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Automated redlining / markup** | Enterprise tools like LexCheck and SuperLegal offer it. Seems like the obvious next step. | Generating modified contract text carries legal liability. The user is a glazing sub, not a law firm. Wrong redline suggestions could create worse terms than the original. This is a single-user tool, not a legal practice platform. | Provide suggested language in the recommendation field of each finding. The user (or their attorney) decides what to propose. |
| **Multi-document comparison** | Document Crunch compares across 50+ docs. Seems powerful. | Single user reviewing individual subcontracts. Adding multi-doc workflows adds complexity without matching the use case. The user reviews one contract at a time from different GCs. | If scope comparison to bid is needed later, that's a separate focused feature, not a general multi-doc engine. |
| **Playbook / template customization** | LegalOn and LexCheck let users create custom review playbooks. Sounds flexible. | Single user. Building a playbook system means building a configuration UI, persistence layer, rule engine. Massive complexity for one person. The AI prompt IS the playbook. | Refine the system prompt with glazing-specific knowledge. Hardcode the subcontractor perspective rather than making it configurable. |
| **Real-time chat with contract** | Document Crunch offers a chat interface for asking questions about the contract. | Adds conversational AI complexity (session management, context window management, follow-up handling) without clear value over a comprehensive upfront analysis. The user needs a complete review, not a Q&A session. | Make the upfront analysis so comprehensive that chat becomes unnecessary. If a specific question arises, the user can re-analyze with a focused prompt later. |
| **Contract storage / database** | Enterprise tools store and index all contracts. | Current app deliberately has no persistence. Adding a database means auth, data security, backup, GDPR concerns. The user is one person -- they have a file system. | Keep contracts in-memory during session. The user stores PDFs in their own file system. The analysis report (PDF export) is the persistent artifact. |
| **Clause library / precedent search** | LexCheck searches past negotiations for precedent. | Requires building a vector database of past contract clauses, embeddings infrastructure, search UI. Massive investment for a single-user tool. | The AI model already has training data on standard construction contract language. Leverage that via prompt engineering rather than building custom search. |
| **Multi-language / translation** | LegalOn supports 28 languages. | Glazing contracts in the US are in English. Zero need. | Do not build. |
| **Procore / project management integration** | Document Crunch integrates with Procore. | Adds API integration complexity. The user needs a standalone review tool, not a project management plugin. | Export report as PDF. The user can attach it to whatever PM system they use. |

## Feature Dependencies

```
[PDF Upload + Text Extraction] (exists)
    |
    v
[Chunked/Multi-pass Analysis Engine] (architecture prerequisite)
    |
    +---> [Exact Clause Quoting]
    |         |
    |         +---> [Questionable Verbiage Detection]
    |         +---> [Negotiation Prep Output]
    |
    +---> [Comprehensive Risk Findings]
    |         |
    |         +---> [Indemnification Analysis]
    |         +---> [Pay-if-Paid Detection]
    |         +---> [Liquidated Damages Analysis]
    |         +---> [Retainage Terms]
    |         +---> [No-Damage-for-Delay Detection]
    |         +---> [Lien Rights Analysis]
    |         +---> [Termination Clause Analysis]
    |         +---> [Dispute Resolution Analysis]
    |         +---> [Change Order Terms Analysis]
    |         +---> [Flow-Down Clause Analysis]
    |
    +---> [Scope of Work Extraction]
    |         |
    |         +---> [Scope Gap Detection]
    |
    +---> [Insurance Requirements Extraction]
    |
    +---> [Date/Deadline Extraction]
    |
    +---> [Labor Compliance Checklist]
    |
    +---> [Section-by-Section Contract Map]

[All Analysis Outputs]
    |
    v
[PDF Report Export]
```

### Dependency Notes

- **Chunked/multi-pass analysis is the critical prerequisite.** The current single API call with 4096 max tokens cannot produce comprehensive analysis. Every downstream feature depends on having enough output capacity. This is the #1 architecture change needed.
- **Exact clause quoting enables negotiation prep.** You cannot generate "here's what to ask for" without first identifying the exact problematic language.
- **Scope extraction enables scope gap detection.** You must first extract what's in the contract before comparing to what should be there.
- **PDF export depends on all analysis outputs.** It's the last feature to build because it packages everything else.
- **All clause-specific analyses (indemnification, pay-if-paid, etc.) are independent of each other** but all depend on the core analysis engine producing enough output with exact quotes.

## MVP Definition

### Launch With (v1 -- Enhanced Analysis)

The immediate priority: make the existing app produce genuinely useful output for reviewing a real subcontract.

- [ ] **Fix analysis bug** -- Analysis currently fails entirely. Nothing else matters until this works.
- [ ] **Chunked/multi-pass analysis** -- Enable comprehensive analysis of 50-100+ page contracts. Single 4096-token call is fundamentally insufficient.
- [ ] **Exact clause quoting in all findings** -- Every finding includes verbatim contract text, not just summaries. This is the user's core need.
- [ ] **Enhanced analysis categories** -- Expand the system prompt to produce findings across all key risk areas: indemnification types, pay-if-paid/when-paid, liquidated damages, retainage, insurance requirements, no-damage-for-delay, termination, lien rights, dispute resolution.
- [ ] **Scope of work extraction** -- Dedicated section pulling the full scope with inclusions and exclusions clearly listed.
- [ ] **Labor compliance checklist** -- Structured checklist format with compliance items, dates, and contacts.
- [ ] **Date/deadline extraction with notice periods** -- Enhance beyond project milestones to include notice windows, cure periods, and payment terms.

### Add After Validation (v1.x)

Features to add once the core analysis is producing reliable, comprehensive results.

- [ ] **Questionable verbiage detection** -- Trigger: users want to know not just what's risky but what's vague or one-sided. Requires the analysis engine to be stable first.
- [ ] **Negotiation prep output** -- Trigger: users find themselves manually reformatting findings into negotiation points. Add suggested replacement language to Critical/High findings.
- [ ] **Flow-down clause analysis** -- Trigger: user encounters a subcontract with heavy flow-down from the prime. Dedicated analysis pass for flow-down provisions.
- [ ] **Change order terms analysis** -- Trigger: user gets burned by a change order dispute. Analyze change process, notice requirements, pricing mechanisms.
- [ ] **Scope gap detection** -- Trigger: user wants to compare contract scope to their bid. Requires a reference checklist of standard glazing scope items.
- [ ] **Section-by-section contract map** -- Trigger: user wants to navigate long contracts. Generate a structured TOC with section references.
- [ ] **PDF report export** -- Trigger: user needs to share analysis with attorney or business partner. Package all outputs into a printable PDF.

### Future Consideration (v2+)

Features to defer until the core product is battle-tested on real contracts.

- [ ] **Bid-to-scope comparison** -- Upload bid proposal alongside contract to automatically detect scope differences. Requires file comparison architecture.
- [ ] **State-specific legal context** -- Tailor findings to the jurisdiction (e.g., "pay-if-paid is unenforceable in California"). Requires maintaining a legal knowledge base per state.
- [ ] **Contract version comparison** -- Compare original vs. revised contract to see what changed. Requires diff engine.
- [ ] **Historical risk tracking** -- Track risk scores across contracts over time. Requires persistence layer.
- [ ] **Template-based review** -- Compare against AIA, ConsensusDocs, or EJCDC standard forms to flag deviations. Requires template library.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix analysis bug | HIGH | LOW | P1 |
| Chunked/multi-pass analysis | HIGH | HIGH | P1 |
| Exact clause quoting | HIGH | MEDIUM | P1 |
| Enhanced risk categories (indemnification, pay-if-paid, LD, retainage, etc.) | HIGH | MEDIUM | P1 |
| Scope of work extraction | HIGH | MEDIUM | P1 |
| Labor compliance checklist | HIGH | MEDIUM | P1 |
| Enhanced date/deadline extraction | MEDIUM | LOW | P1 |
| Questionable verbiage detection | HIGH | HIGH | P2 |
| Negotiation prep output | MEDIUM | LOW | P2 |
| Flow-down clause analysis | MEDIUM | MEDIUM | P2 |
| Change order terms analysis | MEDIUM | LOW | P2 |
| Scope gap detection | MEDIUM | HIGH | P2 |
| Section-by-section contract map | LOW | MEDIUM | P2 |
| PDF report export | MEDIUM | MEDIUM | P2 |
| Termination clause analysis | MEDIUM | LOW | P2 |
| No-damage-for-delay detection | MEDIUM | LOW | P2 |
| Lien rights analysis | MEDIUM | LOW | P2 |
| Dispute resolution analysis | LOW | LOW | P2 |
| Bid-to-scope comparison | MEDIUM | HIGH | P3 |
| State-specific legal context | LOW | HIGH | P3 |
| Contract version comparison | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for the enhanced analysis to be useful. Ship these together.
- P2: Should have, add iteratively. Each is independently valuable.
- P3: Nice to have, defer until core is proven.

## Competitor Feature Analysis

| Feature | Document Crunch | Provision AI | LegalOn | ClearContract (Our Approach) |
|---------|----------------|--------------|---------|------------------------------|
| Risk detection | AI-powered, generic categories | Ties to project scope/cost | Playbook-driven against AIA/ConsensusDocs | Glazing-sub-specific, opinionated about what matters from the sub's perspective |
| Clause extraction | Key clauses with summaries | Normalizes owner/regional terms | Attorney-developed playbooks | Exact verbatim quotes with section references |
| Output format | Summaries + playbooks + checklists | Workflow-integrated | Review suggestions in Word | Organized breakdown: risks, scope, compliance checklist, dates |
| Negotiation support | Chat assistant for questions | N/A | Redlining suggestions | Explicit negotiation prep with suggested positions per finding |
| Construction focus | Yes, purpose-built | Yes, scope/cost focused | Yes, standard form support | Yes, glazing subcontractor specific |
| Pricing | Custom (enterprise) | Custom (enterprise) | Custom (enterprise) | Self-hosted, API costs only |
| Integration | Procore, Word | Workflows | Word, CRM | Standalone web app |
| Target user | Project teams, contract admins | Estimators, project leads | Legal teams | Solo glazing subcontractor |

**Our competitive advantage:** ClearContract is not competing with enterprise tools. It's a focused, single-purpose tool for one user persona (glazing sub owner reviewing GC subcontracts). Enterprise tools cost $999+/month and serve teams. ClearContract costs API usage fees and serves one person who needs a complete, actionable contract breakdown with exact quotes they can take to negotiations or hand to their attorney.

## Analysis Category Refinement

The existing app has 9 categories. Based on research, the recommended category structure for the enhanced analysis is:

### Existing Categories (Keep)
1. **Legal Issues** -- Indemnification, liability, dispute resolution, termination, lien rights
2. **Scope of Work** -- Scope definition, inclusions/exclusions, specifications, drawings
3. **Contract Compliance** -- General contract compliance requirements, flow-down provisions
4. **Labor Compliance** -- Prevailing wage, certified payroll, OSHA, licensing, safety
5. **Insurance Requirements** -- GL, workers comp, auto, umbrella, additional insured, waivers of subrogation
6. **Important Dates** -- Start, completion, milestones, notice periods, cure periods
7. **Financial Terms** -- Payment terms, retainage, pay-if-paid/when-paid, change order pricing
8. **Technical Standards** -- Performance requirements, quality standards, testing, warranties
9. **Risk Assessment** -- Overall risk evaluation, aggregated concerns

### Proposed New Categories (Add in v1.x)
10. **Questionable Verbiage** -- Ambiguous language, undefined terms, one-sided provisions, missing protections
11. **Change Management** -- Change order process, notice requirements, pricing mechanisms, constructive changes
12. **Flow-Down Provisions** -- Terms flowing from prime contract, misalignments, disproportionate obligations

The new categories can be added without breaking the existing UI since the `CategoryFilter` component dynamically renders based on available categories.

## Sources

### Competitor Analysis
- [Mastt - Top 5 AI Construction Contract Review Software](https://www.mastt.com/software/ai-construction-contract-review) -- MEDIUM confidence, marketing material but feature lists verified across sources
- [Document Crunch - Construction Contract Review](https://www.documentcrunch.com/construction-contract-review) -- MEDIUM confidence, feature descriptions from official site
- [Provision AI - Construction Risk Management](https://www.provision.com/blog/best-construction-risk-management-and-contract-analysis-software-in-2025) -- MEDIUM confidence

### Domain Knowledge
- [Archdesk - Dangerous Construction Contract Clauses](https://archdesk.com/blog/construction-contract-risks-and-clauses) -- HIGH confidence, comprehensive clause taxonomy
- [Long International - Problematic Construction Contract Clauses](https://www.long-intl.com/blog/problematic-construction-contract-clauses/) -- HIGH confidence, respected construction consulting firm
- [AIA - Top 5 Unfair Provisions](https://learn.aiacontracts.com/articles/6421989-top-5-unfair-provisions-in-construction-contracts/) -- HIGH confidence, authoritative industry source
- [Siteline - Pay-if-Paid vs Pay-when-Paid](https://www.siteline.com/blog/pay-if-paid-vs-pay-when-paid-what-you-need-to-know) -- HIGH confidence, well-sourced industry article
- [Saul Ewing - Flow-Down Clauses](https://www.saul.com/insights/blog/subcontractors-take-note-flow-down-clauses-can-act-contractual-waivers) -- HIGH confidence, law firm analysis
- [BlackBoiler - Construction Contract Review Checklist](https://www.blackboiler.com/construction-contract-review-checklist/) -- MEDIUM confidence, practical checklist from legal tech company

### Contract Review Checklists
- [Mastt - Contract Review Checklist](https://www.mastt.com/resources/contract-review-checklist) -- MEDIUM confidence
- [ATSSA - Contract Review Checklist](https://www.atssa.com/wp-content/uploads/2023/11/ContractReviewChecklist_ATSSA.pdf) -- MEDIUM confidence, trade association source
- [U.S. DOL - Prevailing Wage Requirements](https://webapps.dol.gov/elaws/elg/dbra.htm) -- HIGH confidence, official government source

### AI Implementation
- [Artificial Lawyer - Contract AI Barriers](https://www.artificiallawyer.com/2025/11/10/contract-ai-barriers-economics-reasoning-prompt-engineering/) -- MEDIUM confidence
- [NetDocuments - Structuring LLM Outputs for Legal](https://studio.netdocuments.com/post/structuring-llm-outputs) -- MEDIUM confidence
- [Agenta - Guide to Structured Outputs](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms) -- MEDIUM confidence

---
*Feature research for: AI-powered construction subcontract review (glazing subcontractor)*
*Researched: 2026-03-02*
