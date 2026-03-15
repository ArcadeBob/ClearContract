# Feature Research

**Domain:** React/TypeScript codebase refactoring — component decomposition, hook extraction, type safety, pattern consolidation
**Researched:** 2026-03-14
**Confidence:** HIGH (direct codebase inspection; all findings come from reading source files, not training data)

---

## Context: What This Milestone Is

v1.5 is a code health sweep on an existing ~9,700 LOC React 18 + TypeScript + Vite application. There are no user-facing features being added. The "features" here are refactoring work items that improve maintainability, type safety, and developer experience. The sole user of the application will not notice any of these changes — all value is captured by the developer.

All items are drawn from direct inspection of the source. Complexity estimates reflect actual code size, coupling, and regression risk.

---

## Feature Landscape

### Table Stakes (Must Do — These Fix Active Correctness Gaps)

These are non-negotiable. Missing them means the codebase has real bugs or type system gaps that will cause future pain.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| POST body request validation schema | `api/analyze.ts` validates `companyProfile` via Zod (lines 53-74) but `pdfBase64` and `fileName` are not validated for presence or type before use. A missing field causes an opaque crash inside the analysis pipeline rather than a clean 400 response. | LOW | Wrap existing `CompanyProfileSchema` in a top-level `RequestBodySchema` adding `pdfBase64: z.string()` and `fileName: z.string()`. Return 400 with clear error if validation fails. One file change. |
| Zod/TS optionality reconciliation | Fields like `actionPriority` and `negotiationPosition` are `required` in Zod schemas but `optional` in `src/types/contract.ts` TypeScript interfaces. TypeScript strict mode passes but the runtime contract doesn't match the static type. Zod schema is the source of truth — TS types should derive from it. | MEDIUM | Audit each schema file against its corresponding TS interface. For each mismatch, decide direction: either add `?` to Zod (if truly optional in API output) or remove `?` from TS (if Zod requires it). Changes cascade to call sites. |
| Client-side Zod validation of `/api/analyze` response | `src/api/analyzeContract.ts` line 77 does `return response.json()` with zero validation. If the API returns a malformed shape, the failure surface is wherever the data is consumed (finding render, PDF export, etc.) rather than at the boundary. | MEDIUM | Define a `AnalysisResultSchema` mirroring the `AnalysisResult` interface. Call `.parse()` on `response.json()` before returning. One new schema export; one `.parse()` call in `analyzeContract.ts`. Zod is already in the project. |
| Replace `merge.ts` type casts with type guards | `api/merge.ts` has ~40 `as string`, `as boolean`, `as string[]` casts operating on `FindingResult & Record<string, unknown>`. Every cast silently swallows a type mismatch. The Zod schemas in `src/schemas/legalAnalysis.ts` already carry the correct field shapes — converting `convertLegalFinding` and `convertScopeFinding` to use type guards derived from those schemas eliminates the risk. | HIGH | Highest regression risk of all type safety items. Every legal and scope finding goes through this path. Must preserve pass-specific field mapping behavior exactly. Write against the schemas, not against intuition. |

### Differentiators (High Value, Not Strictly Blocking)

