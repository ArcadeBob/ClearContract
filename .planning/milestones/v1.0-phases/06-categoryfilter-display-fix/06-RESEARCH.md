# Phase 6: CategoryFilter Display Fix - Research

**Researched:** 2026-03-06
**Domain:** React UI state-driven filtering
**Confidence:** HIGH

## Summary

Phase 6 is a focused gap-closure fix for the CategoryFilter pill behavior in by-category mode. Currently, selecting a category pill in ContractReview only scrolls to the matching `CategorySection` via `useEffect` + `scrollIntoView`, but all category sections remain rendered. The expected behavior is that selecting a pill **hides** non-selected categories, showing only the chosen one, while preserving the scroll-to-section behavior.

The fix is entirely contained within `src/pages/ContractReview.tsx`. The `groupedFindings` derivation (lines 61-74) does not reference `selectedCategory` state at all -- it always shows all categories. Adding a filter step that respects `selectedCategory` will solve the problem. No new dependencies, no component API changes, and no new files are needed.

**Primary recommendation:** Add a `.filter()` step to the `groupedFindings` derivation that excludes categories not matching `selectedCategory` (when it is not `'All'`), and keep the existing `useEffect` scroll behavior so the filtered single section scrolls into view.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUT-01 (gap closure) | Analysis results are organized by category so the user can work through the contract systematically | The `groupedFindings` derivation needs a filter step based on `selectedCategory` state. Currently all categories always render; adding the filter makes pill selection actually filter the display. |
</phase_requirements>

## Standard Stack

### Core

No new libraries are needed for this fix. All tools are already in the project:

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| React 18 | ^18.x | Component rendering, useState, useEffect, useMemo | Yes |
| TypeScript | strict mode | Type safety for Category union type | Yes |
| Framer Motion | existing | AnimatePresence for filtered list transitions | Yes |

### Supporting

None needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline filter in groupedFindings | useMemo with selectedCategory dep | useMemo adds memoization; unnecessary for this array size but good practice. Recommend inline filter for simplicity given the small data set. |

## Architecture Patterns

### Current Architecture (the bug)

```
ContractReview.tsx
  - selectedCategory state: Category | 'All'  (line 40-42)
  - groupedFindings derivation (lines 61-74):
      CATEGORY_ORDER.map -> filter(findings.length > 0) -> sort by severity
      ** DOES NOT reference selectedCategory **
  - useEffect (lines 46-53): scrolls to category section when selectedCategory changes
  - Render: maps ALL groupedFindings to <CategorySection> components (lines 176-183)
```

The `selectedCategory` state is only used for:
1. Highlighting the active pill in `<CategoryFilter>`
2. Triggering scroll-to-section via `useEffect`

It is **never** used to filter which `CategorySection` components render.

### Fix Pattern: Filter-Then-Render

```typescript
// Current (lines 61-74): always shows all categories
const groupedFindings = CATEGORY_ORDER
  .map(category => ({
    category,
    findings: contract.findings
      .filter(f => f.category === category)
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
  }))
  .filter(group => group.findings.length > 0)
  .sort((a, b) => { ... });

// Fixed: add selectedCategory filter
const groupedFindings = CATEGORY_ORDER
  .map(category => ({
    category,
    findings: contract.findings
      .filter(f => f.category === category)
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
  }))
  .filter(group => group.findings.length > 0)
  .filter(group =>
    selectedCategory === 'All' || group.category === selectedCategory
  )
  .sort((a, b) => { ... });
```

This is a single line addition. The existing `useEffect` scroll behavior continues to work because when `selectedCategory` changes, the filtered list renders only one `CategorySection`, and the scroll targets that element by its `id` attribute.

### Anti-Patterns to Avoid

- **Filtering in the render JSX instead of the derivation:** Moving the filter to the `.map()` in JSX would work but separates the data logic from the derivation, making it harder to reason about. Keep all filtering in the `groupedFindings` derivation.
- **Removing the scroll useEffect:** The scroll behavior should be preserved even after adding filtering. When a single category is shown, scrolling to it ensures it's at the top of the viewport, which is good UX especially if the category section is long.
- **Using a separate state variable for visibility:** Unnecessary complexity. The `selectedCategory` state already captures everything needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| N/A | N/A | N/A | This is a one-line filter fix; no hand-rolling risk |

## Common Pitfalls

### Pitfall 1: Forgetting that categoriesWithFindings feeds CategoryFilter pills
**What goes wrong:** If someone accidentally filters `categoriesWithFindings` (which feeds the pill list) instead of `groupedFindings` (which feeds the section list), the pills themselves would disappear when clicked.
**Why it happens:** Both use `CATEGORY_ORDER` and filter by findings, so they look similar.
**How to avoid:** Only modify `groupedFindings`. Leave `categoriesWithFindings` (line 56-58) untouched -- it must always show ALL categories with findings so the user can switch between them.
**Warning signs:** Category pills disappear when you click them.

