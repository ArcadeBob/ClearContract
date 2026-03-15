# Architecture Research

**Domain:** React SPA refactoring — god-component decomposition, API layer modularization, type safety hardening
**Researched:** 2026-03-14
**Confidence:** HIGH (direct codebase inspection, all targets read in full)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Client (React SPA)                               │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │ContractReview│  │  Settings    │  │AllContracts  │ │
│  │  (page)      │  │  (608 lines) │  │  (page)      │  │  (page)      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │                  │         │
│  ┌──────┴─────────────────┴──────────────────┴──────────────────┴──────┐  │
│  │                     App.tsx (orchestrator)                           │  │
│  │  useContractStore · useRouter · toast state · analyze orchestration  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐   │
│  │  useContractStore  │  │  useCompanyProfile  │  │    useRouter       │   │
│  │  (contracts CRUD)  │  │  (profile + save)   │  │  (History API)     │   │
│  └─────────┬──────────┘  └─────────┬──────────┘  └────────────────────┘   │
│            │                       │                                        │
│  ┌─────────┴──────────┐  ┌─────────┴──────────┐                            │
│  │ contractStorage.ts │  │ profileLoader.ts    │   <- localStorage layer    │
│  └────────────────────┘  └────────────────────┘                            │
├──────────────────────────────────────────────────────────────────────────┤
│  Client API boundary: src/api/analyzeContract.ts (base64 + POST)          │
├──────────────────────────────────────────────────────────────────────────┤
│                       Vercel Serverless Functions                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  api/analyze.ts (1510 lines — currently monolithic)                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │  │
│  │  │ PASS CONFIGS │  │ ORCHESTRATOR │  │  zodToOutputFormat util    │ │  │
│  │  │ (16 objects) │  │ handler()    │  │  runAnalysisPass()        │ │  │
│  │  │  ~900 lines  │  │  ~200 lines  │  │  runSynthesisPass()       │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  api/merge.ts (405 lines)                                           │  │
│  │  convertLegalFinding() · convertScopeFinding() · mergePassResults() │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  api/pdf.ts · api/scoring.ts                                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│                     Shared Schemas + Knowledge                             │
│  src/schemas/ (4 files)  ·  src/knowledge/ (16 modules + registry)       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `App.tsx` | Route orchestration, upload/reanalyze logic, toast + storageWarning state | Reasonable — 303 lines, intentionally fat orchestrator |
| `ContractReview.tsx` | Findings display, filter/sort, inline rename, export, dialogs | Overloaded — 608 lines, 14 `useState` calls |
| `LegalMetaBadge.tsx` | Render legal clause metadata pills by clauseType | Pure rendering, 417 lines, no state — structural problem only |
| `ScopeMetaBadge.tsx` | Render scope metadata pills by passType | Same structural pattern, 199 lines, more manageable |
| `Settings.tsx` | Company profile form with onBlur persistence and inline validation | ProfileField inlined with field validation — candidate for hook extraction |
| `api/analyze.ts` | 16-pass orchestration + CompanyProfileSchema + pass configs + utilities | 1510 lines — all concern types co-located in one file |
| `api/merge.ts` | Finding conversion (legal+scope) + dedup + staleness check + merge | 405 lines — 3 logical concerns: conversion, dedup, orchestration |
| `useContractStore` | contracts CRUD + localStorage persistence | Clean — 82 lines, well-bounded |
| `useCompanyProfile` | Profile read/write with localStorage + error state | Clean — 32 lines, direct localStorage call is the only smell |
| `contractStorage.ts` | loadContracts + saveContracts with schema versioning | Solid — handles seeding, migration, quota errors |
| `src/schemas/` | Zod v3 schemas for all 16+ analysis pass outputs | Split across 4 files by domain — current split is already correct |
| `src/knowledge/` | 16 TypeScript knowledge modules + central registry | Map-based registry, per-pass selective loading — well-designed |

## Recommended Project Structure (Post-Refactor)

