# Phase 55: Partial Status Type Gap Closure - Research

**Researched:** 2026-03-23
**Domain:** TypeScript type definitions, React UI badge rendering, filter logic
**Confidence:** HIGH

## Summary

Phase 55 closes an integration gap identified in the v2.2 milestone audit: the server (`api/analyze.ts` line 615) writes `'Partial'` as a contract status when a global timeout fires, but the client-side `Contract.status` union type only includes `'Analyzing' | 'Reviewed' | 'Draft'`. This means Partial contracts loaded from the database are silently coerced to `string` at the type level, and the UI has no visual distinction for them. Additionally, filters that check `status === 'Reviewed'` exclude Partial contracts from dashboard stats, timeline entries, and pattern analysis -- even though Partial contracts contain usable (if incomplete) data.

This is a small, well-scoped change touching the type definition, one badge component, and several filter locations. No new dependencies, no architectural changes, no server-side work.

**Primary recommendation:** Add `'Partial'` to the `Contract.status` union, add an amber/orange badge color in `ContractCard`, and update all `=== 'Reviewed'` filters to also include `'Partial'` where the contract has usable data (stats, timeline, patterns).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-03 | Completed pass results are progressively saved to DB, surviving function timeout | Server already writes `'Partial'` status (line 615 of api/analyze.ts). This phase closes the client-side type gap so the UI correctly models and displays that status. |
</phase_requirements>

## Exact Change Inventory

### 1. Type Definition (1 file)

**File:** `src/types/contract.ts` line 184
**Current:** `status: 'Analyzing' | 'Reviewed' | 'Draft';`
**Target:** `status: 'Analyzing' | 'Reviewed' | 'Partial' | 'Draft';`

This is the root cause of the gap. Once the type includes `'Partial'`, TypeScript will flag any switch/conditional that does not handle it (if exhaustive checks exist), though this codebase uses ternary chains rather than exhaustive switches.

### 2. ContractCard Badge (1 file)

**File:** `src/components/ContractCard.tsx` line 75
**Current logic (ternary chain):**
- `'Reviewed'` -> emerald (green)
- `'Analyzing'` -> blue
- else (catches `'Draft'`) -> slate

**Target:** Add explicit `'Partial'` case with amber/orange styling before the else clause:
- `'Reviewed'` -> `bg-emerald-100 text-emerald-700`
- `'Partial'` -> `bg-amber-100 text-amber-700` (amber signals "incomplete but has data")
- `'Analyzing'` -> `bg-blue-100 text-blue-700`
- else (`'Draft'`) -> `bg-slate-100 text-slate-600`

Amber is consistent with the project's severity color system (amber = High/warning) and visually distinct from the green "Reviewed" badge.

### 3. Filter Updates (4 locations)

All locations that filter on `status === 'Reviewed'` need to decide whether to include Partial contracts. Since Partial contracts have real findings, dates, risk scores, and bid signals (just potentially incomplete pass coverage), they SHOULD be included in data views.

| File | Line | Current Filter | Action |
|------|------|----------------|--------|
| `src/App.tsx` | 42 | `.filter(c => c.status === 'Reviewed')` | Include Partial -- deadline count should show Partial contract dates |
| `src/pages/Dashboard.tsx` | 27 | `.filter((c) => c.status === 'Reviewed')` | Include Partial -- stats should reflect Partial contracts |
| `src/utils/dateUrgency.ts` | 75 | `.filter(c => c.status === 'Reviewed')` | Include Partial -- timeline should show Partial contract dates |
| `src/components/PatternsCard.tsx` | 12 | `.filter((c) => c.status === 'Reviewed')` | Include Partial -- pattern detection benefits from Partial data |

**Recommended filter pattern:** Replace `c.status === 'Reviewed'` with `c.status === 'Reviewed' || c.status === 'Partial'` at all four locations. Alternatively, create a helper like `isAnalysisComplete(status)` but given only 4 locations this may be over-engineering.

### 4. ContractReview Page (1 file, minor)

**File:** `src/pages/ContractReview.tsx` line 103
**Current:** `contract.status === 'Analyzing'` shows loading spinner, else shows results.
**Action:** No change needed. Partial contracts should show results (the else branch), not the spinner. The current logic already handles this correctly since `'Partial' !== 'Analyzing'` evaluates to the results branch.

**Optional enhancement:** Show an info banner on Partial contracts indicating analysis was incomplete and some passes may have timed out. The `passResults` array on the Contract already contains per-pass status (`'success' | 'failed'`), so the banner could say "X of Y passes completed" using that data.

## Architecture Patterns

### Pattern: Status-Aware Filtering

