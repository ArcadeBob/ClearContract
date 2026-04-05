# Stack Research — v3.0 Scope Intelligence

**Domain:** Multi-document AI contract analysis (glazing subcontracts + bid/estimate)
**Researched:** 2026-04-05
**Confidence:** HIGH (builds on existing validated stack; no net-new architectural layers)

## Executive Summary

**This milestone requires ZERO net-new npm dependencies.** Every capability needed for multi-document input, second-PDF storage, scope reconciliation schemas, and cross-document analysis is already in the validated v2.2 stack. The work is:

1. **Configuration change** — enable a second dropzone instance (role-labeled via UI, not via `multiple: true` prop).
2. **Schema change** — add one nullable column to Supabase `contracts` table for the bid Files API `file_id`.
3. **Pipeline change** — upload second PDF to Anthropic Files API in the same way the contract PDF already is, attach both `document` blocks to reconciliation passes only.
4. **Zod additions** — 3 new pass result schemas (submittal-tracker, spec-reconciliation, bid-reconciliation) following the existing `PassResultSchema` pattern in `src/schemas/analysis.ts`.

No OCR, no drawing parsing, no external spec library, no new storage backend. Anthropic Files API is already the right home for both PDFs.

## Recommended Stack Changes

### Core Technologies (unchanged)

| Technology | Current Version | Status | Why It's Still Right |
|------------|-----------------|--------|----------------------|
| react-dropzone | ^14.2.3 | KEEP (optionally upgrade to 15.0) | Already supports `multiple`, `maxFiles`, role labeling via two separate `useDropzone` instances — no replacement needed |
| @anthropic-ai/sdk | ^0.78.0 | KEEP | Files API supports multiple `document` blocks in single message; retention is until explicit delete, 100GB storage, 500MB per file |
| @supabase/supabase-js | ^2.99.2 | KEEP | Single nullable `bid_file_id TEXT` column addition covers the persistence need |
| zod | ^3.25.76 + zod-to-json-schema | KEEP | Existing discriminated-union pattern in `src/schemas/analysis.ts` scales to reconciliation matrix outputs with no new libs |
| unpdf | ^1.4.0 | KEEP | Existing Files-API-first / unpdf-fallback pattern in `api/pdf.ts` applies identically to the bid PDF |

### No Supporting Libraries Needed

The scope-intel feature set is entirely a **schema + prompt + pipeline orchestration** change. Specifically rejected:

| Candidate | Rejected Because |
|-----------|------------------|
| OCR library (tesseract.js, pdf.js-extract) | unpdf already extracts text; Files API handles native PDF. Drawing OCR explicitly out-of-scope per PROJECT.md line 138. |
| Spec section database (Div 08 / MasterFormat) | PROJECT.md line 127 — knowledge stays as TypeScript modules; inference-based reconciliation per milestone spec |
| Diff library (jsdiff, diff-match-patch) | Scope reconciliation is AI-driven matrix output, not text diff |
| Upload progress library (tus-js-client, uppy) | 10MB base64 POST already works; two files = two sequential POSTs or one combined payload, both acceptable under Vercel's 15mb bodyParser limit |
| File-type validator (file-type, mime-types) | react-dropzone `accept: { 'application/pdf': ['.pdf'] }` already enforces MIME + extension |

### Schema Additions (Zod, no new packages)

Three new pass result schemas go into `src/schemas/analysis.ts` alongside the existing 16:

```typescript
// Pattern: follow existing PassResultSchema with pass-specific metadata
SubmittalTrackerResultSchema   // submittals[] with type, duration, schedule_conflict
SpecReconciliationResultSchema // spec_cites[] + inferred_requirements[] + gaps[]
BidReconciliationResultSchema  // exclusion_parity[] + quantity_deltas[] + unbid_scope[]
```

All derive via `z.infer<>` per the locked "Zod as single source of truth" decision (PROJECT.md line 207).

### Database Schema Change

Single migration — add one column:

```sql
ALTER TABLE contracts ADD COLUMN bid_file_id TEXT NULL;
-- No RLS change needed; bid_file_id is covered by existing user_id RLS policies on contracts
```

Rationale: Anthropic `file_id` is a short string reference, not the PDF bytes. Storing the `file_id` (not the blob) matches the existing Files-API-as-storage pattern used for contract PDFs transiently.

## Storage Decision: Anthropic Files API vs Supabase Storage

**Recommendation: Anthropic Files API (same as contract PDF today).**

| Factor | Anthropic Files API | Supabase Storage |
|--------|---------------------|------------------|
| Retention | Until explicit DELETE; 100GB quota, 500MB/file | User-controlled, 1GB free tier |
| Cost | Free for API-attached files | Charged per GB |
| Integration | Zero code change — `api/pdf.ts` already does this | New Supabase Storage client, RLS bucket setup, signed URLs |
| Re-analyze use case | Upload once, analyze many passes | Requires fetching blob → re-uploading to Anthropic per re-analyze |
| Orphan cleanup | `client.beta.files.delete()` already in `finally` block | Additional cron job / webhook needed |

