# Phase 22: Polish & Trust - Research

**Researched:** 2026-03-14
**Domain:** React UI patterns, tech debt refactoring, browser history API
**Confidence:** HIGH

## Summary

Phase 22 is a purely frontend phase combining mechanical tech debt cleanup (6 items) with UX enhancements (6 items). All work operates on existing code -- no new libraries, no backend changes, no API modifications. The tech debt items are isolated refactors with clear before/after states. The UX items add UI capabilities using patterns already established in the codebase (Tailwind, Framer Motion, Lucide icons, localStorage persistence).

The most complex UX item is the Upcoming Deadlines widget (UX-05), which requires cross-contract date aggregation. The most architecturally sensitive item is the useRouter replaceState fix (DEBT-06), which affects all navigation paths and must be tested manually across browser back/forward scenarios.

**Primary recommendation:** Tackle tech debt first (DEBT-01 through DEBT-06) to establish a clean baseline, then build UX features on the cleaned-up codebase. Each debt item is independent and can be done in any order. UX items have a natural dependency chain: UX-01 (rename) is independent, UX-02/UX-03/UX-04 are independent of each other, UX-05 depends on UX-03 patterns (date urgency coloring), and UX-06 depends on DEBT-06 (router fix).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Contract Renaming (UX-01):** Click-to-edit on review page header with pencil icon hint, Enter/blur to save, Escape to cancel. Default name is PDF filename minus extension. User-set name replaces everywhere.
- **Data-driven Dashboard (UX-02, UX-03, UX-05):** Open/resolved badge pair on cards "[5 open] [checkmark 2 resolved]". "Total Findings" stat becomes "Open Findings". Date timeline shows "X days away/ago" with red/amber/green urgency coloring. Static compliance card replaced with Upcoming Deadlines widget (next 3-5 dates across ALL contracts).
- **Bid Signal Factor Breakdown (UX-04):** Clickable expand/collapse on existing traffic light widget. Collapsed by default. Expanded shows 5 factors with individual score bars, weights, reason text. Per-factor color: green (>0.7), amber (0.4-0.7), red (<0.4).
- **Upload Escape & Failure (UX-06):** Top-left back arrow on upload page. Back navigates to previous view via browser history. Back during active analysis cancels API call and removes placeholder. Re-analyze failure navigates back to review page with toast.

### Claude's Discretion
- All tech debt implementation details (DEBT-01 through DEBT-06) -- mechanical refactors
- Exact spacing, typography, and animation choices for new UI elements
- Error state handling for edge cases
- Loading skeleton approach during analysis

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEBT-01 | Duplicate BidSignal types consolidated to single import | BidSignal/BidFactor/BidSignalLevel duplicated in contract.ts lines 153-166 AND bidSignal.ts lines 3-16; remove from bidSignal.ts, import from contract.ts |
| DEBT-02 | useContractStore calls loadContracts() once instead of twice | Lines 7 and 12 of useContractStore.ts both call loadContracts(); refactor to single call with destructured result |
| DEBT-03 | merge.ts uses Zod-typed results instead of `as` casts | buildBaseFinding uses Record<string, unknown> with ~15 `as` casts; use Zod inferred types from schema imports |
| DEBT-04 | Dead updateField removed from useCompanyProfile | useCompanyProfile.ts exports both updateField (lines 8-20) and saveField (lines 25-43); updateField is dead code superseded by saveField |
| DEBT-05 | ContractDateSchema extracted to shared module instead of 3 copies | Identical schema in analysis.ts:44, legalAnalysis.ts:19, scopeComplianceAnalysis.ts:19; export from analysis.ts, import in others |
| DEBT-06 | useRouter replaceState/pushState asymmetry fixed | Upload uses replaceState (line 45) while all other routes use pushState; upload should pushState so back button works consistently |
| UX-01 | User can rename contract inline from review page | ContractReview header (line 189) currently renders static h1; needs click-to-edit input with onBlur save pattern from Settings |
| UX-02 | Dashboard and contract cards show open vs resolved finding counts | ContractCard.tsx shows only severity badges; needs open/resolved badge pair. Dashboard stat "Total Findings" becomes "Open Findings" |
| UX-03 | Date timeline shows urgency indicators | DateTimeline.tsx currently shows date type colors only; needs days-until computation and red/amber/green urgency coloring |
| UX-04 | Bid signal expanded to show factor breakdown | BidSignalWidget.tsx is 25 lines showing just dot+label; needs expand/collapse with per-factor score bars using existing BidFactor data |
| UX-05 | Dashboard compliance card replaced with data-driven upcoming deadlines | Dashboard.tsx lines 145-158 have static "Compliance Update" card; replace with cross-contract date aggregation sorted by proximity |
| UX-06 | Upload page has back/cancel; re-analyze failure navigates to review | ContractUpload.tsx has no back button; App.tsx upload failure navigates to upload (line 90-91) instead of staying on review |
</phase_requirements>

