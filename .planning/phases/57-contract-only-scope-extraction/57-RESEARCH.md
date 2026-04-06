# Phase 57: Contract-Only Scope Extraction - Research

**Researched:** 2026-04-05
**Domain:** LLM-powered scope extraction + deterministic schedule-conflict computation + quantity-ambiguity detection
**Confidence:** HIGH

## Summary

Phase 57 extends the existing `scope-extraction` analysis pass to extract submittal register data and quantity-ambiguity findings, adds a deterministic TypeScript schedule-conflict computation step in the merge/post-merge pipeline, and introduces a Submittals tab on the contract review page. All three capabilities work on contract-only uploads (no bid PDF required).

The implementation touches four layers: (1) Zod schema extensions for `SubmittalEntry` and `quantity-ambiguity` scopeItemType, (2) `scope-extraction` pass prompt extension to instruct Claude to extract submittals and flag quantity-ambiguity phrases, (3) a new deterministic TypeScript function in the merge pipeline that compares submittal durations against extracted milestone dates and generates conflict findings, and (4) a new Submittals tab UI component on the contract review page.

**Primary recommendation:** Extend the existing scope-extraction pass (not a new pass) for both submittals and quantity-ambiguity extraction. Keep schedule-conflict computation purely in TypeScript, inserted between merge and DB write in `api/analyze.ts`. Model the submittals as a new `submittals` jsonb column on the `contracts` table, following the established pattern for `score_breakdown`, `bid_signal`, and `pass_results`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Submittals are **data extracts, not risk findings** -- presented as a structured table, separate from the findings list.
- New `submittals: SubmittalEntry[]` array on the Contract type (alongside `findings` and `dates`). Requires new DB column (jsonb) and Zod schema.
- Fields per entry: type (`shop-drawing | sample | mockup | product-data`), description, reviewDuration, responsibleParty, reviewCycles (number), resubmittalBuffer, specSection (CSI ref), leadTime, clauseReference.
- Unstated fields (resubmittalBuffer, leadTime) are **left blank** in the register -- UI shows "Not stated" or dash. Schedule-conflict computation uses configurable industry defaults (e.g., 7-day buffer) and **labels the assumption explicitly** in the warning text.
- Submittal extraction happens in the existing `scope-extraction` pass (Stage 2) with schema extension -- not a new pass.
- Schedule-conflict detection is **deterministic TypeScript computation** after the extraction pass -- no additional LLM call (per SC2).
- Compare submittal total durations against **extracted ContractDate milestones only** (type: 'Milestone' from the dates-deadlines pass). No inferred project phases.
- Total duration formula: `(reviewDuration x reviewCycles) + resubmittalBuffer + leadTime`. When buffer/leadTime unstated, use industry default (7d buffer, 0d lead) and label assumption in warning.
- Each conflict generates a **real Finding** (category: 'Scope of Work') AND annotates the submittal register row with a warning icon and overrun summary. Dual visibility.
- Severity tiered by overrun days: Critical >14d, High 7-14d, Medium 1-7d. Deterministic, not LLM-assigned.
- Conflict findings appear in PDF report export alongside other findings (sorted by severity). Submittal register table itself deferred to Phase 62 UX.
- Quantity-ambiguity uses existing `scope-extraction` pass with new `scopeItemType: 'quantity-ambiguity'` value -- not the verbiage pass.
- One finding per scope item with ambiguous quantity phrase -- each quotes the exact phrase and identifies the scope item.
- Severity tiered by bid exposure: High (open-ended: `as required`, `sufficient`, `to weatherproof`, `all necessary`, `complete system`), Medium (approximation: `approximately`, `estimated`, `about`), Low (substitution: `or equal`, `similar to`, `match existing`).
- Submittal register appears in a **new "Submittals" tab** on the contract review page, alongside Findings and Negotiation Checklist tabs.
- Tab hidden entirely when `submittals` array is empty.
- Quantity-ambiguity findings appear in the Findings tab (they are findings, not register data).
- All three capabilities work on contracts uploaded without any bid PDF.

