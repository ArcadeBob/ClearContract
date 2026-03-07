# Phase 5: Negotiation Output and Organization - Research

**Researched:** 2026-03-05
**Domain:** UI organization + AI prompt engineering for negotiation position generation
**Confidence:** HIGH

## Summary

Phase 5 addresses two requirements: SCOPE-04 (negotiation positions for Critical/High findings) and OUT-01 (organized category-based presentation). Both build on established patterns from Phases 1-4 without introducing new dependencies or passes.

For SCOPE-04, the existing finding structure already provides two of the three needed pieces: `clauseText` (the problematic language) and `explanation` (why it is problematic). The missing piece is suggested replacement language or negotiation position. This requires adding a `negotiationPosition` field to the `Finding` interface and updating all 16 analysis pass prompts to generate negotiation positions for Critical/High severity findings. The verbiage pass already demonstrates this pattern via `suggestedClarification` in ScopeMeta, confirming the approach works with the structured output pipeline.

For OUT-01, the current `ContractReview` page renders findings in a flat list sorted by severity with a `CategoryFilter` horizontal pill bar. This needs to become a grouped-by-category layout where findings are organized under category headings (e.g., "Legal Issues", "Scope of Work", "Financial Terms") so the user can work through the contract systematically. The CategoryFilter component can transition from a filter to a navigation mechanism (scrolling to category sections or toggling collapse).

**Primary recommendation:** Add `negotiationPosition` as an optional string field on Finding, update all pass prompts to generate it for Critical/High findings, and restructure ContractReview into a category-grouped layout with collapsible sections.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCOPE-04 | Each Critical/High finding includes a negotiation position -- the problematic language, why it's problematic, and suggested replacement language or position | Add `negotiationPosition` optional field to Finding interface; update all 16 pass schemas (risk-overview, 11 legal, 4 scope) to include the field; update all pass prompts to instruct Claude to generate negotiation positions for Critical/High findings; render in FindingCard with a distinct "Negotiation Position" styled block |
| OUT-01 | Analysis results are organized by category so the user can work through findings systematically | Restructure ContractReview page from flat severity-sorted list to category-grouped sections; each category section shows its findings sorted by severity; provide navigation/jump-to mechanism between sections |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Already in project |
| TypeScript | strict mode | Type safety | Already in project |
| Tailwind CSS | 3.x | Styling | Already in project, all UI uses utility classes |
| Framer Motion | ^10.x | Animations | Already in project, used for staggered FindingCard entry |
| Lucide React | latest | Icons | Already in project, used in FindingCard category icons |
| Zod | ^3.x | Schema definitions | Already in project, used for structured outputs |
| zod-to-json-schema | latest | Zod-to-JSON-Schema conversion | Already in project, used in pipeline |

### Supporting
No new libraries needed. Phase 5 is entirely prompt engineering + UI restructuring using the existing stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Optional `negotiationPosition` field | Separate `NegotiationMeta` type | Over-engineering -- negotiation position is a single string, not structured metadata. A simple optional string field on Finding is sufficient and avoids the complexity of LegalMeta/ScopeMeta patterns. |
| Category-grouped sections | Tabbed interface per category | Tabs hide content behind clicks. Scrollable grouped sections let the user see the full picture and work through sequentially, which matches the "work through the contract systematically" requirement. |
| New dedicated negotiation pass | Update existing pass prompts | A separate pass would add API latency and cost. The existing passes already have full context about each clause -- they are the best place to generate negotiation positions. Adding a field to existing schemas is simpler and more reliable than a post-processing pass. |

## Architecture Patterns

### Requirement SCOPE-04: Negotiation Position Field

**What:** Add `negotiationPosition?: string` to the `Finding` interface and all structured output schemas. Update prompts to instruct Claude to populate this field for Critical and High severity findings.

**Why not a new pass:** Each existing pass (legal-indemnification, legal-payment-contingency, etc.) already has deep context about the specific clause it analyzed. A separate "negotiation" pass would need to re-analyze the same clauses without the specialized context. Keeping negotiation positions in the source pass produces higher quality output with zero additional API calls.

**What already exists (2 of 3 pieces):**
- `clauseText` -- the exact problematic contract language (already populated by all passes)
- `explanation` -- why the clause is problematic (already populated by all passes)
- `recommendation` -- general recommendation (already populated, but NOT the same as negotiation position)

**What's missing (1 of 3 pieces):**
- `negotiationPosition` -- suggested replacement language or specific negotiation position the sub should take with the GC

**Key distinction between `recommendation` and `negotiationPosition`:**
- `recommendation`: General guidance ("Consult with attorney about modifying this clause")
- `negotiationPosition`: Specific language or position ("Request changing 'regardless of fault' to 'to the extent caused by Subcontractor's negligence' to limit indemnification to Sub's own acts")

