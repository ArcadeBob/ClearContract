# Phase 39: Database Schema and RLS - Research

**Researched:** 2026-03-16
**Domain:** Supabase Postgres schema, Row-Level Security, CLI migrations
**Confidence:** HIGH

## Summary

Phase 39 creates four Postgres tables in Supabase (contracts, findings, contract_dates, company_profiles) with row-level security policies, CASCADE foreign keys, and environment variable configuration. The project currently has no `supabase/` directory, so setup starts from scratch with `supabase init`.

The decisions from CONTEXT.md are highly specific: JSONB for complex analysis output, flat TEXT columns for CompanyProfile, `gen_random_uuid()` PKs, denormalized `user_id` on child tables, TEXT with CHECK constraints instead of ENUMs, and `(select auth.uid()) = user_id` RLS pattern. All schema columns map directly from three TypeScript source files.

**Primary recommendation:** Write a single migration file containing all four tables, their indexes, RLS enablement, and policies. Use `supabase db push` to deploy to the remote Supabase project.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- legalMeta and scopeMeta stored as JSONB columns on findings table (not normalized into sub-tables)
- crossReferences, scoreBreakdown, passResults stored as JSONB arrays
- bidSignal stored as JSONB column on contracts table
- All JSONB fields are read-only analysis output -- never individually queried or updated (except resolved/note on findings)
- All primary keys use Postgres gen_random_uuid() as default -- server generates all IDs
- Client never generates contract, finding, or date IDs
- Every table has user_id UUID NOT NULL REFERENCES auth.users(id) for RLS
- Child tables (findings, contract_dates) have their own user_id column for direct RLS checks without JOINs
- CompanyProfile: 20 individual TEXT columns (flat, not grouped JSONB)
- Contract status and type: TEXT columns with CHECK constraints (not Postgres ENUMs)
- ContractDate.date: TEXT column (AI extracts dates in varied formats)
- ContractDate.type: TEXT with CHECK constraint for 'Start' | 'Milestone' | 'Deadline' | 'Expiry'
- Finding optional fields: nullable columns matching TypeScript optionality
- RLS enabled on all four tables
- Policy pattern: (select auth.uid()) = user_id on all operations (SELECT, INSERT, UPDATE, DELETE)
- Findings allow direct client UPDATE on resolved and note columns for the owning user
- Server uses service_role key to bypass RLS for analysis writes
- Use Supabase CLI: supabase init, supabase migration new, supabase db push workflow
- Environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local and Vercel

### Claude's Discretion
- Exact index strategy (which columns get indexed beyond PKs and FKs)
- Migration file naming and organization
- CHECK constraint exact syntax
- Whether to add created_at/updated_at timestamp columns
- Supabase CLI project linking workflow details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | Contracts table with RLS restricting access to owning user | Table schema derived from Contract interface; RLS policy pattern documented |
| DB-02 | Findings table with FK to contracts and individual row CRUD | Schema from MergedFindingSchema; CASCADE FK pattern; UPDATE policy for resolved/note |
| DB-03 | Contract dates table with FK to contracts | Schema from ContractDate interface; CASCADE FK |
| DB-04 | Company profiles table with single row per user (upsert) | Schema from CompanyProfile interface (20 TEXT columns); unique constraint on user_id |
| DB-05 | RLS enabled on all tables with user-scoped policies | Verified RLS syntax with (select auth.uid()) optimization |
| DB-06 | Environment variables configured | Three vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase CLI | latest | Migration management, project linking | Official tooling for schema management |
| PostgreSQL | 15 (Supabase default) | Database engine | Supabase runs Postgres 15 |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `supabase init` | Creates `supabase/` config directory | One-time project setup |
| `supabase link` | Connects local project to remote Supabase instance | After init, before push |
| `supabase migration new` | Creates timestamped migration SQL file | Each schema change |
| `supabase db push` | Deploys migrations to remote database | After writing migration SQL |

**Installation:**
```bash
# Supabase CLI (if not already installed)
npx supabase --version
# Or install globally: npm install -g supabase
```

