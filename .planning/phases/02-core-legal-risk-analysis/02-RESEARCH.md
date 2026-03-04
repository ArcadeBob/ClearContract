# Phase 2: Core Legal Risk Analysis - Research

**Researched:** 2026-03-04
**Domain:** Anthropic structured outputs, Zod schema extension, construction legal clause analysis, multi-pass prompt engineering
**Confidence:** HIGH

## Summary

Phase 2 adds four specialized legal analysis passes (indemnification, pay-if-paid/pay-when-paid, liquidated damages, retainage) to the existing multi-pass pipeline. Each pass produces findings with full verbatim clause text, plain-English explanations contextualized for glazing subcontractors, and structured metadata specific to the clause type.

The primary technical challenges are: (1) extending the Zod/JSON Schema finding structure to carry type-specific metadata without hitting Anthropic's structured output complexity limits, (2) crafting prompts that reliably extract and classify clause types with the specificity the user requires, and (3) managing deduplication between new specialized passes and existing general passes that already surface some of these clauses at a shallow level.

**Primary recommendation:** Create one dedicated analysis pass per clause type (4 new passes), each with its own Zod schema that includes type-specific metadata as required fields. Use a typed `legalMeta` optional object field on the unified FindingSchema to carry metadata post-merge, keeping total optional parameters well under the 24-parameter limit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Clause quoting:** Quote the full clause text -- entire clause/paragraph as-is, no truncation regardless of length. Always include section/article number reference (clauseReference field). Flag cross-references when a clause depends on or is modified by other sections. No length cap on quoted text.
- **Explanation style:** Industry-contextualized explanations for glazing subcontractors. Flag insurance gaps (CGL/umbrella coverage). State-specific enforceability when governing law state is specified. Contrast with standard terms so user sees what is abnormal.
- **Severity calibration:** Indemnification: Broad=Critical, Intermediate=High, Limited=Medium. Pay-if-paid=Critical, pay-when-paid=High. LD clauses: High minimum, uncapped/disproportionate=Critical. Retainage: tied to project completion=High, above 10%=High, standard 5-10% tied to sub's completion=Low, missing release conditions=Critical.
- **Finding density:** One finding per clause instance. Flag missing protective clauses (absent payment timeline, absent retainage release). Do NOT flag when a harmful clause is absent.
- **Category assignment:** Indemnification -> Legal Issues. Pay-if-paid/pay-when-paid, liquidated damages, retainage -> Financial Terms.
- **Structured metadata per clause type:**
  - Indemnification: riskType (limited/intermediate/broad), hasInsuranceGap (boolean)
  - Pay-if-paid: clauseType (pay-if-paid/pay-when-paid), enforceability context
  - Liquidated damages: amount/rate, capStatus (capped/uncapped), proportionalityAssessment
  - Retainage: percentage, releaseCondition, tiedTo (sub's work/project completion)

### Claude's Discretion
- Pass structure -- how to organize the 4 clause types across analysis passes (separate pass per type, combined, etc.)
- Prompt engineering for each clause type
- How to detect and classify indemnification types from contract language
- Deduplication strategy when multiple passes may surface the same clause
- How to handle clauses that span multiple clause types (e.g., a clause covering both LD and retainage)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGAL-01 | Every finding includes exact verbatim clause text plus plain-English explanation | Schema extension adds required `clauseText` and `explanation` fields to legal pass schemas; prompt engineering enforces full quoting |
| LEGAL-02 | Indemnification clauses identified by type (limited/intermediate/broad) with risk explanation and insurance alignment check | Dedicated indemnification pass with `IndemnificationMetaSchema`; domain research on three-type classification system |
| LEGAL-03 | Pay-if-paid and pay-when-paid provisions detected with enforceability context | Dedicated payment-contingency pass with `PaymentContingencyMetaSchema`; domain research on enforceability patterns by state |
| LEGAL-04 | Liquidated damages clauses flagged with amount/rate, proportionality, and cap status | Dedicated LD pass with `LiquidatedDamagesMetaSchema`; proportionality assessment against contract value |
| LEGAL-05 | Retainage terms extracted -- percentage, release conditions, tied-to entity | Dedicated retainage pass with `RetainageMetaSchema`; domain research on standard vs problematic retainage patterns |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.78.0 | Claude API client | Already integrated, supports structured outputs via beta.messages |
| `zod` | ^3.25.76 | Schema definition | Already used for all analysis pass schemas |
| `zod-to-json-schema` | ^3.25.1 | Zod-to-JSON-Schema conversion | Required because SDK's `zodOutputFormat` needs Zod v4; project uses v3 |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unpdf` | ^1.4.0 | PDF text extraction fallback | Already used in pipeline for large PDFs |

### No New Dependencies Needed
Phase 2 requires zero new npm packages. All work is schema extension, prompt engineering, and UI updates using existing libraries.

## Architecture Patterns

### Pass Organization: One Pass Per Clause Type (RECOMMENDED)

**What:** Create 4 new analysis passes, one per clause type: `legal-indemnification`, `legal-payment-contingency`, `legal-liquidated-damages`, `legal-retainage`.

**Why separate passes instead of one combined legal pass:**
1. **Token budget:** Full verbatim clause quoting can be lengthy. A single combined pass trying to analyze all 4 clause types with full quoting could exceed the 8192 max_tokens limit on complex contracts.
2. **Schema precision:** Each pass has its own tailored schema with type-specific metadata as required fields. This leverages structured outputs more effectively than a union type.
3. **Parallel execution:** Passes run via `Promise.allSettled()` -- 4 separate passes run in parallel with no added latency vs 1 combined pass.
4. **Partial failure resilience:** If one clause type analysis fails, the other 3 still succeed and return results.
5. **Prompt focus:** Shorter, focused prompts produce better extraction accuracy than long multi-objective prompts.

**Cost consideration:** Each additional pass is a separate API call. With 3 existing passes + 4 new = 7 total. Files API caching (`cache_control: { type: 'ephemeral' }`) means the PDF is only uploaded/processed once; subsequent passes reference the cached file. The incremental cost per pass is mainly output tokens.

### Schema Extension Strategy

**Approach: Per-pass typed schemas + unified legalMeta on merged Finding**

Each legal pass defines its own Zod schema with type-specific metadata as **required** fields:

```typescript
// Source: Anthropic structured outputs docs -- required fields avoid optional parameter limits
// Each pass schema has metadata as required fields (not optional)

// Example: Indemnification pass schema
const IndemnificationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),        // REQUIRED in legal passes (not optional)
  explanation: z.string(),         // REQUIRED in legal passes (not optional)
  crossReferences: z.array(z.string()), // Other sections this clause references
  riskType: z.enum(['limited', 'intermediate', 'broad']),
  hasInsuranceGap: z.boolean(),
});
```

After merge, type-specific fields are packed into an optional `legalMeta` object on the unified Finding:

```typescript
// Unified Finding type (extended from current)
export interface Finding {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  recommendation?: string;
  clauseReference?: string;
  clauseText?: string;       // Now populated for all legal findings
  explanation?: string;       // Now populated for all legal findings
  crossReferences?: string[]; // NEW: other sections this clause references
  legalMeta?: LegalMeta;     // NEW: type-specific structured metadata
}

// Discriminated union for clause-type-specific metadata
export type LegalMeta =
  | { clauseType: 'indemnification'; riskType: 'limited' | 'intermediate' | 'broad'; hasInsuranceGap: boolean }
  | { clauseType: 'payment-contingency'; paymentType: 'pay-if-paid' | 'pay-when-paid'; enforceabilityContext: string }
  | { clauseType: 'liquidated-damages'; amountOrRate: string; capStatus: 'capped' | 'uncapped'; proportionalityAssessment: string }
  | { clauseType: 'retainage'; percentage: string; releaseCondition: string; tiedTo: 'sub-work' | 'project-completion' | 'unspecified' };
```

**Why this approach:**
- Per-pass schemas have metadata as required fields -> 0 optional parameters per pass schema for metadata
- Unified FindingSchema adds only 2 new optional fields (`crossReferences`, `legalMeta`) beyond the existing 2 (`clauseText`, `explanation`) -> 4 total optional parameters, well within the 24 limit
- `legalMeta` as a single optional object keeps the optional parameter count low while carrying all type-specific data

### Optional Parameter Budget

Anthropic limits: 24 optional parameters, 16 union-type parameters across all schemas in a request.

Current per-pass schemas:
- `RiskOverviewResultSchema`: 0 optional at top level; FindingSchema has 2 optional (clauseText, explanation)
- `PassResultSchema`: same FindingSchema with 2 optional

Each legal pass schema: 0 optional metadata fields (all required in pass context), still has 0-2 optional for fields not relevant.

**Recommendation:** Make `clauseText` and `explanation` REQUIRED in legal pass schemas (they must always be populated per LEGAL-01). This means legal pass schemas have 0 optional parameters.

After merge, the unified FindingSchema (used for the MergedAnalysisResult) still needs optional fields because non-legal findings from existing passes may not have these fields. This schema is NOT used with structured outputs -- it's just a TypeScript interface.

**Conclusion:** No risk of hitting the 24-parameter or 16-union-type limits.

### Pass Schema Design

Each legal pass returns its own schema. The merge step maps type-specific fields into the unified `legalMeta` object.

```
Legal Pass Schemas (used with structured outputs):

IndemnificationPassResult {
  findings: IndemnificationFinding[]
  dates: ContractDate[]
}

PaymentContingencyPassResult {
  findings: PaymentContingencyFinding[]
  dates: ContractDate[]
}

LiquidatedDamagesPassResult {
  findings: LiquidatedDamagesFinding[]
  dates: ContractDate[]
}

RetainagePassResult {
  findings: RetainageFinding[]
  dates: ContractDate[]
}
```

### Merge & Deduplication Strategy

**Problem:** The existing `risk-overview` and `scope-financial` passes already surface some legal findings at a shallow level. The new specialized passes will find the same clauses but with deeper analysis.

**Strategy: Prefer specialized findings, drop shallow duplicates.**

1. **Run all passes in parallel** (existing 3 + new 4 = 7 total).
2. **Tag findings by source pass** during merge so we know which pass produced each finding.
3. **Dedup by clauseReference + category combination** (not just title):
   - If a specialized legal pass and a general pass both produce a finding for the same clauseReference + category, keep the specialized one (it has full metadata, clause text, explanation).
   - Title-based dedup remains as secondary fallback.
4. **Cross-clause handling:** If a single contract clause covers both LD and retainage, each specialized pass produces its own finding with its own metadata. This is correct per the "one finding per clause instance" rule -- the same quoted text appears in two findings with different metadata.

```typescript
// Enhanced dedup logic (pseudocode)
function deduplicateFindings(findings: TaggedFinding[]): Finding[] {
  const byClauseAndCategory = new Map<string, TaggedFinding>();

  for (const finding of findings) {
    const key = `${finding.clauseReference}::${finding.category}`;
    const existing = byClauseAndCategory.get(key);

    if (!existing) {
      byClauseAndCategory.set(key, finding);
    } else if (finding.sourcePass.startsWith('legal-') && !existing.sourcePass.startsWith('legal-')) {
      // Specialized pass beats general pass
      byClauseAndCategory.set(key, finding);
    } else if (severityRank[finding.severity] > severityRank[existing.severity]) {
      // Higher severity wins among same-type passes
      byClauseAndCategory.set(key, finding);
    }
  }

  // Also do title-based dedup as fallback
  return titleDedup(Array.from(byClauseAndCategory.values()));
}
```

### Missing-Clause Detection Pattern

Per user decision: "Flag missing protective clauses when clauses that would protect the sub are absent."

Each legal pass prompt should instruct Claude to check for expected protective clauses and create findings for their absence:

- **Payment contingency pass:** If no payment timeline specified, flag it
- **Retainage pass:** If no retainage release provision exists, flag it (severity: Critical per user calibration)
- **Indemnification pass:** If no mutual indemnification exists (only sub indemnifies GC), note this

Missing-clause findings should use a standardized clauseReference like "Not Found" or "Missing" and should NOT have clauseText (the whole point is the text is absent).

### Recommended Project Structure for New Files

```
src/
├── schemas/
│   ├── analysis.ts           # Existing: base FindingSchema, PassResultSchema
│   └── legalAnalysis.ts      # NEW: Legal pass schemas (4 clause-type schemas)
├── types/
│   └── contract.ts           # MODIFY: Add LegalMeta type, crossReferences, legalMeta to Finding
├── components/
│   ├── FindingCard.tsx        # MODIFY: Display clauseText, explanation, legalMeta
│   └── ClauseQuote.tsx        # NEW: Reusable clause text display component
└── pages/
    └── ContractReview.tsx     # MODIFY: May need layout adjustments for longer finding cards

api/
└── analyze.ts                # MODIFY: Add 4 legal passes, enhance merge logic
```

### Anti-Patterns to Avoid

- **Single mega-pass for all legal clauses:** Would hit token limits on complex contracts and produce worse extraction quality. Use separate focused passes.
- **Discriminated union in the structured output schema itself:** `anyOf` is supported but counts against the 16-union-type parameter limit and increases schema compilation complexity. Instead, use separate schemas per pass and merge into a TypeScript discriminated union post-response.
- **Making all metadata fields optional on a single schema:** Would burn through the 24-optional-parameter limit quickly and produce sparse responses where Claude skips fields.
- **Rewriting existing pass prompts:** The existing `risk-overview`, `dates-deadlines`, and `scope-financial` passes should remain unchanged. New legal passes supplement them; deduplication handles overlap.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema generation | Manual JSON Schema objects | `zod-to-json-schema` | Already established in Phase 1; Zod schemas are the source of truth |
| Indemnification classification | Keyword matching / regex | Claude prompt engineering | Legal language varies enormously; LLM understanding far exceeds pattern matching |
| Pay-if-paid detection | String search for "pay if paid" | Claude with focused prompt | Many variations: "payment contingent upon", "condition precedent to payment", etc. |
| State enforceability lookup | Hardcoded state law database | Claude's training knowledge + prompt to note governing law | State laws change; Claude has broad legal training data; the app should note uncertainty rather than assert specific state law |

**Key insight:** The AI analysis is the product. Prompt engineering quality directly determines user value. Invest effort in prompt specificity, not in pre/post-processing logic.

## Common Pitfalls

### Pitfall 1: Token Truncation on Long Contracts
**What goes wrong:** Complex contracts with many indemnification clauses produce responses exceeding `max_tokens`, resulting in `stop_reason: "max_tokens"` and invalid/incomplete JSON.
**Why it happens:** Full clause quoting with no length cap can generate very long responses. A contract with 5 indemnification clauses, each with a multi-paragraph quoted text plus explanation, can easily exceed 8192 tokens.
**How to avoid:** Increase `MAX_TOKENS_PER_PASS` for legal passes. 8192 should be sufficient for most contracts since each legal pass focuses on a single clause type (typically 1-3 instances per contract). But monitor `stop_reason` in responses and log warnings when truncation occurs.
**Warning signs:** `stop_reason: "max_tokens"` in API response; JSON parse errors on legal pass results.

### Pitfall 2: Severity Miscalibration
**What goes wrong:** Claude assigns severity based on its own judgment rather than the user's calibration rules (e.g., marking pay-when-paid as Critical instead of High).
**Why it happens:** Claude's default legal risk assessment may not match the specific calibration rules.
**How to avoid:** Include the EXACT severity calibration rules in each pass's system prompt. Use explicit language: "You MUST assign severity as follows: [rules]". Test with known contract samples.
**Warning signs:** Severity distribution doesn't match expected patterns; broad-form indemnification not marked Critical.

### Pitfall 3: Hallucinated Clause Text
**What goes wrong:** Claude generates plausible-sounding but fabricated clause text instead of quoting verbatim from the contract.
**Why it happens:** LLMs can paraphrase or reconstruct text from memory rather than extracting exact quotes.
**How to avoid:** Prompt engineering: "Quote the EXACT text as it appears in the contract. Do not paraphrase, summarize, or reconstruct. If you cannot locate the exact text, state that the clause was detected but exact text could not be extracted." The Files API with native PDF upload helps because Claude sees the actual document, not lossy text extraction.
**Warning signs:** Clause text that reads too cleanly (no typos, consistent formatting) when the source contract likely has formatting artifacts.

### Pitfall 4: Overlap Between General and Legal Passes
**What goes wrong:** User sees duplicate findings -- one shallow from `risk-overview`, one deep from `legal-indemnification` -- for the same clause.
**Why it happens:** The existing `risk-overview` and `scope-financial` passes already surface legal clauses at a high level. New specialized passes find the same clauses with more detail.
**How to avoid:** Enhanced deduplication in `mergePassResults()` using clauseReference + category as composite key, preferring specialized pass findings over general ones.
**Warning signs:** Finding count doubles after adding legal passes; user sees "Broad Indemnification Clause" twice with different detail levels.

### Pitfall 5: Missing-Clause False Positives
**What goes wrong:** Claude flags a "missing retainage release provision" when the provision exists in a different section or under a different name.
**Why it happens:** Contracts use varied terminology. "Release of retention" vs "retainage disbursement" vs "final payment including withheld amounts."
**How to avoid:** Prompt Claude to search the ENTIRE contract before concluding a protective clause is missing. Use language: "Search all sections of the contract before concluding this clause is absent. Contracts may use alternative terminology."
**Warning signs:** High rate of "missing clause" findings on contracts that actually contain the provisions.

### Pitfall 6: Structured Output Schema Compilation Timeout
**What goes wrong:** API returns 400 "Schema is too complex for compilation" or compilation takes >180 seconds.
**Why it happens:** Too many optional parameters, union types, or deeply nested objects across all schemas in the request.
**How to avoid:** Each pass makes its own API call with its own schema. Schemas are simple (flat objects, no unions, metadata as required fields). The 24-optional and 16-union limits apply per-request, and each pass is a separate request.
**Warning signs:** 400 errors on schema compilation; slow first-request times.

## Code Examples

### Legal Pass Schema Definition
```typescript
// Source: Anthropic structured outputs docs + existing project pattern
// File: src/schemas/legalAnalysis.ts

import { z } from 'zod';

const SeverityEnum = z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']);
const DateTypeEnum = z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']);

const ContractDateSchema = z.object({
  label: z.string(),
  date: z.string(),
  type: DateTypeEnum,
});

// --- Indemnification Finding Schema ---
export const IndemnificationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  riskType: z.enum(['limited', 'intermediate', 'broad']),
  hasInsuranceGap: z.boolean(),
});

export const IndemnificationPassResultSchema = z.object({
  findings: z.array(IndemnificationFindingSchema),
  dates: z.array(ContractDateSchema),
});

// --- Payment Contingency Finding Schema ---
export const PaymentContingencyFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  paymentType: z.enum(['pay-if-paid', 'pay-when-paid']),
  enforceabilityContext: z.string(),
});

export const PaymentContingencyPassResultSchema = z.object({
  findings: z.array(PaymentContingencyFindingSchema),
  dates: z.array(ContractDateSchema),
});

// --- Liquidated Damages Finding Schema ---
export const LiquidatedDamagesFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  amountOrRate: z.string(),
  capStatus: z.enum(['capped', 'uncapped']),
  proportionalityAssessment: z.string(),
});

export const LiquidatedDamagesPassResultSchema = z.object({
  findings: z.array(LiquidatedDamagesFindingSchema),
  dates: z.array(ContractDateSchema),
});

// --- Retainage Finding Schema ---
export const RetainageFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  percentage: z.string(),
  releaseCondition: z.string(),
  tiedTo: z.enum(['sub-work', 'project-completion', 'unspecified']),
});

export const RetainagePassResultSchema = z.object({
  findings: z.array(RetainageFindingSchema),
  dates: z.array(ContractDateSchema),
});
```

### Legal Pass Definition (Indemnification Example)
```typescript
// Source: Existing ANALYSIS_PASSES pattern in api/analyze.ts
// Shows prompt engineering with severity calibration rules baked in

{
  name: 'legal-indemnification',
  isOverview: false,
  isLegal: true, // NEW flag for legal passes
  schema: IndemnificationPassResultSchema,
  systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL indemnification and hold-harmless clauses in this contract.

## What to Find
- Express indemnification clauses (indemnify, hold harmless, defend)
- Additional insured requirements tied to indemnification
- Clauses where the Sub assumes liability beyond their own negligence
- Mutual vs one-sided indemnification provisions

## For Each Clause Found
1. **Quote the EXACT, COMPLETE clause text** as it appears in the contract. Do not truncate, paraphrase, or summarize. Include the full paragraph/section.
2. **Classify the indemnification type:**
   - **Broad form**: Sub must indemnify GC even for GC's sole negligence. Keywords: "regardless of fault", "whether or not caused by", "sole negligence of indemnitee"
   - **Intermediate form**: Sub must indemnify GC for concurrent negligence but not GC's sole negligence. Keywords: "caused in whole or in part by", "to the extent not caused solely by"
   - **Limited form**: Sub only indemnifies for Sub's own negligence. Keywords: "to the extent caused by", "arising from the negligence of"
3. **Check for insurance gaps**: Does this clause create liability that would NOT be covered by a standard CGL policy or commercial umbrella policy typical for a glazing subcontractor? Standard glazing sub coverage includes CGL ($1M/$2M), umbrella ($5M), auto, workers comp.
4. **Explain in plain English** why this clause matters to a glazing sub. Compare to what a "standard" or "fair" version would look like.
5. **Note cross-references** to other contract sections that modify or are affected by this clause.

## Severity Rules (MANDATORY)
- Broad form indemnification = Critical
- Intermediate form indemnification = High
- Limited form indemnification = Medium

## Missing Protective Clauses
- If the contract has indemnification flowing only from Sub to GC with NO mutual indemnification, create a finding noting this absence.
- Do NOT flag the absence of harmful indemnification clauses (that's good news).

## Output Rules
- One finding per indemnification clause instance
- If the contract has 3 separate indemnification provisions, produce 3 findings
- Always include the section/article number in clauseReference`,
  userPrompt: 'Analyze all indemnification and hold-harmless clauses in this glazing subcontract. For each clause, quote the exact text, classify the type, check for insurance gaps, and provide a plain-English explanation.',
}
```

### Merge Step: Converting Legal Pass Results to Unified Findings
```typescript
// Source: Project pattern in mergePassResults()
// Shows how type-specific metadata gets packed into legalMeta

