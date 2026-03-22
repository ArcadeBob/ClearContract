# Phase 53: Contract Lifecycle Status - Research

**Researched:** 2026-03-22
**Domain:** Contract lifecycle state management, Supabase schema migration, React UI (badges, dropdowns, filters)
**Confidence:** HIGH

## Summary

Phase 53 adds a business lifecycle status field to contracts, separate from the existing analysis `status` field (`Analyzing | Reviewed | Draft | Partial`). The lifecycle statuses are: Draft, Under Review, Negotiating, Signed, Active, Expired. This requires a Supabase schema migration, a transition validation map, UI badges on contract cards and the review header, a dropdown selector on the review page, and a multi-select filter on the All Contracts page.

The codebase already has all necessary patterns: `SeverityBadge` for color-coded badges, `MultiSelectDropdown` for multi-select filtering, `mapToSnake`/`mapRow` for Supabase column mapping, and optimistic update with rollback in `useContractStore`. No new dependencies are needed. The `Out of Scope` table in REQUIREMENTS.md explicitly forbids xstate ("6 lifecycle states with simple transition map -- solvable in 10 lines of TypeScript") and new npm dependencies.

**Primary recommendation:** Follow existing patterns exactly -- add a `lifecycle_status` column via SQL migration, define a const tuple + transition map in `types/contract.ts`, create a `LifecycleBadge` component mirroring `SeverityBadge`, add an `updateLifecycleStatus` method to `useContractStore` with optimistic update, and wire into existing UI components.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIFE-01 | New lifecycle_status column on contracts table (Draft/Under Review/Negotiating/Signed/Active/Expired) separate from analysis status | Supabase migration pattern from Phase 51; contracts table schema documented; analyze.ts contract insert path identified for default value |
| LIFE-02 | Color-coded lifecycle badges on contract cards and review header | SeverityBadge + palette.ts pattern; ContractCard and ReviewHeader component structure documented |
| LIFE-03 | Dropdown selector with validated transitions on contract review page | Transition map pattern (10 lines TS per REQUIREMENTS.md); useContractStore optimistic update pattern documented |
| LIFE-04 | Multi-select lifecycle status filter on All Contracts page | MultiSelectDropdown component already exists; AllContracts filtering pattern documented |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI components | Already in use |
| TypeScript | strict | Type safety for lifecycle states | Already in use |
| Tailwind CSS | 3.x | Badge and dropdown styling | Already in use |
| Supabase JS | 2.x | Database reads/writes | Already in use |

### Supporting
No new libraries. All features build on existing stack per REQUIREMENTS.md Out of Scope.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain transition map | xstate | Explicitly ruled out in REQUIREMENTS.md -- 6 states with simple transitions |
| Native select element | Custom dropdown | Native `<select>` is simpler and sufficient for single-select lifecycle changes; only needs to show valid transitions |

## Architecture Patterns

### Recommended Project Structure
```
src/
  types/contract.ts          # Add LIFECYCLE_STATUSES const, LifecycleStatus type, LIFECYCLE_TRANSITIONS map
  utils/palette.ts           # Add LIFECYCLE_BADGE_COLORS record
  components/
    LifecycleBadge.tsx        # New -- mirrors SeverityBadge pattern
    LifecycleSelect.tsx       # New -- dropdown for changing status with transition validation
    ContractCard.tsx          # Modified -- add LifecycleBadge
    ReviewHeader.tsx          # Modified -- add LifecycleBadge + LifecycleSelect
    MultiSelectDropdown.tsx   # Reused as-is for AllContracts filter
  pages/
    AllContracts.tsx          # Modified -- add lifecycle filter state + MultiSelectDropdown
    Dashboard.tsx             # Modified -- add LifecycleBadge to ContractCard (passed through)
  hooks/
    useContractStore.ts       # Modified -- add updateLifecycleStatus method
supabase/
  migrations/
    20260322_add_lifecycle_status.sql  # New migration
api/
  analyze.ts                 # Modified -- set default lifecycle_status on contract insert
```

