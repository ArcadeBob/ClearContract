# Phase 44: Contract Operations - Research

**Researched:** 2026-03-18
**Domain:** Supabase client-side mutations with optimistic UI updates
**Confidence:** HIGH

## Summary

Phase 44 wires all existing in-memory-only mutation methods in `useContractStore` to Supabase Postgres. The five mutations (delete contract, resolve/unresolve finding, add/edit/delete finding note, rename contract) each follow an identical pattern: snapshot current state, update UI optimistically, fire Supabase write, rollback on failure with error toast. The re-analyze flow (handled in `App.tsx`) additionally requires batch-updating preserved finding fields after the server response.

All infrastructure is already in place: `supabase` client is imported in `useContractStore`, `mapToSnake` handles field conversion, `useToast` provides error notifications, and the five mutation methods already work in-memory. The work is purely additive -- each method gains a Supabase write call and rollback logic.

**Primary recommendation:** Modify each of the five mutation methods in `useContractStore` to follow snapshot-update-write-rollback pattern using `supabase.from('table').delete/update()`. Add batch finding update logic to `handleReanalyze` in `App.tsx` for preservation writes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- True optimistic updates with rollback on all mutations (not fire-and-forget)
- Full array snapshot before each mutation: `const prev = [...contracts]`, restore on failure
- All optimistic logic lives inside `useContractStore` -- each mutation method snapshots state, updates UI, fires Supabase write, and reverts on failure
- Supabase client imported directly in useContractStore (already done for fetch-on-mount)
- Consistent pattern across all mutations including resolve/unresolve (no fire-and-forget exceptions)
- Delete: existing confirmation dialog stays as-is, CASCADE handles findings/dates, navigate to dashboard if on deleted contract's review page
- Inline rename: save on blur AND Enter, Escape cancels, follows existing useInlineEdit hook
- Finding resolve/unresolve: toggle UI immediately, write `resolved` boolean to findings table
- Finding note CRUD: write on explicit save action (blur, Enter, or save button), not on keystroke
- Re-analyze: server owns writes (Phase 43), client does finding preservation via composite key matching (clauseReference+category), preserved fields written back via batch update
- Rollback on re-analyze failure: snapshot in-memory state, restore if server fails
- Error feedback: generic per-operation messages, no Supabase details to user, no retry button, console.error for debugging

### Claude's Discretion
- Exact helper function organization within useContractStore (inline vs extracted)
- Whether to create a shared `optimisticMutation` wrapper or keep each mutation self-contained
- Exact `mapToSnake` field selection for each mutation's write payload
- Toast message wording (follow pattern: "Failed to [verb]. Changes reverted.")
- Whether `useInlineEdit` hook needs modification or a new wrapper handles the Supabase write

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRUD-01 | User can delete a contract (CASCADE deletes findings and dates) | Supabase `.delete()` with `.eq('id', contractId)` on contracts table; CASCADE FK handles child rows automatically |
| CRUD-02 | User can resolve/unresolve individual findings | Supabase `.update({ resolved: !current })` on findings table with `.eq('id', findingId)` |
| CRUD-03 | User can add, edit, and delete notes on findings | Supabase `.update({ note: value })` on findings table; delete = set note to empty string |
| CRUD-04 | User can rename a contract inline | Supabase `.update({ name: newName })` on contracts table; integrate with useInlineEdit onSave |
| CRUD-05 | User can re-analyze a contract with finding preservation | After server re-analyze response, batch `.update()` preserved findings back to Supabase |
| DATA-04 | All mutations use optimistic updates with rollback on failure | Snapshot `[...contracts]` before mutation, restore on Supabase error, show error toast |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.99.2 | Client-side Supabase mutations | Already installed; provides `.from().update()`, `.delete()` with RLS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new dependencies) | - | - | All required libraries are already installed |

**No new dependencies required.** All mutations use existing `supabase` client, `mapToSnake`, `useToast`, and `useInlineEdit`.

## Architecture Patterns

