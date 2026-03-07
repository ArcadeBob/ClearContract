# Phase 3: Extended Legal Coverage - Research

**Researched:** 2026-03-04
**Domain:** Anthropic structured outputs schema extension, construction legal clause analysis (7 clause types), multi-pass prompt engineering, TypeScript discriminated union extension
**Confidence:** HIGH

## Summary

Phase 3 adds 7 new specialized legal analysis passes to the existing pipeline (which already has 3 general passes + 4 legal passes from Phase 2 = 7 total, growing to 14 total). The 7 new clause types are: insurance requirements (LEGAL-06), termination (LEGAL-07), flow-down provisions (LEGAL-08), no-damage-for-delay (LEGAL-09), lien rights (LEGAL-10), dispute resolution (LEGAL-11), and change order process (LEGAL-12). Each follows the exact same architecture pattern established in Phase 2: one self-contained Zod schema per clause type, one analysis pass per clause type, structured metadata packed into the `LegalMeta` discriminated union, findings rendered through the existing FindingCard/ClauseQuote/LegalMetaBadge components.

The primary technical work is schema design (7 new Zod schemas with clause-type-specific metadata fields), prompt engineering (7 specialized system prompts with severity calibration rules), extending `convertLegalFinding()` with 7 new switch cases, and extending the `LegalMeta` type union with 7 new clause type variants. The insurance checklist (LEGAL-06) is the most complex because it requires a structured checklist format within the finding, and the LegalMetaBadge component needs a new rendering branch to display it. Flow-down (LEGAL-08) requires cross-referencing logic already supported by the `crossReferences` field. The remaining 5 clause types (LEGAL-07, LEGAL-09, LEGAL-10, LEGAL-11, LEGAL-12) follow the straightforward pattern.

