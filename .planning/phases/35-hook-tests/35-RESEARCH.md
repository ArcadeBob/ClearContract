# Phase 35: Hook Tests - Research

**Researched:** 2026-03-16
**Domain:** Vitest + React Testing Library renderHook for custom React hooks
**Confidence:** HIGH

## Summary

Phase 35 tests four custom React hooks: `useContractStore` (CRUD + state transitions + finding mutations), `useInlineEdit` (edit state machine with keyboard handlers), `useContractFiltering` (multi-dimension filter/sort/group over findings), and `useFieldValidation` (onBlur validation with revert and save-indicator timer). All hooks are already implemented and stable. The test infrastructure from Phase 33 (Vitest 3.x, jsdom, jest-dom, factories) and the factory pattern from Phase 34 are fully operational.

All four hooks are React `useState`/`useCallback`/`useMemo` hooks that run in jsdom. They require `renderHook` from `@testing-library/react` (already installed at v16.3.2). Two hooks (`useContractStore` and `useContractFiltering`) interact with localStorage via `storageManager`/`contractStorage` -- these need `localStorage.clear()` in `beforeEach` and potentially `vi.mock` for the storage modules. The `useFieldValidation` hook uses `setTimeout` for its "saved" indicator, requiring `vi.useFakeTimers`. The `useInlineEdit` hook is pure state logic with no side effects beyond a `useRef` for input focus.

**Primary recommendation:** Use `renderHook` + `act` from `@testing-library/react` for all four hooks. Mock `contractStorage` module for `useContractStore` (isolate from localStorage seeding logic). Mock `storageManager` for `useContractFiltering` (isolate `loadRaw`/`saveRaw`). Use `vi.useFakeTimers` for `useFieldValidation` timeout testing. Create one test file per hook, colocated in `src/hooks/`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOOK-01 | useContractStore tested (CRUD operations, state transitions, finding resolve/note updates) | Hook has 7 public methods: `addContract`, `updateContract`, `deleteContract`, `toggleFindingResolved`, `updateFindingNote`, `setIsUploading`, `dismissStorageWarning`. Uses `persistAndSet` internally which calls `saveContracts` -- need to mock `contractStorage` to isolate from localStorage/migration logic. `loadContracts` called once on init via `useState(() => loadContracts())`. Factory `createContract`/`createFinding` already available. |
| HOOK-02 | useInlineEdit tested (edit state machine: idle -> editing -> saving -> idle, cancel, error) | Hook exposes: `isEditing`, `editValue`, `startEditing`, `commitEdit`, `cancelEdit`, `onKeyDown`, `inputRef`. State machine: idle (isEditing=false) -> startEditing sets editValue to initialValue, isEditing=true -> commitEdit validates and calls onSave if changed+non-empty, sets isEditing=false -> cancelEdit reverts editValue to initialValue, isEditing=false. onKeyDown dispatches Enter->commitEdit, Escape->cancelEdit. No external deps, pure state. |
| HOOK-03 | useContractFiltering tested (filter/group/sort combinations, persistence to localStorage) | Hook takes `{ findings: Finding[] }`, returns `visibleFindings`, `groupedFindings`, `flatFindings` plus filter controls. Filtering: severity (5 values), category (10 values), priority (3 values), negotiationOnly boolean, hideResolved boolean. `hideResolved` persists via `loadRaw`/`saveRaw` on `clearcontract:hide-resolved`. Grouping sorts by CATEGORY_ORDER with severity-rank sub-sort. Groups sorted by most-severe-finding then count. |
| HOOK-04 | useFieldValidation tested (onBlur validate, revert on invalid, save on valid) | Hook takes `{ initialValue, validate, onSave }`. Returns `inputProps` (value, onChange, onFocus, onBlur), `error`, `warning`, `showSaved`. onBlur flow: calls validate(localValue) -> if invalid, sets error and reverts to initialValue -> if valid and changed, calls onSave, sets showSaved=true, starts 2s timer to clear showSaved. External initialValue sync: updates localValue when not focused. Uses `setTimeout` (needs fake timers). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 3.x | Test runner + mocking | Already configured in vite.config.ts with jsdom |
| @testing-library/react | 16.3.2 | `renderHook` + `act` for hook testing | Already installed, standard for React hook testing |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | Already in setup.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| src/test/factories.ts | project | `createContract`, `createFinding` | All hooks that operate on Contract/Finding data |

