# Architecture: v3.0 Scope Intelligence Integration

**Domain:** Multi-doc contract + bid reconciliation extending existing 17-pass pipeline
**Researched:** 2026-04-05
**Confidence:** HIGH (grounded in actual codebase inspection — analyze.ts, passes.ts, schema, ContractReview.tsx)

---

## Integration Architecture Overview

```
Upload (2 PDFs)                    Vercel /api/analyze (300s budget)
 contract.pdf ─┐
 bid.pdf ──────┼─► base64 payload ─► Auth + profile load
               │                     │
               │                     ├─► Files API upload: contract → fileId_c
               │                     ├─► Files API upload: bid      → fileId_b
               │                     │
               │                     ├─► STAGE 1: primer pass (contract only)         ~15s
               │                     │
               │                     ├─► STAGE 2: 15 existing passes    (contract only) ~25-40s
               │                     │         + 2-3 new scope passes   (contract only, parallel wave)
               │                     │
               │                     ├─► STAGE 3: reconciliation passes (contract + bid, parallel)
               │                     │         - bid-reconciliation
               │                     │         - spec-reconciliation (needs scope pass output)
               │                     │         - submittal-schedule (needs dates pass output)  ~25s
               │                     │
               │                     ├─► synthesis pass (non-fatal)                   ~10s
               │                     ├─► merge + scoring
               │                     └─► Supabase writes (contracts, findings, dates,
               │                            scope_reconciliations, submittals, analysis_usage)
               ▼
           Supabase Storage bucket (bid PDFs only, for re-view)
```

## Answers to Integration Questions

### 1. Multi-Doc Input Flow

**Decision: Bid PDF stored in Supabase Storage; Files API upload per-analysis-run.**

| Storage | Purpose | Lifetime |
|---------|---------|----------|
| Supabase Storage bucket `bids/{user_id}/{contract_id}/{run_id}.pdf` | Persistent reference so user can re-view or re-analyze without re-upload | Permanent (linked to contract row) |
| Anthropic Files API | Analysis-time handle for passes | Deleted in `finally` block (same pattern as contract today) |
| Contract PDF | NOT stored in Supabase today | Same pattern retained — Files API only, deleted post-run |

**Rationale:**
- Contract PDFs are not stored today (`api/analyze.ts` line 783-791: file cleanup on finally). Keep that pattern.
- Bid PDFs SHOULD persist because: (a) re-analyze workflow already exists and user will want to change contract without re-uploading bid; (b) cross-contract scope trends require the bid to be queryable; (c) estimators may want to see the bid alongside findings.
- Both get fresh Files API uploads per analysis run (Anthropic files expire anyway, and the two-stage cache benefits only the contract which dominates token count).

**Request shape change** (`api/analyze.ts` AnalyzeRequestSchema at line 43):
```ts
const AnalyzeRequestSchema = z.object({
  pdfBase64: z.string().min(1),            // contract (existing)
  fileName: z.string().max(255).optional(),
  contractId: z.string().uuid().optional(),
  bidPdfBase64: z.string().optional(),     // NEW
  bidFileName: z.string().max(255).optional(),
});
```

Vercel body parser is already raised to 15MB (line 9). Two 10MB PDFs base64-encoded is ~26MB — raise limit to **30mb** or enforce 5MB bid cap.

**Uploads run in parallel**, inserted after the existing `preparePdfForAnalysis` call:
```ts
const [prepared, bidPrepared] = await Promise.all([
  preparePdfForAnalysis(pdfBuffer, fileName, uploadClient),
  bidBuffer ? preparePdfForAnalysis(bidBuffer, bidFileName, uploadClient) : Promise.resolve(null),
]);
```

Cleanup in `finally` deletes both fileIds.

---

### 2. Pass Structure — Decision: (c) Dedicated Stage 3 + some parallel additions

**Hybrid layout:**

| Stage | Passes | Input | Depends on |
|-------|--------|-------|-----------|
| Stage 1 (primer) | `risk-overview` (unchanged) | contract | — |
| Stage 2 (parallel wave, 15 + 2-3 new) | existing 15 + **quantity-signals**, **submittal-extraction**, optional new clause passes | contract | primer cache |
| Stage 3 (parallel wave, reconciliation) | **bid-reconciliation**, **spec-reconciliation**, **exclusion-stress-test** | contract + bid + Stage 2 outputs | scope-of-work + dates-deadlines + quantity-signals + submittal-extraction results |
| Synthesis | existing compound-risk synthesis (unchanged inputs) | all merged findings | everything |