### Pitfall 2: AnimatePresence transition glitches
**What goes wrong:** When categories are filtered out, Framer Motion's `AnimatePresence` on the inner findings might not animate exit cleanly because the parent `CategorySection` is removed from the DOM entirely.
**Why it happens:** `AnimatePresence` tracks children by key. If the parent unmounts, inner `AnimatePresence` children don't get exit animations.
**How to avoid:** The outer `<div className="space-y-6">` wrapping `groupedFindings.map()` does NOT use `AnimatePresence`. This means categories mount/unmount without animation, which is acceptable and avoids complexity. If smooth transitions are desired later, wrap the category sections in `AnimatePresence` at the outer level -- but this is NOT required for the success criteria.
**Warning signs:** Visual jumpiness when switching categories.

### Pitfall 3: Scroll effect fires before filtered DOM renders
**What goes wrong:** The `useEffect` fires when `selectedCategory` changes, but React may not have rendered the filtered list yet, so `document.getElementById()` returns null.
**Why it happens:** `useEffect` runs after render, so normally this is fine. But if the filter removes the target element from the prior render and the new render adds it back, there could be a timing issue.
**How to avoid:** This is actually not a problem here. When selecting a category, the filter keeps that category in `groupedFindings`, so the target element IS in the DOM when the effect runs. The effect correctly calls `el?.scrollIntoView()` with optional chaining as a safety net. No change needed.

### Pitfall 4: "All" must restore full list
**What goes wrong:** If the filter condition is wrong (e.g., `selectedCategory !== 'All'` without the OR), clicking "All" shows nothing.
**How to avoid:** The filter condition must be: `selectedCategory === 'All' || group.category === selectedCategory`. Test both the "select specific category" and "select All" paths.

## Code Examples

### The Complete Fix (single file, single change)

```typescript
// File: src/pages/ContractReview.tsx
// Location: groupedFindings derivation (~line 61-74)

// Add this .filter() AFTER .filter(group => group.findings.length > 0)
// and BEFORE .sort():

const groupedFindings = CATEGORY_ORDER
  .map(category => ({
    category,
    findings: contract.findings
      .filter(f => f.category === category)
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
  }))
  .filter(group => group.findings.length > 0)
  .filter(group =>
    selectedCategory === 'All' || group.category === selectedCategory
  )
  .sort((a, b) => {
    const aMax = Math.min(...a.findings.map(f => severityRank[f.severity]));
    const bMax = Math.min(...b.findings.map(f => severityRank[f.severity]));
    if (aMax !== bMax) return aMax - bMax;
    return b.findings.length - a.findings.length;
  });
```

### Verification Steps

```
1. npm run build -- must pass with no TypeScript errors
2. Manual verification:
   a. Upload or view a contract with findings in multiple categories
   b. Switch to "By Category" view mode (should be default)
   c. Click a specific category pill (e.g., "Legal Issues")
   d. VERIFY: Only "Legal Issues" CategorySection is visible; all others hidden
   e. Click "All Categories" pill
   f. VERIFY: All CategorySections are restored
   g. Click a specific category pill again
   h. VERIFY: Page scrolls to show the selected category at the top
   i. Switch to "All by Severity" mode
   j. VERIFY: Flat severity list still works (no regression)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scroll-only category pills | Filter + scroll category pills | Phase 6 (this fix) | User can focus on one category at a time |

This is a bug fix, not a technology upgrade. The approach (derived state filtering) is standard React pattern.

## Open Questions

None. This is a well-defined, isolated fix with clear success criteria and a known one-line solution.

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of `src/pages/ContractReview.tsx` (lines 40-53, 56-74, 165-183)
- Direct source code inspection of `src/components/CategoryFilter.tsx` (component API)
- Direct source code inspection of `src/components/CategorySection.tsx` (component API, DOM id attribute)
- Direct source code inspection of `src/types/contract.ts` (Category type union)

### Secondary
- `.planning/ROADMAP.md` Phase 6 definition and success criteria
- `.planning/REQUIREMENTS.md` OUT-01 requirement definition

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all existing code inspected
- Architecture: HIGH - single derived value filter, one line of code, pattern is trivial
- Pitfalls: HIGH - exhaustive analysis of what could go wrong, all edge cases covered

**Research date:** 2026-03-06
**Valid until:** indefinite (UI bug fix, not dependent on external library changes)
