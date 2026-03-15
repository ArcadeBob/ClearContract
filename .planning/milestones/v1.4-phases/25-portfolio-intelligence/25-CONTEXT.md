# Phase 25: Portfolio Intelligence - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable cross-contract insights, side-by-side comparison, advanced multi-select filtering, and finding preservation across re-analysis cycles. No new analysis capabilities or AI changes -- this phase surfaces existing data in new ways and improves the re-analyze workflow.

</domain>

<decisions>
## Implementation Decisions

### Cross-contract patterns (PORT-01)
- Dashboard shows common finding patterns as category frequency: "Payment Terms found in 4/5 contracts"
- Pattern threshold: category must appear in 3+ contracts to count as a pattern
- New stat card in the dashboard top row alongside Open Findings, Critical Findings, Avg Risk Score
- Card hidden entirely when fewer than 3 contracts exist (no empty state message)
- Pattern data computed client-side from all contracts in useContractStore

### Contract comparison (PORT-02)
- Selection via checkboxes on the All Contracts page -- select exactly 2, then "Compare Selected" button appears
- Comparison renders in a new dedicated view/page added to ViewState ('compare')
- URL: /compare?a=id1&b=id2 (deep-linkable)
- Comparison content: risk score delta at top, then findings grouped by category showing Contract A findings on left, Contract B findings on right
- Findings grouped by category (not 1:1 title matching) -- just show what each contract has per category
- No dates/scope/bid signal comparison -- findings diff + risk delta only

### Advanced filtering (PORT-03)
- Extend existing ContractReview toolbar with multi-select dropdowns
- Existing single-select CategoryFilter converted to multi-select dropdown (consistent with new severity/priority dropdowns)
- New filters: Severity (multi-select dropdown), Action Priority (multi-select dropdown)
- "Has negotiation position" as a checkbox toggle (same pattern as hideResolved)
- Filter logic: AND across filter types, OR within a filter type (e.g., severity=Critical OR High AND category=Payment)
- All filters default to "all selected" (no filtering) on page load
- CSV export respects all active filters (extends existing filter-aware export)

### Re-analyze preservation (PORT-04)
- Matching strategy: composite key clauseReference + category (reuses existing merge.ts dedup key logic)
- Client-side matching in App.tsx: after new analysis returns, compare new findings against old findings, carry over resolved and note fields
- Findings that disappear in re-analysis are dropped silently -- new analysis is source of truth
- Toast notification after re-analysis: "Re-analysis complete. X resolved findings and Y notes preserved."
- Integrates into existing re-analyze flow (structuredClone rollback already exists)

### Claude's Discretion
- Patterns card visual design (icon, expand/collapse, typography)
- Comparison page layout details (spacing, card styling, responsive behavior)
- Multi-select dropdown component implementation (custom or lightweight library)
- How to handle comparison when both contracts have 0 findings in a category (skip vs show empty)
- Exact toast message wording and timing
- Whether comparison view shows in sidebar navigation or is only accessible via All Contracts

</decisions>

<specifics>
## Specific Ideas

- Patterns card mockup: "Common Patterns Across N Contracts" with category name + "X/N contracts" format
- Comparison preview: risk scores at top with delta, then category-grouped findings split left/right
- Filter toolbar: [Category v] [Severity v] [Priority v] [x Hide resolved] [x Has negotiation]
- Re-analyze toast: "Re-analysis complete. 4 resolved + 2 notes preserved"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CategoryFilter` (src/components/CategoryFilter.tsx): Current single-select category filter -- needs conversion to multi-select dropdown
- `ContractCard` (src/components/ContractCard.tsx): Already shows risk scores, finding counts -- add checkbox for comparison selection
- `AllContracts` (src/pages/AllContracts.tsx): Contract list page -- add selection mode and compare button
- `StatCard` (src/components/StatCard.tsx): Dashboard stat cards -- patterns card follows same pattern
- `Toast` (src/components/Toast.tsx): Toast notification system -- reuse for preservation feedback
- `exportContractCsv.ts`: Filter-aware CSV export -- extend with new filter dimensions
- `ConfirmDialog` (src/components/ConfirmDialog.tsx): Reusable dialog pattern

### Established Patterns
- ViewState type in contract.ts controls page routing -- add 'compare' value
- useRouter hook for URL-based routing with History API -- extend for /compare path with query params
- `visibleFindings` computed array feeds both view modes and CSV export -- extend filter pipeline
- Severity color map: red=Critical, amber=High, yellow=Medium, blue=Low, slate=Info
- Framer Motion stagger animations (index * 0.05 delay)
- onBlur save pattern, nullish coalescing for optional fields

### Integration Points
- `useContractStore` (src/hooks/useContractStore.ts): Central state -- patterns computed from contracts array, comparison needs contract pair access
- `useRouter` (src/hooks/useRouter.ts): URL routing -- needs /compare route and query param parsing
- `src/types/contract.ts`: ViewState union needs 'compare' added
- `src/App.tsx`: View routing switch + re-analyze flow (preservation logic goes here)
- `src/pages/ContractReview.tsx`: Filter toolbar lives here -- multi-select dropdowns added to existing toolbar area
- `src/pages/Dashboard.tsx`: Patterns card added to stat cards row
- `src/components/Sidebar.tsx`: Nav items array for new view (if comparison gets sidebar entry)

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 25-portfolio-intelligence*
*Context gathered: 2026-03-15*