No new npm dependencies needed for this phase. `@supabase/supabase-js` is a Phase 41 concern.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── config.toml           # Generated by supabase init
├── migrations/
│   └── 20260316000000_initial_schema.sql   # Single migration with all tables
└── seed.sql              # Optional (not needed for this phase)
```

### Pattern 1: Single Migration for Initial Schema
**What:** All four tables, constraints, indexes, RLS enablement, and policies in one migration file.
**When to use:** Greenfield setup where all tables are created together.
**Why:** Tables have foreign key dependencies (findings -> contracts, contract_dates -> contracts), so they must be created in order. A single file keeps the dependency chain clear.

### Pattern 2: RLS Policy Per Operation
**What:** Separate policies for SELECT, INSERT, UPDATE, DELETE instead of a single `FOR ALL` policy.
**When to use:** Always -- Supabase best practice.
**Why:** Granular control. The findings table needs INSERT/DELETE via service_role only, but UPDATE (resolved/note) via authenticated user. Separate policies make this explicit.

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
alter table contracts enable row level security;

create policy "Users can view own contracts"
  on contracts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own contracts"
  on contracts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own contracts"
  on contracts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own contracts"
  on contracts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### Pattern 3: CASCADE Foreign Keys
**What:** ON DELETE CASCADE on child table FKs so deleting a contract auto-deletes its findings and dates.
**Source:** https://supabase.com/docs/guides/database/postgres/cascade-deletes

```sql
create table findings (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  -- ...
);
```

### Pattern 4: Denormalized user_id on Child Tables
**What:** Both findings and contract_dates store their own `user_id` column, duplicating the parent contract's user_id.
**Why:** RLS policies on child tables can use `(select auth.uid()) = user_id` directly without JOIN to contracts table. This is a significant performance optimization documented in Supabase RLS best practices.
**Trade-off:** Slight denormalization, but the user_id never changes once set (analysis writes all rows atomically via service_role).

### Pattern 5: Company Profiles Upsert
**What:** company_profiles has a UNIQUE constraint on user_id, enabling upsert (INSERT ... ON CONFLICT).
**Why:** Each user has exactly one profile. The upsert pattern handles both creation and update in one operation.

```sql
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  -- 20 TEXT columns...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Anti-Patterns to Avoid
- **Using `FOR ALL` policies:** Prevents granular control per operation. Always use separate SELECT/INSERT/UPDATE/DELETE policies.
- **Using `auth.uid()` without wrapping in `(select ...)`:** Per Supabase docs, wrapping in a subselect caches the result per-statement (94-99% faster in benchmarks).
- **Using Postgres ENUMs:** User decided TEXT + CHECK constraints. ENUMs are harder to modify (require migration to add values) and don't compose well with Supabase tooling.
- **Omitting the `TO authenticated` clause:** Without it, policies also run for the `anon` role, adding unnecessary overhead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Client-side UUID libs | `gen_random_uuid()` as column default | Server-authoritative, no import needed |
| Row-level access control | Application-level auth checks | Postgres RLS policies | Database-enforced, can't be bypassed from client |
| Migration tracking | Manual SQL scripts | `supabase migration new` + `supabase db push` | Tracks applied migrations, prevents drift |
| Cascade deletion | Application-level delete loops | `ON DELETE CASCADE` FK constraint | Atomic, can't leave orphans |

## Common Pitfalls

### Pitfall 1: Forgetting RLS on New Tables
**What goes wrong:** Table is created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. All data is publicly accessible via anon key.
**Why it happens:** RLS is opt-in per table in Postgres.
**How to avoid:** Always pair `CREATE TABLE` with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same migration.
**Warning signs:** Querying with anon key returns data without authentication.

### Pitfall 2: Missing WITH CHECK on INSERT/UPDATE Policies
**What goes wrong:** Users can insert rows with a different user_id, or update rows to change ownership.
**Why it happens:** `USING` only controls which rows are visible; `WITH CHECK` controls what values can be written.
**How to avoid:** INSERT policies need `WITH CHECK`. UPDATE policies need both `USING` and `WITH CHECK`.
**Warning signs:** A user can set user_id to another user's UUID on insert.

### Pitfall 3: CHECK Constraint Syntax Errors
**What goes wrong:** Migration fails because CHECK constraint values don't match exactly.
**Why it happens:** String comparison is case-sensitive in Postgres.
**How to avoid:** Copy constraint values directly from TypeScript type definitions.
**Example:**
```sql
-- Must match TypeScript exactly: 'Prime Contract' | 'Subcontract' | 'Purchase Order' | 'Change Order'
CHECK (type IN ('Prime Contract', 'Subcontract', 'Purchase Order', 'Change Order'))
```

