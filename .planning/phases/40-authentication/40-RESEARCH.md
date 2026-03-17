# Phase 40: Authentication - Research

**Researched:** 2026-03-17
**Domain:** Supabase Auth with React (email/password, session persistence, route protection)
**Confidence:** HIGH

## Summary

Phase 40 adds email/password authentication using Supabase Auth, gating the entire app behind a login page. The implementation is straightforward: Supabase JS v2's built-in `auth` module handles sign-in, sign-out, session persistence (localStorage by default), and auth state change events. No additional auth libraries are needed -- `@supabase/supabase-js` (already planned as a dependency) includes everything.

The main architectural decision is how to integrate auth state into the existing React app structure. The app currently uses custom hooks (no Context API except ToastProvider). Auth state needs to be shared across App.tsx (route gating), Sidebar (sign-out button), and potentially future data-fetching hooks. A React Context + Provider pattern is the cleanest approach here, wrapping the app at the root level.

**Primary recommendation:** Create a Supabase client singleton, wrap the app in an AuthProvider using `onAuthStateChange` for reactive session state, and gate all content in App.tsx behind an auth check.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Login page: Centered card on full-screen slate-50 background with `.glass-panel` style
- Branding: Gem icon + "ClearContract" heading + "AI-Powered Contract Review" tagline
- Two fields: Email and Password
- Sign In button: slate-900 background, white text
- Session loading: centered spinner with branding on slate-50 background (Gem icon + "ClearContract" text above spinner)
- Sign-out: "Sign Out" link at very bottom of Sidebar, below Settings, separated by divider line. Immediate on click -- no confirmation dialog
- After sign-out: clear in-memory state, redirect to login page
- Error messaging: inline below password field, "Invalid email or password" regardless of specific error (security best practice)
- Sign In button shows spinner and becomes disabled while auth request is in-flight
- No registration UI, no password reset, no OAuth, no email verification
- User accounts pre-created in Supabase dashboard

### Claude's Discretion
- Exact spinner component/style (CSS animation or lucide Loader icon)
- Input field styling details (focus rings, padding)
- Framer Motion entry animation on login card (if any)
- How the auth hook integrates with the existing useRouter hook
- Supabase client initialization pattern (singleton, context, etc.)
- Route protection implementation approach (wrapper component, hook guard, etc.)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign in with email and password on a login page | `signInWithPassword({ email, password })` API; LoginPage component with form |
| AUTH-02 | User session persists across browser refresh and tab close | Supabase JS uses localStorage by default; `persistSession: true` is default; `onAuthStateChange` emits `INITIAL_SESSION` on load |
| AUTH-03 | Unauthenticated users see only the login page (protected routes) | AuthProvider context; App.tsx gates content rendering on `session !== null` |
| AUTH-04 | User can sign out via button in sidebar | `supabase.auth.signOut()` call; `SIGNED_OUT` event clears session state |
| AUTH-05 | Login page shows clear error messages for invalid credentials | `signInWithPassword` returns `{ error }` object; display inline below password field |
| AUTH-06 | App shows loading state while checking session (no login flash) | `isLoading` state in AuthProvider; show branded spinner until `INITIAL_SESSION` event fires |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.x | Auth client, session management, future DB queries | Already decided in STATE.md; includes auth module |

### Supporting
No additional libraries needed. Supabase JS v2 includes the full auth module (`supabase.auth.*`).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/supabase-js auth | @supabase/auth-helpers-react | Explicitly ruled out in STATE.md decisions |
| React Context for auth state | Custom hook only | Context needed because auth state is consumed in multiple component trees (App.tsx + Sidebar) |

**Installation:**
```bash
npm install @supabase/supabase-js
```

**Environment variables (already in .env.example):**
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Note: The existing `.env.example` uses `SUPABASE_URL` / `SUPABASE_ANON_KEY` (no `VITE_` prefix). Client-side code needs the `VITE_` prefix for Vite to expose them. The non-prefixed versions are for server-side (api/ functions). Both sets are needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── supabase.ts          # Supabase client singleton (createClient)
├── contexts/
│   └── AuthContext.tsx       # AuthProvider + useAuth hook
├── pages/
│   └── LoginPage.tsx         # Login form page
├── components/
│   └── Sidebar.tsx           # Modified: add sign-out button
├── App.tsx                   # Modified: wrap content in auth gate
└── main.tsx                  # Modified: wrap App in AuthProvider
```

### Pattern 1: Supabase Client Singleton
**What:** Single `createClient` call, exported as module-level constant.
**When to use:** Always. Never create multiple client instances.
**Example:**
```typescript
// src/lib/supabase.ts
// Source: https://supabase.com/docs/guides/auth/quickstarts/react
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Pattern 2: AuthProvider with onAuthStateChange
**What:** React Context that listens to auth state changes and provides session + loading state.
**When to use:** App root. Provides auth state to all descendants.
**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(event === 'SIGNED_OUT' ? null : session);
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Pattern 3: Auth Gate in App.tsx
**What:** Conditional rendering at the root level -- show LoginPage or main app based on auth state.
**When to use:** In App.tsx, wrapping the entire content area.
**Example:**
```typescript
// In App.tsx
const { session, isLoading } = useAuth();

if (isLoading) {
  return <LoadingScreen />;  // Branded spinner (AUTH-06)
}

if (!session) {
  return <LoginPage />;  // No sidebar, no routes (AUTH-03)
}

// Existing app content (sidebar + routes)
return (
  <div className="flex h-screen ...">
    <Sidebar ... onSignOut={signOut} />
    <main>...</main>
  </div>
);
```

