# Project Research Summary

**Project:** ClearContract v2.0 — Supabase Auth + Postgres Integration
**Domain:** Authentication and database persistence migration for a React SPA
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

ClearContract v2.0 is a focused migration of an existing, working contract review application from in-memory/localStorage state to Supabase-backed authentication and Postgres persistence. This is not a greenfield build — the UI, AI pipeline, and domain types are all complete. The work is a data layer replacement: swap localStorage reads/writes for Supabase queries, add an auth gate, and move database writes for the analysis pipeline to the serverless function. The recommended approach uses a single new dependency (`@supabase/supabase-js`), a conventional `AuthProvider` context pattern, and an explicit `dbMapper.ts` for type-safe snake_case/camelCase translation at the boundary.

The research is unanimous on execution order: schema and RLS must come first because every other layer depends on the tables existing and being secure. Auth comes second because all data access requires a `user.id`. Contract reads validate the schema works before writing is attempted. The analysis pipeline server-side writes are the most complex change and should come last among the core features. All research sources are official Supabase documentation, giving HIGH confidence in the patterns.

The primary risk is security misconfiguration: exposing the `service_role` key to the client (bypasses all RLS) or failing to enable RLS on tables (exposes all data with the anon key). Both are easy mistakes with severe consequences. The secondary risk is the upload flow race condition if a client-side placeholder approach is naively transplanted from the current localStorage architecture. Research recommends a clean break: the server owns full contract creation and returns only a contract ID; the client fetches and navigates. This eliminates the race condition at the cost of a minor UX change (no immediate navigation to review page during analysis).

## Key Findings

### Recommended Stack

The migration requires exactly one new dependency: `@supabase/supabase-js` v2. No auth-helpers library (designed for SSR/Next.js), no ORM (supabase-js is the query builder), no separate JWT library (token validated via `supabaseAdmin.auth.getUser(token)`). Supabase was selected over alternatives (Auth0, PlanetScale, Neon) because it bundles auth + database + RLS in a single service that maps cleanly onto the existing single-user architecture. The free tier is sufficient for single-user text data volumes.

Infrastructure is already in place: Vercel handles hosting and serverless functions. The existing `ANTHROPIC_API_KEY` environment variable pattern extends to four new variables — two client-safe with `VITE_` prefix (URL and anon key), and two server-only secrets (URL and service_role key).

**Core technologies:**
- `@supabase/supabase-js` v2: Auth + database client — handles session persistence, token refresh, and RLS-enforced queries automatically
- Supabase free tier: Postgres + Auth backend — bundles everything needed; free tier covers single-user data volumes
- Vercel Pro (existing): Serverless function host — already deployed; no changes to hosting or build pipeline

### Expected Features

The feature scope is fully bounded by the existing application. All migration targets have direct equivalents in the current codebase; this is a persistence layer swap, not a feature expansion.

**Must have (table stakes):**
- Email/password login — gates access to the app; single form, Supabase handles auth logic
- Session persistence — stay logged in across browser sessions; Supabase handles automatically
- Protected app shell — unauthenticated users see login only; conditional render in App.tsx
- Contracts in Postgres — replaces localStorage; schema + RLS + mapper + hook rewrite
- Findings in Postgres — individual CRUD on findings; separate table with foreign key to contracts
- Contract dates in Postgres — date/milestone persistence; simple table, read-only after analysis
- Company profile in Postgres — settings persist across devices; single row per user, upsert pattern
- Server-side auth validation — API endpoint rejects unauthenticated requests; JWT extraction + getUser() check
- Server-side DB writes — analysis results written by server; replaces JSON response with DB inserts
- Sign out — clears session; single button addition to Sidebar

**Should have (differentiators):**
- Optimistic updates — UI responds instantly to user actions; update state first, sync to DB async
- Error recovery on DB failure — revert state if Supabase write fails; same structuredClone rollback pattern already used in re-analyze
- Auth error messages — clear feedback for wrong password; Supabase returns typed errors

