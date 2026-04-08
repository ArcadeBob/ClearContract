# Phase 58: Knowledge Modules + Multi-Document Input - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the AAMA submittal-standards and Div 08 MasterFormat knowledge modules into the pipeline, add optional bid/estimate PDF upload at the upload page, extend the server to handle two documents with correct attribution for downstream reconciliation passes, persist PDFs in Supabase Storage for re-analyze, and add re-analyze document selection UX. Delivers KNOW-01, KNOW-02, BID-01, BID-03, BID-05.

</domain>

<decisions>
## Implementation Decisions

### Knowledge module content (KNOW-01: AAMA Submittal Standards)
- **Broader coverage** — cover all Div 08 product types including storefronts, curtain walls, entrances, skylights, glass railings, operable windows, fire-rated assemblies, decorative glass, mirrors
- List typical submittals per product type (shop drawings, samples, test reports, structural calcs, thermal performance, mock-up requirements)
- Include AAMA spec numbers and what they govern (501.1 dynamic water test, 501.2 field quality, NAFS, etc.)
- **Facts + analysis instructions** — end module with ANALYSIS INSTRUCTIONS section telling Claude how to cross-reference extracted submittals, what to flag as typically required but missing, and when to set `inferenceBasis` to `'knowledge-module:aama-submittal-standards'`
- Registered in `src/knowledge/standards/aama-submittal-standards.ts`
- Expected token range: 1000-1500 tokens

### Knowledge module content (KNOW-02: Div 08 MasterFormat Deliverables)
- **Full Div 08 section coverage** — 084113 (Aluminum Storefronts), 084413 (Curtain Walls), 084229 (Auto Entrances), 088000 (Glazing), 088413 (Safety Glazing), 084313 (Storefronts w/ Doors), 085113 (Aluminum Windows), 086113 (Skylights), 087100 (Hardware), 089000 (Louvers/Vents)
- List typical required submittals per CSI section
- **Facts + analysis instructions** — same pattern as AAMA module; set `inferenceBasis` to `'knowledge-module:div08-deliverables'`
- Registered in `src/knowledge/trade/div08-deliverables.ts` (distinct from existing `div08-scope.ts`)
- Expected token range: 1000-1500 tokens

