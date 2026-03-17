# Phase 39: Database Schema and RLS - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Create Supabase Postgres tables (contracts, findings, contract_dates, company_profiles) with row-level security policies, configure environment variables in both local and Vercel, and set up Supabase CLI with migrations workflow. Auth configuration (email verification, signup settings) deferred to Phase 40.

</domain>

<decisions>
## Implementation Decisions

### Complex type storage
- legalMeta and scopeMeta stored as JSONB columns on findings table (not normalized into sub-tables)
- crossReferences, scoreBreakdown, passResults stored as JSONB arrays
- bidSignal stored as JSONB column on contracts table
- All JSONB fields are read-only analysis output -- never individually queried or updated (except resolved/note on findings)

### ID and key strategy
- All primary keys use Postgres gen_random_uuid() as default -- server generates all IDs
- Client never generates contract, finding, or date IDs
- Every table has user_id UUID NOT NULL REFERENCES auth.users(id) for RLS
- Child tables (findings, contract_dates) have their own user_id column for direct RLS checks without JOINs (denormalized for simpler, faster policies)

### Column mapping
- CompanyProfile: 20 individual TEXT columns (flat, not grouped JSONB)
- Contract status and type: TEXT columns with CHECK constraints (not Postgres ENUMs)
- ContractDate.date: TEXT column (AI extracts dates in varied formats like 'Q2 2026', 'TBD', '30 days after notice' -- not all are valid DATE values)
- ContractDate.type: TEXT with CHECK constraint for 'Start' | 'Milestone' | 'Deadline' | 'Expiry'
- Finding optional fields (clauseText, explanation, crossReferences, legalMeta, scopeMeta, sourcePass, downgradedFrom, isSynthesis): nullable columns matching TypeScript optionality

### RLS policies
- RLS enabled on all four tables
- Policy pattern: auth.uid() = user_id on all operations (SELECT, INSERT, UPDATE, DELETE)
- Findings allow direct client UPDATE on resolved and note columns for the owning user (no server function needed for resolve/annotate)
- Server uses service_role key to bypass RLS for analysis writes

### Supabase project setup
- Use Supabase CLI: supabase init, supabase migration new, supabase db push workflow
- Environment variables configured in both .env.local and Vercel project settings: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Auth configuration (disable email verification, disable signup) deferred to Phase 40

### Claude's Discretion
- Exact index strategy (which columns get indexed beyond PKs and FKs)
- Migration file naming and organization
- CHECK constraint exact syntax
- Whether to add created_at/updated_at timestamp columns
- Supabase CLI project linking workflow details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database requirements
- `.planning/REQUIREMENTS.md` -- DB-01 through DB-06 define the four tables, RLS, and env var requirements
- `.planning/ROADMAP.md` -- Phase 39 success criteria: tables exist, RLS verified, env vars configured, CASCADE delete works

### Type definitions (schema source of truth)
- `src/types/contract.ts` -- Contract, ContractDate, Finding (re-export), ViewState, BidSignal, LegalMeta, ScopeMeta interfaces
- `src/schemas/finding.ts` -- MergedFindingSchema (Zod): canonical Finding shape with all field types and optionality
- `src/knowledge/types.ts` -- CompanyProfile interface with 20 fields and DEFAULT_COMPANY_PROFILE values

### Existing storage patterns
- `src/storage/storageManager.ts` -- Current localStorage wrapper (StorageRegistry shows all stored keys)
- `src/hooks/useCompanyProfile.ts` -- Current company profile load/save pattern (will be replaced in Phase 42)

### Prior decisions
- `.planning/STATE.md` -- v2.0 architectural decisions: fresh start, @supabase/supabase-js v2 only, two-client pattern, server-owns-creation, normalized schema

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MergedFindingSchema` (src/schemas/finding.ts): Zod schema defines exact field types -- use as reference for column types in findings table
- `CompanyProfile` interface (src/knowledge/types.ts): 20 string fields with defaults -- maps directly to flat TEXT columns
- `Contract` interface (src/types/contract.ts): defines all contract fields including optional JSONB candidates (bidSignal, scoreBreakdown, passResults)

### Established Patterns
- Zod as single source of truth for Finding type -- Postgres schema should align with MergedFindingSchema fields
- StorageRegistry in storageManager.ts shows the complete data surface: contracts[], company-profile, hide-resolved (UI pref stays in localStorage)
- Finding has required `resolved: boolean` and `note: string` that are user-editable; all other fields are analysis output

### Integration Points
- `api/analyze.ts` (Vercel serverless): will need SUPABASE_SERVICE_ROLE_KEY env var to write analysis results (Phase 43)
- Client code will need SUPABASE_URL and SUPABASE_ANON_KEY for authenticated queries (Phase 41+)
- CASCADE delete on findings/contract_dates FKs enables clean contract deletion (Phase 44)

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- standard Supabase CLI + migration workflow with the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 39-database-schema-and-rls*
*Context gathered: 2026-03-16*
