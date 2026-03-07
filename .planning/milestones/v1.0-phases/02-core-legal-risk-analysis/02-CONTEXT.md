# Phase 2: Core Legal Risk Analysis - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce detailed legal risk findings with exact verbatim clause text and plain-English explanations for the 4 highest-priority clause types: indemnification, pay-if-paid/pay-when-paid, liquidated damages, and retainage. Each finding is self-contained and actionable. Phase 3 adds the remaining legal clause types.

</domain>

<decisions>
## Implementation Decisions

### Clause quoting
- Quote the full clause text — entire clause/paragraph as-is, no truncation regardless of length
- Always include section/article number reference (clauseReference field) so the user can locate it in the physical contract
- Flag cross-references when a clause depends on or is modified by other sections
- No length cap on quoted text — the user wants complete language to hand to an attorney or use in negotiations

### Explanation style
- Industry-contextualized explanations — explain why each clause matters specifically to a glazing subcontractor, not generic legal language
- Flag insurance gaps — when a clause creates liability beyond what standard CGL/umbrella coverage typically covers for glass installation work, call it out explicitly
- State-specific enforceability: if the contract specifies a governing law state, include state-specific context (e.g., pay-if-paid enforceability). If no state specified, note enforceability varies by jurisdiction and suggest checking
- Contrast with standard terms — each explanation should state what the "standard" or "fair" version of the clause looks like so the user can see what's abnormal

### Severity calibration
- **Indemnification by type:** Broad form (liable for GC's negligence) = Critical. Intermediate (concurrent negligence) = High. Limited (own negligence only) = Medium
- **Pay-if-paid = Critical**, pay-when-paid = High. Different risk levels — pay-if-paid means you may never get paid
- **Liquidated damages:** Any LD clause = High minimum. Uncapped or disproportionate to contract value = Critical
- **Retainage by release conditions:** Tied to overall project completion (not sub's work) = High. Above 10% = High. Standard 5-10% tied to sub's substantial completion = Low. Missing release conditions = Critical

### Finding density
- One finding per clause instance — if a contract has 3 separate indemnification provisions, produce 3 findings each with its own quote, explanation, and severity
- Flag missing protective clauses — when clauses that would protect the sub are absent (e.g., no payment timeline, no retainage release provision), create a finding noting the absence
- Do NOT flag when a harmful clause is absent (that's good news, not a finding)

### Category assignment
- Indemnification findings → Legal Issues category
- Pay-if-paid/pay-when-paid, liquidated damages, retainage findings → Financial Terms category
- Both categories already exist in the schema

### Structured metadata
- Each finding includes a structured metadata block alongside the narrative explanation
- New schema fields needed per clause type:
  - Indemnification: riskType (limited/intermediate/broad), hasInsuranceGap (boolean)
  - Pay-if-paid: clauseType (pay-if-paid/pay-when-paid), enforceability context
  - Liquidated damages: amount/rate, capStatus (capped/uncapped), proportionalityAssessment
  - Retainage: percentage, releaseCondition, tiedTo (sub's work/project completion)

### Claude's Discretion
- Pass structure — how to organize the 4 clause types across analysis passes (separate pass per type, combined, etc.)
- Prompt engineering for each clause type
- How to detect and classify indemnification types from contract language
- Deduplication strategy when multiple passes may surface the same clause
- How to handle clauses that span multiple clause types (e.g., a clause covering both LD and retainage)

</decisions>

<specifics>
## Specific Ideas

- Explanations should read like advice from an experienced glazing sub to a newer one — practical, not academic
- Insurance gap callouts should reference typical glazing sub coverage (CGL, umbrella) not just generic "insurance"
- Standard term comparisons help the user immediately see what's negotiable vs boilerplate

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FindingSchema` (src/schemas/analysis.ts): Already has optional `clauseText` and `explanation` fields — Phase 2 makes these populated for all legal findings. New fields needed for structured metadata (riskType, capStatus, etc.)
- `PassResultSchema` / `RiskOverviewResultSchema`: Existing pass schemas return findings + dates arrays — new legal passes follow the same pattern
- Multi-pass engine in `api/analyze.ts`: `ANALYSIS_PASSES` array and `runAnalysisPass()` function — new legal passes added here
- `FindingCard.tsx`, `SeverityBadge.tsx`: UI components that render findings — will need updates to display clauseText, explanation, and metadata fields

### Established Patterns
- Each pass gets full PDF via Files API with `cache_control: { type: 'ephemeral' }` — cached across passes for efficiency
- Structured output via `zodToOutputFormat()` wrapper around zod-to-json-schema
- `Promise.allSettled()` for parallel pass execution with partial result handling
- Deterministic risk score from severity weights (Critical=25, High=15, Medium=8, Low=3, Info=0)
- Title-based deduplication in `mergePassResults()` — may need refinement if multiple passes find the same clause

### Integration Points
- `ANALYSIS_PASSES` array in `api/analyze.ts` — add new legal analysis passes here
- `FindingSchema` in `src/schemas/analysis.ts` — extend with metadata fields
- `Finding` interface in `src/types/contract.ts` — keep in sync with schema changes
- Existing `risk-overview` pass already catches some legal findings — new specialized passes will produce deeper analysis that may overlap

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-legal-risk-analysis*
*Context gathered: 2026-03-04*