## Standard Stack

### Core (already in project -- no new dependencies)
| Library | Version | Purpose | Already Used |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Yes |
| TypeScript | strict mode | Type safety | Yes |
| Tailwind CSS | 3.x | Styling | Yes |
| Framer Motion | 10+ | Animations | Yes |
| Lucide React | latest | Icons | Yes |
| Zod | 3.x | Schema validation | Yes (server schemas) |

### No New Dependencies Needed
This phase requires zero new packages. All patterns can be implemented with existing stack.

## Architecture Patterns

### Pattern 1: Click-to-Edit Inline Rename (UX-01)
**What:** Controlled input that toggles between display and edit mode
**When to use:** Contract title in review page header
**Example:**
```typescript
// Inline rename with Enter/Escape/blur handling
const [isEditing, setIsEditing] = useState(false);
const [editValue, setEditValue] = useState(contract.name);
const inputRef = useRef<HTMLInputElement>(null);

const startEditing = () => {
  setEditValue(contract.name);
  setIsEditing(true);
};

const commitRename = () => {
  const trimmed = editValue.trim();
  if (trimmed && trimmed !== contract.name) {
    onRename(trimmed); // calls updateContract(id, { name: trimmed })
  }
  setIsEditing(false);
};

const cancelEditing = () => {
  setEditValue(contract.name);
  setIsEditing(false);
};

// Focus input when entering edit mode
useEffect(() => {
  if (isEditing) inputRef.current?.focus();
}, [isEditing]);

// In JSX:
{isEditing ? (
  <input
    ref={inputRef}
    value={editValue}
    onChange={(e) => setEditValue(e.target.value)}
    onBlur={commitRename}
    onKeyDown={(e) => {
      if (e.key === 'Enter') commitRename();
      if (e.key === 'Escape') cancelEditing();
    }}
    className="text-xl font-bold text-slate-900 bg-transparent border-b-2 border-blue-500 outline-none"
  />
) : (
  <h1
    onClick={startEditing}
    className="text-xl font-bold text-slate-900 group cursor-pointer"
  >
    {contract.name}
    <Pencil className="w-4 h-4 inline ml-2 text-slate-400 opacity-0 group-hover:opacity-100" />
  </h1>
)}
```

### Pattern 2: Date Urgency Computation (UX-03, UX-05)
**What:** Compute days-until/days-ago and map to urgency color
**When to use:** DateTimeline and Upcoming Deadlines widget
**Example:**
```typescript
function getUrgency(dateStr: string): { label: string; color: string; isPast: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)} days ago`, color: 'text-slate-400', isPast: true };
  }
  if (diffDays === 0) {
    return { label: 'Today', color: 'text-red-600', isPast: false };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays} days away`, color: 'text-red-600', isPast: false };
  }
  if (diffDays <= 30) {
    return { label: `${diffDays} days away`, color: 'text-amber-600', isPast: false };
  }
  return { label: `${diffDays} days away`, color: 'text-emerald-600', isPast: false };
}
```