Refactoring that pays meaningful dividends for future development but does not fix active correctness bugs.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `useContractFiltering` hook extraction | `ContractReview.tsx` is 608 lines. Lines 82-212 are exclusively filter/sort state: 5 `useState` calls, `useMemo` for `visibleFindings`, `groupedFindings`, `flatFindings`, a severity rank map, a category order constant, and the `HIDE_RESOLVED_KEY` localStorage access. Extracting this logic reduces the file by ~100 lines and creates a testable, reusable unit. | MEDIUM | Hook takes `findings: Finding[]` as input. Manages: filter state (severity, category, priority, negotiation-only), `hideResolved` with localStorage persistence, derived `visibleFindings`, `groupedFindings`, `flatFindings`. Returns all state + setters + derived arrays. ContractReview becomes a thin orchestrator. |
| `useInlineEdit` hook extraction | The inline rename interaction (isEditing, editValue, renameInputRef, startEditing, commitRename, cancelEditing, useEffect for auto-focus) appears in `ContractReview.tsx` lines 92-120. It is a self-contained, generic pattern that will recur if any other component gets inline editing. | LOW | Generic signature: `useInlineEdit(initialValue: string, onCommit: (v: string) => void)`. Returns `{ isEditing, editValue, setEditValue, ref, start, commit, cancel }`. Zero behavioral change. ~20 lines of hook logic. |
| `useFieldValidation` hook extraction | `ProfileField` component in `Settings.tsx` (lines 8-120) combines local field state, validation, revert-on-invalid, saved-flash timer, and focus tracking in one 120-line component. The validation + revert + feedback timer is a repeatable pattern that would appear in any future settings page expansion. | MEDIUM | `useFieldValidation(value, fieldType, onSave)` owns: `localValue`, `error`, `warning`, `showSaved`, timer ref, `handleChange`, `handleFocus`, `handleBlur`. Cleanup of `timerRef` stays inside hook. `ProfileField` becomes a presentational wrapper. |
| Centralize localStorage access (storage manager) | `localStorage` is accessed directly in 4 locations with inconsistent error handling: `contractStorage.ts` (try/catch, QuotaExceeded detection), `useCompanyProfile.ts` (try/catch, generic message), `profileLoader.ts` (try/catch, silent fail), `ContractReview.tsx` (bare try/catch, silent fail for `HIDE_RESOLVED_KEY`). A storage manager gives all callers consistent QuotaExceeded detection and a single place to add telemetry or swap storage backends. | LOW | ~50 lines. `storageGet<T>(key, fallback)` / `storageSet(key, value)` / `storageRemove(key)`. Wraps try/catch consistently. All 4 callers have small, easy-to-update access sites. |
| Severity palette centralization | Severity-to-color mapping (`Critical: 'bg-red-100 text-red-700'`) is defined in `SeverityBadge.tsx` and also appears inline in `ContractCard.tsx`, `ContractComparison.tsx`, `DateTimeline.tsx`, and `exportContractPdf.ts` (as jsPDF hex colors). Not catastrophically duplicated yet but will drift as the codebase grows. | LOW | `src/utils/severityPalette.ts` exports `severityTailwind: Record<Severity, string>` and `severityHex: Record<Severity, string>`. SeverityBadge and exportContractPdf become the primary consumers. Other callers remove inline definitions. |
| `LegalMetaBadge` subcomponent split | 417 lines, 11 `clauseType` branches in one file. Each branch is a distinct rendering unit (~20-40 lines) with no shared state between branches. Adding a 12th legal pass today requires editing a 400-line file and risks accidentally breaking an adjacent branch. | MEDIUM | Extract one component per clause type: `IndemnificationBadge`, `PaymentContingencyBadge`, `LiquidatedDamagesBadge`, `RetainageBadge`, `InsuranceBadge`, `TerminationBadge`, `FlowDownBadge`, `NoDamageDelayBadge`, `LienRightsBadge`, `DisputeResolutionBadge`, `ChangeOrderBadge`. Parent `LegalMetaBadge` becomes a switch dispatcher (~20 lines). |
| `useToast` context extraction | Toast state (`toast`, `setToast`) lives in `App.tsx` and threads down via `onShowToast` prop to `ContractReview`, where it is used inside CSV export handlers. Context eliminates this prop threading. | MEDIUM | `ToastContext` with `showToast(data: ToastData)` and `dismissToast()`. `App.tsx` provides context and renders `<Toast>`. `AnimatePresence` must remain above the `Toast` render site (already in `App.tsx` main). Any component can call `useToast()` without prop drilling. |
| `ScopeMetaBadge` subcomponent split | 199 lines, 4 `passType` branches (`scope-of-work`, `dates-deadlines`, `verbiage`, `labor-compliance`). Same split pattern as `LegalMetaBadge` at smaller scale. Lower urgency since the file is still manageable. | LOW | Extract 4 sub-components (~30-50 lines each). Parent becomes a dispatcher. Follow the same pattern established by `LegalMetaBadge` split. |
| `api/analyze.ts` modularization | 1,510 lines in one serverless function file. Contains: request validation, 16 pass definitions, individual pass runner, synthesis pass, response assembly, and error handling. The pass configuration (name, schema, system prompt) is the most natural extraction. | HIGH | Extract: `api/passes/config.ts` (pass definitions array with schema refs), `api/passes/runPass.ts` (single pass execution), `api/passes/runSynthesis.ts`. The main handler becomes a thin orchestrator. Highest regression risk — a bug here breaks the entire analysis pipeline. Do last, after all client-side work is verified. |

