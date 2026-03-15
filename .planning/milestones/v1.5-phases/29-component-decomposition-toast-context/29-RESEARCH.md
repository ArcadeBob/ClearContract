# Phase 29: Component Decomposition + Toast Context - Research

**Researched:** 2026-03-14
**Domain:** React component decomposition, React Context API, TypeScript discriminated unions
**Confidence:** HIGH

## Summary

This phase is pure refactoring -- splitting god components into focused subcomponents and introducing React Context for toast notifications. The codebase already uses all the patterns needed (discriminated unions, barrel exports, hooks). No new dependencies are required.

The three decomposition targets are well-understood: LegalMetaBadge (417 lines, 11 clauseType branches), ScopeMetaBadge (199 lines, 4 passType branches), and ContractReview (507 lines, to be split into ReviewHeader, FilterToolbar, RiskSummary subcomponents). The toast context replaces prop drilling of `onShowToast` from App.tsx through ContractReview.

**Primary recommendation:** Execute badge splits first (they are self-contained with no prop interface changes), then ContractReview decomposition (depends on understanding the full component), then toast context last (touches multiple files and changes the prop interface).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- LegalMetaBadge: Directory `src/components/LegalMetaBadge/` with `index.tsx` dispatcher + 11 subcomponent files + `shared.ts`. Dispatcher uses `Record<LegalMeta['clauseType'], React.FC>` component map. Each subcomponent receives narrowed `Extract<LegalMeta, { clauseType: '...' }>` type. `shared.ts` exports `pillBase` constant and shared helpers.
- ScopeMetaBadge: Same directory pattern `src/components/ScopeMetaBadge/` with `index.tsx` + 4 subcomponents + `shared.ts`. Subcomponents: ScopeOfWorkBadge, DatesDeadlinesBadge, VerbiageBadge, LaborComplianceBadge. `shared.ts` exports `pillBase` and `formatLabel` -- duplicated (no cross-directory imports).
- ContractReview: Extract 3 flat components to `src/components/`: ReviewHeader (~130 lines), FilterToolbar (~90 lines), RiskSummary (~45 lines). ContractReview becomes ~240 line orchestrator owning `viewMode` state.
- ReviewHeader: Calls `useInlineEdit` internally, manages own confirm dialog state. Receives callbacks (onRename, onDelete, onReanalyze, onShowToast) and contract data as props.
- FilterToolbar: Receives filter state from useContractFiltering as props -- does not call the hook itself. Receives `viewMode` + `setViewMode`.
- Toast context: `src/contexts/ToastProvider.tsx` + `src/hooks/useToast.ts`. Replace-on-new semantics, 3-second auto-dismiss, wraps `<App />` in `src/index.tsx`. Remove `onShowToast` prop from ContractReview. Remove toast state from App.tsx.

### Claude's Discretion
- Exact ReviewHeader prop interface design (which fields of contract to pass vs the full Contract object)
- FilterToolbar prop interface (how filter state and callbacks are typed)
- Whether EmptyFindings stays inline in ContractReview or moves to a shared component
- Internal ToastProvider implementation details (useEffect cleanup, animation transitions)
- Whether existing Toast component file is absorbed into ToastProvider.tsx or kept as separate presentational component imported by the provider

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DECOMP-01 | ContractReview.tsx split -- extract filter/sort logic to custom hook, reduce from 608 to ~300 lines | Hook already extracted (Phase 28). This phase extracts UI subcomponents (ReviewHeader, FilterToolbar, RiskSummary) to reach target. Current file is 507 lines. |
| DECOMP-02 | LegalMetaBadge.tsx split -- extract 12 clause-type branches into subcomponents, eliminate ~30 nested ternaries | 11 clauseType variants identified in discriminated union. Directory + barrel pattern with component map dispatch. |
| DECOMP-03 | ScopeMetaBadge.tsx split -- extract scope metadata branches into subcomponents | 4 passType variants identified. Same pattern as LegalMetaBadge. |
| PATN-04 | Extract toast to useToast context -- eliminate prop drilling from App.tsx through page components | React Context + custom hook. Existing Toast component preserved as presentational. App.tsx toast state removed. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | Component framework | Already in use |
| TypeScript | strict mode | Type safety | Already in use |
| Framer Motion | (existing) | Toast animations, AnimatePresence | Already in use for toast exit animations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icons for ReviewHeader buttons | Already imported in ContractReview |

