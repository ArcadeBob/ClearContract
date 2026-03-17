# Requirements: ClearContract

**Defined:** 2026-03-16
**Core Value:** Upload a contract, walk away with a complete breakdown -- risks, scope, dates, compliance -- with exact contract language quoted so you can act immediately.

## v2.0 Requirements

Requirements for Enterprise Foundation milestone. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign in with email and password on a login page
- [x] **AUTH-02**: User session persists across browser refresh and tab close
- [ ] **AUTH-03**: Unauthenticated users see only the login page (protected routes)
- [ ] **AUTH-04**: User can sign out via button in sidebar
- [x] **AUTH-05**: Login page shows clear error messages for invalid credentials
- [x] **AUTH-06**: App shows loading state while checking session (no login flash)

### Database Schema

- [x] **DB-01**: Contracts table in Postgres with RLS policy restricting access to owning user
- [x] **DB-02**: Findings table with foreign key to contracts and individual row CRUD
- [x] **DB-03**: Contract dates table with foreign key to contracts
- [x] **DB-04**: Company profiles table with single row per user (upsert pattern)
- [x] **DB-05**: RLS enabled on all tables with user-scoped policies
- [x] **DB-06**: Environment variables configured (anon key, service role key, Supabase URL)

### Data Access

- [ ] **DATA-01**: Type-safe mapper between Postgres snake_case and TypeScript camelCase
- [ ] **DATA-02**: Contracts load from Supabase on app mount (with nested findings and dates)
- [ ] **DATA-03**: Company profile reads and writes to Supabase
- [ ] **DATA-04**: All mutations use optimistic updates with rollback on failure

### Analysis Pipeline

- [ ] **PIPE-01**: API endpoint validates JWT before processing analysis
- [ ] **PIPE-02**: Server writes analysis results (contract, findings, dates) to Supabase
- [ ] **PIPE-03**: Client sends auth token with analysis request
- [ ] **PIPE-04**: Server reads company profile from database for analysis context

### Contract Operations

- [ ] **CRUD-01**: User can delete a contract (CASCADE deletes findings and dates)
- [ ] **CRUD-02**: User can resolve/unresolve individual findings
- [ ] **CRUD-03**: User can add, edit, and delete notes on findings
- [ ] **CRUD-04**: User can rename a contract inline
- [ ] **CRUD-05**: User can re-analyze a contract with finding preservation

### Cleanup

- [ ] **CLEAN-01**: localStorage contract storage code removed
- [ ] **CLEAN-02**: Mock contract data removed
- [ ] **CLEAN-03**: storageManager simplified to UI preferences only

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Storage

- **STORE-01**: Original PDF files stored in Supabase Storage for re-download
- **STORE-02**: Analysis version history (keep previous results on re-analyze)

### Auth Enhancements

- **AUTH-07**: Password reset flow via email
- **AUTH-08**: User registration UI (currently pre-created in Supabase dashboard)
- **AUTH-09**: OAuth / social login providers

### Real-time

- **RT-01**: Real-time subscriptions for live data updates
- **RT-02**: Multi-user support with team visibility

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User registration UI | Single user; pre-create account in Supabase dashboard |
| Password reset flow | Single user; reset via Supabase dashboard if needed |
| OAuth / social login | Not needed for single-user deployment |
| Real-time subscriptions | Single user; no concurrent editors |
| localStorage data migration | Fresh start per user decision; no migration code |
| Email verification | Single user; trusted email; disable in Supabase settings |
| PDF file storage | Not requested; re-analyze re-uploads PDF |
| Analysis version history | Not requested; re-analyze overwrites previous results |
| Multi-user / team features | Out of scope per PROJECT.md |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 40 | Complete |
| AUTH-02 | Phase 40 | Complete |
| AUTH-03 | Phase 40 | Pending |
| AUTH-04 | Phase 40 | Pending |
| AUTH-05 | Phase 40 | Complete |
| AUTH-06 | Phase 40 | Complete |
| DB-01 | Phase 39 | Complete |
| DB-02 | Phase 39 | Complete |
| DB-03 | Phase 39 | Complete |
| DB-04 | Phase 39 | Complete |
| DB-05 | Phase 39 | Complete |
| DB-06 | Phase 39 | Complete |
| DATA-01 | Phase 41 | Pending |
| DATA-02 | Phase 41 | Pending |
| DATA-03 | Phase 42 | Pending |
| DATA-04 | Phase 44 | Pending |
| PIPE-01 | Phase 43 | Pending |
| PIPE-02 | Phase 43 | Pending |
| PIPE-03 | Phase 43 | Pending |
| PIPE-04 | Phase 43 | Pending |
| CRUD-01 | Phase 44 | Pending |
| CRUD-02 | Phase 44 | Pending |
| CRUD-03 | Phase 44 | Pending |
| CRUD-04 | Phase 44 | Pending |
| CRUD-05 | Phase 44 | Pending |
| CLEAN-01 | Phase 45 | Pending |
| CLEAN-02 | Phase 45 | Pending |
| CLEAN-03 | Phase 45 | Pending |

**Coverage:**
- v2.0 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
