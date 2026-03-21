# Phase 50: Dead Code Cleanup - Research

**Researched:** 2026-03-20
**Domain:** Code cleanup / dead code removal
**Confidence:** HIGH

## Summary

Phase 50 is a surgical cleanup of three specific residual items left over from the Supabase migration (v2.0). All targets have been verified by direct inspection of the current codebase. The changes are low-risk removals with no functional impact -- no production code consumes the dead code, no new dependencies are introduced, and the file being referenced in coverage config was already deleted in Phase 45.

Current test baseline is 430 tests across 52 files, all passing. The cleanup will reduce this by exactly 1 test (the isUploading test block at lines 330-344 of useContractStore.test.ts). Build and lint are both green.

**Primary recommendation:** Execute all three cleanup items in a single plan/wave since they are independent, trivial edits with no interaction effects.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **CLEAN-01 (isUploading removal):** Delete `isUploading` useState and `setIsUploading` from `useContractStore.ts` (lines 12, 173-174). Delete the corresponding test in `useContractStore.test.ts` (lines 330-343). No production code consumes these.
- **CLEAN-02 (.env.example correction):** Remove `SUPABASE_ANON_KEY=your_supabase_anon_key` (line 3). `VITE_SUPABASE_ANON_KEY` already exists on line 6. `SUPABASE_SERVICE_ROLE_KEY` stays.
- **CLEAN-03 (mockContracts.ts cleanup):** File was already deleted in Phase 45. Remove stale coverage exclusion in `vite.config.ts` line 35. Update CLAUDE.md source layout to remove the `mockContracts.ts` line.

### Claude's Discretion
- Whether to remove the empty `src/data/` directory if mockContracts.ts was the only file in it
- Exact commit message wording

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEAN-01 | isUploading/setIsUploading removed from useContractStore | Verified: only references are in useContractStore.ts (lines 12, 173-174) and its test (lines 330-343). Zero production consumers. |
| CLEAN-02 | .env.example corrected (VITE_SUPABASE_ANON_KEY, not SUPABASE_ANON_KEY) | Verified: line 3 has stale `SUPABASE_ANON_KEY`, line 6 has correct `VITE_SUPABASE_ANON_KEY`. Remove line 3. |
| CLEAN-03 | mockContracts.ts excluded from coverage or deleted if unused | Verified: file already deleted (Phase 45). Stale reference in vite.config.ts line 35 and CLAUDE.md line 68 need removal. |
</phase_requirements>

## Standard Stack

No new libraries or tools needed. This phase only modifies existing files.

### Tools Used
| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Test runner | Existing -- verify 429 tests pass after removing 1 |
| Vite | Build tool | Existing -- verify `npm run build` succeeds |
| ESLint | Linter | Existing -- verify `npm run lint` passes |

## Architecture Patterns

Not applicable -- this phase removes code, it does not add any.

### Files to Modify (verified by grep)

| File | Change | Lines |
|------|--------|-------|
| `src/hooks/useContractStore.ts` | Remove `isUploading` useState declaration | Line 12 |
| `src/hooks/useContractStore.ts` | Remove `isUploading` and `setIsUploading` from return object | Lines 173-174 |
| `src/hooks/__tests__/useContractStore.test.ts` | Remove entire "exposes isUploading and setIsUploading" test block | Lines 330-344 |
| `.env.example` | Remove `SUPABASE_ANON_KEY=your_supabase_anon_key` line | Line 3 |
| `vite.config.ts` | Remove `'src/data/mockContracts.ts'` from coverage exclude array | Line 35 |
| `CLAUDE.md` | Remove `data/mockContracts.ts` line from source layout | Line 68 |

### Discretionary: Empty Directory Cleanup

**Recommendation: Remove `src/data/` directory.** Verified it is completely empty (mockContracts.ts was its only file, deleted in Phase 45). An empty directory serves no purpose and is confusing. Also remove the `data/` line from CLAUDE.md source layout if present.