**Primary recommendation:** Follow the Phase 2 pattern exactly -- one pass per clause type, self-contained schemas with all metadata REQUIRED, extend `LegalMeta` union and `convertLegalFinding()` switch. Group implementation into 2 plans: (1) schemas + passes + backend merge for all 7 types, (2) UI extensions for insurance checklist and any new metadata display needs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Insurance checklist format (LEGAL-06):** Two-part output: one summary checklist finding PLUS individual Critical/High findings for specific gaps or unusual requirements. Checklist covers standard glazing sub coverages: CGL, commercial umbrella, auto liability, workers comp, builder's risk/installation floater. CGL limit threshold: flag when contract requires more than $1M per occurrence / $2M aggregate. List all required endorsements (additional insured, waiver of subrogation, primary/non-contributory); flag endorsements that are non-standard or hard to obtain for glazing work. Certificate holder details extracted into the checklist.
- **Termination severity calibration (LEGAL-07):** Termination for convenience with no compensation = Critical. Termination for convenience with partial payment = High. Termination for cause with short cure period (<7 days) = High. Standard for-cause termination with reasonable cure period = Medium. Analysis includes: types, notice periods, compensation upon termination, cure periods.
- **Flow-down analysis (LEGAL-08):** Flag the flow-down clause itself, then trace which specific prime contract obligations flow down that are problematic for a glazing sub (schedule penalties, warranty periods, insurance beyond sub's coverage). Blanket flow-down of ALL prime contract terms = Critical. Flow-down imposing obligations beyond sub's scope or insurance = High. Flow-down of specific relevant sections = Medium. Targeted flow-down with exceptions = Low. When flow-down references a prime contract the sub doesn't have: create a High finding noting the sub is bound by terms they may not have seen. Cross-reference flow-down findings with related findings in other categories.
- **No-damage-for-delay severity (LEGAL-09):** Absolute no-damage-for-delay (sub waives ALL delay claims) = Critical. Broad waiver with narrow exceptions = High. Waiver with reasonable exceptions (owner-caused delays, force majeure) = Medium.
- **Lien rights analysis (LEGAL-10):** Focus on payment-contingent waivers: unconditional waivers required BEFORE payment, waivers of retainage lien rights, broad release language. No-lien clause or unconditional waiver before payment = Critical. Broad release provisions waiving lien rights = High. Conditional waiver tied to actual payment = Low. Missing lien rights provisions = Medium. Always flag no-lien clauses even when they may be unenforceable. When governing law state is known, include statutory lien filing deadline.
- **Dispute resolution severity (LEGAL-11):** Combined venue + attorney fee analysis. Mandatory arbitration with no appeal + distant venue = Critical. Mandatory arbitration in reasonable venue = High. One-sided attorney fee clause = Critical. No fee shifting = Medium. Mutual fee shifting = Low. Analysis includes: venue, arbitration requirements, mediation steps, attorney fee shifting.
- **Change order process severity (LEGAL-12):** Combined protection + notice requirements. Unilateral change rights with no price adjustment = Critical. Proceed-pending with no payment guarantee = Critical. No written change order required = Critical. Unilateral changes with price adjustment mechanism = High. Written CO required but unreasonable timeline = High. Standard mutual change order process = Low.
- **Carrying forward from Phase 2 (locked):** Full verbatim clause quoting, industry-contextualized explanations, one finding per clause instance, flag missing protective clauses, do NOT flag absent harmful clauses, self-contained Zod schemas per clause type, all metadata fields REQUIRED, state-specific enforceability context when governing law state is known.

### Claude's Discretion
- Pass organization -- how to group 7 clause types across analysis passes (separate pass per type, or group related types)
- Prompt engineering for each clause type
- Schema field design for each new clause type's metadata
- Deduplication strategy when multiple passes may surface the same clause
- Exact format of the insurance checklist finding (structured content within the finding)
- How to detect and extract endorsement requirements from contract language
- How to identify and trace flow-down obligations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGAL-06 | Insurance requirements extracted into structured checklist -- coverage types, limits, endorsements, certificate holder details | Insurance pass schema with `InsuranceChecklistMeta` containing checklist items array, endorsements array, certificateHolder; domain research on standard glazing sub coverages and CGL thresholds |
| LEGAL-07 | Termination clauses analyzed -- types, notice periods, compensation upon termination, cure periods | Termination pass schema with `TerminationMeta` containing terminationType, noticePeriod, compensation, curePeriod; domain research on for-cause vs for-convenience severity patterns |
| LEGAL-08 | Flow-down provisions identified with warnings about obligations beyond sub's scope or insurance coverage | Flow-down pass schema with `FlowDownMeta` containing flowDownScope, problematicObligations, primeContractAvailable; existing `crossReferences` field used for cross-category linking |
| LEGAL-09 | No-damage-for-delay clauses detected and flagged with severity | No-damage-for-delay pass schema with `NoDamageForDelayMeta` containing waiverScope, exceptions array; domain research on enforceability exceptions |
| LEGAL-10 | Lien rights risks identified -- no-lien clauses, unconditional waiver language, broad release provisions | Lien rights pass schema with `LienRightsMeta` containing waiverType, lienFilingDeadline, enforceabilityContext; domain research on conditional vs unconditional waivers and state statutory deadlines |
| LEGAL-11 | Dispute resolution terms analyzed -- venue, arbitration requirements, mediation steps, attorney fee shifting | Dispute resolution pass schema with `DisputeResolutionMeta` containing mechanism, venue, feeShifting, mediationRequired; domain research on arbitration vs litigation impact |
| LEGAL-12 | Change order process analyzed -- unilateral change rights, notice requirements, pricing mechanisms, proceed-pending clauses | Change order pass schema with `ChangeOrderMeta` containing changeType, noticeRequired, pricingMechanism, proceedPending; domain research on duty-to-proceed risks |
</phase_requirements>

## Standard Stack

### Core (already in project -- no changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.78.0 | Claude API client | Already integrated, supports structured outputs via beta.messages |
| `zod` | ^3.25.76 | Schema definition | Already used for all analysis pass schemas |
| `zod-to-json-schema` | ^3.25.1 | Zod-to-JSON-Schema conversion | Required because SDK's `zodOutputFormat` needs Zod v4; project uses v3 |

### No New Dependencies Needed
Phase 3 requires zero new npm packages. All work is schema extension, prompt engineering, and minor UI updates using existing libraries. This is identical to Phase 2 in scope pattern.

## Architecture Patterns

### Pass Organization: One Pass Per Clause Type (RECOMMENDED)

**What:** Create 7 new analysis passes, one per clause type: `legal-insurance`, `legal-termination`, `legal-flow-down`, `legal-no-damage-delay`, `legal-lien-rights`, `legal-dispute-resolution`, `legal-change-order`.

**Why 7 separate passes instead of grouping:**
1. **Established pattern:** Phase 2 used one pass per clause type. Consistency reduces cognitive overhead and bug risk.
2. **Token budget:** Insurance checklist findings with full endorsement lists + clause quoting can be lengthy. Grouping insurance with termination in one pass risks token truncation.
3. **Parallel execution:** All 14 passes (3 general + 4 Phase 2 legal + 7 Phase 3 legal) run via `Promise.allSettled()` in parallel. Total time is bounded by the slowest pass (~15-30 seconds), not the sum.
4. **Partial failure resilience:** If one clause type analysis fails, the other 13 still succeed.
5. **Prompt focus:** The more clause types crammed into one prompt, the worse the extraction quality. Single-focus prompts with mandatory severity rules produce the most reliable results.

**Pass count impact:** Going from 7 to 14 parallel API calls. All reference the same cached file via Files API (`cache_control: { type: 'ephemeral' }`), so the PDF is processed only once. Incremental cost is primarily output tokens. Even Tier 1 Anthropic API rate limits support 50+ RPM, so 14 concurrent requests is well within limits.

**Vercel timeout:** `vercel.json` sets `maxDuration: 120`. Since passes run in parallel, total time is bounded by the slowest pass. Individual passes complete in 10-30 seconds. 14 parallel passes should complete well within 120 seconds. The risk is if the Anthropic API queues requests during high load, adding latency. Mitigation: `Promise.allSettled()` already handles failures gracefully -- a timed-out pass produces an error finding, not a crash.

### Category Assignment for New Clause Types

Based on Phase 2 patterns and the nature of each clause type:

| Pass Name | Category |
|-----------|----------|
| `legal-insurance` | `Insurance Requirements` |
| `legal-termination` | `Legal Issues` |
| `legal-flow-down` | `Legal Issues` |
| `legal-no-damage-delay` | `Legal Issues` |
| `legal-lien-rights` | `Financial Terms` |
| `legal-dispute-resolution` | `Legal Issues` |
| `legal-change-order` | `Contract Compliance` |

### Schema Extension Strategy

**Same approach as Phase 2:** Each new pass gets its own self-contained Zod schema with all metadata fields as REQUIRED. The `LegalMeta` discriminated union in `src/types/contract.ts` gains 7 new variants. The `convertLegalFinding()` switch statement in `api/analyze.ts` gains 7 new cases.

**Schema complexity budget:** Each pass is a separate API request with its own schema. No risk of hitting the 24-optional-parameter or 16-union-type limits. Each pass schema has 0 optional parameters (all metadata fields are required).

### Insurance Checklist Schema Design (LEGAL-06 -- most complex)

The insurance pass produces TWO types of findings:
1. **One summary checklist finding** with structured metadata listing all coverage requirements
2. **Individual findings** for specific gaps or unusual requirements (at Critical/High severity)

The checklist finding schema needs an array of coverage items, each with type, required limit, and whether the contract specifies it. The endorsements list captures additional insured, waiver of subrogation, primary/non-contributory, and any non-standard endorsements.

```typescript
// Recommended schema fields for InsuranceChecklistMeta
{
  clauseType: 'insurance',
  coverageItems: [{
    coverageType: string,      // e.g., "CGL", "Commercial Umbrella", "Auto Liability", "Workers Comp", "Builder's Risk"
    requiredLimit: string,     // e.g., "$1M per occurrence / $2M aggregate"
    isAboveStandard: boolean,  // true if above CGL $1M/$2M threshold
  }],
  endorsements: [{
    endorsementType: string,   // e.g., "Additional Insured", "Waiver of Subrogation", "Primary/Non-Contributory"
    isNonStandard: boolean,    // true if hard to obtain for glazing work
  }],
  certificateHolder: string,   // extracted certificate holder details
}
```

**Implementation consideration:** Because Zod schemas for structured outputs do not support `.min()/.max()`, the arrays can be empty if no coverage items are found. The prompt must instruct Claude to always populate the checklist even when nothing is found (e.g., "No CGL requirement specified" as a coverage item).

### Termination Schema Design (LEGAL-07)

```typescript
{
  clauseType: 'termination',
  terminationType: 'for-convenience' | 'for-cause' | 'mutual',
  noticePeriod: string,        // e.g., "30 days written notice", "Not specified"
  compensation: string,        // e.g., "Payment for work completed only", "No compensation", "Full payment plus profit"
  curePeriod: string,          // e.g., "7 days", "14 days", "Not specified", "N/A (for-convenience)"
}
```

### Flow-Down Schema Design (LEGAL-08)

```typescript
{
  clauseType: 'flow-down',
  flowDownScope: 'blanket' | 'specific-sections' | 'targeted-with-exceptions',
  problematicObligations: string[],  // List of dangerous obligations flowing down
  primeContractAvailable: boolean,   // Whether the sub has seen the prime contract
}
```

### No-Damage-for-Delay Schema Design (LEGAL-09)

```typescript
{
  clauseType: 'no-damage-delay',
  waiverScope: 'absolute' | 'broad-with-exceptions' | 'reasonable-exceptions',
  exceptions: string[],         // Listed exceptions (e.g., "owner-caused delays", "force majeure")
  enforceabilityContext: string, // State-specific enforceability info
}
```

### Lien Rights Schema Design (LEGAL-10)

```typescript
{
  clauseType: 'lien-rights',
  waiverType: 'no-lien-clause' | 'unconditional-before-payment' | 'broad-release' | 'conditional' | 'missing',
  lienFilingDeadline: string,    // Statutory deadline if governing law state known, else "Unknown - check state law"
  enforceabilityContext: string, // State-specific context on enforceability
}
```

### Dispute Resolution Schema Design (LEGAL-11)

```typescript
{
  clauseType: 'dispute-resolution',
  mechanism: 'mandatory-arbitration' | 'litigation' | 'mediation-then-arbitration' | 'mediation-then-litigation' | 'unspecified',
  venue: string,                 // e.g., "Dallas, TX", "Owner's principal place of business", "Not specified"
  feeShifting: 'one-sided' | 'mutual' | 'none' | 'unspecified',
  mediationRequired: boolean,
}
```

### Change Order Schema Design (LEGAL-12)

```typescript
{
  clauseType: 'change-order',
  changeType: 'unilateral-no-adjustment' | 'unilateral-with-adjustment' | 'mutual' | 'unspecified',
  noticeRequired: string,        // e.g., "Written notice within 7 days", "No notice requirement", "Oral changes binding"
  pricingMechanism: string,      // e.g., "Unit prices", "Cost-plus markup", "Negotiated", "Not specified"
  proceedPending: boolean,       // true if sub must proceed before CO approval
}
```

### LegalMeta Union Extension

The existing `LegalMeta` type in `src/types/contract.ts` is a discriminated union on `clauseType`. Add 7 new variants:

```typescript
export type LegalMeta =
  // Existing Phase 2 types
  | { clauseType: 'indemnification'; ... }
  | { clauseType: 'payment-contingency'; ... }
  | { clauseType: 'liquidated-damages'; ... }
  | { clauseType: 'retainage'; ... }
  // New Phase 3 types
  | { clauseType: 'insurance'; coverageItems: InsuranceCoverageItem[]; endorsements: InsuranceEndorsement[]; certificateHolder: string }
  | { clauseType: 'termination'; terminationType: string; noticePeriod: string; compensation: string; curePeriod: string }
  | { clauseType: 'flow-down'; flowDownScope: string; problematicObligations: string[]; primeContractAvailable: boolean }
  | { clauseType: 'no-damage-delay'; waiverScope: string; exceptions: string[]; enforceabilityContext: string }
  | { clauseType: 'lien-rights'; waiverType: string; lienFilingDeadline: string; enforceabilityContext: string }
  | { clauseType: 'dispute-resolution'; mechanism: string; venue: string; feeShifting: string; mediationRequired: boolean }
  | { clauseType: 'change-order'; changeType: string; noticeRequired: string; pricingMechanism: string; proceedPending: boolean };
```

### LegalMetaBadge UI Extension

The `LegalMetaBadge` component currently has 4 rendering branches (one per Phase 2 clause type). Add 7 new branches. Most are straightforward pill-based displays. The insurance checklist is the most complex -- it needs to render a checklist of coverage items with status indicators and endorsement pills.

**Insurance checklist rendering approach:**
- Coverage items: render as a mini-table or checklist with green/red indicators for standard vs above-standard limits
- Endorsements: render as pills (green for standard, amber/red for non-standard)
- Certificate holder: render as plain text below the endorsements

### Deduplication Strategy

**No changes needed.** The existing composite-key dedup (`clauseReference + category`) with title-based fallback already handles overlap between general passes and specialized legal passes. The new legal passes use different categories from each other (Insurance Requirements, Legal Issues, Financial Terms, Contract Compliance), so they won't collide with each other. They may collide with the general `risk-overview` or `scope-financial` passes -- existing dedup logic correctly prefers `legal-*` passes over general ones.

### Recommended Project Structure for Changes

```
src/
  schemas/
    legalAnalysis.ts        # MODIFY: Add 7 new finding schemas and pass result schemas
  types/
    contract.ts             # MODIFY: Extend LegalMeta union with 7 new variants + supporting types
  components/
    LegalMetaBadge.tsx       # MODIFY: Add 7 new rendering branches
    FindingCard.tsx          # NO CHANGE: Already renders legalMeta via LegalMetaBadge
    ClauseQuote.tsx          # NO CHANGE: Already handles clause text display

api/
  analyze.ts                # MODIFY: Add 7 new passes to ANALYSIS_PASSES, extend convertLegalFinding() switch
```

### Anti-Patterns to Avoid

- **Grouping clause types into combined passes:** Reduces extraction quality and risks token truncation. Keep one pass per type.
- **Adding optional fields to pass schemas:** All metadata fields must be REQUIRED in pass schemas. Optional fields burn through the 24-parameter complexity budget unnecessarily.
- **Modifying existing Phase 2 pass prompts:** Do not change existing legal pass prompts (indemnification, payment-contingency, liquidated-damages, retainage). They are working correctly.
- **Complex nested objects in schemas:** Keep schemas flat. Arrays of simple objects are fine (insurance coverage items), but avoid nested objects-within-objects which increase grammar compilation complexity.
- **Hardcoding state-specific legal rules:** Let Claude's training handle state-specific context. The prompt should instruct Claude to provide state context when governing law is known, not embed a state law database.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Insurance coverage gap detection | Hardcoded coverage checklist comparison | Claude prompt with standard coverage benchmarks in system prompt | Coverage requirements vary by contract; let the LLM understand context |
| Flow-down obligation tracing | AST/tree-based clause dependency analysis | Claude with focused prompt to identify problematic flow-down obligations | Contract language is too varied for rule-based parsing |
| Lien filing deadline lookup | State law database with statutory deadlines | Claude's training knowledge + prompt to include when governing law state is known | Deadlines change with legislation; Claude has broad legal knowledge; app should note uncertainty |
| Dispute resolution venue assessment | Geographic distance calculation | Claude's contextual judgment on "distant venue" + prompt guidance | "Distant" is relative to sub's location which isn't known at analysis time |
| Change order classification | Keyword matching for "unilateral", "proceed" | Claude with focused prompt and classification rules | Contract language for change orders is highly varied |

**Key insight:** All 7 clause types follow the same principle as Phase 2 -- prompt engineering quality determines analysis quality. The structured schema ensures the output is consistently shaped; the prompt determines whether the content is correct.

## Common Pitfalls

### Pitfall 1: Insurance Checklist Producing Empty Arrays
**What goes wrong:** Claude returns an empty `coverageItems` array when the contract doesn't have an explicit insurance section, even though insurance requirements may be scattered across other sections.
**Why it happens:** Insurance requirements in subcontracts can appear in the insurance section, the general conditions, exhibits/attachments, or flow-down provisions. Claude may only look in the obvious places.
**How to avoid:** Prompt must instruct: "Search the ENTIRE contract for insurance requirements, including exhibits, attachments, general conditions, and flow-down provisions. Insurance requirements may not be in a section labeled 'Insurance.'" Also instruct to produce a finding noting the absence if genuinely no insurance requirements are found.
**Warning signs:** Many contracts returning zero coverage items when they almost certainly have insurance requirements.

### Pitfall 2: Token Truncation With 14 Parallel Passes
**What goes wrong:** With 14 passes all returning results, the merged response to the client exceeds Vercel's response body size limits or causes client-side parsing issues.
**Why it happens:** Each legal pass can produce findings with long verbatim clause text. 14 passes with 2-3 findings each = 28-42 findings, each with potentially multi-paragraph clauseText.
**How to avoid:** This is unlikely to be an actual problem -- Vercel has no hard response size limit for JSON, and the client already handles variable-length findings. But monitor total response sizes. If needed, the client could paginate or lazy-load finding details.
**Warning signs:** Slow client-side rendering, very large response payloads (>1MB JSON).

### Pitfall 3: Flow-Down Cross-Reference Quality
**What goes wrong:** Flow-down findings reference other categories (e.g., "See insurance findings") but the referenced findings don't exist because that pass failed or found nothing.
**Why it happens:** Passes run in parallel without knowledge of each other's results. The flow-down pass can't know what the insurance pass found.
**How to avoid:** The `crossReferences` field should reference contract SECTIONS (e.g., "Section 12.3 - Insurance"), not other findings. Cross-referencing is about contract structure, not analysis results. The prompt should instruct: "Reference the contract sections that interact with this flow-down clause, not other analysis findings."
**Warning signs:** crossReferences containing finding titles instead of contract section references.

### Pitfall 4: Severity Miscalibration Across 11 Legal Passes
**What goes wrong:** With 11 total legal passes (4 Phase 2 + 7 Phase 3), inconsistent severity assignment inflates or deflates the deterministic risk score.
**Why it happens:** Each pass prompt has its own severity rules. If one pass is more aggressive in severity assignment than others, the risk score skews.
**How to avoid:** Each pass prompt includes EXACT mandatory severity calibration rules (from CONTEXT.md decisions). Use explicit language: "You MUST follow these severity rules exactly." Test with sample contracts to verify calibration.
**Warning signs:** Risk scores consistently above 80 on moderate contracts; one clause type dominating the score.

### Pitfall 5: Duplicate Findings Between New and Existing Passes
**What goes wrong:** The `scope-financial` general pass already surfaces change order findings. The new `legal-change-order` pass finds the same clauses. Both appear in results.
**Why it happens:** Dedup uses `clauseReference + category` as composite key. If the general pass assigns a different category than the legal pass, both survive dedup.
**How to avoid:** The dedup logic already prefers `legal-*` passes over general ones when the composite key matches. But category mismatches need attention. The `legal-change-order` pass assigns `Contract Compliance` while `scope-financial` may assign `Financial Terms` for the same clause. Title-based fallback dedup (Phase 2 of dedup logic) catches this, but verify it works correctly.
**Warning signs:** Similar-titled findings appearing twice with different categories.

### Pitfall 6: Lien Filing Deadline Hallucination
**What goes wrong:** Claude provides a specific lien filing deadline (e.g., "90 days in California") that is incorrect or outdated.
**Why it happens:** State lien filing deadlines are complex (they vary by project type, contractor tier, and whether a Notice of Completion was filed). Claude's training data may have simplified or outdated information.
**How to avoid:** Prompt should instruct: "Provide general guidance on the statutory lien filing deadline. Note that exact deadlines may vary based on project type, contractor tier, and notice filings. Always recommend consulting a construction attorney for precise deadlines." This sets expectations without making definitive claims.
**Warning signs:** Very specific deadline claims without caveats; deadlines that don't match current state statutes.

## Code Examples

### New Legal Pass Schema (Insurance Example)
```typescript
// File: src/schemas/legalAnalysis.ts
// Follow exact pattern of existing schemas: self-contained, all fields REQUIRED

const InsuranceCoverageItemSchema = z.object({
  coverageType: z.string(),
  requiredLimit: z.string(),
  isAboveStandard: z.boolean(),
});

const InsuranceEndorsementSchema = z.object({
  endorsementType: z.string(),
  isNonStandard: z.boolean(),
});

export const InsuranceFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Insurance Requirements'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  coverageItems: z.array(InsuranceCoverageItemSchema),
  endorsements: z.array(InsuranceEndorsementSchema),
  certificateHolder: z.string(),
});

export const InsurancePassResultSchema = z.object({
  findings: z.array(InsuranceFindingSchema),
  dates: z.array(ContractDateSchema),
});
```

### New Legal Pass Schema (Termination Example)
```typescript
export const TerminationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  terminationType: z.enum(['for-convenience', 'for-cause', 'mutual']),
  noticePeriod: z.string(),
  compensation: z.string(),
  curePeriod: z.string(),
});

export const TerminationPassResultSchema = z.object({
  findings: z.array(TerminationFindingSchema),
  dates: z.array(ContractDateSchema),
});
```

### convertLegalFinding Extension Pattern
```typescript
// In api/analyze.ts, extend the switch statement:
case 'legal-insurance':
  base.legalMeta = {
    clauseType: 'insurance',
    coverageItems: (finding.coverageItems as Array<{ coverageType: string; requiredLimit: string; isAboveStandard: boolean }>),
    endorsements: (finding.endorsements as Array<{ endorsementType: string; isNonStandard: boolean }>),
    certificateHolder: finding.certificateHolder as string,
  };
  break;
case 'legal-termination':
  base.legalMeta = {
    clauseType: 'termination',
    terminationType: finding.terminationType as string,
    noticePeriod: finding.noticePeriod as string,
    compensation: finding.compensation as string,
    curePeriod: finding.curePeriod as string,
  };
  break;
// ... 5 more cases following the same pattern
```

### Insurance Checklist LegalMetaBadge Rendering
```typescript
// In src/components/LegalMetaBadge.tsx, add insurance branch:
{meta.clauseType === 'insurance' && (
  <div>
    <div className="space-y-1 mb-2">
      {meta.coverageItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${item.isAboveStandard ? 'bg-amber-400' : 'bg-green-400'}`} />
          <span className="font-medium text-slate-700">{item.coverageType}:</span>
          <span className="text-slate-600">{item.requiredLimit}</span>
          {item.isAboveStandard && (
            <span className={`${pillBase} bg-amber-100 text-amber-700`}>Above Standard</span>
          )}
        </div>
      ))}
    </div>
    {meta.endorsements.length > 0 && (
      <div className="flex flex-wrap items-center gap-1 mb-1">
        {meta.endorsements.map((end, i) => (
          <span key={i} className={`${pillBase} ${end.isNonStandard ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {end.endorsementType}
          </span>
        ))}
      </div>
    )}
    {meta.certificateHolder && (
      <p className="text-xs text-slate-500 mt-1">
        Certificate Holder: {meta.certificateHolder}
      </p>
    )}
  </div>
)}
```

### Analysis Pass Definition (Insurance Example)
```typescript
// In api/analyze.ts ANALYSIS_PASSES array:
{
  name: 'legal-insurance',
  isOverview: false,
  isLegal: true,
  schema: InsurancePassResultSchema,
  systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL insurance requirements in this contract.

## What to Find
- Required coverage types (CGL, umbrella, auto, workers comp, builder's risk, installation floater)
- Coverage limits and whether they exceed industry standard for glazing subs
- Required endorsements (additional insured, waiver of subrogation, primary/non-contributory)
- Certificate holder requirements
- Insurance certificate submission deadlines
- Any coverage requirements that are non-standard or difficult to obtain for glazing work

## Two-Part Output
1. **One summary checklist finding** that lists ALL insurance requirements in the contract as a structured checklist. This finding should have severity based on the MOST concerning requirement.
2. **Individual findings** for each specific gap or unusual requirement (e.g., coverage above standard limits, non-standard endorsements). One finding per issue, at Critical or High severity.

## Coverage Standards for Glazing Subcontractors
- CGL: $1M per occurrence / $2M aggregate is industry standard
- Commercial umbrella: $2M-$5M is typical
- Auto liability: $1M CSL is typical
- Workers compensation: statutory limits are standard
- Builder's risk / installation floater: depends on project scope

## Severity Rules (MANDATORY)
- Contract requires CGL above $1M per occurrence / $2M aggregate = High (flag as above standard)
- Non-standard endorsements that are difficult to obtain = High
- Missing insurance section entirely = Medium (flag as gap)

## Search the ENTIRE Contract
Insurance requirements may appear in the insurance section, general conditions, exhibits, attachments, or flow-down provisions. Do not limit your search to sections labeled "Insurance."

## Output Rules
- The summary checklist finding must populate coverageItems and endorsements arrays fully
- Individual gap/issue findings may have empty coverageItems/endorsements arrays (they focus on the specific issue in their description)
- Always include the section/article number in clauseReference
- Include certificate holder details in the certificateHolder field
- Explain why requirements matter specifically to a glazing sub`,
  userPrompt: 'Analyze all insurance requirements in this glazing subcontract. Produce a summary checklist and individual findings for gaps or unusual requirements.',
},
```

## Domain Knowledge: 7 New Clause Types

### Insurance Requirements for Glazing Subcontractors (HIGH confidence)

Standard coverage a glazing sub typically carries:
- **CGL:** $1M per occurrence / $2M aggregate (industry standard). Some GCs now require $2M per occurrence as litigation costs rise.
- **Commercial Umbrella:** $2M-$5M depending on project size
- **Auto Liability:** $1M combined single limit
- **Workers Compensation:** Statutory limits + Employers Liability $500K/$500K/$500K or $1M
- **Builder's Risk / Installation Floater:** Project-dependent; covers glazing materials during installation

Standard endorsements:
- **Additional Insured:** CG 20 10 and CG 20 37 (on an occurrence basis). This is standard and routinely obtainable.
- **Waiver of Subrogation:** Standard, routinely obtainable. GCs increasingly verify it is actually attached to the policy.
- **Primary/Non-Contributory:** Standard endorsement. Makes the sub's policy primary over the GC's policy.

Non-standard endorsements that may be difficult for glazing subs:
- Completed operations coverage for extended periods (beyond 2-3 years)
- Per-project aggregate endorsements on small contracts
- Professional liability (typically not carried by glazing subs unless they do design-build)

### Termination Clauses (HIGH confidence)

Two main types:
- **For Convenience:** Owner/GC can terminate at any time without fault. Sub is typically entitled to payment for work performed + overhead/profit on terminated work. If no compensation is specified, this is extremely dangerous (Critical).
- **For Cause (Default):** Termination after material breach + notice + opportunity to cure. Standard cure periods are 7-14 days. Less than 7 days is unreasonably short for most construction work, especially glazing which requires material lead times.

Key analysis points:
- Notice period: how many days written notice before termination takes effect
- Cure period: how many days the breaching party has to fix the problem
- Compensation upon termination: what the sub gets paid after termination
- Whether only one party has termination rights (one-sided vs mutual)
- Whether the GC can convert a for-cause termination to for-convenience (common in AIA contracts)

### Flow-Down Provisions (HIGH confidence)

Flow-down clauses incorporate prime contract terms into the subcontract. Three common patterns:
- **Blanket flow-down:** "All terms and conditions of the Prime Contract apply to Subcontractor to the extent applicable." This is the most dangerous -- the sub is bound by terms they may not have seen.
- **Specific section flow-down:** Lists specific prime contract sections that apply. Less risky because scope is defined.
- **Targeted with exceptions:** Flows down specific terms but carves out exceptions for items not applicable to the sub's scope.

Dangerous obligations that commonly flow down:
- Schedule penalties and liquidated damages from the prime contract
- Warranty periods that exceed the sub's standard warranty
- Insurance requirements that exceed the sub's standard coverage
- Indemnification obligations broader than the sub negotiated

Key detection signal: "The Subcontractor shall be bound by and comply with all terms and conditions of the Prime Contract insofar as they apply to the Work of this Subcontract."

### No-Damage-for-Delay (HIGH confidence)

These clauses attempt to waive the sub's right to claim monetary damages for delays caused by others. Instead, the sub's only remedy is a time extension (more days to complete, but no additional compensation for extended overhead, labor escalation, etc.).

Enforceability varies by state:
- **States that prohibit or limit:** Colorado, Washington, Oregon, Virginia ("unreasonable" delays), Ohio, North Carolina, Louisiana, Missouri (public contracts), New Jersey (negligence/bad faith), Indiana (unforeseen conditions)
- **Common judicial exceptions even in enforcing states:**
  - Active interference by the owner/GC
  - Bad faith or willful misconduct
  - Unreasonable delays (courts have found 2.5 years unreasonable)
  - Delays not contemplated by the parties at contract formation

Three severity tiers (per user decisions):
- Absolute waiver of ALL delay claims = Critical
- Broad waiver with narrow exceptions = High
- Waiver with reasonable exceptions (owner-caused, force majeure) = Medium

### Lien Rights (HIGH confidence)

Mechanic's liens are a subcontractor's strongest payment leverage -- the right to place a lien on the property for unpaid work. Contracts that waive these rights strip the sub of critical protection.

Four types of lien waivers:
- **Conditional on progress payment:** Rights waived only after payment is actually received. This is standard and LOW risk.
- **Unconditional on progress payment:** Rights waived upon execution, regardless of whether payment was received. HIGH risk -- sub loses leverage before being paid.
- **Conditional on final payment:** Same as above but for final payment including retainage.
- **Unconditional on final payment:** Most dangerous -- waives all remaining rights before final payment confirmed.

State enforceability varies enormously:
- Some states (e.g., Maryland) prohibit lien right waivers in executory contracts entirely
- Some states (e.g., California) mandate statutory waiver forms
- Some states (e.g., Virginia) allow broad lien waivers in prime contracts
- Most states have specific lien filing deadlines (typically 30-120 days after last work performed)

### Dispute Resolution (HIGH confidence)

Key elements:
- **Arbitration vs Litigation:** Arbitration is private, typically faster, but limited appeal rights and higher upfront costs. Mandatory arbitration with no appeal can lock the sub into an unfavorable process.
- **Venue:** Where disputes must be resolved. A sub in Phoenix forced to arbitrate in New York faces significant travel costs and inconvenience.
- **Mediation:** Pre-arbitration/pre-litigation mediation step. Generally positive -- encourages settlement.
- **Attorney fee shifting:**
  - One-sided (only sub pays if sub loses, or "loser pays") = Critical risk
  - No fee shifting (American Rule -- each party pays own fees) = Medium
  - Mutual fee shifting (prevailing party recovers fees) = Low risk (incentivizes strong cases)

### Change Order Process (HIGH confidence)

Key risk areas:
- **Unilateral change rights:** Owner/GC can order changes without sub's agreement. If no price adjustment mechanism exists, the sub absorbs costs.
- **Proceed-pending clauses:** Sub must continue working on changed scope before a change order is formally approved and priced. If no payment guarantee exists, the sub is performing at risk.
- **Written change order requirement:** If oral changes are binding, the sub may be accused of agreeing to scope changes without documentation. Critical risk.
- **Notice requirements:** If the sub must give written notice within X days of a change or lose the right to claim additional compensation. Unreasonably short timelines (< 3 days) are HIGH risk.
- **Pricing mechanisms:** How changes are priced (unit prices, cost-plus, negotiated, GC-determined). GC-determined pricing with no appeal = HIGH risk.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single analysis pass | Multi-pass with structured outputs | Phase 1 (2026-03-03) | Foundation for specialized legal passes |
| 3 general passes | 7 passes (3 general + 4 legal) | Phase 2 (2026-03-04) | Established one-pass-per-clause-type pattern |
| 4 Phase 2 legal types | 11 legal types (4 Phase 2 + 7 Phase 3) | Phase 3 (this phase) | Complete coverage of major glazing sub risk areas |
| Flat findings without metadata | Structured legalMeta per finding | Phase 2 (2026-03-04) | Type-specific analysis rendered in UI |

**No technology changes needed.** Phase 3 is purely additive -- same libraries, same patterns, same architecture. The innovation is in the prompt engineering and schema design for 7 new clause types.

## Open Questions

1. **Insurance checklist finding format**
   - What we know: The schema will have `coverageItems` and `endorsements` arrays on the finding. The summary checklist finding uses these arrays; individual gap findings may have them empty or minimal.
   - What's unclear: Whether the LLM will consistently produce one well-structured summary finding + separate gap findings as instructed, or merge them.
   - Recommendation: Explicit prompt structure with numbered steps ("Step 1: Create the summary checklist finding. Step 2: Create individual findings for each gap."). Test with sample contracts.

2. **Pass count impact on API costs**
   - What we know: Going from 7 to 14 passes doubles the output token cost (input tokens are cached). Each pass produces ~500-2000 output tokens.
   - What's unclear: Whether the user's Anthropic API tier will sustain 14 concurrent requests without rate limiting.
   - Recommendation: Ship with 14 separate passes. If rate limiting is observed, consider grouping related clause types (e.g., no-damage-for-delay + lien rights could share a pass since both are payment-related). But start with the clean one-per-type architecture.

3. **Risk score inflation**
   - What we know: The deterministic risk score sums severity weights (Critical=25, High=15, Medium=8, Low=3, Info=0) and caps at 100. With 11 legal passes + 3 general passes, a contract with many clause types could easily hit 100.
   - What's unclear: Whether the score needs recalibration now that there are more clause types being analyzed.
   - Recommendation: The score cap at 100 handles the upper bound. A contract that genuinely has Critical issues across multiple clause types SHOULD score 100. Monitor whether "average" contracts score unreasonably high. Score recalibration is orthogonal to this phase -- it could be done in a future optimization.

## Sources

### Primary (HIGH confidence)
- Existing project code: `api/analyze.ts`, `src/schemas/legalAnalysis.ts`, `src/types/contract.ts`, `src/components/LegalMetaBadge.tsx`, `src/components/FindingCard.tsx` -- Established patterns for pass definitions, schema design, merge logic, and UI rendering
- [Anthropic Structured Outputs Documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- Schema complexity limits, supported types, optional parameter constraints

### Secondary (MEDIUM confidence)
- [Subcontractor Insurance Requirements 2026 | Coverage Criteria](https://coveragecriteria.com/articles/subcontractor-insurance-requirements) -- Standard coverage types and limits
- [Subcontractor Insurance Requirements | BCS](https://www.getbcs.com/blog/navigating-subcontractor-insurance-requirements) -- COI tracking, endorsement requirements
- [ConsensusDocs - No Damage for Delay](https://www.consensusdocs.org/news/no-damage-for-delay-no-problem-exceptions-to-the-enforceability-of-no-damage-for-delay-clauses/) -- Enforceability exceptions across states
- [Levelset - Lien Waivers Guide](https://www.levelset.com/blog/ultimate-guide-to-lien-waivers/) -- Conditional vs unconditional waivers, state variations
- [AIA - Basics of Waivers and Releases](https://learn.aiacontracts.com/articles/6514020-the-basics-of-waivers-and-releases-of-lien-or-payment-bond-rights/) -- Four types of lien waivers
- [Construction Dive - Flow-Down Clauses](https://www.constructiondive.com/news/construction-flow-down-clauses-legal/743346/) -- Risks of blanket flow-down provisions
- [Long International - No Damages for Delay](https://www.long-intl.com/articles/no-damages/) -- Clause examples and state enforcement
- [Porter Hedges - Change Order Clause Anatomy](https://www.porterhedges.com/texas-construction-law/the-anatomy-of-a-change-order-clause) -- Change order process components
- [ConsensusDocs - Duty to Proceed](https://www.consensusdocs.org/news/when-is-it-ok-to-say-no-the-duty-to-proceed-and-right-to-stop-work/) -- Proceed-pending clause enforcement
- [Construction Law Zone - Attorney Fees in Arbitration](https://www.constructionlawzone.com/2024/07/attorneys-fees-and-the-american-arbitration-association-rule/) -- Fee shifting analysis
- [Fullertonlaw - 50-State Mechanic's Lien Summary](https://fullertonlaw.com/50-state-summary-mechanics-lien-law) -- State-by-state lien filing deadlines

### Tertiary (LOW confidence)
- None -- all findings verified with legal sources and existing project code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; extending exact patterns from Phase 2
- Architecture: HIGH -- 7 new passes follow the identical pattern of 4 existing legal passes; schema complexity budget verified against Anthropic limits
- Pitfalls: HIGH -- Based on concrete API constraints, established LLM behavior patterns, and lessons learned from Phase 2
- Domain knowledge: HIGH -- Construction legal clause types are well-documented in legal literature; classification systems are standard in the industry; multiple authoritative sources cross-referenced
- Schema design: HIGH -- Follows established Phase 2 pattern exactly; all metadata fields REQUIRED; no new optional parameters per pass

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain; API constraints and legal standards unlikely to change within 30 days)