### Claude's Discretion
- Schema layout for SubmittalEntry Zod type and DB column design (jsonb shape).
- Exact industry-default values for resubmittal buffer and lead time.
- How scope-extraction pass prompt is extended to extract submittals + quantity ambiguity alongside existing scope findings.
- Submittal register UI component design (table layout, column widths, responsive behavior).
- TypeScript organization for the schedule-conflict computation function.
- How conflict findings reference both the submittal and the milestone in clauseReference/clauseText.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCOPE-01 | User sees extracted submittal register (shop drawings, samples, mockups, product data) with durations, parties, and review cycles | Schema extension on `ScopeOfWorkPassResultSchema` to include `submittals` array; new `submittals` jsonb column on contracts table; new Submittals tab UI component |
| SCOPE-02 | User sees schedule-conflict warnings when submittal durations + lead times push past contract milestones | Deterministic TypeScript `computeScheduleConflicts()` function in merge pipeline; generates Finding objects with category 'Scope of Work' and deterministic severity tiers |
| SCOPE-05 | User sees quantity ambiguity flags on scope items as bid-risk warnings | New `'quantity-ambiguity'` value in `scopeItemType` enum on `ScopeOfWorkFindingSchema`; prompt extension with phrase classification tiers |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 3.x (in project) | Schema definition for SubmittalEntry, pass result extension | Already used for all pass schemas |
| React 18 | 18.x (in project) | Submittals tab UI component | Project standard |
| Tailwind CSS | 3.x (in project) | Tab styling, table layout | Project standard |
| Framer Motion | 10.x (in project) | Tab transition animations | Project standard |
| Lucide React | 0.x (in project) | Warning icons on conflict rows | Project standard |

### Supporting (no new dependencies)
No new npm packages needed. This phase extends existing schemas, passes, and UI patterns.

**Installation:** None required.

## Architecture Patterns

### Integration Points Map

```
EXISTING                          NEW / MODIFIED
--------                          --------------
api/passes.ts                     scope-extraction pass: extended prompt + schema
  scope-extraction pass  ------->   adds submittals[] to result schema
                                    adds quantity-ambiguity to scopeItemType enum

src/schemas/                      scopeComplianceAnalysis.ts:
  ScopeOfWorkFindingSchema ------>   scopeItemType enum + 'quantity-ambiguity'
  ScopeOfWorkPassResultSchema -->   add submittals: z.array(SubmittalEntrySchema)
                                  NEW: submittalEntry.ts (SubmittalEntrySchema)

api/merge.ts                      mergePassResults():
  passHandlers map    ---------->   scope-extraction handler extracts submittals
                                    from pass result alongside findings

api/analyze.ts                    Post-merge, pre-DB-write:
  after mergePassResults() ----->   NEW: computeScheduleConflicts(submittals, dates)
                                    returns conflict Finding[] + annotated submittals

src/types/contract.ts             Contract interface:
  Contract interface ---------->   add submittals: SubmittalEntry[]
                                  NEW: SubmittalEntry interface

supabase/migrations/              NEW: add submittals jsonb column to contracts

src/pages/ContractReview.tsx      ViewMode type:
  FilterToolbar ViewMode -------> add 'submittals' to ViewMode union
                                  NEW: SubmittalRegister component (tab content)
```

### Pattern 1: Pass Schema Extension (Established)
**What:** Extend the `ScopeOfWorkPassResultSchema` to include a `submittals` array alongside the existing `findings` and `dates` arrays.
**When to use:** When a pass needs to return structured data beyond findings/dates.
**Example:**
```typescript
// In src/schemas/scopeComplianceAnalysis.ts
export const SubmittalEntrySchema = z.object({
  type: z.enum(['shop-drawing', 'sample', 'mockup', 'product-data']),
  description: z.string(),
  reviewDuration: z.number(),        // days, 0 if unstated
  responsibleParty: z.string(),      // who submits
  reviewCycles: z.number(),          // count, 1 if unstated
  resubmittalBuffer: z.number(),     // days, 0 if unstated (use -1 or null sentinel for "not stated")
  specSection: z.string(),           // CSI ref e.g. "08 44 13"
  leadTime: z.number(),              // days, 0 if unstated
  clauseReference: z.string(),       // contract section citing this submittal
});

export const ScopeOfWorkPassResultSchema = z.object({
  findings: z.array(ScopeOfWorkFindingSchema),
  dates: z.array(ContractDateSchema),
  submittals: z.array(SubmittalEntrySchema),  // NEW
});
```

