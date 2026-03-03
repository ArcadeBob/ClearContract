# Phase 1: Pipeline Foundation - Research

**Researched:** 2026-03-02
**Domain:** PDF processing pipeline, Anthropic Claude API (native PDF, structured outputs, Files API, prompt caching), Vercel serverless architecture
**Confidence:** HIGH

## Summary

Phase 1 rewrites the analysis pipeline to handle real 50+ page glazing subcontracts end-to-end. The current pipeline is broken: it uses the deprecated `pdf-parse` for text extraction, sends one truncated API call with 4096 max tokens, and hand-parses JSON responses -- all of which fail on production-sized contracts.

The new pipeline leverages three Anthropic API features that eliminate the original pain points: (1) **Native PDF support** via `document` content blocks sends raw PDF bytes to Claude, replacing fragile text extraction as the primary path. (2) **Structured outputs** via `output_config.format` with Zod schemas guarantee valid JSON responses through constrained decoding -- no more `JSON.parse()` failures. (3) **The Files API** enables a "upload once, analyze many times" pattern that elegantly solves both the Vercel 4.5MB body size limit and the multi-pass architecture requirement.

The critical architecture insight is the **Files API as the pivot point**: the serverless function uploads the PDF to Anthropic's Files API once, gets back a `file_id`, then fires multiple focused analysis passes in parallel using `Promise.all()` -- each pass references the same `file_id` instead of re-sending the PDF. This keeps each API request lightweight (just the file_id reference + prompt + schema), avoids the Vercel body size limit entirely for analysis requests, and naturally enables prompt caching across passes (cache read tokens cost 10x less than base input tokens).

**Primary recommendation:** Use Anthropic Files API for upload-once/analyze-many pattern, structured outputs with `output_config.format` + `zodOutputFormat()` for guaranteed JSON, and `unpdf` as the text extraction fallback for PDFs exceeding 100 pages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Focused passes by category -- each API call gets the full contract text with a targeted prompt for one analysis domain
- Phase 1 implements 2-3 basic passes to prove the engine works (e.g., general risk overview + dates/deadlines + scope extraction)
- Later phases add and refine passes for legal specifics, compliance, and verbiage
- All passes run in parallel via Promise.all() for speed (~15-30s total vs ~45-90s sequential)
- Full contract text sent to each pass -- no chunking, Claude's 200k token window handles 100+ page contracts easily
- Native PDF is the primary approach -- send raw PDF bytes to Claude via document content blocks
- Claude reads the PDF directly for better understanding of tables, headers, and formatting
- Text extraction (unpdf, replacing pdf-parse) is the fallback for contracts exceeding Claude's native PDF limits (~100 pages)
- Max file size increased from 3MB to 25MB to handle real subcontracts with exhibits
- Scanned/image-based PDFs: attempt native PDF analysis anyway (Claude vision can read them), but warn user results may be incomplete
- Graceful degradation: native PDF first, text extraction fallback, never reject outright
- Single /api/analyze endpoint fires all passes in parallel within Vercel's 60-second function timeout
- Partial results displayed when some passes succeed and others fail -- user sees what worked plus clear indicators of what failed
- Simple loading state during analysis ("Analyzing...") -- no per-pass progress tracking needed for ~15-30s wait
- Each pass is independent -- one failure doesn't block others
- Finding type extended now with optional fields for later phases (clauseText, explanation, riskType, negotiation) -- no breaking changes when Phase 2+ fills them in
- Existing 9 categories kept as-is
- Keep Claude Sonnet model -- good cost/quality balance for contract analysis
- Risk score (0-100) computed deterministically from findings count and severity, not AI-determined -- explainable and consistent
- Structured output via Zod schemas for every API response -- guaranteed valid JSON, no parsing failures