### Pitfall 4: JSONB Column Defaults
**What goes wrong:** Inserting a row without specifying a JSONB column results in NULL instead of an empty array/object.
**Why it happens:** No DEFAULT set on nullable JSONB columns.
**How to avoid:** For optional JSONB arrays (crossReferences, scoreBreakdown, passResults), leave them nullable (no default needed -- NULL means "not provided"). For required fields, set appropriate defaults.

### Pitfall 5: service_role Key Exposure
**What goes wrong:** SUPABASE_SERVICE_ROLE_KEY is exposed to the browser, bypassing all RLS.
**Why it happens:** Accidentally using service_role key in client-side code or committing it to .env.
**How to avoid:** service_role key goes ONLY in server-side env vars (Vercel environment variables, .env.local for `api/` functions). Never prefix with `VITE_`.

### Pitfall 6: supabase db push Without Linking
**What goes wrong:** `supabase db push` fails with "not linked" error.
**Why it happens:** Must run `supabase link` first to connect local project to remote.
**How to avoid:** Workflow is: `supabase init` -> `supabase link` -> `supabase migration new` -> write SQL -> `supabase db push`.

## Code Examples

### Complete contracts Table
```sql
-- Source: Derived from Contract interface in src/types/contract.ts
create table contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  client text not null default '',
  type text not null check (type in ('Prime Contract', 'Subcontract', 'Purchase Order', 'Change Order')),
  upload_date text not null,
  status text not null check (status in ('Analyzing', 'Reviewed', 'Draft')),
  risk_score integer not null default 0,
  score_breakdown jsonb,
  bid_signal jsonb,
  pass_results jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Complete findings Table
```sql
-- Source: Derived from MergedFindingSchema in src/schemas/finding.ts
create table findings (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  category text not null check (category in (
    'Legal Issues', 'Scope of Work', 'Contract Compliance', 'Labor Compliance',
    'Insurance Requirements', 'Important Dates', 'Financial Terms',
    'Technical Standards', 'Risk Assessment', 'Compound Risk'
  )),
  title text not null,
  description text not null,
  recommendation text not null,
  clause_reference text not null,
  negotiation_position text not null,
  action_priority text not null check (action_priority in ('pre-bid', 'pre-sign', 'monitor')),
  resolved boolean not null default false,
  note text not null default '',
  clause_text text,
  explanation text,
  cross_references jsonb,
  legal_meta jsonb,
  scope_meta jsonb,
  source_pass text,
  downgraded_from text,
  is_synthesis boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Complete contract_dates Table
```sql
-- Source: Derived from ContractDate interface in src/types/contract.ts
create table contract_dates (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  label text not null,
  date text not null,
  type text not null check (type in ('Start', 'Milestone', 'Deadline', 'Expiry')),
  created_at timestamptz not null default now()
);
```

### Complete company_profiles Table
```sql
-- Source: Derived from CompanyProfile interface in src/knowledge/types.ts
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  gl_per_occurrence text not null default '$1,000,000',
  gl_aggregate text not null default '$2,000,000',
  umbrella_limit text not null default '$1,000,000',
  auto_limit text not null default '$1,000,000',
  wc_statutory_state text not null default 'CA',
  wc_employer_liability text not null default '$1,000,000',
  bonding_single_project text not null default '$500,000',
  bonding_aggregate text not null default '$1,000,000',
  contractor_license_type text not null default 'C-17',
  contractor_license_number text not null default '',
  contractor_license_expiry text not null default '',
  dir_registration text not null default '',
  dir_expiry text not null default '',
  sbe_cert_id text not null default '',
  sbe_cert_issuer text not null default '',
  lausd_vendor_number text not null default '',
  employee_count text not null default '',
  service_area text not null default '',
  typical_project_size_min text not null default '',
  typical_project_size_max text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### RLS Template for All Four Tables
```sql
-- Template applied to each table: contracts, findings, contract_dates, company_profiles
alter table {table} enable row level security;

create policy "Users can view own {table}"
  on {table} for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own {table}"
  on {table} for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own {table}"
  on {table} for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own {table}"
  on {table} for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### Recommended Indexes
```sql
-- Beyond automatic PK/FK indexes, add these for query patterns:

-- Contracts: user lookup (most common query)
create index idx_contracts_user_id on contracts(user_id);

-- Findings: lookup by contract (review page loads all findings for a contract)
create index idx_findings_contract_id on findings(contract_id);
create index idx_findings_user_id on findings(user_id);

-- Contract dates: lookup by contract
create index idx_contract_dates_contract_id on contract_dates(contract_id);
create index idx_contract_dates_user_id on contract_dates(user_id);

-- Company profiles: unique constraint on user_id already creates an index
```

### Supabase CLI Workflow
```bash
# 1. Initialize Supabase in project (creates supabase/ directory)
npx supabase init

# 2. Login to Supabase (interactive, needs access token from dashboard)
npx supabase login

# 3. Link to remote project (needs project ref from Supabase dashboard URL)
npx supabase link --project-ref <project-ref>

# 4. Create migration file
npx supabase migration new initial_schema

# 5. Edit the generated file at supabase/migrations/<timestamp>_initial_schema.sql

# 6. Push to remote database
npx supabase db push
```

### Environment Variable Setup
```bash
# .env.local (for local development with vercel dev)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key-from-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-dashboard>

# Vercel project settings (for production)
# Add same three variables via: vercel env add SUPABASE_URL
# Or via Vercel dashboard: Settings > Environment Variables
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uuid_generate_v4()` (requires extension) | `gen_random_uuid()` (built-in) | Postgres 13+ | No extension needed |
| Postgres ENUM types | TEXT + CHECK constraints | Best practice | Easier to add values via migration |
| JOIN-based RLS on child tables | Denormalized user_id per table | Supabase RLS performance guide | 94-99% faster policy evaluation |
| `auth.uid()` direct call | `(select auth.uid())` wrapped | Supabase docs 2024 | Caches result per-statement |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (configured in project) |
| Config file | vitest.config.ts (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Contracts table exists with correct columns | manual-only | Verify via Supabase dashboard or `supabase db push` success | N/A |
| DB-02 | Findings table with FK to contracts | manual-only | Verify via `supabase db push` + dashboard | N/A |
| DB-03 | Contract dates table with FK to contracts | manual-only | Verify via `supabase db push` + dashboard | N/A |
| DB-04 | Company profiles with unique user_id | manual-only | Verify via `supabase db push` + dashboard | N/A |
| DB-05 | RLS policies restrict to owning user | manual-only | Test via Supabase SQL editor with different auth contexts | N/A |
| DB-06 | Env vars configured | manual-only | Verify `.env.local` exists with three keys; Vercel dashboard check | N/A |

**Justification for manual-only:** This phase creates database schema via SQL migrations pushed to a remote Supabase instance. There is no application code to unit test. Verification is done by confirming `supabase db push` succeeds without errors and by testing RLS behavior via the Supabase SQL editor or dashboard.

### Sampling Rate
- **Per task commit:** `supabase db push --dry-run` (if available) or review migration SQL
- **Per wave merge:** `supabase db push` to remote + manual RLS verification
- **Phase gate:** All tables visible in Supabase dashboard; RLS test query returns no unauthorized data

### Wave 0 Gaps
- [ ] `supabase/` directory -- created by `supabase init`
- [ ] Supabase project must exist (created via dashboard before this phase executes)
- [ ] `.env.local` needs three new Supabase variables

## Open Questions

1. **Supabase project creation**
   - What we know: STATE.md notes "Supabase project needs to be created before Phase 39 can execute"
   - What is unclear: Whether the user has already created the Supabase project
   - Recommendation: First task should be project setup (init, link) which will fail fast if no project exists

*action_priority values resolved: `'pre-bid'`, `'pre-sign'`, `'monitor'` (from `ActionPriorityEnum` in `src/schemas/analysis.ts`). CHECK constraint included in findings table schema above.*

## Sources

### Primary (HIGH confidence)
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy syntax, auth.uid() wrapping, TO clause
- [Supabase Cascade Deletes](https://supabase.com/docs/guides/database/postgres/cascade-deletes) - ON DELETE CASCADE FK syntax
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) - CLI workflow: init, link, migration new, db push
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - (select auth.uid()) optimization, index recommendations

### Secondary (MEDIUM confidence)
- [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started) - supabase init creates supabase/ directory

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Supabase CLI and Postgres are well-documented, stable tooling
- Architecture: HIGH - All schema decisions locked in CONTEXT.md; column mappings derived directly from TypeScript sources
- Pitfalls: HIGH - Common RLS pitfalls well-documented in official Supabase docs

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, Supabase Postgres/RLS patterns change infrequently)
