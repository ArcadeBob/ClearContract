# Feature Landscape

**Domain:** Supabase Auth + Postgres database integration for contract review SPA
**Researched:** 2026-03-16

## Table Stakes

Features required for the migration to be complete and usable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password login | Gate access to the app | Low | Single form, Supabase handles auth logic |
| Session persistence | Stay logged in across browser sessions | Low | Supabase handles automatically via localStorage |
| Protected app shell | Unauthenticated users see login only | Low | Conditional render in App.tsx |
| Contracts in Postgres | Replace localStorage persistence | Medium | Schema + RLS + mapper + hook rewrite |
| Findings in Postgres | Individual CRUD on findings | Medium | Separate table, foreign key to contracts |
| Contract dates in Postgres | Date/milestone persistence | Low | Simple table, read-only after analysis |
| Company profile in Postgres | Settings persist across devices | Low | Single row per user, upsert pattern |
| Server-side auth validation | API endpoint rejects unauthenticated requests | Low | JWT extraction + getUser() check |
| Server-side DB writes | Analysis results written by server | Medium | Replace JSON response with DB inserts |
| Sign out | Clear session and show login | Low | Single button, supabase.auth.signOut() |
| Loading state | Prevent flash of login while checking session | Low | loading boolean in AuthProvider |

## Differentiators

Features not strictly required but improve the experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Optimistic updates | UI responds instantly to user actions | Medium | Update state first, sync to DB async |
| Error recovery on DB failure | Revert state if Supabase write fails | Medium | Same structuredClone pattern used for re-analyze |
| Auth error messages | Clear feedback for wrong password, etc. | Low | Supabase returns typed errors |
| Sign out button in sidebar | Easy access to log out | Low | One button addition to Sidebar |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User registration UI | Single user, create account in Supabase dashboard | Pre-create the user manually |
| Password reset flow | Single user, can reset via Supabase dashboard | Manual reset if needed |
| Multi-user / team features | Out of scope per PROJECT.md | Schema supports it (user_id FK) but no UI |
| Real-time subscriptions | Single user, no concurrent editors | Optimistic updates sufficient |
| localStorage migration | PROJECT.md says "fresh start" | Clean break, no migration code |
| Email verification | Single user, trusted email | Disable email confirmation in Supabase settings |
| OAuth / social login | Not needed for single user | Email/password only |
| Session timeout UI | Supabase auto-refreshes tokens | No manual session management needed |

## Feature Dependencies

```
AuthProvider -> LoginPage (needs signIn from context)
AuthProvider -> useContractStore (needs user.id for queries)
AuthProvider -> useCompanyProfile (needs user.id for queries)
AuthProvider -> analyzeContract (needs session.access_token)

Database schema -> useContractStore migration (needs tables to exist)
Database schema -> api/analyze.ts changes (needs tables for writes)

dbMapper -> useContractStore (needs snake_case mapping)
dbMapper -> api/analyze.ts (needs reverse mapping for inserts)

supabaseAdmin -> api/analyze.ts (needs server client for writes)
```

## MVP Recommendation

Build in this exact order (dependency-driven):

1. Supabase project + schema + RLS (everything depends on this)
2. AuthProvider + LoginPage (all data access depends on auth)
3. Contract reads from Supabase (validate schema works)
4. Company profile reads/writes (simpler than contracts, validates upsert pattern)
5. Analysis pipeline server writes (most complex change)
6. Remaining CRUD operations (delete, resolve, note, rename)
7. Cleanup (remove localStorage code)

Defer: User registration UI, password reset, real-time, migration from localStorage.

## Sources

- [Supabase Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) -- HIGH confidence
- Project context from PROJECT.md and existing codebase -- HIGH confidence
