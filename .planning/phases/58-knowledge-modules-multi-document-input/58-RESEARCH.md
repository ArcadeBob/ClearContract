# Phase 58: Knowledge Modules + Multi-Document Input - Research

**Researched:** 2026-04-05
**Domain:** Knowledge module authoring, Anthropic Files API multi-document input, multi-drop-zone upload UX
**Confidence:** HIGH

## Summary

Phase 58 wires two new knowledge modules (AAMA submittal standards, Div 08 MasterFormat deliverables) into the existing pass registry, adds a second optional "Bid / Estimate" drop zone to the upload page, and extends the server pipeline to upload two PDFs to the Anthropic Files API in parallel with explicit document-index tagging for downstream reconciliation passes. The phase also adds re-analyze UX that lets users choose which document(s) to re-upload.

The existing architecture already supports everything needed: the knowledge module registry (`PASS_KNOWLEDGE_MAP` + `registerModule()` + `validateTokenBudget()`), the `MAX_MODULES_PER_PASS = 6` cap (raised in Phase 56), the Stage 3 empty-wave special case (ready for reconciliation passes in Phase 59/60), and the `preparePdfForAnalysis()` function for Files API uploads. The `AnalyzeRequestSchema` needs extension for `bidPdfBase64`, the `runAnalysisPass()` function needs a multi-document content block builder, the `UploadZone` component needs a role-labeled variant, and the `Contract` type needs `bidFileName` / `documentsAnalyzed` metadata.

**Primary recommendation:** Build knowledge modules first (pure data, no pipeline changes), then add bid upload flow (client + server), then wire document tagging into `runAnalysisPass` for Stage 3 passes (Phase 59/60 will register actual reconciliation passes that consume both documents).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KNOW-01 | AAMA submittal standards module drives spec-reconciliation and submittal-extraction passes | New `aama-submittal-standards` knowledge module registered in `src/knowledge/standards/`, mapped to `scope-extraction` and future `spec-reconciliation` in `PASS_KNOWLEDGE_MAP`. Token budget verified: scope-extraction currently at 4 modules, cap is 6. |
| KNOW-02 | Div 08 MasterFormat deliverables module lists typical required submittals per section | New `div08-deliverables` knowledge module in `src/knowledge/trade/`, distinct from existing `div08-scope` (scope classification vs. deliverables per section). Mapped to `scope-extraction` (5th module) and future `spec-reconciliation`. |
| BID-01 | User can optionally attach a bid/estimate PDF at contract upload | Second `UploadZone` with role label on `ContractUpload` page. `analyzeContract()` client wrapper extended with optional `bidFile` parameter. Server `AnalyzeRequestSchema` adds `bidPdfBase64` + `bidFileName`. |
| BID-03 | User can re-analyze and choose whether to re-upload or update the bid PDF | Re-analyze flow in `App.tsx` already passes `contractId` for update. Extend with document-selection UI: "Keep existing contract / Re-upload contract" + "Keep existing bid / Re-upload bid / Remove bid". Server stores `bid_file_name` on contract row for display. |
| BID-05 | Contracts without a bid analyze normally -- bid-dependent UI hides gracefully | Bid fields nullable throughout. Submittals tab already hides when empty. Bid-related UI sections use conditional rendering on `documentsAnalyzed` metadata. Backward compat: existing contracts have no bid columns, migration adds nullable columns with defaults. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.78.0 | Files API upload + multi-document content blocks | Already in use; Files API beta `files-api-2025-04-14` already active |
| zod | ^3.25.76 | Schema validation for new knowledge modules and request body extension | Already in use for all pass schemas |
| react-dropzone | ^14.2.3 | Second drop zone for bid PDF | Already in use for contract upload |
| framer-motion | (installed) | AnimatePresence for bid zone show/hide | Already in use throughout |
| lucide-react | (installed) | Icons for bid upload zone | Already in use throughout |

### No New Dependencies Required

This phase requires zero new npm packages. All functionality builds on existing libraries.

