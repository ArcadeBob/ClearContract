# Phase 20: Fix All Contracts Navigation - Research

**Researched:** 2026-03-12
**Domain:** Browser History API routing (custom useRouter hook)
**Confidence:** HIGH

## Summary

This phase fixes a gap in the custom `useRouter` hook where the `'contracts'` view is unreachable via URL navigation, browser back/forward, or page refresh. The root cause is clear: `parseUrl()` has no branch for `/contracts` (exact match) and `navigateTo()` has no branch for the `'contracts'` view -- both fall through to the dashboard default.

The fix requires exactly two additions to `src/hooks/useRouter.ts`, mirroring the existing `settings` route pattern. All other infrastructure (ViewState type, Sidebar, App.tsx renderContent, Vercel rewrites) already supports the `'contracts'` view correctly.

**Primary recommendation:** Add `/contracts` exact-match parsing and `contracts` navigation case to `useRouter.ts`. No other files need changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All Contracts page lives at `/contracts` (exact match)
- `/contracts/:id` continues to route to contract review (prefix match)
- `parseUrl` must check `/contracts` exact match BEFORE `/contracts/:id` prefix match to avoid false routing
- `parseUrl()`: add `if (pathname === '/contracts') return { view: 'contracts', contractId: null }` before the `/contracts/:id` check
- `navigateTo()`: add `contracts` case that calls `history.pushState(null, '', '/contracts')` -- same pattern as `settings` case
- No other changes needed beyond `useRouter.ts`

### Claude's Discretion
- None -- implementation is fully specified

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROUTE-01 | User can navigate with browser back/forward buttons between views | Adding `/contracts` to `parseUrl` means `popstate` handler will correctly resolve the contracts view when navigating back/forward |
| ROUTE-02 | User can refresh the page and stay on the current view | Adding `/contracts` exact match to `parseUrl` means initial state from `useState(() => parseUrl(window.location.pathname))` will resolve correctly on refresh |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | UI framework | Already in use |
| TypeScript | strict | Type safety | Already in use |
| History API | browser native | URL management | Already used by useRouter -- no library needed |

### Supporting
None needed. This is a two-line fix to an existing file.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom useRouter | wouter / React Router | Out of scope per REQUIREMENTS.md -- custom hook sufficient for 5 flat routes |

## Architecture Patterns

### Current Router Structure
```
src/hooks/useRouter.ts    # Only file to modify
  parseUrl()              # Maps pathname -> { view, contractId }
  navigateTo()            # Maps view -> pushState URL
  popstate listener       # Re-runs parseUrl on back/forward
```

### Pattern: Exact-Before-Prefix Matching
**What:** When two routes share a prefix (`/contracts` and `/contracts/:id`), the exact match must be checked first to prevent the prefix match from consuming it.
**When to use:** Always when routes have this relationship.
**Example:**
```typescript
// CORRECT ORDER -- exact before prefix
if (pathname === '/contracts') {
  return { view: 'contracts', contractId: null };
}
if (pathname.startsWith('/contracts/')) {
  const id = pathname.slice('/contracts/'.length);
  return { view: 'review', contractId: id };
}

// WRONG ORDER -- prefix consumes exact match
// '/contracts'.startsWith('/contracts/') is FALSE in JS
// so actually this specific case wouldn't break, but the
// convention of exact-before-prefix is still correct practice
```

**Important JS detail:** `'/contracts'.startsWith('/contracts/')` returns `false` because the trailing slash is part of the prefix. However, the CONTEXT.md explicitly requires exact-before-prefix ordering, and this is the correct defensive pattern regardless.

### Pattern: Settings Route Analog
The `contracts` case in `navigateTo` mirrors `settings` exactly:
```typescript
// Existing settings pattern:
} else if (view === 'settings') {
  newState = { view: 'settings', contractId: null };
  window.history.pushState(null, '', '/settings');
}

// New contracts pattern (identical structure):
} else if (view === 'contracts') {
  newState = { view: 'contracts', contractId: null };
  window.history.pushState(null, '', '/contracts');
}
```

### Anti-Patterns to Avoid
- **Adding the contracts case AFTER the dashboard else-block:** The else clause at the end is the fallback. New named routes must go before it.
- **Modifying App.tsx, Sidebar.tsx, or types:** These already work. Touching them adds risk for zero benefit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nothing for this phase | N/A | N/A | The fix is two additions to existing hand-rolled code that works |

