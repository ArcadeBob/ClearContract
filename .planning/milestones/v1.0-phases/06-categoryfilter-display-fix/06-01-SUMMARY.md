---
phase: 06-categoryfilter-display-fix
plan: 01
status: complete
started: 2026-03-06
completed: 2026-03-06
duration: 2min
commit: 2158e8c
---

# Summary: CategoryFilter Display Fix

## What Was Done

Added a `.filter()` step to the `groupedFindings` derivation in `ContractReview.tsx` so that selecting a category pill in by-category mode filters the displayed CategorySections (hides non-selected) instead of only scrolling.

## Files Modified

| File | Change |
|------|--------|
| src/pages/ContractReview.tsx | Added `.filter(group => selectedCategory === 'All' \|\| group.category === selectedCategory)` to groupedFindings chain |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Filter on groupedFindings, not categoriesWithFindings | categoriesWithFindings drives the pill list — filtering it would hide pills when clicked |
| No AnimatePresence on category sections | Categories mount/unmount cleanly without animation; avoids unnecessary complexity |

## Verification

- Production build succeeds
- By-category mode: selecting a pill shows only that category section
- By-category mode: selecting "All" restores all sections
- By-severity mode: no regression (flat list unchanged)
- Scroll-to-section behavior preserved

## Requirements Satisfied

- OUT-01 (gap closure): Category-filtered view in by-category mode now works as expected
