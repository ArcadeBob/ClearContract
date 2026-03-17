# Domain Pitfalls

**Domain:** Supabase Auth + Postgres integration for React SPA
**Researched:** 2026-03-16
**Overall confidence:** HIGH

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Exposing service_role Key to the Client
**What goes wrong:** Putting `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` environment variable exposes it in browser bundles. Anyone can bypass RLS and access/modify all database data.
**Why it happens:** Developers confuse anon key (safe to expose) with service_role key (server-only secret).
**Consequences:** Full database compromise. All RLS policies are bypassed.
**Prevention:** Only use `VITE_` prefix for `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Service role key goes in Vercel env vars only (no VITE_ prefix).
**Detection:** Search codebase for `VITE_SUPABASE_SERVICE` -- should return zero results.

### Pitfall 2: Missing RLS Policies on Tables
**What goes wrong:** Creating tables without enabling RLS or adding policies. Supabase with anon key can access all rows by default when RLS is disabled.
**Why it happens:** Forgetting `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or creating tables via UI without toggling RLS on.
**Consequences:** Any authenticated user can read/modify any other user's data. Even with a single user now, this is a security hole.
**Prevention:** Enable RLS on every table immediately after creation. Test by querying from browser with anon key and verifying only owned data returns.
**Detection:** Check Supabase dashboard -- tables without RLS show a warning icon.

### Pitfall 3: Race Condition in Upload Flow (Client Placeholder + Server Write)
**What goes wrong:** If the client creates a placeholder contract in the DB with a client-generated ID, then the server tries to update that same row, timing issues can cause conflicts or the server to write to a non-existent row.
**Why it happens:** The current architecture has the client create a placeholder and the server return data to update it. Translating this directly to Supabase creates a distributed write problem.
**Consequences:** Lost analysis results, orphaned placeholder rows, confusing UI state.
**Prevention:** Let the server own the entire contract creation. Client shows a loading state without a DB row. After analysis, server returns the contract ID and client fetches it.
**Detection:** Check if `contracts` table has rows with status "Analyzing" that never get updated.

### Pitfall 4: Forgetting to Add Authorization Header to API Calls
**What goes wrong:** The `analyzeContract.ts` client function sends the PDF to `/api/analyze` without an `Authorization: Bearer <token>` header. Server rejects with 401.
**Why it happens:** The current API has no auth -- it is a simple POST. Easy to forget the header when adding auth.
**Consequences:** All analysis requests fail after auth is added to the server.
**Prevention:** Update `analyzeContract.ts` and any other API callers at the same time as adding auth to the server. Test the full upload flow end-to-end.
**Detection:** HTTP 401 responses in browser DevTools network tab.

## Moderate Pitfalls

### Pitfall 5: Async Hook Operations Breaking Optimistic Updates
**What goes wrong:** Making hook operations (deleteContract, toggleFindingResolved) async changes the calling contract. Callers that expect synchronous behavior may have stale closures or race conditions.
**Prevention:** Keep optimistic state updates synchronous (setState first), then fire-and-forget the Supabase call. Only add error handling/rollback if the Supabase call fails. Do not await the Supabase call in the UI event handler.

### Pitfall 6: CORS Issues with Supabase from Vercel Dev
**What goes wrong:** During local development with `vercel dev`, requests to Supabase may fail due to CORS or mixed content issues.
**Prevention:** Supabase client handles CORS automatically -- the supabase-js library makes direct API calls to the Supabase REST API, which has CORS enabled for all origins. The issue is more likely with the `/api/analyze` endpoint. Ensure `ALLOWED_ORIGIN` includes `http://localhost` for local dev.

### Pitfall 7: Company Profile Not Found on First Analysis
**What goes wrong:** Server reads company profile from DB for analysis, but user has never saved any profile fields. The query returns null/empty, and the analysis runs without company-specific intelligence (insurance gaps, bonding comparison).
**Prevention:** Handle null profile gracefully in the server -- the current pattern already passes `companyProfile` as optional to `composeSystemPrompt`. Ensure the server treats missing profile as "no profile" rather than erroring.

### Pitfall 8: UUID vs String ID Mismatch
**What goes wrong:** Existing code generates IDs like `c-${Date.now()}` and `f-${crypto.randomUUID()}`. After migration, IDs are Postgres UUIDs. Any code that parses or pattern-matches on ID format will break.
**Prevention:** Search codebase for `c-` and `f-` ID patterns. The URL router parses `/contracts/:id` -- ensure it handles UUID format. Existing tests may have hardcoded ID patterns.

### Pitfall 9: Token Expiry During Long Analysis
**What goes wrong:** The access_token sent to `/api/analyze` expires during the 60-300 second analysis. The server validates the token at the start but writes to DB at the end -- by which time the token may be expired.
**Prevention:** The server validates the token once at request start and extracts `user.id`. It uses the service_role client for DB writes, which does not depend on the user's token. So token expiry mid-analysis is not an issue for DB writes. But if `supabaseAdmin.auth.getUser(token)` fails because the token expired between the client sending it and the server receiving it, that is a problem. Supabase tokens default to 1 hour expiry, and the client auto-refreshes, so this is unlikely but possible for edge cases. The client should call `getSession()` immediately before the fetch to get a fresh token.

### Pitfall 10: Supabase Query Errors Silently Ignored
**What goes wrong:** Supabase client returns `{ data, error }` tuples. If you destructure only `data` and ignore `error`, failed queries appear to return empty results rather than surfacing errors.
**Prevention:** Always check the `error` field. Establish a pattern: either throw on error or handle gracefully. Do not ignore it.

## Minor Pitfalls

### Pitfall 11: Snake_case / CamelCase Mapping Drift
**What goes wrong:** Adding a new field to a table but forgetting to add it to the mapper function. The field is stored but never displayed.
**Prevention:** Keep mapper functions close to type definitions. Consider adding a test that verifies all Contract interface fields are present in the mapper.

### Pitfall 12: Supabase Free Tier Limits
**What goes wrong:** Hitting Supabase free tier limits (500MB database, 5GB bandwidth, 50K auth users).
**Prevention:** Single user app with text data -- unlikely to hit limits. But large analysis results (50+ findings per contract, many contracts) could accumulate. Monitor via Supabase dashboard.

### Pitfall 13: Vercel Serverless Cold Start + Supabase Connection
**What goes wrong:** Cold start creates a new Supabase client connection each time. This is fine for Supabase (it is HTTP-based, not a persistent connection pool), but something to be aware of.
**Prevention:** Create the Supabase admin client at module level (not inside the handler). Vercel keeps the module warm across invocations.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema setup | Missing RLS policies (#2) | Run RLS enable + policy SQL in same migration |
| Auth layer | Flash of login screen (#loading state) | AuthProvider loading state prevents render until session checked |
| Contract reads | Empty results if RLS misconfigured (#2) | Test from browser DevTools: `supabase.from('contracts').select('*')` |
| Company profile | Null on first read (#7) | Handle gracefully with defaults |
| Analysis pipeline | Missing auth header (#4), race condition (#3) | Server owns creation; client sends Bearer token |
| CRUD operations | Async behavior change (#5) | Keep setState synchronous, DB call fire-and-forget |
| Cleanup | Hardcoded ID patterns (#8) | Search for `c-` and `f-` patterns across codebase |

## Sources

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) -- HIGH confidence
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Supabase Auth in Serverless Functions](https://github.com/supabase/supabase/discussions/1067) -- MEDIUM confidence
- Project codebase analysis -- HIGH confidence
