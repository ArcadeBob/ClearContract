# Phase 42: Company Profile Migration - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Move company profile settings from localStorage to Supabase. The Settings page loads profile from Postgres on mount, saves via upsert on each field blur. New users see default values client-side until their first edit creates a row. The analysis pipeline's use of profileLoader (localStorage) is untouched -- Phase 43 handles server-side profile reads.

</domain>

<decisions>
## Implementation Decisions

### Write strategy
- Full row upsert on each field blur (same pattern as current localStorage save)
- Upsert (INSERT ON CONFLICT) handles both create and update transparently
- Row created on first edit -- no pre-population on sign-up or Settings visit
- Build camelToSnake mapper (inverse of Phase 41's mapRow) for write payloads

### Load timing
- Load profile from Supabase only when Settings page mounts (not globally on app start like contracts)
- Only one page consumes profile data -- no need to add load latency to every session
- Fetch once on mount, no background re-fetching (single user, data static until user action)

### Default values
- New user with no Supabase row sees DEFAULT_COMPANY_PROFILE values pre-filled in fields (same as current behavior)
- Client-side merge: `{ ...DEFAULT_COMPANY_PROFILE, ...fetchedRow }` -- defaults fill gaps
- No Supabase row needed until user actually edits a field

### profileLoader scope
- Only rewrite useCompanyProfile hook to use Supabase
- Leave profileLoader.ts untouched -- analyzeContract.ts still uses it (localStorage) until Phase 43 when server reads profile directly from DB
- Minimal blast radius: only Settings page changes in this phase

### Error handling -- write failures
- Keep the edited value in UI (in-memory), show error toast via useToast
- Same spirit as current storageError pattern but using toast instead of inline banner
- No retry logic, no field revert -- user sees their edit but knows it didn't persist

### Error handling -- load failures
- Show DEFAULT_COMPANY_PROFILE values (same as new user) with error toast explaining data couldn't be loaded
- User can still edit fields -- writes may succeed even if initial read failed
- No blocking error state -- graceful degradation

### Claude's Discretion
- Exact camelToSnake implementation (utility function or inline mapping)
- Whether to co-locate the Supabase fetch in the hook or in a separate module
- Loading state handling on Settings mount (spinner vs skeleton vs instant defaults)
- Whether storageError state in useCompanyProfile should be replaced with toast-only or kept for backward compat

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database schema
- `supabase/migrations/00000000000000_initial_schema.sql` -- company_profiles table definition, column names, RLS policies
- `.planning/phases/39-database-schema-and-rls/39-CONTEXT.md` -- Schema decisions, column mapping, RLS approach

### Current implementation (modify)
- `src/hooks/useCompanyProfile.ts` -- Current hook using localStorage via profileLoader + storageManager (rewrite target)
- `src/pages/Settings.tsx` -- Settings page consuming useCompanyProfile (may need minor changes for async load state)
- `src/knowledge/types.ts` -- CompanyProfile interface and DEFAULT_COMPANY_PROFILE constant

### Current implementation (do NOT modify)
- `src/knowledge/profileLoader.ts` -- Shared loader used by analyzeContract.ts; leave on localStorage until Phase 43
- `src/storage/storageManager.ts` -- save/load functions; profile key stays until Phase 45 cleanup

### Prior phase patterns
- `src/lib/mappers.ts` -- Phase 41's mapRow (snake_case to camelCase); build inverse mapper here
- `src/lib/supabase.ts` -- Supabase client singleton
- `src/contexts/AuthContext.tsx` -- Auth context for session/user ID
- `.planning/phases/41-contract-reads-and-data-mapping/41-CONTEXT.md` -- Query patterns, mapper design, store integration approach

### Requirements
- `.planning/REQUIREMENTS.md` -- DATA-03 (company profile in Supabase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase` client singleton (`src/lib/supabase.ts`): Use for profile queries
- `mapRow()` (`src/lib/mappers.ts`): snake_case to camelCase -- build inverse for writes
- `useToast` hook: Error display for load/write failures
- `DEFAULT_COMPANY_PROFILE` constant: Client-side fallback for missing rows
- `useFieldValidation` hook: Already handles onBlur save pattern -- just needs new save callback

### Established Patterns
- Custom hooks own their state: useCompanyProfile follows same pattern as useContractStore
- onBlur persistence with save feedback ("Saved" animation) -- keep this UX
- Supabase queries use anon key with RLS (user scoping via auth.uid())

### Integration Points
- `useCompanyProfile()` called in Settings page only -- isolated change surface
- `saveField()` callback flows through useFieldValidation's onSave prop -- swap localStorage save for Supabase upsert
- storageError state currently drives inline amber warning banner -- replace with toast

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard Supabase upsert pattern with the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 42-company-profile-migration*
*Context gathered: 2026-03-17*