**IMPORTANT: Structured outputs constraint.** Anthropic structured outputs does not support `.min()/.max()/.nullable()` on numbers. Use sentinel values (0 for unstated durations) and a parallel boolean or string field to distinguish "contract says 0 days" from "not stated." Recommended approach: use `z.number()` for all duration fields and add a `statedFields` array or per-field `*Stated: z.boolean()` flags to track which values are contract-quoted vs. defaults.

### Pattern 2: Deterministic Post-Merge Computation (Established)
**What:** TypeScript function that runs after merge, generates findings from structured data. Precedent: `computeRiskScore()`, `computeBidSignal()`.
**When to use:** When findings can be derived deterministically from extracted data without LLM calls.
**Example:**
```typescript
// In api/conflicts.ts (new file)
interface ScheduleConflict {
  submittalDescription: string;
  milestoneName: string;
  totalDuration: number;
  overrunDays: number;
  assumptions: string[];  // e.g., ["7d resubmittal buffer (assumed)"]
}

function computeScheduleConflicts(
  submittals: SubmittalEntry[],
  dates: ContractDate[]
): { conflicts: ScheduleConflict[]; findings: UnifiedFinding[] }
```

### Pattern 3: ViewMode Tab Addition (Established)
**What:** The ContractReview page uses a `ViewMode` union type to switch between display modes. Currently: `'by-category' | 'by-severity' | 'coverage' | 'negotiation'`.
**When to use:** Adding a new tab to the contract review page.
**How it works:** `FilterToolbar` renders tab buttons; `ContractReview` conditionally renders the matching component. The Submittals tab should be conditionally shown only when `contract.submittals?.length > 0`.

### Pattern 4: DB Column Addition (Established)
**What:** New jsonb column on contracts table + Contract interface extension + mapper passthrough.
**Precedent:** `score_breakdown`, `bid_signal`, `pass_results` are all jsonb columns storing camelCase JSON.
**Key detail:** The `mapRow` mapper converts snake_case column names to camelCase keys but passes jsonb values through unchanged. So the jsonb content should be stored as camelCase (matching the TypeScript types).

### Anti-Patterns to Avoid
- **Creating a new analysis pass for submittal extraction:** The CONTEXT.md locks this to extending the existing scope-extraction pass. A new pass would add API cost and latency.
- **Using LLM to compute schedule conflicts:** SC2 explicitly requires deterministic TypeScript computation.
- **Storing submittals as findings:** Submittals are structured data extracts, not risk findings. They belong in a separate array/column.
- **Using `.nullable()` or `.optional()` in structured output schemas:** Anthropic structured outputs does not support these Zod modifiers. Use sentinel values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom validation logic | Zod schemas (project standard) | Type safety + structured output compatibility |
| snake_case mapping | Manual DB column mapping | Existing `mapToSnake`/`mapRow` utilities | Established pattern, handles jsonb passthrough |
| Tab rendering | Custom tab state management | Extend existing `ViewMode` union + `FilterToolbar` | Consistency with existing UX |
| Duration parsing | Complex NLP duration parser | Require Claude to output numeric days in structured schema | Structured outputs force the model to produce numbers |

## Common Pitfalls

### Pitfall 1: Structured Output Number Sentinels
**What goes wrong:** Claude returns 0 for both "contract says 0 days" and "contract doesn't mention this field." The schedule-conflict computation cannot distinguish the two cases.
**Why it happens:** Structured outputs requires all fields to be present with valid types. No null/undefined allowed.
**How to avoid:** Add a `statedInContract` boolean per optional duration field, or use a `statedFields: string[]` array listing which fields were found in the contract text. The computation function checks this before applying defaults.
**Warning signs:** All submittals showing 0-day lead times when contracts typically specify 8-14 week glass lead times.

