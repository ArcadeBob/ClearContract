# Phase 4: Scope, Compliance, and Verbiage - Research

**Researched:** 2026-03-05
**Domain:** Specialized analysis pass schema design, prompt engineering for scope/compliance/verbiage extraction, structured output patterns for non-legal analysis categories
**Confidence:** HIGH

## Summary

Phase 4 completes the non-legal analysis categories by adding 4 new specialized analysis passes with dedicated Zod schemas: scope-of-work extraction (SCOPE-01), enhanced dates-and-deadlines extraction (SCOPE-02), questionable verbiage detection (SCOPE-03), and labor compliance checklist (COMP-01). The established architecture pattern from Phases 2-3 applies directly -- each requirement gets a dedicated pass with a self-contained Zod schema, typed metadata, and a severity-calibrated prompt.

The critical architectural decision is how to handle the two existing general passes (`dates-deadlines` and `scope-financial`) that already partially cover SCOPE-01 and SCOPE-02 topics. These existing passes use the generic `PassResultSchema` (no specialized metadata fields) and their prompts are broad rather than focused. The correct approach is to **replace** these two general passes with the new specialized passes, not add passes alongside them. This keeps the pipeline from producing duplicate findings for the same clauses (scope inclusions/exclusions would appear in both the old `scope-financial` pass and the new `scope-of-work` pass). The existing dedup logic handles clause-level overlap, but replacing the passes is cleaner and avoids unnecessary API calls.

Unlike the legal passes (Phases 2-3), these four passes do NOT produce `legalMeta` -- they produce pass-specific structured metadata. The `FindingCard` component already renders findings without `legalMeta` (it's optional), so the base FindingCard behavior handles scope/compliance/verbiage findings. However, for SCOPE-01 and COMP-01, specialized rendering components may be needed to present structured data (scope extraction tables, compliance checklists) rather than free-text descriptions. The approach should be analogous to how `LegalMetaBadge` renders structured legal metadata -- a new `ScopeMeta` and `ComplianceMeta` system that provides structured display.

**Primary recommendation:** Replace the 2 existing general passes with 4 specialized passes (net +2 passes, from 14 to 16 total). Create a new schema file `src/schemas/scopeComplianceAnalysis.ts` following the self-contained pattern. Extend the `Finding` interface with an optional `scopeMeta` discriminated union for structured scope/compliance/verbiage metadata. Render this metadata through a new `ScopeMetaBadge` component analogous to `LegalMetaBadge`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCOPE-01 | Full scope of work extracted with inclusions, exclusions, specification references, and scope rules | New `scope-of-work` pass replaces `scope-financial`. Dedicated ScopeOfWorkFindingSchema with structured inclusions/exclusions arrays. ScopeMeta variant for structured display. |
| SCOPE-02 | All dates and deadlines extracted including notice periods, cure periods, payment terms, and project milestones | New `dates-deadlines-enhanced` pass replaces old `dates-deadlines`. DatesDeadlinesFindingSchema with structured period/deadline metadata. Enhanced DateTimeline rendering optional (existing component already renders dates). |
| SCOPE-03 | Questionable verbiage flagged -- ambiguous clauses, one-sided terms favoring GC, missing standard protections, undefined terms with legal significance | New `verbiage-analysis` pass. VerbiageFindingSchema with issueType classification, affected party, and missing-protection detection. ScopeMeta variant for badge display. |
| COMP-01 | Labor compliance checklist with items, associated dates, responsible parties, and contacts | New `labor-compliance` pass. ComplianceFindingSchema with checklist items array, responsible party, contact info, and deadline tracking. ScopeMeta variant for checklist rendering. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 3.x (existing) | Schema definitions for structured outputs | Already in project, required for Anthropic structured output format |
| zod-to-json-schema | existing | Convert Zod to JSON Schema for output_config | Already used by zodToOutputFormat helper |
| @anthropic-ai/sdk | existing | Claude API calls with structured output | Already configured with Files API, streaming, output_config |
| React 18 | existing | UI components for metadata rendering | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons for scope/compliance findings | Already used in FindingCard category icons |
| tailwind | existing | Styling for new badge/metadata components | Already used throughout |
| framer-motion | existing | Animations for new components | Already used for finding cards |

### Alternatives Considered
No new dependencies needed. Phase 4 follows the exact same technology patterns as Phases 2-3.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── schemas/
│   ├── analysis.ts                    # Base schemas (unchanged)
│   ├── legalAnalysis.ts               # Legal pass schemas (unchanged)
│   └── scopeComplianceAnalysis.ts     # NEW: 4 scope/compliance/verbiage schemas
├── types/
│   └── contract.ts                    # Extended with ScopeMeta union
├── components/
│   ├── FindingCard.tsx                # Updated to render scopeMeta
│   ├── LegalMetaBadge.tsx             # Unchanged
│   └── ScopeMetaBadge.tsx             # NEW: renders scope/compliance/verbiage metadata
└── ...
api/
└── analyze.ts                         # 2 passes replaced, 2 passes added, convertScopeFinding added
```

### Pattern 1: Specialized Pass with Self-Contained Schema (established)
**What:** Each requirement (SCOPE-01, SCOPE-02, SCOPE-03, COMP-01) gets its own Zod schema with domain-specific metadata fields. The schema is self-contained (local SeverityEnum, DateTypeEnum, ContractDateSchema) to avoid cross-dependency during structured output compilation.
**When to use:** Every new analysis pass.
**Example (from established pattern):**
```typescript
// Source: src/schemas/legalAnalysis.ts (existing pattern)
const SeverityEnum = z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']);
const DateTypeEnum = z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']);
const ContractDateSchema = z.object({ label: z.string(), date: z.string(), type: DateTypeEnum });

export const ScopeOfWorkFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  // scope-specific metadata
  scopeItemType: z.enum(['inclusion', 'exclusion', 'specification-reference', 'scope-rule', 'ambiguity', 'gap']),
  specificationReference: z.string(),
  affectedTrade: z.string(),
});
```

### Pattern 2: ScopeMeta Discriminated Union (new, mirrors LegalMeta)
**What:** A discriminated union type on `Finding` that carries pass-specific structured metadata for non-legal passes. Uses `passType` as the discriminant (analogous to `clauseType` in LegalMeta).
**When to use:** When scope/compliance/verbiage findings need structured data for badge/checklist rendering.
**Example:**
```typescript
export type ScopeMeta =
  | { passType: 'scope-of-work'; scopeItemType: string; specificationReference: string; affectedTrade: string }
  | { passType: 'dates-deadlines'; periodType: string; duration: string; triggerEvent: string }
  | { passType: 'verbiage'; issueType: string; affectedParty: string; suggestedClarification: string }
  | { passType: 'labor-compliance'; requirementType: string; responsibleParty: string; contactInfo: string; deadline: string };
