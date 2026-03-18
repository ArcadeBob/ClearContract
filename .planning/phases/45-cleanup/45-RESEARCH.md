# Phase 45: Cleanup - Research

**Researched:** 2026-03-18
**Domain:** Code removal / dead code cleanup
**Confidence:** HIGH

## Summary

Phase 45 is a deletion-focused phase. All contract persistence has been migrated to Supabase (Phases 41-44), leaving behind dead localStorage code that is no longer called from production paths. The work involves removing three categories of dead code: (1) the entire `contractStorage.ts` module and its mock data dependency, (2) the `profileLoader.ts` file (no longer imported anywhere), and (3) contract-related keys from `storageManager.ts` while preserving the `hide-resolved` UI preference key.

The codebase investigation reveals a clean separation: `useContractStore` already loads from Supabase, `useCompanyProfile` already reads/writes to Supabase, and only `useContractFiltering` legitimately uses `storageManager` for the `hide-resolved` UI preference. Several test files still mock the old `contractStorage` module and will need updating.

**Primary recommendation:** Delete dead files, trim storageManager to UI-preference-only keys, update stale test mocks, verify with grep and build.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEAN-01 | localStorage contract storage code removed | contractStorage.ts is dead code (no production imports); storageManager registry has contract keys to remove; profileLoader.ts is orphaned |
| CLEAN-02 | Mock contract data removed | mockContracts.ts only imported by contractStorage.ts (which is being deleted); no other imports found |
| CLEAN-03 | storageManager simplified to UI preferences only | Only `hide-resolved` key is used in production (by useContractFiltering); all other keys are dead |
</phase_requirements>

## Files to Delete

| File | Reason | Confidence |
|------|--------|------------|
| `src/storage/contractStorage.ts` | Dead code -- not imported by any production module (only by its own test and stale test mocks) | HIGH |
| `src/storage/contractStorage.test.ts` | Tests for deleted module | HIGH |
| `src/data/mockContracts.ts` | Only imported by contractStorage.ts (being deleted) | HIGH |
| `src/knowledge/profileLoader.ts` | Zero imports found anywhere in codebase -- completely orphaned | HIGH |

## Files to Modify

### `src/storage/storageManager.ts`
**Current state:** StorageRegistry has 5 keys:
- `clearcontract:contracts` (Contract[]) -- REMOVE
- `clearcontract:contracts-seeded` (string) -- REMOVE
- `clearcontract:schema-version` (string) -- REMOVE
- `clearcontract:company-profile` (CompanyProfile) -- REMOVE
- `clearcontract:hide-resolved` (string) -- KEEP

**Action:** Remove contract/profile keys from registry. Remove `Contract` and `CompanyProfile` type imports. Keep `load`/`save`/`loadRaw`/`saveRaw`/`remove` functions (they are generic utilities). The registry will have only `hide-resolved`.

### `src/storage/storageManager.test.ts`
**Current state:** Tests reference `clearcontract:contracts` and `clearcontract:contracts-seeded` keys.
**Action:** Rewrite tests to use only the `clearcontract:hide-resolved` key. Keep all function-level tests (load, save, loadRaw, saveRaw, remove) but with the surviving key.

### `src/hooks/__tests__/useContractStore.test.ts`
**Current state:** Mocks `contractStorage` module (loadContracts, saveContracts). References `storageWarning`, `dismissStorageWarning`, `migrationWarning` -- all properties that no longer exist on the Supabase-based hook.
**Action:** This test file is entirely stale. It tests the old localStorage-based hook, not the current Supabase-based one. It needs a complete rewrite or deletion. The current `useContractStore` has: contracts loaded via Supabase `useEffect`, `deleteContract`/`toggleFindingResolved`/`updateFindingNote`/`renameContract` with optimistic updates. The test should mock `supabase` instead.

### `src/App.test.tsx`
**Current state:** Lines 19-23 mock `contractStorage` to avoid localStorage issues.
**Action:** Remove the `vi.mock('./storage/contractStorage', ...)` block. The current `useContractStore` does not import `contractStorage` -- this mock is dead.