### Anti-Features (Avoid — These Seem Useful But Create Problems)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Rewrite `ContractReview.tsx` as a single sweep | God component is obviously a problem; a wholesale rewrite feels efficient. | At 608 lines with 8 props, 10+ state variables, and complex memoized filter/sort logic, a single-pass rewrite risks breaking: filtering (hideResolved + 4 filter dimensions), re-analyze UX (rollback, file input ref), CSV export (filter-aware), rename UX. The component is integrated with App.tsx via 8 callback props. | Extract incrementally: `useContractFiltering` first (isolated logic, no render change), then `useInlineEdit` (isolated, no render change), then header and filter toolbar as sub-components with narrow prop surfaces. Verify each step independently. |
| Consolidate all localStorage keys into one object | Fewer `getItem` calls, simpler mental model. | Merging profile + contracts + schema version + hide-resolved into one blob means any write failure corrupts all data at once. Schema migration becomes harder — currently each domain upgrades independently. | Storage manager provides unified access API without key consolidation. Each domain retains its own key and failure domain. |
| Add Zustand, Jotai, or Redux | Toast prop-drilling and scattered state suggest a global store. | At ~10K LOC with a sole user and no concurrent state writers, the existing `useContractStore` pattern is appropriate. A state library adds bundle weight (~15-45KB) and a new learning surface for zero performance gain. The only real prop-drilling pain is `onShowToast`. | `useToast` context solves the specific problem. Leave contract store as-is. |
| Migrate localStorage to IndexedDB | IDB has higher quotas and async access. | The app stores at most a few dozen contracts (typical: 3-10). IDB introduces async complexity everywhere: `useContractStore`, `contractStorage`, `useCompanyProfile` all become async or callback-based. The synchronous localStorage model is correct for this data volume. | Leave storage as-is. The storage manager wraps localStorage consistently without changing semantics. |
| Write unit tests during this refactor | Tests would catch regressions. | No test framework is configured. Setting up Vitest/Jest is a separate project with its own scope (test runner config, mocking strategy, CI integration). Doing it mid-refactor inflates scope and risks stalling the refactor. | Manual UAT after each extraction step. Add testing as a dedicated v1.6 initiative. |
| Merge `LegalMetaBadge` and `ScopeMetaBadge` into a unified badge | Both render metadata pills — seems like shared logic. | The data shapes are completely different (`LegalMeta` vs `ScopeMeta`, discriminated on different fields). The pill styling patterns happen to look similar but the rendering logic doesn't share code. A unified component would be an awkward switch on meta type that recreates the existing structure. | Split each into sub-components independently. If a shared `MetaPill` primitive emerges, extract it after the splits, not before. |

---

## Feature Dependencies

```
[useContractFiltering hook]
    └──extracts from──> [ContractReview.tsx lines 82-212]
                            └──feeds output to──> [visibleFindings]
                                                       └──used by──> [CSV export in ContractReview]
                                                       └──used by──> [groupedFindings and flatFindings renders]

[useInlineEdit hook]
    └──extracts from──> [ContractReview.tsx lines 92-120]
    └──no external dependencies, pure extraction]

[useFieldValidation hook]
    └──extracts from──> [Settings.tsx ProfileField component]
    └──no external dependencies]

[Storage manager]
    └──consolidates access in──> [contractStorage.ts]
    └──consolidates access in──> [useCompanyProfile.ts]
    └──consolidates access in──> [profileLoader.ts]
    └──consolidates access in──> [ContractReview.tsx HIDE_RESOLVED_KEY]

[Client-side Zod API response validation]
    └──depends on──> [AnalysisResult interface in analyzeContract.ts]
    └──should precede──> [merge.ts type guards]
    (both touch the same data shape; doing client validation first clarifies canonical type)

[merge.ts type guards]
    └──derives guards from──> [Zod schemas in src/schemas/legalAnalysis.ts and scopeComplianceAnalysis.ts]
    └──replaces──> [Record<string, unknown> casts in convertLegalFinding and convertScopeFinding]

[useToast context]
    └──eliminates prop drilling of──> [onShowToast in ContractReview.tsx]
    └──requires AnimatePresence above context provider render site (already true in App.tsx)]

[LegalMetaBadge subcomponents]
    └──no external dependencies, pure structural split]
    └──follow-on: ScopeMetaBadge subcomponents (same pattern, do after)]

[api/analyze.ts modularization]
    └──highest regression risk, do last]
    └──no dependency on client-side refactors]
    └──requires all 16 pass behaviors verified manually before and after]
```

### Dependency Notes

- **useContractFiltering before any ContractReview UI splits:** Extracting the filter hook first reduces the component to a manageable size and isolates the most complex logic. Further UI decomposition is safer after this extraction.
- **Client-side validation before merge.ts type guards:** Both touch the API response shape. Validating first establishes the canonical type; guards then implement against a known-correct schema.
- **Storage manager before useToast:** Storage manager is pure utility with no rendering impact. Build confidence with lower-risk items before adding React context.
- **analyze.ts modularization last:** Server-side, highest regression risk. A mistake breaks the entire pipeline. All client-side work should be verified before touching this.

