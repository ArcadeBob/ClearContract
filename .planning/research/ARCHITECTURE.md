# Architecture Research

**Domain:** AI-powered contract analysis (multi-pass LLM pipeline on Vercel serverless)
**Researched:** 2026-03-02
**Confidence:** HIGH (Vercel limits, Claude API capabilities verified via official docs)

## Problem Statement

The current system sends the entire contract text in a single Claude API call with 4096 max output tokens. This is insufficient because:

1. **Output bottleneck:** 4096 output tokens is approximately 3000 words -- far too little for comprehensive analysis with exact clause quotes across 9 categories on a 100-page contract.
2. **Single-pass analysis:** One prompt cannot deeply analyze legal issues, scope, compliance, financial terms, dates, and questionable verbiage simultaneously. The model spreads attention thin.
3. **No progress feedback:** The user stares at a spinner for up to 60 seconds with no idea what is happening.
4. **Truncation risk:** 100k character truncation may drop critical later sections of long contracts (exhibits, amendments, insurance schedules).

## Recommended Architecture: Sequential Multi-Pass with Server-Sent Events

### System Overview

```
Client (React SPA)                     Vercel Serverless Functions
=====================                  ============================

UploadZone                             POST /api/analyze
  |                                      |
  | PDF file                             | pdf-parse -> full text
  v                                      |
analyzeContract()                        | Split into analysis passes
  |                                      |
  | POST with base64 PDF                 v
  |                            +------------------+
  |<-- SSE stream -------------|  Pass Orchestrator |
  |                            +------------------+
  |  event: pass_start              |         |         |
  |  event: pass_complete           v         v         v
  |  event: pass_start         Pass 1    Pass 2    Pass 3...
  |  event: pass_complete      (Legal)   (Scope)   (Compliance)
  |  event: analysis_complete       |         |         |
  |                                 v         v         v
  v                            +------------------+
ContractReview page            |  Result Merger   |
  (progressive rendering)      +------------------+
                                        |
                                        v
                                  Final JSON response
                                  (via last SSE event)
```

### Why This Pattern (Not Polling, Not Parallel)

**Sequential passes within a single function invocation** is the right pattern because:

- **Vercel Fluid Compute** (enabled by default) allows up to **300 seconds on Hobby**, **800 seconds on Pro**. This is more than enough for 3-5 sequential Claude API calls. The old 60-second limit only applies with Fluid Compute disabled. **[HIGH confidence -- verified via Vercel official docs]**
- **Prompt caching** means pass 2-N reuse the cached contract text prefix, reducing latency from ~11s to ~2.4s per subsequent pass and cutting input token costs by 90% on cache hits. **[HIGH confidence -- verified via Anthropic official docs]**
- **No database needed:** Sequential passes in one function invocation avoid the complexity of external state, job queues, or polling infrastructure. The single-user context makes this acceptable.
- **SSE (Server-Sent Events)** provide real-time progress to the client without WebSocket complexity. Vercel supports streaming responses from Node.js functions.

**Why not parallel passes:** Parallel API calls would be faster in wall-clock time but cannot leverage prompt caching (each call would pay full input cost). Sequential passes with caching are cheaper and only marginally slower since cache hits reduce per-pass latency dramatically.

**Why not client-side polling:** Adds complexity (database, job records, polling endpoints) that is unnecessary when a single function invocation can handle the entire pipeline within Vercel's duration limits.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **UploadZone** | PDF upload with validation (size, type) | Existing `react-dropzone` component, unchanged |
| **analyzeContract()** | Client-side orchestrator: POST PDF, consume SSE stream, update store progressively | Rewritten from `fetch` to `EventSource` or `fetch` with `ReadableStream` |
| **useContractStore** | Holds contract state, findings accumulate per-pass, status tracks current pass | Extended with per-pass status tracking and progressive findings array |
| **POST /api/analyze** | Server orchestrator: extract text, run passes sequentially, stream events | Major rewrite: orchestrator pattern with SSE response |
| **Pass Executor** | Runs a single analysis pass with a focused prompt against the contract text | New module: `api/lib/passes.ts` |
| **Pass Definitions** | Prompt templates and parsing logic for each analysis category | New module: `api/lib/passDefinitions.ts` |
| **Result Merger** | Combines findings from all passes, deduplicates, calculates final risk score | New module: `api/lib/merger.ts` |
| **ContractReview** | Displays findings progressively as passes complete | Extended to handle partial/progressive data |