## Architecture Patterns

### Recommended Project Structure (new/modified files)
```
src/
  knowledge/
    standards/
      aama-submittal-standards.ts    # NEW: KNOW-01 module
    trade/
      div08-deliverables.ts          # NEW: KNOW-02 module (distinct from div08-scope.ts)
  components/
    UploadZone.tsx                   # MODIFY: add role prop for label customization
    BidUploadZone.tsx                # NEW: optional bid drop zone (or extend UploadZone with role)
  pages/
    ContractUpload.tsx               # MODIFY: add bid drop zone, two-file state
  api/
    analyzeContract.ts               # MODIFY: accept optional bidFile param
  types/
    contract.ts                      # MODIFY: add documentsAnalyzed metadata
api/
  analyze.ts                         # MODIFY: AnalyzeRequestSchema, parallel file uploads, cleanup
  pdf.ts                             # NO CHANGE: preparePdfForAnalysis reusable as-is
```

### Pattern 1: Knowledge Module Authoring
**What:** Create a new `KnowledgeModule` object with domain-specific content, register it via `registerModule()`, and map it to passes via `PASS_KNOWLEDGE_MAP`.
**When to use:** Any time a pass needs industry-specific grounding data.
**Example (from existing div08-scope.ts):**
```typescript
// Source: src/knowledge/trade/div08-scope.ts (existing pattern)
import type { KnowledgeModule } from '../types';

const content = `MODULE CONTENT HERE...`;

export const div08Deliverables: KnowledgeModule = {
  id: 'div08-deliverables',
  domain: 'trade',
  title: 'Division 08 MasterFormat Typical Deliverables',
  effectiveDate: '2026-04-05',
  reviewByDate: '2027-04-05',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
```
Then in the domain index file (`src/knowledge/trade/index.ts`):
```typescript
import { div08Deliverables } from './div08-deliverables';
registerModule(div08Deliverables);
```
Then in `src/knowledge/registry.ts` PASS_KNOWLEDGE_MAP:
```typescript
'scope-extraction': ['ca-title24', 'div08-scope', 'standards-validation', 'contract-forms', 'div08-deliverables', 'aama-submittal-standards'],
// 6 modules = exactly at MAX_MODULES_PER_PASS cap
```

### Pattern 2: Multi-Document Content Block Construction
**What:** For passes that need both contract and bid PDFs, build a content array with two document blocks using explicit XML-style tagging in the text prompt.
**When to use:** Stage 3 reconciliation passes (Phase 59/60 will register these; Phase 58 builds the plumbing).
**Example (from ARCHITECTURE.md research):**
```typescript
// Multi-document pass content block (for Stage 3 passes)
const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [
  {
    type: 'document',
    source: { type: 'file', file_id: contractFileId },
    cache_control: { type: 'ephemeral' },
  },
  // Bid document -- only if bidFileId exists
  ...(bidFileId ? [{
    type: 'document',
    source: { type: 'file', file_id: bidFileId },
  }] : []),
  {
    type: 'text',
    text: `<document index="1" type="contract">First document above</document>
<document index="2" type="bid">Second document above</document>
${pass.userPrompt}`,
  },
];
```

### Pattern 3: Optional Bid Drop Zone with Graceful Hiding
**What:** A second UploadZone on the upload page with a distinct role label ("Bid / Estimate PDF"), visually distinct from the primary contract zone, that is entirely optional.
**When to use:** Upload page layout.
**Key principle:** Contract-only upload must work identically to today. Bid zone is additive, never blocking.

