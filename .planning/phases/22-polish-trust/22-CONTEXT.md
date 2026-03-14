# Phase 22: Polish & Trust - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate tech debt (6 items: DEBT-01 through DEBT-06) and deliver UX quick wins (6 items: UX-01 through UX-06) that build confidence in the tool. No new analysis capabilities — this phase cleans up the codebase and makes the UI communicate contract status with precision.

</domain>

<decisions>
## Implementation Decisions

### Contract Renaming (UX-01)
- Click-to-edit on the contract title in the review page header — first edit-in-place pattern in the codebase
- Pencil icon hint on hover, Enter or blur to save, Escape to cancel and revert
- Default contract name is the uploaded PDF filename (minus extension)
- User-set name replaces everywhere: dashboard cards, sidebar, all contracts list, review header
- AI-extracted client name stays as metadata but is not the primary display label

### Data-driven Dashboard (UX-02, UX-03, UX-05)
- Open/resolved finding counts shown as badge pair on each contract card: "[5 open] [✓ 2 resolved]" — open in amber/red, resolved in green
- Same badge treatment on the review page header
- Top-row stat cards updated: "Total Findings" becomes "Open Findings" count; keep Critical Findings and Avg Risk Score
- Date timeline shows "X days away" / "X days ago" with urgency coloring: red ≤7 days, amber ≤30 days, green >30 days; past dates muted/struck-through
- Static compliance card replaced with Upcoming Deadlines widget: next 3-5 dates across ALL contracts, sorted by proximity, color-coded by urgency, clicking navigates to that contract's review page

### Bid Signal Factor Breakdown (UX-04)
- Existing traffic light widget gets clickable expand/collapse
- Collapsed by default — shows just the Go/Caution/No-Bid result
- Expanded view shows all 5 factors (Bonding, Insurance, Scope, Payment, Retainage) with individual score bars, weights, and short reason text per factor
- Factor bars color-coded individually: green (>0.7), amber (0.4-0.7), red (<0.4)

### Upload Escape & Failure Navigation (UX-06)
- Top-left back arrow on upload page — same pattern as review page ← back arrow
- Back navigates to previous view (uses browser history) — if from review page, goes to review; if from dashboard, goes to dashboard
- Clicking back during active analysis cancels the API call and removes the placeholder contract
- Re-analyze failure navigates back to review page (original data intact via rollback) with toast notification: "Re-analysis failed: [reason]" — consistent with existing upload error toasts

### Tech Debt (DEBT-01 through DEBT-06)

### Claude's Discretion
- All tech debt implementation details (DEBT-01 through DEBT-06) — these are mechanical refactors
- Exact spacing, typography, and animation choices for new UI elements
- Error state handling for edge cases
- Loading skeleton approach during analysis

</decisions>

<specifics>
## Specific Ideas

- Badge pair mockup: `[5 open] [✓ 2 resolved]` with amber/red for open, green for resolved
- Upcoming Deadlines widget replaces compliance card — cross-contract date aggregation sorted by proximity
- Bid signal factor breakdown with per-factor color coding and short reason text
- Click-to-edit rename with pencil icon hover hint — first inline edit pattern in the app

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BidSignalWidget` (src/components/BidSignalWidget.tsx): Currently shows traffic light only — needs expand/collapse and factor rows added
- `DateTimeline` (src/components/DateTimeline.tsx): Shows dates per-contract — urgency coloring adds to existing date type colors
- `StatCard` (src/components/StatCard.tsx): Dashboard stat cards — "Total Findings" label/value needs update to "Open Findings"
- `ContractCard` (src/components/ContractCard.tsx): Dashboard contract cards — needs open/resolved badge pair added
- `ConfirmDialog` (src/components/ConfirmDialog.tsx): Reusable dialog pattern
- Toast notification system from upload error feedback (Phase 13)

### Established Patterns
- Tailwind utility classes for all styling — no CSS modules
- Framer Motion for animations (stagger pattern: index * 0.05 delay)
- onBlur save pattern from Settings (useCompanyProfile) — model for click-to-edit rename
- Severity color coding: red=Critical, amber=High, yellow=Medium, blue=Low, slate=Info

### Integration Points
- `useContractStore` (src/hooks/useContractStore.ts): Central state — rename needs new mutation, finding counts derive from contract.findings
- `useRouter` (src/hooks/useRouter.ts): replaceState/pushState asymmetry is DEBT-06 target; upload back button uses this
- `contractStorage.ts`: localStorage persistence — rename persists automatically via saveContracts
- `bidSignal.ts` (src/utils/bidSignal.ts): Factor computation logic already exists — widget just needs to expose the breakdown
- BidSignal type duplicated in contract.ts and bidSignal.ts — DEBT-01 consolidation target
- ContractDateSchema duplicated in 3 schema files — DEBT-05 consolidation target

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-polish-trust*
*Context gathered: 2026-03-14*