```
src/
├── types/
│   └── contract.ts              # (unchanged) Domain types — single source of truth
├── schemas/                     # (unchanged) Zod schemas by domain
│   ├── analysis.ts
│   ├── legalAnalysis.ts
│   ├── scopeComplianceAnalysis.ts
│   ├── synthesisAnalysis.ts
│   └── companyProfile.ts        # NEW — move CompanyProfileSchema here (shared server+client)
├── knowledge/                   # (unchanged) Knowledge modules + registry
│   ├── registry.ts
│   ├── index.ts
│   └── regulatory/ trade/ standards/
├── storage/
│   └── contractStorage.ts       # (unchanged) loadContracts/saveContracts
├── hooks/
│   ├── useContractStore.ts      # (unchanged)
│   ├── useCompanyProfile.ts     # (unchanged)
│   ├── useRouter.ts             # (unchanged)
│   ├── useInlineEdit.ts         # NEW — extracted from ContractReview rename state
│   ├── useContractFiltering.ts  # NEW — extracted from ContractReview useMemo/filter state
│   └── useFieldValidation.ts    # NEW — extracted from Settings.tsx ProfileField
├── utils/
│   ├── storage.ts               # NEW — centralized localStorage wrapper (get/set/remove)
│   ├── errorHandling.ts         # NEW — isNetworkError() + error classification
│   ├── severityColors.ts        # NEW — palette map replacing inline ternary chains
│   ├── exportContractCsv.ts     # (unchanged)
│   ├── exportContractPdf.ts     # (unchanged)
│   ├── bidSignal.ts             # (unchanged)
│   └── settingsValidation.ts    # (unchanged)
├── contexts/
│   └── ToastContext.tsx          # NEW — useToast context removing onShowToast prop drilling
├── components/
│   ├── LegalMetaBadge/
│   │   ├── index.tsx            # Barrel export — public API unchanged, same import path
│   │   ├── IndemnificationBadge.tsx
│   │   ├── PaymentContingencyBadge.tsx
│   │   ├── LiquidatedDamagesBadge.tsx
│   │   ├── RetainageBadge.tsx
│   │   ├── InsuranceBadge.tsx
│   │   ├── TerminationBadge.tsx
│   │   ├── FlowDownBadge.tsx
│   │   ├── NoDamageDelayBadge.tsx
│   │   ├── LienRightsBadge.tsx
│   │   ├── DisputeResolutionBadge.tsx
│   │   └── ChangeOrderBadge.tsx
│   ├── ScopeMetaBadge/
│   │   ├── index.tsx            # Barrel export
│   │   ├── ScopeOfWorkBadge.tsx
│   │   ├── DatesDeadlinesBadge.tsx
│   │   ├── VerbiageBadge.tsx
│   │   └── LaborComplianceBadge.tsx
│   └── [all other components unchanged]
├── pages/
│   ├── ContractReview/
│   │   ├── index.tsx            # Thin shell: composes subcomponents, delegates to hooks
│   │   ├── ReviewHeader.tsx     # Header bar: back nav, rename, delete/reanalyze/export buttons
│   │   ├── FindingsPanel.tsx    # Left column: filter controls + findings display
│   │   ├── ReviewSidebar.tsx    # Right column: DateTimeline + Risk Summary
│   │   └── FilterToolbar.tsx    # MultiSelectDropdown row + hide-resolved toggle
│   └── Settings.tsx             # (stays as single file — cleaner with useFieldValidation hook)
└── api/
    └── analyzeContract.ts       # MODIFIED: add Zod parse of API response before returning

api/
├── analyze.ts                   # MODIFIED: ~150 lines — handler + imports only
├── passes/
│   ├── index.ts                 # Exports ANALYSIS_PASSES array
│   ├── riskOverview.ts          # Pass config for risk-overview
│   ├── legalPasses.ts           # 11 legal pass config objects
│   └── scopePasses.ts           # 4 scope/compliance pass config objects
├── lib/
│   ├── zodToOutputFormat.ts     # Extracted pure utility function
│   ├── runAnalysisPass.ts       # Extracted pass executor
│   └── runSynthesisPass.ts      # Extracted synthesis executor
├── merge.ts                     # MODIFIED: imports from conversion/, orchestrates merge only
├── conversion/
│   ├── legalFindingConverter.ts # convertLegalFinding() — switch per clauseType
│   └── scopeFindingConverter.ts # convertScopeFinding() — switch per passType
├── pdf.ts                       # (unchanged)
└── scoring.ts                   # (unchanged)
```

