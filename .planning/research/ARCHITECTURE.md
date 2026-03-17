# Architecture Patterns: Supabase Auth + Postgres Integration

**Domain:** Supabase integration into existing React SPA
**Researched:** 2026-03-16

## Recommended Architecture

### High-Level Data Flow

```
Browser (React SPA)
  |
  |-- supabase-js client (anon key + user JWT)
  |     |-- Auth: signIn, signUp, signOut, onAuthStateChange
  |     |-- Database: select/insert/update/delete (RLS enforced)
  |
  |-- fetch('/api/analyze') with Authorization: Bearer <access_token>
        |
        Vercel Serverless Function (api/analyze.ts)
          |-- Validates JWT via supabaseAdmin.auth.getUser(token)
          |-- Uses service_role client for DB writes (bypass RLS)
          |-- Calls Anthropic API (unchanged)
          |-- Writes results directly to Supabase tables
```

### Why This Shape

The client uses `@supabase/supabase-js` with the **anon key** for all auth operations and direct database reads. The anon key is safe to expose in browser code -- RLS policies restrict what data it can access based on the authenticated user's JWT.

The Vercel serverless function uses the **service_role key** (server-side only, never exposed to client) for writing analysis results. This is the correct pattern because:
1. The serverless function already has the ANTHROPIC_API_KEY -- it is a trusted backend
2. Using service_role avoids needing to forward/validate user sessions in the serverless context
3. The function still validates the user's JWT before proceeding (authorization gate)

**Confidence: HIGH** -- This is the documented Supabase pattern for SPA + serverless architectures.

---

## Component Boundaries

### New Components/Files to Create

| Component | File | Responsibility |
|-----------|------|----------------|
| `supabaseClient` | `src/lib/supabase.ts` | Singleton Supabase client (anon key) |
| `AuthProvider` | `src/contexts/AuthContext.tsx` | Session state, auth methods, loading state |
| `useAuth` | (exported from AuthContext) | Hook to consume auth context |
| `LoginPage` | `src/pages/Login.tsx` | Email/password sign-in form |
| `supabaseAdmin` | `api/supabaseAdmin.ts` | Server-side Supabase client (service_role key) |
| `dbMapper` | `src/lib/dbMapper.ts` | snake_case DB <-> camelCase TS mapping functions |

### Existing Files to Modify

| File | Change | Why |
|------|--------|-----|
| `src/hooks/useContractStore.ts` | Replace localStorage calls with Supabase queries | Core data layer migration |
| `src/hooks/useCompanyProfile.ts` | Replace localStorage with Supabase `company_profiles` table | Profile persistence migration |
| `src/api/analyzeContract.ts` | Add Authorization header with access_token; remove companyProfile from body | Serverless function auth gate |
| `api/analyze.ts` | Validate JWT, write results to Supabase, read company profile from DB | Server-side auth + DB writes |
| `src/App.tsx` | Add auth check (conditional render: login vs authenticated app) | Auth integration point |
| `src/index.tsx` | Wrap with AuthProvider at top level | Provider must be above App |

### Files to Remove

| File | Reason |
|------|--------|
| `src/storage/contractStorage.ts` | Supabase replaces localStorage for contracts |
| `src/data/mockContracts.ts` | No mock seeding with real database |

### Files to Simplify

| File | Change |
|------|--------|
| `src/storage/storageManager.ts` | Keep only for `hide-resolved` UI preference (single remaining localStorage key) |
| `src/knowledge/profileLoader.ts` | Remove entirely or convert to async Supabase fetch for server use |

---

## Supabase Client Setup

### Client-Side (`src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Key decisions:**
- Use `VITE_` prefix so Vite exposes these to the browser (they are safe to expose)
- Single client instance, imported wherever needed
- No need for `@supabase/auth-helpers-react` -- the raw `@supabase/supabase-js` v2 is sufficient for a plain React SPA without SSR

