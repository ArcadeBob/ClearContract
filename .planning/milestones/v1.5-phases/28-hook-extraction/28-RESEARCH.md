# Phase 28: Hook Extraction - Research

**Researched:** 2026-03-15
**Domain:** React custom hooks -- state extraction from components
**Confidence:** HIGH

## Summary

Phase 28 extracts three custom hooks from existing inline component logic: `useInlineEdit` (shared edit/commit/cancel pattern), `useContractFiltering` (multi-select filter state + computed findings), and `useFieldValidation` (onBlur validate/save/revert with flash feedback). All decisions are locked in CONTEXT.md with detailed API signatures. No new dependencies required -- this is pure refactoring using React 18 primitives (useState, useEffect, useRef, useMemo, useCallback).

The project has an established one-hook-per-file convention in `src/hooks/` with three existing hooks as references. ESLint enforces `react-hooks/recommended` which includes `exhaustive-deps` as a warning -- the success criteria explicitly require zero such warnings on the extracted hooks.

**Primary recommendation:** Implement each hook as a standalone file with explicit TypeScript interfaces for options and return values, then swap call sites one at a time, verifying lint passes after each swap.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- useInlineEdit API: `{ initialValue, autoFocus?, validate?, onSave }` options, returns `{ isEditing, editValue, setEditValue, startEditing, commitEdit, cancelEdit, onKeyDown, inputRef }`
- Hook manages input ref and auto-focus internally (useEffect to focus+select when autoFocus: true)
- Enter commits, Escape cancels via returned onKeyDown handler
- Cancel reverts editValue to initialValue AND exits edit mode
- useContractFiltering: includes filtering, grouping, AND sorting -- returns visibleFindings, groupedFindings, flatFindings
- Unified filter object: `filters: { severities: Set, categories: Set, priorities: Set, negotiationOnly: boolean }`
- Single `toggleFilter(type, value)` function for all filter types plus `resetFilters()`
- Hook owns hideResolved persistence via loadRaw/saveRaw from storageManager
- Returns data only -- no UI component props
- useFieldValidation: generic validator `validate: (value: string) => { valid: boolean; error?; warning?; formatted? }`
- Hook manages 'Saved' flash feedback internally (showSaved boolean, 2-second timeout + cleanup)
- Returns bundled inputProps: `{ value, onChange, onFocus, onBlur }` for spreading
- Also returns `error`, `warning`, `showSaved` for UI rendering
- Built-in external value sync -- watches initialValue changes and syncs when not focused (focusedRef pattern)
- Separate files: src/hooks/useInlineEdit.ts, src/hooks/useContractFiltering.ts, src/hooks/useFieldValidation.ts
- Call sites: swap inline state with hook calls, remove dead code, no structural component changes

### Claude's Discretion
- Exact TypeScript generics and type parameter design
- Internal implementation details (useCallback/useMemo optimization choices)
- How to handle FindingCard's delete confirmation state (separate from useInlineEdit)
- Exact groupedFindings sorting logic (severity ordering within groups)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOOK-01 | Create useInlineEdit hook -- shared by ContractReview (rename) and FindingCard (notes) | Inline edit pattern on CR lines 93-121 and FC lines 20-44 fully documented; API locked in CONTEXT.md |
| HOOK-02 | Create useContractFiltering hook -- extract multi-select filter state and visibleFindings from ContractReview | Filter state on CR lines 83-88, visibleFindings useMemo lines 170-188, groupedFindings lines 191-203, flatFindings lines 206-208 all mapped |
| HOOK-03 | Create useFieldValidation hook -- extract onBlur validation/save/revert from Settings ProfileField | ProfileField component lines 8-120 in Settings.tsx fully documented; validateField utility and ValidationResult type in settingsValidation.ts |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | useState, useEffect, useRef, useMemo, useCallback | Already installed, all hooks use these primitives |
| TypeScript | strict mode | Type interfaces for hook options/returns | Project convention |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| storageManager | local | loadRaw/saveRaw for hideResolved persistence | useContractFiltering only |
| settingsValidation | local | validateField function, ValidationResult type | Consumed by useFieldValidation callers via generic callback |

