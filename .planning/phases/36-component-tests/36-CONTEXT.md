# Phase 36: Component Tests - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove 5 key UI components render correctly with all data variations, respond to user interaction, and display appropriate visual states. Components: FindingCard, SeverityBadge, UploadZone, FilterToolbar, Sidebar. No hook tests (Phase 35), no integration tests (Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Child component rendering
- Full render all child components (no vi.mock for SeverityBadge, ActionPriorityBadge, ClauseQuote, etc.)
- Assertions check visible text/elements in the DOM, not implementation details
- This catches real integration issues between parent and child components

### FindingCard test strategy
- Key variations approach: minimal finding (required fields only), fully-loaded finding (all optional fields), each severity level, resolved state, note editing flow
- Full interaction testing for note flow: click "Add note" -> textarea appears -> type text -> click Save -> verify onUpdateNote callback fires
- Also test Cancel editing and Delete note confirmation dialog flow
- No exhaustive combinatorial testing of all conditional sections

### UploadZone file simulation
- Use fireEvent.change on the hidden file input with mock File objects
- Test drag-active visual state ("Drop contract here" vs "Upload Contract PDF")
- Test error-clearing on dragEnter: reject file (error shows) -> drag new file (error clears)
- Cover all COMP-03 paths: accept valid PDF, reject non-PDF, reject oversized file, error messages

### FilterToolbar testing
- Mock MultiSelectDropdown via vi.mock — render a simple stub
- Test all 4 view mode buttons (By Category, All by Severity, Coverage, Negotiation) with parameterized tests
- Verify setViewMode called with correct value for each button click
- Verify active button gets highlighted CSS class
- Test hide-resolved checkbox and negotiation-only toggle

### SeverityBadge expansion
- Expand existing SeverityBadge.test.tsx in-place (keep Phase 33's 2 tests)
- Add tests for all 5 severity levels with CSS class assertions using SEVERITY_BADGE_COLORS map
- Assert badge element contains correct Tailwind classes (e.g., Critical = 'bg-red-100 text-red-700 border-red-200')
- Test className prop passthrough

### Test file placement
- All test files colocated next to source: src/components/FindingCard.test.tsx, src/components/UploadZone.test.tsx, etc.
- Matches existing SeverityBadge.test.tsx pattern

### Claude's Discretion
- Exact number of test cases per component
- describe/it nesting structure
- Whether to use test.each for parameterized severity tests
- Sidebar test depth (straightforward — render, click, verify)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Components under test
- `src/components/FindingCard.tsx` — Main finding display with conditional sections, note editing, resolve toggle (206 LOC)
- `src/components/SeverityBadge.tsx` — Severity badge with color styling and downgrade indicator (34 LOC)
- `src/components/UploadZone.tsx` — PDF upload with react-dropzone, file validation, error display (108 LOC)
- `src/components/FilterToolbar.tsx` — View mode toggle, filter dropdowns, hide-resolved checkbox (131 LOC)
- `src/components/Sidebar.tsx` — Navigation sidebar with active view highlighting (97 LOC)

### Supporting modules (needed for assertions)
- `src/utils/palette.ts` — SEVERITY_BADGE_COLORS map (Tailwind class strings per severity)
- `src/types/contract.ts` — Finding, Severity, Category, ViewState types; SEVERITIES and CATEGORIES arrays
- `src/hooks/useContractFiltering.ts` — FilterState type used by FilterToolbar

### Test infrastructure (from Phase 33)
- `src/test/render.tsx` — Custom render wrapper with ToastProvider
- `src/test/factories.ts` — createContract, createFinding factory functions
- `src/test/setup.ts` — Vitest setup with Framer Motion mock and jest-dom
- `vite.config.ts` — Vitest config (inline), jsdom environment

### Existing test (to expand)
- `src/components/SeverityBadge.test.tsx` — 2 existing tests from Phase 33 (render text, downgrade indicator)

### Requirements
- `.planning/REQUIREMENTS.md` — COMP-01 through COMP-05 define acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts`: createFinding({overrides}) returns Zod-validated Finding with defaults — use for all FindingCard test data
- `src/test/render.tsx`: Custom render with ToastProvider — use for all component renders
- `src/components/SeverityBadge.test.tsx`: Existing test file to expand (not replace)
- `src/utils/palette.ts`: SEVERITY_BADGE_COLORS record — import in SeverityBadge tests for class assertions

### Established Patterns
- Colocated test files: `Component.test.tsx` next to `Component.tsx`
- Factory pattern: `createFinding({severity: 'Critical'})` for test data
- Framer Motion globally mocked in setup.ts (no animation issues in tests)
- Custom render wrapper required (provides ToastProvider context)
- ES modules throughout, TypeScript strict mode

### Integration Points
- FindingCard depends on: useInlineEdit hook, categoryIcons util, 6 child components
- UploadZone depends on: react-dropzone (useDropzone hook)
- FilterToolbar depends on: MultiSelectDropdown component, FilterState type from useContractFiltering
- Sidebar depends on: ViewState type, lucide-react icons

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

*Phase: 36-component-tests*
*Context gathered: 2026-03-16*