**Caveat:** Current code deletes the file at end of each analyze run (`api/analyze.ts:785`). For v3.0, **keep the bid file between runs** so re-analyze doesn't require re-upload. Do this by:
1. Skipping the `finally`-block delete when `bid_file_id` is going to be persisted to DB.
2. Deleting the bid file only when the contract row is deleted (add to contract-delete cascade logic).
3. Contract PDF `file_id` can follow the same pattern if re-analyze UX becomes common (deferred — not required for v3.0).

**Anti-pattern avoided:** Storing PDF bytes in Supabase Postgres `BYTEA` columns. Bloats row size, makes RLS slow, adds base64 overhead on every read.

## Multi-File Upload UX Pattern (react-dropzone)

**Recommendation: Two separate dropzones with role labels, NOT one multi-file dropzone.**

```
┌─────────────────────────┐  ┌─────────────────────────┐
│  Contract PDF (required)│  │ Bid/Estimate (optional) │
│  [drop zone 1]          │  │ [drop zone 2]           │
└─────────────────────────┘  └─────────────────────────┘
```

**Why two zones, not one with `multiple: true`:**
- Role disambiguation is free (drop target == role). No "which file is which?" prompt after drop.
- Error states are localized per-file to the zone that produced them.
- Optional second file has a clearer affordance ("you can skip this").
- Existing `UploadZone` component (one dropzone, `multiple: false`) needs minimal change: add a `role` / `label` prop, reuse for both.

**Alternative (rejected): single dropzone with `multiple: true, maxFiles: 2`:**
- Forces a post-drop "assign roles" step.
- react-dropzone's `multiple: false` + "one file auto-selected from many on drop" bug (GitHub #1253) suggests fragile multi-file semantics.
- Worse error messaging when user drops 3 files or drops 2 non-PDFs.

**Implementation detail:** Keep `multiple: false, maxSize: 10 * 1024 * 1024` on each `useDropzone` instance. Add a `role: 'contract' | 'bid'` prop to `UploadZone` and a `bidFile: File | null` state in the parent.

## Zod Schema Pattern for Reconciliation Matrix Output

Reconciliation output shapes (scope vs bid vs spec) are **still flat arrays of findings**, not nested matrices. The "matrix" is a UI render of reconciliation findings, each keyed by a shared `reconciliationKey` (e.g., "glass type GL-1", "anodized finish"). Schema pattern:

```typescript
// In src/schemas/analysis.ts — follow existing FindingSchema pattern
const ReconciliationFindingSchema = z.object({
  reconciliationKey: z.string(),        // shared grouping key for UI matrix rendering
  dimension: z.enum(['exclusion_parity', 'quantity_delta', 'unbid_scope', 'spec_gap']),
  contractPosition: z.string(),          // what contract says
  bidPosition: z.string().nullable(),    // what bid says (null if bid absent)
  inferredSpecPosition: z.string().nullable(), // what spec would require (null if not inferable)
  severity: SeveritySchema,
  recommendation: z.string(),
  clauseReference: z.string(),
});
```

Rationale: flat findings merge cleanly into the existing `mergePassResults` pipeline. UI groups by `reconciliationKey` client-side (existing filter/group infrastructure handles it). No new merge logic, no new DB table — reconciliation findings are `Finding` rows with reconciliation metadata tucked into existing JSON meta columns.

**Decision for downstream:** Store reconciliation metadata in the existing `scope_meta` JSONB column (already on `findings` table) rather than adding a `reconciliation_meta` column. Matches existing `scopeMeta` pattern.

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| OCR (tesseract.js, pdf.js) | Explicitly out of scope (PROJECT.md line 138 "no drawing-to-takeoff OCR"); Files API handles native PDF | Native Files API document support |
| Spec section library / MasterFormat database | PROJECT.md line 127 "no RAG/vector DB"; line 136 "inference-based reconciliation from cites first" | New TS knowledge module (`aama-submittals.ts`, `div08-masterformat.ts`) ≤ 1200 tokens each |
| New storage backend (Supabase Storage, S3, R2) | Files API is already the storage layer; adding another backend doubles orphan-cleanup complexity | Anthropic Files API with `bid_file_id` column on contracts |
| PDF-to-image conversion (pdf-img-convert, pdf2pic) | Claude Files API already handles PDF natively (text + visual); image conversion loses layout | `type: 'document', source: { type: 'file', file_id }` (current pattern) |
| Diff libraries (jsdiff, fast-diff) | Reconciliation is semantic (AI-inferred), not character-level diff | AI pass output with `reconciliationKey` grouping |
| Multi-file upload libraries (uppy, react-uploady) | Two sequential 10MB files fit Vercel's 15mb bodyParser limit already configured | Existing `UploadZone` reused with `role` prop |
| New DB table for bid documents | YAGNI — one nullable column on `contracts` is the minimum viable schema | `contracts.bid_file_id TEXT NULL` |
| react-dropzone `multiple: true` + role-assignment UI | Worse UX, fragile when users drop wrong count | Two dropzone instances with explicit role labels |
| Background job queue (bullmq, inngest) for second-PDF processing | Both PDFs get uploaded synchronously within existing 300s Vercel budget | Existing serverless flow; sequential Files API uploads are fast (~2-4s each) |

