# Phase 26: Audit Gap Closure - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all gaps and tech debt items identified by the v1.4 milestone audit. Two surgical fixes: add missing 'Compound Risk' category to ContractReview.tsx CATEGORY_ORDER, and correct the re-analyze confirmation dialog message to reflect finding preservation behavior (PORT-04).

</domain>

<decisions>
## Implementation Decisions

### Compound Risk category ordering
- Add 'Compound Risk' as the last entry in CATEGORY_ORDER in ContractReview.tsx (after 'Risk Assessment')
- Matches the existing order in ContractComparison.tsx line 23
- Synthesis findings are meta-findings referencing other categories — showing them last gives context after individual categories

### Re-analyze dialog message
- Replace the false data-loss warning with positive framing
- New message: "Re-analyzing will refresh all findings. Resolved status and notes will be preserved where findings match. Select a PDF to continue."
- Accurately reflects PORT-04 composite key preservation behavior added in Phase 25

### Claude's Discretion
- None — both fixes are fully specified

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ContractComparison.tsx` line 23: Already has correct CATEGORY_ORDER including 'Compound Risk' — use as reference
- `ConfirmDialog` component: Generic, accepts `message` prop — no component changes needed

### Established Patterns
- CATEGORY_ORDER is a `Category[]` const array used by `useMemo` grouping logic
- ContractComparison.tsx and ContractReview.tsx both define their own CATEGORY_ORDER (not shared)

### Integration Points
- `ContractReview.tsx` line 47-57: CATEGORY_ORDER array (add 'Compound Risk')
- `ContractReview.tsx` line 345: Re-analyze dialog message string

</code_context>

<specifics>
## Specific Ideas

No specific requirements — both fixes are exact changes identified by the milestone audit.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-audit-gap-closure*
*Context gathered: 2026-03-15*