### Alternatives Considered
None -- no new libraries needed. Pure React hooks refactoring.

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/hooks/
  useContractStore.ts     # existing
  useCompanyProfile.ts    # existing
  useRouter.ts            # existing
  useInlineEdit.ts        # NEW (HOOK-01)
  useContractFiltering.ts # NEW (HOOK-02)
  useFieldValidation.ts   # NEW (HOOK-03)
```

### Pattern 1: Options Object + Destructured Return (Established Convention)
**What:** Each hook takes a typed options object and returns a named object. No positional args.
**When to use:** All three new hooks.
**Example:**
```typescript
// Follows useCompanyProfile pattern -- named exports, typed returns
interface UseInlineEditOptions {
  initialValue: string;
  autoFocus?: boolean;
  validate?: (value: string) => string; // transform/trim
  onSave: (value: string) => void;
}

interface UseInlineEditReturn {
  isEditing: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  startEditing: () => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useInlineEdit(options: UseInlineEditOptions): UseInlineEditReturn { ... }
```

### Pattern 2: Bundled inputProps for Spreading
**What:** useFieldValidation returns `inputProps` object that can be spread onto `<input>` elements.
**When to use:** useFieldValidation only.
**Example:**
```typescript
// Caller usage after extraction:
const { inputProps, error, warning, showSaved } = useFieldValidation({
  initialValue: value,
  validate: (v) => validateField(v, fieldType || 'text'),
  onSave,
});
return <input {...inputProps} className={...} />;
```

### Pattern 3: Internal Side Effects with Cleanup
**What:** Hooks own their side effects (auto-focus, timer cleanup, storage persistence) so components stay declarative.
**When to use:** All three hooks have internal effects.
**Key effects:**
- useInlineEdit: useEffect to focus+select input when editing starts
- useFieldValidation: useEffect for timer cleanup on unmount, useEffect to sync external value
- useContractFiltering: initial load of hideResolved from storage, persist on toggle

### Anti-Patterns to Avoid
- **Returning component JSX from hooks:** Hooks return data and handlers only. ContractReview renders MultiSelectDropdown using hook state as props.
- **Stale closure in onKeyDown:** The `onKeyDown` handler returned from useInlineEdit must reference current editValue. Use useCallback with correct deps or inline the handler creation.
- **Missing exhaustive-deps:** ESLint `react-hooks/recommended` is enabled. Every useCallback and useMemo must list all referenced variables. The success criteria explicitly require zero warnings.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage persistence | Custom localStorage calls | storageManager loadRaw/saveRaw | Typed key registry, error handling, quota detection already built |
| Field validation logic | Inline regex/parsing | settingsValidation.ts validateField | Already handles dollar, date, employeeCount, text with formatting |
| Severity ordering | Ad-hoc sort comparisons | severityRank constant (already in ContractReview) | Move into useContractFiltering or keep as module-level const |

**Key insight:** All three hooks extract existing, working code. The goal is relocation and interface cleanup, not reimplementation.

## Common Pitfalls

### Pitfall 1: Stale Closure in useInlineEdit onKeyDown
**What goes wrong:** onKeyDown handler captures stale editValue if wrapped in useCallback without editValue in deps.
**Why it happens:** useCallback memoizes the function, but editValue changes on every keystroke.
**How to avoid:** Either include editValue in useCallback deps (re-creates handler often but is correct) or use a ref to track current value. Since the handler is only attached to one input, frequent re-creation is fine.
**Warning signs:** Enter key commits an empty or stale value.

### Pitfall 2: FindingCard Note Edit vs ContractReview Rename Differences
**What goes wrong:** Trying to force identical useInlineEdit usage when the two call sites differ.
**Why it happens:** ContractReview uses an `<input>` with auto-focus+select, while FindingCard uses a `<textarea>` with explicit Save/Cancel buttons (no Enter-to-commit, no auto-focus).
**How to avoid:** The useInlineEdit hook should be flexible enough for both. FindingCard may not use `onKeyDown` or `inputRef` -- that is fine. The hook exposes the full API; call sites use what they need. FindingCard calls `startEditing`/`commitEdit`/`cancelEdit` via button onClick, not keyboard.
**Warning signs:** Forcing textarea to respond to Enter key when it should allow multiline input.

### Pitfall 3: Exhaustive-deps with Set Objects
**What goes wrong:** Sets in filter state (selectedSeverities, selectedCategories) are reference types. If the hook creates new Sets in the useMemo dependency array, it triggers infinite re-renders.
**Why it happens:** `new Set()` creates a new reference each render.
**How to avoid:** Store filter Sets in useState (which preserves reference identity across renders). The existing code already does this correctly -- maintain the pattern during extraction.
**Warning signs:** ContractReview re-rendering continuously after hook extraction.

### Pitfall 4: Timer Leak in useFieldValidation
**What goes wrong:** The 2-second "Saved" flash timeout fires after component unmounts, calling setState on unmounted component.
**Why it happens:** Settings page unmounts while timer is pending.
**How to avoid:** Store timer ref, clear on unmount via useEffect cleanup. The existing ProfileField code already does this (timerRef + cleanup effect) -- preserve it in the hook.
**Warning signs:** React warning about state update on unmounted component.

### Pitfall 5: initialValue Sync in useInlineEdit
**What goes wrong:** When contract.name changes externally (e.g., after rename), the hook's internal initialValue reference becomes stale.
**Why it happens:** The hook captures initialValue at call time but doesn't watch for changes.
**How to avoid:** ContractReview passes `contract.name` as `initialValue` -- since `startEditing` copies `initialValue` into `editValue` at click time, it always gets the fresh value. No sync effect needed for useInlineEdit (unlike useFieldValidation which needs the focusedRef sync pattern).

## Code Examples

### useInlineEdit -- Core Implementation Pattern
```typescript
export function useInlineEdit({ initialValue, autoFocus = false, validate, onSave }: UseInlineEditOptions): UseInlineEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(initialValue);
    setIsEditing(true);
  }, [initialValue]);

  const commitEdit = useCallback(() => {
    const finalValue = validate ? validate(editValue) : editValue;
    if (finalValue && finalValue !== initialValue) {
      onSave(finalValue);
    }
    setIsEditing(false);
  }, [editValue, initialValue, validate, onSave]);

  const cancelEdit = useCallback(() => {
    setEditValue(initialValue);
    setIsEditing(false);
  }, [initialValue]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  }, [commitEdit, cancelEdit]);

  useEffect(() => {
    if (isEditing && autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, autoFocus]);

  return { isEditing, editValue, setEditValue, startEditing, commitEdit, cancelEdit, onKeyDown, inputRef };
}
```

### useContractFiltering -- Filter State Shape
```typescript
interface FilterState {
  severities: Set<Severity>;
  categories: Set<Category>;
  priorities: Set<string>;
  negotiationOnly: boolean;
}

