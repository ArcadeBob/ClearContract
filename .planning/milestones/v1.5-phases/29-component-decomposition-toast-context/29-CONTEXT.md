# Phase 29: Component Decomposition + Toast Context - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

God components are split into focused subcomponents, and toast notifications work without prop drilling. ContractReview.tsx drops below 350 lines, LegalMetaBadge and ScopeMetaBadge become directory-based with barrel-exported dispatchers, and any component can call useToast().showToast() without receiving toast props from a parent. Pure refactoring — no new user-facing features.

</domain>

<decisions>
## Implementation Decisions

### LegalMetaBadge split
- Directory structure: `src/components/LegalMetaBadge/` with `index.tsx` dispatcher + 11 subcomponent files + `shared.ts`
- Subcomponent naming: PascalCase `{ClauseType}Badge.tsx` (e.g., `IndemnificationBadge.tsx`, `PaymentContingencyBadge.tsx`)
- Dispatcher uses `Record<LegalMeta['clauseType'], React.FC>` component map — not a switch statement
- Each subcomponent receives its **narrowed** discriminated union variant via `Extract<LegalMeta, { clauseType: '...' }>` — no runtime type checks needed inside
- `shared.ts` exports `pillBase` constant and any shared helper functions (e.g., `boolPill`)
- Existing import paths (`from './LegalMetaBadge'` or `from '../components/LegalMetaBadge'`) resolve unchanged via barrel index

### ScopeMetaBadge split
- Same directory pattern as LegalMetaBadge: `src/components/ScopeMetaBadge/` with `index.tsx` + 4 subcomponents + `shared.ts`
- Subcomponents: `ScopeOfWorkBadge.tsx`, `DatesDeadlinesBadge.tsx`, `VerbiageBadge.tsx`, `LaborComplianceBadge.tsx`
- Same component map dispatch pattern with narrowed `Extract<ScopeMeta, { passType: '...' }>` types
- `shared.ts` exports `pillBase` and `formatLabel` — duplicated from LegalMetaBadge's `pillBase` (no cross-directory imports)

### ContractReview decomposition
- Extract 3 subcomponents into `src/components/` (flat, not in a subdirectory):
  - `ReviewHeader.tsx` (~130 lines): back button, title/rename, action buttons (delete, re-analyze, PDF, CSV export), confirm dialogs, hidden file input
  - `FilterToolbar.tsx` (~90 lines): view mode toggle buttons, multi-select filter dropdowns, hide-resolved checkbox, negotiation-only toggle
  - `RiskSummary.tsx` (~45 lines): severity count list, resolved count bar, AI disclaimer text
- ContractReview.tsx becomes thin orchestrator at ~240 lines — owns `viewMode` state and renders the findings display area
- ReviewHeader calls `useInlineEdit` internally and manages its own confirm dialog state — receives callbacks (onRename, onDelete, onReanalyze, onShowToast) and contract data as props
- ContractReview owns `viewMode` state and passes `viewMode` + `setViewMode` to FilterToolbar (because the findings area needs viewMode to decide what to render)
- FilterToolbar receives filter state from useContractFiltering as props — does not call the hook itself

### Toast context
- New files: `src/contexts/ToastProvider.tsx` (provider + context) and `src/hooks/useToast.ts` (consumer hook)
- Replace-on-new semantics: only one toast visible at a time, new toast replaces existing
- ToastProvider wraps `<App />` in `src/index.tsx` — any component can call `useToast().showToast()`
- ToastProvider renders the Toast component internally — consumers only call showToast(), no need to place `<Toast />` anywhere
- 3-second auto-dismiss for all toast types
- Remove `onShowToast` prop from ContractReview's interface — ReviewHeader calls useToast() directly
- Remove toast state from App.tsx — fully owned by provider

### Claude's Discretion
- Exact ReviewHeader prop interface design (which fields of contract to pass vs the full Contract object)
- FilterToolbar prop interface (how filter state and callbacks are typed)
- Whether EmptyFindings stays inline in ContractReview or moves to a shared component
- Internal ToastProvider implementation details (useEffect cleanup, animation transitions)
- Whether the existing Toast component file is absorbed into ToastProvider.tsx or kept as a separate presentational component imported by the provider

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/LegalMetaBadge.tsx` (417 lines): Source file to split — 11 clauseType branches with pillBase shared constant
- `src/components/ScopeMetaBadge.tsx` (199 lines): Source file to split — 4 passType branches with pillBase + formatLabel
- `src/pages/ContractReview.tsx` (507 lines): Source file to decompose — hooks already extracted in Phase 28
- `src/hooks/useInlineEdit.ts`: Extracted in Phase 28, used by ReviewHeader for rename
- `src/hooks/useContractFiltering.ts`: Extracted in Phase 28, ContractReview calls it and passes state to FilterToolbar
- `src/App.tsx`: Currently owns toast state (lines 29, 228, 276) — to be removed
- Existing Toast component: renders toast notification with dismiss

### Established Patterns
- Knowledge module barrel files (`src/knowledge/regulatory/index.ts`): Side-effect import barrel pattern — similar to what LegalMetaBadge/ScopeMetaBadge index.tsx dispatchers will do
- Discriminated unions in `src/types/contract.ts`: `LegalMeta` (11 variants by clauseType), `ScopeMeta` (4 variants by passType)
- No existing React Context usage in the codebase — ToastProvider will be the first context
- Components are flat in `src/components/` — no subdirectories yet (LegalMetaBadge and ScopeMetaBadge will be the first)

### Integration Points
- `FindingCard.tsx` imports `LegalMetaBadge` and `ScopeMetaBadge` — import paths must resolve unchanged after directory conversion
- `App.tsx` passes `onShowToast` to `ContractReview` — this prop chain is removed when toast context is introduced
- `src/index.tsx` wraps `<App />` — ToastProvider wraps here
- AnimatePresence in ContractReview findings display must continue working after structural splits

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user selected recommended options throughout. All decomposition follows consistent patterns: directory + barrel for badge components, flat components/ for ContractReview extractions, React Context for toast.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-component-decomposition-toast-context*
*Context gathered: 2026-03-14*