### Claude's Discretion
- Exact Zod schema structure and validation rules
- How to detect scanned vs text-based PDFs
- unpdf integration details and fallback threshold
- Pass prompt design and category-to-pass mapping
- Risk score computation weights per severity level
- Error retry logic (if any) before showing partial results

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Analysis bug is fixed -- user can upload a PDF and receive analysis results without errors | Native PDF support via document content blocks replaces broken pdf-parse pipeline; Files API solves Vercel 4.5MB body limit; structured outputs eliminate JSON parsing failures |
| INFRA-02 | Multi-pass analysis engine sends multiple focused Claude API calls per contract instead of one 4096-token call | Files API upload-once/analyze-many pattern; Promise.all() parallel execution; each pass gets its own system prompt + Zod schema + file_id reference; prompt caching reduces cost of repeated PDF reads to 10% |
| INFRA-03 | Native PDF support replaces pdf-parse -- Claude reads PDFs directly via document content blocks, with unpdf fallback for large contracts | Anthropic document content blocks (type: "document", source: base64 or file_id); 100 page / 32MB request limit; unpdf v0.12+ for text extraction fallback; scanned PDFs handled via Claude vision |
| INFRA-04 | Structured output via Zod schemas guarantees valid JSON responses with no parsing failures | Anthropic structured outputs GA via output_config.format with json_schema type; zodOutputFormat() helper in @anthropic-ai/sdk; constrained decoding guarantees schema compliance; use Zod v3.x for SDK compatibility |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.78.0 | Claude API client -- messages, files, structured outputs | Official SDK; includes zodOutputFormat() helper, Files API beta support, prompt caching |
| `zod` | ^3.23.0 (v3.x) | Schema definition and validation for API responses | Required by Anthropic SDK's zodOutputFormat(); v3.x required -- v4 has known incompatibilities with the SDK |
| `unpdf` | ^0.12.0 | PDF text extraction fallback for contracts exceeding 100 pages | Modern pdf-parse replacement; serverless-compatible; built on PDF.js; works in Vercel functions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-dropzone` | ^14.2.3 | File upload UI (already installed) | Update maxSize config from 3MB to 25MB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod v3 | Zod v4 | v4 has incompatibilities with @anthropic-ai/sdk zodOutputFormat helper; stick with v3 |
| unpdf | pdfjs-dist | pdfjs-dist is the upstream library; unpdf wraps it with serverless-friendly defaults and simpler API |
| Files API | Base64 in each request | Base64 works but hits Vercel 4.5MB limit and re-sends PDF data for every pass; Files API is superior for multi-pass |

### Remove
| Library | Reason |
|---------|--------|
| `pdf-parse` | Unmaintained, replaced by native PDF support (primary) and unpdf (fallback) |

**Installation:**
```bash
npm install zod@3 unpdf
npm uninstall pdf-parse @types/pdf-parse
```

Note: `@anthropic-ai/sdk` is already at ^0.78.0 in package.json -- no update needed. The SDK already includes structured outputs and Files API support.

## Architecture Patterns

### Recommended Changes to Project Structure
```
api/
├── analyze.ts              # Rewritten: orchestrates upload + multi-pass + merge
src/
├── types/
│   └── contract.ts         # Extended with optional fields (clauseText, explanation, etc.)
├── schemas/
│   └── analysis.ts         # NEW: Zod schemas for each analysis pass response
├── api/
│   └── analyzeContract.ts  # Updated: larger file size, new response shape
```

### Pattern 1: Files API Upload-Once / Analyze-Many
**What:** Upload PDF to Anthropic Files API once, get file_id, reference it in all analysis passes.
**When to use:** Every analysis request -- this is the core pipeline pattern.
**Why:** Solves Vercel 4.5MB body limit, avoids re-sending 25MB PDF per pass, enables prompt caching.

```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/files
import Anthropic, { toFile } from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Step 1: Upload PDF once to Files API
const pdfBuffer = Buffer.from(pdfBase64, 'base64');
const fileUpload = await client.beta.files.upload(
  {
    file: await toFile(
      new Blob([pdfBuffer], { type: 'application/pdf' }),
      fileName,
      { type: 'application/pdf' }
    )
  },
  { betas: ['files-api-2025-04-14'] }
);

