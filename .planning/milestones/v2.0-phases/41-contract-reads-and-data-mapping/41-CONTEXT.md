# Phase 41: Contract Reads and Data Mapping - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Load all contract data from Supabase on mount, replacing localStorage reads with database queries. Contracts, findings, and dates are fetched from Postgres and stitched together client-side. Type-safe mapper converts snake_case columns to camelCase TypeScript fields. Mutations remain in-memory only (Supabase writes come in Phase 44).

</domain>

<decisions>
## Implementation Decisions

### Query and nesting strategy
- Eager load all: three parallel queries on mount (contracts, findings, contract_dates)
- Stitch findings and dates onto contracts client-side by contract_id
- Fetch once on mount — no background re-fetching or window-focus refresh (single user, data is static until user action)
- Silently drop orphaned findings/dates whose contract_id doesn't match a loaded contract (CASCADE delete should prevent this, but defensive)

### Mapper design
- Generic utility function: one `mapRow<T>()` that converts all object keys from snake_case to camelCase
- JSONB fields (legalMeta, scopeMeta, bidSignal, scoreBreakdown, passResults, crossReferences) are already stored as camelCase in Postgres — they pass through the mapper unchanged
- Postgres null values converted to undefined to match TypeScript optional (?) fields
- Read-only mapper for this phase — camelToSnake() for writes deferred to Phase 42+
- Mapper lives in `src/lib/mappers.ts`

### Store integration
- Replace `loadContracts()` inside useContractStore with async Supabase fetch via useEffect
- Hook initializes with empty contracts array, then populates after fetch completes
- useContractStore exposes `isLoading` and `error` state alongside contracts
- Remove localStorage persistence: `persistAndSet()` becomes plain `setContracts()` updater (no more saveContracts calls)
- Mutation methods (addContract, updateContract, deleteContract, toggleFindingResolved, updateFindingNote) remain but operate in-memory only — no Supabase writes until Phase 44
- storageWarning and dismissStorageWarning can be removed (no more localStorage quota concerns)

### Loading UX
- Reuse existing LoadingScreen component (Gem icon + "ClearContract" + spinner on slate-50) while contracts are loading
- Pages check isLoading from useContractStore and render LoadingScreen if true
- On fetch failure: show error toast via existing useToast system, pages render their normal empty state
- User can refresh browser to retry on error

### Claude's Discretion
- Exact fetch function organization (inline in hook vs separate module)
- Whether to use Promise.all for parallel queries or sequential
- Error message wording for fetch failures
- Whether isLoading gates at AuthenticatedApp level or per-page level
- Import cleanup of removed localStorage dependencies

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data access requirements
- `.planning/REQUIREMENTS.md` — DATA-01 (type-safe mapper) and DATA-02 (contracts load from Supabase with nested findings/dates)
- `.planning/ROADMAP.md` — Phase 41 success criteria: Dashboard/All Contracts from Supabase, review page with nested data, zero runtime type errors

### Database schema (source of truth for column names)
- `supabase/migrations/00000000000000_initial_schema.sql` — All table definitions, column types, constraints, JSONB fields
- `src/types/contract.ts` — Contract, ContractDate, Finding (re-export), BidSignal interfaces (target camelCase shape)
- `src/schemas/finding.ts` — MergedFindingSchema (Zod): canonical Finding shape with all field types and optionality

### Existing code to modify
- `src/hooks/useContractStore.ts` — Current hook using loadContracts()/saveContracts() from localStorage — replace with Supabase fetch
- `src/storage/contractStorage.ts` — Current localStorage load/save (will be bypassed, not deleted until Phase 45)
- `src/lib/supabase.ts` — Supabase client singleton (already configured with anon key)

### Auth integration
- `src/contexts/AuthContext.tsx` — AuthProvider with session state; supabase client uses session for RLS
- `src/App.tsx` — AuthenticatedApp renders after auth; useContractStore is called here

### Prior phase decisions
- `.planning/phases/39-database-schema-and-rls/39-CONTEXT.md` — JSONB storage decisions, RLS policies, column mapping choices
- `.planning/phases/40-authentication/40-CONTEXT.md` — Auth context pattern, supabase client setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase` client singleton (`src/lib/supabase.ts`): Already configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — use directly for queries
- `LoadingScreen` component (`src/components/LoadingScreen.tsx`): Branded loading UI — reuse for data loading state
- `useToast` hook (`src/hooks/useToast.ts`): Toast notification system — use for fetch error display
- `classifyError` utility (`src/utils/errors.ts`): Error classification — potentially useful for Supabase errors

### Established Patterns
- Custom hooks own their state: useContractStore (contracts), useCompanyProfile (settings), useRouter (navigation) — follow this pattern for adding isLoading/error
- Zod as single source of truth for Finding type — mapper output should satisfy MergedFindingSchema
- Named exports only, no default exports
- Functional components with explicit Props interfaces

### Integration Points
- `useContractStore` is called in `AuthenticatedApp` inside `App.tsx` — this is where the fetch triggers
- Dashboard, AllContracts, ContractReview all consume contracts from the store — they need isLoading check added
- `contractStorage.ts` (loadContracts/saveContracts) will no longer be called but is NOT deleted (Phase 45 cleanup)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard Supabase query pattern with the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 41-contract-reads-and-data-mapping*
*Context gathered: 2026-03-17*
