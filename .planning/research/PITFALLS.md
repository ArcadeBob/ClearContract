# Pitfalls Research

**Domain:** Refactoring a React 18 + TypeScript SPA — component decomposition, hook extraction, type safety hardening, pattern consolidation
**Researched:** 2026-03-14
**Confidence:** HIGH (codebase read directly; patterns verified against React/TypeScript/Vercel official docs and community post-mortems)
**Applies to:** v1.5 Code Health milestone for ClearContract

---

## Critical Pitfalls

### Pitfall 1: Hook Extraction Breaks Framer Motion Exit Animations via AnimatePresence

**What goes wrong:**
ContractReview.tsx renders `<AnimatePresence>` wrapping filtered finding lists. When the filter logic moves into `useContestFiltering` and the filtered array is returned as a stable reference, AnimatePresence still works — BUT if component decomposition wraps the motion children in a fragment or extra div, AnimatePresence loses the keyed child it needs to track unmount. Exit animations silently stop firing. The list items appear and disappear without animation, which looks broken compared to the rest of the UI.

**Why it happens:**
AnimatePresence requires direct children to be keyed `<motion.*>` elements. React Fragments (`<>...</>`) do not propagate keys at the level AnimatePresence inspects. When splitting a large component into sub-components, developers often wrap return values in a fragment for "clean" JSX, destroying the direct-child contract that AnimatePresence relies on.