### Pattern 1: Lifecycle Status Type Definition
**What:** Const tuple + type extraction + transition map, all in `types/contract.ts`
**When to use:** Defining the lifecycle states and valid transitions
**Example:**
```typescript
// In src/types/contract.ts
export const LIFECYCLE_STATUSES = [
  'Draft',
  'Under Review',
  'Negotiating',
  'Signed',
  'Active',
  'Expired',
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

// Valid transitions: key = current status, value = statuses it can move to
export const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, readonly LifecycleStatus[]> = {
  'Draft':         ['Under Review', 'Expired'],
  'Under Review':  ['Negotiating', 'Signed', 'Draft', 'Expired'],
  'Negotiating':   ['Under Review', 'Signed', 'Expired'],
  'Signed':        ['Active', 'Expired'],
  'Active':        ['Expired'],
  'Expired':       [],  // terminal state
};
```

### Pattern 2: Color-Coded Badge (mirrors SeverityBadge)
**What:** Standalone badge component with Tailwind literal classes for JIT purge safety
**When to use:** Displaying lifecycle status on cards and headers
**Example:**
```typescript
// In src/utils/palette.ts
export const LIFECYCLE_BADGE_COLORS: Record<LifecycleStatus, string> = {
  'Draft':         'bg-slate-100 text-slate-600 border-slate-200',
  'Under Review':  'bg-blue-100 text-blue-700 border-blue-200',
  'Negotiating':   'bg-purple-100 text-purple-700 border-purple-200',
  'Signed':        'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Active':        'bg-green-100 text-green-700 border-green-200',
  'Expired':       'bg-red-100 text-red-600 border-red-200',
};
```

### Pattern 3: Optimistic Update with Rollback (existing pattern)
**What:** Update local state immediately, write to Supabase, rollback on error
**When to use:** The `updateLifecycleStatus` method in `useContractStore`
**Example:**
```typescript
// Follows exact pattern of renameContract, toggleFindingResolved, etc.
const updateLifecycleStatus = async (id: string, lifecycleStatus: LifecycleStatus) => {
  const prev = [...contracts];
  setContracts((cs) =>
    cs.map((c) => (c.id === id ? { ...c, lifecycleStatus } : c))
  );

  const { error } = await supabase
    .from('contracts')
    .update({ lifecycle_status: lifecycleStatus })
    .eq('id', id);

  if (error) {
    console.error('Failed to update lifecycle status:', error);
    setContracts(prev);
    showToast({ type: 'error', message: 'Failed to update status. Changes reverted.' });
  }
};
```

### Pattern 4: Supabase Migration (follows Phase 51 pattern)
**What:** ALTER TABLE to add column with CHECK constraint and default
**Example:**
```sql
-- Add lifecycle_status column with default 'Draft'
ALTER TABLE contracts
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'Draft'
  CHECK (lifecycle_status IN ('Draft', 'Under Review', 'Negotiating', 'Signed', 'Active', 'Expired'));

-- Index for filter queries
CREATE INDEX idx_contracts_lifecycle_status ON contracts(lifecycle_status);
```

### Pattern 5: Multi-Select Filter on AllContracts (reuse MultiSelectDropdown)
**What:** Add lifecycle filter state and wire MultiSelectDropdown into AllContracts
**When to use:** LIFE-04 requirement
**Example:**
```typescript
// In AllContracts.tsx -- new state
const [lifecycleFilter, setLifecycleFilter] = useState<Set<string>>(
  new Set(LIFECYCLE_STATUSES)
);

// In filter logic inside useMemo
if (lifecycleFilter.size < LIFECYCLE_STATUSES.length) {
  result = result.filter((c) => lifecycleFilter.has(c.lifecycleStatus));
}

// In JSX, alongside existing type filter buttons
<MultiSelectDropdown
  label="Status"
  options={LIFECYCLE_STATUSES}
  selected={lifecycleFilter}
  onChange={(s) => setLifecycleFilter(s as Set<string>)}
/>
```