### Requirement OUT-01: Category-Grouped Layout

**What:** Replace the flat severity-sorted finding list with category-grouped sections. Each section has a category heading with finding count and severity summary, followed by that category's findings sorted by severity.

**Current layout:**
```
[CategoryFilter pills: All | Legal Issues | Scope of Work | ...]
[FindingCard - Critical]
[FindingCard - Critical]
[FindingCard - High]
[FindingCard - Medium]
...
```

**Target layout:**
```
[Category navigation / jump-to bar]

--- Legal Issues (5 findings: 2 Critical, 2 High, 1 Medium) ---
[FindingCard - Critical]
[FindingCard - Critical]
[FindingCard - High]
[FindingCard - High]
[FindingCard - Medium]

--- Financial Terms (3 findings: 1 Critical, 1 High, 1 Low) ---
[FindingCard - Critical]
[FindingCard - High]
[FindingCard - Low]

--- Scope of Work (4 findings: ...) ---
...
```

**Category ordering:** Categories should be ordered by maximum severity within each category (categories with Critical findings first, then High, etc.), with secondary sort by finding count. This ensures the user sees the most actionable categories first.

### Recommended Project Structure (no new files beyond)
```
src/
├── types/contract.ts           # ADD negotiationPosition to Finding
├── components/
│   ├── FindingCard.tsx          # ADD NegotiationPosition render block
│   ├── CategorySection.tsx     # NEW: category header + grouped findings
│   └── CategoryFilter.tsx      # MODIFY: from filter to navigation/jump-to
├── pages/
│   └── ContractReview.tsx      # RESTRUCTURE: category-grouped layout
└── schemas/
    ├── analysis.ts             # ADD negotiationPosition to FindingSchema
    ├── legalAnalysis.ts        # ADD negotiationPosition to all 11 finding schemas
    └── scopeComplianceAnalysis.ts  # ADD negotiationPosition to all 4 finding schemas
api/
└── analyze.ts                  # UPDATE all 16 pass prompts + UnifiedFinding
```

### Pattern: Schema Field Addition (established in Phases 2-4)

Every finding schema across all three schema files follows the same base pattern:
```typescript
z.object({
  severity: SeverityEnum,
  category: z.literal('...') or CategoryEnum,
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  // ... pass-specific metadata fields
});
```

Add `negotiationPosition: z.string()` as a REQUIRED field (following Phase 2 convention: "All metadata fields in legal pass schemas are REQUIRED (not optional)"). The prompt instructs Claude to use an empty string or "N/A" for Medium/Low/Info findings.

**Schema files to update (17 schemas total):**
1. `src/schemas/analysis.ts` -- `FindingSchema` (used by risk-overview pass)
2. `src/schemas/legalAnalysis.ts` -- 11 schemas (Indemnification, PaymentContingency, LiquidatedDamages, Retainage, Insurance, Termination, FlowDown, NoDamageDelay, LienRights, DisputeResolution, ChangeOrder)
3. `src/schemas/scopeComplianceAnalysis.ts` -- 4 schemas (ScopeOfWork, DatesDeadlines, Verbiage, LaborCompliance)

### Pattern: Prompt Update for Negotiation Positions

Each pass system prompt gets an added section:
```
## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding rated Critical or High, you MUST populate the negotiationPosition field with:
- The specific replacement language or modified clause concept the Sub should propose
- Frame as what to ask the GC for, not legal advice
- Be specific to the glazing/glass installation subcontractor context
- Example format: "Request changing '[problematic phrase]' to '[suggested alternative]' to [reason]"
- For Medium, Low, and Info severity findings, set negotiationPosition to an empty string
```

### Anti-Patterns to Avoid

- **Separate negotiation analysis pass:** Adding a 17th pass would increase API cost and latency. The existing passes already have all the context needed to generate negotiation positions. Do NOT add a new pass.
- **Storing negotiation data in LegalMeta/ScopeMeta:** The negotiation position is a universal concept across all finding types, not specific to legal or scope metadata. It belongs on the Finding interface directly.
- **Generating full legal replacement clauses:** The REQUIREMENTS.md explicitly notes "Automated redlining / markup" is out of scope due to legal liability risk. Negotiation positions should be directional suggestions ("ask for X") not complete contract clause drafts.
- **Filtering out categories with no Critical/High findings:** All categories should still be visible in the grouped layout. The user needs to see the full picture, including Low/Info findings for compliance tracking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Category grouping logic | Custom grouping algorithm | `Array.reduce` to group by `finding.category`, then sort groups by max severity | Standard JS pattern, no library needed |
| Scroll-to-section navigation | Custom scroll management | Native `element.scrollIntoView({ behavior: 'smooth' })` with `id` attributes on section headers | Browser-native, no library needed |
| Collapsible sections | Custom accordion state | React `useState` with `Map<Category, boolean>` for expand/collapse state | Simple pattern, no animation library needed for disclosure |