**Why hybrid, not pure (a) or (b):**

- **Not (a) pure parallel**: bid-reconciliation *logically* requires the contract's extracted scope to compare against. Running it blind parallel means Claude must re-extract scope from the contract inside the same pass — duplicative and token-wasteful.
- **Not (b) enhance scope-of-work**: The existing scope-of-work pass is already at 4-module knowledge capacity (per CLAUDE.md constraint: "scope-of-work pass at max capacity (4 modules)"). Stuffing reconciliation logic, bid comparison, spec inference, and submittal tracking into one pass blows the context window and makes the prompt unwieldy. Single-responsibility passes have been the winning pattern across 17 passes.
- **(c) Stage 3 is correct** because reconciliation is *inherently cross-document and cross-pass*. It needs to see what the contract scope extraction found AND what the bid says — that's a synthesis-shaped operation on new source material.

**Timeout math (300s Vercel cap, 250s global timeout):**

Current Stage 1 + Stage 2 + synthesis = ~50-70s (per v2.2 parallel pipeline). Adding Stage 3 as another parallel wave:
- Stage 1 primer: ~15s
- Stage 2 (17-18 passes parallel, cache hits): ~30-40s (longest-pass-wins)
- Stage 3 (3 reconciliation passes parallel): ~25-30s (bid PDF is smaller, cache hit on contract)
- Synthesis: ~10s
- Merge + DB writes: ~10s
- **Total: ~90-105s, well under 250s**

New 2-3 scope-extraction passes added to **Stage 2** (they only need the contract, no dependency):
- `quantity-signals` — extends scope extraction with quantity/takeoff ambiguity
- `submittal-extraction` — extracts submittal list (pairs with dates pass for schedule conflicts)
- Optional: 1-2 new clause passes (warranty/assignment/audit rights) also added to Stage 2

Stage 3 waits for Stage 2 to settle via `await Promise.allSettled`, then reads merged scope data into the reconciliation prompts.

---

### 3. Bid Reconciliation Pass

**Position: Stage 3, runs AFTER Stage 2 merges.**

**Inputs required:**
- Contract Files API fileId (cache hit — already in ephemeral cache from Stages 1-2)
- Bid Files API fileId (fresh upload, no cache benefit)
- Structured text from Stage 2 merged output: `scope-of-work` findings (inclusions/exclusions/scope rules), `quantity-signals` findings

**Prompt construction:**
```ts
// Stage 3 reconciliation pass runs with BOTH documents in context block
content: [
  { type: 'document', source: { type: 'file', file_id: contractFileId }, cache_control: { type: 'ephemeral' } },
  { type: 'document', source: { type: 'file', file_id: bidFileId } },
  { type: 'text', text: `
    CONTRACT SCOPE EXTRACTION (from prior pass):
    ${JSON.stringify(scopeFindings)}

    QUANTITY SIGNALS (from prior pass):
    ${JSON.stringify(quantityFindings)}

    Compare the bid document (second PDF) against the contract. Identify:
    - Scope items in contract NOT in bid (unbid scope)
    - Exclusions in bid NOT carried in contract
    - Quantity deltas
    - Pricing assumptions in bid that contract scope contradicts
  ` }
]
```

**Why both documents AND prior structured output?** Claude needs to verify at the source (document) but benefits from the curated scope items as a checklist. This is the pattern used for synthesis (findings JSON) but extended with fresh document grounding.

**Timeout:** 90s per-pass AbortController (existing pattern, line 507). Bid is typically 2-10 pages, far smaller than contract — expected duration ~20s.

**If bid PDF missing:** Pass is skipped (no bid provided). Bid-reconciliation becomes an optional conditional pass, not a hard dependency.

---

### 4. Data Model Changes

**New tables (3) + 2 new columns. Reject extending findings table.**

**Why NOT extend findings table with discriminated subtypes:**
- `findings.category` already has 10 constrained values. Adding `Scope Reconciliation`, `Spec Reconciliation`, `Submittal Schedule`, `Quantity Signal` to the CHECK constraint would push findings table past its current cohesive model.
- Submittals have fundamentally different attributes (submittal number, specification section, lead time, approval cycle) than findings (severity, recommendation, clauseText).
- Cross-contract scope trend queries need clean relational tables, not JSON subtype fields.

