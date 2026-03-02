# Technology Stack

**Project:** ClearContract - AI Contract Analysis Pipeline
**Researched:** 2026-03-02
**Focus:** What to CHANGE or ADD to enable comprehensive multi-pass contract analysis of 5-100+ page PDFs

## Current Stack (Keep As-Is)

The existing frontend stack is solid and requires no changes:

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | 18.3.1 | UI framework | Keep |
| TypeScript | 5.5.4 | Type safety | Keep |
| Vite | 5.2.0 | Build tool | Keep |
| Tailwind CSS | 3.4.17 | Styling | Keep |
| Framer Motion | 11.5.4 | Animations | Keep |
| Lucide React | 0.522.0 | Icons | Keep |
| React Dropzone | 14.2.3 | File upload | Keep |
| @vercel/node | 5.6.9 | Serverless functions | Keep |

## Recommended Changes

### 1. Claude API Model Upgrade

| Technology | Current | Recommended | Why |
|------------|---------|-------------|-----|
| Claude model | `claude-sonnet-4-20250514` | `claude-sonnet-4-6` | Latest Sonnet with 64K max output tokens (vs 4096 currently configured), 200K context window standard, 1M beta. Same price ($3/$15 per MTok). Training data through Jan 2026. **Confidence: HIGH** (verified via official models overview page) |
| max_tokens | 4096 | 16384 (per pass) | Current limit is far too low for comprehensive analysis with exact clause quotes. 16K per pass across multiple passes yields thorough coverage. |

**Key model specs (verified from official docs):**

| Model | API ID | Context Window | Max Output | Input $/MTok | Output $/MTok |
|-------|--------|---------------|------------|-------------|--------------|
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 200K (1M beta) | 64K tokens | $3 | $15 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | 64K tokens | $1 | $5 |

Use Sonnet 4.6 for primary analysis (best quality-to-cost ratio). Use Haiku 4.5 for lightweight tasks like date extraction or classification if cost becomes a concern.

### 2. Remove pdf-parse, Use Claude's Native PDF Support

**Confidence: HIGH** (verified from official Anthropic docs)

| Action | Detail |
|--------|--------|
| **Remove** | `pdf-parse` (v2.4.5) and `@types/pdf-parse` |
| **Use instead** | Claude API's native `document` content block with `type: "base64"` |

**Why:** Claude's API now natively accepts PDFs as `document` content blocks. The API extracts both text AND visual content (charts, tables, layouts) from each page -- far superior to pdf-parse which only extracts raw text. This eliminates the entire text extraction step, the 100k char truncation hack, and the image-based PDF rejection logic.

**How it works:**
```typescript
const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16384,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBase64  // already have this from client
        },
        cache_control: { type: "ephemeral" }
      },
      {
        type: "text",
        text: "Analyze this contract..."
      }
    ]
  }]
});
```

**Limits:** 32MB max request size, 100 pages max per document. Token cost: ~1,500-3,000 tokens per page (text) + image tokens per page. A 100-page contract would use roughly 150K-300K input tokens, fitting within the 200K standard context or requiring the 1M beta.

**Constraint for large contracts (>60 pages):** At ~3,000 tokens/page, a 70-page contract hits ~210K tokens -- exceeding the standard 200K context window. Options:
1. Use the 1M context beta header (`context-1m-2025-08-07`) -- requires usage tier 4. Pricing: 2x input tokens beyond 200K.
2. Extract text with `unpdf` first and send as plain text (lower token count, ~1,000 tokens/page), reserving native PDF for shorter contracts.
3. Chunk the document and process sections separately.

**Recommendation:** Use native PDF for contracts up to ~60 pages (fits in 200K). For longer contracts, extract text with `unpdf` and chunk. This hybrid approach avoids the 1M beta tier requirement while keeping the superior PDF understanding for most contracts.

### 3. Add unpdf as Fallback Text Extractor

**Confidence: HIGH** (verified from GitHub and npm)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unpdf | 1.4.0 | PDF text extraction | Contracts >60 pages where native PDF would exceed 200K context; also useful for pre-processing to determine page count and contract structure |

