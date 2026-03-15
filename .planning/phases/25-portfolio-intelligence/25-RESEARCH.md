# Phase 25: Portfolio Intelligence - Research

**Researched:** 2026-03-15
**Domain:** Client-side data aggregation, multi-select UI, finding preservation across re-analysis
**Confidence:** HIGH

## Summary

Phase 25 is entirely client-side work. It surfaces existing contract data in new ways (cross-contract patterns, comparison view, advanced filtering) and improves the re-analyze workflow by preserving user data. No new API endpoints, no new AI capabilities, no new libraries needed.

The existing codebase provides strong foundations: `useContractStore` gives access to all contracts, `useRouter` handles History API routing, `visibleFindings` pipeline handles filtering, and the re-analyze flow in `App.tsx` already has `structuredClone` rollback. The key technical challenges are: (1) extending `ViewState` union type for the new `compare` view, (2) converting the single-select `CategoryFilter` to a multi-select dropdown pattern, and (3) implementing composite-key matching for finding preservation during re-analysis.

**Primary recommendation:** Build all four features using existing React patterns (useState, useMemo), no new libraries. The multi-select dropdown should be a custom component following the existing sort menu pattern in AllContracts.tsx.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **PORT-01 (Patterns):** Dashboard stat card showing category frequency ("Payment Terms found in 4/5 contracts"). Threshold: 3+ contracts. Card hidden when fewer than 3 contracts exist. Computed client-side from all contracts in useContractStore.
- **PORT-02 (Comparison):** Checkboxes on All Contracts page, select exactly 2, "Compare Selected" button. New `compare` ViewState. URL: /compare?a=id1&b=id2. Findings grouped by category (not 1:1 matching), risk score delta at top. No dates/scope/bid signal comparison.
- **PORT-03 (Filtering):** Extend ContractReview toolbar. Convert CategoryFilter to multi-select dropdown. New Severity and Action Priority multi-select dropdowns. "Has negotiation position" checkbox toggle. AND across filter types, OR within. All default to "all selected". CSV export respects all active filters.
- **PORT-04 (Re-analyze preservation):** Composite key = clauseReference + category (matches merge.ts dedup key). Client-side matching in App.tsx after re-analysis. Carry over resolved and note fields. Dropped findings are silently removed. Toast: "Re-analysis complete. X resolved findings and Y notes preserved."

### Claude's Discretion
- Patterns card visual design (icon, expand/collapse, typography)
- Comparison page layout details (spacing, card styling, responsive behavior)
- Multi-select dropdown component implementation (custom or lightweight library)
- How to handle comparison when both contracts have 0 findings in a category (skip vs show empty)
- Exact toast message wording and timing
- Whether comparison view shows in sidebar navigation or is only accessible via All Contracts

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PORT-01 | Dashboard shows common finding patterns across all stored contracts | Pattern computation via useMemo over contracts array; StatCard component for display; category frequency aggregation |
| PORT-02 | User can compare two contracts side-by-side (findings diff, risk score delta) | New `compare` ViewState; useRouter extension for /compare route with query params; category-grouped side-by-side layout |
| PORT-03 | Advanced multi-select filters on findings (severity, category, resolved, has negotiation position) | MultiSelectDropdown component; extended visibleFindings pipeline; CSV export filter integration |
| PORT-04 | Re-analyze preserves resolved status and notes by matching findings | Composite key matching (clauseReference + category) in handleReanalyze; toast feedback via existing Toast component |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | UI framework | Already in use |
| TypeScript | strict | Type safety | Already in use |
| Tailwind CSS | 3 | Styling | Already in use |
| Framer Motion | -- | Animations | Already in use |
| Lucide React | -- | Icons | Already in use |

### Supporting
No new libraries needed. All features implementable with existing stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom multi-select dropdown | react-select or headlessui/listbox | Adds dependency for a single component; project has established pattern of custom dropdowns (see AllContracts sort menu) |

**Recommendation:** Build the multi-select dropdown as a custom component. The sort menu in AllContracts.tsx already demonstrates the pattern: button trigger, fixed backdrop for click-outside, absolute-positioned dropdown panel. Adding checkbox items to this pattern yields a multi-select dropdown with zero new dependencies.

## Architecture Patterns

### New Files
```
src/
├── components/
│   ├── MultiSelectDropdown.tsx     # Reusable multi-select dropdown (severity, category, priority)
│   └── PatternsCard.tsx            # Dashboard patterns stat card (PORT-01)
├── pages/
│   └── ContractComparison.tsx      # Side-by-side comparison view (PORT-02)
```

