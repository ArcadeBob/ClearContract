# Stack Research

**Domain:** React TypeScript refactoring — component decomposition, type safety hardening, pattern consolidation, hook extraction
**Project:** ClearContract v1.5 Code Health
**Researched:** 2026-03-14
**Confidence:** HIGH

## Context

ClearContract v1.4 ships a validated stack: React 18, TypeScript (strict), Vite, Tailwind CSS, Framer Motion, Anthropic SDK, Zod v3, jsPDF, Vercel serverless, custom History API routing, localStorage persistence. This research covers ONLY what is needed for the v1.5 refactoring milestone. The question is whether any new libraries or tools are required.

**Conclusion reached before detailing: No new runtime dependencies are needed. All refactoring work uses the existing stack. The answer to the downstream question is confirmed.**

---

## What the Refactoring Work Actually Requires

### Component Decomposition

**Targets:** ContractReview.tsx (608 LOC), LegalMetaBadge.tsx (417 LOC), ScopeMetaBadge.tsx (199 LOC), api/analyze.ts (1510 LOC), api/merge.ts (405 LOC).

**What is needed:**
- Moving JSX out of large files into new `*.tsx` files in `src/components/` or new subdirectories
- Splitting server-side logic in `api/analyze.ts` into sibling modules (e.g., `api/schemas.ts`, `api/passes.ts`, `api/orchestration.ts`)
- Same for `api/merge.ts` — extract conversion functions and dedup logic into named modules

**New dependencies required:** None. This is file-splitting and co-location work. The TypeScript module system, Vite's bundler, and the existing import/export conventions handle all of it.

### Type Safety Hardening

**Targets:**
1. Zod/TypeScript optionality drift — Zod schemas mark fields required, TypeScript interfaces mark them optional (or vice versa)
2. Client-side API response validation — currently the client trusts the `/api/analyze` JSON response without Zod parsing
3. Type casts in `api/merge.ts` — `as Array<{...}>`, `as RiskOverviewResult`, `as FindingResult & Record<string, unknown>` (8 identified cast sites)
4. Request body validation schema for the POST body received by `api/analyze.ts`

**What is needed:**
- Zod v3 is already installed (`^3.25.76`). Client-side use requires only importing from `zod` — already in `node_modules`. Zero installation work.
- Type guards replace casts: `function isLegalFinding(f: unknown): f is LegalFinding { ... }` — pure TypeScript, no library.
- Optionality alignment: edit the Zod schemas and/or the TypeScript interfaces so they agree — no new tools.

**New dependencies required:** None. Zod v3 is already a dependency. Importing it client-side costs ~13KB gzipped but is already paid server-side and will be tree-shaken correctly by Vite since client and server bundles are separate. The client bundle will incur the Zod cost only for the files that import it (likely a new `src/api/validateResponse.ts` utility).

### Pattern Consolidation

**Targets:**

| Pattern | Current State | Consolidation |
|---------|--------------|---------------|
| localStorage access | Scattered across `contractStorage.ts`, `useCompanyProfile.ts`, `App.tsx`, `src/knowledge/profileLoader.ts` | Single `src/storage/storageManager.ts` with typed get/set/remove wrappers |
| Error handling | Ad-hoc try/catch in multiple call sites | `src/utils/errors.ts` with typed error classes and a `handleStorageError()` utility |
| Severity color mapping | `SeverityBadge.tsx` has the canonical map; other components duplicate inline Tailwind color strings | `src/utils/severityPalette.ts` exporting a single `SEVERITY_COLORS` record |
| Toast state | `setToast` called 10+ times in `App.tsx` with repeated `onDismiss: () => setToast(null)` boilerplate | `useToast` hook or React Context encapsulating the state and helper functions |

**What is needed:** New TypeScript/TSX utility files. No libraries. React's built-in `createContext` + `useContext` handles the toast context. The consolidation pattern is purely organizational.

**New dependencies required:** None.

### Hook Extraction

**Targets:**

| Hook | Extracts From | What It Encapsulates |
|------|--------------|---------------------|
| `useInlineEdit` | ContractReview.tsx (inline rename logic) | `isEditing`, `draftValue`, `startEdit`, `cancelEdit`, `commitEdit` state and handlers |
| `useContractFiltering` | ContractReview.tsx (filter/sort logic) | Multi-select filter state, sort state, `visibleFindings` derived value, filter reset |
| `useFieldValidation` | Settings.tsx (onBlur validation) | `validate(field, value)`, `errors` record, `revert(field)` for invalid input rollback |

**What is needed:** New `*.ts` files in `src/hooks/`. Custom hooks are plain React functions using `useState`, `useCallback`, `useMemo`, `useRef` — all already available from `react`. No hook utility libraries (e.g., `react-use`, `ahooks`) are needed or appropriate here.

**New dependencies required:** None.

---

## Recommended Stack

### Core Technologies (unchanged)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React 18 | ^18.3.1 | UI rendering, hooks | Validated, stable |
| TypeScript | ^5.5.4 | Type safety | Strict mode already enforced |
| Vite | ^5.2.0 | Bundler, dev server | Validated, no changes needed |
| Zod v3 | ^3.25.76 | Schema validation | Already installed; now extend to client-side use |

