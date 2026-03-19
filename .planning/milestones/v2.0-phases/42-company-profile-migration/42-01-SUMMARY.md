---
phase: 42-company-profile-migration
plan: 01
subsystem: database
tags: [supabase, react-hooks, mappers, company-profile, upsert]

# Dependency graph
requires:
  - phase: 40-supabase-auth
    provides: AuthContext with session.user.id, supabase client singleton
  - phase: 41-contract-reads
    provides: mapRow/mapRows in src/lib/mappers.ts, Supabase query patterns
provides:
  - mapToSnake inverse mapper for camelCase-to-snake_case write payloads
  - Supabase-backed useCompanyProfile hook (fetch on mount, upsert on blur)
  - Settings page consuming async hook with toast error handling
affects: [43-server-writes, company-profile, settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget upsert with toast error, mapToSnake for write payloads, meta column exclusion from upsert]

key-files:
  created:
    - src/lib/__tests__/mappers.test.ts
    - src/hooks/__tests__/useCompanyProfile.test.ts
  modified:
    - src/lib/mappers.ts
    - src/hooks/useCompanyProfile.ts
    - src/pages/Settings.tsx

key-decisions:
  - "Fire-and-forget upsert pattern: saveField updates UI state immediately, Supabase write runs async with toast on failure"
  - "No loading spinner for Settings: defaults render instantly, real data merges on fetch completion (sub-100ms UX)"
  - "Meta column exclusion: delete payload.id/created_at/updated_at before upsert to avoid overwriting Postgres-managed columns"

patterns-established:
  - "mapToSnake for all camelCase-to-snake_case write payloads to Supabase"
  - "useEffect fetch + fire-and-forget upsert pattern for simple CRUD hooks"
  - "Toast notifications for async errors instead of inline error banners"

requirements-completed: [DATA-03]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 42 Plan 01: Company Profile Migration Summary

**Supabase-backed company profile with mapToSnake mapper, fetch-on-mount/upsert-on-blur hook, and toast error handling replacing localStorage persistence**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T15:53:30Z
- **Completed:** 2026-03-18T15:58:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added camelToSnake + mapToSnake inverse mapper to src/lib/mappers.ts for write payloads
- Rewrote useCompanyProfile to fetch from Supabase company_profiles on mount and upsert on each saveField call
- Updated Settings page: removed storageError banner, consuming new async hook API with isLoading
- 17 new tests (10 mapper, 7 hook) all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mapToSnake to mappers and rewrite useCompanyProfile for Supabase**
   - `e00a60d` (test: failing tests for mapToSnake and useCompanyProfile - TDD RED)
   - `0a047a7` (feat: mapToSnake mapper + Supabase hook rewrite - TDD GREEN)
2. **Task 2: Update Settings page for async hook API** - `5f1bc1e` (feat)

## Files Created/Modified
- `src/lib/mappers.ts` - Added camelToSnake helper and mapToSnake export for write payloads
- `src/lib/__tests__/mappers.test.ts` - 10 tests covering mapRow, mapRows, and mapToSnake
- `src/hooks/useCompanyProfile.ts` - Full rewrite: Supabase fetch/upsert replacing localStorage
- `src/hooks/__tests__/useCompanyProfile.test.ts` - 7 tests covering mount fetch, defaults, errors, upsert, meta exclusion
- `src/pages/Settings.tsx` - Updated destructuring, removed storageError amber banner

## Decisions Made
- Fire-and-forget upsert: UI updates immediately, Supabase write is async with toast on failure
- No loading spinner for Settings page: defaults render instantly, real data merges seamlessly
- Meta column exclusion (id, created_at, updated_at) from upsert payload per RESEARCH.md Pitfall 2

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures in useContractStore.test.ts (11 tests) and App.test.tsx (1 test) -- confirmed these fail on the pre-change codebase as well. Not related to this plan's changes. Logged as out-of-scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- mapToSnake mapper available for all future Supabase write operations
- useCompanyProfile pattern established for other hooks needing Supabase CRUD
- Ready for Phase 43 (server writes) which will add service_role key usage

---
*Phase: 42-company-profile-migration*
*Completed: 2026-03-18*