## Common Pitfalls

### Pitfall 1: Bloating Token Usage with Negotiation Positions
**What goes wrong:** Adding negotiation position text to every finding (including Info/Low) significantly increases output token usage per pass, potentially hitting the 8192 max_tokens limit.
**Why it happens:** Claude generates verbose replacement language for every finding regardless of severity.
**How to avoid:** Prompt explicitly instructs "For Medium, Low, and Info severity findings, set negotiationPosition to an empty string." Only Critical and High findings get substantive negotiation text.
**Warning signs:** Pass responses being truncated or hitting max_tokens more frequently.

### Pitfall 2: Negotiation Position vs. Recommendation Confusion
**What goes wrong:** The `negotiationPosition` and `recommendation` fields end up containing nearly identical content, adding no value.
**Why it happens:** Without clear prompt guidance, Claude treats them as synonyms.
**How to avoid:** Prompt must clearly distinguish: recommendation = what to do about it (general guidance), negotiationPosition = what to say to the GC (specific language or position). Example in prompt: "Recommendation: 'Review with counsel before signing' vs. Negotiation Position: 'Request changing broad form indemnification to limited form, specifically replacing [exact phrase] with [replacement concept]'."
**Warning signs:** Both fields contain generic advice like "consult with attorney."

### Pitfall 3: Category Sort Order Instability
**What goes wrong:** Category sections jump around on re-render or when findings are filtered, disorienting the user.
**Why it happens:** Categories derived from `new Set()` have non-deterministic order.
**How to avoid:** Use a fixed category order constant (matching the `Category` type union) rather than deriving order from the findings array. Within each category, sort by severity rank.
**Warning signs:** Categories appearing in different order on different contract analyses.

### Pitfall 4: Schema Required Field Breaking Existing Responses
**What goes wrong:** Adding `negotiationPosition` as a REQUIRED field to schemas means all 16 passes must reliably populate it, or structured output validation fails.
**Why it happens:** If any pass prompt does not mention negotiation positions, Claude may omit the field, causing a parse error.
**How to avoid:** Update EVERY pass prompt, not just legal ones. Even the risk-overview, dates-deadlines, and labor-compliance passes need the prompt addition. For passes that rarely produce Critical/High findings (dates-deadlines, labor-compliance), the prompt still needs to say "set negotiationPosition to empty string for non-Critical/High findings."
**Warning signs:** Individual passes failing with structured output validation errors after deployment.

### Pitfall 5: Losing "All" Filter Capability
**What goes wrong:** After switching to category-grouped layout, users lose the ability to see all findings sorted by severity across categories (the current default view).
**Why it happens:** Category grouping replaces severity-first ordering.
**How to avoid:** Keep a toggle or "All Findings" mode that shows the flat severity-sorted list (current behavior) alongside the new category-grouped view. Or ensure the category-grouped view itself is ordered so that the most severe categories appear first.
**Warning signs:** User complaint that they can no longer see "what's most critical" at a glance.

## Code Examples

### Adding negotiationPosition to Finding interface
```typescript
// src/types/contract.ts -- Finding interface
export interface Finding {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  recommendation?: string;
  clauseReference?: string;
  clauseText?: string;
  explanation?: string;
  crossReferences?: string[];
  legalMeta?: LegalMeta;
  scopeMeta?: ScopeMeta;
  sourcePass?: string;
  negotiationPosition?: string;  // NEW: suggested replacement language for Critical/High
}
```

### Adding negotiationPosition to a Zod schema
```typescript
// Example: IndemnificationFindingSchema in src/schemas/legalAnalysis.ts
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
  negotiationPosition: z.string(),  // NEW
});
```

### Updating convertLegalFinding / convertScopeFinding
```typescript
// In api/analyze.ts -- add to both convert functions:
function convertLegalFinding(
  finding: Record<string, unknown>,
  passName: string,
): UnifiedFinding {
  const base: UnifiedFinding = {
    severity: finding.severity as string,
    // ... existing fields ...
    negotiationPosition: finding.negotiationPosition as string,  // NEW
    sourcePass: passName,
  };
  // ... rest of switch cases unchanged ...
}
```

### UnifiedFinding interface update
```typescript
// In api/analyze.ts
interface UnifiedFinding {
  severity: string;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  clauseReference: string;
  clauseText?: string;
  explanation?: string;
  crossReferences?: string[];
  legalMeta?: LegalMeta;
  scopeMeta?: ScopeMeta;
  negotiationPosition?: string;  // NEW
  sourcePass?: string;
}
```