### Supporting Libraries (unchanged)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Tailwind CSS | 3.4.17 | Styling | No changes; severity palette consolidation is TypeScript-only |
| Framer Motion | ^11.5.4 | Animations | No changes |
| Lucide React | 0.522.0 | Icons | No changes |
| jsPDF + autotable | ^4.2.0 / ^5.0.7 | PDF export | No changes |

### Development Tools (unchanged)

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + @typescript-eslint | Linting | Already configured; `noUnusedLocals` and `noUnusedParameters` will catch dead code during decomposition |
| Prettier | Formatting | Already configured with `lint-staged` |
| TypeScript strict mode | Type checking | `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` in tsconfig.json — these flags actively help the refactor by surfacing stale imports and unused parameters as components are split |

---

## What NOT to Add

| Library | Why Not | What to Use Instead |
|---------|---------|---------------------|
| `react-use` | Provides `useLocalStorage`, `useToggle`, etc. Adds dependency for patterns the codebase already implements or should implement itself. 310KB minified. | Native `useState` + typed storage wrappers |
| `ahooks` | Large hook collection (~200+ hooks). Importing one hook brings the full bundle. | Custom hooks, ~30-80 LOC each |
| `immer` | Immutable state updates. Useful for deeply nested state mutations, but ClearContract's state is shallow arrays of contracts with flat finding objects. | Spread operators + `structuredClone` (already used in codebase) |
| `xstate` | State machines for complex UI state. Finding filters and inline edit have simple finite states not needing a machine model. | `useState` + `useReducer` |
| `react-error-boundary` | Adds a declarative error boundary component. The codebase uses imperative error handling (try/catch + toast). The refactor centralizes imperative handling — no boundary component needed. | Centralized `errors.ts` utility |
| `zod-to-json-schema` (client) | Already used server-side. Should stay server-only — client code does not need JSON Schema output, only Zod parse/safeParse. | `import { z } from 'zod'` directly on client |
| Any additional ESLint plugins | Current setup (`@typescript-eslint`, `react-hooks`, `react-refresh`) covers the refactoring surface. Adding `eslint-plugin-import` for import ordering or `eslint-plugin-sonarjs` for complexity checks would help but are optional quality-of-life additions, not required for the refactor to succeed. | Existing ESLint config |

---

## Optional Quality-of-Life Tools (not required, lower priority)

These tools would help but are not required for v1.5 success. Mention here for awareness; include only if a phase has bandwidth.

| Tool | Purpose | Cost | When Useful |
|------|---------|------|-------------|
| `eslint-plugin-import` | Enforces import ordering, detects unused imports | Dev-only, zero bundle | After decomposition, to keep import hygiene in new files |
| TypeScript `noUncheckedIndexedAccess` | Adds `undefined` to all array/object index access return types | Zero bundle, config change | If Zod/TS reconciliation reveals index-access bugs |

---

## Version Compatibility

| Concern | Status |
|---------|--------|
| Zod v3 client-side import | Safe. Vite tree-shakes per bundle. Client and serverless function are separate outputs. No conflict. |
| TypeScript strict + new hooks files | `noUnusedLocals` will error if a hook is created but not imported. Create hooks only when the consuming component is refactored in the same phase. |
| React Context for toast | React 18's `createContext` works with concurrent mode. No compatibility issues. |
| `useReducer` for filter state | Ships with React 18. No library needed, no compatibility concern. |

---

## Installation

```bash
# No new dependencies for v1.5.
# All refactoring uses the existing stack.
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Toast context | React `createContext` + `useContext` | `react-hot-toast` (~5KB) | Adds a dependency for state that already exists in the app; the v1.5 goal is consolidation, not library addition |
| Filter hook state | `useState` + `useReducer` | `use-immer` | Overkill; filter state is a Set of strings and a sort field, not deeply nested |
| Type guards | Hand-written type guard functions | `ts-is-present` / `zod.safeParse` | Zod is already present; use `z.safeParse()` with existing schemas rather than adding a type guard library |

---

## Sources

- Codebase inspection (2026-03-14) — package.json, tsconfig.json, .eslintrc.cjs, line counts for all refactoring targets — HIGH confidence
- [React docs: createContext](https://react.dev/reference/react/createContext) — Context API patterns — HIGH confidence
- [TypeScript strict mode flags](https://www.typescriptlang.org/tsconfig#strict) — `noUnusedLocals`, `noUnusedParameters` — HIGH confidence
- [Zod v3 docs: safeParse](https://zod.dev/?id=safeparse) — Client-side validation pattern — HIGH confidence
- [Vite tree-shaking](https://vitejs.dev/guide/features.html#npm-dependency-resolving-and-pre-bundling) — Separate client/server bundles, Zod cost only paid where imported — HIGH confidence

---
*Stack research for: ClearContract v1.5 Code Health (refactoring)*
*Researched: 2026-03-14*
