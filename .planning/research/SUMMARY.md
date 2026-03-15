# Project Research Summary

**Project:** ClearContract v1.5 Code Health
**Domain:** React 18 + TypeScript SPA refactoring — component decomposition, hook extraction, type safety hardening, pattern consolidation
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

ClearContract v1.5 is a code health milestone for an existing ~9,700 LOC React 18 + TypeScript + Vite application used by a sole user. No new user-facing features are being added. The work addresses four categories of technical debt: god-component decomposition (ContractReview.tsx at 608 lines, LegalMetaBadge.tsx at 417 lines, api/analyze.ts at 1,510 lines), hook extraction to isolate reusable state clusters, type system correctness gaps between Zod schemas and TypeScript interfaces, and scattered patterns (localStorage access in 4 files, severity color mapping in 9 files, toast prop-drilling). All research was conducted via direct codebase inspection — no assumptions about unseen code.

The recommended approach is incremental extraction rather than wholesale rewrite. The dependency graph divides naturally into a Foundation phase (utility files with no cross-cutting risk), a Hook Extraction phase (unlocks ContractReview decomposition), a Component Decomposition phase (leverages extracted hooks), a Type Safety phase (can run in parallel with decomposition), and a Server-side Modularization phase (highest regression risk, must come last). No new runtime dependencies are needed — all refactoring uses the existing stack: React 18, TypeScript strict mode, Vite, Zod v3 (already installed), Tailwind CSS, and Framer Motion.

The key risks are concentrated in three areas: (1) server-side changes to api/analyze.ts can break the entire analysis pipeline if the Vercel `export const config` is displaced from the entry-point file; (2) Zod/TypeScript optionality reconciliation must be paired with a localStorage migration or existing stored contracts will load with silent undefined fields that corrupt filter behavior; (3) Tailwind's JIT purge will strip severity color classes in production if the palette map stores fragmented strings rather than complete class names. Each risk has a clear prevention strategy and a low-cost recovery path if it occurs.

---

## Key Findings

### Recommended Stack

The existing stack requires zero additions for v1.5. Zod v3 (already installed at `^3.25.76`) can be imported client-side at no extra configuration cost — Vite tree-shakes per bundle, so the Zod cost is only paid where it is imported. TypeScript strict mode flags (`noUnusedLocals`, `noUnusedParameters`) actively help the refactor by surfacing stale imports as components are split. The only optional additions worth considering post-refactor are `eslint-plugin-import` for import hygiene in new files, and enabling `noUncheckedIndexedAccess` if the Zod/TS audit reveals array index-access bugs.

**Core technologies (unchanged):**
- React 18 (`^18.3.1`): UI rendering and hooks — validated, stable
- TypeScript (`^5.5.4`): Strict mode already enforced; `noUnusedLocals` catches dead code during decomposition
- Vite (`^5.2.0`): Bundler; separate client/server outputs mean Zod client use is safe
- Zod v3 (`^3.25.76`): Already installed; extend to client-side API response validation with no install work
- Tailwind CSS (3.4.17), Framer Motion (`^11.5.4`), Lucide React (0.522.0): No changes

**What not to add:** `react-use`, `ahooks`, `immer`, `xstate`, `react-error-boundary`, `react-hot-toast`. Each solves a problem the planned refactoring addresses with existing primitives at lower bundle weight and no new dependency surface.

### Expected Features (Refactoring Work Items)

This milestone has no user-facing features. All work items are developer-facing refactoring tasks drawn from direct source inspection. The prioritization is P1 (correctness gaps), P2 (structural decomposition), P3 (deferred/high-risk).