### No Additional Dependencies Needed
All test infrastructure is in place from Phase 33. `renderHook` is exported from `@testing-library/react` (no separate `@testing-library/react-hooks` package needed -- that was merged into RTL v13+).

## Architecture Patterns

### Test File Locations
```
src/hooks/
├── useContractStore.ts
├── useContractStore.test.ts       # NEW
├── useInlineEdit.ts
├── useInlineEdit.test.ts          # NEW
├── useContractFiltering.ts
├── useContractFiltering.test.ts   # NEW
├── useFieldValidation.ts
├── useFieldValidation.test.ts     # NEW
├── useCompanyProfile.ts
├── useRouter.ts
└── useToast.ts
```

### Pattern 1: renderHook with act
**What:** Use `renderHook` from `@testing-library/react` to test hooks in isolation without a component wrapper.
**When to use:** All four hooks.
**Example:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useInlineEdit } from './useInlineEdit';

it('transitions from idle to editing', () => {
  const { result } = renderHook(() =>
    useInlineEdit({ initialValue: 'hello', onSave: vi.fn() })
  );

  expect(result.current.isEditing).toBe(false);

  act(() => {
    result.current.startEditing();
  });

  expect(result.current.isEditing).toBe(true);
  expect(result.current.editValue).toBe('hello');
});
```

### Pattern 2: Mocking modules for isolation
**What:** Use `vi.mock` to replace storage modules so hook tests don't depend on localStorage seeding, migration, or mock contract data.
**When to use:** `useContractStore` (mock `contractStorage`), `useContractFiltering` (mock `storageManager`).
**Example:**
```typescript
import { renderHook, act } from '@testing-library/react';

vi.mock('../storage/contractStorage', () => ({
  loadContracts: vi.fn(() => ({ contracts: [], fromStorage: false })),
  saveContracts: vi.fn(() => ({ success: true })),
}));

import { loadContracts, saveContracts } from '../storage/contractStorage';
import { useContractStore } from './useContractStore';

beforeEach(() => {
  vi.mocked(loadContracts).mockReturnValue({ contracts: [], fromStorage: false });
  vi.mocked(saveContracts).mockReturnValue({ success: true });
});
```

### Pattern 3: Fake timers for timeout testing
**What:** Use `vi.useFakeTimers` to control `setTimeout` in `useFieldValidation`'s showSaved indicator.
**When to use:** `useFieldValidation` tests.
**Example:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('clears showSaved after 2 seconds', () => {
  const { result } = renderHook(() =>
    useFieldValidation({
      initialValue: 'old',
      validate: () => ({ valid: true }),
      onSave: vi.fn(),
    })
  );

  // Trigger blur with changed value
  act(() => { result.current.inputProps.onBlur(); });
  expect(result.current.showSaved).toBe(true);

  act(() => { vi.advanceTimersByTime(2000); });
  expect(result.current.showSaved).toBe(false);
});
```