## Architecture Patterns

### Safe Deletion Pattern
For each file/code block to remove:
1. Grep for all imports/references across the entire codebase
2. Remove the code
3. Run `npm run build` (TypeScript will catch any broken imports)
4. Run `npm run lint` to catch unused import warnings

### StorageManager Simplification
The simplified storageManager should look like:

```typescript
export interface StorageRegistry {
  'clearcontract:hide-resolved': string;
}

export type StorageKey = keyof StorageRegistry;
```

No domain type imports needed. The generic `load`/`save`/`loadRaw`/`saveRaw`/`remove` functions stay unchanged -- they are typed against `StorageRegistry` and will automatically narrow to only the surviving key.

## Common Pitfalls

### Pitfall 1: Stale Test Mocks
**What goes wrong:** Tests mock modules that no longer exist or have changed shape. Tests pass because mocks intercept everything, hiding real breakage.
**How to avoid:** After deleting contractStorage, run the full test suite. Any test that mocks it will fail at the `vi.mock()` call if the module path no longer resolves. Fix each one.

### Pitfall 2: Missing the profileLoader Orphan
**What goes wrong:** profileLoader.ts imports from storageManager using the `company-profile` key. If you only trim the registry without deleting profileLoader, TypeScript will error.
**How to avoid:** Delete profileLoader.ts first (it has zero importers), then trim the registry.

### Pitfall 3: Test Suite Regression
**What goes wrong:** The useContractStore test file tests a version of the hook that no longer exists (localStorage-based). Deleting contractStorage breaks the mock but the test assertions are also wrong for the current hook shape.
**How to avoid:** Either delete the stale test file entirely or rewrite it for the Supabase-based hook. Given this is a cleanup phase, deletion is simpler; rewriting is a separate concern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying no dead references | Manual file-by-file checking | `npm run build` (tsc) | TypeScript catches all broken imports at compile time |
| Finding all localStorage references | Manual grep | `grep -r "localStorage\|contractStorage\|mockContracts\|profileLoader"` | Systematic, catches indirect references |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | No localStorage contract access | smoke | `npm run build && grep -r "contractStorage\|loadContracts\|saveContracts" src/ --include="*.ts" --include="*.tsx" -l` | N/A (grep check) |
| CLEAN-02 | Mock data file deleted and not imported | smoke | `test ! -f src/data/mockContracts.ts && npm run build` | N/A (file absence check) |
| CLEAN-03 | storageManager has only hide-resolved key | unit | `npx vitest run src/storage/storageManager.test.ts` | Yes (needs update) |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full build + test suite green + grep confirms zero contract localStorage references

### Wave 0 Gaps
- [ ] `src/storage/storageManager.test.ts` -- needs rewrite for trimmed registry
- [ ] `src/hooks/__tests__/useContractStore.test.ts` -- entirely stale, needs deletion or rewrite

## Open Questions

1. **Should useContractStore.test.ts be rewritten or deleted?**
   - What we know: The test file tests a localStorage-based hook that no longer exists. The current hook uses Supabase with async operations, optimistic updates, and toast notifications -- a fundamentally different shape.
   - Recommendation: Delete the stale file in this cleanup phase. Rewriting it properly (with Supabase mocks, async act() wrappers) is out of scope for cleanup. Note: STATE.md mentions "Test suite (271 tests) mocks localStorage -- will need Supabase mocking updates" as a known concern.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection via grep and file reads
- `useContractStore.ts` -- confirmed Supabase-only, no contractStorage import
- `useCompanyProfile.ts` -- confirmed Supabase-only, no profileLoader import
- `useContractFiltering.ts` -- confirmed only user of `hide-resolved` key

## Metadata

**Confidence breakdown:**
- Files to delete: HIGH -- verified zero production imports via grep
- StorageManager simplification: HIGH -- registry keys and usages fully mapped
- Test impact: HIGH -- all affected test files identified and read

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- deletion scope is fixed)