**Must do (P1 — close correctness gaps):**
- POST body request validation schema — `api/analyze.ts` validates `companyProfile` via Zod but `pdfBase64` and `fileName` are unvalidated; missing fields cause opaque crashes instead of clean 400 responses
- Zod/TS optionality reconciliation — fields like `actionPriority` are `required` in Zod schemas but `optional` in `src/types/contract.ts` interfaces; the runtime contract doesn't match the static type
- Client-side Zod validation of `/api/analyze` response — `analyzeContract.ts` returns raw `response.json()` with zero validation; silent bad data surfaces at render time
- `useInlineEdit` hook extraction — self-contained rename state cluster; pure extraction, zero behavioral risk
- `useContractFiltering` hook extraction — 5 useState calls + complex useMemo in ContractReview; extracting reduces the file by ~100 lines and unlocks further decomposition
- Storage manager centralization — localStorage accessed in 4 files with inconsistent error handling; unified wrapper eliminates duplicate QuotaExceeded detection
- Severity palette centralization — severity-to-Tailwind-class mapping duplicated across 9 files; single source of truth before drift compounds

**Should do (P2 — structural decomposition after P1 verified):**
- `LegalMetaBadge` subcomponent split — 417 lines, 11 clauseType branches; extract one component per branch; TypeScript discriminated union narrowing eliminates all casts automatically
- `ScopeMetaBadge` subcomponent split — 199 lines, 4 passType branches; same pattern at smaller scale
- `useFieldValidation` hook extraction — Settings.tsx ProfileField mixes validation, revert-on-invalid, and saved-flash timer in 120 lines; extracting makes it a reusable pattern
- `useToast` context — eliminates `onShowToast` prop drilling one level through ContractReview into CSV export handler
- `merge.ts` type guards — replace ~40 `as` casts against `Record<string, unknown>` with type guards derived from existing Zod schemas; highest regression risk in P2

**Defer to P3 / v1.6:**
- `api/analyze.ts` modularization — server-side, 1,510 lines, highest regression risk in the entire milestone; requires full manual UAT of all 16 analysis passes
- Test framework setup — no test runner is configured; this is a separate milestone (v1.6 candidate), not in-scope for this refactor
- `ContractReview.tsx` UI subcomponent splits (ReviewHeader, FindingsPanel, FilterToolbar) — only worthwhile after hook extractions reduce the file to a manageable size

**Anti-features to avoid:** wholesale ContractReview rewrite in one pass, consolidating all localStorage keys into one blob, adding Zustand/Redux, migrating localStorage to IndexedDB, writing tests during this refactor.

### Architecture Approach

The post-refactor architecture introduces no new patterns — it applies the codebase's existing patterns (hooks for state clusters, discriminated union dispatch, typed utility functions) consistently to the files that currently violate them. The result is a directory tree where each file has a single responsibility, natural boundaries between client and server are honored, and circular import risk is eliminated by a documented dependency boundary table. All public import paths are preserved via barrel exports, so no call sites outside the refactored files need to change.

**Major new components and responsibilities:**

1. `src/hooks/` (3 new hooks): `useInlineEdit`, `useContractFiltering`, `useFieldValidation` — self-contained state clusters extracted from ContractReview and Settings with typed return APIs
2. `src/utils/` (3 new utilities): `storage.ts` (typed localStorage wrapper), `errorHandling.ts` (error classification), `severityColors.ts` (palette map replacing inline ternaries)
3. `src/contexts/ToastContext.tsx` (new): provides `useToast()` hook; App.tsx still owns the Toast render and state, but any component calls `showToast()` without prop threading
4. `src/components/LegalMetaBadge/` (refactored to directory): barrel-exported `index.tsx` dispatcher + 11 focused subcomponents; all existing import paths resolve unchanged
5. `api/passes/` + `api/lib/` + `api/conversion/` (P3, new directories): decomposes the 1,510-line `analyze.ts` monolith; handler and `export const config` remain in `api/analyze.ts` (Vercel entry-point constraint)

**Non-negotiable dependency boundaries:**
- `api/passes/` must not import from `api/lib/` — pass configs are static data objects, not behavior
- `src/storage/` must not import from `src/hooks/` — storage is a utility layer consumed by hooks, not vice versa
- `src/types/` must not import from `src/components/` — domain types must be UI-agnostic
- `api/analyze.ts` must always be the Vercel route entry point — never convert it to a re-export barrel

### Critical Pitfalls