### Pattern 4: Re-render with new props
**What:** Use the `rerender` return from `renderHook` to test hooks that respond to prop changes.
**When to use:** `useContractFiltering` (pass different findings arrays), `useFieldValidation` (external initialValue changes).
**Example:**
```typescript
const { result, rerender } = renderHook(
  ({ findings }) => useContractFiltering({ findings }),
  { initialProps: { findings: [finding1, finding2] } }
);

// Change input findings
rerender({ findings: [finding1] });
expect(result.current.visibleFindings).toHaveLength(1);
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't assert on internal state setters. Only test through the hook's public API (returned values and methods).
- **Forgetting `act`:** Every call to a hook method that triggers state updates must be wrapped in `act()`. Vitest will warn but tests may produce stale results.
- **Direct localStorage manipulation in hook tests:** Mock the storage modules instead. Direct localStorage access couples tests to storage implementation.
- **Testing React.KeyboardEvent without proper event shape:** `onKeyDown` expects `React.KeyboardEvent`. Create minimal `{ key: 'Enter' }` / `{ key: 'Escape' }` objects cast as `React.KeyboardEvent`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hook rendering | Custom wrapper component | `renderHook` from RTL | Handles React lifecycle, unmount cleanup, error boundaries |
| Timer control | Manual setTimeout tracking | `vi.useFakeTimers` + `vi.advanceTimersByTime` | Deterministic, no flaky async waits |
| Module mocking | Manual dependency injection | `vi.mock` + `vi.mocked` | Vitest hoists mocks, type-safe with vi.mocked |
| Finding/Contract fixtures | Inline object literals | `createFinding`/`createContract` factories | Zod-validated, consistent, unique IDs |

## Common Pitfalls

### Pitfall 1: act() warnings with async state updates
**What goes wrong:** State updates outside `act()` cause React warnings and potentially stale `result.current` reads.
**Why it happens:** Calling hook methods directly without `act()` wrapper.
**How to avoid:** Always wrap hook method calls in `act(() => { ... })`. For async operations, use `await act(async () => { ... })`.
**Warning signs:** Console warnings about "An update to X inside a test was not wrapped in act(...)".

### Pitfall 2: useContractStore's useState initializer calls loadContracts once
**What goes wrong:** Tests that expect `loadContracts` to be called on every render -- it's only called once via `useState(() => loadContracts())`.
**Why it happens:** React lazy initializer pattern runs only on first mount.
**How to avoid:** Mock `loadContracts` before `renderHook` is called. To test different initial states, unmount and re-mount with different mock return values.
**Warning signs:** Tests pass individually but fail together because mock wasn't reset.

### Pitfall 3: useContractStore's persistAndSet closure over setContracts
**What goes wrong:** The `persistAndSet` function calls `saveContracts(next)` inside `setContracts`'s updater function. The `saveContracts` mock must be set up before the state update.
**Why it happens:** The mock is called synchronously inside React's state updater.
**How to avoid:** Ensure `vi.mocked(saveContracts)` returns `{ success: true }` in `beforeEach`. To test storage failure, set mock before the specific action.

### Pitfall 4: useContractFiltering's Set-based state
**What goes wrong:** Asserting on Set equality with `toEqual` -- Sets don't compare the same as arrays.
**Why it happens:** Filter state uses `Set<Severity>`, `Set<Category>`, `Set<string>`.
**How to avoid:** Assert on the derived outputs (`visibleFindings`, `groupedFindings`, `flatFindings`) rather than the filter Sets directly. If you must check Sets, convert to arrays: `[...result.current.filters.severities]`.

### Pitfall 5: useFieldValidation timer cleanup
**What goes wrong:** Tests leak timers across test cases, causing unexpected showSaved state.
**Why it happens:** `useFieldValidation` stores timer ref and clears on unmount, but fake timers may not trigger cleanup effects.
**How to avoid:** Call `vi.useRealTimers()` in `afterEach`. The `renderHook` unmount handles React cleanup.

### Pitfall 6: React.KeyboardEvent typing in tests
**What goes wrong:** TypeScript errors when passing `{ key: 'Enter' }` to `onKeyDown`.
**Why it happens:** `onKeyDown` expects `React.KeyboardEvent`, which has many properties.
**How to avoid:** Cast the minimal object: `result.current.onKeyDown({ key: 'Enter' } as React.KeyboardEvent)`.

## Code Examples

### useContractStore: CRUD operations
```typescript
import { renderHook, act } from '@testing-library/react';
import { createContract, createFinding } from '../test/factories';