### Server-Side (`api/supabaseAdmin.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Key decisions:**
- Uses `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ prefix -- never exposed to client)
- Bypasses RLS for server-side writes
- Used only in `api/` directory (Vercel serverless functions)

---

## Auth Context Pattern

### AuthProvider (`src/contexts/AuthContext.tsx`)

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Key decisions:**
- `loading` state prevents flash of login screen while checking existing session
- `onAuthStateChange` handles token refresh automatically -- no manual refresh logic needed
- `signIn`/`signUp`/`signOut` exposed as simple async functions
- Follows existing project pattern: ToastProvider is already a context, AuthProvider is the same shape

**Confidence: HIGH** -- This is the exact pattern from Supabase React docs and community best practices.

---

## Protected Route Pattern

### Integration with Existing Router

The existing app uses a custom `useRouter` hook with `ViewState`. The protection layer sits **above** the router, not inside it.

```
index.tsx
  AuthProvider          <-- NEW
    ToastProvider       <-- EXISTING
      App               <-- EXISTING (now conditionally renders Login or main app)
```

**In App.tsx (modified):**

```typescript
export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;  // Full-screen spinner while checking session
  }

  if (!user) {
    return <LoginPage />;       // Unauthenticated: show login only
  }

  return <AuthenticatedApp />; // Existing Sidebar + page content extracted here
}
```

**Why NOT a ProtectedRoute wrapper component:**
The app has no React Router -- it uses `ViewState` with manual `renderContent()`. A wrapper component pattern does not fit. Instead, the auth check lives at the top of `App.tsx` as a simple conditional. This is cleaner for a single-entry-point SPA.

**Why NOT modify useRouter:**
The router parses URLs and manages history state. Auth is orthogonal -- it gates the entire app, not individual routes. Keeping them separate follows single responsibility.

---

## Database Schema

### Tables

```sql
-- Contracts table (parent)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT 'Unknown',
  type TEXT NOT NULL CHECK (type IN ('Prime Contract', 'Subcontract', 'Purchase Order', 'Change Order')),
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Analyzing', 'Reviewed', 'Draft')) DEFAULT 'Analyzing',
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  score_breakdown JSONB,          -- Array of {name, points}
  bid_signal JSONB,               -- {level, label, score, factors}
  pass_results JSONB,             -- Array of {passName, status, error?}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Findings table (child of contracts, 1:N)
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  clause_text TEXT,                -- Verbatim quote from contract
  clause_reference TEXT DEFAULT 'N/A',
  explanation TEXT,
  negotiation_position TEXT DEFAULT '',
  action_priority TEXT DEFAULT 'monitor' CHECK (action_priority IN ('pre-bid', 'pre-sign', 'monitor')),
  legal_meta JSONB,               -- LegalMeta discriminated union
  scope_meta JSONB,               -- ScopeMeta discriminated union
  source_pass TEXT,
  is_synthesis BOOLEAN DEFAULT FALSE,
  cross_references TEXT[],
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contract dates table (child of contracts, 1:N)
CREATE TABLE contract_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Start', 'Milestone', 'Deadline', 'Expiry'))
);

-- Company profile table (1:1 per user)
CREATE TABLE company_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gl_per_occurrence TEXT DEFAULT '',
  gl_aggregate TEXT DEFAULT '',
  umbrella_limit TEXT DEFAULT '',
  auto_limit TEXT DEFAULT '',
  wc_statutory_state TEXT DEFAULT '',
  wc_employer_liability TEXT DEFAULT '',
  bonding_single_project TEXT DEFAULT '',
  bonding_aggregate TEXT DEFAULT '',
  contractor_license_type TEXT DEFAULT '',
  contractor_license_number TEXT DEFAULT '',
  contractor_license_expiry TEXT DEFAULT '',
  dir_registration TEXT DEFAULT '',
  dir_expiry TEXT DEFAULT '',
  sbe_cert_id TEXT DEFAULT '',
  sbe_cert_issuer TEXT DEFAULT '',
  lausd_vendor_number TEXT DEFAULT '',
  employee_count TEXT DEFAULT '',
  service_area TEXT DEFAULT '',
  typical_project_size_min TEXT DEFAULT '',
  typical_project_size_max TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
