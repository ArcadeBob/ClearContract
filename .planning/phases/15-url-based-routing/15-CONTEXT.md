# Phase 15: URL-based Routing - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can navigate with the browser — back/forward buttons, refresh, deep links, and bookmarks all work. 3 routes: / (dashboard), /contracts/:id (review), /settings. Upload is a view without its own URL.

</domain>

<decisions>
## Implementation Decisions

### URL structure
- 3 routes total: `/` (dashboard), `/contracts/:id` (contract review), `/settings`
- Upload page has no URL — it's a transient view, navigating to `/upload` is not supported
- All Contracts list is accessed from the dashboard, not a separate `/contracts` route
- `/contracts/:id` uses existing `c-{timestamp}` IDs (no migration)

### Router approach
- Custom History API hook (`useRouter`) — no library dependency
- ~30-50 lines: `parseUrl()` maps pathname to ViewState, `navigateTo()` calls `history.pushState`, `popstate` listener syncs back/forward
- Replaces `useContractStore`'s `navigateTo` and view state entirely — new hook is single source of truth for navigation
- `useContractStore` keeps contract data management only (add, update, delete, persist)

### Vercel SPA routing
- `vercel.json` gets a catch-all rewrite: all non-`/api/*` paths serve `index.html`
- `/api/*` excluded from rewrite to preserve serverless function routing

### Contract ID handling
- Keep existing `c-{Date.now()}` format — no migration, guaranteed unique, functional for single user
- Non-existent contract IDs (`/contracts/c-9999999`) silently redirect to dashboard (ROUTE-04)

### Transition behavior
- Deep links to existing contracts render instantly (localStorage is synchronous)
- Deep links to "Analyzing" contracts show the Analyzing placeholder view
- Browser back/forward uses existing Framer Motion AnimatePresence transitions (same as click navigation)
- Upload-to-review URL updates immediately to `/contracts/:id` when analysis starts (matches current flow)

### Claude's Discretion
- Exact `useRouter` hook implementation details
- How `vercel.json` rewrite rules are ordered
- Whether `parseUrl` uses regex or string matching
- Error boundary placement

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useContractStore` (`src/hooks/useContractStore.ts`): Currently manages both navigation and contract data. Navigation state (`activeView`, `activeContractId`, `navigateTo`) will be extracted into new `useRouter` hook.
- `ViewState` type (`src/types/contract.ts`): `'dashboard' | 'upload' | 'review' | 'contracts' | 'settings'` — will need updating to reflect new route model.
- `AnimatePresence` in `App.tsx`: Already wraps view transitions, will work with new router.

### Established Patterns
- View rendering via `switch(activeView)` in `App.tsx` `renderContent()` — will map to route-based rendering
- `navigateTo(view, contractId?)` call pattern used throughout components (Sidebar, Dashboard, AllContracts, ContractReview back button)
- Contract lookup by ID: `contracts.find(c => c.id === activeContractId)` pattern

### Integration Points
- `App.tsx`: Main routing switch — will consume new `useRouter` hook
- `Sidebar.tsx`: Highlights active view, calls `onNavigate` — needs route-aware updates
- `Dashboard.tsx`, `AllContracts.tsx`: Call `onNavigate('review', contractId)` — will use new navigation
- `vercel.json`: Needs SPA rewrite rules added alongside existing function config
- `handleUploadComplete` in `App.tsx`: Calls `navigateTo('review', id)` — will use new router

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-url-based-routing*
*Context gathered: 2026-03-12*