// Step 2: Reference file_id in each analysis pass
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  system: passSpecificSystemPrompt,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'file', file_id: fileUpload.id },
        cache_control: { type: 'ephemeral' }
      },
      { type: 'text', text: passSpecificUserPrompt }
    ]
  }],
  output_config: {
    format: zodOutputFormat(passSpecificSchema)
  }
});

// Step 3: Clean up file after all passes complete
await client.beta.files.delete(fileUpload.id, {
  betas: ['files-api-2025-04-14']
});
```

**Note on Files API beta:** The Files API requires the beta header `files-api-2025-04-14`. When using file_id references in messages, the `client.beta.messages.create()` endpoint is needed with the betas array. However, structured outputs (`output_config.format`) are GA and do not require beta headers.

**Compatibility consideration:** Since Files API requires `client.beta.messages.create()` and structured outputs use `output_config.format` (GA), verify that both work together in a single request. If the beta messages endpoint doesn't support `output_config.format`, fall back to raw JSON schema in the request (which is equivalent -- zodOutputFormat just converts Zod to JSON Schema).

### Pattern 2: Parallel Multi-Pass with Partial Results
**What:** Fire all analysis passes in parallel, collect results with Promise.allSettled(), merge successes and report failures.
**When to use:** Every analysis -- the core execution pattern.

```typescript
// Define passes
interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType;
}

const passes: AnalysisPass[] = [
  { name: 'risk-overview', systemPrompt: '...', userPrompt: '...', schema: riskOverviewSchema },
  { name: 'dates-deadlines', systemPrompt: '...', userPrompt: '...', schema: datesSchema },
  { name: 'scope-extraction', systemPrompt: '...', userPrompt: '...', schema: scopeSchema },
];

// Execute all passes in parallel
const results = await Promise.allSettled(
  passes.map(pass => executePass(client, fileId, pass))
);

// Merge results: successes become findings/dates, failures become error findings
const merged = mergePassResults(results, passes);
```

### Pattern 3: Structured Output with Zod + zodOutputFormat
**What:** Define response schemas in Zod, use zodOutputFormat() to get guaranteed JSON.
**When to use:** Every API call -- replaces manual JSON parsing.

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const FindingSchema = z.object({
  severity: z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']),
  category: z.enum([
    'Legal Issues', 'Scope of Work', 'Contract Compliance',
    'Labor Compliance', 'Insurance Requirements', 'Important Dates',
    'Financial Terms', 'Technical Standards', 'Risk Assessment'
  ]),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  // Optional fields for future phases
  clauseText: z.string().optional(),
  explanation: z.string().optional(),
});

const PassResponseSchema = z.object({
  findings: z.array(FindingSchema),
  dates: z.array(z.object({
    label: z.string(),
    date: z.string(),
    type: z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']),
  })),
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  messages: [...],
  output_config: { format: zodOutputFormat(PassResponseSchema) }
});

// Guaranteed to be valid JSON matching the schema
const data = JSON.parse(response.content[0].text);
```

**Important JSON Schema limitations for structured outputs:**
- No recursive schemas
- `additionalProperties` must be `false` for all objects (zodOutputFormat handles this)
- No `minimum`/`maximum`/`minLength`/`maxLength` constraints (moved to descriptions by SDK)
- `minItems` only supports 0 or 1
- All properties must be listed in `required` (optional Zod fields become required in schema with nullable type)

### Pattern 4: Native PDF with Text Extraction Fallback
**What:** Try native PDF first (Claude reads the document), fall back to text extraction if the PDF exceeds 100 pages.
**When to use:** During file upload processing, before analysis passes begin.

```typescript
import { extractText } from 'unpdf';

async function prepareDocument(
  pdfBuffer: Buffer,
  fileName: string,
  client: Anthropic
): Promise<{ fileId: string; usedFallback: boolean }> {
  // Check page count (rough estimate: PDF.js can count pages)
  const pageCount = await getPageCount(pdfBuffer);

  if (pageCount <= 100) {
    // Primary path: upload to Files API for native PDF processing
    const file = await client.beta.files.upload(
      { file: await toFile(new Blob([pdfBuffer]), fileName, { type: 'application/pdf' }) },
      { betas: ['files-api-2025-04-14'] }
    );
    return { fileId: file.id, usedFallback: false };
  } else {
    // Fallback: extract text with unpdf, upload as text file
    const { text } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });
    const textBuffer = Buffer.from(text as string, 'utf-8');
    const file = await client.beta.files.upload(
      { file: await toFile(new Blob([textBuffer]), `${fileName}.txt`, { type: 'text/plain' }) },
      { betas: ['files-api-2025-04-14'] }
    );
    return { fileId: file.id, usedFallback: true };
  }
}
```

