# Phase 16: Finding Actions - Research

**Researched:** 2026-03-13
**Domain:** React state management, inline editing UI, localStorage persistence, Framer Motion animations
**Confidence:** HIGH

## Summary

Phase 16 adds user-driven finding actions: resolve toggle, text notes (add/edit/delete), a "Hide resolved" filter, and resolved counts in summary/category headers. All changes are contained within the existing React + Tailwind + Framer Motion stack with no new dependencies required.

The implementation touches four layers: (1) the `Finding` type gets two optional fields, (2) `useContractStore` gets helper methods for finding-level mutations, (3) `FindingCard` gets resolve button and note UI, and (4) `ContractReview` gets the hide-resolved toggle and resolved counts. The existing `persistAndSet` pattern in `useContractStore` already handles localStorage persistence, and the existing `ConfirmDialog` component handles delete confirmation.

**Primary recommendation:** Extend the Finding type with optional `resolved` and `note` fields, add targeted update methods to useContractStore, and build the UI changes in FindingCard and ContractReview using existing component patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Resolve button: small checkmark icon in top-right corner of FindingCard, next to severity badge
- Single-click toggle, no confirmation (easily reversible)
- Resolved styling: 60% opacity, strikethrough title, green checkmark icon
- Resolved findings stay in original position (no re-sorting)
- "Add note" trigger: subtle text link (`+ Add note`) at bottom of FindingCard
- Inline textarea expansion (no modal), with Save and Cancel buttons
- Note display: purple/violet tinted block matching existing colored info block pattern
- Note block shows "YOUR NOTE" label with edit (pencil) and delete (x) icon buttons
- Delete note requires confirmation via existing ConfirmDialog
- "Hide resolved" toggle: checkbox-style next to existing view mode toggles
- Default state: off (show all findings)
- Hide-resolved uses Framer Motion AnimatePresence for animate-out
- Toggle preference persists in localStorage
- Overall count: "12 Findings (5 resolved)" parenthetical
- Per-category counts: "Legal Issues (2 of 5 resolved)"
- Fully resolved category gets green checkmark icon

### Claude's Discretion
- Exact icon choices for resolve/edit/delete buttons (from Lucide React)
- Textarea sizing and character limits
- Purple/violet shade selection for note blocks
- Animation timing for resolve/hide transitions
- How "Hide resolved" interacts with empty state (all resolved + hide)
- localStorage key naming for hide-resolved preference

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIND-01 | User can mark a finding as resolved (toggleable) | Finding type extension with `resolved?: boolean`, resolve toggle method in useContractStore, checkmark button in FindingCard |
| FIND-02 | User can add a text note to any finding | Finding type extension with `note?: string`, inline textarea with Save/Cancel in FindingCard |
| FIND-03 | User can edit or delete their note on a finding | Pre-filled textarea for edit, ConfirmDialog for delete, update/clear note methods in useContractStore |
| FIND-04 | User can toggle "Hide resolved" to filter resolved findings from view | localStorage-persisted boolean, AnimatePresence filtering in ContractReview |
| FIND-05 | User sees resolved finding counts in risk summary | Computed counts in ContractReview summary panel and CategorySection headers |
</phase_requirements>

## Standard Stack

### Core (already installed, no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component framework | Already in use |
| TypeScript | strict | Type safety | Already in use |
| Tailwind CSS | 3.x | Styling | Already in use |
| Framer Motion | 10+ | AnimatePresence for hide-resolved | Already used in CategorySection and ContractReview |
| Lucide React | latest | Icons (Check, CheckCircle, Pencil, X, CircleCheck) | Already used throughout app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage | Web API | Persist hide-resolved toggle preference | For user preference only (finding data persists via existing contractStorage) |

### Alternatives Considered
None -- this phase uses only existing dependencies.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Changes by File

```
src/
├── types/contract.ts           # Add resolved?, note? to Finding interface
├── hooks/useContractStore.ts   # Add toggleFindingResolved(), updateFindingNote() methods
├── components/
│   ├── FindingCard.tsx          # Resolve button, note display, add/edit note UI
│   └── CategorySection.tsx     # Resolved count in header, green checkmark when all resolved
└── pages/
    └── ContractReview.tsx       # Hide-resolved toggle, resolved count in summary, filtering logic
```