### Pattern 4: Login Form with Error Handling
**What:** Form that calls `signInWithPassword` and displays inline errors.
**When to use:** LoginPage component.
**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setError('Invalid email or password');  // Generic message per user decision
  }
  // No need to handle success -- onAuthStateChange will update session
  setIsSubmitting(false);
};
```

### Anti-Patterns to Avoid
- **Creating multiple Supabase clients:** Each creates its own auth state, leading to session conflicts. Use a single singleton.
- **Calling Supabase functions inside onAuthStateChange callback:** Can cause deadlocks. If needed, defer with `setTimeout(() => ..., 0)`.
- **Using async callbacks in onAuthStateChange:** The Supabase docs explicitly warn against this as it can cause race conditions.
- **Checking session with getSession() instead of onAuthStateChange:** `getSession` reads from local storage and the returned user object "must not be trusted" for security. Use `onAuthStateChange` for reactive state, and `getUser()` if server-side validation is needed.
- **Redirecting in the auth callback:** Handle navigation in component effects that react to session state changes, not inside the callback itself.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | localStorage token management | Supabase built-in persistence | Handles token refresh, expiry, cross-tab sync |
| Token refresh | Manual refresh token rotation | Supabase auto-refresh (`autoRefreshToken: true`, default) | Race conditions, timing, LockManager API handling |
| Auth state reactivity | Custom event system | `onAuthStateChange` subscription | Handles all edge cases: tab refocus, token refresh, sign-out |
| Password hashing | Client-side hashing | Supabase server-side hashing | Always hash server-side; client never sees raw passwords |

**Key insight:** Supabase handles the entire auth lifecycle (storage, refresh, cross-tab sync) out of the box. The only client code needed is: create client, subscribe to state changes, call signIn/signOut.

## Common Pitfalls

### Pitfall 1: Login Page Flash on Refresh
**What goes wrong:** Authenticated users briefly see the login page before session loads from localStorage.
**Why it happens:** `onAuthStateChange` is async -- the `INITIAL_SESSION` event fires after the component mounts.
**How to avoid:** Use an `isLoading` state initialized to `true`, only set to `false` after `INITIAL_SESSION` fires. Show a branded loading screen during this period (AUTH-06).
**Warning signs:** Login page flickers on page refresh for logged-in users.

### Pitfall 2: Email Verification Blocking Login
**What goes wrong:** After creating a user in the Supabase dashboard, signInWithPassword returns a user but `session` is null.
**Why it happens:** Supabase has "Confirm email" enabled by default. When enabled, signup returns a user but no session.
**How to avoid:** Disable "Confirm email" in Supabase Dashboard > Authentication > Providers > Email. This is required per the CONTEXT.md decisions (no email verification).
**Warning signs:** signInWithPassword succeeds but session is null.

### Pitfall 3: Signup Still Possible via API
**What goes wrong:** Even without a signup UI, the Supabase `signUp` endpoint is still accessible via the anon key.
**Why it happens:** Supabase exposes signup by default through the REST API.
**How to avoid:** Disable signup in Supabase Dashboard > Authentication > Providers > Email > uncheck "Allow new users to sign up." Users must be pre-created via dashboard.
**Warning signs:** Unauthorized users can create accounts by calling the API directly.

### Pitfall 4: Environment Variable Prefix
**What goes wrong:** `import.meta.env.SUPABASE_URL` returns `undefined` in the browser.
**Why it happens:** Vite only exposes env vars with the `VITE_` prefix to client-side code.
**How to avoid:** Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for client-side. Keep non-prefixed versions for server-side (`api/` functions).
**Warning signs:** Supabase client initialization fails silently or throws "Invalid URL."

### Pitfall 5: State Clearing on Sign-Out
**What goes wrong:** After signing out, stale contract data remains in memory; signing in as a different user shows the previous user's data.
**Why it happens:** In-memory state (useContractStore) is not tied to auth lifecycle.
**How to avoid:** Clear all in-memory state when `SIGNED_OUT` event fires. Per CONTEXT.md: "clear in-memory state, redirect to login page." This can be done by resetting the contract store or by unmounting/remounting the app content on auth change.
**Warning signs:** Data from previous session visible after re-login.

## Code Examples

### Supabase Client Initialization
```typescript
// src/lib/supabase.ts
// Source: https://supabase.com/docs/guides/auth/quickstarts/react
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Sign-In Call
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
// error.message contains the error description
// No need to handle data.session -- onAuthStateChange handles it
```

### Sign-Out Call
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signout
await supabase.auth.signOut();
// onAuthStateChange will fire SIGNED_OUT event
```

