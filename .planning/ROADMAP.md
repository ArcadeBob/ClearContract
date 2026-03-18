# Roadmap: ClearContract

## Milestones

- ✅ **v1.0 Enhanced Analysis Release** -- Phases 1-6 (shipped 2026-03-06)
- ✅ **v1.1 Domain Intelligence** -- Phases 7-10 (shipped 2026-03-10)
- ✅ **v1.2 UX Foundations** -- Phases 11-14 (shipped 2026-03-12)
- ✅ **v1.3 Workflow Completion** -- Phases 15-21 (shipped 2026-03-13)
- ✅ **v1.4 Production Readiness** -- Phases 22-26 (shipped 2026-03-15)
- ✅ **v1.5 Code Health** -- Phases 27-32 (shipped 2026-03-15)
- ✅ **v1.6 Quality & Validation** -- Phases 33-38 (shipped 2026-03-16)
- 🚧 **v2.0 Enterprise Foundation** -- Phases 39-45 (in progress)

## Phases

<details>
<summary>✅ v1.0 Enhanced Analysis Release (Phases 1-6) -- SHIPPED 2026-03-06</summary>

- [x] Phase 1: Pipeline Foundation (4/4 plans) -- completed 2026-03-04
- [x] Phase 2: Core Legal Risk Analysis (2/2 plans) -- completed 2026-03-05
- [x] Phase 3: Extended Legal Coverage (2/2 plans) -- completed 2026-03-05
- [x] Phase 4: Scope, Compliance, and Verbiage (2/2 plans) -- completed 2026-03-05
- [x] Phase 5: Negotiation Output and Organization (2/2 plans) -- completed 2026-03-06
- [x] Phase 6: CategoryFilter Display Fix (1/1 plan) -- completed 2026-03-06 [GAP CLOSURE]

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Domain Intelligence (Phases 7-10) -- SHIPPED 2026-03-10</summary>

- [x] Phase 7: Knowledge Architecture and Company Profile (2/2 plans) -- completed 2026-03-08
- [x] Phase 8: Pipeline Integration and Company-Specific Intelligence (2/2 plans) -- completed 2026-03-09
- [x] Phase 9: CA Regulatory Knowledge (2/2 plans) -- completed 2026-03-09
- [x] Phase 10: Industry and Trade Knowledge (2/2 plans) -- completed 2026-03-10

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.2 UX Foundations (Phases 11-14) -- SHIPPED 2026-03-12</summary>

- [x] Phase 11: Data Persistence (1/1 plan) -- completed 2026-03-12
- [x] Phase 12: Contract Management (1/1 plan) -- completed 2026-03-12
- [x] Phase 13: Upload Error Feedback (2/2 plans) -- completed 2026-03-12
- [x] Phase 14: Empty States and Dashboard Polish (1/1 plan) -- completed 2026-03-12

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.3 Workflow Completion (Phases 15-21) -- SHIPPED 2026-03-13</summary>

- [x] Phase 15: URL-based Routing (1/1 plan) -- completed 2026-03-13
- [x] Phase 16: Finding Actions (2/2 plans) -- completed 2026-03-13
- [x] Phase 17: Settings Validation (1/1 plan) -- completed 2026-03-13
- [x] Phase 18: Re-analyze Contract (1/1 plan) -- completed 2026-03-13
- [x] Phase 19: Export Report (1/1 plan) -- completed 2026-03-13
- [x] Phase 20: Fix All Contracts Navigation (1/1 plan) -- completed 2026-03-13 [GAP CLOSURE]
- [x] Phase 21: Fix Filtered CSV Export (1/1 plan) -- completed 2026-03-13 [GAP CLOSURE]

See `.planning/milestones/v1.3-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.4 Production Readiness (Phases 22-26) -- SHIPPED 2026-03-15</summary>

- [x] Phase 22: Polish & Trust (3/3 plans) -- completed 2026-03-14
- [x] Phase 23: Analysis Quality (3/3 plans) -- completed 2026-03-14
- [x] Phase 24: Actionable Output (2/2 plans) -- completed 2026-03-15
- [x] Phase 25: Portfolio Intelligence (2/2 plans) -- completed 2026-03-15
- [x] Phase 26: Audit Gap Closure (1/1 plan) -- completed 2026-03-15 [GAP CLOSURE]

See `.planning/milestones/v1.4-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.5 Code Health (Phases 27-32) -- SHIPPED 2026-03-15</summary>