### Structure Rationale

- **`api/passes/`:** Separates prompt text (pass configs) from orchestration logic. Each pass file is independently readable. Reduces analyze.ts from 1510 to ~150 lines. The 16 pass objects are static data — moving them does not change behavior.
- **`api/lib/`:** Three extracted pure functions currently inline in analyze.ts. `zodToOutputFormat` is used by `runAnalysisPass`; keeping them in the same directory avoids circular imports.
- **`api/conversion/`:** `convertLegalFinding` and `convertScopeFinding` are the longest portion of merge.ts (lines 32-213 of 405). Extracting them makes merge.ts a clean 190-line orchestrator.
- **`components/LegalMetaBadge/`:** 11 clause types in one 417-line switch-based JSX file. One file per clause type, barrel-exported. TypeScript narrows the discriminated union type automatically in each subcomponent — no `as` casts needed.
- **`pages/ContractReview/`:** Decompose 608 lines into 4 layout components + 2 hooks. The index becomes a composition surface. Each subcomponent has a single layout/data responsibility.
- **`contexts/ToastContext.tsx`:** Toast is currently prop-drilled through ContractReview via `onShowToast`. Moving to context removes the prop from ContractReview's interface entirely.
- **`utils/storage.ts`:** Three places call `localStorage` directly with inline try/catch: `contractStorage.ts`, `useCompanyProfile.ts`, and the `hideResolved` initializer in `ContractReview.tsx`. A shared wrapper removes duplicated error handling.
- **`src/schemas/companyProfile.ts`:** `CompanyProfileSchema` is currently defined inline in `api/analyze.ts` and duplicates the shape of `CompanyProfile` from `src/knowledge/types.ts`. Moving to a shared schema file lets both share the Zod-inferred type and prevents drift.

## Architectural Patterns

### Pattern 1: Hook Extraction for Component State Clusters

**What:** Group 3+ related `useState` calls + their handlers into a custom hook. Return a typed API object. The component imports and destructures what it needs.

**When to use:** When state only exists to support one logical concern (filtering, inline editing, field validation) and that concern is testable independent of JSX.

**Trade-offs:** Reduces component line count significantly; makes state logic grep-able; adds one level of indirection that is minor compared to the benefit.

**Example — useInlineEdit extracted from ContractReview:**
```typescript
// src/hooks/useInlineEdit.ts
export function useInlineEdit(initialValue: string, onCommit: (value: string) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => { setEditValue(initialValue); setIsEditing(true); };
  const commitEdit = () => {
    const trimmed = inputRef.current?.value.trim() ?? editValue.trim();
    if (trimmed && trimmed !== initialValue) onCommit(trimmed);
    setIsEditing(false);
  };
  const cancelEdit = () => setIsEditing(false);

  useEffect(() => {
    if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [isEditing]);

  return { isEditing, editValue, setEditValue, inputRef, startEditing, commitEdit, cancelEdit };
}
```

**State cluster extracted from ContractReview that becomes useContractFiltering:**
- `selectedSeverities` (Set<Severity> + useState)
- `selectedCategories` (Set<Category> + useState)
- `selectedPriorities` (Set<string> + useState)
- `hasNegotiationOnly` (boolean + useState)
- `hideResolved` (boolean + useState + localStorage init + toggle handler)
- `visibleFindings` (useMemo over 5 filter predicates)
- `groupedFindings` (derived from visibleFindings)
- `flatFindings` (derived from visibleFindings)

All 8 of these form a single coherent filtering concern and belong in one hook.

### Pattern 2: Palette Map Instead of Nested Ternary Chains