vi.mock('../storage/contractStorage', () => ({
  loadContracts: vi.fn(() => ({ contracts: [], fromStorage: false })),
  saveContracts: vi.fn(() => ({ success: true })),
}));

import { useContractStore } from './useContractStore';

it('adds a contract to the front of the list', () => {
  const { result } = renderHook(() => useContractStore());
  const contract = createContract();

  act(() => { result.current.addContract(contract); });

  expect(result.current.contracts).toHaveLength(1);
  expect(result.current.contracts[0].id).toBe(contract.id);
});

it('toggles finding resolved state', () => {
  const finding = createFinding({ resolved: false });
  const contract = createContract({ findings: [finding] });

  vi.mocked(loadContracts).mockReturnValue({
    contracts: [contract], fromStorage: true,
  });

  const { result } = renderHook(() => useContractStore());

  act(() => { result.current.toggleFindingResolved(contract.id, finding.id); });

  expect(result.current.contracts[0].findings[0].resolved).toBe(true);
});
```

### useContractFiltering: filter and group
```typescript
import { renderHook, act } from '@testing-library/react';
import { createFinding } from '../test/factories';

vi.mock('../storage/storageManager', () => ({
  loadRaw: vi.fn(() => ({ data: null })),
  saveRaw: vi.fn(() => ({ ok: true })),
}));

import { useContractFiltering } from './useContractFiltering';

it('filters by severity', () => {
  const critical = createFinding({ severity: 'Critical' });
  const low = createFinding({ severity: 'Low' });

  const { result } = renderHook(() =>
    useContractFiltering({ findings: [critical, low] })
  );

  // Deselect Low
  act(() => { result.current.toggleFilter('severities', 'Low'); });

  expect(result.current.visibleFindings).toHaveLength(1);
  expect(result.current.visibleFindings[0].severity).toBe('Critical');
});
```

### useInlineEdit: full state machine cycle
```typescript
import { renderHook, act } from '@testing-library/react';

import { useInlineEdit } from './useInlineEdit';

it('commit calls onSave when value changed', () => {
  const onSave = vi.fn();
  const { result } = renderHook(() =>
    useInlineEdit({ initialValue: 'original', onSave })
  );

  act(() => { result.current.startEditing(); });
  act(() => { result.current.setEditValue('updated'); });
  act(() => { result.current.commitEdit(); });

  expect(onSave).toHaveBeenCalledWith('updated');
  expect(result.current.isEditing).toBe(false);
});

it('commit does NOT call onSave when value unchanged', () => {
  const onSave = vi.fn();
  const { result } = renderHook(() =>
    useInlineEdit({ initialValue: 'same', onSave })
  );

  act(() => { result.current.startEditing(); });
  // Don't change value
  act(() => { result.current.commitEdit(); });

  expect(onSave).not.toHaveBeenCalled();
});
```

### useFieldValidation: revert on invalid
```typescript
import { renderHook, act } from '@testing-library/react';

