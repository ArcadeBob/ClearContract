# Phase 44: Contract Operations - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all user-initiated mutations (delete contract, resolve/unresolve finding, add/edit/delete finding notes, rename contract, re-analyze contract) to Supabase with optimistic UI updates and rollback on failure. Every mutation that currently operates in-memory only must persist to Postgres and survive page refresh.

</domain>

<decisions>
## Implementation Decisions

### Optimistic update pattern
- True optimistic updates with rollback on all mutations (not fire-and-forget)
- Full array snapshot before each mutation: `const prev = [...contracts]`, restore on failure
- All optimistic logic lives inside `useContractStore` — each mutation method snapshots state, updates UI, fires Supabase write, and reverts on failure
- Supabase client (`src/lib/supabase.ts`) imported directly in useContractStore (already done for fetch-on-mount)
- Consistent pattern across all mutations including resolve/unresolve (no fire-and-forget exceptions)

### Delete confirmation flow
- Existing confirmation dialog stays as-is — simple "Delete this contract? This cannot be undone." (no cascade detail counts)
- After confirm: remove contract from UI immediately (optimistic), then fire Supabase delete
- Supabase CASCADE handles findings and dates deletion automatically
- If Supabase delete fails: rollback (contract reappears in UI) with error toast
- After successful delete: navigate to dashboard if user was on the deleted contract's review page

### Inline rename
- Save on blur AND on Enter key press (Escape cancels without saving)
- Follows existing `useInlineEdit` hook pattern enhanced with Supabase write + rollback
- Optimistic: update UI immediately, write to Supabase, revert on failure

### Finding resolve/unresolve
- Full optimistic with rollback (consistent with all other mutations)
- Toggle UI immediately, write `resolved` boolean to findings table, revert on failure

### Finding note CRUD
- Write to Supabase on explicit save action (blur, Enter, or save button) — not on every keystroke
- Matches onBlur persistence pattern from Phase 42
- Add/edit: update `note` field on finding row in Supabase
- Delete: set `note` to empty string (or null) in Supabase

### Re-analyze + finding preservation
- Server owns re-analyze writes (Phase 43 decision) — server updates existing contract row, replaces findings/dates
- Finding preservation stays client-side: client receives server response, runs composite key matching (clauseReference+category), copies resolved/notes from old to new findings
- Preserved fields written back to Supabase via batch update — one update per matched finding that gained preserved values
- Rollback on re-analyze failure: snapshot in-memory state before re-analyze, restore snapshot if server fails (DB still has original data, no DB rollback needed)

### Error feedback
- Generic per-operation error messages: "Failed to delete contract. Changes reverted." / "Failed to save note. Changes reverted."
- No Supabase error details shown to user
- No retry button in toast — user can just redo the action manually (button is still right there)
- Full Supabase error logged to `console.error` for debugging (matches existing server-side logging convention)

### Claude's Discretion
- Exact helper function organization within useContractStore (inline vs extracted)
- Whether to create a shared `optimisticMutation` wrapper or keep each mutation self-contained
- Exact `mapToSnake` field selection for each mutation's write payload
- Toast message wording (follow pattern: "Failed to [verb]. Changes reverted.")
- Whether `useInlineEdit` hook needs modification or a new wrapper handles the Supabase write

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database schema (source of truth for column names and constraints)
- `supabase/migrations/00000000000000_initial_schema.sql` — All table definitions: contracts, findings, contract_dates; column types, CASCADE deletes, RLS policies
- `.planning/phases/39-database-schema-and-rls/39-CONTEXT.md` — Schema decisions: TEXT+CHECK over ENUMs, CASCADE deletes, RLS policy patterns, (select auth.uid()) subquery

### Current mutation code (modify)
- `src/hooks/useContractStore.ts` — Central state hook with all five mutation methods (addContract, updateContract, deleteContract, toggleFindingResolved, updateFindingNote) currently in-memory only. Add Supabase writes + rollback here.
- `src/lib/supabase.ts` — Supabase client singleton (anon key, RLS) — import directly in useContractStore
- `src/lib/mappers.ts` — `mapToSnake()` for camelCase-to-snake_case write payloads

### Inline edit (reference for rename)
- `src/hooks/useInlineEdit.ts` — Existing inline edit hook with onBlur persistence. Enhance or wrap for Supabase writes.

### Re-analyze flow (modify for preservation writes)
- `src/App.tsx` — `handleReanalyze` function: calls analyzeContract, receives server response, runs finding preservation. Add Supabase batch update for preserved fields.
- `src/api/analyzeContract.ts` — Client-side API wrapper (Phase 43 already sends auth token)

### Toast system
- `src/contexts/ToastContext.tsx` — ToastProvider with useToast hook for error/success notifications

### Prior phase decisions
- `.planning/phases/42-company-profile-migration/42-CONTEXT.md` — Fire-and-forget upsert, mapToSnake pattern, meta column exclusion
- `.planning/phases/43-analysis-pipeline-server-writes/43-CONTEXT.md` — Server owns creation/re-analyze writes, finding preservation via composite key, structuredClone rollback

### Requirements
- `.planning/REQUIREMENTS.md` — CRUD-01 (delete), CRUD-02 (resolve), CRUD-03 (notes), CRUD-04 (rename), CRUD-05 (re-analyze preservation), DATA-04 (optimistic updates with rollback)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useContractStore` (`src/hooks/useContractStore.ts`): All five mutation methods already work in-memory — add Supabase writes alongside
- `mapToSnake()` (`src/lib/mappers.ts`): Convert camelCase fields to snake_case for Supabase updates
- `useInlineEdit` (`src/hooks/useInlineEdit.ts`): Inline edit with onBlur — enhance for rename with Supabase
- `useToast` hook: Error notifications for failed mutations
- `supabase` client (`src/lib/supabase.ts`): Already imported in useContractStore for fetch queries
- `classifyError()` (`src/utils/errors.ts`): Error classification utility

### Established Patterns
- Hooks own their state (useContractStore, useCompanyProfile, useRouter)
- Phase 42 fire-and-forget for profile writes (this phase upgrades to true optimistic for contracts)
- `console.error` for error logging (no structured logging)
- Named exports only, no default exports
- `mapToSnake` with meta column exclusion (id, created_at, updated_at) from write payloads

### Integration Points
- `deleteContract()` called from AllContracts page and ContractReview page (via confirmation dialog)
- `toggleFindingResolved()` called from FindingCard component
- `updateFindingNote()` called from FindingCard component
- Inline rename called from ContractReview header and AllContracts list
- `handleReanalyze` in App.tsx calls analyzeContract then runs finding preservation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard optimistic update pattern with the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 44-contract-operations*
*Context gathered: 2026-03-18*