### Pitfall 2: Prompt Bloat on Scope-Extraction Pass
**What goes wrong:** The scope-extraction pass prompt is already substantial (extraction of inclusions, exclusions, spec refs, scope rules, gaps, ambiguities). Adding submittal extraction AND quantity-ambiguity instructions may exceed the effective instruction-following window.
**Why it happens:** Claude's adherence to complex multi-section prompts degrades with prompt length, especially when instructions compete (scope findings vs. submittal data vs. quantity phrases).
**How to avoid:** Structure the prompt extension as clearly delineated sections with distinct output schemas. The submittals array is separate from findings, reducing confusion. Test with real contracts to verify extraction completeness.
**Warning signs:** Pass returns findings but empty submittals array, or submittals but misses quantity-ambiguity findings.

### Pitfall 3: Merge Pipeline Submittal Passthrough
**What goes wrong:** The `mergePassResults()` function in `api/merge.ts` only extracts `findings` and `dates` from pass results. Submittals in the scope-extraction result are silently dropped.
**Why it happens:** The merge function iterates `result.findings` and `result.dates` via established patterns. A new top-level array (`submittals`) needs explicit extraction.
**How to avoid:** Extend `mergePassResults()` to collect submittals from the scope-extraction pass result. Add `submittals` to the `MergedResult` type. Or: extract submittals separately in `analyze.ts` from the raw settled results before calling merge.
**Warning signs:** DB row has null/empty submittals despite the pass returning them in the raw response.

### Pitfall 4: Schedule-Conflict Computation Timing
**What goes wrong:** Schedule conflicts are computed before all dates are available, or after the merge has already dropped some date entries.
**Why it happens:** Dates come from both the `dates-deadlines` pass and other passes. The conflict computation needs the full merged dates array.
**How to avoid:** Run `computeScheduleConflicts()` AFTER `mergePassResults()` completes (which aggregates all dates from all passes), but BEFORE the DB write. Insert it in `api/analyze.ts` between the merge call and the contract payload construction.
**Warning signs:** "No milestones found" when the dates-deadlines pass extracted milestone dates.

### Pitfall 5: jsonb Column Migration on Existing Data
**What goes wrong:** Adding a `submittals` jsonb column with `NOT NULL` default fails because existing rows have no submittals.
**Why it happens:** Standard migration pitfall with new columns.
**How to avoid:** Add the column as `jsonb default '[]'::jsonb` (empty array default). Existing contracts get an empty array; new contracts get populated submittals.

### Pitfall 6: Conflict Finding Source Attribution
**What goes wrong:** Schedule-conflict findings have `sourcePass: 'scope-extraction'` even though they were generated by TypeScript, not Claude. This confuses dedup logic and pass-failure reporting.
**Why it happens:** Copy-paste from the pass-generated finding pattern.
**How to avoid:** Use a distinct `sourcePass` value like `'schedule-conflict'` for deterministic findings. This parallels `sourcePass: 'staleness-check'` for module staleness warnings and `sourcePass: 'synthesis'` for compound risk findings.

## Code Examples

### SubmittalEntry Type Definition
```typescript
// In src/types/contract.ts
export interface SubmittalEntry {
  type: 'shop-drawing' | 'sample' | 'mockup' | 'product-data';
  description: string;
  reviewDuration: number;       // days
  responsibleParty: string;
  reviewCycles: number;
  resubmittalBuffer: number;    // days (0 = not stated)
  specSection: string;
  leadTime: number;             // days (0 = not stated)
  clauseReference: string;
  // Tracks which numeric fields are contract-stated vs. defaulted
  statedFields: string[];       // e.g., ['reviewDuration', 'reviewCycles']
}
```