### Anti-Patterns to Avoid
- **Sending both PDFs to all passes:** Only reconciliation passes (Stage 3, Phase 59/60) should see both documents. All Stage 1 + Stage 2 passes remain contract-only. Spreading bid access across 17 passes creates attribution confusion (Pitfall 2 from research).
- **Storing bid PDF in Supabase Storage for v3.0:** Out of scope per REQUIREMENTS.md ("Files API only for v3.0 -- avoids second storage surface"). Re-upload is acceptable for re-analyze.
- **Exceeding token budget on scope-extraction:** Adding both KNOW-01 and KNOW-02 to scope-extraction brings it to 6 modules (the cap). Do NOT add a 7th. Future modules go to spec-reconciliation (Stage 3).
- **Making bid upload blocking:** Never prevent contract-only analysis from proceeding. Bid is always optional.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF upload to Anthropic | Custom HTTP upload | `preparePdfForAnalysis()` in `api/pdf.ts` | Already handles page-count fallback, text extraction, error handling |
| Drop zone UI | Custom drag-and-drop | `react-dropzone` via `UploadZone` component | Already handles rejection, size limits, type validation |
| Token budget validation | Manual character counting | `validateTokenBudget()` + `TOKEN_CAP_PER_MODULE` | Existing guard; auto-validates on module registration |
| Knowledge module injection | Inline prompt text | `composeSystemPrompt()` + `PASS_KNOWLEDGE_MAP` | Existing pipeline: register module, map to pass, auto-injected |

## Common Pitfalls

### Pitfall 1: Body Parser Size Limit with Two PDFs
**What goes wrong:** Two base64-encoded PDFs could exceed the current 15MB `sizeLimit` in `api/analyze.ts` config. A 10MB contract PDF base64-encodes to ~13.3MB; adding even a small bid PDF could exceed 15MB.
**Why it happens:** Base64 encoding inflates binary size by ~33%. Two PDFs doubles the payload.
**How to avoid:** Either (a) raise `sizeLimit` to 25MB (safe, Vercel supports up to 50MB body on paid plans), or (b) enforce a 5MB cap on bid PDFs client-side (bid/estimate PDFs are typically small -- 1-5 pages). Recommendation: do both -- raise sizeLimit to 25MB as safety net AND enforce 5MB bid cap in UploadZone.
**Warning signs:** 413 Payload Too Large errors on bid+contract uploads.

### Pitfall 2: Bid FileId Cleanup on Error/Timeout
**What goes wrong:** The `finally` block in `api/analyze.ts` currently cleans up one `fileId`. With two files uploaded, both need cleanup.
**Why it happens:** Single-file assumption baked into the cleanup code.
**How to avoid:** Track both fileIds (e.g., `let contractFileId: string | null = null; let bidFileId: string | null = null;`) and clean up both in the `finally` block.
**Warning signs:** Orphaned files in Anthropic Files API (non-critical -- they auto-expire, but messy).

### Pitfall 3: Knowledge Module Token Budget Breach
**What goes wrong:** Adding two new modules to scope-extraction brings the total to 6 (the cap). If either module's content exceeds `TOKEN_CAP_PER_MODULE` (10,000 tokens = ~40,000 chars), `validateTokenBudget()` throws at import time and the entire API handler fails.
**Why it happens:** Knowledge module content is hand-authored; easy to overshoot.
**How to avoid:** Keep each module's content under 35,000 characters (~8,750 tokens). The AAMA module and Div 08 deliverables module should each be narrow-facts lists, not comprehensive encyclopedias. Verify with `estimateTokens()` during authoring.
**Warning signs:** `validateTokenBudget` error on server startup; handler returning 500 before any analysis.

### Pitfall 4: Backward Compatibility on Re-Analyze
**What goes wrong:** Contracts uploaded before v3.0 have no `bid_file_name` or `documents_analyzed` columns. Re-analyzing them must not crash.
**Why it happens:** New nullable columns return `null` from Supabase for old rows; client code that assumes these fields exist will throw.
**How to avoid:** All new fields on Contract are optional (`?:` in TypeScript, nullable in DB). Client rendering conditionally checks existence. Re-analyze path: when no bid was previously uploaded, bid zone shows "No bid attached -- add one?" rather than a broken state.
**Warning signs:** TypeErrors on contract review page for pre-v3.0 contracts.