### Pattern 1: Finding-Level Mutations via Contract Update
**What:** Since findings are nested inside Contract, mutations go through `updateContract()` by mapping the findings array.
**When to use:** Every finding action (resolve, note add/edit/delete).
**Example:**
```typescript
// In useContractStore
const toggleFindingResolved = (contractId: string, findingId: string) => {
  persistAndSet((prev) =>
    prev.map((c) =>
      c.id === contractId
        ? {
            ...c,
            findings: c.findings.map((f) =>
              f.id === findingId ? { ...f, resolved: !f.resolved } : f
            ),
          }
        : c
    )
  );
};

const updateFindingNote = (contractId: string, findingId: string, note: string | undefined) => {
  persistAndSet((prev) =>
    prev.map((c) =>
      c.id === contractId
        ? {
            ...c,
            findings: c.findings.map((f) =>
              f.id === findingId ? { ...f, note } : f
            ),
          }
        : c
    )
  );
};
```

### Pattern 2: Inline Editing State in FindingCard
**What:** FindingCard manages its own local editing state (isAddingNote, editingText) while persisted data flows via props + callbacks.
**When to use:** Note add/edit interactions.
**Example:**
```typescript
// FindingCard gets new props
interface FindingCardProps {
  finding: Finding;
  index: number;
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
}
```

### Pattern 3: Existing Colored Info Block Pattern
**What:** FindingCard already has blue (Recommendation), amber (Why This Matters), emerald (Negotiation Position) blocks. User notes follow the same structure with purple/violet.
**Example:**
```typescript
// Existing pattern (from FindingCard.tsx line 52-59):
<div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-3">
  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
    Recommendation
  </p>
  <p className="text-sm text-blue-800">{finding.recommendation}</p>
</div>

// User note follows same pattern with violet:
<div className="bg-violet-50 border border-violet-100 rounded-md p-3 mb-3">
  <div className="flex items-center justify-between mb-1">
    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
      Your Note
    </p>
    <div className="flex items-center gap-1">
      {/* edit and delete buttons */}
    </div>
  </div>
  <p className="text-sm text-violet-800">{finding.note}</p>
</div>
```

### Pattern 4: localStorage for UI Preferences
**What:** Hide-resolved toggle persists separately from contract data, using a simple localStorage key.
**Example:**
```typescript
const HIDE_RESOLVED_KEY = 'clearcontract:hide-resolved';

// Read on mount
const [hideResolved, setHideResolved] = useState(() => {
  try {
    return localStorage.getItem(HIDE_RESOLVED_KEY) === 'true';
  } catch {
    return false;
  }
});

// Persist on change
const toggleHideResolved = () => {
  setHideResolved((prev) => {
    const next = !prev;
    try { localStorage.setItem(HIDE_RESOLVED_KEY, String(next)); } catch {}
    return next;
  });
};
```

### Anti-Patterns to Avoid
- **Creating a separate "findings store":** Finding data belongs on the Contract object. Do not create a parallel store -- mutate findings through the contract update path.
- **Using modals for note editing:** User decision is inline textarea, not modal. Modals interrupt flow.
- **Re-sorting findings on resolve:** User decided resolved findings stay in place. Do not move them to the bottom.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Delete confirmation | Custom confirm UI | Existing `ConfirmDialog` component | Already built, handles Escape key, backdrop click |
| Animate-out on hide | Manual DOM removal | Framer Motion `AnimatePresence` | Already used in CategorySection and ContractReview for filtered lists |
| Icons | SVG paths | Lucide React icons | Consistent with app, already imported |

## Common Pitfalls

### Pitfall 1: Backward Compatibility with Existing Contracts
**What goes wrong:** Existing contracts in localStorage lack `resolved` and `note` fields. Code that accesses `finding.resolved` without nullish coalescing will get `undefined`, which is falsy (safe for boolean), but code that does strict checks (`=== false`) will break.
**Why it happens:** Schema evolution without migration.
**How to avoid:** Use `finding.resolved ?? false` for boolean checks. Use `finding.note ?? undefined` for note existence. The optional fields (`resolved?: boolean; note?: string`) handle this naturally -- never default them in a migration step.
**Warning signs:** Tests/UI show incorrect state for pre-existing contracts.

### Pitfall 2: Props Drilling Through CategorySection
**What goes wrong:** FindingCard needs `onToggleResolved` and `onUpdateNote` callbacks, but it's rendered inside CategorySection. If callbacks aren't threaded through, the buttons won't work.
**Why it happens:** CategorySection currently renders FindingCard with only `finding` and `index` props.
**How to avoid:** Add callback props to both CategorySection and FindingCard interfaces. Pass contractId from ContractReview down through the chain.
**Warning signs:** Clicking resolve/note buttons does nothing.

### Pitfall 3: Hide-Resolved Filter Not Applied to Both View Modes
**What goes wrong:** Developer applies hide-resolved filter to by-category view but forgets by-severity flat list, or vice versa.
**Why it happens:** ContractReview has two separate rendering paths (groupedFindings and flatFindings).
**How to avoid:** Apply the filter at the data level before both rendering paths diverge. Filter `contract.findings` early and use the filtered array for both modes.
**Warning signs:** Hiding resolved works in one view mode but not the other.

