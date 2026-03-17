# Technology Stack

**Project:** ClearContract v2.0 -- Supabase Auth + Postgres Integration
**Researched:** 2026-03-16

## Recommended Stack

### New Dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@supabase/supabase-js` | ^2.x | Auth + database client | Official Supabase JS client; handles auth, sessions, DB queries, RLS |

That is the only new dependency. No auth helpers library, no ORM, no additional packages.

### Existing Stack (Unchanged)

| Technology | Version | Purpose |
|------------|---------|---------|
| React 18 | ^18.x | UI framework |
| TypeScript | strict mode | Type safety |
| Vite | ^5.x | Build tooling |
| Tailwind CSS | ^3.x | Styling |
| Framer Motion | ^11.x | Animations |
| Zod | ^3.x | Schema validation |
| jsPDF | ^2.x | PDF report generation |
| Vitest + RTL | ^3.x | Testing |

### Infrastructure

| Technology | Purpose | Why |
|------------|---------|-----|
| Supabase (free tier) | Auth + Postgres database | Integrated auth + DB; RLS for security; free tier covers single-user app |
| Vercel Pro | Hosting + serverless functions | Already deployed here; 300s timeout for analysis pipeline |

### Supporting Libraries (NOT needed)

| Library | Why Not |
|---------|---------|
| `@supabase/auth-helpers-react` | Designed for SSR frameworks (Next.js). Plain SPA needs only `@supabase/supabase-js` |
| `@supabase/ssr` | For server-side rendering. This is a client-side SPA |
| Prisma / Drizzle ORM | Overkill for direct Supabase queries. The supabase-js client IS the query builder |
| `jose` / `jsonwebtoken` | JWT validation handled by `supabaseAdmin.auth.getUser(token)` on server |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Supabase Auth | Auth0 / Clerk | Already adding Supabase for DB; separate auth service adds complexity and cost |
| Database | Supabase Postgres | PlanetScale / Neon | Supabase bundles auth + DB + RLS; separate DB means separate auth integration |
| Client library | @supabase/supabase-js | REST API directly | Client handles auth state, token refresh, retries automatically |
| ORM | None (supabase-js) | Prisma | Prisma requires code generation step; supabase-js has built-in query builder |

## Installation

```bash
# Single new dependency
npm install @supabase/supabase-js
```

## Environment Variables

```bash
# Client-side (safe to expose, in .env.local)
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Server-side (secrets, in .env.local and Vercel project settings)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

## Sources

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction) -- HIGH confidence
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys) -- HIGH confidence
