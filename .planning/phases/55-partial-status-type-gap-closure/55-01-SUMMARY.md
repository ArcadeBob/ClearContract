---
phase: 55-partial-status-type-gap-closure
plan: 01
subsystem: client-types-and-ui-filters
tags: [gap-closure, types, ui, status-filters, v2.2]
requirements: [PERF-03]
dependency-graph:
  requires: []
  provides:
    - "Contract.status union with 'Partial' member"
    - "Amber badge rendering for Partial status"
    - "Partial contracts in dashboard stats, timeline, sidebar badge, and pattern detection"
  affects:
    - "src/types/contract.ts"
    - "src/components/ContractCard.tsx"
    - "src/App.tsx"
    - "src/pages/Dashboard.tsx"
    - "src/utils/dateUrgency.ts"
    - "src/components/PatternsCard.tsx"
tech-stack:
  added: []
  patterns:
    - "Amber color convention for warning/incomplete-but-usable state"
key-files:
  created: []
  modified:
    - "src/types/contract.ts"
    - "src/components/ContractCard.tsx"
    - "src/App.tsx"
    - "src/pages/Dashboard.tsx"
    - "src/utils/dateUrgency.ts"
    - "src/components/PatternsCard.tsx"
decisions:
  - "Partial contracts are treated as first-class data alongside Reviewed contracts in all portfolio-level views (stats, timeline, patterns, urgent badge)"
metrics:
  duration: "~5 min"
  completed: "2026-04-04"
---

# Phase 55 Plan 01: Partial Status Type Gap Closure Summary

## One-liner

Add 'Partial' to Contract.status union, render amber badge, and include Partial contracts in all four portfolio-level status filters (sidebar, dashboard, timeline, patterns).

## What Was Built

Closes the v2.2 audit integration gap where `api/analyze.ts` writes 'Partial' status on global timeout but the client type system and UI did not model it. Before this fix, Partial contracts were invisible in stats/timeline and displayed a default slate badge.

### Type Definition (Task 1)

- `src/types/contract.ts:184` — extended `Contract.status` union from `'Analyzing' | 'Reviewed' | 'Draft'` to `'Analyzing' | 'Reviewed' | 'Partial' | 'Draft'`.

### UI Badge (Task 1)

- `src/components/ContractCard.tsx:76-82` — expanded badge color ternary to render `bg-amber-100 text-amber-700` for Partial status, signaling "incomplete but has usable data". Consistent with project amber=warning convention.

### Status Filters (Task 2)

All four portfolio-level filter locations now accept `Reviewed || Partial`:

- `src/App.tsx:42` — sidebar urgent deadline badge count
- `src/pages/Dashboard.tsx:27` — dashboard stats (total, open findings, critical, risk average, bid signals)
- `src/utils/dateUrgency.ts:75` — portfolio deadline timeline entries
- `src/components/PatternsCard.tsx:12` — cross-contract pattern detection

ContractReview.tsx was intentionally NOT modified — its `status === 'Analyzing'` guard already handles Partial correctly (falls through to results branch).

## Verification

- `npx tsc --noEmit`: no new errors introduced (pre-existing test-file errors unrelated to this change)
- `npm run build`: succeeds cleanly in 4.75s
- Grep audit: 5 files contain `'Partial'` status references (6 total, including type definition); no bare `status === 'Reviewed'` checks remain in portfolio filters

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `9a8dcf7` — feat(55-01): add Partial to Contract.status type and ContractCard amber badge
- `0267496` — feat(55-01): include Partial contracts in all status filters

## Self-Check: PASSED

- FOUND: src/types/contract.ts (modified, line 184 contains 'Partial')
- FOUND: src/components/ContractCard.tsx (modified, contains bg-amber-100 text-amber-700)
- FOUND: src/App.tsx (modified, contains c.status === 'Partial')
- FOUND: src/pages/Dashboard.tsx (modified, contains c.status === 'Partial')
- FOUND: src/utils/dateUrgency.ts (modified, contains c.status === 'Partial')
- FOUND: src/components/PatternsCard.tsx (modified, contains c.status === 'Partial')
- FOUND: commit 9a8dcf7
- FOUND: commit 0267496