### Loading Screen Component
```typescript
// Branded loading screen to prevent login flash (AUTH-06)
import { Gem } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-blue-600 rounded-xl">
          <Gem className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">ClearContract</h1>
        {/* Spinner -- CSS animation or Loader2 from lucide */}
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getSession()` for auth checks | `onAuthStateChange` with `INITIAL_SESSION` event | supabase-js v2.x | Reactive state instead of polling; handles all edge cases |
| `supabase.auth.session()` (v1) | `supabase.auth.getSession()` (v2) | v2.0 migration | v1 API removed; v2 returns `{ data, error }` pattern |
| Separate auth-helpers packages | Built-in to @supabase/supabase-js | 2024+ | No extra packages needed for basic React SPA auth |
| `getSession()` trusted for identity | `getUser()` or `getClaims()` for identity verification | 2024+ | `getSession` reads from local storage and user object should not be trusted for security-sensitive operations |

**Deprecated/outdated:**
- `supabase.auth.session()` -- v1 API, removed in v2
- `@supabase/auth-helpers-react` -- not needed; explicitly excluded per STATE.md
- `supabase.auth.onAuthStateChange` with async callbacks -- explicitly warned against in current docs

## Open Questions

1. **VITE_ prefix for env vars**
   - What we know: `.env.example` has `SUPABASE_URL` and `SUPABASE_ANON_KEY` (no prefix). Server-side code uses these.
   - What's unclear: Whether `.env.local` already has `VITE_` prefixed versions or only the non-prefixed ones.
   - Recommendation: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` alongside existing server-side vars. Update `.env.example` to include both.

2. **Supabase auth settings (dashboard configuration)**
   - What we know: Need to disable "Confirm email" and disable signup in Supabase Dashboard.
   - What's unclear: Whether this has already been done as part of Phase 39.
   - Recommendation: Include as an explicit task step -- verify/configure in dashboard. This is a one-time manual step.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x + React Testing Library |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign in with email/password | unit | `npx vitest run src/pages/LoginPage.test.tsx -x` | No -- Wave 0 |
| AUTH-02 | Session persists across refresh | integration | Manual verification (requires real Supabase) | manual-only |
| AUTH-03 | Unauthenticated users see only login | unit | `npx vitest run src/App.test.tsx -x` | No -- Wave 0 |
| AUTH-04 | Sign out via sidebar button | unit | `npx vitest run src/components/Sidebar.test.tsx -x` | Yes (needs update) |
| AUTH-05 | Error messages for invalid credentials | unit | `npx vitest run src/pages/LoginPage.test.tsx -x` | No -- Wave 0 |
| AUTH-06 | Loading state while checking session | unit | `npx vitest run src/contexts/AuthContext.test.tsx -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/pages/LoginPage.test.tsx` -- covers AUTH-01, AUTH-05
- [ ] `src/contexts/AuthContext.test.tsx` -- covers AUTH-06
- [ ] `src/App.test.tsx` -- covers AUTH-03 (auth gate rendering)
- [ ] Mock for `@supabase/supabase-js` auth module -- shared across test files
- [ ] Update `src/components/Sidebar.test.tsx` -- covers AUTH-04 (sign-out button)

## Sources

### Primary (HIGH confidence)
- [Supabase signInWithPassword API](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) - Parameters, return type, error handling
- [Supabase onAuthStateChange API](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) - Event types, React pattern, async callback warnings
- [Supabase getSession API](https://supabase.com/docs/reference/javascript/auth-getsession) - Return type, security warnings, local storage behavior
- [Supabase React Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) - Client setup pattern
- [Supabase General Auth Configuration](https://supabase.com/docs/guides/auth/general-configuration) - Disable email confirm, disable signup

### Secondary (MEDIUM confidence)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth) - Overview of auth features and session persistence behavior

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @supabase/supabase-js is the only dependency; already decided in STATE.md
- Architecture: HIGH - Official Supabase docs provide exact React patterns; code examples verified against API reference
- Pitfalls: HIGH - Known issues documented in official docs and GitHub discussions; env var prefix is Vite-standard behavior

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- Supabase auth API is mature and rarely changes)