### Pattern 1: Optimistic Mutation with Rollback

**What:** Snapshot state, update UI, fire async write, revert on failure.
**When to use:** Every mutation in this phase.

```typescript
// Inside useContractStore
const deleteContract = async (id: string) => {
  const prev = [...contracts]; // snapshot for rollback
  setContracts((c) => c.filter((x) => x.id !== id)); // optimistic remove

  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete contract:', error);
    setContracts(prev); // rollback
    showToast({ type: 'error', message: 'Failed to delete contract. Changes reverted.' });
  }
};
```

**Key detail:** The mutation methods become `async` functions. Callers do NOT need to await them -- the optimistic update is synchronous (via `setContracts`), and the Supabase write runs in the background. The caller sees instant UI feedback.

### Pattern 2: Single-Field Finding Update

**What:** Update one column on a single finding row.
**When to use:** resolve/unresolve (`resolved` column) and notes (`note` column).

```typescript
const toggleFindingResolved = async (contractId: string, findingId: string) => {
  const prev = [...contracts];
  const contract = contracts.find((c) => c.id === contractId);
  const finding = contract?.findings.find((f) => f.id === findingId);
  if (!finding) return;

  const newResolved = !finding.resolved;

  // Optimistic update
  setContracts((cs) =>
    cs.map((c) =>
      c.id === contractId
        ? { ...c, findings: c.findings.map((f) =>
            f.id === findingId ? { ...f, resolved: newResolved } : f
          )}
        : c
    )
  );

  // Persist
  const { error } = await supabase
    .from('findings')
    .update({ resolved: newResolved })
    .eq('id', findingId);

  if (error) {
    console.error('Failed to toggle resolved:', error);
    setContracts(prev);
    showToast({ type: 'error', message: 'Failed to update finding. Changes reverted.' });
  }
};
```

### Pattern 3: Batch Finding Update for Re-analyze Preservation

**What:** After re-analyze, write preserved `resolved` and `note` values back to Supabase for matched findings.
**When to use:** In `handleReanalyze` in `App.tsx` after the finding merge loop.

```typescript
// After mergedFindings is computed, write preserved fields back
const preserveWrites = mergedFindings
  .filter((f: Finding) => f.resolved || f.note)
  .map((f: Finding) =>
    supabase
      .from('findings')
      .update({ resolved: f.resolved, note: f.note || '' })
      .eq('id', f.id)
  );

const results = await Promise.all(preserveWrites);
const failed = results.filter((r) => r.error);
if (failed.length > 0) {
  console.error('Failed to persist some preserved findings:', failed);
  // Non-fatal: findings are already correct in-memory and in the server's new rows
}
```

### Pattern 4: Toast Integration in useContractStore

**What:** The store hook needs access to `showToast` for error feedback.
**When to use:** When converting mutation methods to async with Supabase writes.

**Design decision:** The `useContractStore` hook currently does not depend on `useToast`. There are two approaches:

1. **Accept showToast as parameter** -- pass `showToast` into each mutation call from the component
2. **Import useToast inside useContractStore** -- hook calls hook directly

Option 2 is cleaner since it avoids changing every call site. `useContractStore` already uses `useEffect` and `useState`, so adding `useToast` is consistent. The hook must be called inside a component wrapped by `ToastProvider`, which is already the case (`AuthenticatedApp` is rendered inside `ToastProvider`).

```typescript
export function useContractStore() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const { showToast } = useToast(); // Add this
  // ...
}
```