CREATE INDEX idx_findings_contract_id ON findings(contract_id);
CREATE INDEX idx_contract_dates_contract_id ON contract_dates(contract_id);
```

### Schema Design Decisions

**Why normalize findings into a separate table (not JSONB on contracts):**
- Findings have individual operations: `toggleFindingResolved`, `updateFindingNote` -- JSONB array element updates are verbose and error-prone in Postgres
- Supabase auto-detects foreign key relationships, so `supabase.from('contracts').select('*, findings(*), contract_dates(*)')` fetches everything in one query
- Individual finding queries enable future features (search across findings, aggregate stats)

**Why JSONB for score_breakdown, bid_signal, pass_results, legal_meta, scope_meta:**
- These are read-only after creation (set by the analysis pipeline, never individually edited)
- Complex nested structures that do not benefit from normalization
- No need to query/filter by individual fields within them

**Why snake_case in DB, camelCase in TypeScript:**
- Postgres convention is snake_case
- TypeScript convention is camelCase
- Map at the data access layer with explicit mapping functions

**Why UUID for IDs (not `c-${Date.now()}`):**
- Postgres-native UUID generation (`gen_random_uuid()`)
- No collision risk
- Server generates IDs, not client

---

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Contracts: user can only access own contracts
CREATE POLICY "Users can view own contracts"
  ON contracts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts"
  ON contracts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
  ON contracts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts"
  ON contracts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Findings: access through contract ownership
CREATE POLICY "Users can view findings of own contracts"
  ON findings FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid()));

CREATE POLICY "Users can update findings of own contracts"
  ON findings FOR UPDATE TO authenticated
  USING (contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid()));

-- Findings INSERT/DELETE handled by service_role in serverless function (no client policy needed)

-- Contract dates: same pattern as findings
CREATE POLICY "Users can view dates of own contracts"
  ON contract_dates FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid()));

-- Company profile: user can only access own profile
CREATE POLICY "Users can view own profile"
  ON company_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own profile"
  ON company_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON company_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

**Why subquery for findings/dates RLS (not a direct user_id column):**
- Findings do not have a `user_id` column -- ownership is derived through the contract
- Adding `user_id` to findings would be denormalization for no benefit in a single-user app
- The subquery is simple and Postgres optimizes it well with the index on `contracts.user_id`

**Confidence: HIGH** -- Standard Supabase RLS patterns from official docs.

---

## Data Flow Changes

### Before (localStorage)

```
Upload PDF -> POST /api/analyze -> Response JSON -> updateContract(state) -> saveContracts(localStorage)
Load app -> loadContracts(localStorage) -> useState(contracts)
Toggle resolved -> persistAndSet() -> saveContracts(localStorage)
```

### After (Supabase)

```
Upload PDF -> POST /api/analyze (with Bearer token) -> Server validates JWT ->
  Server runs analysis -> Server writes to contracts/findings/dates tables ->
  Server returns contract ID -> Client fetches contract via Supabase select

Load app -> AuthProvider checks session -> supabase.from('contracts').select('*, findings(*), contract_dates(*)') -> setState

Toggle resolved -> supabase.from('findings').update({resolved: true}).eq('id', findingId) -> Optimistic update in state
```

### Key Behavioral Changes

1. **Analysis writes happen server-side.** Currently the API returns JSON and the client writes to localStorage. With Supabase, the server writes directly to the database. The client receives a contract ID and fetches the result.

2. **Company profile loads from Supabase on both client and server.** The `profileLoader.ts` currently reads localStorage. For the server to use the profile during analysis, it reads from the database using the authenticated user's ID. The client-side `analyzeContract.ts` no longer sends `companyProfile` in the request body.

3. **Optimistic updates for user actions.** `toggleFindingResolved` and `updateFindingNote` update local state immediately, then fire a Supabase update. On failure, revert. This keeps the UI snappy.

4. **Contract deletion is a single DELETE.** CASCADE handles findings and dates automatically.

5. **IDs are UUIDs generated by Postgres.** The client no longer generates `c-${Date.now()}` or `f-${crypto.randomUUID()}` IDs. The server inserts and returns the Postgres-generated UUID.

---

## Serverless Function Authentication

### Pattern: JWT Validation + Service Role Writes

In `api/analyze.ts`, add at the top of the handler:

```typescript
// Extract and validate JWT from Authorization header
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Missing authorization token' });
}
const token = authHeader.slice(7);