### Pattern 5: Deterministic Risk Score from Findings
**What:** Compute risk score from findings count and severity instead of asking AI.
**When to use:** After all passes complete, during result merging.

```typescript
function computeRiskScore(findings: Finding[]): number {
  const weights: Record<string, number> = {
    Critical: 25,
    High: 15,
    Medium: 8,
    Low: 3,
    Info: 0,
  };

  const rawScore = findings.reduce(
    (sum, f) => sum + (weights[f.severity] || 0), 0
  );

  // Clamp to 0-100
  return Math.min(100, Math.max(0, rawScore));
}
```

### Anti-Patterns to Avoid
- **Sending base64 PDF in every API call:** Use Files API instead -- upload once, reference by file_id
- **Parsing JSON manually from AI text responses:** Use structured outputs (output_config.format) -- guaranteed valid
- **Using pdf-parse:** Unmaintained, fails on many PDFs; use native PDF support as primary, unpdf as fallback
- **Single monolithic API call with 4096 max_tokens:** Use multi-pass with higher per-pass max_tokens (8192)
- **Rejecting scanned PDFs outright:** Claude vision can read them; warn user but attempt analysis
- **Sequential pass execution:** Use Promise.allSettled() for parallel execution within the 60s timeout
- **Using Promise.all() for passes:** Use Promise.allSettled() to get partial results even when some passes fail

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON response parsing | Custom regex/fence stripping | `output_config.format` + `zodOutputFormat()` | Constrained decoding guarantees valid JSON at the token generation level |
| PDF text extraction | Custom pdf.js wrapper | `unpdf` (extractText) | Handles serverless environments, mocks canvas, bundles PDF.js |
| File upload to Claude | Custom multipart encoding | `@anthropic-ai/sdk` Files API (`client.beta.files.upload()`) | SDK handles multipart, beta headers, error responses |
| Schema validation | Manual type checking of API responses | Zod schemas + structured outputs | Compile-time TypeScript types + runtime API enforcement |
| Prompt caching | Manual request deduplication | `cache_control: { type: "ephemeral" }` on document blocks | Anthropic handles KV cache; 90% cost reduction on cached reads |

**Key insight:** The Anthropic SDK + structured outputs eliminates the entire "parse and validate AI response" problem class. Every response is guaranteed to match the schema. This removes the most fragile part of the current pipeline.

## Common Pitfalls

### Pitfall 1: Vercel 4.5MB Body Size Limit
**What goes wrong:** Sending 25MB PDFs as base64 in the request body to the Vercel serverless function triggers a 413 error.
**Why it happens:** Base64 encoding inflates file size by ~33%, so even a 3.4MB PDF exceeds 4.5MB. The current codebase already has this constraint (3MB limit).
**How to avoid:** Two-endpoint architecture: (1) a lightweight `/api/upload` endpoint that receives the PDF and uploads it to the Anthropic Files API server-side, returning the file_id, OR (2) restructure to send the PDF directly from the client to the Anthropic Files API using a pre-authorized token. The simplest approach: keep sending base64 to the Vercel function but increase awareness that files over ~3.4MB will fail. For 25MB support, the client must upload the PDF in a different way.
**Architecture decision needed:** The most practical approach for this project is to keep the PDF upload through the Vercel function for files up to ~3.4MB (covers many contracts), and for larger files, use client-side chunked upload or direct-to-Anthropic upload. Alternatively, accept the 4.5MB limit as a real constraint and set the max file size to ~3MB for base64, or ~4MB for raw. **Recommendation:** Use the Anthropic Files API from the serverless function for files that fit, and for files over 4MB, have the client send the PDF in chunks or use a streaming upload approach. See Open Questions for more on this.

