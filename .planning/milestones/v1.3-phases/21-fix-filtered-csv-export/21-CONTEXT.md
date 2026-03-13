# Phase 21: Fix Filtered CSV Export - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

CSV export respects the active hideResolved and selectedCategory filters instead of exporting all findings. When filters are active, the exported CSV contains only the visible findings and the metadata header indicates what was filtered.

</domain>

<decisions>
## Implementation Decisions

### Filtered export behavior
- Pass `visibleFindings` (already computed in ContractReview) to the export function instead of `contract.findings`
- Findings in the CSV are the same set the user sees on screen — no surprises
- Severity sort order preserved within the filtered set (Critical → High → Medium → Low → Info)

### Metadata header with filter note
- When filters are active, add two rows after "Total Findings":
  - `Exported Findings` — count of filtered findings (e.g., "8")
  - `Filters Applied` — comma-separated description of active filters (e.g., "Category: Legal Issues, Hide Resolved: Yes")
- "Total Findings" always shows the full unfiltered count (so recipient knows it's a subset)
- When no filters are active (all findings exported), omit "Exported Findings" and "Filters Applied" rows entirely — CSV looks identical to current unfiltered behavior

### Filename convention
- Same filename regardless of filter state: `{ContractName}_{YYYY-MM-DD}.csv`
- No "-filtered" suffix — the metadata inside the CSV already communicates filter status

### Claude's Discretion
- Exact function signature change (add findings array param vs options object)
- How filter state is communicated from ContractReview to the export function
- Whether to pass filter descriptions as strings or derive them inside the export function

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `exportContractCsv(contract)` (`src/utils/exportContractCsv.ts`): Currently takes full `Contract` and uses `contract.findings` directly — needs signature update to accept filtered findings
- `visibleFindings` in `ContractReview` (line 144): Already computes filtered findings from `hideResolved` + `selectedCategory` — this is the data source for export
- `downloadCsv` and `sanitizeFilename` helpers: No changes needed, work as-is

### Established Patterns
- `ContractReview` calls `exportContractCsv(contract)` at line 225 — this is the single call site to update
- `hideResolved` state (line 95) and `selectedCategory` state (line 73) are both available in the same component scope as the export call
- Metadata header pattern: key-value rows at top of CSV, blank row separator, then column headers

### Integration Points
- `exportContractCsv` function signature: Add optional findings array + filter info parameters
- `ContractReview` export handler (line 225): Pass `visibleFindings` and active filter descriptions
- No new files or dependencies needed — this is a 2-file change (exportContractCsv.ts + ContractReview.tsx)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-fix-filtered-csv-export*
*Context gathered: 2026-03-13*