### Alternatives Considered
None -- this is pure refactoring using existing stack. No new dependencies.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    LegalMetaBadge/
      index.tsx              # Dispatcher: component map lookup + render
      shared.ts              # pillBase constant, boolPill helper
      IndemnificationBadge.tsx
      PaymentContingencyBadge.tsx
      LiquidatedDamagesBadge.tsx
      RetainageBadge.tsx
      InsuranceBadge.tsx
      TerminationBadge.tsx
      FlowDownBadge.tsx
      NoDamageDelayBadge.tsx
      LienRightsBadge.tsx
      DisputeResolutionBadge.tsx
      ChangeOrderBadge.tsx
    ScopeMetaBadge/
      index.tsx              # Dispatcher: component map lookup + render
      shared.ts              # pillBase constant, formatLabel helper
      ScopeOfWorkBadge.tsx
      DatesDeadlinesBadge.tsx
      VerbiageBadge.tsx
      LaborComplianceBadge.tsx
    ReviewHeader.tsx          # Flat in components/
    FilterToolbar.tsx         # Flat in components/
    RiskSummary.tsx           # Flat in components/
  contexts/
    ToastProvider.tsx         # React Context provider + renders Toast
  hooks/
    useToast.ts              # Consumer hook for toast context
```

### Pattern 1: Component Map Dispatcher (for LegalMetaBadge / ScopeMetaBadge)
**What:** Replace switch/if-else chains with a Record mapping discriminant values to React components
**When to use:** When a component renders different UI based on a discriminated union variant
**Example:**
```typescript
// LegalMetaBadge/index.tsx
import { LegalMeta } from '../../types/contract';
import { IndemnificationBadge } from './IndemnificationBadge';
import { PaymentContingencyBadge } from './PaymentContingencyBadge';
// ... other imports

type ClauseType = LegalMeta['clauseType'];

// Each component expects its narrowed variant type
const BADGE_MAP: Record<ClauseType, React.FC<{ meta: any }>> = {
  'indemnification': IndemnificationBadge,
  'payment-contingency': PaymentContingencyBadge,
  // ... all 11 entries
};

interface LegalMetaBadgeProps {
  meta: LegalMeta;
}

export function LegalMetaBadge({ meta }: LegalMetaBadgeProps) {
  const Badge = BADGE_MAP[meta.clauseType];
  if (!Badge) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <Badge meta={meta} />
    </div>
  );
}
```

### Pattern 2: Narrowed Subcomponent Props via Extract
**What:** Each subcomponent receives only its discriminated union variant, not the full union
**When to use:** Badge subcomponents that handle one clauseType/passType
**Example:**
```typescript
// LegalMetaBadge/IndemnificationBadge.tsx
import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type IndemnificationMeta = Extract<LegalMeta, { clauseType: 'indemnification' }>;

interface Props {
  meta: IndemnificationMeta;
}

export function IndemnificationBadge({ meta }: Props) {
  return (
    <>
      <span className={`${pillBase} ${
        meta.riskType === 'broad' ? 'bg-red-100 text-red-700'
          : meta.riskType === 'intermediate' ? 'bg-amber-100 text-amber-700'
          : 'bg-green-100 text-green-700'
      }`}>
        {meta.riskType === 'broad' ? 'Broad Form'
          : meta.riskType === 'intermediate' ? 'Intermediate Form'
          : 'Limited Form'}
      </span>
      {meta.hasInsuranceGap && (
        <span className={`${pillBase} bg-red-100 text-red-700`}>Insurance Gap</span>
      )}
    </>
  );
}
```

### Pattern 3: React Context for Toast (first context in codebase)
**What:** Provider component wraps app, exposes `showToast()` via custom hook
**When to use:** Cross-cutting concerns that would otherwise require prop drilling
**Example:**
```typescript
// src/contexts/ToastProvider.tsx
import { createContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast, ToastData } from '../components/Toast';