**What:** Replace nested ternaries that map domain values to Tailwind classes with a typed record object. The record is the source of truth; components index into it.

**When to use:** When the same value-to-class mapping appears in more than one JSX expression, or when a mapping chain exceeds 3 levels deep. LegalMetaBadge has approximately 30 such chains.

**Trade-offs:** Removes ternary nesting; makes color logic grep-able and reusable across components. The map is a constant — it can be defined once in `utils/severityColors.ts` and shared by LegalMetaBadge subcomponents, SeverityBadge, and any other component needing severity-conditional classes.

**Example:**
```typescript
// src/utils/severityColors.ts
export const SEVERITY_PILL: Record<Severity, string> = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-amber-100 text-amber-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  Low:      'bg-blue-100 text-blue-700',
  Info:     'bg-slate-100 text-slate-700',
};
// Usage: className={SEVERITY_PILL[finding.severity]}
```

### Pattern 3: API Layer Vertical Slicing by Responsibility

**What:** Split a monolithic serverless function by responsibility axis, not by line count. The handler file becomes a thin orchestrator that imports from co-located modules. No behavioral change — pure extraction.

**When to use:** When a single file serves 3+ distinct responsibilities that change at different rates. Pass configs change when adding clause types; the handler changes when Vercel timeout or CORS configuration changes; utilities change when Anthropic SDK evolves.

**Trade-offs:** Reduces cognitive load when editing individual passes (no scrolling past 900 lines of prompt text to reach the handler). Adds file count. Module boundaries must be clean to avoid circular imports.

**Critical constraint:** `api/passes/*.ts` files must only import from `src/schemas/`. They must not import from `api/lib/` or `api/merge.ts` to keep the dependency graph acyclic. The `zodToOutputFormat` call happens inside `runAnalysisPass()` — not inside the pass config definition.

### Pattern 4: Discriminated Union Badge Decomposition

**What:** Replace a single large component with a `meta.clauseType` switch by extracting each case into its own component. The parent component does the dispatch; each subcomponent receives only the narrowed type for its case.

**When to use:** When each branch of a discriminated union renders fundamentally different JSX, shares no internal state with sibling branches, and the overall file exceeds ~150 lines.

**Trade-offs:** TypeScript narrows the type in each subcomponent automatically — no casts needed. Each badge is independently readable and editable. Downside: 11 new files for LegalMetaBadge, though most are 20-40 lines each.

**Example dispatch pattern:**
```typescript
// src/components/LegalMetaBadge/index.tsx
export function LegalMetaBadge({ meta }: { meta: LegalMeta }) {
  switch (meta.clauseType) {
    case 'indemnification':      return <IndemnificationBadge meta={meta} />;
    case 'payment-contingency':  return <PaymentContingencyBadge meta={meta} />;
    case 'liquidated-damages':   return <LiquidatedDamagesBadge meta={meta} />;
    // ... one case per clauseType
  }
}
// Each subcomponent: meta: Extract<LegalMeta, { clauseType: 'indemnification' }>
// TypeScript narrowing is automatic — zero as-casts in subcomponents
```

### Pattern 5: Type Guard Extraction for API Boundary Validation

**What:** Replace `finding.field as SomeType` casts in `api/merge.ts` with narrow type guards. Add Zod schema parse of the full API response in the client `analyzeContract.ts` before passing data into application state.

**When to use:** Whenever server data crosses a trust boundary into strongly-typed application state. Also required for the "Validate API response on client with Zod" requirement in v1.5.

**Trade-offs:** Adds runtime validation cost (negligible for finding arrays of ~50 items). Converts silent type errors into explicit thrown errors that surface during development. A schema parse error becomes a caught exception in App.tsx's `.catch()` block, not a silent partial update.

**Integration point:** `src/api/analyzeContract.ts` receives the JSON response and currently returns it typed by assertion. Post-refactor, it pipes through `MergedAnalysisResultSchema.parse(responseJson)` before returning. The existing error handler in App.tsx catches parse failures.