```

### Pattern 3: Pass Replacement (not Addition)
**What:** The existing `dates-deadlines` and `scope-financial` passes are replaced by the new specialized passes, rather than running both old and new passes that cover the same topics.
**When to use:** When a new specialized pass fully supersedes the scope of an existing general pass.
**Rationale:** The existing `scope-financial` pass covers scope inclusions/exclusions AND financial terms. The new scope-of-work pass covers scope, while financial terms are already covered by legal passes (retainage, LD, payment-contingency). Similarly, the existing `dates-deadlines` pass is superseded by the new enhanced version with structured metadata. Replacing avoids duplicate findings and wasted API calls.

### Pattern 4: convertScopeFinding Function (mirrors convertLegalFinding)
**What:** A new function analogous to `convertLegalFinding` that extracts pass-specific metadata from scope/compliance/verbiage findings and packs it into `scopeMeta`.
**When to use:** In the merge pipeline for non-legal specialized passes.
**Example:**
```typescript
function convertScopeFinding(
  finding: Record<string, unknown>,
  passName: string,
): UnifiedFinding {
  const base = { /* same base fields as convertLegalFinding */ };
  switch (passName) {
    case 'scope-of-work':
      base.scopeMeta = { passType: 'scope-of-work', ... };
      break;
    case 'dates-deadlines':
      base.scopeMeta = { passType: 'dates-deadlines', ... };
      break;
    // etc.
  }
  return base;
}
```

### Anti-Patterns to Avoid
- **Adding passes alongside existing general passes that cover the same topics:** Creates duplicate findings, wastes API budget, and confuses dedup logic. Replace instead.
- **Using legalMeta for non-legal metadata:** The discriminated union is specifically typed for legal clauses. A separate scopeMeta keeps the types clean and semantically correct.
- **Making all scope metadata fields optional:** Phase 2 established that all metadata fields should be REQUIRED for structured output quality. Follow the same convention.
- **Importing types from other schema files:** Self-contained schemas with local enums, per Phase 2 convention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema conversion | Manual JSON Schema construction | `zodToOutputFormat()` already in api/analyze.ts | Handles $schema stripping and envelope wrapping correctly |
| Finding dedup | New dedup logic for scope findings | Existing clauseReference+category composite key dedup | The merge logic already handles all passes generically |
| Pass execution | Custom execution flow for scope passes | Existing `runAnalysisPass()` and `Promise.allSettled` batch execution | Scope passes follow the same AnalysisPass interface |
| Severity computation | Risk score adjustments for scope findings | Existing `computeRiskScore()` | Weights already apply to all severities regardless of category |

**Key insight:** The entire pipeline infrastructure (PDF upload, pass execution, merge, dedup, risk score) is pass-agnostic. Phase 4 only needs to define schemas, prompts, and metadata conversion -- the execution machinery requires zero changes.

## Common Pitfalls

### Pitfall 1: Overlap Between Scope Pass and Existing Legal Passes
**What goes wrong:** The new scope-of-work pass extracts financial terms like retainage and payment terms that are already analyzed by specialized legal passes, creating confusing duplicate findings with different severity levels.
**Why it happens:** The old `scope-financial` pass combined scope AND financial analysis. The new scope pass should cover ONLY scope.
**How to avoid:** The scope-of-work pass prompt must explicitly exclude financial terms that are covered by legal passes (retainage, LD, payment contingency, change order pricing). Its category should be `'Scope of Work'` only.
**Warning signs:** Seeing financial-themed findings with `category: 'Scope of Work'` in output.

### Pitfall 2: Dates Pass Producing Duplicate Dates
**What goes wrong:** The enhanced dates-deadlines pass extracts the same dates that legal passes already extract (e.g., notice periods from termination pass, cure periods from for-cause termination, payment terms from payment-contingency pass), leading to duplicate entries in the DateTimeline.
**Why it happens:** Legal passes already populate the `dates` array with pass-specific dates.
**How to avoid:** The dates-deadlines pass should focus on CONTRACT-LEVEL dates (project milestones, start/completion, submittal deadlines) rather than clause-level dates that legal passes already extract. The merge logic already deduplicates dates by label, but prompt focus prevents confusion.
**Warning signs:** DateTimeline showing the same deadline from 3 different passes.

### Pitfall 3: Labor Compliance Checklist vs. Findings Format
**What goes wrong:** The labor compliance pass produces individual findings (one per compliance item) rather than a consolidated checklist finding, making it impossible to render a checklist view.
**Why it happens:** The default pass output format is an array of findings, which naturally spreads across multiple cards.
**How to avoid:** Follow the insurance pass pattern (LEGAL-06) which produces a summary checklist finding with arrays (coverageItems, endorsements) plus individual findings for gaps. The labor compliance pass should produce a summary finding with a `checklistItems` array plus individual High/Critical findings for gaps.
**Warning signs:** 15+ Low-severity individual compliance findings with no summary view.

### Pitfall 4: Verbiage Pass Producing Noise
**What goes wrong:** The verbiage analysis pass flags every instance of common contract language (e.g., "best efforts", "reasonable", "as directed") producing dozens of Low/Info findings that obscure real issues.
**Why it happens:** Ambiguous language is everywhere in contracts. Without strict severity calibration, the pass treats all ambiguity as noteworthy.
**How to avoid:** Strict severity rules that focus on HIGH-IMPACT verbiage issues: one-sided terms that shift risk (Critical/High), undefined terms with legal significance (High), missing standard protections (Medium). Standard boilerplate ambiguity should not be flagged.
**Warning signs:** More than 10 verbiage findings from a single contract.

### Pitfall 5: Batch Size Exceeded with New Passes
**What goes wrong:** Adding 2 net new passes (14 -> 16 total) could push the second batch beyond what the Vercel serverless function can handle within the timeout, or trigger rate limits.
**Why it happens:** The current BATCH_SIZE is 7, meaning 14 passes run in 2 batches. 16 passes run in 3 batches (7 + 7 + 2), adding latency.
**How to avoid:** The third batch has only 2 passes, so the latency increase is minimal. The 60s Vercel timeout (now potentially 120s per vercel.json config) is sufficient. The undici timeout is 5 minutes. No action needed, but worth monitoring.
**Warning signs:** Timeout errors on analysis of large contracts after Phase 4 deployment.

## Code Examples

Verified patterns from the existing codebase:

### New Schema File Structure (scopeComplianceAnalysis.ts)
```typescript
// Source: src/schemas/legalAnalysis.ts (pattern to follow)
import { z } from 'zod';

