---
phase: 20-fix-all-contracts-nav
plan: 01
subsystem: routing
tags: [bug-fix, navigation, useRouter]
dependency_graph:
  requires: [useRouter hook, ViewState type]
  provides: [contracts view URL parsing, contracts view navigation]
  affects: [Sidebar contracts link, browser back/forward, direct URL access]
tech_stack:
  added: []
  patterns: [exact-match-before-prefix in URL parsing]
key_files:
  modified: [src/hooks/useRouter.ts]
decisions:
  - Exact-match for /contracts placed before startsWith('/contracts/') to prevent false prefix matching
metrics:
  duration: 35s
  completed: "2026-03-13T04:05:08Z"
---

# Phase 20 Plan 01: Fix All Contracts Navigation Summary

Added /contracts exact-match route to useRouter parseUrl and contracts case to navigateTo, fixing the All Contracts page being unreachable via sidebar click, direct URL, refresh, or browser back/forward.

## What Was Done

### Task 1: Add contracts route to parseUrl and navigateTo

Two targeted changes to `src/hooks/useRouter.ts`:

1. **parseUrl**: Added `pathname === '/contracts'` exact-match check as the first condition, before the existing `pathname.startsWith('/contracts/')` prefix check. This ensures `/contracts` returns `{ view: 'contracts', contractId: null }` while `/contracts/abc` still correctly returns `{ view: 'review', contractId: 'abc' }`.

2. **navigateTo**: Added `else if (view === 'contracts')` case between the `settings` and `dashboard` fallback cases, pushing `/contracts` to browser history.

**Commit:** `1c75048` - fix(20-01): add contracts route to useRouter parseUrl and navigateTo

## Verification

- `npm run build` passes with no type errors
- `parseUrl('/contracts')` returns `{ view: 'contracts', contractId: null }` (new)
- `parseUrl('/contracts/abc')` returns `{ view: 'review', contractId: 'abc' }` (unchanged)
- `navigateTo('contracts')` pushes `/contracts` URL to history (new)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Exact-match ordering**: `/contracts` exact-match placed before `/contracts/` prefix-match to prevent false prefix matching -- this is critical for correct routing.

## Self-Check: PASSED

- FOUND: src/hooks/useRouter.ts
- FOUND: commit 1c75048