**Proposed new columns on `contracts` table:**
```sql
alter table contracts add column bid_file_path text;     -- Supabase Storage path, nullable
alter table contracts add column bid_uploaded_at timestamptz;
```

**Proposed new tables:**

```sql
-- Scope items extracted from contract, enriched with bid/spec reconciliation status
create table scope_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('inclusion', 'exclusion', 'scope_rule', 'quantity_signal')),
  description text not null,
  clause_reference text,
  quantity_value text,             -- "240 LF" | "approx. 15 units" | null
  quantity_confidence text check (quantity_confidence in ('explicit', 'inferred', 'ambiguous', 'missing')),
  spec_cite text,                  -- "Div 08 41 13" | "AAMA 2605" | null
  bid_parity text check (bid_parity in ('matched', 'bid_only', 'contract_only', 'delta', 'na')),
  bid_delta_notes text,
  created_at timestamptz not null default now()
);
create index idx_scope_items_contract on scope_items(contract_id);
create index idx_scope_items_user_kind on scope_items(user_id, kind);

-- Submittal requirements extracted from contract
create table submittals (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  submittal_name text not null,
  submittal_type text,             -- 'shop_drawing' | 'product_data' | 'sample' | 'mockup' | 'warranty' | ...
  spec_section text,
  due_offset_days integer,         -- days from NTP or contract milestone
  lead_time_days integer,
  review_cycle_days integer,
  schedule_conflict_flag boolean default false,
  conflict_description text,
  clause_reference text,
  created_at timestamptz not null default now()
);
create index idx_submittals_contract on submittals(contract_id);

-- Inference-based spec reconciliation results
create table spec_reconciliations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  spec_cite text not null,         -- "AAMA 2605" | "ASTM E1300" | "Div 08 44 13"
  inferred_requirement text not null,
  exclusion_conflict text,         -- exclusion that contradicts inferred req
  severity text check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  clause_reference text,
  created_at timestamptz not null default now()
);
create index idx_spec_reconciliations_contract on spec_reconciliations(contract_id);
```

**RLS:** Copy the four-policy pattern from existing tables (select/insert/update/delete gated by `(select auth.uid()) = user_id`).

**Migration file:** `supabase/migrations/20260405_scope_intelligence.sql`.

**What stays in findings table:** Bid-reconciliation *risks* surface as normal findings with new categories added to the category CHECK constraint. The structured reconciliation data lives in the new tables; the user-facing *risk finding* stays in findings for unified filtering/search/CSV export.

```sql
alter table findings drop constraint findings_category_check;
alter table findings add constraint findings_category_check check (category in (
  'Legal Issues', 'Scope of Work', 'Contract Compliance', 'Labor Compliance',
  'Insurance Requirements', 'Important Dates', 'Financial Terms',
  'Technical Standards', 'Risk Assessment', 'Compound Risk',
  'Scope Reconciliation', 'Spec Reconciliation', 'Quantity Signal', 'Submittal Schedule'
));
```

---

### 5. New UI Components

**Routing change:** Add one new primary tab to `ContractReview.tsx` alongside existing tabs (Findings / Dates / Coverage / Checklist). New tab: **"Scope Intel"**.

| Component | Location | Purpose | New/Modified |
|-----------|----------|---------|--------------|
| `ScopeIntelTab` | `src/components/ScopeIntelTab.tsx` | Container for the 4 sub-sections | NEW |
| `SubmittalSchedule` | `src/components/SubmittalSchedule.tsx` | Timeline grouped by due offset, conflict flags highlighted | NEW |
| `SpecGapMatrix` | `src/components/SpecGapMatrix.tsx` | Table: spec cite × inferred requirement × exclusion conflict | NEW |
| `BidReconciliationDiff` | `src/components/BidReconciliationDiff.tsx` | 3-column diff: Contract Scope \| Bid Scope \| Status badge (matched/delta/unbid) | NEW |
| `QuantityAmbiguityList` | `src/components/QuantityAmbiguityList.tsx` | List with confidence badges (explicit/inferred/ambiguous/missing) | NEW |
| `ContractUpload` | `src/pages/ContractUpload.tsx` | Add second optional dropzone for bid PDF | MODIFIED |
| `UploadZone` | `src/components/UploadZone.tsx` | Accept prop for label ("Contract" vs "Bid/Estimate") | MODIFIED |
| `ContractReview` | `src/pages/ContractReview.tsx` | Add ScopeIntelTab to tab rotation | MODIFIED |
| `Dashboard` | `src/pages/Dashboard.tsx` | Add ScopeTrendsCard (see below) | MODIFIED |
| `ScopeTrendsCard` | `src/components/ScopeTrendsCard.tsx` | Cross-contract: most-common exclusions, recurring quantity ambiguities | NEW |

