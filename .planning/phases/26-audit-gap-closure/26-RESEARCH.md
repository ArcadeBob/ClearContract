# Phase 26: Audit Gap Closure - Research

**Researched:** 2026-03-15
**Domain:** UI fixes, integration gap closure, tech debt removal
**Confidence:** HIGH

## Summary

Phase 26 addresses four items from the v1.4 milestone audit: one integration gap (PIPE-01 partial wiring) and three tech debt items. All four are surgical edits to existing files with no new dependencies, no new components, and no architectural changes.

The integration gap is a missing `'Compound Risk'` entry in ContractReview.tsx's CATEGORY_ORDER array. The tech debt items are: (1) an inaccurate re-analyze dialog message, (2) a placeholder "Coming soon" Share button, and (3) a placeholder "Coming soon" Generate Monthly Report button.

**Primary recommendation:** Four targeted edits across two files (ContractReview.tsx and Dashboard.tsx). No libraries, no new patterns, no testing infrastructure needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Add 'Compound Risk' as the last entry in CATEGORY_ORDER in ContractReview.tsx (after 'Risk Assessment')
- Matches the existing order in ContractComparison.tsx line 23
- Replace the false data-loss warning with: "Re-analyzing will refresh all findings. Resolved status and notes will be preserved where findings match. Select a PDF to continue."

### Claude's Discretion
- None -- both fixes are fully specified

### Deferred Ideas (OUT OF SCOPE)
- None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Cross-pass synthesis pass detects compound risks after all 16 passes complete | Integration gap: 'Compound Risk' category missing from CATEGORY_ORDER in ContractReview.tsx by-category view. Fix confirmed by comparing with ContractComparison.tsx which already includes it. |
</phase_requirements>

## Standard Stack

No new libraries required. All changes are edits to existing React components using the existing stack (React 18, TypeScript, Tailwind CSS, Lucide React).

## Architecture Patterns

### Affected Files

```
src/pages/
  ContractReview.tsx    # 3 changes: CATEGORY_ORDER, dialog message, remove Share button
  Dashboard.tsx         # 1 change: remove Monthly Report button
```

### Pattern: CATEGORY_ORDER array
Both ContractReview.tsx and ContractComparison.tsx define their own `CATEGORY_ORDER: Category[]` const arrays (not shared). The pattern is a static ordered array of Category string literals used by `useMemo` grouping logic to control display order of findings in the by-category tab.

**ContractComparison.tsx (correct, line 13-24):**
```typescript
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
  'Compound Risk',  // <-- missing from ContractReview.tsx
];
```

**ContractReview.tsx (line 47-57, needs fix):**
Same array but missing `'Compound Risk'` as the last entry.

### Pattern: ConfirmDialog usage
ConfirmDialog is a generic component accepting `message` as a string prop. The re-analyze dialog at line 342-351 passes the message inline. Change is a string replacement only.

### Pattern: Placeholder button removal
Both the Share button (ContractReview.tsx:273-280) and Monthly Report button (Dashboard.tsx:178-185) follow the same pattern: `disabled` prop, `title="Coming soon"`, `cursor-not-allowed` styling. Both should be removed entirely per success criteria ("works or is removed").

## Don't Hand-Roll

Not applicable -- this phase has no custom logic to build.

## Common Pitfalls

### Pitfall 1: Removing Share2 import
**What goes wrong:** Removing the Share button JSX but leaving the `Share2` import causes an unused import lint warning.
**How to avoid:** Remove `Share2` from the lucide-react import on line 19 of ContractReview.tsx. It is only used by the Share button (confirmed: 2 occurrences -- import and JSX).

### Pitfall 2: FileText import in Dashboard.tsx
**What goes wrong:** Removing the Monthly Report button and also removing FileText import, but FileText is used elsewhere.
**How to avoid:** FileText is referenced in 3 places in Dashboard.tsx (import, line 114 stat card icon, line 183 button). After removing the button, FileText is still used at line 114. Keep the import.

### Pitfall 3: Dialog message accuracy
**What goes wrong:** The new message must accurately reflect PORT-04 behavior. PORT-04 preserves resolved status and notes using composite key matching (clauseReference + category). Findings with no match (truly new or changed findings) will NOT have preserved status.
**How to avoid:** Use the exact phrasing from CONTEXT.md: "where findings match" -- this is accurate and doesn't overpromise.

## Code Examples

### Fix 1: Add Compound Risk to CATEGORY_ORDER (ContractReview.tsx line 47-57)

```typescript
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
  'Compound Risk',
];
```

### Fix 2: Update re-analyze dialog message (ContractReview.tsx line 345)

```typescript
message="Re-analyzing will refresh all findings. Resolved status and notes will be preserved where findings match. Select a PDF to continue."
```

### Fix 3: Remove Share button (ContractReview.tsx lines 273-280)

Remove the entire `<button disabled title="Coming soon" ...>Share</button>` block and remove `Share2` from the lucide-react import.

### Fix 4: Remove Monthly Report button (Dashboard.tsx lines 178-185)

Remove the entire `<button disabled title="Coming soon" ...>Generate Monthly Report</button>` block. Keep `FileText` import (still used elsewhere).

## State of the Art

Not applicable -- no technology decisions in this phase.

## Open Questions

None. All four changes are fully specified with exact locations and exact content.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of ContractReview.tsx (lines 47-57, 273-280, 342-351)
- Direct code inspection of Dashboard.tsx (lines 178-185)
- Direct code inspection of ContractComparison.tsx (lines 13-24) -- reference for correct CATEGORY_ORDER
- Direct code inspection of ConfirmDialog.tsx -- confirmed message is a string prop
- v1.4 Milestone Audit (.planning/v1.4-MILESTONE-AUDIT.md) -- gap and tech debt identification
- Phase 26 CONTEXT.md -- locked decisions and exact message text

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, existing code only
- Architecture: HIGH - direct code inspection of all affected files
- Pitfalls: HIGH - import usage verified via grep

**Research date:** 2026-03-15
**Valid until:** indefinite (code-level fixes, no external dependencies)
