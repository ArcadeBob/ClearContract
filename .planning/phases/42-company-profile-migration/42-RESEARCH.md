# Phase 42: Company Profile Migration - Research

**Researched:** 2026-03-17
**Domain:** Supabase client-side reads/writes for company_profiles table
**Confidence:** HIGH

## Summary

This phase rewrites `useCompanyProfile` to load from Supabase on Settings mount and upsert on field blur, replacing the current localStorage persistence. The codebase already has all the building blocks: a Supabase client singleton, a snake-to-camel mapper, a toast system for errors, and an auth context providing user ID. The only new utility needed is a camelToSnake mapper (inverse of existing `mapRow`).

The change surface is small -- one hook rewrite, minor Settings page updates for async loading state, and the new mapper function. The profileLoader.ts (used by the analysis pipeline) stays on localStorage until Phase 43.

**Primary recommendation:** Rewrite useCompanyProfile as an async hook with useEffect fetch + upsert saveField, following the exact patterns established by useContractStore (Phase 41).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full row upsert on each field blur (same pattern as current localStorage save)
- Upsert (INSERT ON CONFLICT) handles both create and update transparently
- Row created on first edit -- no pre-population on sign-up or Settings visit
- Build camelToSnake mapper (inverse of Phase 41's mapRow) for write payloads
- Load profile from Supabase only when Settings page mounts (not globally on app start like contracts)
- Only one page consumes profile data -- no need to add load latency to every session
- Fetch once on mount, no background re-fetching (single user, data static until user action)
- New user with no Supabase row sees DEFAULT_COMPANY_PROFILE values pre-filled in fields (same as current behavior)
- Client-side merge: `{ ...DEFAULT_COMPANY_PROFILE, ...fetchedRow }` -- defaults fill gaps
- No Supabase row needed until user actually edits a field
- Only rewrite useCompanyProfile hook to use Supabase
- Leave profileLoader.ts untouched -- analyzeContract.ts still uses it (localStorage) until Phase 43
- Keep the edited value in UI (in-memory), show error toast via useToast
- Show DEFAULT_COMPANY_PROFILE values (same as new user) with error toast explaining data couldn't be loaded
- User can still edit fields -- writes may succeed even if initial read failed
- No blocking error state -- graceful degradation

### Claude's Discretion
- Exact camelToSnake implementation (utility function or inline mapping)
- Whether to co-locate the Supabase fetch in the hook or in a separate module
- Loading state handling on Settings mount (spinner vs skeleton vs instant defaults)
- Whether storageError state in useCompanyProfile should be replaced with toast-only or kept for backward compat

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-03 | Company profile reads and writes to Supabase | Full implementation path documented: useCompanyProfile rewrite with Supabase select on mount + upsert on blur, camelToSnake mapper for writes, toast for errors |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | v2 (already installed) | Supabase client for profile queries | Already in use for contract reads (Phase 41) |
| React useState/useEffect | 18.x (already installed) | Hook state and mount-time fetch | Project convention -- no external state libraries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useToast (project hook) | N/A | Error display for load/write failures | On any Supabase error response |
| useAuth (project hook) | N/A | Get session.user.id for RLS queries | Needed for upsert user_id column |

No new dependencies required.

## Architecture Patterns

### Pattern 1: Hook Rewrite -- useCompanyProfile with Supabase

**What:** Replace localStorage read/write with Supabase select/upsert while maintaining the same public API shape.

**Current hook API (preserve):**
```typescript
{ profile, saveField, storageError, dismissStorageError }
```

**New hook API (recommended):**
```typescript
{ profile, saveField, isLoading }
// storageError + dismissStorageError removed -- errors go through useToast
```

**Implementation pattern:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from '../knowledge/types';
import { supabase } from '../lib/supabase';
import { mapRow } from '../lib/mappers';
import { mapToSnake } from '../lib/mappers'; // new export
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';

export function useCompanyProfile() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        showToast({ type: 'error', message: 'Could not load company profile' });
        setIsLoading(false);
        return;
      }

      if (data) {
        const mapped = mapRow<CompanyProfile>(data);
        setProfile({ ...DEFAULT_COMPANY_PROFILE, ...mapped });
      }
      // No data = new user, keep defaults
      setIsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);  // session not needed as dep -- RLS handles scoping

  // Save on blur
  const saveField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
      setProfile((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };

        // Fire-and-forget upsert
        const payload = mapToSnake(next);
        payload.user_id = session!.user.id;

        supabase
          .from('company_profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) {
              showToast({ type: 'error', message: 'Could not save profile change' });
            }
          });

        return next;
      });
    },
    [session, showToast]
  );

  return { profile, saveField, isLoading };
}
```

**Key design choices in this pattern:**
- `.maybeSingle()` returns null data (not error) when no row exists -- perfect for new user case
- Fire-and-forget upsert: UI updates immediately, toast on failure
- `onConflict: 'user_id'` matches the UNIQUE constraint on `company_profiles.user_id`
- `cancelled` flag prevents state updates after unmount (same pattern as useContractStore)

### Pattern 2: camelToSnake Mapper

**What:** Inverse of existing `mapRow` -- converts camelCase object keys to snake_case for Supabase writes.

**Add to `src/lib/mappers.ts`:**
```typescript
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function mapToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}
```

**Why co-locate in mappers.ts:** It's the inverse operation of the existing functions. Single responsibility -- all key mapping lives in one file.

### Pattern 3: Settings Page Loading State

**Recommended approach: Show defaults instantly, no loading indicator.**

Rationale: The DEFAULT_COMPANY_PROFILE values are meaningful defaults (not empty strings) for most fields. Showing them immediately and replacing with fetched values on load provides the smoothest UX. The profile loads from a single small row -- latency is negligible.

If the planner prefers a loading indicator, a simple conditional on `isLoading` with a spinner is fine, but it adds visual noise for a sub-100ms operation.

### Anti-Patterns to Avoid
- **Don't use `.single()` for the read:** Use `.maybeSingle()`. `.single()` throws an error if zero rows are returned, which is the expected state for a new user.
- **Don't await the upsert in saveField:** The blur handler should be synchronous from the UI's perspective. Fire-and-forget with error toast matches the user decision.
- **Don't include `id` or `created_at` in the upsert payload:** Let Postgres generate `id` via `gen_random_uuid()` and `created_at` via `default now()`. Only send data columns + `user_id`.
- **Don't touch profileLoader.ts:** It stays on localStorage until Phase 43. Modifying it breaks the analysis pipeline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snake/camel key conversion | Manual field-by-field mapping object | Generic `camelToSnake`/`mapRow` utilities | 20 fields -- a manual map is error-prone and will drift |
| Upsert logic | Separate check-then-insert/update flow | Supabase `.upsert()` with `onConflict` | Single atomic operation, no race conditions |
| User scoping | Manual WHERE user_id = X on every query | RLS policies (already in place) | Policies enforce scoping at DB level; client just queries |

## Common Pitfalls

### Pitfall 1: Using .single() Instead of .maybeSingle()
**What goes wrong:** `.single()` returns an error when zero rows match (PGRST116). A new user has no profile row, so the initial load fails with an error instead of returning null.
**Why it happens:** `.single()` expects exactly one row.
**How to avoid:** Always use `.maybeSingle()` for queries that may return zero or one row.
**Warning signs:** "JSON object requested, multiple (or no) rows returned" error in console.

### Pitfall 2: Including Meta Columns in Upsert Payload
**What goes wrong:** Sending `id`, `createdAt`, or `updatedAt` from the client overwrites server-generated values or causes constraint violations.
**Why it happens:** `mapToSnake` converts ALL keys from the profile object, including any that leaked from mapRow.
**How to avoid:** Strip `id`, `user_id`, `created_at`, `updated_at` from the mapped profile before adding `user_id` back explicitly. Or build the payload from CompanyProfile fields only (which don't include meta columns).
**Warning signs:** Duplicate key violations or unexpected timestamp overwrites.

### Pitfall 3: Stale Closure in saveField
**What goes wrong:** If `session` is null when saveField is first created (before auth loads), the upsert sends `user_id: undefined`.
**Why it happens:** useCallback captures `session` at creation time.
**How to avoid:** Include `session` in useCallback deps (already shown in pattern). Alternatively, guard with `if (!session) return;` at the top of saveField.
**Warning signs:** "null value in column user_id violates not-null constraint" error.

### Pitfall 4: Settings Page Reads storageError
**What goes wrong:** Settings.tsx currently destructures `storageError` and `dismissStorageError` from the hook. If removed from the hook without updating Settings.tsx, TypeScript will catch it but the amber banner JSX also needs removal.
**Why it happens:** Forgetting to update the consumer when changing the hook API.
**How to avoid:** Update Settings.tsx in the same task as the hook rewrite -- remove the storageError banner, rely on toast.

### Pitfall 5: mapToSnake Producing Wrong Column Names
**What goes wrong:** camelToSnake of `glPerOccurrence` must produce `gl_per_occurrence` (not `g_l_per_occurrence`). The regex `s.replace(/[A-Z]/g, ...)` works correctly because `gl` is all lowercase -- the uppercase letters are P, O only.
**Why it happens:** Acronyms like GL, WC, SBE are stored as lowercase in camelCase (`gl`, `wc`, `sbe`), so the simple regex handles them correctly.
**How to avoid:** Verify mapping of all 20 fields. The simple `[A-Z]` regex is correct for this schema.

## Code Examples

### Complete Field Mapping (verified against schema)

| CompanyProfile key | DB column | camelToSnake correct? |
|---|---|---|
| glPerOccurrence | gl_per_occurrence | Yes |
| glAggregate | gl_aggregate | Yes |
| umbrellaLimit | umbrella_limit | Yes |
| autoLimit | auto_limit | Yes |
| wcStatutoryState | wc_statutory_state | Yes |
| wcEmployerLiability | wc_employer_liability | Yes |
| bondingSingleProject | bonding_single_project | Yes |
| bondingAggregate | bonding_aggregate | Yes |
| contractorLicenseType | contractor_license_type | Yes |
| contractorLicenseNumber | contractor_license_number | Yes |
| contractorLicenseExpiry | contractor_license_expiry | Yes |
| dirRegistration | dir_registration | Yes |
| dirExpiry | dir_expiry | Yes |
| sbeCertId | sbe_cert_id | Yes |
| sbeCertIssuer | sbe_cert_issuer | Yes |
| lausdVendorNumber | lausd_vendor_number | Yes |
| employeeCount | employee_count | Yes |
| serviceArea | service_area | Yes |
| typicalProjectSizeMin | typical_project_size_min | Yes |
| typicalProjectSizeMax | typical_project_size_max | Yes |

All 20 fields map correctly with the simple `[A-Z]` regex.

### Supabase Upsert with onConflict

```typescript
// Source: Supabase JS client v2 API + project schema
const { error } = await supabase
  .from('company_profiles')
  .upsert(
    { user_id: session.user.id, ...snakeCaseProfileFields },
    { onConflict: 'user_id' }
  );