### Anti-Patterns to Avoid
- **Conflating lifecycle_status with analysis status:** These are separate concerns. The existing `status` field (`Analyzing | Reviewed | Draft | Partial`) tracks AI analysis state. `lifecycle_status` tracks business lifecycle. Never merge them.
- **Over-engineering transitions:** Do NOT use a state machine library. A simple `Record<LifecycleStatus, readonly LifecycleStatus[]>` is sufficient and explicitly called out in REQUIREMENTS.md.
- **String interpolation in Tailwind classes:** Always use full literal class strings in the palette record. Tailwind JIT purge cannot detect dynamically constructed class names.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select filter UI | Custom checkbox list | `MultiSelectDropdown` component | Already exists, battle-tested, handles keyboard events |
| Column name mapping | Manual snake_case conversion | `mapToSnake` / `mapRow` from `src/lib/mappers.ts` | Consistent with all existing Supabase interactions |
| Toast notifications | Custom error display | `useToast` hook + `showToast` | Already used in all store methods for error rollback |
| Badge color mapping | Inline conditionals | Palette record in `utils/palette.ts` | Pattern established by `SEVERITY_BADGE_COLORS` |

## Common Pitfalls

### Pitfall 1: Forgetting to Set Default on Existing Rows
**What goes wrong:** Migration adds `lifecycle_status` column but existing contracts have no value, causing NULL constraint violation or empty badges.
**Why it happens:** Column added without DEFAULT or without backfilling.
**How to avoid:** Use `NOT NULL DEFAULT 'Draft'` in the ALTER TABLE statement. Postgres will backfill all existing rows automatically.
**Warning signs:** Existing contracts show no badge or crash on render.

### Pitfall 2: Forgetting to Include lifecycle_status in Contract Insert (analyze.ts)
**What goes wrong:** New contracts analyzed via API don't get a lifecycle_status value, relying on DB default.
**Why it happens:** The `contractPayload` in `api/analyze.ts` doesn't include the field.
**How to avoid:** The DB default of 'Draft' handles this automatically. However, for clarity, explicitly include `lifecycleStatus: 'Draft'` in the contractPayload in analyze.ts.
**Warning signs:** It works by accident but is fragile if default is ever changed.

### Pitfall 3: mapRow Not Mapping lifecycle_status to lifecycleStatus
**What goes wrong:** The field comes back from Supabase as `lifecycle_status` but the Contract type expects `lifecycleStatus`.
**Why it happens:** Developer forgets that mapRow handles snake_case to camelCase automatically.
**How to avoid:** This is already handled -- `mapRow` converts `lifecycle_status` to `lifecycleStatus` automatically. Just add `lifecycleStatus: LifecycleStatus` to the `Contract` interface.
**Warning signs:** Field is undefined on the client despite being in the DB.

### Pitfall 4: Dropdown Shows All Statuses Instead of Valid Transitions
**What goes wrong:** User can select any status, including invalid transitions.
**Why it happens:** Using LIFECYCLE_STATUSES array directly as dropdown options instead of filtering through LIFECYCLE_TRANSITIONS.
**How to avoid:** The LifecycleSelect component must read `LIFECYCLE_TRANSITIONS[currentStatus]` to populate options.
**Warning signs:** User can move contract from "Expired" back to "Draft".

### Pitfall 5: Forgetting to Add lifecycleStatus to Contract Type
**What goes wrong:** TypeScript doesn't enforce the field, it silently passes through as `unknown`.
**Why it happens:** Contract interface in types/contract.ts not updated.
**How to avoid:** Add `lifecycleStatus: LifecycleStatus` to the `Contract` interface with a default in the mapRow usage.
**Warning signs:** No TypeScript errors but field renders as undefined.

## Code Examples

### LifecycleBadge Component
```typescript
// src/components/LifecycleBadge.tsx
import type { LifecycleStatus } from '../types/contract';
import { LIFECYCLE_BADGE_COLORS } from '../utils/palette';

interface LifecycleBadgeProps {
  status: LifecycleStatus;
  className?: string;
}

export function LifecycleBadge({ status, className = '' }: LifecycleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${LIFECYCLE_BADGE_COLORS[status]} ${className}`}
    >
      {status}
    </span>
  );
}
```

### LifecycleSelect Component
```typescript
// src/components/LifecycleSelect.tsx
import type { LifecycleStatus } from '../types/contract';
import { LIFECYCLE_TRANSITIONS } from '../types/contract';