### Pitfall 5: UploadZone State Management with Two Files
**What goes wrong:** User uploads contract, then uploads bid, then removes contract. State becomes inconsistent.
**Why it happens:** Two independent drop zones with independent state need coordination.
**How to avoid:** Lift file state to `ContractUpload` page component: `const [contractFile, setContractFile] = useState<File | null>(null); const [bidFile, setBidFile] = useState<File | null>(null);`. "Analyze" button requires `contractFile !== null`. Bid is always optional. Each zone shows selected file name + remove button.

## Code Examples

### Knowledge Module Content Pattern (KNOW-01 shape)
```typescript
// Source: Modeled after src/knowledge/standards/standards-validation.ts
const content = `AAMA SUBMITTAL STANDARDS FOR GLAZING CONTRACTS
Reference for identifying required submittals per AAMA/FGIA specification.

STANDARD SUBMITTAL REQUIREMENTS BY PRODUCT TYPE:

Storefronts (AAMA/WDMA/CSA 101/I.S.2/A440 -- NAFS):
- Shop drawings showing elevations, sections, details, hardware schedule
- Product data for framing system, glass type, finish
- Samples of finish (AAMA 2604/2605 color chips), glazing gasket
- Structural calculations per ASTM E330
- Thermal performance per NFRC 100 (if specified)
- Air/water/structural test reports per AAMA 501 series

Curtain Walls (AAMA 501 series):
- Shop drawings with stack joint details, anchor details, expansion provision
- Product data for all system components
- Mock-up requirements (AAMA 501.1 dynamic water test typical)
- Field quality test plan (AAMA 501.2 / AAMA 502)
- Structural calculations per ASTM E330
- Movement/deflection analysis

[...narrow-facts entries per AAMA section...]

ANALYSIS INSTRUCTIONS:
When reviewing submittal extraction output:
1. Cross-reference extracted submittals against this list for the applicable product type
2. Flag submittals that are TYPICALLY required but not mentioned in the contract
3. Set inferenceBasis to 'knowledge-module:aama-submittal-standards' for any inferred requirement
4. Do NOT flag missing submittals for product types not present in the contract scope`;
```

### Extended AnalyzeRequestSchema
```typescript
// Source: api/analyze.ts -- extend existing schema
const AnalyzeRequestSchema = z.object({
  pdfBase64: z.string().min(1, 'pdfBase64 is required'),
  fileName: z.string().max(255).optional(),
  contractId: z.string().uuid().optional(),
  bidPdfBase64: z.string().optional(),      // NEW: optional bid PDF
  bidFileName: z.string().max(255).optional(), // NEW: bid file name
});
```

### Parallel File Upload
```typescript
// Source: api/analyze.ts -- after validation, before pipeline
const [contractPrepared, bidPrepared] = await Promise.all([
  preparePdfForAnalysis(pdfBuffer, fileName, uploadClient),
  bidBuffer
    ? preparePdfForAnalysis(bidBuffer, bidFileName || 'bid.pdf', uploadClient)
    : Promise.resolve(null),
]);
const contractFileId = contractPrepared.fileId;
const bidFileId = bidPrepared?.fileId ?? null;
```

### Dual FileId Cleanup
```typescript
// Source: api/analyze.ts finally block -- extend existing pattern
finally {
  if (globalTimeout) clearTimeout(globalTimeout);
  const cleanupIds = [contractFileId, bidFileId].filter(Boolean) as string[];
  for (const id of cleanupIds) {
    try {
      await client!.beta.files.delete(id, { betas: BETAS });
    } catch (e) {
      console.error('File cleanup failed (non-critical):', e instanceof Error ? e.message : e);
    }
  }
  if (dispatcher) dispatcher.close();
}
```