### Pitfall 4: AnimatePresence Needs `exit` Prop on FindingCard
**What goes wrong:** Toggling hide-resolved doesn't animate findings out -- they just disappear.
**Why it happens:** `AnimatePresence` requires child `motion.*` elements to have an `exit` animation defined.
**How to avoid:** Add `exit={{ opacity: 0, y: -10 }}` to FindingCard's `motion.div`. The component already uses `motion.div` with `initial` and `animate`.
**Warning signs:** No animation when findings are filtered out.

### Pitfall 5: Resolved Count in CategorySection When Category is Filtered
**What goes wrong:** Category resolved counts show wrong numbers when category filter is active.
**Why it happens:** Confusion between filtered and total findings.
**How to avoid:** CategorySection always receives its full findings array (already filtered by category). Resolved count is computed within CategorySection from its own `findings` prop, not from a global count.
**Warning signs:** Count changes when switching category filter.

### Pitfall 6: Empty State When All Findings Resolved + Hidden
**What goes wrong:** User resolves all findings and enables "Hide resolved" -- sees blank area with no explanation.
**Why it happens:** No empty state message for this case.
**How to avoid:** Show a message like "All findings resolved. Uncheck 'Hide resolved' to view them." when filtered list is empty but unfiltered list is not.
**Warning signs:** Blank findings area with no user guidance.

## Code Examples

### Lucide Icons to Use (Discretion Area)
```typescript
import {
  Check,           // Outline checkmark for unresolved state
  CheckCircle2,    // Solid checkmark for resolved state (or CircleCheck)
  Pencil,          // Edit note button
  X,               // Delete note button (already imported in ContractReview)
  Eye,             // Alternative for hide-resolved toggle
  EyeOff,          // Alternative for hide-resolved toggle
} from 'lucide-react';
```

### Recommended Violet/Purple Shades (Discretion Area)
```
bg-violet-50      // Note block background
border-violet-100 // Note block border
text-violet-700   // "YOUR NOTE" label
text-violet-800   // Note text content
```
Rationale: `violet` is distinct from `purple` in Tailwind and creates clearer contrast with the blue (Recommendation) blocks. It reads as "user-authored" vs AI-generated.

### Textarea Sizing (Discretion Area)
```typescript
<textarea
  className="w-full border border-slate-200 rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
  rows={3}
  maxLength={1000}
  placeholder="Add your note..."
  value={editText}
  onChange={(e) => setEditText(e.target.value)}
/>
```
Recommendation: 3 rows default, 1000 character limit. No auto-resize needed for v1.3.

### Animation Timing (Discretion Area)
```typescript
// FindingCard exit animation for hide-resolved
exit={{ opacity: 0, height: 0, marginBottom: 0 }}
transition={{ duration: 0.2 }}

// Resolve toggle - instant visual feedback, no delay
// Note textarea expand - use layout animation or simple conditional render
```

### Hide-Resolved Empty State (Discretion Area)
```typescript
// When hideResolved is on and all visible findings are resolved
<div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
  <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
  <p className="text-slate-500 font-medium">All findings resolved</p>
  <p className="text-sm text-slate-400 mt-1">
    Uncheck "Hide resolved" to view them
  </p>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate state stores for annotations | Extend existing domain objects | N/A | Keep Finding type as single source of truth |
| Modal-based note editing | Inline editing | N/A | Less disruptive UX, matches modern patterns |

## Open Questions

1. **Should resolved state affect risk score display?**
   - What we know: Requirements say show resolved counts, not recalculate risk score
   - What's unclear: Whether risk score should visually indicate progress
   - Recommendation: Do not change risk score calculation -- it reflects the contract's inherent risk. Resolved counts are the progress indicator.

2. **Hide-resolved interaction with Coverage tab**
   - What we know: Coverage tab has its own rendering logic
   - What's unclear: Whether hide-resolved should affect the Coverage comparison view
   - Recommendation: Apply hide-resolved only to by-category and by-severity views. Coverage tab shows insurance comparison data, not individual findings.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/types/contract.ts`, `src/hooks/useContractStore.ts`, `src/components/FindingCard.tsx`, `src/components/CategorySection.tsx`, `src/pages/ContractReview.tsx`, `src/components/ConfirmDialog.tsx`
- CONTEXT.md user decisions from discussion phase

### Secondary (MEDIUM confidence)
- Framer Motion AnimatePresence pattern already proven in codebase (CategorySection line 76)
- Tailwind violet color palette available in default config

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing tools
- Architecture: HIGH - follows established patterns in codebase (colored info blocks, persistAndSet, AnimatePresence)
- Pitfalls: HIGH - identified from direct code analysis of integration points

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no external dependencies)