export interface ToastContextValue {
  showToast: (opts: { type: ToastData['type']; message: string; onRetry?: () => void }) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((opts: { type: ToastData['type']; message: string; onRetry?: () => void }) => {
    setToast({
      ...opts,
      onDismiss: () => setToast(null),
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && <Toast {...toast} />}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

// src/hooks/useToast.ts
import { useContext } from 'react';
import { ToastContext, ToastContextValue } from '../contexts/ToastProvider';

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

### Anti-Patterns to Avoid
- **Wrapper div in dispatcher AND subcomponent:** The outer `<div className="flex flex-wrap items-center gap-1 mt-2">` must live in exactly one place. Currently it is in the top-level LegalMetaBadge. Keep it there in the dispatcher; subcomponents return fragments or inner content only. Exception: ScopeMetaBadge subcomponents that return fragments with siblings (`<>...</>`) -- the wrapper div must be handled carefully per variant since some ScopeMetaBadge branches return `<>` fragments with siblings.
- **Leaking hook calls into extracted components:** FilterToolbar must NOT call `useContractFiltering` -- it receives filter state as props. Only ContractReview calls the hook.
- **Forgetting to update the auto-dismiss timer:** The CONTEXT.md says 3-second auto-dismiss, but the existing Toast uses 8 seconds for non-retry toasts. The context says 3 seconds for "all toast types" -- this changes existing behavior. The provider should use 3 seconds as specified.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast rendering position | Custom portal logic | Keep existing Toast component with its absolute positioning | Already works, uses Framer Motion animations |
| Discriminated union narrowing | Runtime type checks inside subcomponents | TypeScript `Extract<>` utility type | Compile-time safety, no runtime overhead |
| Module resolution for directory components | Custom import resolver | Standard `index.tsx` barrel export | Node/bundler resolves `./LegalMetaBadge` to `./LegalMetaBadge/index.tsx` automatically |

## Common Pitfalls

### Pitfall 1: Barrel export breaks existing imports
**What goes wrong:** Moving `LegalMetaBadge.tsx` to `LegalMetaBadge/index.tsx` without deleting the original file causes ambiguous imports
**Why it happens:** Both `LegalMetaBadge.tsx` and `LegalMetaBadge/index.tsx` would match `from './LegalMetaBadge'`
**How to avoid:** Delete the original `.tsx` file BEFORE creating the directory. Or rename original first, create directory, then delete renamed file.
**Warning signs:** TypeScript compilation errors about duplicate modules

### Pitfall 2: ScopeMetaBadge wrapper inconsistency
**What goes wrong:** Some ScopeMetaBadge branches return `<div>` wrappers, others return `<>` fragments. The scope-of-work branch wraps in a `<div>`, while dates-deadlines, verbiage, and labor-compliance return fragments (`<>...</>`).
**Why it happens:** Original code has inconsistent JSX structure per branch
**How to avoid:** Audit each branch's return structure. The dispatcher may need to handle wrapper divs differently per variant, OR standardize all subcomponents to return fragments and let the dispatcher provide consistent wrapping.
**Warning signs:** Layout shifts after split

### Pitfall 3: Toast auto-dismiss timer change
**What goes wrong:** Existing Toast uses 8-second auto-dismiss, CONTEXT.md specifies 3 seconds. This is a behavior change.
**Why it happens:** User explicitly chose 3 seconds in context session
**How to avoid:** Implement 3-second timer in the provider's `showToast` or in the Toast component. Note the existing Toast skips auto-dismiss when `onRetry` is present -- preserve this behavior.
**Warning signs:** Toasts disappearing too quickly for users to read error messages

### Pitfall 4: AnimatePresence after ContractReview split
**What goes wrong:** AnimatePresence wrapping the `by-severity` view findings list stops animating after extraction
**Why it happens:** AnimatePresence requires direct motion children. If the component hierarchy changes, exit animations break.
**How to avoid:** The AnimatePresence + FindingCard rendering stays in ContractReview (the findings display area), not in FilterToolbar. Verify filter toggle animations still work after all splits.
**Warning signs:** Items pop in/out without animation when toggling filters

### Pitfall 5: Toast positioning after context migration
**What goes wrong:** Toast renders at wrong z-index or position after moving from App.tsx's `<main>` to ToastProvider
**Why it happens:** The existing Toast uses `absolute` positioning relative to its parent `<main>`. When ToastProvider wraps `<App />`, the Toast's positioning context changes.
**How to avoid:** Change Toast positioning to `fixed` instead of `absolute` when it lives in ToastProvider (outside the `<main>` element). Or ensure ToastProvider renders the Toast inside the same positioning context.
**Warning signs:** Toast appears behind sidebar or at wrong screen position

### Pitfall 6: App.tsx toast consumers beyond ContractReview
**What goes wrong:** App.tsx `setToast` is called in `handleUploadComplete` (error case) and `handleReanalyze` (success/error cases). These callers also need migration to useToast().
**Why it happens:** Focus on removing `onShowToast` prop from ContractReview but forgetting App.tsx's own direct toast usage
**How to avoid:** App.tsx must also call `useToast()` to show toasts for upload errors and reanalyze results. All `setToast` calls in App.tsx must become `showToast()` calls.
**Warning signs:** Upload errors or reanalyze results no longer show toasts

## Code Examples

### ReviewHeader Prop Interface (Recommended)
```typescript
// Pass the full contract object rather than individual fields -- simpler and
// the component is already coupled to the Contract shape via display logic.
interface ReviewHeaderProps {
  contract: Contract;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onReanalyze?: (file: File) => void;
  isReanalyzing?: boolean;
  onRename?: (id: string, name: string) => void;
  // CSV export needs visibleFindings and filter state from parent
  visibleFindings: Finding[];
  filters: FilterState;
  hideResolved: boolean;
}
```

### FilterToolbar Prop Interface (Recommended)
```typescript
interface FilterToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  toggleFilter: (type: FilterSetType | 'negotiationOnly', value?: string) => void;
  setFilterSet: (type: FilterSetType, newSet: Set<string>) => void;
  hideResolved: boolean;
  toggleHideResolved: () => void;
}
```

### RiskSummary Prop Interface (Recommended)
```typescript
interface RiskSummaryProps {
  findings: Finding[];  // All findings (not filtered)
  resolvedCount: number;
  totalFindings: number;
}
```

### ToastProvider showToast Signature
```typescript
// Simple interface -- no onDismiss needed from consumers
interface ShowToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onRetry?: () => void;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prop drilling callbacks | React Context for cross-cutting | React 16.3+ (2018) | Standard pattern, no performance concern for low-frequency toast events |
| Switch/if-else chains for union dispatch | Component map with Record type | TypeScript 4+ | Better type safety, each file is independently testable |
| Single large component file | Directory with barrel export | Node ESM convention | Bundler resolves `./Dir` to `./Dir/index.tsx` automatically |

## Open Questions

1. **Toast positioning strategy after migration**
   - What we know: Current Toast uses `absolute` positioning inside `<main>`. ToastProvider will render outside `<main>`.
   - What's unclear: Whether to change to `fixed` positioning or restructure where Toast is rendered.
   - Recommendation: Use `fixed` positioning in Toast (change from `absolute`) since it will be rendered by ToastProvider outside the main content area. This is simpler and ensures consistent positioning regardless of scroll state.

2. **EmptyFindings component location**
   - What we know: Currently defined inline at top of ContractReview.tsx (lines 39-46). It is a simple presentational component.
   - What's unclear: Whether to keep it inline or extract to shared components.
   - Recommendation: Keep inline in ContractReview -- it is only used there, is 8 lines, and extracting adds no value.

3. **CSV export in ReviewHeader**
   - What we know: The CSV export button (lines 194-221) uses `visibleFindings`, `filters`, `hideResolved`, and calls `onShowToast`. This creates coupling between ReviewHeader and the filter state.
   - What's unclear: Whether to pass all filter state to ReviewHeader or move CSV export logic.
   - Recommendation: Pass `visibleFindings`, `filters`, and `hideResolved` as props to ReviewHeader. The CSV button needs them and they are read-only in that context. ReviewHeader calls `useToast()` directly for the "CSV exported" toast.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none |
| Quick run command | `npm run build` (type-check + bundle) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECOMP-01 | ContractReview under 350 lines, imports subcomponents | manual + build | `npm run build` | N/A |
| DECOMP-02 | LegalMetaBadge directory with barrel export resolves unchanged | build | `npm run build` | N/A |
| DECOMP-03 | ScopeMetaBadge directory with barrel export resolves unchanged | build | `npm run build` | N/A |
| PATN-04 | useToast() works without prop drilling, onShowToast removed | build + manual | `npm run build` | N/A |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build green + manual verification of toast and filter animations

### Wave 0 Gaps
- None -- no test framework to configure. Build verification is the automated check.

## Sources

### Primary (HIGH confidence)
- Source code analysis of all target files (ContractReview.tsx, LegalMetaBadge.tsx, ScopeMetaBadge.tsx, App.tsx, Toast.tsx, index.tsx, contract.ts types)
- Phase 28 extracted hooks (useInlineEdit.ts, useContractFiltering.ts) -- already in codebase

### Secondary (MEDIUM confidence)
- React Context API -- well-established pattern, no external verification needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns use existing React/TypeScript features
- Architecture: HIGH - all file structures and patterns are explicitly decided in CONTEXT.md
- Pitfalls: HIGH - identified from direct source code analysis of actual files being modified

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- pure refactoring of existing codebase)