## Data Flow

### Analysis Pipeline Flow

```
User selects PDF
    |
App.tsx: handleUploadComplete()
    | creates placeholder contract, navigates to review
useContractStore.addContract(placeholder)
    |
analyzeContract(file) [src/api/analyzeContract.ts]
    | base64 encode + POST /api/analyze with companyProfile
api/analyze.ts handler
    | validate CompanyProfileSchema [POST-REFACTOR: from src/schemas/companyProfile.ts]
    | preparePdfForAnalysis() -> Files API upload -> fileId
    | Promise.allSettled(ANALYSIS_PASSES.map(runAnalysisPass))  [16 parallel]
    | mergePassResults() [api/merge.ts, uses api/conversion/]
    | runSynthesisPass() [17th pass]
    | computeBidSignal()
    | return JSON
analyzeContract() receives response
    | [POST-REFACTOR: MergedAnalysisResultSchema.parse(responseJson)]
App.tsx: updateContract(id, result)
    |
useContractStore: persistAndSet -> saveContracts -> localStorage
    |
ContractReview re-renders with completed contract
```

### Finding Workflow Flow

```
ContractReview renders
    |
useContractFiltering hook [POST-REFACTOR: extracted]
    | useMemo: filters by hideResolved, severity, category, priority, negotiation
visibleFindings array
    | fed to groupedFindings (by-category view)
    | fed to flatFindings (by-severity view)
    | fed directly to CSV export handler (filter-awareness preserved)
FindingCard / CategorySection render
    |
User toggles resolved / adds note
    |
onToggleResolved / onUpdateNote props -> App.tsx
    |
useContractStore.toggleFindingResolved / updateFindingNote
    |
persistAndSet -> saveContracts -> localStorage
```

### Toast Flow (Current vs. Post-Refactor)

```
CURRENT:
App.tsx [toast state]
    | onShowToast prop
ContractReview [receives prop, passes to CSV handler]
    | calls onShowToast({ type, message })

POST-REFACTOR:
ToastContext.Provider [wraps app in App.tsx, App still owns Toast render]
    |
ContractReview's CSV handler -> useToast().showToast() directly
    (no prop threading, prop removed from ContractReview interface)
```

### State Management

```
useContractStore (React useState)
    | (contracts + CRUD operations)
App.tsx
    | (pass-through props to pages)
Pages + Components

useCompanyProfile (React useState)
    | (profile + saveField)
Settings.tsx, ContractReview.tsx (read-only for profile completeness check)

useRouter (React useState + History API)
    | (activeView, activeContractId, compareIds, navigateTo)
App.tsx only — pages receive only what they need via props
```

## Integration Points

### New vs. Modified — Explicit List