import { useFieldValidation } from './useFieldValidation';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('reverts to initialValue on invalid input', () => {
  const validate = vi.fn(() => ({ valid: false, error: 'Bad input' }));
  const onSave = vi.fn();

  const { result } = renderHook(() =>
    useFieldValidation({ initialValue: 'good', validate, onSave })
  );

  // Simulate typing
  act(() => {
    result.current.inputProps.onChange({
      target: { value: 'bad' },
    } as React.ChangeEvent<HTMLInputElement>);
  });

  // Blur triggers validation
  act(() => { result.current.inputProps.onBlur(); });

  expect(result.current.error).toBe('Bad input');
  expect(result.current.inputProps.value).toBe('good'); // reverted
  expect(onSave).not.toHaveBeenCalled();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@testing-library/react-hooks` separate package | `renderHook` built into `@testing-library/react` | RTL v13 (2022) | No separate install needed, already available |
| `wrapper` option for providers | Still supported but not needed here | N/A | useContractStore/useFieldValidation don't need providers |
| `waitForNextUpdate` from old react-hooks-testing-library | `waitFor` from RTL or `act` | RTL v13+ | Old API removed; use `act` for sync updates |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x with jsdom |
| Config file | vite.config.ts (inline test config) |
| Quick run command | `npx vitest run src/hooks/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOOK-01 | useContractStore CRUD, state transitions, finding mutations | unit | `npx vitest run src/hooks/useContractStore.test.ts` | No - Wave 0 |
| HOOK-02 | useInlineEdit state machine (idle->editing->saving->idle, cancel) | unit | `npx vitest run src/hooks/useInlineEdit.test.ts` | No - Wave 0 |
| HOOK-03 | useContractFiltering filter/group/sort, localStorage persistence | unit | `npx vitest run src/hooks/useContractFiltering.test.ts` | No - Wave 0 |
| HOOK-04 | useFieldValidation onBlur validate, revert, save, timer | unit | `npx vitest run src/hooks/useFieldValidation.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/hooks/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/useContractStore.test.ts` -- covers HOOK-01
- [ ] `src/hooks/useInlineEdit.test.ts` -- covers HOOK-02
- [ ] `src/hooks/useContractFiltering.test.ts` -- covers HOOK-03
- [ ] `src/hooks/useFieldValidation.test.ts` -- covers HOOK-04

No framework install needed -- Vitest + RTL already configured.

## Hook Complexity Analysis

### useContractStore (HOOK-01) -- MEDIUM complexity
- **Lines:** 82
- **Public API surface:** 10 returned properties (7 methods, 3 state values)
- **Dependencies:** `contractStorage.loadContracts` (init), `contractStorage.saveContracts` (every mutation)
- **Key behaviors to test:**
  - `addContract` prepends to array
  - `updateContract` merges partial updates by ID
  - `deleteContract` removes by ID
  - `toggleFindingResolved` flips boolean on nested finding
  - `updateFindingNote` sets note string on nested finding
  - `storageWarning` appears when `saveContracts` returns `{ success: false, error: '...' }`
  - `dismissStorageWarning` clears the warning
  - Initial state comes from mocked `loadContracts` return
- **Mocking strategy:** `vi.mock('../storage/contractStorage')` -- mock both `loadContracts` and `saveContracts`

### useInlineEdit (HOOK-02) -- LOW complexity
- **Lines:** 74
- **Public API surface:** 8 returned properties (5 methods, 2 state values, 1 ref)
- **Dependencies:** None (pure React state)
- **Key behaviors to test:**
  - `startEditing` sets `isEditing=true`, copies `initialValue` to `editValue`
  - `commitEdit` with changed value calls `onSave`, sets `isEditing=false`
  - `commitEdit` with unchanged value does NOT call `onSave`
  - `commitEdit` with empty string does NOT call `onSave`
  - `commitEdit` with `validate` function applies validation before save
  - `cancelEdit` reverts `editValue` to `initialValue`, sets `isEditing=false`
  - `onKeyDown` Enter -> commitEdit, Escape -> cancelEdit
  - `inputRef` focus/select behavior (harder to test without DOM -- may skip or test via component test)

### useContractFiltering (HOOK-03) -- HIGH complexity
- **Lines:** 187
- **Public API surface:** 10 returned properties (4 methods, 6 derived/state values)
- **Dependencies:** `storageManager.loadRaw` (init hideResolved), `storageManager.saveRaw` (persist hideResolved)
- **Key behaviors to test:**
  - Default state: all severities/categories/priorities selected, negotiationOnly=false, hideResolved from storage
  - `toggleFilter('severities', 'Critical')` removes Critical from set, second call adds it back
  - `toggleFilter('categories', 'Legal Issues')` removes category
  - `toggleFilter('priorities', 'pre-bid')` removes priority
  - `toggleFilter('negotiationOnly')` toggles boolean
  - `setFilterSet` replaces entire filter set
  - `resetFilters` restores all defaults
  - `toggleHideResolved` persists to localStorage via saveRaw
  - `visibleFindings` correctly applies all active filters (intersection, not union)
  - `visibleFindings` with `hideResolved=true` excludes resolved findings
  - `visibleFindings` with `priorities` filter only includes findings WITH actionPriority in the set
  - `visibleFindings` with `negotiationOnly` only includes findings WITH negotiationPosition
  - `groupedFindings` groups by category in CATEGORY_ORDER, sorts within group by severity rank
  - `groupedFindings` groups sorted by most-severe finding, then by count descending
  - `groupedFindings` excludes empty groups
  - `flatFindings` sorted by severity rank (Critical first, Info last)
  - Re-render with different findings array updates all derived values

### useFieldValidation (HOOK-04) -- MEDIUM complexity
- **Lines:** 86
- **Public API surface:** 4 returned properties (inputProps object with 4 handlers, error, warning, showSaved)
- **Dependencies:** `setTimeout` (showSaved timer)
- **Key behaviors to test:**
  - Initial state: value=initialValue, error=null, warning=null, showSaved=false
  - `onChange` updates local value, clears error
  - `onFocus` sets focused ref (prevents external sync)
  - `onBlur` invalid: sets error, reverts value to initialValue, does NOT call onSave
  - `onBlur` valid + changed: calls onSave, sets showSaved=true, starts 2s timer
  - `onBlur` valid + unchanged: does NOT call onSave, no showSaved
  - `onBlur` valid + formatted: uses formatted value instead of raw input
  - `onBlur` valid: sets warning if validate returns warning
  - showSaved clears after 2000ms (fake timers)
  - External initialValue change syncs when not focused
  - External initialValue change does NOT sync when focused
  - Timer cleanup on unmount (no leaked timers)

## Open Questions

1. **inputRef focus/select behavior in useInlineEdit**
   - What we know: The hook calls `inputRef.current?.focus()` and `inputRef.current?.select()` when `isEditing && autoFocus`
   - What's unclear: Testing ref behavior without a real DOM element attached to the ref
   - Recommendation: Skip ref focus testing in hook tests. The `autoFocus` effect will be better tested in component tests (Phase 36) where an actual input element is rendered. Focus on state machine behavior.

2. **React.ChangeEvent construction in tests**
   - What we know: `useFieldValidation.onChange` expects `React.ChangeEvent<HTMLInputElement>`
   - What's unclear: Minimal shape needed to satisfy the handler
   - Recommendation: Cast `{ target: { value: 'x' } } as React.ChangeEvent<HTMLInputElement>` -- the handler only reads `e.target.value`.

## Sources

### Primary (HIGH confidence)
- Project source code: all four hook files read and analyzed in full
- Existing test infrastructure: vite.config.ts, src/test/setup.ts, src/test/factories.ts, src/test/render.tsx
- Phase 34 research and established patterns
- Package.json: confirmed @testing-library/react@16.3.2 (includes renderHook)

### Secondary (MEDIUM confidence)
- RTL renderHook API: merged from @testing-library/react-hooks into @testing-library/react at v13 (well-established pattern)
- Vitest fake timers: standard vi.useFakeTimers/vi.advanceTimersByTime API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and configured, no new deps
- Architecture: HIGH - renderHook pattern well-established, hooks fully analyzed
- Pitfalls: HIGH - identified from actual hook source code analysis
- Hook complexity: HIGH - every line of all four hooks read and behavior mapped

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- hooks are project code, not evolving libraries)