---

## MVP Definition

### Launch With (P1 — Fix Correctness Gaps First)

Minimum viable code health. These close actual bugs or prevent imminent ones.

- [ ] POST body request validation schema — closes opaque crash path, LOW complexity
- [ ] Zod/TS optionality reconciliation — ensures strict TypeScript actually catches real bugs, MEDIUM
- [ ] Client-side Zod validation of API response — eliminates silent bad-data path, MEDIUM
- [ ] `useInlineEdit` hook extraction — pure gain, zero risk, LOW
- [ ] `useContractFiltering` hook extraction — unlocks ContractReview decomposition, MEDIUM
- [ ] Storage manager centralization — unifies 4 inconsistent error-handling sites, LOW
- [ ] Severity palette centralization — stops color mapping drift before it compounds, LOW

### Add After Validation (P2 — High-Value, Moderate Risk)

Once P1 items are verified working and no regressions.

- [ ] `LegalMetaBadge` subcomponent split — clean structural decomposition, no behavior change, MEDIUM
- [ ] `ScopeMetaBadge` subcomponent split — follow-on to LegalMetaBadge, LOW
- [ ] `useFieldValidation` hook extraction — improves Settings maintainability, MEDIUM
- [ ] `useToast` context — reduces prop drilling, moderate complexity, MEDIUM
- [ ] merge.ts type guards — correctness fix with high regression risk, HIGH

### Future Consideration (P3 — Separate Phase or v1.6)

- [ ] `api/analyze.ts` modularization — server-side, requires full UAT, HIGH
- [ ] Test framework setup — prerequisite for confident large-scale refactoring
- [ ] `ContractReview.tsx` UI subcomponents (header, filter toolbar, findings pane as separate components) — only worthwhile after hook extractions reduce the file to a manageable size

---

## Feature Prioritization Matrix

| Feature | Developer Value | Implementation Cost | Priority |
|---------|----------------|---------------------|----------|
| POST body request validation | HIGH — closes crash path | LOW | P1 |
| Zod/TS optionality reconciliation | HIGH — type system correctness | MEDIUM | P1 |
| Client-side API response validation | HIGH — eliminates silent bad data | MEDIUM | P1 |
| `useInlineEdit` hook | MEDIUM — reusability | LOW | P1 |
| Storage manager | MEDIUM — consistency, single error handling | LOW | P1 |
| Severity palette centralization | LOW — drift prevention | LOW | P1 |
| `useContractFiltering` hook | HIGH — unlocks decomposition | MEDIUM | P1 |
| `useFieldValidation` hook | MEDIUM — reusability | MEDIUM | P2 |
| `LegalMetaBadge` subcomponents | MEDIUM — maintainability | MEDIUM | P2 |
| `ScopeMetaBadge` subcomponents | LOW — maintainability | LOW | P2 |
| `useToast` context | MEDIUM — eliminates prop drilling | MEDIUM | P2 |
| merge.ts type guards | HIGH — correctness | HIGH | P2 |
| `api/analyze.ts` modularization | HIGH — long-term maintainability | HIGH | P3 |

**Priority key:**
- P1: First phase of v1.5 — correctness and foundational extractions
- P2: Second phase of v1.5 — structural decomposition, after P1 verified
- P3: Separate milestone or later phase — server-side, high risk

---

## Sources

- Direct inspection of `src/pages/ContractReview.tsx` (608 lines, 5 useState filter calls, inline rename, localStorage access)
- Direct inspection of `src/components/LegalMetaBadge.tsx` (417 lines, 11 clauseType branches)
- Direct inspection of `src/components/ScopeMetaBadge.tsx` (199 lines, 4 passType branches)
- Direct inspection of `api/analyze.ts` (1,510 lines, 16 pass definitions)
- Direct inspection of `api/merge.ts` (405 lines, ~40 `as` casts against `Record<string, unknown>`)
- Direct inspection of `src/pages/Settings.tsx` (308 lines, ProfileField component with validation)
- Direct inspection of all `localStorage` call sites via grep (4 files: contractStorage, useCompanyProfile, profileLoader, ContractReview)
- Direct inspection of severity color mapping sites via grep (9 files)
- `.planning/PROJECT.md` — v1.5 active requirements list with the 4 category breakdown
- `src/types/contract.ts` — canonical domain types, baseline for optionality audit

---

*Feature research for: React 18/TypeScript codebase refactoring (v1.5 Code Health)*
*Researched: 2026-03-14*
*Supersedes: 2026-03-12 v1.3 feature research (v1.3 features are all shipped)*