### Client-Side Two-File Upload
```typescript
// Source: src/api/analyzeContract.ts -- extend signature
export async function analyzeContract(
  file: File,
  accessToken: string,
  contractId?: string,
  bidFile?: File,            // NEW: optional bid file
): Promise<Contract> {
  const pdfBase64 = await readFileAsBase64(file);
  const body: Record<string, string> = { pdfBase64, fileName: file.name };
  if (contractId) body.contractId = contractId;
  if (bidFile) {
    body.bidPdfBase64 = await readFileAsBase64(bidFile);
    body.bidFileName = bidFile.name;
  }
  // ...existing fetch call unchanged
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single PDF upload | Multi-document Files API with `type: 'document'` blocks | Files API beta (2025-04) | Enables passing multiple PDFs to a single Claude message without text extraction |
| Inline prompt knowledge | Registered knowledge modules with `composeSystemPrompt()` | v2.0 (Phase 39+) | New modules auto-inject via registry pattern; no prompt editing needed |
| Single global fileId | Per-document fileIds with role tagging | Phase 58 (this phase) | Enables document-attributed findings for reconciliation |

## Open Questions

1. **Body parser sizeLimit: 25MB or 30MB?**
   - What we know: Current limit is 15MB. Two 10MB PDFs base64-encoded = ~26.6MB. Vercel paid plan supports up to 50MB.
   - What's unclear: Whether to enforce a bid cap client-side (5MB) to keep total under 20MB, or raise limit higher.
   - Recommendation: Raise to 25MB, enforce 5MB bid cap client-side. Belt and suspenders.

2. **Contract row metadata for documents analyzed**
   - What we know: Need to track which documents were part of an analysis run for re-analyze UX.
   - What's unclear: Whether to add `bid_file_name text` column to contracts table, or a `documents_analyzed jsonb` column with richer metadata.
   - Recommendation: Add `bid_file_name text` nullable column. Simple, queryable, sufficient for v3.0. The `passResults` array already records which passes ran.

3. **Re-analyze UX: modal vs. inline controls?**
   - What we know: Current re-analyze is a button on ContractReview that triggers file picker. Need to support "keep contract, re-upload bid" and vice versa.
   - What's unclear: Exact UX for document selection during re-analyze.
   - Recommendation: Modal dialog with three sections -- contract (keep/re-upload), bid (keep/re-upload/add/remove), then "Start Analysis" button. Simpler than inline controls.

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` lines 9, 44-48, 96-184, 345-430, 849-868 -- existing pipeline, request schema, file upload, cleanup
- `api/pdf.ts` -- `preparePdfForAnalysis()` function, reusable for bid PDF
- `src/knowledge/registry.ts` -- `PASS_KNOWLEDGE_MAP`, `registerModule()`, `getModulesForPass()`
- `src/knowledge/tokenBudget.ts` -- `MAX_MODULES_PER_PASS = 6`, `TOKEN_CAP_PER_MODULE = 10000`
- `src/knowledge/trade/div08-scope.ts` -- existing module authoring pattern
- `src/knowledge/standards/standards-validation.ts` -- existing standards module pattern
- `.planning/phases/56-architecture-foundation/56-CONTEXT.md` -- Stage 3 architecture, ARCH-03 resolution
- `.planning/phases/57-contract-only-scope-extraction/57-CONTEXT.md` -- submittal schema, scope-extraction pass extension
- `.planning/research/ARCHITECTURE.md` -- multi-doc pipeline design, Stage 3 pattern
- `.planning/research/PITFALLS.md` -- Pitfall 2 (document attribution), Pitfall 3 (timeout), Pitfall 10 (module bloat)
- `.planning/research/FEATURES.md` -- multi-doc input flow, bid reconciliation architecture

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` Gap 1 and Gap 5 -- bid PDF storage and body parser decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns established in codebase
- Architecture: HIGH -- all integration points inspected, existing patterns directly extensible
- Knowledge module content: MEDIUM -- AAMA/Div 08 deliverables module content needs domain expertise to author correctly; module *structure* is HIGH confidence
- Pitfalls: HIGH -- grounded in existing codebase inspection and v3.0 milestone research

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no fast-moving dependencies)