### Pattern 3: Expand/Collapse with Framer Motion (UX-04)
**What:** Animated disclosure for bid signal factor breakdown
**When to use:** BidSignalWidget expansion
**Example:**
```typescript
const [expanded, setExpanded] = useState(false);

<motion.div
  initial={false}
  animate={{ height: expanded ? 'auto' : 0 }}
  transition={{ duration: 0.2 }}
  className="overflow-hidden"
>
  {/* Factor rows here */}
</motion.div>
```

### Pattern 4: AbortController for Upload Cancellation (UX-06)
**What:** Cancel in-flight fetch when user navigates away from upload
**When to use:** Back button during active analysis
**Note:** The current analyzeContract function does not accept an AbortSignal. The implementation must either:
  - Add AbortSignal support to analyzeContract, OR
  - Simply delete the placeholder contract and let the response be ignored when it arrives (simpler, matches existing error handling pattern where deleteContract removes the placeholder)

**Recommendation:** Use the simpler approach -- delete placeholder and ignore response. The fetch will complete in the background but the promise handler already checks if the contract still exists.

### Anti-Patterns to Avoid
- **Derived state in useState:** Open/resolved counts should be computed inline (or with useMemo), never stored as separate state that can drift from the source findings array.
- **Date string parsing with new Date():** Contract dates are strings like "2024-03-15". Always normalize time to midnight when computing day differences to avoid off-by-one errors from timezone offsets.
- **Inline style objects in render:** Continue using Tailwind classes, not inline style={{ }} for urgency colors. Use conditional class application.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date difference computation | Complex date math library | Simple day-diff from Date objects | Dates are simple YYYY-MM-DD strings; day granularity is sufficient |
| Animation for expand/collapse | CSS transitions with height hacks | Framer Motion animate={{ height: 'auto' }} | Already in project, handles height: auto correctly |
| Type consolidation | Manual type sync | Single export + re-export | One source of truth eliminates drift |

## Common Pitfalls

### Pitfall 1: useRouter replaceState breaks back button chain
**What goes wrong:** Upload currently uses replaceState, which means pressing back from upload skips to the page before the one that initiated upload, not to the initiating page.
**Why it happens:** replaceState was chosen to prevent upload appearing in history when analysis auto-navigates to review. But the CONTEXT specifies upload should have a working back button.
**How to avoid:** Change upload to pushState. The existing pattern where handleUploadComplete creates a placeholder and calls navigateTo('review', id) already pushes a new history entry for the review page, so back from review goes to upload (which now becomes the dashboard since upload is transient). The key insight: upload navigation should pushState, and the auto-redirect from upload to review after upload success should use replaceState (so review replaces upload in history).
**Warning signs:** Test all navigation paths: dashboard -> upload -> back should go to dashboard. Dashboard -> upload -> file selected -> auto-redirect to review -> back should go to dashboard (not upload).

### Pitfall 2: Stale closure in rename blur handler
**What goes wrong:** If the user types quickly and blurs, the onBlur handler captures a stale editValue.
**Why it happens:** React's synthetic events and state updates can race.
**How to avoid:** Use a ref to track the current edit value alongside the state, or commit from the input's current value directly via the event target.

### Pitfall 3: Cross-contract date aggregation performance
**What goes wrong:** Computing upcoming deadlines across all contracts on every render is O(contracts * dates).
**Why it happens:** Dashboard re-renders on any contract state change.
**How to avoid:** Wrap the computation in useMemo with contracts as dependency. For typical usage (under 50 contracts), this is not a real performance issue, but useMemo is good hygiene.