### Knowledge module pass mapping
- Map both KNOW-01 and KNOW-02 to **both** `scope-extraction` AND `spec-reconciliation` in `PASS_KNOWLEDGE_MAP`
- `scope-extraction` will have 6 modules (the cap): ca-title24, div08-scope, standards-validation, contract-forms, div08-deliverables, aama-submittal-standards
- `spec-reconciliation` gets them pre-wired for Phase 59 (pass doesn't exist yet but mapping is ready)

### Bid upload pipeline
- **Body size limit:** raise `sizeLimit` in `api/analyze.ts` to 25MB (Vercel Pro supports up to 50MB) AND enforce 5MB client-side cap on bid PDFs
- **Bid access:** Stage 3 passes only — all Stage 1 + Stage 2 passes remain contract-only. Only Stage 3 reconciliation passes (registered in Phase 59/60) receive both document blocks. Prevents attribution confusion
- **FileId flow:** add `bidFileId` to the existing pipeline context object flowing through `analyze.ts`. Stage 3 passes check for its presence; if null, they run contract-only
- **Document metadata:** add nullable `bid_file_name TEXT DEFAULT NULL` column to contracts table. If non-null, bid was included. Drives the "Contract + Bid" badge and re-analyze modal defaults
- **Parallel Files API upload:** `Promise.all([preparePdfForAnalysis(contract), preparePdfForAnalysis(bid)])` — both uploaded concurrently
- **Dual fileId cleanup:** both `contractFileId` and `bidFileId` cleaned up in the `finally` block

### PDF persistence (Supabase Storage)
- **Scope addition:** PDFs now persisted in Supabase Storage (overrides previous v3.0 out-of-scope decision) to enable true "Keep current contract/bid" on re-analyze
- **Storage layout:** Claude's discretion — user/contract path convention (`{user_id}/{contract_id}/contract.pdf`) or equivalent
- **Dual-write on upload:** upload flow writes to both Files API (ephemeral, for analysis) and Supabase Storage (persistent, for re-analyze)
- **Contract deletion:** cleanup Storage files when contract is deleted
- **RLS:** user can only access their own storage files
- **Storage path derivation:** derive from user_id + contract_id (no extra DB column needed)

### Re-analyze document choices
- **Must re-upload bid:** bid PDF is ephemeral in Files API. If user wants bid analysis on re-analyze, they must re-upload. Modal shows previous `bid_file_name` for reference
- **Contract PDF:** with Storage persistence, "Keep current contract" is now a real option — server reads from Supabase Storage
- **Remove bid:** clears `bid_file_name` from DB after analysis completes. Contract reverts to contract-only state. "Contract + Bid" badge disappears
- **All combinations supported:** keep contract + add bid, keep contract + no bid, new contract + add bid, new contract + no bid
- **Pre-v3.0 contracts:** no PDF in Storage. Re-analyze modal detects missing storage file and shows "Upload contract PDF" as required (no "Keep current" option). New contracts going forward always persist

### Backward compatibility
- **Nullable column:** `ALTER TABLE contracts ADD COLUMN bid_file_name TEXT DEFAULT NULL`. Existing rows get null. Client checks `if (contract.bidFileName)` for conditional rendering
- **Zod schema:** `.nullable()` matching DB (Supabase returns explicit null, not undefined). Client uses nullish coalescing
- **No backfill:** pre-v3.0 contracts don't get Storage PDFs retroactively. Re-analyze requires re-upload for old contracts, which then persists to Storage going forward
- **No breaking changes:** all new fields optional/nullable. Pre-v3.0 contracts render and re-analyze without errors

### Claude's Discretion
- Supabase Storage bucket naming and exact path convention
- Storage RLS policy design
- How the re-analyze modal determines whether Storage has the contract PDF (existence check vs. DB flag)
- Knowledge module content authoring — exact facts, wording, and structure within the broader/full coverage guidelines
- How `runAnalysisPass` conditionally includes bid document blocks for Stage 3 passes
- Exact `AnalyzeRequestSchema` extension for bid + re-analyze document selection
- Client-side state management for the re-analyze document selection modal

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` §Phase 58 — goal, 5 success criteria, KNOW-01/KNOW-02/BID-01/BID-03/BID-05 requirements
- `.planning/REQUIREMENTS.md` §KNOW — KNOW-01, KNOW-02 requirement wording
- `.planning/REQUIREMENTS.md` §BID — BID-01, BID-03, BID-05 requirement wording
- `.planning/REQUIREMENTS.md` §Out of Scope — "Bid PDF persistence in Supabase Storage" NOW IN SCOPE for Phase 58 (user decision 2026-04-06)

### UI design contract
- `.planning/phases/58-knowledge-modules-multi-document-input/58-UI-SPEC.md` — approved visual/interaction contract for bid drop zone, re-analyze modal, documents badge

### Phase 58 research
- `.planning/phases/58-knowledge-modules-multi-document-input/58-RESEARCH.md` — architecture patterns, code examples, pitfalls, anti-patterns

### Prior phase context (direct predecessors)
- `.planning/phases/56-architecture-foundation/56-CONTEXT.md` — Stage 3 wave, inferenceBasis, scope pass split, MAX_MODULES_PER_PASS = 6
- `.planning/phases/57-contract-only-scope-extraction/57-CONTEXT.md` — submittal register, schedule-conflict, scope-extraction pass schema extension

### V3.0 milestone research
- `.planning/research/SUMMARY.md` — pipeline timeline math, gap analysis
- `.planning/research/ARCHITECTURE.md` — multi-document content block construction, Files API patterns
- `.planning/research/PITFALLS.md` §Pitfall 1 — fabricated spec requirements, inferenceBasis enforcement
- `.planning/research/PITFALLS.md` §Pitfall 2 — document attribution confusion (why Stage 3 only for bid)
- `.planning/research/PITFALLS.md` §Pitfall 10 — knowledge module bloat, token budget discipline

### Existing code (integration points)
- `src/knowledge/registry.ts` — `PASS_KNOWLEDGE_MAP`, `registerModule()`, `getModulesForPass()`, `validateAllModulesRegistered()`
- `src/knowledge/tokenBudget.ts` — `MAX_MODULES_PER_PASS` (6), `TOKEN_CAP_PER_MODULE` (10000), `validateTokenBudget()`
- `src/knowledge/standards/` — existing standards modules (pattern to follow for aama-submittal-standards)
- `src/knowledge/trade/` — existing trade modules (pattern to follow for div08-deliverables)
- `api/analyze.ts` — pipeline orchestration, `preparePdfForAnalysis()`, body size limit, fileId cleanup
- `api/pdf.ts` — `preparePdfForAnalysis()` function (reusable for bid PDF)
- `api/passes.ts` — `ANALYSIS_PASSES` registry, `scope-extraction` pass definition
- `src/components/UploadZone.tsx` — existing drop zone (extend with role prop)
- `src/pages/ContractUpload.tsx` — upload page (add bid drop zone)
- `src/components/ReviewHeader.tsx` — re-analyze button + confirm dialog (replace with document selection modal)
- `src/types/contract.ts` — `Contract` interface (add bidFileName)
- `src/App.tsx` — `handleReanalyze` function (extend for bid + keep-current flows)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `preparePdfForAnalysis()` in `api/pdf.ts`: handles Files API upload with page-count fallback and text extraction. Reusable as-is for bid PDF upload
- `UploadZone` component: react-dropzone integration with size limits, type validation, error display. Extend with `role` prop per UI-SPEC
- `ConfirmDialog` component: modal pattern with portal, backdrop, focus trap. Reference for re-analyze document selection modal
- Knowledge module pattern in `src/knowledge/standards/standards-validation.ts` and `src/knowledge/trade/div08-scope.ts`: exact template for new modules
- `PASS_KNOWLEDGE_MAP` in `src/knowledge/registry.ts`: declarative module-to-pass mapping

### Established Patterns
- Knowledge module authoring: `KnowledgeModule` interface with id, domain, title, dates, content, tokenEstimate. Register via `registerModule()` in domain index file
- Nullable DB columns with Zod `.nullable()`: matches existing patterns for optional contract fields
- Optimistic updates with rollback: contract mutations use `[...contracts]` snapshot before mutation
- Supabase two-client pattern: anon for client RLS, service_role for server writes
- File state lifted to page component: ContractUpload manages file selection state

### Integration Points
- `src/knowledge/registry.ts` PASS_KNOWLEDGE_MAP: add 'aama-submittal-standards' and 'div08-deliverables' to scope-extraction and spec-reconciliation entries
- `src/knowledge/standards/index.ts` and `src/knowledge/trade/index.ts`: import and register new modules
- `api/analyze.ts`: extend AnalyzeRequestSchema, add parallel bid upload, track bidFileId in pipeline context, dual cleanup
- `src/types/contract.ts` Contract interface: add `bidFileName: string | null`
- DB migration: add `bid_file_name` nullable column + Supabase Storage bucket + RLS policies
- `src/pages/ContractUpload.tsx`: add bid drop zone, two-file state, dynamic analyze button label
- `src/components/ReviewHeader.tsx`: replace confirm dialog with document selection modal
- `src/App.tsx`: extend handleReanalyze for bid + keep-current document flows
- `src/knowledge/__tests__/registry.test.ts`: update module count from 12 to 14, pass knowledge map count from 16 to 17+

</code_context>

<specifics>
## Specific Ideas

- Knowledge modules should use the "facts + analysis instructions" pattern established by existing modules — not raw data dumps
- Both AAMA and Div 08 modules target broader/full coverage respectively — the user wants comprehensive glazing industry coverage, not just the 4-5 most common product types
- PDF persistence is a scope addition that overrides the previous v3.0 out-of-scope decision — REQUIREMENTS.md needs updating to reflect this
- "Remove bid" on re-analyze is a destructive action (clears bid_file_name from DB) — should result in the latest analysis reflecting contract-only state
- Pre-v3.0 contracts get lazy backfill: when re-analyzed with a new PDF, that PDF persists to Storage going forward. But no proactive backfill migration

</specifics>

<deferred>
## Deferred Ideas

- Exhaustive AAMA/Div 08 encyclopedia beyond typical-submittals scope — knowledge modules stay narrow-facts, not comprehensive reference
- Anthropic Citations API for document attribution — evaluate post-v3.0 (Gap 4 from research)
- Per-pass p95 SLO monitoring dashboard — observability work for post-v3.0

</deferred>

---

*Phase: 58-knowledge-modules-multi-document-input*
*Context gathered: 2026-04-06*