### Modified Files
```
src/types/contract.ts          # Add 'compare' to ViewState union
src/hooks/useRouter.ts         # Add /compare route with query param parsing
src/App.tsx                    # Add comparison route, modify handleReanalyze for preservation
src/pages/Dashboard.tsx        # Add PatternsCard to stat cards row
src/pages/AllContracts.tsx     # Add checkbox selection + "Compare Selected" button
src/pages/ContractReview.tsx   # Replace CategoryFilter with multi-select dropdowns, extend filter pipeline
src/components/ContractCard.tsx # Add optional checkbox prop for comparison selection
src/components/Sidebar.tsx     # (Optional) Add compare to nav if sidebar entry chosen
src/utils/exportContractCsv.ts # Extend filterDescriptions for new filter dimensions
```

### Pattern 1: Multi-Select Dropdown (PORT-03)
**What:** Reusable dropdown component that allows selecting multiple items from a list with checkboxes
**When to use:** Severity filter, Category filter, Action Priority filter
**Example:**
```typescript
// Follows existing AllContracts sort menu pattern
interface MultiSelectDropdownProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: Set<T>;
  onChange: (selected: Set<T>) => void;
  renderOption?: (option: T) => React.ReactNode;
}

// Usage in ContractReview toolbar:
const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(
  new Set(SEVERITIES)  // All selected by default
);
```

### Pattern 2: Cross-Contract Pattern Computation (PORT-01)
**What:** useMemo computation that aggregates finding categories across all reviewed contracts
**When to use:** Dashboard patterns card
**Example:**
```typescript
const patterns = useMemo(() => {
  const reviewed = contracts.filter(c => c.status === 'Reviewed');
  if (reviewed.length < 3) return null; // Hide card entirely

  const categoryCount = new Map<string, number>();
  for (const contract of reviewed) {
    // Count unique categories per contract (not total findings)
    const categories = new Set(contract.findings.map(f => f.category));
    for (const cat of categories) {
      categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
    }
  }

  // Filter to categories appearing in 3+ contracts
  return Array.from(categoryCount.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]); // Most common first
}, [contracts]);
```

### Pattern 3: Composite Key Matching for Preservation (PORT-04)
**What:** Match old findings to new findings using clauseReference + category composite key, carry over resolved/note
**When to use:** handleReanalyze in App.tsx
**Example:**
```typescript
// Build lookup from old findings
const oldByKey = new Map<string, Finding>();
for (const f of contract.findings) {
  if (f.resolved || f.note) {
    const ref = f.clauseReference ?? '';
    if (ref && ref !== 'N/A' && ref !== 'Not Found') {
      oldByKey.set(`${ref}::${f.category}`, f);
    }
  }
}

// After re-analysis, carry over user data
let preservedResolved = 0;
let preservedNotes = 0;
const mergedFindings = result.findings.map(newFinding => {
  const ref = newFinding.clauseReference ?? '';
  if (ref && ref !== 'N/A' && ref !== 'Not Found') {
    const old = oldByKey.get(`${ref}::${newFinding.category}`);
    if (old) {
      if (old.resolved) preservedResolved++;
      if (old.note) preservedNotes++;
      return { ...newFinding, resolved: old.resolved, note: old.note };
    }
  }
  return newFinding;
});
```

### Pattern 4: Comparison Route with Query Params (PORT-02)
**What:** Extend useRouter to handle /compare?a=id1&b=id2
**When to use:** Contract comparison view
**Example:**
```typescript
// In parseUrl:
if (pathname === '/compare') {
  const params = new URLSearchParams(window.location.search);
  return {
    view: 'compare' as ViewState,
    contractId: null,
    compareIds: [params.get('a'), params.get('b')].filter(Boolean) as string[],
  };
}

// In navigateTo:
if (view === 'compare' && compareIds) {
  window.history.pushState(null, '', `/compare?a=${compareIds[0]}&b=${compareIds[1]}`);
}
```

### Anti-Patterns to Avoid
- **Over-engineering the multi-select:** Don't build a generic "listbox" abstraction. Three specific instances (severity, category, priority) with a shared component is sufficient.
- **Deep comparison for finding matching:** Don't try to fuzzy-match findings by title or description. The clauseReference + category composite key is the established dedup key from merge.ts.
- **Shared state for comparison selection:** Don't lift comparison selection state to useContractStore. Local state in AllContracts.tsx is sufficient since comparison is initiated from that page only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Click-outside detection | Custom event listener with refs | Fixed backdrop overlay (existing pattern) | AllContracts sort menu already uses this pattern reliably |
| URL query param parsing | Manual string splitting | URLSearchParams API | Standard browser API, handles encoding |