### Anti-Patterns to Avoid
- **Awaiting Supabase writes before updating UI:** The whole point of optimistic updates is instant feedback. Update state first, write async.
- **Forgetting to snapshot before setState:** The snapshot must be captured from the current `contracts` value, not from the setter callback's `prev` parameter (which may be stale by rollback time).
- **Using `.single()` on delete:** Supabase `.delete()` does not need `.single()` -- it returns the deleted rows by default. Adding `.single()` on a CASCADE delete with child rows can cause confusion.
- **Sending entire contract object in update:** Only send the changed column(s). For rename, send `{ name }` only. For resolve, send `{ resolved }` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snake-case conversion | Manual field mapping per mutation | `mapToSnake()` from `src/lib/mappers.ts` | Already tested, handles all fields consistently |
| Toast notifications | Custom error UI per mutation | `useToast().showToast()` | Existing system with auto-dismiss and animation |
| Inline edit state | Custom edit state per rename location | `useInlineEdit` hook | Already handles Enter/Escape/blur, just wire onSave to store |
| Cascade deletes | Manual deletion of findings + dates before contract | PostgreSQL `ON DELETE CASCADE` | Schema already defines cascading FKs |

## Common Pitfalls

### Pitfall 1: Stale Snapshot in Async Rollback
**What goes wrong:** If multiple mutations fire concurrently, a rollback might restore an outdated snapshot that overwrites a newer successful mutation.
**Why it happens:** `const prev = [...contracts]` captures state at call time, but another mutation may have changed state before the rollback fires.
**How to avoid:** For this app (single user, infrequent mutations), this is extremely unlikely. The simple snapshot pattern is sufficient. If it becomes an issue, use functional state updates for rollback: `setContracts(() => prev)`.
**Warning signs:** Mutations appearing to "undo" unrelated changes.

### Pitfall 2: Missing RLS Context
**What goes wrong:** Supabase mutations fail with permission denied.
**Why it happens:** The anon key client only passes RLS if the user's auth session is active. If the session expires mid-use, writes silently fail.
**How to avoid:** The `supabase` client already uses the anon key with RLS. The `AuthContext` handles session refresh via `onAuthStateChange`. Supabase JS v2 auto-refreshes tokens. Just ensure error handling catches the permission error and shows the toast.
**Warning signs:** `error.code === '42501'` (insufficient privilege) or `error.message` containing "new row violates row-level security policy".

### Pitfall 3: Re-analyze Finding IDs Change
**What goes wrong:** After re-analyze, the server creates entirely new finding rows with new UUIDs. The old finding IDs no longer exist in the database.
**Why it happens:** Phase 43 server re-analyze deletes old findings and inserts new ones.
**How to avoid:** The batch preservation update must use the NEW finding IDs from the server response, not the old ones. The merge loop in `handleReanalyze` already produces `mergedFindings` with the new IDs -- use those for the batch update.
**Warning signs:** Supabase update returns 0 affected rows.

### Pitfall 4: mapToSnake Not Needed for Single-Column Updates
**What goes wrong:** Overhead of converting a single known column name.
**Why it happens:** `mapToSnake` is designed for multi-field object conversion. For single-column updates like `{ resolved: true }` or `{ note: 'text' }`, the column name is already snake_case.
**How to avoid:** Use `mapToSnake` for multi-field updates (like rename if combined with other fields). For single-column updates where the column name matches (resolved, note, name), use the literal object directly.
**Warning signs:** None -- this is an optimization, not a bug.

### Pitfall 5: Async Mutation Methods and Component Lifecycle
**What goes wrong:** `setContracts` called after component unmounts (React warning).
**Why it happens:** User navigates away before Supabase write completes.
**How to avoid:** For this app this is benign -- `AuthenticatedApp` is mounted for the entire session. The state lives at the top level and is not unmounted during navigation. No cleanup needed.

## Code Examples

### Complete deleteContract with Supabase
```typescript
const deleteContract = async (id: string) => {
  const prev = [...contracts];
  setContracts((c) => c.filter((x) => x.id !== id));

  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete contract:', error);
    setContracts(prev);
    showToast({ type: 'error', message: 'Failed to delete contract. Changes reverted.' });
  }
};
```