## Recommended Project Structure

```
api/
  analyze.ts                  # Main endpoint: orchestrates passes, streams SSE
  lib/
    textExtractor.ts          # PDF to text extraction (pdf-parse wrapper)
    passOrchestrator.ts       # Runs passes sequentially, manages prompt caching
    passDefinitions.ts        # Pass configs: prompt templates, output schemas, parsing
    passes/
      legalIssues.ts          # Legal issues pass prompt + parser
      scopeOfWork.ts          # Scope extraction pass prompt + parser
      compliance.ts           # Labor compliance + insurance pass prompt + parser
      financialTerms.ts       # Financial terms + dates pass prompt + parser
      questionableVerbiage.ts # Ambiguous/one-sided clause detection prompt + parser
    resultMerger.ts           # Combine pass results, deduplicate, compute risk score
    sseWriter.ts              # Helper to write SSE events to response stream
    claudeClient.ts           # Anthropic SDK wrapper with caching config
src/
  api/
    analyzeContract.ts        # Client: POST PDF, consume SSE stream
  hooks/
    useContractStore.ts       # Extended: progressive analysis state
    useAnalysisStream.ts      # New: SSE consumption hook
  types/
    contract.ts               # Extended: pass status types, analysis metadata
    analysis.ts               # New: pass definitions, SSE event types
  components/
    AnalysisProgress.tsx      # New: shows which pass is running, completed count
  pages/
    ContractReview.tsx        # Extended: progressive rendering of findings
```

### Structure Rationale

- **`api/lib/passes/`:** Each pass is a separate file because the prompts are substantial (500-1000 words each) and the parsing logic differs per category. Keeping them separate enables independent iteration.
- **`api/lib/`:** Shared utilities stay at the lib level. The orchestrator, merger, and SSE writer are cross-cutting concerns used by the main endpoint.
- **`src/hooks/useAnalysisStream.ts`:** Separating SSE consumption from the store keeps concerns clean. The hook manages the EventSource lifecycle; the store just receives updates.
- **`src/types/analysis.ts`:** New types for multi-pass analysis are separate from the existing contract types to avoid a monolithic type file.

## Architectural Patterns

### Pattern 1: Sequential Multi-Pass with Prompt Caching

**What:** Break contract analysis into 5 focused passes, each with a specialized prompt. The contract text is sent as a cached prefix; only the pass-specific instructions change between calls.

**When to use:** When a single LLM call cannot produce comprehensive output across multiple analysis dimensions, and the same large input needs to be analyzed from different angles.

**Trade-offs:**
- Pro: Each pass can use the full output token budget (8192-16384 tokens) for its specific category
- Pro: Prompt caching makes passes 2-5 use cached input (90% cost reduction, 80% latency reduction on cache hits)
- Pro: Focused prompts produce higher quality analysis per category
- Con: Total wall-clock time is higher than a single call (but offset by caching)
- Con: Sequential dependency means one failed pass blocks subsequent passes

**Implementation:**

```typescript
// api/lib/passOrchestrator.ts
import Anthropic from '@anthropic-ai/sdk';
import { PassDefinition, PassResult } from './passDefinitions';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runPass(
  contractText: string,
  pass: PassDefinition,
  fileName: string
): Promise<PassResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: pass.maxTokens,  // 8192-16384 per pass
    cache_control: { type: 'ephemeral' },  // Enable automatic caching
    system: [
      {
        type: 'text',
        text: pass.systemPrompt,
        cache_control: { type: 'ephemeral' }  // Cache system prompt
      }
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: contractText,  // This gets cached after pass 1
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: pass.userInstructions  // Only this changes per pass
          }
        ]
      }
    ]
  });

  return pass.parseResponse(message);
}
```

**Cost analysis for a 50-page contract (~35,000 tokens input):**

| Scenario | Input Cost | Output Cost | Total | Latency |
|----------|-----------|-------------|-------|---------|
| Current: 1 pass, 4096 output | $0.105 | $0.061 | $0.17 | ~15s |
| New: 5 passes, 8192 output each, with caching | $0.105 + 4 x $0.0105 | 5 x $0.123 | $0.76 | ~25-35s |

The cost increase is modest (roughly 4x) and justified by dramatically more comprehensive output. Cache hits on passes 2-5 reduce input costs by 90% per pass.

### Pattern 2: Server-Sent Events for Progressive Updates

