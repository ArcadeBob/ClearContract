# Phase 15: URL-based Routing - Research

**Researched:** 2026-03-12
**Domain:** Browser History API, SPA routing, Vercel SPA rewrites
**Confidence:** HIGH

## Summary

Phase 15 replaces the in-memory `ViewState` navigation with URL-based routing using the browser History API (`pushState`/`popstate`). The scope is small and well-defined: 3 routes (`/`, `/contracts/:id`, `/settings`), a custom `useRouter` hook (~30-50 lines), removing navigation state from `useContractStore`, and adding a Vercel SPA catch-all rewrite.

The History API is stable, universally supported, and well-documented. There are no library dependencies to research. The primary risks are: (1) Vercel rewrite ordering breaking the `/api/analyze` endpoint, (2) the `popstate` event listener not firing on `pushState` calls (only on back/forward), requiring manual state sync, and (3) ensuring deep links work when localStorage contracts load synchronously.

**Primary recommendation:** Build a `useRouter` hook that owns URL parsing and navigation, wire it into `App.tsx` in place of `useContractStore`'s navigation, and add a Vercel rewrite with explicit `/api` exclusion.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 3 routes total: `/` (dashboard), `/contracts/:id` (contract review), `/settings`
- Upload page has no URL -- it is a transient view, navigating to `/upload` is not supported
- All Contracts list is accessed from the dashboard, not a separate `/contracts` route
- `/contracts/:id` uses existing `c-{timestamp}` IDs (no migration)
- Custom History API hook (`useRouter`) -- no library dependency
- ~30-50 lines: `parseUrl()` maps pathname to ViewState, `navigateTo()` calls `history.pushState`, `popstate` listener syncs back/forward
- Replaces `useContractStore`'s `navigateTo` and view state entirely -- new hook is single source of truth for navigation
- `useContractStore` keeps contract data management only (add, update, delete, persist)
- `vercel.json` gets a catch-all rewrite: all non-`/api/*` paths serve `index.html`
- Keep existing `c-{Date.now()}` format -- no migration
- Non-existent contract IDs silently redirect to dashboard (ROUTE-04)
- Deep links to existing contracts render instantly (localStorage is synchronous)
- Deep links to "Analyzing" contracts show the Analyzing placeholder view
- Browser back/forward uses existing Framer Motion AnimatePresence transitions
- Upload-to-review URL updates immediately to `/contracts/:id` when analysis starts

### Claude's Discretion
- Exact `useRouter` hook implementation details
- How `vercel.json` rewrite rules are ordered
- Whether `parseUrl` uses regex or string matching
- Error boundary placement

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROUTE-01 | User can navigate with browser back/forward buttons between views | `popstate` event listener in `useRouter` syncs URL changes to view state |
| ROUTE-02 | User can refresh the page and stay on the current view | `parseUrl(window.location.pathname)` on hook initialization reads URL into state |
| ROUTE-03 | User can bookmark or share a URL that deep links to a specific contract review | `/contracts/:id` route + synchronous localStorage load ensures contract is available immediately |
| ROUTE-04 | User sees dashboard when navigating to unknown URL or non-existent contract | `parseUrl` returns dashboard for unmatched paths; contract existence check redirects to `/` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| History API (browser built-in) | N/A | `pushState`, `replaceState`, `popstate` | Native, zero-dependency, universally supported since IE10 |
| React `useState` + `useEffect` | 18.x | Hook state management for route | Already used throughout codebase |

### Supporting
No additional libraries needed. This phase uses only browser APIs and existing React primitives.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `useRouter` | wouter (1.5KB) | Adds a dependency for 3 routes; custom hook is simpler and matches CONTEXT decision |
| Custom `useRouter` | React Router | Massive overkill; 40KB+ for 3 routes |
| `pushState` | Hash routing (`#/path`) | Looks dated; `pushState` universally supported |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useRouter.ts           # NEW: URL parsing, pushState, popstate listener
│   └── useContractStore.ts    # MODIFIED: navigation state removed
├── types/
│   └── contract.ts            # MODIFIED: ViewState may need 'upload' handling note
├── App.tsx                    # MODIFIED: consume useRouter instead of useContractStore navigation
├── components/
│   └── Sidebar.tsx            # MODIFIED: use new navigation function
└── pages/                     # UNCHANGED (receive navigation via props as before)
```

### Pattern 1: useRouter Hook
**What:** A custom hook that encapsulates all URL-based navigation state.
**When to use:** As the single source of truth for current view and contract ID.
**Example:**
```typescript
// src/hooks/useRouter.ts
import { useState, useEffect, useCallback } from 'react';
import { ViewState } from '../types/contract';

interface RouterState {
  view: ViewState;
  contractId: string | null;
}

function parseUrl(pathname: string): RouterState {
  // /contracts/:id
  if (pathname.startsWith('/contracts/')) {
    const id = pathname.slice('/contracts/'.length);
    if (id) return { view: 'review', contractId: id };
  }
  // /settings
  if (pathname === '/settings') {
    return { view: 'settings', contractId: null };
  }
  // Everything else -> dashboard
  return { view: 'dashboard', contractId: null };
}