1. **Vercel `export const config` location** — If `api/analyze.ts` becomes a re-export barrel during modularization, Vercel loses the 15MB body parser config and silently reverts to 1MB. Base64 PDFs (average 3-5MB) will fail with 413 errors. Prevention: keep `export const config` and the handler default export in `api/analyze.ts`; extract only logic outward. Verification: deploy a Vercel preview and upload a 3-5MB PDF before marking Phase 5 complete.

2. **Zod/TS optionality reconciliation deletes localStorage data** — Making a TS interface field non-optional while existing stored contracts lack that field causes silent `undefined` at render time. TypeScript compiles clean but filters produce wrong counts (e.g., action priority filter excludes all pre-v1.4 findings). Prevention: always pair a type change with a schema version bump and migration function in `contractStorage.ts`. Use `z.infer<typeof Schema>` to derive TS types from Zod directly — eliminates the possibility of drift.

3. **Tailwind JIT purge strips palette map classes in production** — Moving severity color strings into a JavaScript object breaks Tailwind's static scan unless complete class strings are preserved. Fragmented strings like `'bg-' + colorName + '-100'` are never included in the production CSS bundle. Prevention: map values must be complete strings (`'bg-red-100 text-red-700'`); verify with `npm run build` not `npm run dev` (purge only runs at build time).

4. **AnimatePresence exit animations break after component splits** — Wrapping `<motion.*>` children in a React Fragment during ContractReview decomposition breaks key tracking; AnimatePresence loses the keyed child it needs and exit animations silently stop firing. Prevention: never wrap motion elements in fragments when they are direct children of AnimatePresence; move AnimatePresence inside the sub-component if needed. Test by toggling a filter and verifying items animate out after every structural split.

5. **useMemo dependencies go stale inside extracted hooks** — ESLint's `exhaustive-deps` rule cannot validate dependencies inside a custom hook from the caller's scope. A missing dependency in `useContractFiltering`'s internal `useMemo` produces stale filter results on specific toggle sequences — no TypeScript error, intermittent bug. Prevention: run `npm run lint` immediately after every hook extraction and treat dependency warnings as blocking. Design hooks to accept all filter inputs as parameters rather than closing over them.

---

## Implications for Roadmap

Based on combined research, the work divides into 5 phases ordered by dependency and regression risk. The architecture research (build order Phase A through G) maps directly onto these roadmap phases.

### Phase 1: Foundation Utilities
**Rationale:** Pure new files with no imports from any code that is changing. Zero regression risk. These give later phases stable, tested primitives to depend on — specifically, `utils/storage.ts` is a prerequisite for `useContractFiltering` (which reads `HIDE_RESOLVED_KEY` from localStorage) and the Tailwind palette must be implemented correctly from the start to avoid the production purge pitfall.
**Delivers:** `utils/storage.ts`, `utils/errorHandling.ts`, `utils/severityColors.ts`, `schemas/companyProfile.ts`, POST body request validation in `api/analyze.ts`
**Addresses (FEATURES.md P1):** Storage manager centralization, severity palette centralization, POST body validation
**Avoids:** Tailwind purge pitfall (palette implemented correctly first), localStorage key fragmentation pitfall

### Phase 2: Hook Extraction
**Rationale:** Hook extraction is the prerequisite for all component decomposition. Extracting `useContractFiltering` first reduces ContractReview from 608 lines to ~500 and isolates the most complex state logic before any JSX surgery. `useInlineEdit` is zero-risk and ships in the same phase. `useFieldValidation` is fully isolated to Settings.tsx with no cross-cutting dependencies.
**Delivers:** `hooks/useInlineEdit.ts`, `hooks/useContractFiltering.ts`, `hooks/useFieldValidation.ts`
**Addresses (FEATURES.md P1):** `useInlineEdit` and `useContractFiltering` hook extractions, `useFieldValidation`
**Avoids:** useMemo dependency pitfall (run lint after each extraction), useInlineEdit ref focus pitfall (test rename flow: click pencil, verify auto-focus + select-all, type name, press Enter)

