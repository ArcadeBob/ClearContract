# Phase 62: Scope Intelligence UX + Portfolio Trends - Research

**Researched:** 2026-04-07
**Domain:** React UI / data aggregation / finding subcategorization
**Confidence:** HIGH

## Summary

Phase 62 is a pure frontend/UX phase. All scope-intel data (submittal register, quantity ambiguity, spec reconciliation, exclusion stress-test, bid reconciliation) is already flowing from the analysis pipeline and persisted in Supabase. The three requirements (UX-01, UX-02, PORT-01) are about how to surface, organize, and aggregate that data in the UI.

The key architectural challenge is UX-01: all v3.0 scope-intel findings already have `category: 'Scope of Work'` in their Zod schemas (confirmed in `scopeComplianceAnalysis.ts`), so no Category enum changes are needed. The subcategory concept maps directly to the existing `scopeMeta.passType` discriminator and `sourcePass` field on findings. The CategorySection component needs to optionally group by subcategory within the "Scope of Work" section.

For UX-02 (dedicated Scope Intelligence view-mode), the pattern is established: FilterToolbar already supports 5 view modes (`by-category`, `by-severity`, `coverage`, `negotiation`, `submittals`). Adding a `scope-intel` mode follows the exact same pattern. The three sub-components (submittal timeline, spec-gap matrix, bid/contract diff) each consume data already on the Contract object.

For PORT-01 (cross-contract scope trends), the data must be aggregated from findings across all contracts. The existing PatternsCard component provides the architectural template. The key design decisions are: (1) aggregate client-side from already-loaded contracts array, and (2) require N >= 10 contracts before rendering.

**Primary recommendation:** Use `sourcePass` field as the subcategory discriminator for UX-01, add `scope-intel` to ViewMode union for UX-02, and build ScopeTrendsCard as a sibling to PatternsCard for PORT-01.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Scope-intel findings surface as subcategories under "Scope of Work" | All v3.0 scope findings already have `category: 'Scope of Work'`. Use `sourcePass` to group into subcategories within CategorySection. No Category enum changes. |
| UX-02 | Dedicated Scope Intelligence view-mode for submittal timeline, spec-gap matrix, bid/contract diff | ViewMode union pattern established in FilterToolbar. SubmittalRegister already exists. Spec-gap and bid-diff are new list/table components consuming existing finding data. |
| PORT-01 | Cross-contract scope trends on dashboard | PatternsCard pattern for aggregation. Client-side computation from contracts array. N >= 10 threshold. Aggregate from `scopeMeta` fields on findings with `category === 'Scope of Work'`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in project |
| Tailwind CSS | 3.x | Styling | Project convention |
| Framer Motion | 11.x | Animations | Project convention for staggered entry |
| Lucide React | latest | Icons | Project convention |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | No new libraries needed | This phase is pure UI using existing data |

No new dependencies required. All data is already available on the `Contract` type.

## Architecture Patterns

### Recommended Structure

```
src/
├── components/
│   ├── CategorySection.tsx       # MODIFY: add subcategory grouping for Scope of Work
│   ├── FilterToolbar.tsx         # MODIFY: add 'scope-intel' view mode
│   ├── ScopeTrendsCard.tsx       # NEW: cross-contract scope trends dashboard card
│   ├── SpecGapMatrix.tsx         # NEW: spec-gap matrix for Scope Intel view
│   ├── BidContractDiff.tsx       # NEW: bid/contract diff for Scope Intel view
│   └── ScopeIntelView.tsx        # NEW: container for all three Scope Intel sub-components
├── hooks/
│   └── useContractFiltering.ts   # No changes needed — already groups by Category
└── pages/
    ├── ContractReview.tsx         # MODIFY: wire scope-intel view mode
    └── Dashboard.tsx              # MODIFY: add ScopeTrendsCard
```

### Pattern 1: Subcategory Grouping via sourcePass