The codebase currently uses inline equality checks (`=== 'Reviewed'`). For this phase, the simplest approach is to update each filter inline. If future statuses are added, a helper function would make sense, but with only 4 call sites it is not worth the abstraction yet.

```typescript
// Inline approach (recommended for 4 sites)
contracts.filter(c => c.status === 'Reviewed' || c.status === 'Partial')

// Helper approach (only if more statuses emerge later)
const hasAnalysisData = (status: Contract['status']) =>
  status === 'Reviewed' || status === 'Partial';
contracts.filter(c => hasAnalysisData(c.status))
```

### Pattern: Ternary Badge Styling

The existing ContractCard uses a nested ternary for badge colors. Adding one more case keeps it readable:

```typescript
contract.status === 'Reviewed'
  ? 'bg-emerald-100 text-emerald-700'
  : contract.status === 'Partial'
    ? 'bg-amber-100 text-amber-700'
    : contract.status === 'Analyzing'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-slate-100 text-slate-600'
```

### Anti-Patterns to Avoid
- **Catch-all else for badge color:** Do not let Partial fall into the else (slate). It must have its own distinct amber color to signal incomplete analysis.
- **Excluding Partial from all filters:** Partial contracts have real data. Excluding them hides valid findings and dates from the user.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status color mapping | A separate color config object | Inline ternary (existing pattern) | Only 4 statuses; the existing ternary pattern is used throughout the codebase |

## Common Pitfalls

### Pitfall 1: Missing a Filter Location
**What goes wrong:** One of the four `=== 'Reviewed'` filters is missed, causing inconsistent behavior (e.g., timeline shows Partial dates but dashboard stats do not count them).
**Why it happens:** The filter pattern is duplicated across files with no shared abstraction.
**How to avoid:** Grep for all `=== 'Reviewed'` and `=== 'Analyzing'` checks in `src/` and verify each is handled. The complete list is documented above.
**Warning signs:** Dashboard stat counts do not match timeline entry counts.

### Pitfall 2: Type Narrowing in ContractReview
**What goes wrong:** The `contract.status === 'Analyzing'` check on ContractReview line 103 could be refactored to check for "has data" instead, accidentally showing the spinner for Draft contracts.
**Why it happens:** Over-engineering the conditional.
**How to avoid:** Leave the ContractReview conditional as-is. It already works correctly for Partial since Partial is not Analyzing.

### Pitfall 3: Database Schema Mismatch
**What goes wrong:** The Supabase `contracts.status` column might be an enum that does not include `'Partial'`.
**Why it happens:** Server code already writes `'Partial'` successfully (Phase 51 shipped), so the DB column is likely a text/varchar, not an enum. But worth verifying.
**How to avoid:** The server has been writing `'Partial'` since Phase 51 without errors, confirming the column accepts it. No DB migration needed.

## Code Examples

### Updated Type Definition
```typescript
// src/types/contract.ts line 184
export interface Contract {
  // ...
  status: 'Analyzing' | 'Reviewed' | 'Partial' | 'Draft';
  // ...
}
```

### Updated ContractCard Badge
```typescript
// src/components/ContractCard.tsx line 75
<span
  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
    contract.status === 'Reviewed'
      ? 'bg-emerald-100 text-emerald-700'
      : contract.status === 'Partial'
        ? 'bg-amber-100 text-amber-700'
        : contract.status === 'Analyzing'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-slate-100 text-slate-600'
  }`}
>
  {contract.status}
</span>
```

### Updated Dashboard Filter
```typescript
// src/pages/Dashboard.tsx line 27
const reviewed = contracts.filter(
  (c) => c.status === 'Reviewed' || c.status === 'Partial'
);
```

## Open Questions

1. **Optional: Partial info banner on ContractReview page**
   - What we know: `passResults` array shows which passes succeeded/failed
   - What's unclear: Whether an info banner adds enough value vs. clutter
   - Recommendation: Include as optional enhancement -- low effort, helpful UX signal

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all affected files
- `api/analyze.ts` line 615 confirms server writes `'Partial'` on global timeout
- `src/types/contract.ts` line 184 confirms the gap (no `'Partial'` in union)

### Verification
- Grep for all `status === 'Reviewed'` locations: 4 found in src/ (App.tsx:42, Dashboard.tsx:27, dateUrgency.ts:75, PatternsCard.tsx:12)
- Grep for all `status === 'Analyzing'` locations: 1 found in src/ (ContractReview.tsx:103) -- no change needed
- No CONTEXT.md exists for this phase -- no locked decisions to honor

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure type/UI changes
- Architecture: HIGH - existing patterns are clear, 4 filter sites fully enumerated
- Pitfalls: HIGH - small scope, all locations identified via grep

**Research date:** 2026-03-23
**Valid until:** Indefinite (stable codebase patterns, no external dependencies)