interface UseContractFilteringOptions {
  findings: Finding[];
}

interface UseContractFilteringReturn {
  filters: FilterState;
  toggleFilter: (type: 'severities' | 'categories' | 'priorities' | 'negotiationOnly', value?: string) => void;
  resetFilters: () => void;
  hideResolved: boolean;
  toggleHideResolved: () => void;
  visibleFindings: Finding[];
  groupedFindings: { category: Category; findings: Finding[] }[];
  flatFindings: Finding[];
}
```

### useFieldValidation -- Bundled inputProps Pattern
```typescript
interface UseFieldValidationOptions {
  initialValue: string;
  validate: (value: string) => ValidationResult;
  onSave: (value: string) => void;
}

interface UseFieldValidationReturn {
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
  };
  error: string | null;
  warning: string | null;
  showSaved: boolean;
}
```

### Call Site Transformation -- ContractReview Rename
```typescript
// BEFORE (lines 93-121):
const [isEditing, setIsEditing] = useState(false);
const [editValue, setEditValue] = useState('');
const renameInputRef = useRef<HTMLInputElement>(null);
// ... 20 lines of handlers

// AFTER:
const { isEditing, editValue, setEditValue, startEditing, commitEdit, cancelEdit, onKeyDown, inputRef: renameInputRef } = useInlineEdit({
  initialValue: contract.name,
  autoFocus: true,
  validate: (v) => v.trim(),
  onSave: (name) => onRename?.(contract.id, name),
});
```

### Call Site Transformation -- Settings ProfileField
```typescript
// BEFORE (lines 23-77): 7 useState/useRef + 4 handlers + 2 useEffects

