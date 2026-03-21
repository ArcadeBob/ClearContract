# Phase 50: Dead Code Cleanup - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove residual dead code from the Supabase migration and correct env documentation. Three specific cleanup items: orphaned isUploading state, stale .env.example key, and mockContracts.ts references.

</domain>

<decisions>
## Implementation Decisions

### isUploading removal (CLEAN-01)
- Delete `isUploading` useState and `setIsUploading` from `useContractStore.ts` (lines 12, 173-174)
- Delete the corresponding test in `useContractStore.test.ts` (lines 330-343: "exposes isUploading and setIsUploading")
- No production code consumes these — safe to remove without impact

### .env.example correction (CLEAN-02)
- Remove `SUPABASE_ANON_KEY=your_supabase_anon_key` (line 3) — stale, non-VITE prefixed
- `VITE_SUPABASE_ANON_KEY` already exists on line 6 (correct client-side key)
- Server uses `SUPABASE_SERVICE_ROLE_KEY` (line 4) — no change needed there

### mockContracts.ts cleanup (CLEAN-03)
- File was already deleted in Phase 45 (v2.0 cleanup) — no file to remove
- Remove stale coverage exclusion in `vite.config.ts` line 35: `'src/data/mockContracts.ts'`
- Update CLAUDE.md source layout to remove the `mockContracts.ts` line

### Claude's Discretion
- Whether to remove the empty `src/data/` directory if mockContracts.ts was the only file in it
- Exact commit message wording

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CLEAN-01, CLEAN-02, CLEAN-03 definitions (lines 37-39)

### Prior cleanup context
- `.planning/milestones/v2.0-phases/45-cleanup/45-VERIFICATION.md` — Confirms mockContracts.ts already deleted in Phase 45

</canonical_refs>

<code_context>
## Existing Code Insights

### Files to modify
- `src/hooks/useContractStore.ts` — Remove isUploading/setIsUploading (lines 12, 173-174)
- `src/hooks/__tests__/useContractStore.test.ts` — Remove isUploading test block (lines 330-343)
- `.env.example` — Remove stale SUPABASE_ANON_KEY line
- `vite.config.ts` — Remove stale mockContracts.ts coverage exclusion (line 35)
- `CLAUDE.md` — Remove mockContracts.ts from source layout

### Verification
- `npm run build` must pass after changes
- `npm run test` must pass after changes (test count will decrease by 1)
- `grep -r "isUploading\|setIsUploading" src/` returns zero results
- `.env.example` has no `SUPABASE_ANON_KEY` (without VITE_ prefix)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — all three items are straightforward removals with exact targets identified.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 50-dead-code-cleanup*
*Context gathered: 2026-03-21*