### Schedule-Conflict Computation
```typescript
// In api/conflicts.ts
const DEFAULTS = {
  resubmittalBuffer: 7,  // 7 calendar days
  leadTime: 0,           // 0 days (conservative: don't assume lead time)
};

function computeScheduleConflicts(
  submittals: SubmittalEntry[],
  milestones: ContractDate[]   // filtered to type === 'Milestone'
): { findings: UnifiedFinding[]; annotations: Map<number, string> } {
  const findings: UnifiedFinding[] = [];
  const annotations = new Map<number, string>();
  const milestoneDates = milestones
    .filter(d => d.type === 'Milestone')
    .map(d => ({ label: d.label, date: parseLocalDate(d.date) }))
    .filter(d => d.date !== null);

  for (let i = 0; i < submittals.length; i++) {
    const sub = submittals[i];
    const assumptions: string[] = [];

    const buffer = sub.statedFields.includes('resubmittalBuffer')
      ? sub.resubmittalBuffer
      : (assumptions.push(`${DEFAULTS.resubmittalBuffer}d resubmittal buffer (assumed, not in contract)`), DEFAULTS.resubmittalBuffer);

    const lead = sub.statedFields.includes('leadTime')
      ? sub.leadTime
      : (assumptions.push(`${DEFAULTS.leadTime}d lead time (assumed)`), DEFAULTS.leadTime);

    const totalDays = (sub.reviewDuration * sub.reviewCycles) + buffer + lead;

    for (const milestone of milestoneDates) {
      // Compare totalDays against days-until-milestone
      // (requires a reference date -- use earliest milestone or contract start)
      // Simplified: flag when totalDays exceeds a reasonable threshold relative to milestone
      const overrun = /* computed from available date data */;
      if (overrun > 0) {
        const severity = overrun > 14 ? 'Critical' : overrun > 7 ? 'High' : 'Medium';
        findings.push({
          severity,
          category: 'Scope of Work',
          title: `Schedule Conflict: ${sub.description} vs ${milestone.label}`,
          description: `${sub.description} requires ${totalDays} total days (${sub.reviewDuration}d review x ${sub.reviewCycles} cycles + ${buffer}d buffer + ${lead}d lead). This pushes ${overrun} days past the "${milestone.label}" milestone.${assumptions.length ? ' Assumptions: ' + assumptions.join('; ') : ''}`,
          recommendation: `Negotiate extended review timeline or earlier submittal due date for ${sub.description}. Consider requesting ${overrun + 7} additional days of float.`,
          clauseReference: sub.clauseReference,
          sourcePass: 'schedule-conflict',
          actionPriority: 'pre-bid',
        });
        annotations.set(i, `${overrun}d overrun vs ${milestone.label}`);
      }
    }
  }
  return { findings, annotations };
}
```

### Quantity-Ambiguity Prompt Extension
```
## Quantity Ambiguity Detection (NEW)

For each scope item containing quantity-ambiguity language, generate a SEPARATE finding
with scopeItemType: 'quantity-ambiguity'.

### High Severity (open-ended quantity risk -- sub bears unlimited quantity):
Phrases: "as required", "sufficient", "to weatherproof", "all necessary",
"complete system", "as needed", "whatever is necessary", "full and complete"

### Medium Severity (soft quantities -- numbers exist but non-binding):
Phrases: "approximately", "estimated", "about", "more or less", "roughly"

### Low Severity (substitution ambiguity -- not quantity risk):
Phrases: "or equal", "similar to", "match existing", "or approved equal",
"comparable to"

For each finding:
- Quote the EXACT phrase in clauseText
- Identify the scope item it applies to in the title
- Explain the bid-risk exposure in the description
```

### DB Migration
```sql
-- Migration: Add submittals jsonb column to contracts table
ALTER TABLE contracts ADD COLUMN submittals jsonb DEFAULT '[]'::jsonb;
```