### Rendering negotiation position in FindingCard
```typescript
// In FindingCard.tsx -- add after the explanation block, before legalMeta/scopeMeta
{finding.negotiationPosition && finding.negotiationPosition !== '' && (
  <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 mb-3">
    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
      Negotiation Position
    </p>
    <p className="text-sm text-emerald-800 leading-relaxed">
      {finding.negotiationPosition}
    </p>
  </div>
)}
```

### Category-grouped layout in ContractReview
```typescript
// Category grouping logic
const CATEGORY_ORDER: Category[] = [
  'Legal Issues',
  'Financial Terms',
  'Insurance Requirements',
  'Scope of Work',
  'Contract Compliance',
  'Labor Compliance',
  'Important Dates',
  'Technical Standards',
  'Risk Assessment',
];

const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };

// Group findings by category
const groupedFindings = CATEGORY_ORDER
  .map(category => ({
    category,
    findings: contract.findings
      .filter(f => f.category === category)
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
  }))
  .filter(group => group.findings.length > 0);

// Sort categories by max severity (most critical first)
groupedFindings.sort((a, b) => {
  const aMax = Math.min(...a.findings.map(f => severityRank[f.severity]));
  const bMax = Math.min(...b.findings.map(f => severityRank[f.severity]));
  return aMax - bMax;
});
```

### CategorySection component
```typescript
// src/components/CategorySection.tsx
interface CategorySectionProps {
  category: Category;
  findings: Finding[];
  defaultExpanded?: boolean;
}

export function CategorySection({ category, findings, defaultExpanded = true }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = categoryIcons[category] || AlertTriangle;

  const severityCounts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 mb-2"
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">{category}</h3>
          <span className="text-sm text-slate-500">({findings.length} findings)</span>
        </div>
        <div className="flex items-center space-x-2">
          {Object.entries(severityCounts).map(([sev, count]) => (
            <SeverityBadge key={sev} severity={sev as Severity} count={count} />
          ))}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="space-y-4 ml-2">
          <AnimatePresence mode="popLayout">
            {findings.map((finding, index) => (
              <FindingCard key={finding.id} finding={finding} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
```

### Prompt addition template (add to each pass)
```
## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat severity-sorted list | Category-grouped with severity sort within | Phase 5 | Users can work through contract systematically by topic area |
| Generic recommendations only | Specific negotiation positions for Critical/High | Phase 5 | Findings become directly actionable for GC discussions |
| `recommendation` as catch-all advice | Distinct `recommendation` (what to do) + `negotiationPosition` (what to say) | Phase 5 | Clear separation of general guidance vs. specific negotiation talking points |

## Open Questions

1. **Should the category-grouped view be the default or an option?**
   - What we know: Current users see severity-sorted flat list. OUT-01 says "organized by category."
   - What's unclear: Whether to keep the flat view as an alternative or replace it entirely.
   - Recommendation: Make category-grouped the default. The CategoryFilter pills can double as navigation (jump to section). A small toggle can switch to "flat severity view" for backward compatibility, but category-grouped is the primary experience.

2. **Should negotiation positions be generated for Medium findings too?**
   - What we know: SCOPE-04 says "Critical/High findings." The requirement is explicit.
   - What's unclear: Some Medium findings (e.g., ambiguous scope language) could benefit from negotiation positions.
   - Recommendation: Follow the requirement strictly -- Critical and High only. This keeps token usage manageable and focuses on what matters most. Medium can be added later if needed.

3. **Token budget impact of negotiation positions**
   - What we know: Current MAX_TOKENS_PER_PASS is 8192. Adding negotiation text for Critical/High findings adds ~50-100 tokens per finding.
   - What's unclear: Whether any passes currently approach the 8192 limit.
   - Recommendation: 8192 should be sufficient. Most passes produce 3-8 findings. Even if all 8 are Critical/High with 100-token negotiation positions, that is only 800 extra tokens. Monitor but do not preemptively increase.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all source files (api/analyze.ts, src/types/contract.ts, src/schemas/*.ts, src/components/*.tsx, src/pages/ContractReview.tsx)
- .planning/REQUIREMENTS.md -- SCOPE-04 and OUT-01 requirement text
- .planning/STATE.md -- project decisions and established patterns
- .planning/research/FEATURES.md -- "Negotiation prep output" rated LOW complexity, described as "mostly prompt engineering on top of existing finding structure"

### Secondary (MEDIUM confidence)
- Pattern analysis from Phase 2-4 implementations (schema + prompt + convert function + UI badge pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, entirely existing stack
- Architecture (SCOPE-04 negotiation positions): HIGH -- follows established Phase 2-4 pattern of adding fields to schemas, updating prompts, updating convert functions, rendering in FindingCard
- Architecture (OUT-01 category grouping): HIGH -- straightforward React UI restructuring using existing component patterns
- Pitfalls: HIGH -- identified from direct codebase analysis of token limits, schema conventions, and render patterns

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- no external dependencies or fast-moving libraries)
