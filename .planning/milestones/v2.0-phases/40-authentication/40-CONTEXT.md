# Phase 40: Authentication - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Users must sign in with email and password before accessing any part of the app. Sessions persist across browser restarts. Unauthenticated users see only the login page -- no sidebar, no dashboard, no routes accessible. User accounts are pre-created in Supabase dashboard (no registration UI, no password reset, no OAuth). Auth configuration (disable email verification, disable signup) is part of this phase.

</domain>

<decisions>
## Implementation Decisions

### Login page layout
- Centered card on full-screen slate-50 background
- Card uses `.glass-panel` style (bg-white/80, backdrop-blur-sm, border-slate-200, shadow-sm) for consistency with app aesthetic
- Branding: Gem icon (lucide-react, same as Sidebar) + "ClearContract" heading + "AI-Powered Contract Review" tagline
- Two fields: Email and Password
- Sign In button uses slate-900 background (matches sidebar color), white text

### Session loading state
- While checking auth session on first load, show centered spinner with branding on slate-50 background
- Gem icon + "ClearContract" text above spinner
- Prevents login page flash for already-authenticated users (AUTH-06)

### Sign-out
- "Sign Out" link at the very bottom of the Sidebar, below Settings, separated by a divider line
- Sign out happens immediately on click -- no confirmation dialog
- After sign-out: clear in-memory state, redirect to login page

### Error messaging
- Login errors displayed inline below the password field inside the card (not as toast)
- Generic error message: "Invalid email or password" regardless of whether email or password is wrong (security best practice)
- Sign In button shows a spinner and becomes disabled while auth request is in-flight (prevents double-clicks)

### Claude's Discretion
- Exact spinner component/style (CSS animation or lucide Loader icon)
- Input field styling details (focus rings, padding)
- Framer Motion entry animation on login card (if any)
- How the auth hook integrates with the existing useRouter hook
- Supabase client initialization pattern (singleton, context, etc.)
- Route protection implementation approach (wrapper component, hook guard, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authentication requirements
- `.planning/REQUIREMENTS.md` -- AUTH-01 through AUTH-06 define sign-in, session persistence, protected routes, sign-out, error messages, loading state
- `.planning/ROADMAP.md` -- Phase 40 success criteria: login page, session persistence, protected routes, sign-out, error messages

### Prior phase decisions
- `.planning/phases/39-database-schema-and-rls/39-CONTEXT.md` -- RLS policies use auth.uid() = user_id; anon key for client-side; auth config deferred to this phase
- `.planning/STATE.md` -- v2.0 decisions: @supabase/supabase-js v2 only (no auth-helpers), two-client pattern, fresh start (no localStorage migration)

### Existing code patterns
- `src/hooks/useRouter.ts` -- Custom History API router; auth guard needs to integrate with or wrap this
- `src/components/Sidebar.tsx` -- Navigation component where sign-out button will be added
- `src/App.tsx` -- Root component; auth state check and route protection will gate content rendering here
- `src/index.css` -- `.glass-panel` class definition for login card styling

### Out of scope (explicitly)
- `.planning/REQUIREMENTS.md` Out of Scope table -- No registration UI, no password reset, no OAuth, no email verification

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.glass-panel` CSS class (src/index.css): white/80 + backdrop-blur + border + shadow -- use for login card
- `Gem` icon from lucide-react (already imported in Sidebar.tsx): use for login branding
- `Sparkles` icon from lucide-react (already imported in Sidebar.tsx): available if needed
- `ConfirmDialog` component (src/components/ConfirmDialog.tsx): not needed for sign-out (immediate), but available
- `ToastProvider` + `useToast` (src/hooks/useToast.ts): available for non-login error scenarios

### Established Patterns
- Custom hooks for concerns: useRouter (navigation), useContractStore (state), useCompanyProfile (settings) -- follow this pattern for auth (useAuth or similar)
- View-based routing via ViewState type and useRouter hook -- login page is a new view or a gate before the router
- No Context API for state (except ToastProvider) -- auth state could follow either pattern (hook or context)
- Named exports only, no default exports
- Functional components with explicit Props interfaces

### Integration Points
- `src/App.tsx`: Root component renders Sidebar + page content. Auth gate goes here -- show login page or app based on auth state
- `src/hooks/useRouter.ts`: ViewState type may need 'login' added, OR login page renders outside the router entirely
- `src/components/Sidebar.tsx`: Needs sign-out button added below Settings with divider
- `package.json`: Will need `@supabase/supabase-js` dependency added

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard Supabase email/password auth with the visual decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 40-authentication*
*Context gathered: 2026-03-17*