This is a documented bug pattern in the Framer Motion GitHub issues (framer/motion#2554, framer/motion#2023) — fast state changes or structural changes around AnimatePresence cause it to desync.

**How to avoid:**
- When extracting sub-components that contain `<motion.*>` elements, ensure the parent's `<AnimatePresence>` wrapper maps over the motion elements directly, not over the sub-component wrapper.
- Test: toggle a filter and verify items animate out, not just disappear.
- Alternative pattern: move AnimatePresence inside the extracted component rather than keeping it in the parent.
- Never wrap a motion element in a Fragment when it is a direct child of AnimatePresence.

**Warning signs:**
- Filtered list items disappear without animation after a refactor.
- `key` prop warnings appear in the console for list items.
- AnimatePresence props like `mode="wait"` stop having any visible effect.

**Phase to address:** Component Decomposition phase (ContractReview split). Must be verified after every split.

---

### Pitfall 2: useMemo Dependencies Silently Break After Hook Extraction

**What goes wrong:**
ContractReview.tsx has a `useMemo` for `visibleFindings` (line 174-192) with six dependencies: `contract.findings`, `hideResolved`, `selectedSeverities`, `selectedCategories`, `selectedPriorities`, `hasNegotiationOnly`. If filter state moves into `useContractFiltering`, the returned filtered array is still computed inside the hook — but the hook's internal dependencies are now invisible to ESLint's exhaustive-deps rule running in the parent. If a new filter is added to the hook but the hook's internal `useMemo` dependency array is incomplete, filtering silently returns stale results on some state transitions.

**Why it happens:**
The ESLint `react-hooks/exhaustive-deps` rule only validates dependencies within the same function scope. Once logic moves into a custom hook, the caller has no visibility into the hook's internal dependency correctness. Without a test suite, a missing dependency produces a bug that only manifests in specific filter-toggle sequences — not on every render.

**How to avoid:**
- Verify the ESLint `react-hooks/exhaustive-deps` rule is enabled and applied to custom hook files (check `.eslintrc`).
- After extracting `useContractFiltering`, run `npm run lint` and treat dependency warnings as blocking, not optional.
- The hook should accept all filter state as parameters (not read from closures) so dependencies are explicit: `useContractFiltering(findings, { hideResolved, selectedSeverities, selectedCategories, selectedPriorities, hasNegotiationOnly })`.
- Manually test: apply each filter in isolation after extraction. Verify the count changes correctly.

**Warning signs:**
- Filter count badges show wrong numbers intermittently.
- Toggling a filter once does nothing; toggling twice works.
- The `visibleFindings` array doesn't update when `hideResolved` changes.

**Phase to address:** Hook Extraction phase (useContractFiltering). Run lint after extraction.

---

### Pitfall 3: Vercel Serverless Function Splitting Breaks the `export const config` Requirement

**What goes wrong:**
`api/analyze.ts` has `export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }` at the top. This Vercel-specific config export must live in the entry-point file for the route — the file Vercel maps to a function. If `analyze.ts` is refactored so the actual handler logic moves to a module (e.g., `api/handlers/analyze.ts`) and `api/analyze.ts` becomes a thin re-export, Vercel will NOT pick up the `config` if it's not in the file the route maps to.

The consequence is that the 15MB body parser limit reverts to Vercel's default (1MB). Base64-encoded PDFs averaging 3-5MB will be silently truncated or rejected with a 413, and users will see upload failures for files that worked before. This does not show up in `vercel dev` if the local dev server doesn't enforce the same limit.

**Why it happens:**
Vercel's routing maps `api/*.ts` files directly. The `config` export is tied to file location, not module exports. If `analyze.ts` becomes `export { handler as default } from './handlers/analyze'`, the config in the re-exported file is invisible to Vercel's build tooling.

**How to avoid:**
- Keep `export const config` and the default export handler in `api/analyze.ts`. Extract only logic (pass definitions, schema conversion, orchestration helpers) into modules that `analyze.ts` imports — not the other way around.
- Never convert `api/analyze.ts` into a re-export barrel.
- After any restructuring, deploy a Vercel preview and test uploading a PDF between 1MB and 5MB to verify the body limit is still in effect.

**Warning signs:**
- Upload failures in Vercel preview for files that work locally.
- 413 errors from the `/api/analyze` endpoint.
- `Failed to parse body` or truncated JSON responses from the analysis endpoint.

**Phase to address:** Serverless function modularization (analyze.ts decomposition). Must be checked in preview deployment.

---

### Pitfall 4: Zod/TypeScript Optionality Reconciliation Deletes Runtime Data

**What goes wrong:**
The codebase has a documented pattern (PROJECT.md key decisions) of making fields `required` in Zod schemas and `optional` on TypeScript interfaces for backward compatibility with old localStorage contracts. If the reconciliation work makes a field required on the TS interface (to fix optionality drift), it silently breaks loading of contracts stored before that field existed. `JSON.parse` returns the field as `undefined`; TypeScript says it's required; nothing errors at runtime, but the field is `undefined` where code expects a string. Downstream nullish coalescing (`??`) masks the issue until a code path that doesn't use `??` throws.

Concrete example: if `actionPriority` is made required on `Finding` (to match the Zod schema), all contracts analyzed before v1.4 that lack `actionPriority` on their findings will silently have `undefined` for that field. The action priority filter in ContractReview (line 185-187) would then exclude ALL findings when the `pre-bid` filter is active.

**Why it happens:**
localStorage is a schemaless store. There is no migration gate. Each time the data model evolves, existing stored data has the old shape. TypeScript strict mode catches structural incompatibilities at compile time but NOT at the `JSON.parse` boundary, where everything is `unknown` and the code casts with `as Contract[]` (contractStorage.ts line 44).

**How to avoid:**
- Before making any TS interface field non-optional, add a migration in `contractStorage.ts` that normalizes the shape after `JSON.parse`. The existing schema version key (`clearcontract:schema-version`) supports this — bump it and add a migration function.
- Use `z.infer<typeof FindingSchema>` to derive the TypeScript type, NOT a hand-written interface. This ensures TS type and Zod schema cannot drift.
- After any type change, manually test by loading a contract that was saved with the previous data shape (copy old JSON into localStorage manually).

**Warning signs:**
- Filter counts drop to zero after a type change but findings are visible.
- Components show "undefined" as rendered text.
- TypeScript compiles clean but runtime behavior is wrong.

**Phase to address:** Type Safety phase (Zod/TS reconciliation). Must include migration before shipping.

---

### Pitfall 5: Toast Context Re-renders Kill Filter Dropdown Performance

**What goes wrong:**
Extracting toast state to a `useToast` context means every component that calls `useToast()` re-renders when any toast is shown or dismissed. ContractReview renders the multi-select dropdowns (MultiSelectDropdown.tsx) — if those consume the toast context (even indirectly via a parent), showing a toast during analysis causes the entire filter panel to re-render. At 50+ findings with Framer Motion stagger animations, this produces a visible frame drop.

The more direct version: if `useToast` is added to App.tsx as a context provider wrapping everything, and the toast context value object is recreated on every render (the default when using `useState` directly in a provider), every context consumer re-renders on any toast event.

**Why it happens:**
React Context has no built-in memoization. When the provider's value changes (e.g., `toast` state goes from `null` to `{type: 'success', ...}`), every component that called `useContext(ToastContext)` re-renders. The current architecture passes toast as a prop chain (`onShowToast` in ContractReview props), which is actually more efficient — only the prop recipient re-renders.

**How to avoid:**
- Memoize the context value object: `useMemo(() => ({ showToast, dismissToast }), [])` — keep the dispatch functions stable with `useCallback`.
- Split toast context into two contexts: one for toast state (read), one for dispatch (write). Components that only show toasts consume dispatch context; the Toast component itself consumes state context.
- Alternatively: keep the current prop-passing pattern for `onShowToast`. It is already working and prop-drilling one level is fine for this app's size. Context adds complexity without benefit if the prop chain is short.
- Do not add toast context until profiling shows prop-drilling is actually causing maintenance problems.

**Warning signs:**
- Filter dropdowns stutter or re-render when a toast appears.
- React DevTools Profiler shows ContractReview re-rendering on toast dismissal.
- Framer Motion animations restart unexpectedly during toast transitions.

**Phase to address:** Pattern Consolidation phase (toast context extraction). Profile before and after.

---

## Moderate Pitfalls

### Pitfall 6: Centralizing localStorage Access Creates a False Single Source of Truth

**What goes wrong:**
The plan includes creating a "storage manager" to centralize localStorage access. If this manager is a module-level singleton (not a React hook), it cannot participate in React's render cycle. The `useContractStore` hook currently calls `saveContracts` directly and reflects storage errors back into React state via `setStorageWarning`. A storage manager that lives outside the hook breaks this feedback loop — quota errors are swallowed or require a separate channel to surface to the UI.

Additionally, `useCompanyProfile` and `contractStorage` currently use different localStorage keys (`clearcontract:profile` vs `clearcontract:contracts`). A centralized manager that wraps both must maintain backward compatibility with those exact key strings — changing them requires a migration.

**How to avoid:**
- Design the storage manager as a utility layer (pure functions), not a React context or global class with internal state. It should replace the raw `localStorage.*` calls but not own state.
- Keep the existing key strings exactly as-is. Document them as API contracts.
- The storage manager's error return format must match what `useContractStore.persistAndSet` and `useCompanyProfile.saveField` already handle.
- The `HIDE_RESOLVED_KEY` inside ContractReview.tsx (line 134) is a third localStorage key that the storage manager should also cover — don't miss it.

**Warning signs:**
- Storage quota errors stop appearing in the UI banner.
- Company profile changes don't persist across page refreshes after refactor.
- The `clearcontract:hide-resolved` key is missing from the centralized manager.

**Phase to address:** Pattern Consolidation phase (localStorage centralization).

---

### Pitfall 7: Extracting useInlineEdit Loses ref Focus Behavior

**What goes wrong:**
The inline rename logic in ContractReview.tsx (lines 92-120) uses `renameInputRef` with a `useEffect` that calls `renameInputRef.current?.focus()` and `renameInputRef.current?.select()` when `isEditing` becomes true. If `useInlineEdit` is extracted and returns the ref, but the consuming component creates a second ref (or uses a forwarded ref incorrectly), the focus effect fires against a ref that doesn't point to the actual DOM node. The input renders but is never focused — the user sees a text box appear but has to click into it manually.

**Why it happens:**
`useRef` returns the same object on every render, but the `.current` assignment happens during render commit. If the custom hook owns the ref and the component mounts the input with that ref, it works. If the component creates its own ref and doesn't pass it to the hook, the hook's ref is always `null`. The split between "hook owns ref" and "component owns DOM" must be clear.

**How to avoid:**
- `useInlineEdit` should return the ref object and the component attaches it to the DOM element: `<input ref={editRef} ... />`. The hook owns the ref, the component wires it to the DOM.
- Test immediately after extraction: start editing (click pencil icon), verify the input auto-focuses and text is pre-selected.
- The `commitRename` logic (line 102-108) reads `renameInputRef.current?.value` directly from the DOM element — this pattern must be preserved or replaced with controlled input state.

**Warning signs:**
- After rename refactor, input renders but requires manual click to focus.
- Select-all on rename start stops working.
- TypeScript shows ref type mismatch between hook return type and input element.

**Phase to address:** Hook Extraction phase (useInlineEdit).

---

### Pitfall 8: Pass Name String Coupling in merge.ts Type Guards

**What goes wrong:**
`api/merge.ts` has a large switch-on-pass-name block (`convertLegalFinding`, lines 59+) that maps pass name strings like `'legal-indemnification'`, `'legal-payment-contingency'`, etc. to legalMeta shapes. If analysis passes in `api/analyze.ts` are reorganized and any pass is renamed, the merge logic silently stops populating `legalMeta` for that pass — findings appear in the UI without their structured metadata (no clause type badges, no specialized display in LegalMetaBadge). No TypeScript error catches this because both files use string literals.

**Why it happens:**
Pass names are stringly typed. The `ANALYSIS_PASSES` array in `analyze.ts` and the switch in `merge.ts` must agree on every string, but TypeScript does not enforce this. When modularizing the pass config, if a pass is renamed for clarity (e.g., `'legal-payment-contingency'` to `'payment-contingency'`) and the rename is not propagated to `merge.ts`, the type guard falls through to the default case and `legalMeta` is undefined.

**How to avoid:**
- Extract pass names as a `const` enum or `as const` object shared between `analyze.ts` and `merge.ts`. Both files import from the same source of truth.
- When adding the request validation schema (also planned for v1.5), include pass name validation against the same constant list.
- After any pass restructuring, scan for all occurrences of each pass name string in the codebase and verify consistency.

**Warning signs:**
- LegalMetaBadge stops rendering for a specific clause type after pass restructuring.
- Finding cards for indemnification (or any legal clause) show no clause type pills.
- `sourcePass` on findings in the UI shows the new name but `legalMeta` is undefined.

**Phase to address:** Serverless function modularization (analyze.ts, merge.ts decomposition).

---

### Pitfall 9: Color/Severity Map Centralization Breaks Tailwind's Static Analysis

**What goes wrong:**
The plan includes centralizing color/severity mapping into a "palette map." The current pattern uses inline Tailwind class strings like `'bg-red-100 text-red-700'` inside switch statements. If centralization moves these to a JavaScript object like `{ Critical: { bg: 'bg-red-100', text: 'text-red-700' } }`, Tailwind's JIT compiler can no longer statically scan for these class names at build time. The classes are absent from the generated CSS bundle. In production, severity badges render with no background color or text color.

**Why it happens:**
Tailwind's JIT purge mechanism works by scanning source files for complete class name strings. Dynamic string concatenation (`'bg-' + color + '-100'`) and object lookups where the class names are values in a map are NOT reliably picked up by the scanner. This is a well-known Tailwind pitfall documented in their safelist configuration.

**How to avoid:**
- Keep complete class strings, never fragment them. The palette map must contain the full Tailwind class strings, not color names: `{ bg: 'bg-red-100', text: 'text-red-700' }` — not `{ color: 'red', shade: '100' }`.
- After implementing the palette map, run `npm run build` and visually inspect a contract review with all severity levels visible. Do not rely on `npm run dev` — Vite dev mode does not purge.
- Alternatively, add the severity-related classes to Tailwind's `safelist` in `tailwind.config.js` to guarantee they are always included.

**Warning signs:**
- SeverityBadge components render as unstyled elements in production builds.
- `npm run build` output is dramatically smaller than expected (purged legitimate classes).
- Classes appear in dev but disappear in the Vercel preview deployment.

**Phase to address:** Pattern Consolidation phase (color/severity mapping).

---

### Pitfall 10: Client-side Zod Validation of API Response Rejects Valid Data After Schema Evolution

**What goes wrong:**
Adding client-side Zod validation of the `/api/analyze` response is good for catching malformed responses. However, if `src/schemas/analysis.ts` (the shared schema) is updated during the v1.5 type safety work and an existing contract in localStorage was saved with the old shape, the Zod validator on the client will reject the stored data as invalid when it is passed through any validation path. Additionally, if the server-side Zod schemas and the client-side validation schema are allowed to drift (different optional/required treatment), the client will reject responses that the server considers valid.

**Why it happens:**
The schemas in `src/schemas/` are shared between client and server (imported by both `api/analyze.ts` and client code). This is correct. But during reconciliation, if the client-side interface (TS type) is separately validated with a stricter schema than what the server produces, valid server responses fail client validation. The shared schema is the contract — it must not be made stricter on one side.

**How to avoid:**
- Client-side validation schema = same Zod schema used server-side. Do not create a separate "strict" schema for client validation.
- Use `.safeParse()` not `.parse()` on the client — unknown shapes from old localStorage data should produce a warning and use the stored data as-is, not throw.
- Scope the client-side validation to API responses only, not to localStorage read paths.

**Warning signs:**
- Contracts loaded from localStorage disappear or show "invalid data" after schema reconciliation.
- API responses that the server sends correctly are rejected by the client with Zod parse errors.
- `z.ZodError` appears in the browser console for data that was previously working.

**Phase to address:** Type Safety phase (client validation, Zod/TS reconciliation).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `as SomeType` casts in merge.ts when converting pass results | Avoids verbose type guard boilerplate | Silently wrong types reach the UI; legalMeta fields may be undefined | Never for discriminated union fields; acceptable for primitive fields with runtime-safe fallbacks |
| Keeping HIDE_RESOLVED_KEY defined inline in ContractReview.tsx | Avoids touching storage layer | Three separate localStorage key definitions scattered across codebase; one missed during centralization | Acceptable until centralization phase, not after |
| Hardcoded CATEGORY_ORDER array in ContractReview.tsx | Simple, clear ordering | Must be kept in sync with `CATEGORIES` const in contract.ts; new categories added to the type won't appear in review without updating this array | Acceptable, but add a lint/compile check that every CATEGORIES item appears in CATEGORY_ORDER |
| String literals for pass names in ANALYSIS_PASSES and merge.ts | Fast to add new passes | Renaming a pass breaks metadata extraction silently | Never — should be a shared const |
| Inline filter logic in ContractReview.tsx useMemo | Co-located with the state it depends on | 6-dependency memoized filter is hard to test or compose | Acceptable until useContractFiltering extraction |

---

## Integration Gotchas

Common mistakes when connecting components after refactoring.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| useContractFiltering + ContractReview | Hook returns new array reference every render (no memo) causing all child finding cards to re-render | useMemo inside the hook with stable dependency identity |
| useInlineEdit + AllContracts + ContractReview | Extracting hook and using it in two places, then making the hook stateful in a way that cross-pollutes (e.g., shared module-level state) | Each component call to useInlineEdit gets isolated state — hooks are instance-scoped, not shared |
| Storage manager + useContractStore | Storage manager throws on quota exceeded; hook catches only DOMException but manager wraps in a generic Error | Preserve the existing DOMException check or ensure the manager re-throws DOMException, not wraps it |
| Anthropic Files API + analyze.ts modularization | Moving `preparePdfForAnalysis` import outside the handler function causes the undici fetch override to be called before the module is loaded | Keep import and undici setup in the same module scope as the handler |
| Zod client validation + analyzeContract.ts | Calling `.parse()` on the raw API response before null-checking `result.findings` causes unhandled throw in the error path | Always call `.safeParse()` on untrusted data; `.parse()` only on data known to be valid |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering all FindingCard components on filter toggle | Brief white flash on filter change; worse with 50+ findings | Memoize FindingCard with React.memo; ensure stable props (callbacks wrapped in useCallback) | 30+ findings with Framer Motion animations |
| LegalMetaBadge renders 12 sub-components unconditionally | Profiler shows LegalMetaBadge as slow even when clause type doesn't match | Early return pattern — render nothing if `meta.clauseType` doesn't match the sub-component's target; current switch-on-clauseType is correct | Not a current problem; relevant only if clause type count increases further |
| `getAllModules()` in merge.ts called on every finding conversion | Module store iterated once per finding | Move the call outside the per-finding loop; call once per merge operation | Current: called in `computeRiskScore` (scoring.ts) — verify after merge.ts refactor |
| localStorage serialization of full Contract array on every finding resolve/note change | Noticeable pause on keystroke when annotating a finding in a large contract | Debounce saves or save only the changed contract, not the full array | 5+ contracts with 50+ findings each (~500KB+ in storage) |

---

## "Looks Done But Isn't" Checklist

- [ ] **useContractFiltering extraction:** Verify CSV export still uses the same filtered array (not unfiltered) — the filter-aware export is intentional behavior, not a bug.
- [ ] **LegalMetaBadge decomposition:** Verify each sub-component handles its clause type only and renders null for others — not that it renders an empty div (empty div breaks flex gap spacing).
- [ ] **Storage manager centralization:** Verify `HIDE_RESOLVED_KEY` (`clearcontract:hide-resolved`) is included alongside contracts and profile keys.
- [ ] **Color palette map:** Run `npm run build` (not just `npm run dev`) and check SeverityBadge in the production bundle — Tailwind purge runs only at build time.
- [ ] **Zod/TS reconciliation:** After making any field non-optional in a TS interface, test with localStorage data from the previous schema shape to verify backward compatibility.
- [ ] **analyze.ts modularization:** Deploy a Vercel preview and test uploading a 3-5MB PDF — verifies 15MB body limit config is still active.
- [ ] **useInlineEdit extraction:** Test rename flow end-to-end: click pencil, verify auto-focus + select-all, type new name, press Enter, verify contract name updates in both header and sidebar.
- [ ] **Toast context:** Run React DevTools Profiler during a toast event — verify ContractReview's filter dropdowns do not re-render.
- [ ] **Pass name constants:** After extracting pass config, search the codebase for any remaining string literals matching pass names that did not use the constant.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AnimatePresence broken after component split | LOW | Identify the fragment wrapping motion children; replace with a motion element or move AnimatePresence inside the sub-component |
| Vercel body limit reverted after analyze.ts restructuring | LOW | Move `export const config` back into `api/analyze.ts` entry file; redeploy |
| Tailwind purged severity classes in production | LOW | Add affected classes to `safelist` in `tailwind.config.js`; rebuild and redeploy |
| localStorage data incompatible after type field change | MEDIUM | Bump schema version, add migration function in contractStorage.ts to normalize the field; users will get migration warning once |
| Pass name mismatch causes legalMeta to be undefined | MEDIUM | Add shared pass name const, update switch in merge.ts, redeploy serverless function |
| stale useMemo dependency causes wrong filter results | MEDIUM | Re-examine hook's internal dependency array; add missing dep; verify with manual filter toggle test |
| Toast context causes excessive re-renders | HIGH | Split context into read/write, memoize provider value, or revert to prop-passing pattern |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AnimatePresence broken by component split (P1) | Component Decomposition | Toggle a filter after each split; verify items animate out |
| useMemo dependency breaks after hook extraction (P2) | Hook Extraction | Run lint with exhaustive-deps after extraction; manual filter tests |
| Vercel config export location (P3) | Serverless Modularization | Deploy preview, upload 3-5MB PDF |
| Zod/TS optionality breaks localStorage data (P4) | Type Safety | Load pre-migration localStorage data manually; verify all findings visible |
| Toast context re-render performance (P5) | Pattern Consolidation | React DevTools Profiler during toast event |
| Storage manager breaks quota error feedback (P6) | Pattern Consolidation | Simulate quota exceeded; verify banner appears |
| useInlineEdit loses ref focus (P7) | Hook Extraction | Test rename flow: click pencil -> auto-focus + select-all |
| Pass name string coupling in merge.ts (P8) | Serverless Modularization | Search for remaining string literals after extract; visual check of LegalMetaBadge |
| Tailwind purge removes palette map classes (P9) | Pattern Consolidation | `npm run build` then visual severity badge check in browser |
| Client Zod validation rejects valid API data (P10) | Type Safety | Verify `.safeParse()` used on all untrusted paths |

---

## Sources

- Framer Motion GitHub issues: [AnimatePresence stuck on fast state change](https://github.com/framer/motion/issues/2554), [AnimatePresence doesn't update with latest state](https://github.com/framer/motion/issues/2023)
- [Why Framer Motion Exit Animations Fail](https://medium.com/javascript-decoded-in-plain-english/understanding-animatepresence-in-framer-motion-attributes-usage-and-a-common-bug-914538b9f1d3)
- [Vercel Serverless Function 250MB size limit](https://vercel.com/kb/guide/troubleshooting-function-250mb-limit) — `config` export location requirements
- [Vercel Functions docs](https://vercel.com/docs/functions) — bodyParser config must be in route entry file
- [React hooks/exhaustive-deps rule](https://react.dev/learn/reusing-logic-with-custom-hooks) — custom hook dependency visibility
- [Tailwind JIT purge and dynamic classes](https://tailwindcss.com/docs/content-configuration#dynamic-class-names) — safelist for runtime-determined classes
- [Pitfalls of overusing React Context](https://blog.logrocket.com/pitfalls-of-overusing-react-context/) — re-render behavior of context consumers
- [Optimizing React Context for Performance](https://www.tenxdeveloper.com/blog/optimizing-react-context-performance) — split context read/write pattern
- [Prevent re-renders with useContext](https://blog.allaroundjavascript.com/prevent-unnecessary-re-renders-of-components-when-using-usecontext-with-react)
- [Can you refactor JavaScript safely without test coverage?](https://dev.to/p42/can-you-refactor-javascript-safely-without-test-coverage-2hbo) — risk categorization for untested refactors
- [Refactoring components in React with custom hooks](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks) — hook extraction patterns
- Direct codebase reads: `ContractReview.tsx`, `useContractStore.ts`, `useCompanyProfile.ts`, `contractStorage.ts`, `api/analyze.ts`, `api/merge.ts`, `api/scoring.ts`, `src/knowledge/registry.ts`, `src/types/contract.ts`, `src/components/Toast.tsx`

---
*Pitfalls research for: v1.5 Code Health — refactoring/component decomposition/type safety*
*Researched: 2026-03-14*