### Pitfall 4: Merge.ts Zod type refactor breaks at boundaries
**What goes wrong:** Replacing `Record<string, unknown>` with Zod inferred types causes type errors at the boundary where raw JSON meets typed functions.
**Why it happens:** The merge function receives results from Promise.allSettled where the actual runtime type depends on which pass produced the result. The `as unknown as Record<string, unknown>` casts exist because findings arrive as `z.infer<typeof SomePassSchema>['findings'][number]`, which varies per pass.
**How to avoid:** Define a union type for all possible finding shapes, or use discriminated union on sourcePass. The simplest safe refactor: define typed converter functions per pass that accept the correct Zod-inferred type, and call the right converter based on pass name. This preserves type safety without needing a single unified input type.

### Pitfall 5: Upload back button during active analysis
**What goes wrong:** User presses back while analysis is running, but the analysis promise still resolves and tries to update/navigate.
**Why it happens:** The promise in handleUploadComplete captures the contract ID in closure.
**How to avoid:** After deleting the placeholder contract, the updateContract call in the .then() handler is a no-op (contract not found in array). The .catch() handler already checks activeContractId. This is already safe with the current deletion pattern -- just ensure deleteContract is called before any navigation.

## Code Examples

### DEBT-01: Consolidate BidSignal Types
```typescript
// BEFORE: src/utils/bidSignal.ts has its own copies
export type BidSignalLevel = 'bid' | 'caution' | 'no-bid';
export interface BidFactor { name: string; score: number; weight: number; }
export interface BidSignal { level: BidSignalLevel; label: string; score: number; factors: BidFactor[]; }

// AFTER: Import from contract.ts (the canonical location)
import type { BidSignal, BidFactor, BidSignalLevel, Finding } from '../types/contract';
// Remove the local type/interface definitions, keep the function
```

### DEBT-02: Single loadContracts Call
```typescript
// BEFORE: Two separate calls
const [contracts, setContracts] = useState<Contract[]>(() => {
  const loaded = loadContracts();
  return loaded.contracts;
});
const [storageWarning, setStorageWarning] = useState<string | null>(() => {
  const loaded = loadContracts();  // Second call!
  return loaded.migrationWarning ?? null;
});

// AFTER: Single call, destructure both values
const [{ contracts: initialContracts, migrationWarning }] = useState(() => loadContracts());
const [contracts, setContracts] = useState<Contract[]>(initialContracts);
const [storageWarning, setStorageWarning] = useState<string | null>(migrationWarning ?? null);
```

### DEBT-05: Shared ContractDateSchema
```typescript
// src/schemas/analysis.ts already exports it:
export const ContractDateSchema = z.object({ ... });

// In legalAnalysis.ts and scopeComplianceAnalysis.ts:
// BEFORE: local `const ContractDateSchema = z.object({ ... });`
// AFTER:
import { ContractDateSchema } from './analysis';
```

### DEBT-06: Router Fix
```typescript
// BEFORE (useRouter.ts line 43-46):
if (view === 'upload') {
  newState = { view: 'upload', contractId: null };
  window.history.replaceState(null, '', '/upload');  // Bug: replaceState
  setState(newState);
  return;
}

// AFTER:
if (view === 'upload') {
  newState = { view: 'upload', contractId: null };
  window.history.pushState(null, '', '/upload');  // Fix: pushState like all others
  setState(newState);
  return;
}

// Additionally in App.tsx handleUploadComplete, after analysis starts:
// The navigateTo('review', id) already uses pushState, which means
// history is: [...previous] -> /upload -> /contracts/{id}
// Back from review goes to upload. This is correct per CONTEXT:
// "Back navigates to previous view (uses browser history)"
```

### UX-02: Open/Resolved Badge Pair on ContractCard
```typescript
// Add to ContractCard, in the bottom bar area:
const openCount = contract.findings.filter(f => !f.resolved).length;
const resolvedCount = contract.findings.filter(f => f.resolved).length;

<div className="flex items-center gap-2">
  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
    {openCount} open
  </span>
  {resolvedCount > 0 && (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="w-3 h-3 inline mr-0.5" /> {resolvedCount} resolved
    </span>
  )}
</div>
```