// AFTER:
const { inputProps, error, warning, showSaved } = useFieldValidation({
  initialValue: value,
  validate: (v) => validateField(v, fieldType || 'text'),
  onSave,
});
// JSX: <input {...inputProps} className={...} />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline state in components | Custom hooks for reusable patterns | React 16.8+ (2019) | Standard practice for 7+ years |
| Class component mixins | Hooks composition | React 16.8 | No mixins in this codebase |

No recent React changes affect this work. React 18's concurrent features (useTransition, useDeferredValue) are not relevant for these synchronous state patterns.

## Open Questions

1. **FindingCard textarea vs input**
   - What we know: FindingCard uses a `<textarea>` for note editing, not an `<input>`. The useInlineEdit hook returns `inputRef` typed as `RefObject<HTMLInputElement>`.
   - What's unclear: Should the hook support both element types via a generic, or should FindingCard simply not use `inputRef`/`onKeyDown` from the hook?
   - Recommendation: FindingCard does not use `inputRef` or `onKeyDown` (it has explicit Save/Cancel buttons and no auto-focus). The hook's ref and keyboard handler are optional features. No generic needed -- FindingCard just ignores those return values.

2. **severityRank constant location**
   - What we know: `severityRank` is currently defined at module level in ContractReview.tsx and used for sorting.
   - What's unclear: Should it move into useContractFiltering.ts or stay shared?
   - Recommendation: Move it into useContractFiltering.ts as a module-level constant since it is only used for the sorting logic that the hook now owns. If needed elsewhere later, extract to a shared constants file.

3. **CATEGORY_ORDER constant location**
   - What we know: `CATEGORY_ORDER` is defined in ContractReview.tsx and used for groupedFindings ordering.
   - What's unclear: Same as severityRank.
   - Recommendation: Move to useContractFiltering.ts alongside severityRank. Both are implementation details of the filtering/sorting hook.

## Sources

### Primary (HIGH confidence)
- Project source code: ContractReview.tsx (604 lines), FindingCard.tsx (221 lines), Settings.tsx (308 lines)
- Project source code: useContractStore.ts, useCompanyProfile.ts, useRouter.ts (hook conventions)
- Project source code: storageManager.ts (loadRaw/saveRaw API)
- Project source code: settingsValidation.ts (validateField, ValidationResult, FieldType)
- Project config: .eslintrc.cjs (plugin:react-hooks/recommended enabled)
- CONTEXT.md: All API designs locked with detailed signatures

### Secondary (MEDIUM confidence)
- React 18 hooks documentation (well-established, no recent changes)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, pure React hooks
- Architecture: HIGH - all API signatures locked in CONTEXT.md, existing code fully inspected
- Pitfalls: HIGH - identified from direct code inspection of existing patterns and known React hooks gotchas

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain, no moving targets)