**Why unpdf over pdf-parse:**
- Built for serverless environments (Vercel compatibility verified)
- Zero dependencies (ships bundled PDF.js v5.4.394)
- Modern TypeScript-first ESM API
- Page-level text extraction via `mergePages: false` -- essential for chunking
- Actively maintained (pdf-parse is unmaintained)

```typescript
import { extractText, getDocumentProxy } from "unpdf";

const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
const { text, totalPages } = await extractText(pdf, { mergePages: false });
// text is string[] -- one per page, enabling intelligent chunking
```

### 4. Add Zod for Structured Output Schemas

**Confidence: HIGH** (verified from official Anthropic structured outputs docs)

| Library | Version | Purpose |
|---------|---------|---------|
| zod | 4.3.6 | Define TypeScript-first schemas for Claude structured outputs |

**Why:** Anthropic's structured outputs feature (now GA -- no beta header needed) guarantees Claude's response conforms exactly to a JSON schema via constrained decoding. The TypeScript SDK provides `zodOutputFormat()` helper that converts Zod schemas to JSON Schema automatically. This eliminates all JSON parsing failures, markdown code fence stripping, and manual validation currently in `api/analyze.ts`.

```typescript
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const FindingSchema = z.object({
  severity: z.enum(["Critical", "High", "Medium", "Low", "Info"]),
  category: z.enum(["Legal Issues", "Scope of Work", /* ... */]),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string().optional(),
  exactQuote: z.string().describe("The exact clause text from the contract"),
});

const AnalysisSchema = z.object({
  client: z.string(),
  contractType: z.enum(["Prime Contract", "Subcontract", "Purchase Order", "Change Order"]),
  riskScore: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
  dates: z.array(DateSchema),
});

const response = await client.messages.parse({
  model: "claude-sonnet-4-6",
  max_tokens: 16384,
  messages: [...],
  output_config: { format: zodOutputFormat(AnalysisSchema) }
});

// response.parsed_output is fully typed -- no JSON.parse needed
const result: z.infer<typeof AnalysisSchema> = response.parsed_output;
```

**Supported models:** Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5.

**Critical limitation:** Structured outputs are INCOMPATIBLE with the Citations API. You cannot use both in the same request. This drives a multi-pass architecture (see Architecture section).

### 5. Use Citations API for Exact Clause Quoting

**Confidence: HIGH** (verified from official Anthropic citations docs)

The Citations API is the single most impactful addition for ClearContract. Instead of prompting Claude to quote clauses (which it often gets wrong or paraphrases), Citations provides machine-verified exact text extraction with page number references.

**How it works:**
- Send the PDF as a `document` content block with `citations: { enabled: true }`
- Claude's response includes interleaved text blocks, some containing `citations` arrays
- Each citation includes `cited_text` (exact quote), `start_page_number`, `end_page_number`
- The `cited_text` does NOT count toward output tokens (cost savings)

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16384,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
        citations: { enabled: true },
        cache_control: { type: "ephemeral" }
      },
      {
        type: "text",
        text: "Identify all indemnification clauses, pay-if-paid provisions..."
      }
    ]
  }]
});