### Phase 3: Component Decomposition + Toast Context
**Rationale:** With hooks extracted, ContractReview and the badge components can be split along natural seams without shared state between siblings. LegalMetaBadge decomposes by discriminated union branch — TypeScript narrowing eliminates all `as` casts automatically in each sub-component. Toast context moves here because ContractReview's prop interface shrinks in the same refactor pass, making both changes coherent.
**Delivers:** `components/LegalMetaBadge/` (11 subcomponents + barrel), `components/ScopeMetaBadge/` (4 subcomponents + barrel), `contexts/ToastContext.tsx`, ContractReview wired to Phase 2 hooks, `onShowToast` prop removed from ContractReview interface
**Addresses (FEATURES.md P2):** LegalMetaBadge split, ScopeMetaBadge split, useToast context
**Avoids:** AnimatePresence pitfall (test filter toggle after every ContractReview split), toast context re-render pitfall (memoize provider value with `useMemo`, profile with React DevTools Profiler before marking complete)

### Phase 4: Type Safety Hardening
**Rationale:** Type safety work touches both client and server data shapes. Running it after component decomposition ensures the canonical type is stable before guards are written. The Zod/TS reconciliation must include a migration to protect existing localStorage contracts — this cannot ship without the migration or filter counts break for pre-v1.5 data.
**Delivers:** Zod/TS optionality reconciliation with schema version migration, `src/api/analyzeContract.ts` Zod response parse (`MergedAnalysisResultSchema.parse()`), `api/merge.ts` type guard replacements for `as` casts
**Addresses (FEATURES.md P1/P2):** Client-side API response validation, merge.ts type guards, Zod/TS reconciliation
**Avoids:** Optionality reconciliation localStorage data loss pitfall (migration paired with every non-optional change, tested manually with old-shape data), client Zod validation rejecting valid data pitfall (use `.safeParse()` on all untrusted paths; never create a separate "strict" client schema)

### Phase 5: Server-side API Modularization
**Rationale:** Highest regression risk of the entire milestone. A mistake here breaks the entire analysis pipeline for all users. All client-side phases must be verified in production before touching this. The `export const config` entry-point constraint is non-negotiable. Pass name string coupling must be resolved before any pass is renamed.
**Delivers:** `api/passes/` (riskOverview, legalPasses, scopePasses — extracted from analyze.ts), `api/lib/` (runAnalysisPass, runSynthesisPass, zodToOutputFormat), `api/conversion/` (legalFindingConverter, scopeFindingConverter), `api/analyze.ts` reduced from 1,510 to ~150-line handler
**Addresses (FEATURES.md P3):** api/analyze.ts modularization
**Avoids:** Vercel config export location pitfall (keep handler + config in entry file, verify with Vercel preview + 3-5MB PDF upload), pass name string coupling pitfall (extract pass names as shared `as const` object before reorganizing any pass)

### Phase Ordering Rationale

- Utilities before hooks: `useContractFiltering` imports from `utils/storage.ts` for `HIDE_RESOLVED_KEY` persistence. Building the dependency first avoids a partial extraction.
- Hooks before component splits: ContractReview's 608 lines is safe to decompose only after its state clusters are encapsulated in hooks. Splitting JSX first would require prop-drilling the same state that hooks were going to own.
- Type safety in parallel with or after decomposition: Guards must be written against stable schemas. Running type changes during decomposition adds confounding variables and makes regressions harder to isolate.
- Server modularization last: Highest regression risk, no dependency on client-side work. Client phases should be verified in production before any server changes are made. A bug at this layer breaks the entire analysis pipeline.

### Research Flags

Phases with well-documented patterns — standard execution, no additional research needed:
- **Phase 1 (Foundation Utilities):** Pure TypeScript utility files; standard patterns fully documented in research; zero UI impact
- **Phase 2 (Hook Extraction):** React custom hook pattern is well-established; research identifies all state clusters and their exact signatures with line-number references