**Sidebar:** No new entries. Scope Intel is contract-scoped (lives inside ContractReview), scope trends live inside Dashboard.

**Data hooks:**
- `useScopeItems(contractId)` — fetches scope_items rows
- `useSubmittals(contractId)` — fetches submittals rows
- `useSpecReconciliations(contractId)` — fetches spec_reconciliations rows
- `useScopeTrends()` — aggregates scope_items across all user's contracts (cross-contract pattern detection, mirroring existing PatternsCard approach)

---

### 6. Suggested Build Order

Dependencies dictate order. Each phase ships independently.

| Phase | Scope | Why First/Next | Dependencies |
|-------|-------|---------------|--------------|
| **P1: Multi-doc upload plumbing** | Second UploadZone, request schema change, Supabase Storage bucket, bid_file_path column, dual Files API upload in analyze.ts | Foundation — every downstream phase needs bid PDF flowing through pipeline | None |
| **P2: New Stage 2 scope passes** | quantity-signals pass, submittal-extraction pass, new knowledge modules (AAMA submittal standards, Div 08 MasterFormat), scope_items + submittals tables, ScopeIntelTab shell with two sub-sections | Expands extraction without needing bid — validates new-pass plumbing in isolation | P1 (not strictly — can build without bid) |
| **P3: Stage 3 infrastructure + spec reconciliation** | Add Stage 3 orchestration to analyze.ts (parallel wave after Stage 2), spec-reconciliation pass, exclusion stress-test pass, spec_reconciliations table, SpecGapMatrix component | Validates Stage 3 pattern with inference-only (no bid) before adding bid complexity | P2 (needs scope extraction output) |
| **P4: Bid reconciliation** | bid-reconciliation pass consuming both fileIds, scope_items.bid_parity population, BidReconciliationDiff component | Most complex — needs P1 (bid upload), P2 (contract scope data), P3 (Stage 3 orchestration) all working | P1 + P2 + P3 |
| **P5: 1-2 new clause passes** | warranty / assignment / IP / audit-rights pass(es) in Stage 2 | Independent of scope intel — can ship anytime but pair with milestone | P2 plumbing (pass-addition pattern proven) |
| **P6: Cross-contract scope trends** | useScopeTrends aggregation hook, ScopeTrendsCard on Dashboard, backend Supabase queries over scope_items | Needs historical data — requires several contracts analyzed with scope_items populated | P2 (scope_items data accumulated) |
| **P7: Submittal schedule conflict detection** | Cross-reference submittals due dates against contract_dates, populate schedule_conflict_flag, SubmittalSchedule timeline UI | Needs submittals + contract_dates both populated; synthesis-style cross-pass analysis | P2 |

**Build ordering rationale:**

1. **P1 first** — without multi-doc upload, no bid PDF ever reaches server. Lowest-risk foundation change.
2. **P2 before P3** — validate new-pass addition pattern with simple non-reconciliation passes. De-risks the Stage 2 expansion.
3. **P3 before P4** — Stage 3 orchestration pattern should be proven with spec-reconciliation (contract-only, inference-based) before layering bid-reconciliation (two documents, highest complexity).
4. **P5 can slot anywhere after P2** — new clause passes are parallel to scope intel; nice milestone-filler between heavier phases.
5. **P6 last-ish** — cross-contract trends are useless until scope_items rows accumulate across ≥3 contracts. Ship the per-contract UI first.
6. **P7 depends on submittals + dates** — natural follow-up once both data sources exist.

**Timeout risk checkpoints:**
- After P2: measure new Stage 2 duration. If longest-pass >60s, may need to split a pass.
- After P3: measure Stage 3 duration. If spec-reconciliation exceeds 45s, simplify prompt or narrow scope.
- After P4: measure full pipeline with bid. If >180s, consider dropping bid-reconciliation to its own async follow-up endpoint.