// Response contains text blocks with citation arrays:
// { type: "text", text: "The contract contains a broad indemnification clause",
//   citations: [{ type: "page_location", cited_text: "Subcontractor shall indemnify...",
//                 start_page_number: 12, end_page_number: 13, document_index: 0 }] }
```

**Key constraint:** Cannot be combined with structured outputs in the same request. This is why a multi-pass architecture is necessary: one pass with citations for clause extraction, followed by a pass with structured output for categorization/scoring.

### 6. Enable Prompt Caching for Multi-Pass Cost Reduction

**Confidence: HIGH** (verified from official Anthropic docs)

No new library needed -- this is an API feature using the existing `@anthropic-ai/sdk`.

**Why it matters:** In a multi-pass architecture, the same contract text is sent multiple times. Prompt caching reduces input token costs by 90% on cache hits (0.1x base price). Cache write costs 1.25x base price, but subsequent reads at 0.1x easily offset this.

**How:** Add `cache_control: { type: "ephemeral" }` to the document block and system prompt. The cache persists for 5 minutes (sufficient for multi-pass analysis of a single contract).

```typescript
// Both system prompt and document get cached for multi-pass reuse
const systemMessage = {
  role: "system" as const,
  content: ANALYSIS_SYSTEM_PROMPT,
  cache_control: { type: "ephemeral" as const }
};
```

For a 50-page contract (~150K input tokens):
- Pass 1 (cache write): 150K * $3/MTok * 1.25 = $0.5625
- Pass 2 (cache read): 150K * $3/MTok * 0.1 = $0.045
- Pass 3 (cache read): $0.045
- **Total input cost: ~$0.65 vs $1.35 without caching (52% savings)**

### 7. Vercel Streaming for Timeout Management

**Confidence: MEDIUM** (streaming works on Vercel, but timeout behavior needs validation)

No new library needed, but the serverless function architecture must change from request/response to streaming.

**The problem:** Current 60s Vercel timeout (Hobby plan). A multi-pass analysis of a large contract could take 2-3 minutes.

**Solutions ranked by preference:**

1. **Client-orchestrated multi-pass (RECOMMENDED):** Each analysis pass is a separate HTTP request to a separate serverless function. Client coordinates passes sequentially. Each pass stays within 60s. No streaming needed for timeout avoidance.

2. **Streaming response:** Use streaming to keep the connection alive. The Anthropic SDK supports streaming natively. Vercel supports Node.js streaming. The function max duration still applies, but streaming lets us send progress events to the client.

3. **Vercel Pro + Fluid Compute:** Upgrade to Vercel Pro ($20/month) for 300s max duration (or 800s with Fluid Compute). Worth considering if the user base grows.

**Recommended approach: Client-orchestrated multi-pass.** Each API endpoint handles one analysis pass:
- `POST /api/analyze/extract` -- PDF text extraction + basic metadata (quick, <15s)
- `POST /api/analyze/legal` -- Legal issues with citations (Claude call, ~30-45s)
- `POST /api/analyze/scope` -- Scope extraction with citations (~30-45s)
- `POST /api/analyze/compliance` -- Compliance checklist with structured output (~20-30s)
- `POST /api/analyze/synthesize` -- Final risk scoring + organization (~20-30s)

Each endpoint completes within the 60s limit. The client calls them sequentially, updating the UI with partial results as each completes.

## Do NOT Add

| Technology | Why Not |
|-----------|---------|
| Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | Adds an abstraction layer over `@anthropic-ai/sdk` without meaningful benefit for this project. We need direct access to Citations API, structured outputs with Zod, prompt caching, and document content blocks. The Vercel AI SDK abstracts these behind a unified interface that may not expose all features. The direct Anthropic SDK already has first-class TypeScript support. |
| LangChain / LlamaIndex | Over-engineered for this use case. We have one LLM provider (Anthropic), one document type (PDF), and a specific analysis pipeline. These frameworks add complexity without value. |
| Vector database (Pinecone, ChromaDB) | RAG is unnecessary. Contracts are analyzed in full, not searched. Claude's context window (200K-1M tokens) can hold entire contracts. |
| Next.js | The app already works with Vite + Vercel serverless functions. Migrating to Next.js would be a rewrite with no user-facing benefit. |
| Supabase / database | Out of scope per PROJECT.md. Data persistence is not needed yet. |
| pdf-parse | Unmaintained, no page-level extraction, no serverless optimization. Replace with unpdf (for fallback text extraction) and native PDF support. |
| pdf.js-extract / pdfreader | unpdf already bundles PDF.js in a serverless-optimized build. No reason to use a separate wrapper. |
| OpenAI API | Anthropic Claude is the established choice, has superior document understanding, and Citations API is a differentiating feature not available from other providers. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PDF processing | Claude native PDF + unpdf fallback | pdf-parse | pdf-parse is unmaintained, text-only, no page-level extraction |
| PDF processing | Claude native PDF + unpdf fallback | pdfjs-dist | unpdf already bundles PDF.js in a serverless-optimized build |
| Structured output | Zod + `zodOutputFormat()` | Manual JSON.parse + validation | Structured outputs guarantee schema compliance via constrained decoding -- zero parsing failures |
| Schema validation | Zod 4.3.6 | io-ts, yup, ajv | Zod has first-class integration with Anthropic TypeScript SDK via `zodOutputFormat()`. No other schema library has this. |
| Clause quoting | Citations API | Prompt-based quoting | Citations provides machine-verified exact quotes with page numbers; prompt-based approaches hallucinate or paraphrase |
| LLM orchestration | Client-orchestrated multi-pass | LangChain | LangChain adds heavy dependencies for simple sequential API calls. Direct SDK calls are clearer. |
| Timeout management | Client-orchestrated multi-pass | Vercel Pro + long-duration functions | Multi-pass works on any plan and provides better UX (progressive results). Vercel Pro is a fallback option. |
| AI SDK | @anthropic-ai/sdk (direct) | Vercel AI SDK | Direct SDK ensures access to all Anthropic features (citations, structured outputs, caching, document blocks) without abstraction gaps |

## Installation

```bash
# Add new dependencies
npm install zod unpdf