| Item | Status | Integration Change |
|------|--------|--------------------|
| `hooks/useInlineEdit.ts` | NEW | ContractReview drops 5 state vars + 3 handlers + 1 useEffect; imports 1 hook |
| `hooks/useContractFiltering.ts` | NEW | ContractReview drops 8 state/derived vars; CSV export reads `visibleFindings` from hook return (no behavioral change) |
| `hooks/useFieldValidation.ts` | NEW | Settings.tsx ProfileField drops its internal useState cluster; imports hook |
| `contexts/ToastContext.tsx` | NEW | App.tsx wraps children in Provider; ContractReview drops `onShowToast` prop; calls `useToast()` at call site |
| `utils/storage.ts` | NEW | `contractStorage.ts`, `useCompanyProfile.ts`, ContractReview `hideResolved` init all import from here |
| `utils/errorHandling.ts` | NEW | App.tsx `isNetworkError()` moves here; import replaces inline definition |
| `utils/severityColors.ts` | NEW | LegalMetaBadge subcomponents + any component with severity-conditional classes import palette map |
| `schemas/companyProfile.ts` | NEW | Moves `CompanyProfileSchema` out of `api/analyze.ts`; both analyze.ts and client can import the shared type |
| `api/passes/index.ts` | NEW | Exports `ANALYSIS_PASSES` array; `api/analyze.ts` imports instead of defining inline |
| `api/passes/riskOverview.ts` | NEW | Single pass config object extracted from analyze.ts |
| `api/passes/legalPasses.ts` | NEW | 11 legal pass config objects extracted from analyze.ts |
| `api/passes/scopePasses.ts` | NEW | 4 scope pass config objects extracted from analyze.ts |
| `api/lib/zodToOutputFormat.ts` | NEW | Pure function extracted from analyze.ts; used by `runAnalysisPass.ts` |
| `api/lib/runAnalysisPass.ts` | NEW | Function extracted from analyze.ts; depends on zodToOutputFormat + AnalysisPass type |
| `api/lib/runSynthesisPass.ts` | NEW | Function extracted from analyze.ts; standalone, no circular risk |
| `api/conversion/legalFindingConverter.ts` | NEW | `convertLegalFinding()` extracted from merge.ts lines 53-159 |
| `api/conversion/scopeFindingConverter.ts` | NEW | `convertScopeFinding()` extracted from merge.ts lines 161-213 |
| `components/LegalMetaBadge/` | MODIFIED (dir) | Existing import `'../LegalMetaBadge'` resolves to `index.tsx` — zero call-site changes |
| `components/ScopeMetaBadge/` | MODIFIED (dir) | Same barrel pattern — zero call-site changes |
| `pages/ContractReview/` | MODIFIED (dir) | App.tsx import `'./pages/ContractReview'` resolves to `index.tsx` — no App.tsx changes |
| `api/analyze.ts` | MODIFIED | Imports pass configs, lib functions; handler shrinks to ~150 lines; CORS/validation/cleanup logic unchanged |
| `api/merge.ts` | MODIFIED | Imports from `api/conversion/`; merge orchestration logic unchanged; type guard replacements for `as` casts |
| `src/api/analyzeContract.ts` | MODIFIED | Add `MergedAnalysisResultSchema.parse()` before returning result |
| `contractStorage.ts` | MODIFIED | Internal `localStorage` calls replaced with `utils/storage.ts` wrapper |
| `useCompanyProfile.ts` | MODIFIED | Internal `localStorage.setItem` replaced with storage wrapper |

### Build Order (Dependency-Driven)

Phase A through G are ordered so each is independently shippable and does not break unrelated work in parallel.

**Phase A — Foundation utilities (no dependencies on anything being refactored):**
1. `utils/storage.ts` — pure new file, no imports from changing modules
2. `utils/errorHandling.ts` — pure new file
3. `utils/severityColors.ts` — imports only from `types/contract.ts`
4. `schemas/companyProfile.ts` — move schema here; update import in `api/analyze.ts`

**Phase B — Hook extraction (depends on Phase A for storage wrapper):**
5. `hooks/useInlineEdit.ts` — no deps beyond React
6. `hooks/useContractFiltering.ts` — depends on `types/contract.ts` and Phase A `utils/storage.ts` for `hideResolved` init
7. `hooks/useFieldValidation.ts` — depends on `utils/settingsValidation.ts` only

**Phase C — Toast context (no new deps):**
8. `contexts/ToastContext.tsx` — new file; App.tsx adds Provider wrapper; ContractReview drops `onShowToast` prop

**Phase D — Component decomposition (depends on Phase A colors, Phase B hooks, Phase C context):**
9. `components/LegalMetaBadge/` — split into 11 subcomponents; barrel export; `pillBase` constant shared via internal import
10. `components/ScopeMetaBadge/` — split into 4 subcomponents; same pattern
11. `pages/ContractReview/` — decompose into ReviewHeader, FindingsPanel, ReviewSidebar, FilterToolbar; wire useInlineEdit + useContractFiltering; drop onShowToast prop (uses useToast from Phase C)