### Complete updateFindingNote with Supabase
```typescript
const updateFindingNote = async (contractId: string, findingId: string, note: string | undefined) => {
  const prev = [...contracts];
  const noteValue = note ?? '';

  setContracts((cs) =>
    cs.map((c) =>
      c.id === contractId
        ? { ...c, findings: c.findings.map((f) =>
            f.id === findingId ? { ...f, note: noteValue } : f
          )}
        : c
    )
  );

  const { error } = await supabase
    .from('findings')
    .update({ note: noteValue })
    .eq('id', findingId);

  if (error) {
    console.error('Failed to save note:', error);
    setContracts(prev);
    showToast({ type: 'error', message: 'Failed to save note. Changes reverted.' });
  }
};
```

### Complete rename via updateContract
```typescript
const renameContract = async (id: string, name: string) => {
  const prev = [...contracts];
  setContracts((cs) =>
    cs.map((c) => (c.id === id ? { ...c, name } : c))
  );

  const { error } = await supabase
    .from('contracts')
    .update({ name })
    .eq('id', id);

  if (error) {
    console.error('Failed to rename contract:', error);
    setContracts(prev);
    showToast({ type: 'error', message: 'Failed to rename contract. Changes reverted.' });
  }
};
```

### Batch preservation update in handleReanalyze
```typescript
// After computing mergedFindings with preserved resolved/note values...
const findingsToUpdate = mergedFindings.filter(
  (f: Finding) => f.resolved || (f.note && f.note !== '')
);

if (findingsToUpdate.length > 0) {
  const writeResults = await Promise.all(
    findingsToUpdate.map((f: Finding) =>
      supabase
        .from('findings')
        .update({ resolved: f.resolved, note: f.note || '' })
        .eq('id', f.id)
    )
  );

  const failures = writeResults.filter((r) => r.error);
  if (failures.length > 0) {
    console.error('Some finding preservation writes failed:', failures.map((r) => r.error));
    // Non-blocking: in-memory state is correct, and findings are in DB from server write
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| In-memory only mutations | Supabase-persisted with optimistic UI | This phase | Data survives page refresh |
| Fire-and-forget (Phase 42 profile) | True optimistic with rollback | This phase | Consistent error handling across all mutations |

## Open Questions

1. **Should `updateContract` remain a general-purpose method or be split?**
   - What we know: Currently `updateContract(id, updates)` accepts any `Partial<Contract>`. For rename, only `name` changes. For re-analyze, the entire contract is replaced.
   - What's unclear: Whether a single Supabase-aware `updateContract` method should handle both cases, or if rename gets its own method.
   - Recommendation: Keep `updateContract` as the general in-memory updater (used by re-analyze which does its own server writes). Add a dedicated `renameContract` method that does both in-memory update and Supabase write. This avoids the complexity of detecting which fields changed in a general update method.

2. **Toast auto-dismiss timing for error toasts**
   - What we know: Current ToastProvider auto-dismisses after 3 seconds unless `onRetry` is provided. CONTEXT says no retry button for mutation errors.
   - What's unclear: Whether 3-second auto-dismiss is long enough for error messages.
   - Recommendation: Error toasts without `onRetry` will auto-dismiss in 3 seconds. This matches existing behavior. If needed, can be adjusted later.

## Sources

### Primary (HIGH confidence)
- `src/hooks/useContractStore.ts` -- current mutation methods (read directly)
- `src/lib/supabase.ts` -- Supabase client config (read directly)
- `src/lib/mappers.ts` -- mapToSnake utility (read directly)
- `src/hooks/useInlineEdit.ts` -- inline edit hook (read directly)
- `supabase/migrations/00000000000000_initial_schema.sql` -- table schema with CASCADE (read directly)
- `src/App.tsx` -- handleReanalyze flow (read directly)
- `@supabase/supabase-js` v2.99.2 installed -- verified via package.json

### Secondary (MEDIUM confidence)
- Supabase JS v2 `.update()` / `.delete()` API -- well-established, stable API surface since v2.0

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already installed and in use
- Architecture: HIGH -- pattern is straightforward (optimistic + rollback), all integration points read directly from source
- Pitfalls: HIGH -- identified from direct code analysis, especially re-analyze ID change and RLS session concerns

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain, no external dependency changes expected)