const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
if (authError || !user) {
  return res.status(401).json({ error: 'Invalid or expired token' });
}

const userId = user.id;
```

After analysis completes, write results to DB:

```typescript
// Insert contract row
const { data: contract } = await supabaseAdmin
  .from('contracts')
  .insert({
    user_id: userId,
    name: fileName.replace(/\.pdf$/i, ''),
    client: merged.client,
    type: merged.contractType,
    risk_score: merged.riskScore,
    score_breakdown: merged.scoreBreakdown,
    bid_signal: bidSignal,
    pass_results: merged.passResults,
    status: 'Reviewed',
  })
  .select('id')
  .single();

// Insert findings and dates in parallel
await Promise.all([
  supabaseAdmin.from('findings').insert(
    findingsWithIds.map(f => findingToDb(f, contract!.id))
  ),
  supabaseAdmin.from('contract_dates').insert(
    merged.dates.map(d => dateToDb(d, contract!.id))
  ),
]);

return res.status(200).json({ contractId: contract!.id });
```

### Reading Company Profile Server-Side

```typescript
// Read company profile from DB (replaces request body param)
const { data: profileRow } = await supabaseAdmin
  .from('company_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
const companyProfile = profileRow ? profileFromDb(profileRow) : undefined;
```

This replaces the current pattern where `analyzeContract.ts` sends `companyProfile: loadCompanyProfile()` in the request body.

### Client-Side Changes to `analyzeContract.ts`

```typescript
import { supabase } from '../lib/supabase';

export async function analyzeContract(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const pdfBase64 = await readFileAsBase64(file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ pdfBase64, fileName: file.name }),
    // companyProfile no longer sent -- server reads from DB
  });

  // ... error handling ...

  const { contractId } = await response.json();
  return contractId;
}
```

---

## useContractStore Migration

The hook changes from "state + localStorage sync" to "state + Supabase sync."

### New Shape

```typescript
export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load contracts from Supabase on mount
  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('contracts')
        .select('*, findings(*), contract_dates(*)')
        .order('created_at', { ascending: false });
      setContracts((data ?? []).map(contractFromDb));
      setLoading(false);
    }
    load();
  }, [user]);

  const refreshContract = async (id: string) => {
    const { data } = await supabase
      .from('contracts')
      .select('*, findings(*), contract_dates(*)')
      .eq('id', id)
      .single();
    if (data) {
      const mapped = contractFromDb(data);
      setContracts(prev => {
        const exists = prev.some(c => c.id === id);
        return exists
          ? prev.map(c => c.id === id ? mapped : c)
          : [mapped, ...prev];
      });
    }
  };

  const deleteContract = async (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id)); // Optimistic
    await supabase.from('contracts').delete().eq('id', id);
  };

  const toggleFindingResolved = async (contractId: string, findingId: string) => {
    const finding = contracts.find(c => c.id === contractId)
      ?.findings.find(f => f.id === findingId);
    if (!finding) return;

    // Optimistic update
    setContracts(prev => prev.map(c =>
      c.id === contractId
        ? { ...c, findings: c.findings.map(f =>
            f.id === findingId ? { ...f, resolved: !f.resolved } : f
          )}
        : c
    ));

    await supabase.from('findings')
      .update({ resolved: !finding.resolved })
      .eq('id', findingId);
  };

  const updateFindingNote = async (contractId: string, findingId: string, note: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId
        ? { ...c, findings: c.findings.map(f =>
            f.id === findingId ? { ...f, note } : f
          )}
        : c
    ));

    await supabase.from('findings')
      .update({ note })
      .eq('id', findingId);
  };

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await supabase.from('contracts')
      .update(contractUpdatesToDb(updates))
      .eq('id', id);
  };

  return {
    contracts,
    loading,
    refreshContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
    updateContract,
  };
}
```

**Key changes from current implementation:**
1. `persistAndSet` pattern replaced with optimistic state + async Supabase call
2. `loadContracts()` / `saveContracts()` removed -- Supabase is the source of truth
3. New `refreshContract()` method for post-analysis fetch (also adds to list if new)
4. All operations are async (was synchronous with localStorage)
5. `storageWarning` / `dismissStorageWarning` removed (no localStorage quota concerns)
6. Mock contract seeding removed entirely
7. `addContract` removed -- server creates contracts now; client uses `refreshContract` after analysis

---

## useCompanyProfile Migration

```typescript
export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(profileFromDb(data));
        setLoading(false);
      });
  }, [user]);

  const saveField = async <K extends keyof CompanyProfile>(
    key: K, value: CompanyProfile[K]
  ) => {
    setProfile(prev => ({ ...prev, [key]: value }));
    await supabase
      .from('company_profiles')
      .upsert({
        user_id: user!.id,
        [toSnakeCase(key)]: value,
        updated_at: new Date().toISOString(),
      });
  };

  return { profile, loading, saveField };
}
```

**Upsert pattern:** Company profile uses `upsert` because the row may not exist on first field save. This replaces the "merge with defaults" pattern in `profileLoader.ts`.

---

## Case Mapping Strategy

Postgres uses `snake_case`, TypeScript uses `camelCase`.

**Recommended: Explicit mapping functions** because:
- The existing types (Contract, Finding, CompanyProfile) are well-defined
- Only ~30 fields total need mapping
- No runtime dependency on a library
- Type-safe at both boundaries

```typescript
// src/lib/dbMapper.ts