**UPDATED APPROACH:** After deeper analysis, the cleanest solution is: the serverless function receives the base64 PDF (up to ~3.4MB actual file size after base64 inflation), uploads it to the Anthropic Files API, gets back a file_id, and runs all passes. For files larger than 3.4MB, the client can either: (a) the serverless function streams the upload to the Files API without buffering the full body, or (b) create a two-step flow where the client gets a pre-signed upload URL. For Phase 1, **recommend setting max file size to 10MB** (practical for most glazing subcontracts) and noting that the 25MB goal may require an architecture change in a later phase. Most glazing subcontracts with exhibits are under 10MB as PDF.

### Pitfall 2: Files API is in Beta
**What goes wrong:** Beta APIs can change. The `files-api-2025-04-14` beta header is required.
**Why it happens:** Anthropic hasn't graduated Files API to GA yet.
**How to avoid:** Pin the beta header string as a constant. Use `client.beta.files.*` and `client.beta.messages.create()` with `betas` array. Abstract the file upload behind a helper function so beta header changes are one-line fixes.
**Warning signs:** 400 errors mentioning "unknown beta feature" after SDK update.

### Pitfall 3: Structured Output Schema Limitations
**What goes wrong:** Zod schemas with unsupported JSON Schema features (e.g., `z.string().min(5)`) fail at the API level.
**Why it happens:** Structured outputs support a subset of JSON Schema. The SDK's zodOutputFormat() strips unsupported constraints and adds them to descriptions, but some patterns still fail.
**How to avoid:** Keep schemas simple: basic types, enums, arrays, nested objects. Avoid min/max constraints, recursive types, and complex unions. Test schemas with a simple API call before building the full pipeline.
**Warning signs:** 400 errors mentioning "unsupported schema feature".

### Pitfall 4: 60-Second Function Timeout with Parallel Passes
**What goes wrong:** 3 parallel API calls each take 20-30s, but the Vercel function timeout is 60s on Hobby plan (configurable up to 300s with Fluid Compute).
**Why it happens:** Each Claude API call processes a full PDF (1500-3000 tokens per page for a 50-page doc = 75k-150k input tokens) plus generates a structured response.
**How to avoid:** The current `vercel.json` sets maxDuration to 60s. On Vercel Hobby plan, max duration is 300s. **Increase maxDuration to 120-180s** in vercel.json. With parallel execution, 3 passes should complete in 15-30s (the time of the slowest pass, not the sum). But cold starts and large PDFs could push this higher.
**Warning signs:** 504 FUNCTION_INVOCATION_TIMEOUT errors on first request or large PDFs.

### Pitfall 5: Zod v4 Incompatibility
**What goes wrong:** Installing Zod v4 breaks the Anthropic SDK's zodOutputFormat() helper.
**Why it happens:** The @anthropic-ai/sdk was built for Zod v3. Zod v4 changed some internal APIs.
**How to avoid:** Explicitly install `zod@3` (e.g., `npm install zod@3`). Do not upgrade to Zod v4.
**Warning signs:** TypeScript errors or runtime errors from zodOutputFormat().

### Pitfall 6: unpdf Node.js Version Requirement
**What goes wrong:** unpdf (via PDF.js v5.x) uses `Promise.withResolvers` which requires Node.js 22+.
**Why it happens:** PDF.js v5 adopted this newer API.
**How to avoid:** Vercel Node.js runtime defaults vary by plan. Ensure `engines` in package.json specifies Node.js 22+, or rely on unpdf's bundled polyfill for the serverless build.
**Warning signs:** "Promise.withResolvers is not a function" errors in Vercel logs.

## Code Examples

