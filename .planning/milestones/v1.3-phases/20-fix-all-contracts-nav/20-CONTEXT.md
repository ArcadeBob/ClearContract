# Phase 20: Fix All Contracts Navigation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix useRouter so the All Contracts view is reachable via sidebar navigation, browser back/forward, direct URL `/contracts`, and page refresh. This reverses the Phase 15 decision that "All Contracts list is accessed from the dashboard, not a separate `/contracts` route" — the v1.3 audit identified this as a gap in ROUTE-01 and ROUTE-02.

</domain>

<decisions>
## Implementation Decisions

### URL structure
- All Contracts page lives at `/contracts` (exact match)
- `/contracts/:id` continues to route to contract review (prefix match)
- `parseUrl` must check `/contracts` exact match BEFORE `/contracts/:id` prefix match to avoid false routing

### Router changes
- `parseUrl()`: add `if (pathname === '/contracts') return { view: 'contracts', contractId: null }` before the `/contracts/:id` check
- `navigateTo()`: add `contracts` case that calls `history.pushState(null, '', '/contracts')` — same pattern as `settings` case

### No other changes needed
- `App.tsx` already has `case 'contracts'` in `renderContent()` rendering `<AllContracts />`
- `Sidebar.tsx` already passes `'contracts'` to `onNavigate`
- `ViewState` type already includes `'contracts'`
- `vercel.json` SPA catch-all rewrite already handles `/contracts`

### Claude's Discretion
- None — implementation is fully specified by the two additions above

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRouter` (`src/hooks/useRouter.ts`): 65-line custom hook with `parseUrl` and `navigateTo` — only file that needs changes
- All other components (Sidebar, App.tsx, AllContracts) already support the `'contracts'` view

### Established Patterns
- `parseUrl`: string matching on pathname, returns `{ view, contractId }` — add same pattern
- `navigateTo`: switch-like if/else with `history.pushState` — add same pattern
- Settings route is the closest analog: exact path match, no contractId

### Integration Points
- `useRouter.ts` is the only file that needs modification
- No new components, no new types, no config changes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — implementation mirrors the existing settings route pattern exactly.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-fix-all-contracts-nav*
*Context gathered: 2026-03-12*