# Remove deprecated dependencies
npm uninstall pdf-parse
npm uninstall -D @types/pdf-parse
```

No other dependency changes needed. The `@anthropic-ai/sdk` (v0.78.0) already supports:
- Structured outputs via `output_config` + `zodOutputFormat()`
- Citations via `citations: { enabled: true }` on document blocks
- Native PDF via `document` content blocks
- Prompt caching via `cache_control`
- Streaming via `client.messages.stream()`

## File Size Limit Change

Increase the client-side file size limit from 3MB to 32MB to match Claude's API limit. A 100-page contract PDF is typically 5-15MB.

```typescript
const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB (Claude API limit)
```

## Key Integration Constraints

### Citations + Structured Outputs Incompatibility
These two features CANNOT be used in the same API request. This is a hard constraint from Anthropic's API. The multi-pass architecture must be designed around this:
- **Citation passes:** Use for clause extraction where exact quotes with page references are needed
- **Structured output passes:** Use for categorization, scoring, and organizing results into typed data structures

### 100-Page PDF Limit
Claude's native PDF support maxes at 100 pages per request. For contracts exceeding this:
- Use `unpdf` to extract text
- Send as plain text `document` block instead of base64 PDF
- Text-based documents have no page limit (only token limits)

### Context Window vs Cost Tradeoff
Native PDF uses ~3,000 tokens/page (text + image). Plain text uses ~1,000 tokens/page. For a 100-page contract:
- Native PDF: ~300K tokens = 1M beta required, at 2x pricing = $1.80 input
- Plain text: ~100K tokens = fits in standard 200K window = $0.30 input

**Recommendation:** Use native PDF for contracts up to ~60 pages (best quality). Use unpdf text extraction for longer contracts (cost/context efficient). Let the system auto-detect based on page count.

## Sources

- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) -- model specs, pricing, context windows (HIGH confidence)
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- Zod integration, `output_config`, GA status (HIGH confidence)
- [Anthropic Citations](https://platform.claude.com/docs/en/build-with-claude/citations) -- citations API, document types, incompatibility with structured outputs (HIGH confidence)
- [Anthropic PDF Support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) -- native PDF, base64, file limits (HIGH confidence)
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- cache_control, pricing, duration (HIGH confidence)
- [Anthropic Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- 1M beta, context-1m-2025-08-07 header (HIGH confidence)
- [Anthropic Legal Summarization Guide](https://platform.claude.com/docs/en/about-claude/use-case-guides/legal-summarization) -- meta-summarization pattern, chunking (HIGH confidence)
- [unpdf on GitHub](https://github.com/unjs/unpdf) -- v1.4.0, serverless build, extractText API (HIGH confidence)
- [unpdf on npm](https://www.npmjs.com/package/unpdf) -- v1.4.0, zero dependencies (HIGH confidence)
- [Zod on npm](https://www.npmjs.com/package/zod) -- v4.3.6 (HIGH confidence)
- [@anthropic-ai/sdk on npm](https://www.npmjs.com/package/@anthropic-ai/sdk) -- v0.78.0 (HIGH confidence)
- [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute) -- extended durations, streaming (MEDIUM confidence)
- [Vercel Streaming](https://vercel.com/docs/functions/streaming/streaming-examples) -- Node.js streaming support (MEDIUM confidence)
- [Vercel Function Timeout KB](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) -- 60s hobby, 300s pro, 800s fluid (MEDIUM confidence)