## Common Pitfalls

### Pitfall 1: Wrong Order in parseUrl
**What goes wrong:** Placing the `/contracts` check after `/contracts/` prefix check
**Why it happens:** Appending new code at the end of the function
**How to avoid:** Insert the exact match check on the line BEFORE `pathname.startsWith('/contracts/')`
**Warning signs:** `/contracts` URL shows contract review with empty/undefined ID instead of All Contracts list

### Pitfall 2: Wrong Order in navigateTo
**What goes wrong:** Placing the `contracts` case after the final `else` block (dashboard fallback)
**Why it happens:** The else block catches everything not matched above
**How to avoid:** Insert `contracts` case as an `else if` before the final `else`
**Warning signs:** Clicking "All Contracts" in sidebar navigates to dashboard URL `/`

### Pitfall 3: Forgetting navigateTo While Fixing parseUrl (or Vice Versa)
**What goes wrong:** Fixing only one function -- refresh works but sidebar doesn't, or sidebar works but refresh doesn't
**Why it happens:** Thinking the bug is in only one place
**How to avoid:** Both functions need the contracts case. parseUrl handles URL-to-state, navigateTo handles state-to-URL.
**Warning signs:** One of the four success criteria fails while others pass

## Code Examples

### The Complete Fix (useRouter.ts)

Current `parseUrl` (lines 9-18):
```typescript
function parseUrl(pathname: string): RouterState {
  // BUG: no '/contracts' exact match -- falls through to dashboard
  if (pathname.startsWith('/contracts/')) {
    const id = pathname.slice('/contracts/'.length);
    return { view: 'review', contractId: id };
  }
  if (pathname === '/settings') {
    return { view: 'settings', contractId: null };
  }
  return { view: 'dashboard', contractId: null };
}
```

Fixed `parseUrl`:
```typescript
function parseUrl(pathname: string): RouterState {
  if (pathname === '/contracts') {
    return { view: 'contracts', contractId: null };
  }
  if (pathname.startsWith('/contracts/')) {
    const id = pathname.slice('/contracts/'.length);
    return { view: 'review', contractId: id };
  }
  if (pathname === '/settings') {
    return { view: 'settings', contractId: null };
  }
  return { view: 'dashboard', contractId: null };
}
```

Current `navigateTo` (lines 33-58) -- the if/else chain:
```typescript
if (view === 'upload') { ... }
if (view === 'review' && contractId) { ... }
else if (view === 'settings') { ... }
else { /* dashboard fallback */ }
```

Fixed `navigateTo` -- add contracts case before dashboard fallback:
```typescript
if (view === 'upload') { ... }
if (view === 'review' && contractId) { ... }
else if (view === 'settings') { ... }
else if (view === 'contracts') {
  newState = { view: 'contracts', contractId: null };
  window.history.pushState(null, '', '/contracts');
}
else { /* dashboard fallback */ }
```

## State of the Art

Not applicable -- this is a bugfix to existing custom code, not a technology choice.

## Open Questions

None. The fix is fully specified by CONTEXT.md and verified against the source code.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROUTE-01 | Back/forward reaches /contracts | manual | Browser back/forward after navigating to All Contracts | N/A |
| ROUTE-02 | Refresh stays on /contracts | manual | Navigate to /contracts, press F5 | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (ensures no type errors)
- **Per wave merge:** Manual browser verification of all 4 success criteria
- **Phase gate:** All 4 success criteria manually verified

### Wave 0 Gaps
None -- no test framework exists in this project (per CLAUDE.md: "No test framework is configured"). Verification is manual browser testing plus `npm run build` for type safety.

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of `src/hooks/useRouter.ts` (65 lines) -- confirmed the bug
- Direct source code inspection of `src/App.tsx` -- confirmed `case 'contracts'` exists at line 194
- Direct source code inspection of `src/types/contract.ts` -- confirmed `'contracts'` in ViewState union at line 193
- Direct source code inspection of `src/components/Sidebar.tsx` -- confirmed `id: 'contracts'` at line 32
- Direct source code inspection of `vercel.json` -- confirmed SPA catch-all rewrite exists

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, just fixing existing code
- Architecture: HIGH - pattern is identical to existing settings route
- Pitfalls: HIGH - only 3 possible mistakes, all obvious from code inspection

**Research date:** 2026-03-12
**Valid until:** Indefinite -- this is a bugfix, not a technology recommendation
