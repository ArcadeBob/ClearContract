# Phase 41: Contract Reads and Data Mapping - Research

**Researched:** 2026-03-17
**Domain:** Supabase client queries, snake_case/camelCase mapping, React state hydration
**Confidence:** HIGH

## Summary

This phase replaces localStorage contract loading with Supabase database queries. The work is straightforward: three parallel `select()` calls via the existing `@supabase/supabase-js` v2 client, a generic snake_case-to-camelCase mapper, and client-side stitching of findings/dates onto contracts. The Supabase client is already configured with the anon key and RLS handles user scoping automatically via the authenticated session.

The main complexity lies in the mapper: most columns are simple snake_case-to-camelCase conversions, but six JSONB columns (`score_breakdown`, `bid_signal`, `pass_results`, `cross_references`, `legal_meta`, `scope_meta`) are already stored as camelCase objects in Postgres and must pass through unchanged. Postgres `null` values must become `undefined` to match TypeScript optional fields.

**Primary recommendation:** Build a generic `snakeToCamelRow<T>()` mapper in `src/lib/mappers.ts`, fetch all three tables in parallel with `Promise.all`, stitch findings and dates onto contracts by `contract_id`, and expose `isLoading`/`error` from `useContractStore`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Eager load all: three parallel queries on mount (contracts, findings, contract_dates)
- Stitch findings and dates onto contracts client-side by contract_id
- Fetch once on mount -- no background re-fetching or window-focus refresh
- Silently drop orphaned findings/dates whose contract_id doesn't match a loaded contract
- Generic utility function: one `mapRow<T>()` that converts all object keys from snake_case to camelCase
- JSONB fields (legalMeta, scopeMeta, bidSignal, scoreBreakdown, passResults, crossReferences) pass through unchanged
- Postgres null values converted to undefined to match TypeScript optional fields
- Read-only mapper (camelToSnake deferred to Phase 42+)
- Mapper lives in `src/lib/mappers.ts`
- Replace `loadContracts()` inside useContractStore with async Supabase fetch via useEffect
- Hook initializes with empty contracts array, then populates after fetch
- useContractStore exposes `isLoading` and `error` state alongside contracts
- Remove localStorage persistence: `persistAndSet()` becomes plain `setContracts()` updater
- Mutation methods remain but operate in-memory only
- storageWarning and dismissStorageWarning can be removed
- Reuse existing LoadingScreen component while contracts are loading
- Pages check isLoading from useContractStore and render LoadingScreen if true
- On fetch failure: show error toast via existing useToast system, pages render normal empty state
- User can refresh browser to retry on error

### Claude's Discretion
- Exact fetch function organization (inline in hook vs separate module)
- Whether to use Promise.all for parallel queries or sequential
- Error message wording for fetch failures
- Whether isLoading gates at AuthenticatedApp level or per-page level
- Import cleanup of removed localStorage dependencies

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Type-safe mapper between Postgres snake_case and TypeScript camelCase | Generic `snakeToCamelRow<T>()` in `src/lib/mappers.ts` -- see Mapper Design section for exact column mapping and JSONB passthrough rules |
| DATA-02 | Contracts load from Supabase on app mount (with nested findings and dates) | Three parallel `supabase.from().select()` calls, client-side stitching by contract_id -- see Architecture Patterns section |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.2 | Database queries via PostgREST | Already installed, provides typed `.from().select()` API with RLS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React (useState, useEffect) | 18 | State management for loading/error/contracts | Hook-based pattern already established |
| zod | existing | Finding schema validation (optional runtime check) | If paranoid about data shape from DB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Three separate queries | Supabase `.select('*, findings(*), contract_dates(*)')` joined query | Joined query returns nested data but the Supabase JS client types are harder to work with for nested relations; three simple queries are clearer and the context decision is explicit |
| Generic mapper | Per-table mapper functions | Generic is cleaner, per-table would be more explicit but repetitive |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── supabase.ts          # Existing client singleton (unchanged)
│   └── mappers.ts            # NEW: snakeToCamelRow<T>(), snakeToCamel()
├── hooks/
│   └── useContractStore.ts   # MODIFIED: async Supabase fetch replaces localStorage
├── components/
│   └── LoadingScreen.tsx     # Existing (reused for data loading)
└── storage/
    └── contractStorage.ts    # BYPASSED (not deleted until Phase 45)