## Don't Hand-Roll

Not applicable -- no new functionality being built.

## Common Pitfalls

### Pitfall 1: Forgetting Return Type Impact
**What goes wrong:** If any component or mock destructures `isUploading` or `setIsUploading` from `useContractStore()`, removing them causes a TypeScript error.
**Why it happens:** Grep might miss dynamic destructuring patterns.
**How to avoid:** Already verified -- `grep -r "isUploading\|setIsUploading" src/` returns only the hook definition and its test. No production consumers exist.
**Warning signs:** Build failure after edit.

### Pitfall 2: Test Count Mismatch
**What goes wrong:** CI or verification expects exact test count and fails.
**Why it happens:** Removing the isUploading test reduces count from 430 to 429.
**How to avoid:** Document expected count change. Verify with `npm run test -- --run`.

### Pitfall 3: Coverage Threshold Regression
**What goes wrong:** Removing the coverage exclusion for a non-existent file should be harmless, but if Vitest/v8 behaves unexpectedly with missing exclusion targets, coverage numbers could shift.
**How to avoid:** The file does not exist, so the exclusion line is already a no-op. Removing it changes nothing in practice. Verify coverage thresholds still pass after change.

### Pitfall 4: Stale .env.example Breaking Onboarding
**What goes wrong:** A developer copies .env.example and gets a non-VITE-prefixed key that does nothing on the client side.
**How to avoid:** This is exactly what CLEAN-02 fixes. After removal, the remaining keys are: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Code Examples

### CLEAN-01: useContractStore.ts after cleanup (return object)
```typescript
return {
    contracts,
    isLoading,
    error,
    addContract,
    updateContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
    renameContract,
  };
```

### CLEAN-02: .env.example after cleanup
```
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### CLEAN-03: vite.config.ts coverage exclude after cleanup
```typescript
exclude: [
  'src/test/**',
  'api/test-fixtures/**',
  '**/*.test.{ts,tsx}',
  '**/*.d.ts',
  'src/index.tsx',
  'src/vite-env.d.ts',
],
```

## State of the Art

Not applicable -- no technology decisions in this phase.

## Open Questions

None. All three cleanup items are fully scoped with exact line numbers verified against the current codebase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest/config) |
| Config file | vite.config.ts (test section) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test -- --run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | isUploading/setIsUploading no longer in hook return | smoke | `npm run build` (TypeScript will fail if anything references removed exports) | N/A -- removal verified by build |
| CLEAN-01 | Test for isUploading removed | smoke | `npm run test -- --run` (429 tests pass, not 430) | N/A -- test removed |
| CLEAN-02 | .env.example has no bare SUPABASE_ANON_KEY | manual | `grep "^SUPABASE_ANON_KEY" .env.example` returns empty | N/A -- file content check |
| CLEAN-03 | Stale coverage exclusion removed | smoke | `npm run test -- --run --coverage` (thresholds still pass) | N/A -- config change |

### Sampling Rate
- **Per task commit:** `npm run build && npm run test -- --run`
- **Per wave merge:** `npm run test -- --run --coverage`
- **Phase gate:** Full suite green + build green + grep verification

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. No new tests needed (this phase removes a test).

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all 6 target files
- `grep -r "isUploading|setIsUploading" src/` -- confirmed zero production consumers
- `ls src/data/` -- confirmed directory is empty
- `npm run test -- --run` -- confirmed 430/430 passing baseline
- Phase 45 verification: `.planning/milestones/v2.0-phases/45-cleanup/45-VERIFICATION.md` -- confirmed mockContracts.ts deletion

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, only removals
- Architecture: HIGH - exact file/line targets verified by inspection
- Pitfalls: HIGH - grep confirms no hidden consumers; all risks are theoretical and mitigated by build/test verification

**Research date:** 2026-03-20
**Valid until:** Indefinite (cleanup targets are static until modified)