**Defer (v2+):**
- User registration UI — single user, pre-create account in Supabase dashboard
- Password reset flow — single user, reset manually via Supabase dashboard
- Real-time subscriptions — single user, no concurrent editors; optimistic updates are sufficient
- localStorage data migration — PROJECT.md specifies a fresh start; no migration code needed
- OAuth / social login — not needed for a single-user deployment

### Architecture Approach

The architecture follows a two-client pattern: the React SPA uses the anon key for auth operations and RLS-enforced database reads, while the Vercel serverless function uses the service_role key for trusted database writes after validating the user's JWT. A new `AuthProvider` context wraps the entire application above `App.tsx` and exposes `user`, `session`, `loading`, `signIn`, and `signOut`. App.tsx conditionally renders the login page or the authenticated app shell based on auth state. A new `dbMapper.ts` module provides explicit, type-safe mapping functions between Postgres snake_case rows and TypeScript camelCase domain types — no generic conversion library.

The database schema normalizes findings and contract_dates into separate tables rather than JSONB arrays on contracts, because findings have individual CRUD operations (resolve, update note). Read-only complex structures (score_breakdown, bid_signal, legal_meta, scope_meta) use JSONB. The upload flow changes meaningfully: the server now owns the full contract creation and returns only a UUID; the client calls `refreshContract(contractId)` and navigates after receiving it.

**Major components:**
1. `src/lib/supabase.ts` — singleton Supabase client (anon key); imported wherever DB or auth access is needed
2. `src/contexts/AuthContext.tsx` (AuthProvider + useAuth) — session state, auth methods, loading gate; wraps entire app above ToastProvider
3. `src/pages/Login.tsx` — email/password sign-in form; rendered when user is null
4. `api/supabaseAdmin.ts` — server-side Supabase client (service_role key); used only in Vercel functions
5. `src/lib/dbMapper.ts` — explicit snake_case/camelCase mapping at the data boundary; bidirectional functions for all 4 tables
6. `src/hooks/useContractStore.ts` (modified) — replace localStorage sync with Supabase queries; optimistic mutations pattern
7. `api/analyze.ts` (modified) — add JWT validation gate, read company profile from DB, write analysis results to all three tables in parallel

**Files to remove:** `src/storage/contractStorage.ts`, `src/data/mockContracts.ts`
**Files to simplify:** `src/storage/storageManager.ts` (keep only for `hide-resolved` UI preference)

### Critical Pitfalls