```

The `onConflict: 'user_id'` matches the UNIQUE constraint: `user_id uuid not null references auth.users(id) unique`.

### Supabase Select with maybeSingle

```typescript
// Source: Supabase JS client v2 API
const { data, error } = await supabase
  .from('company_profiles')
  .select('*')
  .maybeSingle();

// data is null if no row exists (new user) -- not an error
// RLS automatically scopes to current user's row
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage via storageManager | Supabase company_profiles table | Phase 42 (this phase) | Profile survives device changes and storage clearing |
| storageError inline banner | Toast notifications via useToast | Phase 42 (this phase) | Consistent error UX with rest of app |
| Synchronous profile load | Async fetch on Settings mount | Phase 42 (this phase) | Adds brief loading state; profile no longer instant |

## Open Questions

1. **Should updated_at be set on upsert?**
   - What we know: The table has `updated_at timestamptz not null default now()` but no trigger to auto-update it on UPDATE (only INSERT gets the default).
   - What's unclear: Whether to add `updated_at: new Date().toISOString()` to the upsert payload or add a Postgres trigger.
   - Recommendation: Include `updated_at` in the upsert payload from the client. Simple, no migration needed. The planner should include this in the write payload.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already configured) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03a | Profile loads from Supabase on Settings mount | unit | `npx vitest run src/hooks/__tests__/useCompanyProfile.test.ts -t "loads" --reporter=verbose` | No -- Wave 0 |