**What:** Within the "Scope of Work" CategorySection, group findings by their `sourcePass` field into collapsible subcategory blocks.
**When to use:** Only for the "Scope of Work" category — other categories have no subcategory concept.
**Example:**
```typescript
// Subcategory labels derived from sourcePass
const SCOPE_SUBCATEGORY_LABELS: Record<string, string> = {
  'scope-extraction': 'Scope Items',
  'spec-reconciliation': 'Spec Gaps',
  'exclusion-stress-test': 'Exclusion Challenges',
  'bid-reconciliation': 'Bid vs Contract',
  'schedule-conflict': 'Schedule Conflicts',
};

// Group findings within Scope of Work by sourcePass
function groupBySubcategory(findings: Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.sourcePass ?? 'general';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  return groups;
}
```

### Pattern 2: ViewMode Extension

**What:** Add `scope-intel` to the `ViewMode` union type and handle it in ContractReview's view-mode switch.
**When to use:** Standard pattern — same as how `submittals`, `coverage`, and `negotiation` were added.
**Example:**
```typescript
// FilterToolbar.tsx
export type ViewMode = 'by-category' | 'by-severity' | 'coverage' | 'negotiation' | 'submittals' | 'scope-intel';
```

### Pattern 3: Dashboard Aggregation Card

**What:** ScopeTrendsCard receives the full `contracts` array, aggregates scope findings client-side, renders only when N >= 10 reviewed contracts.
**When to use:** Follows PatternsCard pattern exactly — `useMemo` for aggregation, early return `null` when insufficient data.

### Anti-Patterns to Avoid

- **Adding new Category enum values:** UX-01 explicitly forbids this. All scope-intel findings already use `'Scope of Work'` category. Subcategories are a UI concern, not a data model concern.
- **Server-side aggregation for trends:** The contracts array is already loaded on the dashboard. Client-side aggregation via `useMemo` is sufficient and avoids new API endpoints. The N >= 10 threshold prevents performance issues.
- **Separate Supabase queries for trends:** The findings are already on each contract object. No new DB queries needed.
- **Breaking existing CategorySection for non-scope categories:** Subcategory grouping must be conditional — only apply to "Scope of Work". Other categories render identically to today.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subcategory labels | New label registry | SCOPE_SUBCATEGORY_LABELS const using existing PASS_LABELS pattern from CostSummaryBar | Consistency with existing pass label convention |
| View mode switching | Custom routing | Extend existing ViewMode union + FilterToolbar button pattern | Established pattern, 5 modes already exist |
| Scope trend aggregation | Supabase RPC/SQL | Client-side useMemo over contracts array | PatternsCard already does this for category patterns; N >= 10 is small enough |
| Empty state handling | Custom error boundaries | Conditional rendering with early-return null | Project convention for absent data |

## Common Pitfalls

### Pitfall 1: Category Enum Bloat
**What goes wrong:** Adding new top-level Category values like 'Submittal Intelligence' or 'Bid Reconciliation' to the CATEGORIES const.
**Why it happens:** Tempting to give each scope-intel pass its own category for filtering.
**How to avoid:** Subcategories are a display concern only. All v3.0 scope-intel findings already emit `category: 'Scope of Work'`. The subcategory is derived from `sourcePass` at render time.
**Warning signs:** Any change to the `CATEGORIES` const in `types/contract.ts`.

### Pitfall 2: Breaking CategorySection for Non-Scope Categories
**What goes wrong:** Subcategory grouping logic accidentally applies to all categories, creating visual noise.
**Why it happens:** Not gating the subcategory rendering on `category === 'Scope of Work'`.
**How to avoid:** Subcategory grouping is conditional — only when `category === 'Scope of Work'` AND findings have diverse `sourcePass` values.
**Warning signs:** Legal Issues or Financial Terms showing subcategory headers.

### Pitfall 3: Legacy Contract Crashes
**What goes wrong:** Scope Intelligence view-mode or trends card crashes on pre-v3.0 contracts that have no `submittals`, no `scopeMeta` on findings, or no `sourcePass`.
**Why it happens:** Not handling undefined/empty arrays gracefully.
**How to avoid:** Every sub-component must handle its absent-data case: no submittals = empty state, no spec-reconciliation findings = "No spec gaps detected", no bid = "No bid attached". Contract.submittals is already typed as `SubmittalEntry[]` (defaults to `[]`).
**Warning signs:** Any component that doesn't check for empty arrays or missing optional fields before rendering.