export function contractFromDb(row: DbContractRow): Contract {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    type: row.type,
    uploadDate: row.upload_date,
    status: row.status,
    riskScore: row.risk_score,
    scoreBreakdown: row.score_breakdown,
    bidSignal: row.bid_signal,
    passResults: row.pass_results,
    findings: (row.findings ?? []).map(findingFromDb),
    dates: (row.contract_dates ?? []).map(dateFromDb),
  };
}

export function findingFromDb(row: DbFindingRow): Finding { ... }
export function dateFromDb(row: DbDateRow): ContractDate { ... }
export function profileFromDb(row: DbProfileRow): CompanyProfile { ... }

// Reverse mappings for inserts/updates
export function findingToDb(f: Finding, contractId: string): DbFindingInsert { ... }
export function contractUpdatesToDb(updates: Partial<Contract>): Record<string, unknown> { ... }
```

**Not recommended: Generic camelCase<->snake_case converter** because it obscures the mapping, breaks on edge cases, and adds unnecessary complexity.

---

## App.tsx Upload Flow Changes

The upload flow is the most significant change. Currently:

```
1. Client creates placeholder contract with client-generated ID
2. Client navigates to review page immediately
3. API returns full analysis JSON
4. Client updates placeholder with real data via updateContract()
```

After migration:

```
1. Client shows upload/analyzing UI (no placeholder in DB yet)
2. API validates JWT, runs analysis, writes to DB, returns {contractId}
3. Client calls refreshContract(contractId) to fetch from DB
4. Client navigates to review page with the real contract ID
```

**Why no placeholder in DB:** The server generates the contract and its ID. Creating a placeholder "Analyzing" row in the DB from the client, then having the server update it, creates a race condition and requires coordinating IDs between client and server. Simpler to let the server own the full write.

**Impact on UI:** The upload/analyzing state needs to be tracked in local component state (not in the contracts array) since there is no DB row yet. A loading indicator on the upload page replaces the current "navigate to review page with Analyzing placeholder" pattern.

**Alternative considered:** Client creates placeholder via Supabase insert, passes the UUID to the server. Server updates it. This preserves the current "navigate immediately to review page" UX but adds complexity (two DB writes, ID coordination). Worth considering if the current UX is strongly preferred.

---

## Environment Variables

### New Variables Required

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Client (Vite) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client (Vite) | Supabase anon/public key |
| `SUPABASE_URL` | Server (Vercel) | Same URL, server-side access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (Vercel) | Service role key for DB writes |

### Existing Variables (Unchanged)

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Server (Vercel) | Claude API key |
| `ALLOWED_ORIGIN` | Server (Vercel) | CORS origin |

---

## Patterns to Follow

### Pattern 1: Optimistic Updates with Rollback
**What:** Update local state immediately, persist to Supabase in background, revert on failure.
**When:** User-initiated mutations (resolve finding, edit note, rename contract).
**Why:** Keeps UI snappy. This is the existing pattern with `structuredClone` for re-analyze rollback.

### Pattern 2: Server-Side Writes for Analysis Results
**What:** The serverless function writes analysis results directly to Supabase.
**When:** Analysis completes.
**Why:** Avoids sending large JSON payloads back to client just to write them to the database.

### Pattern 3: Single Fetch with Nested Relations
**What:** Use Supabase `select('*, findings(*), contract_dates(*)')` for contract loads.
**When:** Loading contract list or individual contract.
**Why:** One API call instead of three. Supabase auto-detects foreign key relationships.

### Pattern 4: Auth Context at Provider Level
**What:** AuthProvider wraps entire app; useAuth() hook consumed by any component.
**When:** Any component needs user/session info.
**Why:** Same pattern as existing ToastProvider -- consistent architecture.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using service_role Key on the Client
**What:** Putting SUPABASE_SERVICE_ROLE_KEY in VITE_ env vars.
**Why bad:** Bypasses all RLS. Anyone with browser DevTools has full DB access.
**Instead:** Use anon key on client, service_role only in Vercel functions.

### Anti-Pattern 2: Storing Session Tokens in localStorage Manually
**What:** Extracting access_token and storing it yourself.
**Why bad:** Supabase client handles session persistence, refresh, and expiry automatically.
**Instead:** Use `supabase.auth.getSession()` when you need the token.

### Anti-Pattern 3: Real-time Subscriptions for Single User
**What:** Using Supabase real-time to listen for database changes.
**Why bad:** Unnecessary complexity for a single-user app. The client already knows about all mutations because it initiates them.
**Instead:** Optimistic updates + `refreshContract` after server-side writes.

### Anti-Pattern 4: Dual Writes (Client + Server to Same Table)
**What:** Both client and server insert into `contracts` table.
**Why bad for analysis:** Race conditions, ID coordination complexity.
**Instead:** Server writes analysis results; client handles only user actions (resolve, note, rename, delete).

### Anti-Pattern 5: Sending Full Analysis JSON to Client Then Back to DB
**What:** Server returns JSON analysis, client writes to Supabase.
**Why bad:** Unnecessary network roundtrip. Large payloads (findings can be 50+ items).
**Instead:** Server writes directly to DB, returns only the contract ID.

---

## Scalability Considerations

| Concern | At 1 user (now) | At 10 users (future) | Notes |
|---------|-----------------|---------------------|-------|
| Auth | Email/password | Add OAuth providers | AuthProvider pattern unchanged |
| RLS | `auth.uid() = user_id` | Same policy works for multi-user | No schema change needed |
| Connection pooling | Default Supabase | Supabase connection pooler (Supavisor) | Automatic with Supabase |
| Data volume | < 100 contracts | Index on user_id handles it | Already in schema |
| File storage | Not stored (PDF discarded after analysis) | Add Supabase Storage bucket | Separate concern |

---

## Sources

- [Supabase Auth with React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) -- HIGH confidence
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) -- HIGH confidence
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Supabase Joins and Nesting](https://supabase.com/docs/guides/database/joins-and-nesting) -- HIGH confidence
- [Supabase Auth in Serverless Functions Discussion](https://github.com/supabase/supabase/discussions/1067) -- MEDIUM confidence
- [Vercel + Supabase Auth Pattern](https://skdev.substack.com/p/how-to-setup-auth-with-vercel-serverless) -- MEDIUM confidence
- [Supabase Auth Helpers SessionContext](https://github.com/supabase/auth-helpers/blob/main/packages/react/src/components/SessionContext.tsx) -- HIGH confidence
