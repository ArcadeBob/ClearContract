# Phase 3: Extended Legal Coverage - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete legal clause analysis covering all major risk areas a glazing subcontractor faces: insurance requirements, termination, flow-down provisions, no-damage-for-delay, lien rights, dispute resolution, and change order processes. This adds 7 new clause types (LEGAL-06 through LEGAL-12) to the 4 already built in Phase 2. Same architecture — new specialized passes with self-contained schemas and structured output.

</domain>

<decisions>
## Implementation Decisions

### Insurance checklist format (LEGAL-06)
- Two-part output: one summary checklist finding PLUS individual Critical/High findings for specific gaps or unusual requirements
- Checklist covers standard glazing sub coverages: CGL, commercial umbrella, auto liability, workers comp, builder's risk/installation floater
- CGL limit threshold: flag when contract requires more than $1M per occurrence / $2M aggregate (industry standard for glazing subs)
- List all required endorsements (additional insured, waiver of subrogation, primary/non-contributory); flag endorsements that are non-standard or hard to obtain for glazing work
- Certificate holder details extracted into the checklist

### Termination severity calibration (LEGAL-07)
- Termination for convenience with no compensation = Critical
- Termination for convenience with partial payment = High
- Termination for cause with short cure period (<7 days) = High
- Standard for-cause termination with reasonable cure period = Medium
- Analysis includes: types, notice periods, compensation upon termination, cure periods

### Flow-down analysis (LEGAL-08)
- Flag the flow-down clause itself, then trace which specific prime contract obligations flow down that are problematic for a glazing sub (schedule penalties, warranty periods, insurance beyond sub's coverage)
- Don't trace every obligation — focus on the dangerous ones
- Blanket flow-down of ALL prime contract terms = Critical
- Flow-down imposing obligations beyond sub's scope or insurance = High
- Flow-down of specific relevant sections = Medium
- Targeted flow-down with exceptions = Low
- When flow-down references a prime contract the sub doesn't have: create a High finding noting the sub is bound by terms they may not have seen, recommend requesting the prime contract before signing
- Cross-reference flow-down findings with related findings in other categories (e.g., if flow-down imposes insurance requirements, link to insurance findings)

### No-damage-for-delay severity (LEGAL-09)
- Absolute no-damage-for-delay (sub waives ALL delay claims) = Critical
- Broad waiver with narrow exceptions = High
- Waiver with reasonable exceptions (owner-caused delays, force majeure) = Medium

### Lien rights analysis (LEGAL-10)
- Focus on payment-contingent waivers: unconditional waivers required BEFORE payment, waivers of retainage lien rights, broad release language waiving rights beyond the specific payment
- No-lien clause or unconditional waiver before payment = Critical
- Broad release provisions waiving lien rights = High
- Conditional waiver tied to actual payment = Low
- Missing lien rights provisions = Medium (flag as gap)
- Always flag no-lien clauses even when they may be unenforceable in the governing state — include state-specific enforceability context when governing law state is known
- When governing law state is known, include statutory lien filing deadline to help the sub know their protection timeline

### Dispute resolution severity (LEGAL-11)
- Combined venue + attorney fee analysis:
  - Mandatory arbitration with no appeal + distant venue = Critical
  - Mandatory arbitration in reasonable venue = High
  - Litigation with unfavorable venue/jurisdiction = High
  - One-sided attorney fee clause (loser-pays or sub-only) = Critical
  - No fee shifting = Medium
  - Mutual fee shifting = Low
  - Mediation first, then arbitration or litigation = Medium
- Analysis includes: venue, arbitration requirements, mediation steps, attorney fee shifting

### Change order process severity (LEGAL-12)
- Combined protection + notice requirements:
  - Unilateral change rights with no price adjustment = Critical
  - Proceed-pending (must work before CO approval) with no payment guarantee = Critical
  - No written change order required (oral changes binding) = Critical
  - Unilateral changes with price adjustment mechanism = High
  - Written CO required but unreasonable timeline = High
  - Standard mutual change order process = Low
- Analysis includes: unilateral change rights, notice requirements, pricing mechanisms, proceed-pending clauses

### Carrying forward from Phase 2 (locked)
- Full verbatim clause quoting with section/article references — no truncation regardless of length
- Industry-contextualized explanations from glazing sub perspective, contrasting with standard terms
- Insurance gap callouts referencing typical glazing sub coverage (CGL, umbrella)
- State-specific enforceability context when governing law state is known
- One finding per clause instance — multiple provisions produce multiple findings
- Flag missing protective clauses (absence of protections for the sub)
- Do NOT flag when a harmful clause is absent (that's good news)
- Self-contained Zod schemas per clause type with all metadata fields REQUIRED
- Structured metadata alongside narrative explanation

### Claude's Discretion
- Pass organization — how to group 7 clause types across analysis passes (separate pass per type, or group related types)
- Prompt engineering for each clause type
- Schema field design for each new clause type's metadata
- Deduplication strategy when multiple passes may surface the same clause
- Exact format of the insurance checklist finding (structured content within the finding)
- How to detect and extract endorsement requirements from contract language
- How to identify and trace flow-down obligations

</decisions>

<specifics>
## Specific Ideas

- Insurance checklist should feel like a compliance verification tool — checking off what the contract requires against what a glazing sub typically carries
- Flow-down analysis should highlight the "hidden obligations" — things the sub wouldn't know about without reading the prime contract
- Lien rights findings should be practical — a sub reading this should immediately know if their payment leverage is at risk
- Statutory lien deadline context adds real value — the sub needs to know their timeline for filing

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `legalAnalysis.ts` schemas: 4 existing legal finding schemas (Indemnification, PaymentContingency, LiquidatedDamages, Retainage) — Phase 3 follows the same pattern for 7 new types
- `api/analyze.ts` ANALYSIS_PASSES array: Add new passes here, each with `isLegal: true` and a schema reference
- `convertLegalFinding()` function: Converts legal pass findings to standard Finding format — will need extension for new metadata fields
- `crossReferences` field already exists on all legal finding schemas — supports the flow-down cross-referencing requirement
- Phase 2 UI components (ClauseQuote, LegalMetaBadge, FindingCard): Already display clauseText, explanation, and metadata — Phase 3 findings will render through these

### Established Patterns
- One self-contained schema per clause type in `src/schemas/legalAnalysis.ts` with local SeverityEnum and DateTypeEnum
- Each pass gets full PDF via Files API with ephemeral cache
- Structured output via `zodToOutputFormat()` wrapper
- `Promise.allSettled()` for parallel execution with partial result handling
- Deterministic risk score from severity weights (Critical=25, High=15, Medium=8, Low=3, Info=0)
- Composite key dedup: clauseReference+category as primary key with title-based fallback

### Integration Points
- `ANALYSIS_PASSES` array in `api/analyze.ts` — add 7 new legal passes
- `legalAnalysis.ts` — add 7 new finding schemas and pass result schemas
- `convertLegalFinding()` in `api/analyze.ts` — extend switch statement for new pass names
- `Finding` interface in `src/types/contract.ts` — add optional metadata fields for new clause types
- FindingCard/LegalMetaBadge components — may need updates to display new metadata types (insurance checklist, lien deadline context)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-extended-legal-coverage*
*Context gathered: 2026-03-04*