### Pitfall 4: Trend Card on Small Portfolios
**What goes wrong:** Showing trend data from 2-3 contracts creates misleading patterns.
**Why it happens:** Not enforcing the N >= 10 minimum.
**How to avoid:** ScopeTrendsCard returns `null` when `reviewed.length < 10`. PatternsCard uses N >= 3 for simpler patterns, but scope trends need a higher bar per success criteria.
**Warning signs:** Trends card rendering without the threshold check.

### Pitfall 5: Scope Intel View Mode Showing for Non-Scope Contracts
**What goes wrong:** The Scope Intel tab appears on contracts that were analyzed before v3.0 and have zero scope-intel data.
**Why it happens:** Not conditionally showing the view-mode button.
**How to avoid:** Only show the Scope Intel tab when the contract has submittals OR scope-intel findings (sourcePass in scope-intel pass set). Same pattern as submittals tab (`submittalCount > 0`).
**Warning signs:** Scope Intel tab visible on legacy contracts with empty content.

## Code Examples

### Subcategory Rendering in CategorySection

```typescript
// Inside CategorySection, when category === 'Scope of Work':
const SCOPE_SUBCATEGORIES: Record<string, string> = {
  'scope-extraction': 'Scope Items',
  'spec-reconciliation': 'Spec Gaps',
  'exclusion-stress-test': 'Exclusion Challenges',
  'bid-reconciliation': 'Bid vs Contract',
  'schedule-conflict': 'Schedule Conflicts',
};

// Group by sourcePass, render sub-headers
const subcategories = useMemo(() => {
  if (category !== 'Scope of Work') return null;
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.sourcePass && SCOPE_SUBCATEGORIES[f.sourcePass] ? f.sourcePass : 'general';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  // Only show subcategories if there are multiple groups
  return groups.size > 1 ? groups : null;
}, [category, findings]);
```

### ScopeTrendsCard Aggregation

```typescript
// Aggregate exclusions across contracts
const trends = useMemo(() => {
  const reviewed = contracts.filter(c => c.status === 'Reviewed' || c.status === 'Partial');
  if (reviewed.length < 10) return null;

  const exclusionCounts = new Map<string, number>();
  const scopeItemCounts = new Map<string, number>();

  for (const contract of reviewed) {
    for (const f of contract.findings) {
      if (f.category !== 'Scope of Work') continue;
      if (f.scopeMeta?.passType === 'scope-extraction') {
        const meta = f.scopeMeta;
        if (meta.scopeItemType === 'exclusion') {
          const key = f.title; // or normalize
          exclusionCounts.set(key, (exclusionCounts.get(key) ?? 0) + 1);
        } else {
          scopeItemCounts.set(f.title, (scopeItemCounts.get(f.title) ?? 0) + 1);
        }
      }
    }
  }

  return {
    topExclusions: [...exclusionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    recurringScope: [...scopeItemCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    totalReviewed: reviewed.length,
  };
}, [contracts]);
```

### Scope Intelligence View Container

