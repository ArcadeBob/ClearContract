# Phase 28: Hook Extraction - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Reusable state-logic hooks exist that encapsulate inline edit, contract filtering, and field validation patterns. Three hooks extracted from existing inline code — no new user-facing features, no new dependencies.

</domain>

<decisions>
## Implementation Decisions

### useInlineEdit API design
- Configurable hook with options: `{ initialValue, autoFocus?, validate?, onSave }`
- Returns `{ isEditing, editValue, setEditValue, startEditing, commitEdit, cancelEdit, onKeyDown, inputRef }`
- Hook manages input ref and auto-focus internally (useEffect to focus+select when autoFocus: true)
- Enter commits, Escape cancels — keyboard handling built into hook via returned onKeyDown
- Cancel reverts editValue to initialValue AND exits edit mode (revert + exit semantics)
- Both ContractReview (rename) and FindingCard (notes) use the same hook with different config
- ContractReview: `useInlineEdit({ initialValue: contract.name, autoFocus: true, validate: v => v.trim(), onSave: handleRename })`
- FindingCard: `useInlineEdit({ initialValue: finding.note ?? '', onSave: (text) => onUpdateNote(finding.id, text) })`

### useContractFiltering scope
- Hook includes filtering, grouping, AND sorting — returns visibleFindings, groupedFindings, and flatFindings
- Accepts contract.findings as input
- Unified filter object: `filters: { severities: Set, categories: Set, priorities: Set, negotiationOnly: boolean }`
- Single `toggleFilter(type, value)` function for all filter types
- `resetFilters()` included — sets all Sets back to full and negotiationOnly to false
- Hook owns hideResolved persistence — imports loadRaw/saveRaw from storageManager internally
- Returns data only — no UI component props. ContractReview renders MultiSelectDropdown and passes filter state as props

### useFieldValidation API design
- Generic validator: accepts `validate: (value: string) => { valid: boolean; error?: string; warning?: string; formatted?: string }`
- Settings passes `(v) => validateField(v, fieldType)` but any validator function works
- Hook manages 'Saved' flash feedback internally — returns showSaved boolean, handles 2-second timeout + cleanup
- Returns bundled inputProps: `{ value, onChange, onFocus, onBlur }` for spreading onto input elements
- Also returns `error`, `warning`, `showSaved` for UI rendering
- Built-in external value sync — watches initialValue changes and syncs localValue when not focused (focusedRef pattern)

### Call site wiring
- Swap + tidy: replace inline useState/handlers with hook calls AND clean up surrounding JSX to use hook return values
- Remove redundant handlers and dead code from call sites
- No structural changes to components — just state extraction
- Separate files: src/hooks/useInlineEdit.ts, src/hooks/useContractFiltering.ts, src/hooks/useFieldValidation.ts (matches existing one-hook-per-file convention)

### Claude's Discretion
- Exact TypeScript generics and type parameter design
- Internal implementation details (useCallback/useMemo optimization choices)
- How to handle FindingCard's delete confirmation state (separate from useInlineEdit)
- Exact groupedFindings sorting logic (severity ordering within groups)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useContractStore.ts`: Existing hook pattern — follow same export/file conventions
- `src/hooks/useCompanyProfile.ts`: Another hook example — uses storageManager, good pattern reference
- `src/hooks/useRouter.ts`: Navigation hook — one-hook-per-file convention established
- `src/storage/storageManager.ts`: loadRaw/saveRaw for hideResolved persistence in useContractFiltering
- `src/utils/settingsValidation.ts`: validateField function — consumed by useFieldValidation via generic callback

### Established Patterns
- Hooks directory: src/hooks/ with separate files per hook
- storageManager: typed key registry with load/save/loadRaw/saveRaw
- State management: useState + hooks, no external state library
- Framer Motion AnimatePresence: used for "Saved" feedback animation in Settings

### Integration Points
- ContractReview.tsx (lines 93-121): inline rename → useInlineEdit
- ContractReview.tsx (lines 83-208): filter state + computed results → useContractFiltering
- FindingCard.tsx (lines 20-44): note editing → useInlineEdit
- Settings.tsx ProfileField (lines 8-120): field validation → useFieldValidation
- MultiSelectDropdown: receives filter state as props from ContractReview (data-only hook boundary)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user selected recommended options throughout. All three hooks follow the same principle: encapsulate state machine + side effects, return clean API, let components handle rendering.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-hook-extraction*
*Context gathered: 2026-03-15*
