# Phase 32: Type Safety Gap Closure - Research

**Researched:** 2026-03-15
**Domain:** TypeScript type safety / Zod schema reconciliation
**Confidence:** HIGH

## Summary

Phase 32 closes the single remaining TYPE-01 gap from the v1.5 milestone audit plus one pre-existing tech debt item. Both issues are trivial, well-understood type errors confirmed by `tsc --noEmit` output. No library changes, no architecture changes, no risk of regression.

The two errors are: (1) `useContractStore.ts` line 53 -- `updateFindingNote` accepts `note: string | undefined` but `Finding.note` is required `string` per the Zod schema (TS2322), and (2) `CoverageComparisonTab.tsx` line 171 -- unused loop variable `i` (TS6133).

**Primary recommendation:** Fix both errors with minimal, targeted changes. For the TS2322, use `note: note ?? ''` in the spread to keep `undefined` semantics for callers (FindingCard passes `undefined` to delete notes). For the TS6133, destructure as `(row, _i)` or remove the variable.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TYPE-01 | Reconcile Zod schema / TypeScript interface optionality -- required fields in schemas match required fields in types | Finding.note is `z.string()` (required) in MergedFindingSchema but `updateFindingNote` passes `string | undefined` through spread. Fix at the spread site or change the parameter type. |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase modifies two existing files using the existing TypeScript + Zod stack.

### Core (already installed)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| TypeScript | Static type checking | `tsc --noEmit` is the success gate |
| Zod | Schema definitions | MergedFindingSchema defines `note: z.string()` (required) |

## Architecture Patterns

### Current Finding Type Flow

```
src/schemas/finding.ts (MergedFindingSchema)
  --> z.infer<typeof MergedFindingSchema> = MergedFinding
  --> re-exported as Finding from src/types/contract.ts
  --> Finding.note is required string (z.string(), no .optional())
```

### Current updateFindingNote Call Chain

```
FindingCard.tsx
  onSave: (text) => onUpdateNote?.(finding.id, text)        // text is string
  onDelete: onUpdateNote?.(finding.id, undefined)            // passes undefined

  --> CategorySection.tsx (prop forwarding)
  --> ContractReview.tsx (prop forwarding)
  --> App.tsx: (findingId, note) => updateFindingNote(activeContract.id, findingId, note)
  --> useContractStore.ts: updateFindingNote(contractId, findingId, note: string | undefined)
      spread: { ...f, note }    // <-- TS2322: note could be undefined, Finding.note is string
```

### Fix Pattern: Coalesce at Store Level

The recommended fix coalesces `undefined` to `''` at the store level, preserving the caller convention where `undefined` means "delete the note":

```typescript
// useContractStore.ts line 60 (inside the .map)
f.id === findingId ? { ...f, note: note ?? '' } : f
```

This is better than Option A (changing parameter to `string`) because:
- FindingCard.tsx line 199 explicitly passes `undefined` to mean "delete note"
- CategorySection, ContractReview, and App.tsx prop types all use `string | undefined`
- Changing all callers is more churn with no benefit
- The store is the correct place to normalize domain semantics

### Fix Pattern: Unused Variable

```typescript
// CoverageComparisonTab.tsx line 171
// Before:
{allRows.map((row, i) => {
// After (option 1 -- prefix with underscore):
{allRows.map((row, _i) => {
// After (option 2 -- remove entirely):
{allRows.map((row) => {
```

Option 2 (remove entirely) is cleaner since `i` is never referenced.

## Don't Hand-Roll

Not applicable -- this phase is two one-line fixes. No libraries or utilities needed.

## Common Pitfalls

### Pitfall 1: Changing Finding.note to optional in the Zod schema
**What goes wrong:** Making `note` optional (`z.string().optional()`) would "fix" the type error but violate the Phase 30 decision that Zod is the single source of truth with required fields matching required semantics. It would also require updating every component that reads `finding.note` to handle `undefined`.
**How to avoid:** Fix at the store layer, not the schema layer.

### Pitfall 2: Forgetting to verify prop types in intermediate components
**What goes wrong:** If you change the parameter type in `updateFindingNote`, you must also update the `onUpdateNote` prop types in CategorySection, ContractReview, and FindingCard interfaces.
**How to avoid:** Use the `note ?? ''` coalesce approach -- zero changes to any other file.

### Pitfall 3: Not running tsc --noEmit after fix
**What goes wrong:** The build (`npm run build`) uses esbuild which skips type checking. You could "fix" the code and still have type errors.
**How to avoid:** Success criteria explicitly requires `tsc --noEmit` to pass with zero errors.

## Code Examples

### Fix 1: updateFindingNote TS2322 (useContractStore.ts)

```typescript
// src/hooks/useContractStore.ts, line 59-61
// BEFORE:
findings: c.findings.map((f) =>
  f.id === findingId ? { ...f, note } : f
),

// AFTER:
findings: c.findings.map((f) =>
  f.id === findingId ? { ...f, note: note ?? '' } : f
),
```

### Fix 2: Unused variable TS6133 (CoverageComparisonTab.tsx)

```typescript
// src/components/CoverageComparisonTab.tsx, line 171
// BEFORE:
{allRows.map((row, i) => {

// AFTER:
{allRows.map((row) => {
```

## State of the Art

Not applicable -- this is a bug fix phase, not a technology adoption phase.

## Open Questions

None. Both fixes are fully understood and verified against the codebase.

## Sources

### Primary (HIGH confidence)
- `tsc --noEmit` output -- confirms exactly two errors (TS2322 on useContractStore.ts:55, TS6133 on CoverageComparisonTab.tsx:171)
- `src/schemas/finding.ts` line 161 -- `note: z.string()` (required, no `.optional()`)
- `src/hooks/useContractStore.ts` line 53 -- parameter is `note: string | undefined`
- `src/components/FindingCard.tsx` line 199 -- passes `undefined` to delete a note
- `.planning/v1.5-MILESTONE-AUDIT.md` -- documents both issues as TYPE-01 gap and tech debt

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, existing codebase only
- Architecture: HIGH - complete call chain traced through 5 files
- Pitfalls: HIGH - errors are trivial, pitfalls are straightforward

**Research date:** 2026-03-15
**Valid until:** indefinite (fixes are against stable, well-understood code)