**What:** Stream analysis progress to the client using SSE. Each completed pass sends an event with that pass's findings. The client renders findings progressively.

**When to use:** When a long-running operation (25-45 seconds) needs to provide user feedback and partial results.

**Trade-offs:**
- Pro: User sees results within 8-12 seconds (after first pass) instead of waiting 30+ seconds
- Pro: If a later pass fails, earlier results are still displayed
- Pro: Simpler than WebSockets, works with standard HTTP
- Con: SSE is unidirectional (server to client only), but we only need server-to-client
- Con: Requires keeping the Vercel function alive for the full duration

**Server-side implementation:**

```typescript
// api/lib/sseWriter.ts
import type { VercelResponse } from '@vercel/node';

export interface SSEEvent {
  event: string;
  data: unknown;
}

export function initSSE(res: VercelResponse) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
}

export function sendEvent(res: VercelResponse, event: SSEEvent) {
  res.write(`event: ${event.event}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

export function endSSE(res: VercelResponse) {
  res.end();
}
```

**Client-side implementation:**

```typescript
// src/hooks/useAnalysisStream.ts
export function useAnalysisStream() {
  const consumeStream = async (
    pdfBase64: string,
    fileName: string,
    onPassStart: (passName: string, passIndex: number) => void,
    onPassComplete: (passResult: PassResult) => void,
    onComplete: (finalResult: AnalysisResult) => void,
    onError: (error: string) => void
  ) => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64, fileName }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = parseSSEEvents(buffer);
      buffer = events.remaining;

      for (const event of events.parsed) {
        switch (event.event) {
          case 'pass_start':
            onPassStart(event.data.passName, event.data.passIndex);
            break;
          case 'pass_complete':
            onPassComplete(event.data);
            break;
          case 'analysis_complete':
            onComplete(event.data);
            break;
          case 'error':
            onError(event.data.message);
            break;
        }
      }
    }
  };

  return { consumeStream };
}
```

### Pattern 3: Focused Pass Prompts with Structured Output

**What:** Each analysis pass has a deeply specialized prompt that instructs Claude to analyze from one specific angle, producing structured JSON with exact clause quotes.

**When to use:** When you need exhaustive, quotation-backed analysis rather than surface-level summaries.

**Trade-offs:**
- Pro: A focused 500-word prompt for "Legal Issues" produces far more thorough results than a 50-word section in a general prompt
- Pro: Each pass can define its own output schema optimized for that category
- Pro: Exact quote extraction is more reliable when the model only has one task
- Con: Some findings may span categories (e.g., a pay-if-paid clause is both legal and financial); handled by the merger with cross-references

## Data Flow

### Full Analysis Flow

```
User drops PDF
    |
    v
[Client] analyzeContract(file)
    |
    | 1. Validate file (size <= 10MB, type = PDF)
    | 2. Convert to base64
    | 3. POST /api/analyze with SSE consumption
    |
    v
[Server] POST /api/analyze
    |
    | 4. Decode base64 -> Buffer
    | 5. pdf-parse extracts text
    | 6. Validate text length (>= 100 chars)
    | 7. Initialize SSE response stream
    |
    v
[Server] Pass Orchestrator
    |
    | For each pass (Legal -> Scope -> Compliance -> Financial -> Verbiage):
    |   8.  Send SSE: { event: "pass_start", data: { passName, passIndex, totalPasses } }
    |   9.  Build prompt with contract text (cached) + pass instructions
    |   10. Call Claude API with prompt caching enabled
    |   11. Parse structured JSON response
    |   12. Send SSE: { event: "pass_complete", data: { passName, findings, dates } }
    |
    | 13. Run Result Merger:
    |     - Combine all findings
    |     - Deduplicate cross-category findings
    |     - Compute weighted risk score
    |     - Resolve contract metadata (client, type)
    |
    | 14. Send SSE: { event: "analysis_complete", data: finalResult }
    | 15. End SSE stream
    |
    v
[Client] useAnalysisStream callbacks
    |
    | On pass_start:  Update store status -> "Analyzing: Legal Issues (1/5)"
    | On pass_complete: Append findings to contract, re-render review page
    | On analysis_complete: Set final risk score, status -> "Reviewed"
    | On error: Create Critical finding with error message
    |
    v
[Client] ContractReview page renders progressively
```

### State Management

```
useContractStore state shape (extended):