### Complete Multi-Pass Analysis Endpoint (Skeleton)
```typescript
// api/analyze.ts - Rewritten endpoint
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

// Schema for each pass response
const PassResultSchema = z.object({
  findings: z.array(z.object({
    severity: z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']),
    category: z.enum([
      'Legal Issues', 'Scope of Work', 'Contract Compliance',
      'Labor Compliance', 'Insurance Requirements', 'Important Dates',
      'Financial Terms', 'Technical Standards', 'Risk Assessment'
    ]),
    title: z.string(),
    description: z.string(),
    recommendation: z.string(),
    clauseReference: z.string(),
  })),
  dates: z.array(z.object({
    label: z.string(),
    date: z.string(),
    type: z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']),
  })),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... CORS, validation, API key check ...

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { pdfBase64, fileName } = req.body;

  // 1. Upload to Files API
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const fileUpload = await client.beta.files.upload(
    { file: await toFile(new Blob([pdfBuffer]), fileName || 'contract.pdf', { type: 'application/pdf' }) },
    { betas: ['files-api-2025-04-14'] }
  );

  try {
    // 2. Run passes in parallel
    const passResults = await Promise.allSettled([
      runPass(client, fileUpload.id, 'risk-overview', riskSystemPrompt, riskUserPrompt),
      runPass(client, fileUpload.id, 'dates-deadlines', datesSystemPrompt, datesUserPrompt),
      runPass(client, fileUpload.id, 'scope-extraction', scopeSystemPrompt, scopeUserPrompt),
    ]);

    // 3. Merge results
    const merged = mergeResults(passResults);

    return res.status(200).json(merged);
  } finally {
    // 4. Clean up uploaded file
    await client.beta.files.delete(fileUpload.id, {
      betas: ['files-api-2025-04-14']
    }).catch(() => {}); // Best-effort cleanup
  }
}

async function runPass(
  client: Anthropic,
  fileId: string,
  passName: string,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await client.beta.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    betas: ['files-api-2025-04-14'],
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'file', file_id: fileId },
          cache_control: { type: 'ephemeral' }
        },
        { type: 'text', text: userPrompt }
      ]
    }],
    output_config: { format: zodOutputFormat(PassResultSchema) }
  });

  return JSON.parse(
    response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  );
}
```

### Deterministic Risk Score Computation
```typescript
function computeRiskScore(findings: Array<{ severity: string }>): number {
  const weights: Record<string, number> = {
    Critical: 25,
    High: 15,
    Medium: 8,
    Low: 3,
    Info: 0,
  };
  const raw = findings.reduce((sum, f) => sum + (weights[f.severity] ?? 0), 0);
  return Math.min(100, Math.max(0, raw));
}
```