**Phase E — Type safety (can run in parallel with Phase D):**
12. Reconcile Zod/TS optionality drift in `src/schemas/analysis.ts` vs `src/types/contract.ts` (FindingSchema has `clauseText?: string` optional; Finding interface matches — verify all fields)
13. Add `MergedAnalysisResultSchema.parse()` in `src/api/analyzeContract.ts`
14. Replace `as SomeType` casts in `api/merge.ts` with type guards; replace request body type assertion in `api/analyze.ts` handler with Zod parse

**Phase F — API layer modularization (depends on Phase E type guards being in place):**
15. Extract `api/lib/zodToOutputFormat.ts`, `api/lib/runAnalysisPass.ts`, `api/lib/runSynthesisPass.ts`
16. Extract `api/passes/riskOverview.ts`, `api/passes/legalPasses.ts`, `api/passes/scopePasses.ts`, `api/passes/index.ts`
17. Extract `api/conversion/legalFindingConverter.ts`, `api/conversion/scopeFindingConverter.ts`
18. Update `api/analyze.ts` and `api/merge.ts` to import from new locations; verify TypeScript compiles

**Phase G — Storage consolidation (depends on Phase A utils):**
19. Wire `utils/storage.ts` into `contractStorage.ts`
20. Wire `utils/storage.ts` into `useCompanyProfile.ts`
21. ContractReview `hideResolved` init already moved to `useContractFiltering` in Phase B — no further action

### Internal Boundaries (Non-Negotiable)

| Boundary | Rule | Consequence of Violation |
|----------|------|--------------------------|
| `api/passes/` -> `src/schemas/` | Allowed | Pass configs hold Zod schema references |
| `api/passes/` -> `api/lib/` | Forbidden | Pass configs are data objects; utilities are behavior |
| `api/passes/` -> `api/merge.ts` | Forbidden | Would create circular dependency |
| `api/lib/` -> `api/passes/` | Allowed for `AnalysisPass` type only | runAnalysisPass needs the pass interface |
| `api/merge.ts` -> `api/conversion/` | Allowed | Converters are pure functions; no SDK imports |
| `src/hooks/` -> `src/storage/` | Allowed | Hooks may read/write storage |
| `src/storage/` -> `src/hooks/` | Forbidden | Storage is a utility, not a consumer |
| `src/contexts/` -> `src/hooks/` | Forbidden | Context is consumed by hooks, not vice versa |
| `src/components/` -> `src/types/` | Allowed | Components consume domain types |
| `src/types/` -> `src/components/` | Forbidden | Domain types must be UI-agnostic |

## Anti-Patterns

### Anti-Pattern 1: Splitting by File Size Rather than Responsibility

**What people do:** Split a 608-line component into roughly equal thirds without identifying natural seams.
**Why it's wrong:** Results in subcomponents with shared state that must be prop-drilled downward, creating more prop surface than the original component had. The problem moves rather than resolves.
**Do this instead:** Split ContractReview by layout column (ReviewHeader, FindingsPanel, ReviewSidebar) and by data concern (useContractFiltering for filter state, useInlineEdit for rename state). Each child should own its domain completely with no shared state between siblings.

### Anti-Pattern 2: Computing JSON Schema Inside Pass Config Objects

**What people do:** When extracting `api/passes/legalPasses.ts`, call `zodToOutputFormat(SomeSchema)` at the top level of each pass config object definition.
**Why it's wrong:** Pass configs are meant to be static data objects that are cheap to import. `zodToOutputFormat` involves `zodToJsonSchema` computation; it belongs at call time inside `runAnalysisPass`, not at module parse time.
**Do this instead:** Store the raw Zod schema in the pass config's `schema` field. Call `zodToOutputFormat(pass.schema)` inside `runAnalysisPass()` when the pass actually executes.

### Anti-Pattern 3: Multi-Level Barrel Exports

**What people do:** `LegalMetaBadge/index.tsx` re-exports from subcomponents that re-export from `utils/severityColors.ts`, creating 3+ barrel levels.
**Why it's wrong:** Slows TypeScript language server; makes tree-shaking unpredictable; creates circular export risk.
**Do this instead:** One level of barrel export only. `LegalMetaBadge/index.tsx` imports directly from `./IndemnificationBadge.tsx` etc., not through intermediate barrels.