Phases that may need targeted investigation during planning:
- **Phase 3 (Component Decomposition):** AnimatePresence behavior after structural changes has documented community bug patterns (framer/motion#2554, #2023). If exit animations break in unexpected ways during ContractReview decomposition, consult Framer Motion docs for `mode` prop and layout animation interactions before committing to a structural approach.
- **Phase 4 (Type Safety):** The exact fields that have drifted between Zod schemas and TS interfaces will only be fully known during the audit. The migration strategy may need adjustment based on how many fields are affected. Budget extra time if the audit reveals systemic drift (5+ fields).
- **Phase 5 (Server Modularization):** Vercel serverless function bundling behavior with multi-module imports warrants a preview deployment check before marking the phase complete. The undici fetch override (required for Anthropic Files API) must remain co-located with the handler module scope — moving it to `api/lib/` risks the override firing after module initialization.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct package.json + tsconfig.json inspection; zero new dependencies confirmed |
| Features | HIGH | All work items identified from direct source file reading with line-number references; complexity estimates grounded in actual code structure |
| Architecture | HIGH | Build order derived from actual import dependency graph; all boundary rules verified against source files |
| Pitfalls | HIGH | 5 of 10 pitfalls verified against official docs (Vercel, Framer Motion, Tailwind, React); 5 from direct codebase inspection |

**Overall confidence:** HIGH

### Gaps to Address

- **Zod/TS drift scope:** Research identified the pattern and specific examples (`actionPriority`, `negotiationPosition`). The full count of drifted fields will only emerge during the Phase 4 audit. If the drift is widespread (10+ fields), the migration complexity increases and Phase 4 should be scoped conservatively.
- **ContractReview UI subcomponent splits:** Research recommends deferring ReviewHeader, FindingsPanel, and FilterToolbar subcomponent extraction to post-hook phases. The roadmap should explicitly gate these on Phase 2 hook extractions being complete and verified — if Phase 2 is delayed, Phase 3 UI splits should be scoped back.
- **Toast context cost/benefit:** The pitch for toast context is modest (eliminates one level of prop drilling). If React DevTools Profiler shows the memoized context causes re-render issues that can't be solved simply, the research recommends reverting to prop-passing (already working). The roadmap should treat `useToast` as a conditional: implement, profile, revert if needed. Do not block other P2 work on this item.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/pages/ContractReview.tsx` (608 lines) — filter state cluster, inline edit, localStorage access
- `src/components/LegalMetaBadge.tsx` (417 lines) — 11 clauseType branches, nested ternary chains
- `src/components/ScopeMetaBadge.tsx` (199 lines) — 4 passType branches
- `api/analyze.ts` (1,510 lines) — 16 pass definitions, orchestrator, Vercel config export
- `api/merge.ts` (405 lines) — ~40 `as` casts, convertLegalFinding, convertScopeFinding
- `src/pages/Settings.tsx` (308 lines) — ProfileField with inline validation
- `src/schemas/` (4 schema files) — Zod schemas for all pass outputs
- `package.json`, `tsconfig.json`, `.eslintrc.cjs` — stack verification

### Primary (HIGH confidence — official documentation)
- [Vercel Functions docs](https://vercel.com/docs/functions) — `config` export must be in route entry file
- [Tailwind JIT dynamic class names](https://tailwindcss.com/docs/content-configuration#dynamic-class-names) — safelist requirement for runtime-determined classes
- [React hooks/exhaustive-deps](https://react.dev/learn/reusing-logic-with-custom-hooks) — custom hook dependency visibility scope
- [Zod v3 safeParse docs](https://zod.dev/?id=safeparse) — client-side validation pattern
- [Vite tree-shaking](https://vitejs.dev/guide/features.html#npm-dependency-resolving-and-pre-bundling) — separate client/server bundles confirm Zod client import is safe

### Secondary (MEDIUM confidence — community verified)
- Framer Motion GitHub issues [#2554](https://github.com/framer/motion/issues/2554), [#2023](https://github.com/framer/motion/issues/2023) — AnimatePresence desync patterns
- [Pitfalls of overusing React Context](https://blog.logrocket.com/pitfalls-of-overusing-react-context/) — re-render behavior of context consumers
- [Optimizing React Context for Performance](https://www.tenxdeveloper.com/blog/optimizing-react-context-performance) — split context read/write pattern
- [Refactoring components in React with custom hooks](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks) — hook extraction patterns

---
*Research completed: 2026-03-14*
*Supersedes: 2026-03-12 v1.3 research summary (v1.3 shipped; this is v1.5 research)*
*Ready for roadmap: yes*