interface LifecycleSelectProps {
  current: LifecycleStatus;
  onChange: (status: LifecycleStatus) => void;
}

export function LifecycleSelect({ current, onChange }: LifecycleSelectProps) {
  const validTransitions = LIFECYCLE_TRANSITIONS[current];

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as LifecycleStatus)}
      className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value={current}>{current}</option>
      {validTransitions.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
```

### Migration SQL
```sql
-- supabase/migrations/20260322_add_lifecycle_status.sql
ALTER TABLE contracts
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'Draft'
  CHECK (lifecycle_status IN ('Draft', 'Under Review', 'Negotiating', 'Signed', 'Active', 'Expired'));

CREATE INDEX idx_contracts_lifecycle_status ON contracts(lifecycle_status);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single status field mixing analysis + business state | Separate `status` (analysis) and `lifecycle_status` (business) fields | This phase | Clean separation of concerns |
| No lifecycle tracking | Explicit state machine with validated transitions | This phase | Users can track contract progression |

## Open Questions

1. **Transition map completeness**
   - What we know: The 6 statuses and general flow (Draft -> Under Review -> Negotiating -> Signed -> Active -> Expired)
   - What's unclear: Whether users should be able to move backwards (e.g., Signed back to Negotiating for amendments)
   - Recommendation: Allow backward transitions where business-sensible (Under Review -> Draft, Negotiating -> Under Review). Keep Expired as terminal. The transition map in Pattern 1 above reflects a reasonable default. Can be adjusted after user feedback.

2. **Default status for newly analyzed contracts**
   - What we know: The DB default is 'Draft', which is correct for newly uploaded contracts
   - What's unclear: Whether re-analyzed contracts should preserve their lifecycle status
   - Recommendation: Re-analysis updates the analysis `status` field but should NOT change `lifecycle_status`. The existing re-analyze flow in analyze.ts updates the contract row -- just exclude `lifecycle_status` from the update payload (or don't include it in `contractPayload`).

## Validation Architecture

No test framework is configured per CLAUDE.md ("No test framework is configured"). Validation will be manual.

### Phase Requirements -> Validation Map
| Req ID | Behavior | Validation Method |
|--------|----------|-------------------|
| LIFE-01 | lifecycle_status column exists in Supabase with correct CHECK and default | Run migration, inspect table schema, insert row without specifying lifecycle_status |
| LIFE-02 | Badges appear on ContractCard and ReviewHeader | Visual inspection: load dashboard, all contracts, and review page |
| LIFE-03 | Dropdown shows only valid transitions, persists on change | Click through each status, verify dropdown options match LIFECYCLE_TRANSITIONS, reload page to confirm persistence |
| LIFE-04 | Multi-select filter narrows contract list | Select/deselect lifecycle statuses, verify filtered list updates correctly |

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/types/contract.ts` -- existing type patterns (const tuple + type extraction)
- Codebase analysis: `src/components/SeverityBadge.tsx` -- badge component pattern
- Codebase analysis: `src/utils/palette.ts` -- color record pattern with full Tailwind literals
- Codebase analysis: `src/components/MultiSelectDropdown.tsx` -- reusable multi-select pattern
- Codebase analysis: `src/hooks/useContractStore.ts` -- optimistic update + rollback pattern
- Codebase analysis: `supabase/migrations/20260322_add_analysis_usage.sql` -- migration pattern
- Codebase analysis: `api/analyze.ts` -- contract insert/update path
- Codebase analysis: `src/lib/mappers.ts` -- snake_case/camelCase conversion
- `.planning/REQUIREMENTS.md` -- Out of Scope table (no xstate, no new deps)

### Secondary (MEDIUM confidence)
- None needed -- all patterns are directly from the codebase

### Tertiary (LOW confidence)
- Transition map design (reasonable defaults, may need user feedback)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all existing patterns
- Architecture: HIGH - direct extension of existing patterns (badge, filter, optimistic update)
- Pitfalls: HIGH - identified from direct codebase analysis (mapRow, DB defaults, transition validation)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- internal project patterns, no external API changes)