```typescript
// ScopeIntelView.tsx — container rendered when viewMode === 'scope-intel'
interface ScopeIntelViewProps {
  contract: Contract;
}

export function ScopeIntelView({ contract }: ScopeIntelViewProps) {
  const submittals = contract.submittals ?? [];
  const specGapFindings = contract.findings.filter(
    f => f.sourcePass === 'spec-reconciliation'
  );
  const bidReconcFindings = contract.findings.filter(
    f => f.sourcePass === 'bid-reconciliation'
  );

  return (
    <div className="space-y-6">
      {/* Submittal Timeline */}
      <SubmittalTimeline submittals={submittals} dates={contract.dates} />

      {/* Spec Gap Matrix */}
      <SpecGapMatrix findings={specGapFindings} />

      {/* Bid/Contract Diff */}
      {contract.bidFileName ? (
        <BidContractDiff findings={bidReconcFindings} />
      ) : (
        <EmptyState message="No bid document attached" />
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat category grouping | Subcategory grouping via sourcePass | Phase 62 | Scope of Work category has 5+ pass types now — flat list is too noisy |
| No scope-intel view | Dedicated view mode | Phase 62 | Users need structured views (timeline, matrix, diff) not just finding cards |
| Category-level patterns only | Scope-specific trend aggregation | Phase 62 | PatternsCard shows category frequency; scope trends show exclusion/scope-item patterns |

## Open Questions

1. **Exclusion normalization for trends**
   - What we know: Finding titles for exclusions come from LLM output, so the same exclusion across contracts may have slightly different titles.
   - What's unclear: How much normalization is needed for meaningful aggregation.
   - Recommendation: Start with exact-match title aggregation. If trends are too fragmented, add fuzzy grouping (e.g., lowercase + strip articles) in a follow-up. Do not over-engineer normalization upfront.

2. **"GC-rejected exclusions" for PORT-01 success criterion 3**
   - What we know: Success criteria mentions "exclusions that GCs commonly reject/modify". The current data model has no negotiation-outcome tracking (explicitly out of scope per PROJECT.md).
   - What's unclear: How to identify "rejected" exclusions without outcome data.
   - Recommendation: Use exclusion-stress-test findings as a proxy — exclusions that the stress-test flagged as having spec tensions are the closest signal to "commonly challenged". Label as "Commonly Challenged Exclusions" rather than "Rejected".

3. **Submittal Timeline vs Submittal Register**
   - What we know: SubmittalRegister already exists as a table view. UX-02 calls for a "submittal timeline" in the Scope Intel view.
   - What's unclear: Whether this is a visual timeline (Gantt-like) or the existing register.
   - Recommendation: The Scope Intel "submittal timeline" should be a horizontal timeline visualization showing submittals plotted against contract milestones (from `contract.dates`). This is distinct from the existing table-format SubmittalRegister. Can start simple: a vertical list with duration bars, not a full Gantt chart.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Scope-intel findings group as subcategories under Scope of Work | unit | `npx vitest run src/components/CategorySection.test.tsx -x` | Needs update |
| UX-02 | Scope Intelligence view-mode renders three sub-components | unit | `npx vitest run src/components/ScopeIntelView.test.tsx -x` | Wave 0 |
| UX-02 | FilterToolbar shows scope-intel mode button | unit | `npx vitest run src/components/FilterToolbar.test.tsx -x` | Needs update |
| PORT-01 | ScopeTrendsCard aggregates exclusions/scope items across contracts | unit | `npx vitest run src/components/ScopeTrendsCard.test.tsx -x` | Wave 0 |
| PORT-01 | ScopeTrendsCard returns null when N < 10 | unit | `npx vitest run src/components/ScopeTrendsCard.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/ScopeIntelView.test.tsx` -- covers UX-02
- [ ] `src/components/ScopeTrendsCard.test.tsx` -- covers PORT-01
- [ ] Update `src/components/CategorySection.test.tsx` -- covers UX-01 subcategory rendering
- [ ] Update `src/components/FilterToolbar.test.tsx` -- covers UX-02 scope-intel mode button

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all relevant source files
- `src/types/contract.ts` -- Category enum, ScopeMeta union, Finding shape
- `src/schemas/scopeComplianceAnalysis.ts` -- all scope finding schemas confirm `category: 'Scope of Work'`
- `src/components/FilterToolbar.tsx` -- ViewMode union pattern
- `src/components/PatternsCard.tsx` -- dashboard aggregation pattern
- `src/components/CategorySection.tsx` -- current category rendering
- `src/pages/ContractReview.tsx` -- view-mode switch rendering
- `src/pages/Dashboard.tsx` -- dashboard layout and card placement
- `api/analyze.ts` -- DB write schema, submittals persistence
- `src/hooks/useContractFiltering.ts` -- grouping and filtering logic

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure UI work on existing data
- Architecture: HIGH - all patterns established in prior phases (ViewMode, PatternsCard, CategorySection)
- Pitfalls: HIGH - identified from direct codebase analysis of data flow and type constraints

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable — no external dependencies)