## Integration Points into Existing Pipeline

**`api/analyze.ts` changes (minimal):**

1. Extend `AnalyzeRequestSchema` with optional `bidPdfBase64: z.string().optional(), bidFileName: z.string().max(255).optional()`.
2. After primer upload, conditionally call `preparePdfForAnalysis` on `bidBuffer` → get `bidFileId`.
3. Persist `bidFileId` onto `contractPayload` via `mapToSnake`.
4. For reconciliation passes (bid-reconciliation, spec-reconciliation), pass **both** `fileId` and `bidFileId` into `runAnalysisPass` — attach two `document` content blocks.
5. Skip the bid file's `finally` delete (retain for re-analyze); delete the contract `fileId` as today.

**`api/passes.ts` changes:**
- Add 3 new `AnalysisPass` entries (submittal-tracker, spec-reconciliation, bid-reconciliation) with their Zod schemas.
- Add a `requiresBidDocument: true` flag on bid-reconciliation so the orchestrator skips it when no bid is uploaded.

**`src/pages/ContractUpload.tsx` changes:**
- Add `bidFile: File | null` state.
- Render second `<UploadZone role="bid" optional={true} />`.
- Send both base64 payloads to `analyzeContract.ts`.

**`src/api/analyzeContract.ts` changes:**
- Accept optional `bidFile: File`, base64-encode in parallel with contract PDF, include in POST body.

## Installation (no new packages)

```bash
# No new dependencies required for v3.0 Scope Intelligence.
# Optional: upgrade react-dropzone 14.2.3 → 15.0.0 (defer — see Version Compatibility below)
npm install react-dropzone@^15.0.0
```

## Version Compatibility Notes

| Package | Current | Latest | Upgrade Recommendation |
|---------|---------|--------|------------------------|
| react-dropzone | 14.2.3 | 15.0.0 | **OPTIONAL** — defer. v15 is a minor API cleanup. Current 14.2.3 works fine with React 18 and supports `multiple`/`maxFiles`. Upgrade only if v3.0 hits a specific v14 bug. |
| @anthropic-ai/sdk | 0.78.0 | check per-release | **DEFER** — v0.78 supports Files API beta header `files-api-2025-04-14` already in use. Pin until a reconciliation-specific API feature ships. |
| @vercel/node | 5.6.9 | 5.x current | KEEP — overrides in package.json already pin undici and path-to-regexp for security |

**Vercel serverless 300s timeout compatibility:** Two-PDF uploads add ~2-4s to the existing ~20-40s pipeline. Still well under the 250s global safety timeout configured in `api/analyze.ts:452`.

**Anthropic beta header compatibility:** The `files-api-2025-04-14` beta header already in use (`BETAS` in `api/analyze.ts:54`) continues to cover multi-document attachment in a single message.

## Sources

- [react-dropzone npm page](https://www.npmjs.com/package/react-dropzone) — v15.0.0 confirmed as latest; v14.2.3 (current) supports `multiple`/`maxFiles`/`accept` (HIGH)
- [react-dropzone maxFiles example](https://github.com/react-dropzone/react-dropzone/blob/master/examples/maxFiles/README.md) — `maxFiles` enabled only when `multiple: true` (HIGH)
- [Anthropic Files API docs](https://docs.claude.com/en/docs/build-with-claude/files) — 100GB storage, 500MB per file, retention until explicit DELETE, not ZDR eligible (HIGH)
- [Anthropic Delete File API](https://docs.anthropic.com/en/api/files-delete) — DELETE /v1/files/{file_id}; files remain usable in in-flight Messages API calls post-delete (HIGH)
- Existing codebase validation: `api/analyze.ts`, `api/pdf.ts`, `src/schemas/analysis.ts`, `src/components/UploadZone.tsx`, `package.json` (HIGH — direct inspection)
- `.planning/PROJECT.md` — locked out-of-scope decisions: no OCR, no RAG, no full spec storage, no drawing takeoff (HIGH)

---
*Stack research for: v3.0 Scope Intelligence (multi-document input + cross-document reconciliation)*
*Researched: 2026-04-05*