// Self-contained local enums (do NOT import from other schema files)
const SeverityEnum = z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']);
const DateTypeEnum = z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']);
const ContractDateSchema = z.object({
  label: z.string(),
  date: z.string(),
  type: DateTypeEnum,
});

// --- Scope of Work schemas (SCOPE-01) ---
export const ScopeOfWorkFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  scopeItemType: z.enum(['inclusion', 'exclusion', 'specification-reference', 'scope-rule', 'ambiguity', 'gap']),
  specificationReference: z.string(),
  affectedTrade: z.string(),
});
export const ScopeOfWorkPassResultSchema = z.object({
  findings: z.array(ScopeOfWorkFindingSchema),
  dates: z.array(ContractDateSchema),
});

// Pattern continues for each pass...
```

### Pass Definition in api/analyze.ts (established pattern)
```typescript
// Source: api/analyze.ts (existing legal pass pattern)
{
  name: 'scope-of-work',
  isOverview: false,
  isLegal: false,  // NOT legal -- uses convertScopeFinding instead
  isScope: true,   // NEW flag to route through convertScopeFinding
  schema: ScopeOfWorkPassResultSchema,
  systemPrompt: `You are a construction contract analyst...`,
  userPrompt: 'Extract the full scope of work...',
},
```

### Adding isScope flag to AnalysisPass interface
```typescript
// Source: api/analyze.ts
interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;  // NEW: routes findings through convertScopeFinding
  schema?: Parameters<typeof zodToOutputFormat>[0];
}
```

### Merge Logic Update (minimal change)
```typescript
// Source: api/analyze.ts mergePassResults function
// Current logic:
if (passes[i].isLegal) {
  for (const f of result.findings) {
    allFindings.push(convertLegalFinding(f as unknown as Record<string, unknown>, passName));
  }
} else {
  for (const f of result.findings) {
    allFindings.push({ ...f, sourcePass: passName });
  }
}