### unpdf Text Extraction Fallback
```typescript
// Source: https://github.com/unjs/unpdf
import { extractText } from 'unpdf';

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const { text, totalPages } = await extractText(
    new Uint8Array(pdfBuffer),
    { mergePages: true }
  );
  return text as string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdf-parse for text extraction | Native PDF via document content blocks | Claude 3.5 (late 2024) | Claude reads tables, headers, formatting directly from PDF |
| Manual JSON.parse() with regex fence stripping | Structured outputs (output_config.format) | Nov 2025 beta, now GA | Guaranteed valid JSON through constrained decoding |
| Re-send content in every request | Files API (upload once, reference by file_id) | Apr 2025 beta | Upload-once/analyze-many; eliminates redundant data transfer |
| Prompt prefix caching (beta header) | Automatic caching (cache_control at top level) | Now GA | 90% cost reduction on cached input tokens |
| output_format parameter | output_config.format | Recent (2026) | New GA parameter; old beta header still works for transition |

**Deprecated/outdated:**
- `pdf-parse`: Unmaintained, last meaningful update years ago. Replace with native PDF support + unpdf fallback.
- `output_format` parameter: Moved to `output_config.format`. Old parameter still works during transition.
- Beta header `structured-outputs-2025-11-13`: No longer needed -- structured outputs are GA via `output_config.format`.

## Open Questions

1. **Vercel body size limit vs 25MB file goal**
   - What we know: Vercel has a hard 4.5MB request body limit. Base64 encoding inflates by ~33%. So max actual file size through the serverless function is ~3.4MB.
   - What's unclear: Whether the client can upload directly to the Anthropic Files API (CORS is supported with `anthropic-dangerous-direct-browser-access` header, but this exposes the API key). Whether Vercel streaming functions can handle larger request bodies.
   - Recommendation: For Phase 1, set practical max to **10MB** with a plan to solve the full 25MB later. Options for larger files: (a) client-side direct upload to Anthropic with BYOK pattern, (b) intermediate storage (Vercel Blob on Pro plan, or S3), (c) chunked upload via multiple serverless calls. The 10MB limit covers the vast majority of glazing subcontracts. Flag this as a Phase 1 known limitation.

2. **Files API + Structured Outputs + Beta Messages compatibility**
   - What we know: Files API requires `client.beta.messages.create()` with betas array. Structured outputs use `output_config.format` (GA).
   - What's unclear: Whether the beta messages endpoint supports the GA `output_config.format` parameter, or if we need to use raw JSON schema instead of zodOutputFormat.
   - Recommendation: Test this combination early in implementation. If beta messages doesn't support output_config.format, use raw JSON schema (zodOutputFormat is just a convenience wrapper that converts Zod to JSON Schema -- the raw schema achieves the same constrained decoding).

3. **Prompt caching effectiveness for parallel passes**
   - What we know: Cache TTL is 5 minutes, refreshed on each use. Cache is keyed on the full prefix (tools + system + messages up to cache breakpoint).
   - What's unclear: Whether parallel requests from the same serverless function invocation can share cache entries, since they're sent near-simultaneously. The first request to arrive creates the cache; subsequent ones may or may not see it.
   - Recommendation: Add `cache_control: { type: "ephemeral" }` to the document block in each pass. Even if the first pass's cache isn't ready for the second pass (due to near-simultaneous execution), the cost overhead is just 1.25x base input tokens for the cache write, and future re-analyses of the same document would benefit from the cache.

4. **Max tokens per pass**
   - What we know: Current endpoint uses 4096 max_tokens for a single pass covering everything. Each focused pass needs fewer tokens but should have headroom.
   - What's unclear: Optimal max_tokens for focused passes. Too low = truncated responses. Too high = wasted time/cost.
   - Recommendation: Start with 8192 max_tokens per pass. This is generous for a focused analysis pass that returns 5-15 findings with descriptions. Monitor actual token usage and adjust down if needed.

## Sources

### Primary (HIGH confidence)
- [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support) - Document content block format, 100 page / 32MB limits, base64 encoding, all models supported
- [Anthropic Structured Outputs Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - output_config.format, zodOutputFormat(), JSON Schema limitations, GA status
- [Anthropic Files API Docs](https://platform.claude.com/docs/en/docs/build-with-claude/files) - Upload/reference/delete API, beta header, 500MB limit, TypeScript examples
- [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) - cache_control, 5min TTL, pricing (10% for cache reads), document block caching
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) - 4.5MB body, 300s max duration (Hobby), memory limits
- [unpdf GitHub](https://github.com/unjs/unpdf) - extractText API, serverless build, PDF.js v5.4

### Secondary (MEDIUM confidence)
- [Vercel KB: Bypass Body Size Limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) - Client-side upload strategies, streaming responses
- [Zod v4 Incompatibility Issue](https://github.com/vercel/ai/issues/8784) - Known issues with Zod v4 and AI SDK providers
- [Anthropic SDK npm page](https://www.npmjs.com/package/@anthropic-ai/sdk) - Current version ^0.78.0

### Tertiary (LOW confidence)
- Anthropic CORS browser access - `dangerouslyAllowBrowser: true` option exists but exposes API key; not recommended for production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Anthropic SDK docs, verified API patterns, current versions confirmed
- Architecture: HIGH - Files API + structured outputs + multi-pass pattern is well-documented with TypeScript examples from official docs
- Pitfalls: HIGH - Body size limit confirmed from Vercel docs, Zod v4 issue confirmed from GitHub issues, Files API beta status confirmed
- Open Questions: MEDIUM - The Vercel body size / 25MB file goal tension requires architectural decision; Files API + structured outputs beta/GA compatibility needs runtime verification

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (30 days - APIs are stable/GA except Files API beta)