### Submittals Tab Conditional Rendering
```typescript
// In ContractReview.tsx -- extends the viewMode conditional chain
// ViewMode type becomes: 'by-category' | 'by-severity' | 'coverage' | 'negotiation' | 'submittals'

// In FilterToolbar -- conditionally render the Submittals tab button:
{contract.submittals && contract.submittals.length > 0 && (
  <button
    onClick={() => setViewMode('submittals')}
    className={`...${viewMode === 'submittals' ? 'active' : ''}`}
  >
    Submittals ({contract.submittals.length})
  </button>
)}

// In ContractReview main content area:
viewMode === 'submittals' ? (
  <SubmittalRegister
    submittals={contract.submittals}
    conflictAnnotations={/* from schedule-conflict computation */}
  />
) : viewMode === 'negotiation' ? (
  // ... existing
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single scope-of-work pass | Renamed `scope-extraction` pass with knowledge modules | Phase 56 | Pass ready for schema extension |
| Flat pass results (findings + dates only) | Pass results can include domain-specific arrays | Phase 57 (this phase) | Enables submittal register as first-class data |
| All findings from LLM | Deterministic findings from TypeScript computation | Precedent in risk-score, bid-signal | Schedule-conflict findings follow this pattern |
| 4 ViewMode tabs | 5 ViewMode tabs (+ Submittals) | Phase 57 (this phase) | Tab conditionally hidden when no submittals |

## Open Questions

1. **Submittal duration reference point for conflict computation**
   - What we know: Schedule-conflict formula is `(reviewDuration x reviewCycles) + buffer + leadTime`. We have milestone dates from the dates-deadlines pass.
   - What's unclear: What is the "start date" for the submittal timeline? The computation needs to know when the submittal review clock starts (e.g., NTP, contract start, a specific submittal-due date from the contract).
   - Recommendation: Use the earliest `Start` type ContractDate as the reference point. If no start date exists, compute overrun relative to the milestone date itself (i.e., "this submittal needs N total days -- ensure N days of calendar exist before milestone"). Document this assumption clearly.

2. **statedFields tracking in structured outputs**
   - What we know: We need to distinguish "contract says 0 days" from "not stated in contract."
   - What's unclear: Best schema design given structured output constraints (no nullable, no optional).
   - Recommendation: Use `statedFields: z.array(z.string())` where the model lists field names it found explicit values for. Computation function checks `statedFields.includes('resubmittalBuffer')` before applying defaults. Alternative: use negative sentinel (-1) for "not stated" -- simpler but less self-documenting.

3. **Conflict annotation storage for UI**
   - What we know: Each conflict generates a Finding AND annotates the submittal register row.
   - What's unclear: Should annotations be stored in the submittals jsonb (mutating the extracted data) or computed client-side by matching conflict findings to submittal entries?
   - Recommendation: Compute client-side by matching `sourcePass: 'schedule-conflict'` findings back to submittals via description/clauseReference match. Keeps the submittals array as pure extraction data. The SubmittalRegister component does the join.

## Sources

### Primary (HIGH confidence)
- `api/passes.ts` lines 139-196 -- scope-extraction pass definition, current prompt and schema
- `src/schemas/scopeComplianceAnalysis.ts` -- ScopeOfWorkFindingSchema with scopeItemType enum
- `src/types/contract.ts` -- Contract interface, ContractDate interface
- `api/merge.ts` -- mergePassResults function, passHandlers map, dedup logic
- `api/analyze.ts` -- full pipeline orchestration, post-merge computation insertion points
- `src/schemas/finding.ts` -- MergedFindingSchema canonical shape
- `src/components/FilterToolbar.tsx` -- ViewMode type definition
- `src/pages/ContractReview.tsx` -- tab rendering pattern (viewMode conditional chain)
- `supabase/migrations/` -- DB schema pattern for jsonb columns

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` -- submittal register field list, schedule-conflict formula, quantity-ambiguity phrase tiers
- `.planning/research/PITFALLS.md` -- Pitfall 10 knowledge module bloat, token budget discipline
- `.planning/phases/56-architecture-foundation/56-CONTEXT.md` -- Stage 3 wave pattern, scope-extraction rename, MAX_MODULES_PER_PASS raise

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established in codebase
- Architecture: HIGH -- integration points are well-defined, patterns have precedent
- Pitfalls: HIGH -- pitfalls identified from direct code inspection of merge pipeline and structured output constraints

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependency changes expected)