```

### Pattern 1: Generic Snake-to-Camel Mapper
**What:** A single utility that converts all keys of a flat object from `snake_case` to `camelCase`, skipping JSONB values that are already camelCase objects.
**When to use:** Every Supabase row before it enters React state.

```typescript
// src/lib/mappers.ts

/** Convert a single snake_case string to camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert all keys of a row from snake_case to camelCase.
 *  Postgres null -> undefined for TypeScript optional fields.
 *  JSONB objects pass through unchanged (already camelCase). */
export function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] = value === null ? undefined : value;
  }
  return result as T;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => mapRow<T>(row));
}
```

### Pattern 2: Parallel Fetch with Client-Side Stitching
**What:** Three concurrent Supabase queries joined in JS.
**When to use:** On app mount inside useContractStore.

```typescript
// Fetch pattern (inside useContractStore or a helper)
async function fetchContracts(supabase: SupabaseClient): Promise<Contract[]> {
  const [contractsRes, findingsRes, datesRes] = await Promise.all([
    supabase.from('contracts').select('*'),
    supabase.from('findings').select('*'),
    supabase.from('contract_dates').select('*'),
  ]);

  if (contractsRes.error) throw contractsRes.error;
  if (findingsRes.error) throw findingsRes.error;
  if (datesRes.error) throw datesRes.error;

  const contracts = mapRows<Contract>(contractsRes.data);

  // Build lookup maps
  const findingsByContract = new Map<string, Finding[]>();
  for (const row of findingsRes.data) {
    const finding = mapRow<Finding & { contractId: string }>(row);
    const list = findingsByContract.get(finding.contractId) || [];
    list.push(finding);
    findingsByContract.set(finding.contractId, list);
  }

  const datesByContract = new Map<string, ContractDate[]>();
  for (const row of datesRes.data) {
    const d = mapRow<ContractDate & { contractId: string }>(row);
    const list = datesByContract.get(d.contractId) || [];
    list.push(d);
    datesByContract.set(d.contractId, list);
  }

  // Stitch
  return contracts.map((c) => ({
    ...c,
    findings: findingsByContract.get(c.id) || [],
    dates: datesByContract.get(c.id) || [],
  }));
}
```

### Pattern 3: Async Hook with Loading/Error State
**What:** Replace synchronous `useState(() => loadContracts())` with async fetch in useEffect.
**When to use:** The refactored useContractStore.

```typescript
export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchContracts(supabase)
      .then((data) => {
        if (!cancelled) {
          setContracts(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load contracts');
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // ... mutation methods now use plain setContracts (no persistAndSet)
}
```

### Anti-Patterns to Avoid
- **Using Supabase `.select('*, findings(*)')` joined syntax:** While Supabase supports embedded relations, the context decision is three separate queries. Joined queries also make the mapper more complex due to nested arrays in the response.
- **Forgetting the cleanup flag in useEffect:** Without `cancelled`, race conditions can occur if the component unmounts during fetch (e.g., sign-out during load).
- **Mapping JSONB fields recursively:** The JSONB columns (`score_breakdown`, `bid_signal`, `pass_results`, `cross_references`, `legal_meta`, `scope_meta`) are stored as camelCase JSON in Postgres. The mapper should only convert top-level keys, not recurse into nested objects.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| snake_case to camelCase | Per-field manual mapping | Generic key mapper function | 30+ columns across 3 tables; manual mapping is error-prone and tedious |
| Error handling for Supabase | Custom HTTP error parsing | Supabase client `.error` property | Already structured with `message`, `code`, `details` |
| Loading state management | Custom loading context | `isLoading` boolean in existing hook | Simple flag; no need for a separate context or library |

## Common Pitfalls

### Pitfall 1: JSONB Fields Getting Double-Mapped
**What goes wrong:** If the mapper recurses into JSONB values, it would try to convert already-camelCase keys and corrupt nested objects.
**Why it happens:** A naive deep mapper processes all nested objects.
**How to avoid:** The mapper only processes top-level keys. Object/array values pass through as-is. This works because JSONB is stored as camelCase already (per Phase 39 decision).
**Warning signs:** `clauseType` becoming `clausetype`, nested arrays losing structure.

### Pitfall 2: Null vs Undefined Mismatch
**What goes wrong:** TypeScript types use `?` (optional = can be undefined) but Postgres returns `null` for missing values.
**Why it happens:** Supabase JS client preserves Postgres nulls as JavaScript `null`.
**How to avoid:** Mapper explicitly converts `null` to `undefined`: `value === null ? undefined : value`.
**Warning signs:** Components rendering "null" as text, strict equality checks failing.

### Pitfall 3: Forgetting to Strip DB-Only Columns
**What goes wrong:** `user_id`, `created_at`, `updated_at`, `contract_id` leak into the Contract/Finding/ContractDate types where they don't exist.
**Why it happens:** `select('*')` returns all columns including ones not in the TypeScript interface.
**How to avoid:** The mapper produces `T` via type assertion. Extra keys in the object are harmless at runtime (JS ignores them) but if you destructure or spread carelessly, they propagate. Best practice: either explicitly select needed columns, or accept the extra keys are inert.
**Warning signs:** TypeScript errors if you try to type the raw Supabase response; extra fields showing up in React DevTools.

### Pitfall 4: useEffect Fetch Fires Before Auth Session
**What goes wrong:** Supabase queries return empty results because RLS blocks unauthenticated requests.
**Why it happens:** `useContractStore` useEffect runs before the Supabase client has the session token attached.
**How to avoid:** The existing `AuthenticatedApp` pattern already gates rendering: `useContractStore` is only called inside `AuthenticatedApp`, which only renders when `session` is non-null. The Supabase client automatically attaches the session token from `onAuthStateChange`. This is safe as-is.
**Warning signs:** Contracts array always empty on first load, 401 errors in network tab.

### Pitfall 5: Contracts Missing `findings` and `dates` Arrays
**What goes wrong:** Components crash accessing `.findings.length` or `.dates.map()` on contracts that had no findings/dates in the DB.
**Why it happens:** If stitching doesn't provide default empty arrays, the contract object won't have these properties.
**How to avoid:** Stitching step uses `findingsByContract.get(c.id) || []` -- always provide empty array fallback.
**Warning signs:** `Cannot read properties of undefined (reading 'length')` errors.

## Code Examples

### Column-to-Field Mapping Reference

**contracts table:**
| Postgres Column | TypeScript Field | Type | Notes |
|----------------|-----------------|------|-------|
| id | id | uuid -> string | PK |
| name | name | text -> string | |
| client | client | text -> string | |
| type | type | text -> union literal | CHECK constraint matches TS union |
| upload_date | uploadDate | text -> string | |
| status | status | text -> union literal | CHECK constraint matches TS union |
| risk_score | riskScore | integer -> number | |
| score_breakdown | scoreBreakdown | jsonb -> Array | JSONB passthrough, optional |
| bid_signal | bidSignal | jsonb -> BidSignal | JSONB passthrough, optional |
| pass_results | passResults | jsonb -> Array | JSONB passthrough, optional |
| user_id | (not in TS type) | uuid | DB-only, stripped |
| created_at | (not in TS type) | timestamptz | DB-only, stripped |
| updated_at | (not in TS type) | timestamptz | DB-only, stripped |

**findings table:**
| Postgres Column | TypeScript Field | Type | Notes |
|----------------|-----------------|------|-------|
| id | id | uuid -> string | PK |
| contract_id | contractId | uuid -> string | Used for stitching, not in Finding type |
| severity | severity | text -> Severity | |
| category | category | text -> Category | |
| title | title | text -> string | |
| description | description | text -> string | |
| recommendation | recommendation | text -> string | |
| clause_reference | clauseReference | text -> string | |
| negotiation_position | negotiationPosition | text -> string | |
| action_priority | actionPriority | text -> ActionPriority | |
| resolved | resolved | boolean -> boolean | |
| note | note | text -> string | |
| clause_text | clauseText | text -> string | optional |
| explanation | explanation | text -> string | optional |
| cross_references | crossReferences | jsonb -> string[] | JSONB passthrough, optional |
| legal_meta | legalMeta | jsonb -> LegalMeta | JSONB passthrough, optional |
| scope_meta | scopeMeta | jsonb -> ScopeMeta | JSONB passthrough, optional |
| source_pass | sourcePass | text -> string | optional |
| downgraded_from | downgradedFrom | text -> Severity | optional |
| is_synthesis | isSynthesis | boolean -> boolean | optional |
| user_id | (not in TS type) | uuid | DB-only |
| created_at | (not in TS type) | timestamptz | DB-only |
| updated_at | (not in TS type) | timestamptz | DB-only |

**contract_dates table:**
| Postgres Column | TypeScript Field | Type | Notes |
|----------------|-----------------|------|-------|
| id | (not in TS type) | uuid | DB-only (ContractDate has no id) |
| contract_id | contractId | uuid -> string | Used for stitching |
| label | label | text -> string | |
| date | date | text -> string | |
| type | type | text -> union literal | |
| user_id | (not in TS type) | uuid | DB-only |
| created_at | (not in TS type) | timestamptz | DB-only |

### Supabase Error Handling Pattern
```typescript
// Supabase client returns { data, error } -- never throws
const { data, error } = await supabase.from('contracts').select('*');
if (error) {
  // error has: message, code, details, hint
  throw new Error(`Failed to load contracts: ${error.message}`);
}
// data is always an array for select()
```

### AuthenticatedApp Loading Gate
```typescript
// Recommendation: Gate at AuthenticatedApp level (simpler than per-page)
function AuthenticatedApp({ signOut }: { signOut: () => Promise<void> }) {
  const { contracts, isLoading, error, /* ...mutations */ } = useContractStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If error, show toast (via useEffect) but render normal UI with empty contracts
  // ... rest of existing AuthenticatedApp
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage via storageManager | Supabase client queries | This phase (41) | Data persists server-side, survives browser clear, enables multi-device |
| Synchronous init via useState(() => load()) | Async fetch via useEffect | This phase (41) | Requires loading state, but standard React pattern |
| persistAndSet wrapping all mutations | Plain setContracts | This phase (41) | Mutations are in-memory only until Phase 44 adds Supabase writes |

## Open Questions

1. **ContractDate type lacks `id` field**
   - What we know: The DB has `id uuid primary key` on `contract_dates`, but the TypeScript `ContractDate` interface only has `label`, `date`, `type`. The mapper will produce an `id` key that TS doesn't know about.
   - What's unclear: Whether Phase 44 (mutations) will need the `id` for updates/deletes.
   - Recommendation: For now, the extra `id` is harmless. If needed later, add `id?: string` to `ContractDate` in a future phase.

2. **Fetch function placement**
   - What we know: Could be inline in useContractStore or in a separate `src/lib/contractQueries.ts`.
   - Recommendation: Inline in the hook for simplicity (it's a single function). Extract only if reused.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework configured (per CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | snake_case to camelCase mapper with null->undefined and JSONB passthrough | unit | Manual verification -- no test framework | N/A |
| DATA-02 | Contracts load from Supabase with nested findings/dates on mount | smoke (manual) | `vercel dev` + browser check -- dashboard shows DB data | N/A |

### Sampling Rate
- **Per task commit:** Manual browser verification (load app, check contracts appear)
- **Per wave merge:** Full manual walkthrough: login -> dashboard shows contracts -> review page shows findings/dates
- **Phase gate:** Verify all three pages (Dashboard, All Contracts, Contract Review) render from Supabase data

### Wave 0 Gaps
- No test framework is configured; validation is manual browser testing
- Could optionally add a unit test for the mapper function, but no test runner exists

## Sources

### Primary (HIGH confidence)
- Project source code: `src/hooks/useContractStore.ts`, `src/types/contract.ts`, `src/schemas/finding.ts`, `src/lib/supabase.ts`, `src/App.tsx`, `src/contexts/AuthContext.tsx` -- read directly
- Database schema: `supabase/migrations/00000000000000_initial_schema.sql` -- read directly, all column names and types verified
- @supabase/supabase-js v2.99.2 -- installed in project, `.from().select()` API is well-established

### Secondary (MEDIUM confidence)
- Supabase JS client behavior (null handling, error shape) -- based on established v2 API patterns, consistent with project's existing auth usage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- single library already installed, no new dependencies
- Architecture: HIGH -- all decisions locked in CONTEXT.md, column mapping verified against schema and types
- Pitfalls: HIGH -- identified from direct code analysis of existing types vs schema

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, no fast-moving dependencies)