// Updated logic:
if (passes[i].isLegal) {
  for (const f of result.findings) {
    allFindings.push(convertLegalFinding(f as unknown as Record<string, unknown>, passName));
  }
} else if (passes[i].isScope) {
  for (const f of result.findings) {
    allFindings.push(convertScopeFinding(f as unknown as Record<string, unknown>, passName));
  }
} else {
  for (const f of result.findings) {
    allFindings.push({ ...f, sourcePass: passName });
  }
}
```

### ScopeMetaBadge Component Pattern
```typescript
// Source: Analogous to src/components/LegalMetaBadge.tsx
import React from 'react';
import { ScopeMeta } from '../types/contract';

interface ScopeMetaBadgeProps {
  meta: ScopeMeta;
}

const pillBase = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2';

export function ScopeMetaBadge({ meta }: ScopeMetaBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {meta.passType === 'scope-of-work' && (
        <span className={`${pillBase} ${
          meta.scopeItemType === 'exclusion' || meta.scopeItemType === 'gap'
            ? 'bg-red-100 text-red-700'
            : meta.scopeItemType === 'ambiguity'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
        }`}>
          {meta.scopeItemType}
        </span>
      )}
      {/* ... other passType branches */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic PassResultSchema for all non-legal passes | Specialized schemas per pass | Phase 2 (legal), now Phase 4 (scope/compliance) | Structured metadata enables rich UI rendering |
| Single 4096-token API call | Multi-pass with 8192 tokens each | Phase 1 | Deeper analysis per topic |
| pdf-parse text extraction | Native PDF via Files API | Phase 1 | Full document fidelity |

**Deprecated/outdated:**
- The existing `scope-financial` and `dates-deadlines` passes use the generic PassResultSchema. Phase 4 replaces them with specialized schemas.

## Design Decisions for Planning

### Decision 1: Replace vs. Add Passes
**Recommendation:** REPLACE the 2 existing general passes (`dates-deadlines`, `scope-financial`) with 4 specialized passes.

Rationale:
- `scope-financial` is redundant with the new scope-of-work pass AND with existing legal passes (retainage, LD, payment-contingency) that already cover financial terms deeply
- `dates-deadlines` is redundant with the new enhanced dates pass
- Replacement avoids duplicate findings and wasted API calls
- Net pass count goes from 14 to 16 (remove 2, add 4)

### Decision 2: ScopeMeta vs. No ScopeMeta
**Recommendation:** Add a `scopeMeta` optional field to `Finding` with a discriminated union, mirroring `legalMeta`.

Rationale:
- Scope/compliance findings benefit from structured metadata display (scope item type badges, compliance checklist items, verbiage issue type labels)
- Without scopeMeta, the UI can only show description text -- no structured badges or checklists
- The pattern is proven (LegalMetaBadge renders 11 clause types successfully)
- The alternative (putting everything in description text) makes the compliance checklist requirement (COMP-01) impossible to implement well

### Decision 3: Schema File Location
**Recommendation:** New file `src/schemas/scopeComplianceAnalysis.ts` (separate from legalAnalysis.ts).

Rationale:
- Clean separation between legal and non-legal schemas
- Follows the established convention of grouping related schemas
- The file stays manageable in size (4 pass schemas vs. 11 in legalAnalysis.ts)

### Decision 4: Labor Compliance Checklist Format
**Recommendation:** Follow the insurance pass pattern (LEGAL-06): one summary finding with a `checklistItems` array, plus individual findings for Critical/High gaps.

Rationale:
- Insurance already proved this two-part output works with structured outputs
- A checklist is meaningless as 15 separate Low-severity findings
- The ScopeMetaBadge can render the checklist items array as checkboxes/list items
- Individual gap findings at Critical/High still appear in the main findings list

### Decision 5: Plan Structure
**Recommendation:** 2 plans mirroring Phase 3's structure.

- **Plan 04-01:** Schema creation, type extensions, pass definitions, convertScopeFinding, prompt engineering (backend)
- **Plan 04-02:** ScopeMetaBadge component, FindingCard integration, end-to-end verification (frontend)

## Open Questions

1. **Enhanced DateTimeline component needed?**
   - What we know: The existing DateTimeline renders all dates from all passes. The enhanced dates pass will produce more detailed date objects (with notice periods, cure periods as metadata).
   - What's unclear: Whether the DateTimeline needs updating to show the enhanced metadata or if the existing simple display is sufficient.
   - Recommendation: Keep existing DateTimeline for now. The enhanced dates pass adds more dates to the timeline (notice periods, cure periods as individual date entries) which the existing component handles. Future phases could enhance the timeline.

2. **Verbiage pass vs. Legal passes overlap on "one-sided terms"**
   - What we know: The verbiage pass (SCOPE-03) flags "one-sided terms favoring GC" which overlaps with what legal passes already flag (one-sided indemnification, one-sided termination, etc.)
   - What's unclear: Exact boundary between legal-clause analysis and verbiage analysis
   - Recommendation: Verbiage pass focuses on NON-LEGAL language issues: vague requirements ("as directed by GC"), undefined technical terms, missing standard protections (no warranty disclaimer, no safety responsibility limits), and general contract language that shifts risk. Legal clause analysis remains in legal passes.

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` -- Complete analysis pipeline with 14 passes, merge/dedup logic, pass execution infrastructure (directly examined)
- `src/schemas/legalAnalysis.ts` -- 11 self-contained Zod schemas establishing the pattern (directly examined)
- `src/schemas/analysis.ts` -- Base PassResultSchema, RiskOverviewResultSchema, MergedAnalysisResultSchema (directly examined)
- `src/types/contract.ts` -- Finding interface, LegalMeta union, Category/Severity types (directly examined)
- `src/components/LegalMetaBadge.tsx` -- 11-branch discriminated union rendering (directly examined)
- `src/components/FindingCard.tsx` -- Finding rendering with optional legalMeta (directly examined)
- `.planning/phases/03-extended-legal-coverage/03-01-PLAN.md` -- Phase 3 plan establishing schema+pass+convert pattern (directly examined)
- `.planning/phases/03-extended-legal-coverage/03-RESEARCH.md` -- Phase 3 research with pattern conventions (directly examined)

### Secondary (MEDIUM confidence)
- Anthropic structured outputs documentation -- Zod v3 compatible via zod-to-json-schema, no .min()/.max() constraints (verified by existing codebase usage)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Uses only existing project dependencies, no new libraries
- Architecture: HIGH -- Pattern directly established in Phases 2-3, thoroughly verified via codebase examination
- Pitfalls: HIGH -- Derived from direct analysis of existing pass overlap and merge/dedup logic
- Prompt engineering: MEDIUM -- Severity calibration and prompt scope boundaries need validation with real contracts

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days -- stable pattern, no external dependency changes)