### Anti-Pattern 4: Zod Schema Duplication Across Trust Boundaries

**What people do:** Keep `CompanyProfileSchema` inline in `api/analyze.ts` and the `CompanyProfile` TypeScript interface in `src/knowledge/types.ts`, letting them diverge over time.
**Why it's wrong:** An optional field added to the TypeScript interface but not the Zod schema passes server validation silently and then mismatches downstream. When the same data shape exists in two places, they will drift.
**Do this instead:** Move `CompanyProfileSchema` to `src/schemas/companyProfile.ts`. Export both `CompanyProfileSchema` (for runtime validation) and `type CompanyProfile = z.infer<typeof CompanyProfileSchema>` (for static typing). Import from this file in `src/knowledge/types.ts` and `api/analyze.ts`.

### Anti-Pattern 5: Wiring Toast Through Prop Chains

**What people do:** Add `onShowToast` as a prop to every component that might display a toast notification.
**Why it's wrong:** ContractReview currently receives `onShowToast` solely to pass it to the CSV export button handler — ContractReview itself does not call it. This is prop drilling of UI infrastructure, not data.
**Do this instead:** `ToastContext` with `useToast()` hook. App.tsx still owns the Toast render and the toast state, but any component can call `useToast().showToast()` directly. ContractReview's prop interface shrinks by one field.

### Anti-Pattern 6: Type-Asserting API Responses Without Parse

**What people do:** Cast the API JSON response to the expected type: `const result = responseJson as AnalysisResult`.
**Why it's wrong:** If the Anthropic API returns an unexpected shape (a new field, a changed enum value, a missing required field), the application silently receives malformed data. This causes runtime errors far from the source.
**Do this instead:** `MergedAnalysisResultSchema.parse(responseJson)` in `analyzeContract.ts`. A Zod parse error is thrown, caught by App.tsx's existing `.catch()` handler, and presented as an analysis failure toast. Fail loud at the boundary, not silently downstream.

## Scaling Considerations

ClearContract is a sole-user app with localStorage as the only store. Traditional scaling concerns (concurrent users, database load) are irrelevant. The relevant maintenance scaling is **how easily can a developer (including future-self) add or modify features as the codebase grows**.

| Concern | Current (1510-line analyze.ts) | Post-Refactor |
|---------|-------------------------------|---------------|
| Add a new legal clause pass | Edit 1510-line file, find correct insertion point | Add pass config to `api/passes/legalPasses.ts`, add Zod schema to `legalAnalysis.ts`, add case to `legalFindingConverter.ts` |
| Debug specific clause badge rendering | Navigate 417-line LegalMetaBadge | Open `IndemnificationBadge.tsx` (30 lines) directly |
| Add a filter type to ContractReview | Add useState + useMemo modification in 608-line component | Add to `useContractFiltering` hook (~80 lines post-extraction) |
| Show a toast from a new component | Wire `onShowToast` prop through parent chain | Call `useToast()` at the call site |
| Fix a localStorage quota error | Three files have their own try/catch copies | Fix in `utils/storage.ts` once |

## Sources

- Direct codebase inspection: `ContractReview.tsx` (608 lines, 14 `useState` calls), `LegalMetaBadge.tsx` (417 lines, ~30 nested ternary chains), `api/analyze.ts` (1510 lines), `api/merge.ts` (405 lines), `useContractStore.ts`, `useCompanyProfile.ts`, `contractStorage.ts`, `App.tsx`, `src/types/contract.ts`, `src/schemas/analysis.ts`, `ScopeMetaBadge.tsx`, `Toast.tsx`, `Settings.tsx`
- Project requirements: `.planning/PROJECT.md` v1.5 Code Health milestone targets
- React documentation: hooks API, Context API, discriminated union pattern with TypeScript
- Confidence: HIGH — all architectural claims derive from direct file reading; no assumptions about unseen code

---
*Architecture research for: ClearContract v1.5 refactoring*
*Researched: 2026-03-14*