export function useRouter() {
  const [state, setState] = useState<RouterState>(
    () => parseUrl(window.location.pathname)
  );

  // Listen for back/forward
  useEffect(() => {
    const onPopState = () => {
      setState(parseUrl(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((view: ViewState, contractId?: string) => {
    let path = '/';
    if (view === 'review' && contractId) {
      path = `/contracts/${contractId}`;
    } else if (view === 'settings') {
      path = '/settings';
    }
    // upload has no URL, so path stays '/' but view is 'upload'
    if (view === 'upload') {
      // Don't push a new URL for upload -- it's transient
      setState({ view: 'upload', contractId: null });
      return;
    }
    window.history.pushState(null, '', path);
    setState({ view, contractId: contractId ?? null });
  }, []);

  return {
    activeView: state.view,
    activeContractId: state.contractId,
    navigateTo,
  };
}
```

### Pattern 2: Vercel SPA Rewrite
**What:** Catch-all rewrite in `vercel.json` that serves `index.html` for all non-API paths.
**When to use:** Required for deep links and page refresh to work on Vercel.
**Example:**
```json
{
  "functions": {
    "api/analyze.ts": {
      "maxDuration": 300
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Pattern 3: Contract Existence Guard
**What:** When URL contains a contract ID that doesn't exist in localStorage, redirect to dashboard.
**When to use:** In `App.tsx` when rendering the review view.
**Example:**
```typescript
// In App.tsx renderContent()
case 'review':
  const contract = contracts.find(c => c.id === activeContractId);
  if (!contract) {
    // Contract doesn't exist -- redirect to dashboard
    navigateTo('dashboard');
    return <Dashboard contracts={contracts} onNavigate={navigateTo} />;
  }
  return <ContractReview contract={contract} ... />;
```

### Anti-Patterns to Avoid
- **Storing route state in both useRouter AND useContractStore:** Single source of truth must be `useRouter`. Remove `activeView`, `activeContractId`, and `navigateTo` from `useContractStore` entirely.
- **Using `replaceState` for normal navigation:** Use `pushState` so back button works. Reserve `replaceState` only for redirects (e.g., non-existent contract -> dashboard) where you don't want a back-button entry.
- **Calling `pushState` inside `popstate` handler:** This breaks back/forward by inserting extra history entries. The `popstate` handler should only read URL and update state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing | Complex regex router | Simple string `startsWith`/`===` checks | Only 3 routes; regex is overkill and error-prone |
| History state serialization | Passing data via `history.state` | Parse URL on each navigation | URL is the source of truth; state object creates sync issues |

**Key insight:** With only 3 routes, the entire routing logic is trivially simple. The complexity is in the integration (removing old navigation, wiring new hook), not the routing itself.

## Common Pitfalls

### Pitfall 1: Vercel Rewrite Ordering Breaks API
**What goes wrong:** The catch-all `/(.*) -> /index.html` rewrite matches `/api/analyze` before the API function handler.
**Why it happens:** Vercel processes rewrites in order. If the catch-all is listed before the API pass-through, API calls get `index.html` instead.
**How to avoid:** List the `/api/(.*)` rewrite FIRST, then the catch-all. Alternatively, Vercel's `functions` config may handle this automatically, but an explicit API rewrite is safer.
**Warning signs:** 404 or HTML response when calling `/api/analyze` after deploying.

### Pitfall 2: popstate Does Not Fire on pushState
**What goes wrong:** Calling `history.pushState()` does NOT trigger the `popstate` event. Only browser back/forward buttons trigger it.
**Why it happens:** This is by design in the History API spec.
**How to avoid:** After calling `pushState`, manually update React state in the same `navigateTo` function. The `popstate` listener is ONLY for back/forward button support.
**Warning signs:** Clicking internal navigation links doesn't update the view.

### Pitfall 3: Non-Existent Contract Creates Redirect Loop
**What goes wrong:** Deep link to `/contracts/bad-id` triggers redirect to `/`, which triggers re-render, which checks the URL again.
**Why it happens:** If redirect logic uses `navigateTo('dashboard')` which pushes a new history entry, and the component re-renders before state settles.
**How to avoid:** Use `history.replaceState` (not `pushState`) for the fallback redirect so no extra history entry is created. Or handle it in `renderContent` by simply showing the dashboard without navigating.
**Warning signs:** Browser history fills with duplicate `/` entries; back button seems broken.

### Pitfall 4: Upload View Has No URL But Back Button Should Work
**What goes wrong:** User clicks "Upload" in sidebar, then clicks browser back -- nothing happens because upload didn't push a URL.
**Why it happens:** Upload is a transient view with no URL. No `pushState` call means no history entry.
**How to avoid:** This is the intended behavior per CONTEXT.md (upload has no URL). The back button will go to whatever was before the current URL. Document this as expected behavior.
**Warning signs:** None -- this is by design.

### Pitfall 5: Vite Dev Server Doesn't Handle SPA Routes
**What goes wrong:** Refreshing `/contracts/c-123` in dev returns a 404.
**Why it happens:** Vite dev server doesn't know about SPA routes by default. When using `vercel dev` this is handled by the rewrite, but `npm run dev` won't have it.
**How to avoid:** The project uses `vercel dev` for local development (per MEMORY.md). However, if `npm run dev` is ever used, Vite's `historyApiFallback` is enabled by default for the dev server, so this should work out of the box. Verify both work.
**Warning signs:** 404 on refresh during development.

## Code Examples

### Removing Navigation from useContractStore
```typescript
// src/hooks/useContractStore.ts -- AFTER modification
// Remove: activeContractId, activeView, navigateTo
// Keep: contracts, addContract, updateContract, deleteContract, isUploading, storageWarning

export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const { contracts } = loadContracts();
    return contracts;
  });
  const [isUploading, setIsUploading] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // ... persistAndSet, addContract, updateContract, deleteContract unchanged ...

  return {
    contracts,
    isUploading,
    setIsUploading,
    addContract,
    updateContract,
    deleteContract,
    storageWarning,
    dismissStorageWarning,
  };
}
```

### App.tsx Integration
```typescript
// src/App.tsx -- key changes
import { useRouter } from './hooks/useRouter';
import { useContractStore } from './hooks/useContractStore';

export function App() {
  const { activeView, activeContractId, navigateTo } = useRouter();
  const { contracts, addContract, updateContract, deleteContract, ... } = useContractStore();

  const activeContract = contracts.find(c => c.id === activeContractId) || null;

  // renderContent() switch stays the same structure,
  // but now reads from useRouter's state
}
```

### Sidebar Route-Aware Highlighting
```typescript
// Sidebar needs to know: dashboard highlighted for '/', 'contracts', and 'upload' views
// since those don't have their own URLs

// The activeView prop still works as before.
// The Sidebar already highlights based on activeView, no URL awareness needed.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hash routing (`#/path`) | `history.pushState` | 2014+ (universal support) | Clean URLs, no hash needed |
| Full page reloads | SPA client-side routing | 2015+ | Instant transitions |
| Heavy router libraries for simple apps | Custom hooks for < 5 routes | 2020+ (hooks era) | Zero dependency overhead |

**Deprecated/outdated:**
- Hash-based routing: Still works but looks unprofessional for modern SPAs
- `window.onhashchange`: Replaced by `popstate` for pushState-based routing

## Open Questions

1. **Upload-to-review URL timing**
   - What we know: When upload starts, `navigateTo('review', id)` is called. Per CONTEXT, URL should update to `/contracts/:id` immediately.
   - What's unclear: Should the upload view itself ever appear in URL? (CONTEXT says no -- upload has no URL)
   - Recommendation: `navigateTo('review', id)` pushes `/contracts/:id` to URL. Before that, upload view shows at whatever the current URL is (likely `/`). This matches the decision.

2. **Error case: analysis fails after navigating to /contracts/:id**
   - What we know: Current code calls `navigateTo('upload')` on failure. With new router, this would leave URL at `/` (upload has no URL).
   - What's unclear: Should the failed contract remain at `/contracts/:id` or go back to `/`?
   - Recommendation: Follow existing behavior -- navigate to upload view (URL stays `/` since upload is transient). The failed contract placeholder is still in localStorage with status `Reviewed` and empty findings.

## Validation Architecture

> No test framework configured (per CLAUDE.md). Validation is manual.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | N/A |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROUTE-01 | Back/forward buttons work | manual | N/A | N/A |
| ROUTE-02 | Page refresh preserves view | manual | N/A | N/A |
| ROUTE-03 | Deep link to contract review works | manual | N/A | N/A |
| ROUTE-04 | Unknown URL shows dashboard | manual | N/A | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (ensures no type errors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Manual browser testing of all 4 ROUTE requirements

### Wave 0 Gaps
None -- no test infrastructure to set up (manual testing only per project conventions).

## Sources

### Primary (HIGH confidence)
- Browser History API: MDN documentation (stable, universally known, no recent changes)
- Vercel rewrites: Vercel documentation (well-documented SPA routing pattern)
- Existing codebase: Direct reading of `useContractStore.ts`, `App.tsx`, `Sidebar.tsx`, `vercel.json`

### Secondary (MEDIUM confidence)
- Vite dev server SPA fallback: Vite defaults to serving `index.html` for non-file routes in dev mode

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Browser History API is stable and universally documented
- Architecture: HIGH - Direct reading of existing codebase, clear integration points
- Pitfalls: HIGH - Well-known SPA routing gotchas, verified against actual codebase structure

**Research date:** 2026-03-12
**Valid until:** 2027-03-12 (History API is stable; no expiration concern)