| DATA-03b | Profile field upserts to Supabase on blur | unit | `npx vitest run src/hooks/__tests__/useCompanyProfile.test.ts -t "saves" --reporter=verbose` | No -- Wave 0 |
| DATA-03c | New user sees defaults (no Supabase row) | unit | `npx vitest run src/hooks/__tests__/useCompanyProfile.test.ts -t "defaults" --reporter=verbose` | No -- Wave 0 |
| DATA-03d | camelToSnake mapper correctness | unit | `npx vitest run src/lib/__tests__/mappers.test.ts -t "snake" --reporter=verbose` | Partial (mapRow tests exist) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/useCompanyProfile.test.ts` -- covers DATA-03a/b/c (mock supabase client)
- [ ] `src/lib/__tests__/mappers.test.ts` -- add mapToSnake tests alongside existing mapRow tests

## Sources

### Primary (HIGH confidence)
- Project source code: `src/hooks/useCompanyProfile.ts`, `src/lib/mappers.ts`, `src/lib/supabase.ts`, `src/knowledge/types.ts`, `src/pages/Settings.tsx` -- current implementation read directly
- `supabase/migrations/00000000000000_initial_schema.sql` -- company_profiles table schema, RLS policies, UNIQUE constraint on user_id
- `src/hooks/useContractStore.ts` -- Phase 41 Supabase query patterns (select, mapRow, cancelled flag)

### Secondary (MEDIUM confidence)
- Supabase JS v2 `.upsert()` with `onConflict` option -- consistent with training data and schema constraints
- Supabase JS v2 `.maybeSingle()` -- returns null data for zero rows, not an error

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already in use
- Architecture: HIGH -- follows exact patterns from Phase 41 (useContractStore), verified against codebase
- Pitfalls: HIGH -- derived from direct code inspection of schema, types, and existing hook patterns

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no moving parts, all dependencies locked)