- [x] Phase 27: Foundation Utilities (2/2 plans) -- completed 2026-03-15
- [x] Phase 28: Hook Extraction (2/2 plans) -- completed 2026-03-15
- [x] Phase 29: Component Decomposition + Toast Context (3/3 plans) -- completed 2026-03-15
- [x] Phase 30: Type Safety Hardening (3/3 plans) -- completed 2026-03-15
- [x] Phase 31: Server-side API Modularization (1/1 plan) -- completed 2026-03-15
- [x] Phase 32: Type Safety Gap Closure (1/1 plan) -- completed 2026-03-15 [GAP CLOSURE]

See `.planning/milestones/v1.5-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.6 Quality & Validation (Phases 33-38) -- SHIPPED 2026-03-16</summary>

- [x] Phase 33: Test Infrastructure (2/2 plans) -- completed 2026-03-16
- [x] Phase 34: Pure Logic Unit Tests (3/3 plans) -- completed 2026-03-16
- [x] Phase 35: Hook Tests (2/2 plans) -- completed 2026-03-16
- [x] Phase 36: Component Tests (2/2 plans) -- completed 2026-03-16
- [x] Phase 37: API Integration Tests (2/2 plans) -- completed 2026-03-16
- [x] Phase 38: UAT, CI, and Coverage Enforcement (2/2 plans) -- completed 2026-03-16

See `.planning/milestones/v1.6-ROADMAP.md` for full details.

</details>

### 🚧 v2.0 Enterprise Foundation (In Progress)

**Milestone Goal:** Move from localStorage to Supabase (Postgres + Auth) for real data durability and single-user authentication.

- [x] **Phase 39: Database Schema and RLS** - Create Supabase tables with row-level security and configure environment variables (completed 2026-03-17)
- [x] **Phase 40: Authentication** - Email/password login with session persistence and protected routes (completed 2026-03-17)
- [x] **Phase 41: Contract Reads and Data Mapping** - Load contracts from Supabase with type-safe snake_case/camelCase mapping (completed 2026-03-17)
- [x] **Phase 42: Company Profile Migration** - Read and write company profile to Supabase with upsert pattern (completed 2026-03-18)
- [x] **Phase 43: Analysis Pipeline Server Writes** - Server validates JWT, reads company profile from DB, writes analysis results to Postgres (completed 2026-03-18)
- [ ] **Phase 44: Contract Operations** - Wire all user-initiated mutations to Supabase with optimistic updates
- [ ] **Phase 45: Cleanup** - Remove localStorage contract storage, mock data, and simplify storageManager

## Phase Details

### Phase 39: Database Schema and RLS
**Goal**: All Supabase tables exist with correct types, constraints, indexes, and RLS policies so every subsequent phase can query securely
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06
**Success Criteria** (what must be TRUE):
  1. Contracts, findings, contract_dates, and company_profiles tables exist in Supabase Postgres with correct column types and foreign key constraints
  2. RLS is enabled on all four tables and policies restrict every query to the owning user (verified by querying with anon key and seeing no unauthorized data)
  3. Environment variables (Supabase URL, anon key, service role key) are configured in both local .env and Vercel project settings
  4. CASCADE delete on findings and contract_dates foreign keys works (deleting a contract removes its children)
**Plans**: 1 plan
Plans:
- [ ] 39-01-PLAN.md -- Supabase CLI init, migration SQL (4 tables, RLS, indexes), env var config

### Phase 40: Authentication
**Goal**: Users must sign in before accessing any part of the app, with sessions that survive browser restarts
**Depends on**: Phase 39
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can sign in with email and password on a dedicated login page
  2. Closing the browser and reopening it keeps the user signed in (no re-login required)
  3. Unauthenticated users see only the login page -- no sidebar, no dashboard, no routes accessible
  4. User can sign out via a button in the sidebar and is returned to the login page
  5. Invalid credentials produce a clear, specific error message on the login form (not a generic failure)
**Plans**: 2 plans
Plans:
- [ ] 40-01-PLAN.md -- Supabase client, AuthContext, LoginPage, LoadingScreen
- [ ] 40-02-PLAN.md -- Wire auth gate, Sidebar sign-out, unit tests

### Phase 41: Contract Reads and Data Mapping
**Goal**: The app loads all contract data from Supabase on mount, replacing localStorage reads with database queries
**Depends on**: Phase 40
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. Dashboard and All Contracts page render contracts loaded from Supabase (not localStorage)
  2. Contract review page shows findings and dates nested under the correct contract, loaded via joined Supabase query
  3. Type-safe mapper converts between Postgres snake_case columns and TypeScript camelCase fields with zero runtime type errors
**Plans**: 2 plans
Plans:
- [ ] 41-01-PLAN.md -- Generic snake_case-to-camelCase mapper utility
- [ ] 41-02-PLAN.md -- Supabase fetch in useContractStore, loading state in AuthenticatedApp

### Phase 42: Company Profile Migration
**Goal**: Company profile settings persist in Supabase so they survive device changes and localStorage clearing
**Depends on**: Phase 41
**Requirements**: DATA-03
**Success Criteria** (what must be TRUE):
  1. Settings page loads company profile from Supabase (insurance, bonding, licenses, capabilities fields all populated)
  2. Editing a company profile field on the Settings page persists the change to Supabase (verifiable by refreshing the page and seeing the new value)
  3. A new user with no existing profile sees the Settings page with empty/default values (no errors)
**Plans**: 1 plan
Plans:
- [ ] 45-01-PLAN.md -- [To be planned]

### Phase 43: Analysis Pipeline Server Writes
**Goal**: The analysis pipeline authenticates requests, reads company profile from the database, and writes all results directly to Postgres -- the server owns contract creation
**Depends on**: Phase 42
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. Uploading a PDF triggers analysis and the resulting contract, findings, and dates appear in the database (queryable via Supabase dashboard)
  2. An analysis request without a valid auth token is rejected with an appropriate error (not silently accepted)
  3. The analysis pipeline reads the company profile from Supabase (not localStorage) for insurance/bonding comparison and bid signal computation
  4. After analysis completes, the client navigates to the contract review page showing all results loaded from the database
**Plans**: 2 plans
Plans:
- [ ] 43-01-PLAN.md -- JWT validation, DB profile read, sequential DB inserts, Contract response
- [ ] 43-02-PLAN.md -- Client auth token, analyzing UI, toast action label, re-analyze wiring

### Phase 44: Contract Operations
**Goal**: All user-initiated mutations (delete, resolve, annotate, rename, re-analyze) write to Supabase with instant UI feedback and rollback on failure
**Depends on**: Phase 43
**Requirements**: CRUD-01, CRUD-02, CRUD-03, CRUD-04, CRUD-05, DATA-04
**Success Criteria** (what must be TRUE):
  1. Deleting a contract removes it from the UI immediately and from the database (findings and dates cascade-deleted)
  2. Resolving/unresolving a finding updates the UI instantly and persists to Supabase (survives page refresh)
  3. Adding, editing, and deleting notes on findings persists to Supabase (survives page refresh)
  4. Renaming a contract inline persists to Supabase (survives page refresh)
  5. Re-analyzing a contract preserves resolved status and notes on matched findings, with rollback to previous state if analysis fails
**Plans**: 2 plans
Plans:
- [ ] 44-01-PLAN.md -- Supabase writes + rollback for delete, resolve, note, rename mutations
- [ ] 44-02-PLAN.md -- Re-analyze finding preservation batch writes to Supabase

### Phase 45: Cleanup
**Goal**: All localStorage contract storage code is removed now that Supabase handles all persistence -- storageManager retains only UI preferences
**Depends on**: Phase 44
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. No contract, finding, date, or company profile data is read from or written to localStorage (grep confirms zero localStorage contract access)
  2. Mock contract data file is deleted and not imported anywhere
  3. storageManager handles only UI preference keys (hide-resolved filter state) -- no contract storage methods remain
**Plans**: 1 plan
Plans:
- [ ] 45-01-PLAN.md -- [To be planned]

## Progress

**Execution Order:**
Phases execute in numeric order: 39 -> 40 -> 41 -> 42 -> 43 -> 44 -> 45

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Pipeline Foundation | v1.0 | 4/4 | Complete | 2026-03-04 |
| 2. Core Legal Risk Analysis | v1.0 | 2/2 | Complete | 2026-03-05 |
| 3. Extended Legal Coverage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 4. Scope, Compliance, and Verbiage | v1.0 | 2/2 | Complete | 2026-03-05 |
| 5. Negotiation Output and Organization | v1.0 | 2/2 | Complete | 2026-03-06 |
| 6. CategoryFilter Display Fix | v1.0 | 1/1 | Complete | 2026-03-06 |
| 7. Knowledge Architecture and Company Profile | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Pipeline Integration and Company-Specific Intelligence | v1.1 | 2/2 | Complete | 2026-03-09 |
| 9. CA Regulatory Knowledge | v1.1 | 2/2 | Complete | 2026-03-09 |
| 10. Industry and Trade Knowledge | v1.1 | 2/2 | Complete | 2026-03-10 |
| 11. Data Persistence | v1.2 | 1/1 | Complete | 2026-03-12 |
| 12. Contract Management | v1.2 | 1/1 | Complete | 2026-03-12 |
| 13. Upload Error Feedback | v1.2 | 2/2 | Complete | 2026-03-12 |
| 14. Empty States and Dashboard Polish | v1.2 | 1/1 | Complete | 2026-03-12 |
| 15. URL-based Routing | v1.3 | 1/1 | Complete | 2026-03-13 |
| 16. Finding Actions | v1.3 | 2/2 | Complete | 2026-03-13 |
| 17. Settings Validation | v1.3 | 1/1 | Complete | 2026-03-13 |
| 18. Re-analyze Contract | v1.3 | 1/1 | Complete | 2026-03-13 |
| 19. Export Report | v1.3 | 1/1 | Complete | 2026-03-13 |
| 20. Fix All Contracts Navigation | v1.3 | 1/1 | Complete | 2026-03-13 |
| 21. Fix Filtered CSV Export | v1.3 | 1/1 | Complete | 2026-03-13 |
| 22. Polish & Trust | v1.4 | 3/3 | Complete | 2026-03-14 |
| 23. Analysis Quality | v1.4 | 3/3 | Complete | 2026-03-14 |
| 24. Actionable Output | v1.4 | 2/2 | Complete | 2026-03-15 |
| 25. Portfolio Intelligence | v1.4 | 2/2 | Complete | 2026-03-15 |
| 26. Audit Gap Closure | v1.4 | 1/1 | Complete | 2026-03-15 |
| 27. Foundation Utilities | v1.5 | 2/2 | Complete | 2026-03-15 |
| 28. Hook Extraction | v1.5 | 2/2 | Complete | 2026-03-15 |
| 29. Component Decomposition + Toast Context | v1.5 | 3/3 | Complete | 2026-03-15 |
| 30. Type Safety Hardening | v1.5 | 3/3 | Complete | 2026-03-15 |
| 31. Server-side API Modularization | v1.5 | 1/1 | Complete | 2026-03-15 |
| 32. Type Safety Gap Closure | v1.5 | 1/1 | Complete | 2026-03-15 |
| 33. Test Infrastructure | v1.6 | 2/2 | Complete | 2026-03-16 |
| 34. Pure Logic Unit Tests | v1.6 | 3/3 | Complete | 2026-03-16 |
| 35. Hook Tests | v1.6 | 2/2 | Complete | 2026-03-16 |
| 36. Component Tests | v1.6 | 2/2 | Complete | 2026-03-16 |
| 37. API Integration Tests | v1.6 | 2/2 | Complete | 2026-03-16 |
| 38. UAT, CI, and Coverage Enforcement | v1.6 | 2/2 | Complete | 2026-03-16 |
| 39. Database Schema and RLS | 1/1 | Complete    | 2026-03-17 | - |
| 40. Authentication | 2/2 | Complete    | 2026-03-17 | - |
| 41. Contract Reads and Data Mapping | 2/2 | Complete    | 2026-03-17 | - |
| 42. Company Profile Migration | 1/1 | Complete    | 2026-03-18 | - |
| 43. Analysis Pipeline Server Writes | 2/2 | Complete    | 2026-03-18 | - |
| 44. Contract Operations | 1/2 | In Progress|  | - |
| 45. Cleanup | v2.0 | 0/0 | Not started | - |