function convertLegalFinding(
  finding: Record<string, unknown>,
  passName: string
): Finding {
  const base: Finding = {
    id: '', // assigned later
    severity: finding.severity as Severity,
    category: finding.category as Category,
    title: finding.title as string,
    description: finding.description as string,
    recommendation: finding.recommendation as string,
    clauseReference: finding.clauseReference as string,
    clauseText: finding.clauseText as string,
    explanation: finding.explanation as string,
    crossReferences: finding.crossReferences as string[],
  };

  // Pack type-specific metadata into legalMeta
  switch (passName) {
    case 'legal-indemnification':
      base.legalMeta = {
        clauseType: 'indemnification',
        riskType: finding.riskType as 'limited' | 'intermediate' | 'broad',
        hasInsuranceGap: finding.hasInsuranceGap as boolean,
      };
      break;
    case 'legal-payment-contingency':
      base.legalMeta = {
        clauseType: 'payment-contingency',
        paymentType: finding.paymentType as 'pay-if-paid' | 'pay-when-paid',
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-liquidated-damages':
      base.legalMeta = {
        clauseType: 'liquidated-damages',
        amountOrRate: finding.amountOrRate as string,
        capStatus: finding.capStatus as 'capped' | 'uncapped',
        proportionalityAssessment: finding.proportionalityAssessment as string,
      };
      break;
    case 'legal-retainage':
      base.legalMeta = {
        clauseType: 'retainage',
        percentage: finding.percentage as string,
        releaseCondition: finding.releaseCondition as string,
        tiedTo: finding.tiedTo as 'sub-work' | 'project-completion' | 'unspecified',
      };
      break;
  }

  return base;
}
```

### UI: Clause Quote Component
```typescript
// Source: Project Tailwind + Framer Motion conventions
// New component for displaying verbatim clause text in findings

function ClauseQuote({ text, reference }: { text: string; reference: string }) {
  return (
    <div className="bg-slate-50 border-l-4 border-slate-300 rounded-r-md p-4 my-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Contract Language -- {reference}
      </p>
      <p className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` param | `output_config.format` param | GA release (post Nov 2025) | Old beta header still works during transition; project uses beta path |
| Single analysis pass | Multi-pass with structured outputs | Phase 1 (2026-03-03) | Foundation for specialized legal passes |
| `pdf-parse` text extraction | Native PDF via Files API | Phase 1 (2026-03-03) | Claude sees actual PDF; better clause extraction accuracy |
| Optional clauseText field | Required clauseText in legal passes | Phase 2 (this phase) | Every legal finding guaranteed to have verbatim quote |

**Deprecated/outdated:**
- The `anthropic-beta: structured-outputs-2025-11-13` header is deprecated in favor of GA `output_config.format`, but still works. The project's current beta path (`client.beta.messages.create`) continues to function. Migrating to the non-beta path is optional and could be done in a future cleanup phase.

## API Considerations

### Model Selection
The project currently uses `claude-sonnet-4-5-20250929` (as set in Phase 1 decision 01-04). This model supports structured outputs via the beta path. No model change needed for Phase 2.

### Token Budget
- `MAX_TOKENS_PER_PASS` is currently 8192
- Legal passes with full clause quoting need more output space than general passes
- Most contracts have 1-3 instances of each clause type
- Estimated per-finding token cost: ~300-500 tokens (clause text: ~100-200, explanation: ~100-150, metadata: ~50-100)
- Worst case: 5 instances of a clause type = ~2500 tokens
- 8192 is adequate. No change needed unless testing reveals truncation.

### Vercel Timeout
- `vercel.json` sets `maxDuration: 120` seconds
- 7 parallel passes should complete within 120 seconds since they run in parallel
- Each pass typically completes in 10-30 seconds
- Risk: if many passes hit rate limits (429), sequential retries could exceed timeout
- Mitigation: no retry logic currently exists; `Promise.allSettled()` handles failures gracefully

### Prompt Caching
- Files API with `cache_control: { type: 'ephemeral' }` caches the uploaded PDF
- All 7 passes reference the same `fileId` with cache hints
- First pass pays full input token cost; subsequent passes benefit from cache
- Adding 4 more passes has minimal input token cost increase due to caching

## Domain Knowledge: Construction Legal Clauses

### Indemnification Classification (HIGH confidence)
Three recognized types in construction law:
1. **Broad form:** Subcontractor indemnifies GC for ALL claims, including those caused solely by GC's negligence. Many states have anti-indemnity statutes that void these.
2. **Intermediate form:** Sub indemnifies GC for claims caused in whole or in part by the Sub, even where GC is concurrently negligent. Only excludes GC's sole negligence.
3. **Limited form:** Sub indemnifies only to the extent the Sub's negligence caused the loss. Most enforceable and most fair.

Key detection signals:
- Broad: "regardless of fault", "whether or not caused by negligence of indemnitee", "sole negligence"
- Intermediate: "caused in whole or in part", "to the fullest extent permitted by law"
- Limited: "to the extent caused by", "arising from the acts or omissions of"

### Pay-if-Paid vs Pay-when-Paid (HIGH confidence)
- **Pay-if-paid:** Payment to sub is CONDITIONED on owner paying GC. Sub may never get paid if owner defaults. Creates a "condition precedent" to payment.
- **Pay-when-paid:** Establishes TIMING of payment. GC must pay sub a reasonable time after receiving owner payment. Sub eventually gets paid regardless.

Enforceability varies by state:
- ~13 states prohibit pay-if-paid entirely (e.g., NC, CA, NY)
- Some states require explicit "condition precedent" language for pay-if-paid to be enforceable
- Pay-when-paid is enforceable in most states but courts may impose a "reasonable time" limit (typically 30-60 days)

Detection signals:
- Pay-if-paid: "contingent upon", "condition precedent to payment", "only if and to the extent", "receipt of payment from owner shall be a condition"
- Pay-when-paid: "within [X] days of receipt", "upon receipt of payment from owner", "when paid by owner"

### Liquidated Damages (HIGH confidence)
- LD clauses set a predetermined daily/weekly penalty for late completion
- Enforceable when the amount represents a reasonable estimate of actual damages and actual damages would be difficult to calculate
- **Proportionality matters:** $5,000/day on a $50,000 subcontract is disproportionate; on a $5M subcontract it may be reasonable
- **Cap status:** Some contracts cap total LD exposure (e.g., 10% of contract value); uncapped LD can exceed the contract value
- **Flow-through risk:** GC may pass owner's LD clause down to sub, creating exposure beyond sub's scope

### Retainage (HIGH confidence)
- Retainage is a percentage of each progress payment withheld until project milestones are met
- **Standard:** 5-10% withheld, released at sub's substantial completion
- **Problematic patterns:**
  - Above 10% (excessive cash flow impact on subcontractor)
  - Release tied to OVERALL project completion (not sub's work completion) -- sub may wait months/years after finishing their work
  - No release conditions specified (GC has indefinite hold)
  - Retainage not reduced after 50% completion (some jurisdictions require this)

## Open Questions

1. **Max tokens for legal passes**
   - What we know: 8192 should handle most contracts with 1-3 clause instances per type
   - What's unclear: Behavior on very complex contracts (100+ pages) with many clause instances
   - Recommendation: Ship with 8192, monitor `stop_reason` in production, increase if truncation is observed. Could also add a per-pass `maxTokens` override on the `AnalysisPass` interface.

2. **Existing pass prompt updates**
   - What we know: The `risk-overview` and `scope-financial` passes already detect some legal clauses at a shallow level
   - What's unclear: Whether to modify their prompts to skip clause types now handled by specialized passes, or rely purely on deduplication
   - Recommendation: Do NOT modify existing pass prompts in Phase 2. The dedup strategy handles overlap. Modifying existing prompts risks breaking their current functionality and is an optimization for a later phase.

3. **Output_config migration from beta**
   - What we know: The GA path uses `output_config.format` without beta headers. The beta path still works.
   - What's unclear: When Anthropic will remove the beta path
   - Recommendation: Keep the beta path for Phase 2. Migration to GA path is orthogonal to this phase's goals and can be done as a separate cleanup task.

## Sources

### Primary (HIGH confidence)
- [Anthropic Structured Outputs Documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - JSON Schema limitations, supported features, optional parameter limits, `anyOf` support, schema complexity limits, property ordering
- Existing project code: `api/analyze.ts`, `src/schemas/analysis.ts`, `src/types/contract.ts` - Established patterns for pass definitions, schema design, merge logic

### Secondary (MEDIUM confidence)
- [Cranfill Sumner - Different Types of Indemnity](https://www.cshlaw.com/resources/different-types-of-indemnity-and-their-relative-enforceability-in-construction-litigation/) - Three indemnification types, anti-indemnity statutes
- [DBL Law - Pay-if-Paid v. Pay-when-Paid](https://www.dbllaw.com/pay-if-paid-v-pay-when-paid/) - Distinction between pay-if-paid and pay-when-paid, state enforceability variation
- [Levelset - Pay-When-Paid and Pay-If-Paid Explained](https://www.levelset.com/blog/pay-when-paid-and-pay-if-paid-explained/) - Detection signals, 13-state prohibition
- [PilieroMazza - Top 10 Killer Construction Contract Clauses](https://www.pilieromazza.com/top-10-killer-construction-contract-clauses-part-2-pay-if-paid-and-pay-when-paid/) - Practical subcontractor perspective on payment contingency clauses

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation or legal sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; extending existing proven patterns from Phase 1
- Architecture: HIGH - Schema extension strategy verified against Anthropic's documented limits; pass organization follows established project pattern
- Pitfalls: HIGH - Based on concrete API constraints (token limits, schema complexity) and known LLM behavior patterns (hallucination, severity miscalibration)
- Domain knowledge: HIGH - Construction legal clause types are well-documented in legal literature; classification system is standard in the industry

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain; API constraints unlikely to change within 30 days)