### UX-05: Upcoming Deadlines Widget
```typescript
// In Dashboard, replace the static compliance card:
const upcomingDates = contracts
  .filter(c => c.status === 'Reviewed')
  .flatMap(c => c.dates.map(d => ({ ...d, contractId: c.id, contractName: c.name })))
  .filter(d => {
    const target = new Date(d.date);
    const now = new Date();
    return target.getTime() >= now.getTime() - 86400000; // Include today
  })
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, 5);
```

## State of the Art

This phase does not introduce new technologies. All patterns use React 18 standard practices that have been stable since 2022.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate state for derived data | Compute inline or useMemo | React best practice | Avoids state sync bugs for open/resolved counts |
| CSS height transitions | Framer Motion animate height: 'auto' | Already in project | Smooth expand/collapse without JS height measurement |

## Open Questions

1. **Re-analyze failure navigation (UX-06 detail)**
   - What we know: CONTEXT says "Re-analyze failure navigates back to review page" with toast. Current code already stays on review page during re-analyze (handleReanalyze in App.tsx, lines 117-173). The rollback restores snapshot.
   - What's unclear: The current code already does the right thing -- re-analyze failure shows a toast and keeps user on review. The CONTEXT description may be referring to initial upload failure, not re-analyze.
   - Recommendation: For initial upload failure, the current code navigates to upload (line 90-91). Change this to NOT navigate away -- the placeholder is already deleted, so the review page will show nothing. Better: navigate to dashboard instead of upload. This aligns with "re-analyze failure returns user to the review page instead of the upload view."

2. **Upload back button during analysis - cancel API call or just cleanup?**
   - What we know: CONTEXT says "Clicking back during active analysis cancels the API call and removes the placeholder contract."
   - What's unclear: Whether to use AbortController or just delete the placeholder.
   - Recommendation: Use AbortController passed to fetch for clean cancellation, plus delete the placeholder. The response handler already guards against missing contracts.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (TypeScript compilation check) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-01 | Single BidSignal type source | build | `npm run build` | N/A -- compilation validates |
| DEBT-02 | Single loadContracts call | manual | grep verification | N/A |
| DEBT-03 | Zod-typed merge results | build | `npm run build` | N/A -- compilation validates |
| DEBT-04 | updateField removed | build | `npm run build` | N/A -- compilation validates |
| DEBT-05 | Shared ContractDateSchema | build | `npm run build` | N/A -- compilation validates |
| DEBT-06 | Consistent pushState/replaceState | manual | Browser back/forward testing | N/A |
| UX-01 | Inline rename | manual | Visual verification | N/A |
| UX-02 | Open/resolved badge pair | manual | Visual verification | N/A |
| UX-03 | Date urgency coloring | manual | Visual verification | N/A |
| UX-04 | Bid signal expand/collapse | manual | Visual verification | N/A |
| UX-05 | Upcoming deadlines widget | manual | Visual verification | N/A |
| UX-06 | Upload back/cancel | manual | Browser navigation testing | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors from refactors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build + lint green, manual navigation test

### Wave 0 Gaps
None -- no test framework exists and none is being introduced in this phase. Build and lint serve as automated validation. All UX items require manual verification.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all referenced files (contract.ts, useContractStore.ts, useRouter.ts, useCompanyProfile.ts, bidSignal.ts, BidSignalWidget.tsx, DateTimeline.tsx, Dashboard.tsx, ContractReview.tsx, ContractUpload.tsx, App.tsx, merge.ts, schema files)
- CONTEXT.md locked decisions

### Secondary (MEDIUM confidence)
- React 18 useState/useEffect/useMemo patterns (stable, well-known)
- History API pushState/replaceState behavior (web standard)
- Framer Motion animate height pattern (established in codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing
- Architecture: HIGH - all patterns verified against actual codebase
- Pitfalls: HIGH - derived from reading actual code and identifying real bugs (DEBT-06 replaceState, double loadContracts)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- no external dependencies changing)