**Key insight:** This phase adds no technically novel components. Every UI pattern needed (dropdown menus, checkbox toggles, stat cards, category-grouped layouts) already exists in the codebase.

## Common Pitfalls

### Pitfall 1: ViewState Union Not Updated
**What goes wrong:** Adding `'compare'` to ViewState breaks existing code that exhaustively matches on ViewState values
**Why it happens:** Sidebar.tsx casts `item.id as ViewState`, useRouter parseUrl maps pathname to ViewState
**How to avoid:** Add 'compare' to the ViewState union in contract.ts. Update useRouter parseUrl and navigateTo. The renderContent switch in App.tsx needs a 'compare' case. Sidebar may or may not need updating (Claude's discretion).
**Warning signs:** TypeScript errors on exhaustive switches

### Pitfall 2: Router State Needs compareIds
**What goes wrong:** useRouter's RouterState only has `view` and `contractId` -- comparison needs two IDs
**Why it happens:** Current router assumes at most one entity ID per route
**How to avoid:** Either (a) add `compareIds: string[]` to RouterState, or (b) parse query params from window.location.search in the comparison page component directly. Option (b) is simpler and avoids touching the router's core type.
**Warning signs:** Comparison page loads with no contracts

### Pitfall 3: Multi-Select "All Selected" vs "None Selected"
**What goes wrong:** If "all selected" means showing everything, and user deselects one, the filter activates. But the visual distinction between "everything shown" and "everything selected" must be clear.
**Why it happens:** UX ambiguity in multi-select defaults
**How to avoid:** Default state = all options in the Set. Display count badge on dropdown button: "Severity (3/5)" when 3 of 5 selected. No badge when all selected.
**Warning signs:** Users confused about whether filter is active

### Pitfall 4: CSV Export Filter Descriptions Not Updated
**What goes wrong:** New filter dimensions (severity, priority, negotiation) don't appear in the CSV export metadata
**Why it happens:** exportContractCsv receives `filterDescriptions` as strings -- easy to forget adding new ones
**How to avoid:** Build filterDescriptions array from all active filter states in the export button handler
**Warning signs:** CSV export doesn't reflect applied filters

### Pitfall 5: Re-Analyze Preservation Key Mismatches
**What goes wrong:** Findings without clauseReference (or with "N/A"/"Not Found") can't be matched, losing resolved/note data
**Why it happens:** Not all findings have meaningful clauseReferences -- staleness warnings, synthesis findings, etc.
**How to avoid:** This is acceptable by design -- the CONTEXT.md explicitly says "Findings that disappear in re-analysis are dropped silently." Only findings with real clauseReferences get preservation. The toast count makes this transparent.
**Warning signs:** Toast shows "0 resolved findings preserved" when user had resolved findings (check if those findings had valid clauseReferences)

### Pitfall 6: Checkbox Selection Interferes with Card Click
**What goes wrong:** Clicking the checkbox on ContractCard also triggers the card's onClick (navigates to review)
**Why it happens:** Event bubbling -- checkbox is inside the clickable card div
**How to avoid:** e.stopPropagation() on the checkbox click handler, same pattern used for the delete button in ContractCard
**Warning signs:** Clicking checkbox navigates away instead of toggling selection

## Code Examples

### Extended visibleFindings Pipeline (PORT-03)
```typescript
// In ContractReview.tsx -- extend the existing visibleFindings computation
const visibleFindings = useMemo(() => {
  let findings = contract.findings;

  // Hide resolved (existing)
  if (hideResolved) {
    findings = findings.filter(f => !f.resolved);
  }

  // Severity filter (new)
  if (selectedSeverities.size < SEVERITIES.length) {
    findings = findings.filter(f => selectedSeverities.has(f.severity));
  }

  // Category filter (new -- replaces old single-select)
  if (selectedCategories.size < CATEGORIES.length) {
    findings = findings.filter(f => selectedCategories.has(f.category));
  }

  // Action priority filter (new)
  const ACTION_PRIORITIES = ['pre-bid', 'pre-sign', 'monitor'] as const;
  if (selectedPriorities.size < ACTION_PRIORITIES.length) {
    findings = findings.filter(f =>
      f.actionPriority ? selectedPriorities.has(f.actionPriority) : false
    );
  }

  // Has negotiation position (new)
  if (hasNegotiationOnly) {
    findings = findings.filter(f => !!f.negotiationPosition);
  }

  return findings;
}, [contract.findings, hideResolved, selectedSeverities, selectedCategories, selectedPriorities, hasNegotiationOnly]);
```

### Comparison Page Category Layout (PORT-02)
```typescript
// Category-grouped comparison: left column = Contract A, right column = Contract B
const comparisonGroups = useMemo(() => {
  const allCategories = new Set([
    ...contractA.findings.map(f => f.category),
    ...contractB.findings.map(f => f.category),
  ]);

  return CATEGORY_ORDER
    .filter(cat => allCategories.has(cat))
    .map(category => ({
      category,
      findingsA: contractA.findings.filter(f => f.category === category),
      findingsB: contractB.findings.filter(f => f.category === category),
    }));
}, [contractA, contractB]);
```

### Checkbox Selection in AllContracts (PORT-02)
```typescript
// In AllContracts.tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelection = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < 2) {
      next.add(id);
    }
    // Max 2 selected -- clicking a third does nothing
    return next;
  });
};

const canCompare = selectedIds.size === 2;
```

## State of the Art

No external technology changes relevant to this phase. All work uses existing React patterns and browser APIs.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-select CategoryFilter pills | Multi-select dropdown checkboxes | This phase | Breaking change to CategoryFilter component -- replace entirely |
| Re-analyze replaces all findings | Re-analyze preserves resolved/note via composite key | This phase | Non-breaking -- additive logic in handleReanalyze |

## Open Questions

1. **Sidebar entry for comparison view?**
   - What we know: Comparison is initiated from All Contracts page via checkbox selection
   - What's unclear: Whether to add a sidebar nav entry for "Compare" view
   - Recommendation: Do NOT add sidebar entry. Comparison is a transient view accessed from All Contracts -- adding a sidebar entry with no context (which contracts?) would be confusing. The /compare URL with query params handles deep-linking.

2. **Empty category groups in comparison?**
   - What we know: Category groups show Contract A findings left, Contract B findings right
   - What's unclear: What to show when a category has findings in only one contract
   - Recommendation: Show the group with findings on one side and a "No findings" placeholder on the other. Skip categories where BOTH contracts have 0 findings.

3. **Action Priority filter for findings without actionPriority?**
   - What we know: Old contracts (pre-Phase 24) lack actionPriority field. It's optional on Finding interface.
   - What's unclear: How the priority filter handles findings with undefined actionPriority
   - Recommendation: When priority filter is active (not all selected), findings without actionPriority are hidden. This is consistent with "filter shows only what matches."

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | Pattern computation returns correct category frequencies, respects 3+ threshold | manual-only | Visual verification in browser with 3+ contracts | N/A |
| PORT-02 | Comparison view shows two contracts side-by-side with category-grouped findings | manual-only | Navigate to /compare?a=id1&b=id2 and verify layout | N/A |
| PORT-03 | Multi-select filters correctly AND/OR, CSV export respects filters | manual-only | Apply filters, verify findings list, export CSV | N/A |
| PORT-04 | Re-analyze preserves resolved status and notes, shows toast with counts | manual-only | Resolve a finding, add a note, re-analyze, verify preservation | N/A |

**Justification for manual-only:** No test framework is configured (per CLAUDE.md). The project uses `npm run build` for type-checking. All features are UI-rendered and require browser interaction to verify.

### Sampling Rate
- **Per task commit:** `npm run build` (type-check)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build + lint green, manual verification of all 4 PORT requirements

### Wave 0 Gaps
None -- no test framework to set up. Type-checking via `npm run build` is the existing verification mechanism.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All findings derived from direct reading of source files
- `src/types/contract.ts` -- ViewState union, Finding interface, CATEGORIES/SEVERITIES constants
- `src/hooks/useRouter.ts` -- Current routing pattern, parseUrl, navigateTo
- `src/hooks/useContractStore.ts` -- State management, persistAndSet pattern
- `src/App.tsx` -- handleReanalyze flow, structuredClone rollback
- `api/merge.ts` -- Composite key dedup pattern (clauseReference + category)
- `src/pages/ContractReview.tsx` -- visibleFindings pipeline, filter toolbar, view modes
- `src/pages/AllContracts.tsx` -- Sort menu dropdown pattern, contract list rendering
- `src/pages/Dashboard.tsx` -- StatCard usage, stat computation pattern
- `src/components/CategoryFilter.tsx` -- Current single-select pill UI
- `src/components/ContractCard.tsx` -- Card layout, delete button e.stopPropagation pattern
- `src/components/Toast.tsx` -- Toast API (type, message, onDismiss)
- `src/utils/exportContractCsv.ts` -- Filter-aware CSV export pattern

### Secondary (MEDIUM confidence)
None needed -- all information from codebase.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing tech
- Architecture: HIGH -- patterns directly derived from existing codebase
- Pitfalls: HIGH -- identified from actual code analysis (event bubbling, router state, filter edge cases)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- no external dependencies changing)