---

## Patterns to Follow

### Pattern 1: New passes follow existing schema pattern
**What:** Each new pass gets a Zod schema in `src/schemas/scopeComplianceAnalysis.ts` (or new `scopeIntelAnalysis.ts`), an entry in `ANALYSIS_PASSES` in `api/passes.ts`, and a test fixture.
**When:** Every new pass.
**Reference:** See how `ScopeOfWorkPassResultSchema` is wired from `api/passes.ts` line 17.

### Pattern 2: Stage 3 orchestration mirrors Stage 2
**What:** Stage 3 uses the same `Promise.allSettled` + per-pass AbortController + 90s timeout pattern as Stage 2 (analyze.ts lines 500-512). Same usage recording, same filtering of abort errors.
**When:** Reconciliation passes.

### Pattern 3: Structured reconciliation data separate from findings
**What:** Reconciliation *data* (scope items, submittals, spec cites) goes in dedicated tables. Reconciliation *risks* (e.g., "Exclusion contradicts inferred Div 08 requirement") go in findings table with new category values.
**When:** Any pass that produces both data artifacts AND risk findings.

### Pattern 4: Bid PDF is always optional
**What:** Every code path must handle `bidFileId === null`. Stage 3 bid-reconciliation pass is skipped when no bid was uploaded.
**When:** Every integration point.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Stuffing scope intel into existing scope-of-work pass
**Why bad:** Already at 4-module knowledge capacity (documented constraint). Blows context window, produces lower-quality structured output (more required fields → worse completion).
**Instead:** New dedicated passes with focused prompts.

### Anti-Pattern 2: Making bid PDF required
**Why bad:** Existing single-document workflow must keep working. Breaking single-doc analysis is an unnecessary regression.
**Instead:** Conditional Stage 3 bid-reconciliation pass; all other new passes work without bid.

### Anti-Pattern 3: Storing contract PDF in Supabase to match bid storage
**Why bad:** v2.0 intentionally didn't persist contract PDFs (storage cost, no re-view need). Bid is different (user typically views their own bid alongside analysis).
**Instead:** Asymmetric storage — contract ephemeral, bid persistent. Document the asymmetry.

### Anti-Pattern 4: Adding reconciliation as a synthesis-style post-processor over merged findings
**Why bad:** Synthesis operates on *finding summaries* without document access. Reconciliation needs fresh document grounding (especially bid, which was never in any prior pass's context).
**Instead:** Dedicated Stage 3 passes with BOTH documents attached.

### Anti-Pattern 5: Adding scope trends to Sidebar as new top-level route
**Why bad:** Scope trends are portfolio insights matching existing PatternsCard placement on Dashboard.
**Instead:** Dashboard card, following established cross-contract pattern location.

## Scalability Considerations

| Concern | At current volume (tens of contracts) | At 100+ contracts | At 1000+ |
|---------|---------------------------------------|-------------------|----------|
| scope_items table size | Few hundred rows | ~10K rows, fine | Add compound index (user_id, kind, created_at desc) for trend queries |
| Bid PDF storage cost | Negligible | ~1-5GB | Add retention policy or archival to cold storage |
| Stage 3 duration | ~25-30s | ~25-30s (per-contract, not scaling with portfolio) | No scaling concern — per-analysis work |
| Cross-contract trend query | In-memory aggregation fine | SQL GROUP BY on scope_items | Materialized view refreshed on insert |

## Sources

- `api/analyze.ts` lines 430-612 (two-stage pipeline, timeout orchestration, DB writes) — HIGH
- `api/passes.ts` lines 1-100 (pass definition structure) — HIGH
- `supabase/migrations/00000000000000_initial_schema.sql` (existing schema + RLS pattern) — HIGH
- `src/pages/ContractReview.tsx` lines 1-65 (tab structure for ScopeIntelTab insertion) — HIGH
- `.planning/PROJECT.md` lines 104-115, 241-255 (v3.0 scope, 2026-04-05) — HIGH
- `CLAUDE.md` (scope-of-work pass 4-module constraint, 300s Vercel timeout, 10MB PDF cap) — HIGH
- `api/types.ts`, `api/pdf.ts` (Files API upload pattern, cost tracking) — HIGH