{
  contracts: Contract[],
  activeContractId: string | null,
  activeView: ViewState,
  analysisProgress: {
    currentPass: string | null,      // "Legal Issues"
    currentPassIndex: number,         // 0-4
    totalPasses: number,              // 5
    completedPasses: string[],        // ["Legal Issues", "Scope of Work"]
    status: 'idle' | 'extracting' | 'analyzing' | 'merging' | 'complete' | 'error'
  }
}
```

### Key Data Flows

1. **PDF upload flow:** Unchanged from current architecture. File -> base64 -> POST. The only change is consuming SSE instead of waiting for a single JSON response.

2. **Pass execution flow:** Each pass sends the full contract text (cached after first call) plus pass-specific instructions. The response is parsed into findings with the pass's category baked in. Findings accumulate in the contract's findings array across passes.

3. **Progressive rendering flow:** As each pass completes, findings are appended to the store. React re-renders the review page with the new findings. The user sees Legal Issues findings appear first, then Scope of Work findings appear below, and so on.

## The Five Analysis Passes

| Pass | Focus | Key Extractions | Output Tokens |
|------|-------|-----------------|---------------|
| 1. Legal Issues | Indemnification, liability, pay-if-paid, liquidated damages, dispute resolution, termination | Exact clause quotes + risk explanation + recommendation | 16384 |
| 2. Scope of Work | Full scope extraction, scope rules, exclusions, scope gaps, comparison points | Scope items list + rules + identified gaps | 12288 |
| 3. Compliance & Insurance | Labor compliance (prevailing wage, safety, licensing), insurance requirements, bonding | Compliance checklist with dates + insurance matrix | 8192 |
| 4. Financial Terms & Dates | Payment terms, retainage, change order process, all dates/milestones | Financial terms + structured dates array | 8192 |
| 5. Questionable Verbiage | Ambiguous clauses, one-sided terms favoring GC, missing protections, unusual provisions | Flagged clauses with quotes + explanation of concern | 8192 |

**Why this ordering:** Legal Issues first because they are highest priority for risk assessment. Scope second because it is the most text-heavy extraction. The remaining passes can run in any order but are grouped by complexity.

## Handling Vercel Constraints

### Duration Limits (CRITICAL)

**Current `vercel.json` sets `maxDuration: 60`.** This MUST be updated.

With Fluid Compute (enabled by default on all plans), the actual limits are:
- **Hobby:** Up to 300 seconds (5 minutes)
- **Pro:** Up to 800 seconds (13 minutes)

For 5 sequential passes with prompt caching:
- Pass 1 (cache write): ~10-15 seconds
- Passes 2-5 (cache hit): ~3-6 seconds each
- Total estimated: 22-39 seconds
- With safety margin: set `maxDuration: 120` (Hobby) or `maxDuration: 300` (Pro)

**[HIGH confidence]** Verified via [Vercel Functions Limits documentation](https://vercel.com/docs/functions/limitations) and [Duration configuration docs](https://vercel.com/docs/functions/configuring-functions/duration).

```json
// vercel.json - updated
{
  "functions": {
    "api/analyze.ts": {
      "maxDuration": 300
    }
  }
}
```

### Request Body Size (4.5 MB limit)

Vercel Functions have a **4.5 MB request body limit**. A base64-encoded PDF is ~33% larger than the original. Current 3MB PDF limit produces ~4MB base64, which is close to the Vercel limit.

**Recommendation:** Keep the 3MB PDF limit (covers contracts up to ~200 pages of text). If larger contracts are needed later, upload to Vercel Blob storage first and pass a URL reference.

**[HIGH confidence]** Verified via [Vercel Functions Limits documentation](https://vercel.com/docs/functions/limitations).

### Memory (2 GB Hobby, 4 GB Pro)

PDF parsing of a 3MB file plus multiple API response buffers will stay well under 2 GB. Not a concern.

### Streaming Response

Vercel supports streaming from Node.js serverless functions. The SSE approach uses `res.write()` which is compatible with Vercel's streaming infrastructure. No Edge Runtime required.

**[HIGH confidence]** Verified via [Vercel streaming blog post](https://vercel.com/blog/streaming-for-serverless-node-js-and-edge-runtimes-with-vercel-functions).

## Claude API Configuration

### Model Selection

Use **`claude-sonnet-4-20250514`** (Claude Sonnet 4) for all passes. Rationale:
- Legal analysis requires high accuracy -- Sonnet 4 is the best cost/accuracy balance
- 200K context window fits contracts up to ~500 pages of text
- Supports prompt caching (90% input cost reduction on cache hits)
- $3/MTok input, $15/MTok output -- affordable for a single-user tool

The 1M context window beta is available but unnecessary. A 100-page contract is roughly 50,000 tokens, well within 200K.

### Prompt Caching Configuration

Use **automatic caching** with explicit breakpoints on the contract text block. This ensures:
- System prompt is cached (saves re-processing on each pass)
- Contract text is cached (the expensive part, ~35K tokens for a 50-page contract)
- Only the pass-specific instructions are uncached (~500 tokens per pass)

Cache TTL: 5 minutes (default). Since all 5 passes complete within 30-45 seconds, the cache stays warm for the entire analysis.

**Pricing impact with caching:**
- Pass 1: Full input cost ($0.105 for 35K tokens) + 25% cache write premium = $0.131
- Passes 2-5: Cache hit at 10% of input cost = $0.0105 each = $0.042 total
- Total input for 5 passes: $0.173 (vs. $0.525 without caching -- 67% savings)

**[HIGH confidence]** Verified via [Anthropic Prompt Caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

### Max Output Tokens

Current system uses 4096 max output tokens. This is the root cause of shallow analysis. Claude Sonnet 4 supports **up to 64K output tokens** (Sonnet 4.6) or 8192 by default for Sonnet 4.

Recommendation: Set `max_tokens` per pass (8192-16384) based on the expected output volume. Legal Issues and Scope passes need more output tokens because they produce the most findings with exact quotes.

### Extended Thinking (Future Enhancement)

Claude 4 models support extended thinking which can improve analysis quality for complex legal reasoning. This is a natural Phase 2+ enhancement after the multi-pass pipeline is stable. The thinking tokens are automatically stripped from context between turns and do not consume cache space.

## Anti-Patterns

### Anti-Pattern 1: Single Mega-Prompt

**What people do:** Stuff all analysis categories into one massive system prompt and expect comprehensive output from a single API call.
**Why it is wrong:** Output token limits cap the response. The model spreads attention across all categories, producing shallow analysis everywhere. Exact clause quoting is sacrificed for brevity.
**Do this instead:** Break into focused passes where each pass has one job and enough output tokens to do it thoroughly.

### Anti-Pattern 2: Client-Side Chunking and Parallel Calls

**What people do:** Split the contract into chunks on the client, send each chunk to a separate API call in parallel, and merge results client-side.
**Why it is wrong:** Chunking a legal document by character offset breaks clause boundaries. Findings that span multiple sections (e.g., "See Section 12.3 for exceptions") are lost. Parallel calls from the client expose the API key or require multiple serverless invocations (costly, complex).
**Do this instead:** Send the full document to one server function. Let the server run focused analysis passes on the full document text, leveraging prompt caching.

### Anti-Pattern 3: Database-Backed Job Queue for Single User

**What people do:** Set up a database, create a jobs table, use polling or webhooks to track analysis progress.
**Why it is wrong:** Massive over-engineering for a single-user tool. Introduces infrastructure dependencies (database hosting, connection management) and operational complexity for no benefit when Vercel supports 300-800 second function durations with streaming.
**Do this instead:** Use a single long-running Vercel function with SSE streaming. The function lifetime covers the entire analysis pipeline.

### Anti-Pattern 4: Ignoring Prompt Caching

**What people do:** Make each API call independently, sending the full contract text each time without caching.
**Why it is wrong:** Each pass re-processes the full input token count at full price. For 5 passes on a 35K-token contract, this means paying 5x input costs instead of 1x + 4x 0.1x.
**Do this instead:** Enable automatic prompt caching. Structure prompts so the contract text is a cached prefix block. Only the per-pass instructions change.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user (current) | Single Vercel function with SSE streaming. No database. In-memory state. This architecture is correct and sufficient. |
| 5-10 users | Same architecture holds. Vercel auto-scales function instances. Prompt caching is per-workspace so each concurrent analysis gets its own cache. Consider adding Vercel KV or Blob for contract persistence across sessions. |
| 50+ users | Add a persistence layer (Vercel Postgres or external). Consider background job processing (Inngest, Upstash QStash) to avoid tying up function instances. Add authentication. This is well beyond current scope. |

### Scaling Priorities

1. **First bottleneck:** Not scale -- it is analysis quality and output comprehensiveness. The multi-pass architecture directly addresses this.
2. **Second bottleneck:** Data loss on page refresh. This requires a persistence layer (Vercel KV or Postgres) which is out of scope for the initial multi-pass pipeline but should be planned for.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Claude API | HTTP via `@anthropic-ai/sdk` with prompt caching | Use automatic caching. Set `max_tokens` per pass. Handle 429 rate limits with exponential backoff. |
| Vercel Functions | SSE streaming response from Node.js runtime | Set `maxDuration: 300` in `vercel.json`. Test streaming locally with `vercel dev`. |
| pdf-parse | Buffer-based PDF text extraction | Existing integration, unchanged. Consider upgrading to handle larger files if 3MB limit is raised. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client <-> Server | SSE over HTTP POST | Client sends PDF, server streams pass events back. Single request/response lifecycle. |
| Pass Orchestrator <-> Pass Executor | Function calls within same process | No network boundary. Orchestrator calls each pass sequentially, receives parsed results. |
| Pass Executor <-> Claude API | HTTP via Anthropic SDK | Each pass is one API call. Prompt caching handled by SDK. Error handling per-pass with retry. |
| Result Merger <-> Store | SSE event -> store update | The `analysis_complete` event carries the merged result. Client store replaces placeholder contract data. |

## Build Order (Dependencies)

The following build order respects dependencies between components:

1. **Phase 1: Fix and stabilize current system**
   - Diagnose and fix the current analysis bug
   - Update `vercel.json` maxDuration to 300
   - Validate streaming works from Vercel functions
   - *No architectural changes yet -- just make the existing single-pass work*

2. **Phase 2: Server-side multi-pass infrastructure**
   - Build `api/lib/claudeClient.ts` with prompt caching
   - Build `api/lib/sseWriter.ts` for SSE response streaming
   - Build `api/lib/passOrchestrator.ts` to run passes sequentially
   - Build first pass definition (Legal Issues) with focused prompt
   - Rewrite `api/analyze.ts` to use orchestrator with SSE
   - *Depends on: Phase 1 (stable base, streaming confirmed)*

3. **Phase 3: Client-side progressive rendering**
   - Build `src/hooks/useAnalysisStream.ts` for SSE consumption
   - Extend `useContractStore` with analysis progress tracking
   - Build `AnalysisProgress` component
   - Update `ContractReview` for progressive rendering
   - Rewrite `src/api/analyzeContract.ts` to use SSE
   - *Depends on: Phase 2 (server streams events)*

4. **Phase 4: Remaining analysis passes**
   - Build Scope of Work pass definition + prompt
   - Build Compliance & Insurance pass definition + prompt
   - Build Financial Terms & Dates pass definition + prompt
   - Build Questionable Verbiage pass definition + prompt
   - Build `api/lib/resultMerger.ts` for cross-pass deduplication
   - *Depends on: Phase 2 (orchestrator), can partially overlap with Phase 3*

5. **Phase 5: Output formatting and polish**
   - Extend Finding types with exact clause quotes
   - Build grouped/categorized findings display
   - Build compliance checklist view
   - Build scope comparison view
   - *Depends on: Phase 3 (client rendering), Phase 4 (all passes producing data)*

## Sources

- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) -- Duration, memory, request body size limits (HIGH confidence)
- [Vercel Function Duration Configuration](https://vercel.com/docs/functions/configuring-functions/duration) -- Fluid Compute defaults and max durations per plan (HIGH confidence)
- [Vercel Streaming Functions](https://vercel.com/docs/functions/streaming/streaming-examples) -- SSE and streaming support (HIGH confidence)
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- Automatic caching, pricing, TTL, TypeScript examples (HIGH confidence)
- [Anthropic Legal Summarization Guide](https://platform.claude.com/docs/en/about-claude/use-case-guides/legal-summarization) -- Meta-summarization pattern, chunking, code examples (HIGH confidence)
- [Anthropic Long Context Prompting](https://www.anthropic.com/news/prompting-long-context) -- Quote extraction, scratchpad technique, recall optimization (HIGH confidence)
- [Claude Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- 200K standard, 1M beta, model limits (HIGH confidence)
- [Vercel AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- Optional SDK for streaming abstraction (MEDIUM confidence -- useful but not required)
- [Streaming from Serverless Node.js on Vercel](https://vercel.com/blog/streaming-for-serverless-node-js-and-edge-runtimes-with-vercel-functions) -- Streaming infrastructure details (HIGH confidence)

---
*Architecture research for: ClearContract multi-pass analysis pipeline*
*Researched: 2026-03-02*