1. **Exposing service_role key to client** — Use `VITE_` prefix only for `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Service role key in Vercel env vars only (no `VITE_` prefix). Audit: search for `VITE_SUPABASE_SERVICE` must return zero results.

2. **Missing RLS on tables** — Run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and add policies in the same migration as table creation. Test from browser DevTools with anon key to verify only owned data returns. Supabase dashboard shows a warning icon on unprotected tables.

3. **Upload flow race condition** — Server owns full contract creation; client does not create a placeholder row. Server returns only the contract ID after analysis; client calls `refreshContract(contractId)` and navigates. No DB row exists during the analysis window — local component state tracks the loading indicator instead.

4. **Missing Authorization header on API calls** — Update `analyzeContract.ts` to call `supabase.auth.getSession()` immediately before the fetch and include `Authorization: Bearer <access_token>`. Update client and server simultaneously; test full upload flow end-to-end before shipping.

5. **Silently ignoring Supabase error tuples** — Every Supabase query returns `{ data, error }`. Always destructure and check `error`. Silent empty results from failed queries are the most common source of hard-to-debug issues in Supabase integrations.

## Implications for Roadmap

Research is unambiguous about execution order due to hard dependencies. Each phase unblocks the next.

### Phase 1: Supabase Project Setup + Schema + RLS

**Rationale:** Every subsequent phase depends on tables existing with correct RLS. This has no code dependencies and can be done entirely in the Supabase dashboard and SQL editor. It is the highest-security-risk phase — getting RLS wrong here affects everything built on top of it.
**Delivers:** Working Supabase project; all 4 tables created with correct types, constraints, indexes, and RLS policies; 4 environment variables documented and configured in Vercel
**Addresses:** Foundation for contracts, findings, contract_dates, company_profiles persistence
**Avoids:** Pitfall 2 (missing RLS) — run RLS enable + policy SQL in same migration as table creation

### Phase 2: Auth Layer

**Rationale:** All data access requires a user ID from an authenticated session. Auth must exist before any Supabase query can be written. The AuthProvider pattern is well-established and low-risk; this phase is fast and mechanical.
**Delivers:** `src/lib/supabase.ts`, `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`; App.tsx modified for conditional render; session persistence working; sign-out button in Sidebar
**Addresses:** Email/password login, session persistence, protected app shell, sign out, auth error messages
**Avoids:** Pitfall 3 (loading state flash) — AuthProvider `loading` boolean prevents render until session is confirmed

### Phase 3: Contract Reads + dbMapper

**Rationale:** Reading from the DB before writing validates that schema, RLS, and client setup are correct. The dbMapper is required for every subsequent data operation; building it here forces a complete type audit before any write logic is introduced.
**Delivers:** `src/lib/dbMapper.ts` with full mapping functions; `useContractStore` modified to load from Supabase on mount; contracts list renders from DB
**Addresses:** Contracts in Postgres (read path); findings and dates nested in single query; data type safety across the DB boundary
**Avoids:** Pitfall 11 (mapping drift) — build mapper against full schema before writing any mutations

### Phase 4: Company Profile Migration

**Rationale:** Company profile uses a simpler upsert pattern than contract CRUD and validates the full read/write cycle before tackling the complex analysis pipeline. Single table, no cascade dependencies, no server-side writes.
**Delivers:** `useCompanyProfile` reading/writing to `company_profiles` table; Settings page data persists across devices; graceful null handling for new users
**Addresses:** Company profile in Postgres; validates upsert pattern for subsequent work
**Avoids:** Pitfall 7 (null profile on first analysis) — handle missing profile gracefully with defaults, since server reads profile from DB during analysis

### Phase 5: Analysis Pipeline Server Writes

**Rationale:** The most complex change — requires JWT validation, server-side company profile read, parallel DB inserts across three tables, and a new client-side response handling pattern. All prior phases must be complete and verified.
**Delivers:** `api/supabaseAdmin.ts`; `api/analyze.ts` modified for JWT gate, DB writes, and company profile DB read; `analyzeContract.ts` sends Bearer token; upload flow uses `refreshContract` after analysis
**Addresses:** Server-side auth validation, server-side DB writes, analysis pipeline end-to-end
**Avoids:** Pitfall 3 (race condition) — server owns full contract creation; Pitfall 4 (missing auth header) — client and server updated together and tested end-to-end

### Phase 6: Remaining CRUD Operations

**Rationale:** Delete, resolve finding, update note, rename contract, and re-analyze are all straightforward optimistic-update patterns once the data layer is established. Grouping them after the analysis pipeline ensures the full data lifecycle is working before adding mutation complexity.
**Delivers:** All mutation operations wired to Supabase with optimistic updates; deleteContract CASCADE working; re-analyze flow using server-write pattern; rollback on DB failure
**Addresses:** Optimistic updates, error recovery, individual finding CRUD, contract deletion
**Avoids:** Pitfall 5 (async behavior change) — setState synchronous, Supabase call fire-and-forget

### Phase 7: Cleanup + Validation

**Rationale:** Remove localStorage artifacts only after all Supabase paths are verified working. This phase eliminates technical debt and surfaces any remaining hardcoded ID patterns before they become future bugs.
**Delivers:** `src/storage/contractStorage.ts` deleted; `src/data/mockContracts.ts` deleted; `storageManager.ts` simplified to single key; all `c-${...}` and `f-${...}` ID patterns removed from codebase
**Addresses:** Dead code removal, mock data removal, ID format consistency
**Avoids:** Pitfall 8 (UUID vs string ID mismatch) — audit `c-` and `f-` patterns across codebase before deletion

### Phase Ordering Rationale

- Schema before code: Every hook and function references specific table and column names. Creating tables first eliminates "table does not exist" bugs during development.
- Auth before queries: Supabase RLS requires an authenticated session to return any data. Writing queries before auth works produces empty results that look like schema bugs.
- Reads before writes: Validates the full stack (client → Supabase → RLS → mapper → state) before adding mutation complexity.
- Simple writes before complex writes: Company profile (single-table upsert) before analysis pipeline (multi-table insert with JWT validation) follows a natural complexity escalation.
- CRUD after pipeline: User-initiated mutations are straightforward once the data layer is proven working.
- Cleanup last: Removing localStorage before Supabase is verified creates a window where the app has no persistence at all.

### Research Flags

Phases with standard, well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1 (Schema):** SQL provided in ARCHITECTURE.md is ready to execute; Supabase table creation and RLS are thoroughly documented
- **Phase 2 (Auth):** AuthProvider pattern is the exact Supabase React quickstart; full implementation code in ARCHITECTURE.md
- **Phase 3 (Reads + Mapper):** Standard TypeScript boundary pattern; mapper stubs in ARCHITECTURE.md
- **Phase 4 (Profile):** Upsert pattern is well-documented; simpler than any other phase
- **Phase 6 (CRUD):** Optimistic update pattern already exists in the codebase for re-analyze rollback
- **Phase 7 (Cleanup):** No research needed — grep and delete

Phases that may benefit from closer review during planning:
- **Phase 5 (Analysis Pipeline):** Most complex change; involves rewriting the upload flow UX and coordinating three parallel DB inserts. No new patterns required, but integration complexity is high. Review the exact server response contract and client handling before starting.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Single dependency decision backed by official Supabase docs; no ambiguity |
| Features | HIGH | Migration targets map 1:1 to existing app features; scope bounded by PROJECT.md |
| Architecture | HIGH | Exact patterns from Supabase React quickstart and official API key docs; code samples in ARCHITECTURE.md are implementation-ready |
| Pitfalls | HIGH | Derived from official docs + direct codebase analysis; not speculative |

**Overall confidence:** HIGH

### Gaps to Address

- **Upload UX change:** The server-owns-creation pattern eliminates the current "navigate immediately to review page with Analyzing placeholder" behavior. The UX will show a loading state on the upload page until analysis completes. If the current UX is strongly preferred, the alternative (client creates placeholder UUID via Supabase insert, passes to server, server updates it) is viable but adds coordination complexity. This decision should be confirmed before Phase 5 begins.

- **Re-analyze flow:** The re-analyze flow (snapshot + rollback on failure + finding preservation via composite keys) is more complex than a simple delete/re-insert when findings have Postgres UUIDs. The exact strategy for preserving finding IDs across re-analysis should be designed explicitly in Phase 6 planning.

- **Test suite impact:** The existing test suite (269 tests) mocks localStorage. Many tests will need Supabase mocking or will break after migration. The scope of test updates per phase is not yet estimated and should be factored into phase sizing.

- **Token expiry edge case:** Access tokens default to 1-hour expiry. For analyses running close to the Vercel Pro 5-minute timeout, an edge-case token expiry is theoretically possible. The client should call `getSession()` immediately before the analysis fetch to get a fresh token. Post-validation writes use the service_role client and are unaffected by user token expiry.

## Sources

### Primary (HIGH confidence)
- [Supabase JavaScript Client Reference](https://supabase.com/docs/reference/javascript/introduction) — client API, auth methods, query builder
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) — anon vs service_role key usage and security model
- [Supabase Auth React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) — AuthProvider pattern, session management
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, subquery patterns for derived ownership
- [Supabase Joins and Nesting](https://supabase.com/docs/guides/database/joins-and-nesting) — `select('*, findings(*)')` nested relation pattern
- [Supabase Auth Helpers SessionContext](https://github.com/supabase/auth-helpers/blob/main/packages/react/src/components/SessionContext.tsx) — reference implementation for AuthProvider
- Project codebase analysis (CLAUDE.md, existing hooks, types) — current patterns and migration constraints

### Secondary (MEDIUM confidence)
- [Supabase Auth in Serverless Functions Discussion](https://github.com/supabase/supabase/discussions/1067) — JWT validation pattern in Vercel functions
- [Vercel + Supabase Auth Pattern](https://skdev.substack.com/p/how-to-setup-auth-with-vercel-serverless) — serverless auth integration approach

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
