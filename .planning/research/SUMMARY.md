# Project Research Summary

**Project:** ClearContract - AI Contract Analysis Pipeline
**Domain:** AI-powered construction subcontract review (glazing subcontractor)
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

ClearContract is a single-user AI tool that analyzes glazing subcontracts to extract risks, exact clause quotes, compliance requirements, and negotiation leverage points. The existing prototype works as a proof-of-concept but is broken in production (likely due to `pdf-parse` failing on Vercel) and architecturally unable to produce the depth of analysis needed for real 50-100+ page contracts. The current single API call with 4096 max output tokens is the fundamental bottleneck -- it cannot generate comprehensive findings with verbatim clause quotes across 9+ analysis categories. Every meaningful improvement depends on solving this output capacity problem first.

The recommended approach is a sequential multi-pass analysis pipeline where the contract is sent once (cached by Claude's API), then analyzed from 5 different angles in focused passes -- legal issues, scope of work, compliance/insurance, financial terms, and questionable verbiage. Each pass gets its own prompt and a generous output token budget (8192-16384 tokens). Anthropic's Citations API provides machine-verified exact quotes with page numbers, eliminating hallucinated clause references. Structured outputs via Zod guarantee valid JSON responses, eliminating all parsing failures. Server-Sent Events stream pass results to the client progressively, so the user sees findings within 8-12 seconds instead of staring at a spinner for 30+ seconds. Prompt caching cuts input token costs by 67% across the multi-pass pipeline.

The key risks are: (1) the current production bug must be fixed before any enhancement work begins, (2) hallucinated clause quotes are the most dangerous failure mode for a legal analysis tool and require both prompt engineering and the Citations API to mitigate, and (3) Vercel's 4.5MB request body limit constrains PDF upload size and must be managed carefully. The Citations API and structured outputs cannot be used in the same API call -- this hard constraint from Anthropic drives the entire multi-pass architecture design. The good news: the existing frontend stack (React 18, TypeScript, Tailwind, Framer Motion) is solid and requires no changes. The work is almost entirely in the API layer and analysis pipeline.

## Key Findings

### Recommended Stack

The frontend stack stays as-is. All changes target the API/analysis layer. Two dependencies are added (`zod`, `unpdf`), one is removed (`pdf-parse`), and the Claude API integration gains four new capabilities: native PDF document support, Citations API, structured outputs, and prompt caching. See [STACK.md](./STACK.md) for full details.

**Core technology changes:**
- **Claude Sonnet 4.6** (`claude-sonnet-4-6`): Upgrade from current model. 64K max output tokens, 200K context (1M beta). Same $3/$15 per MTok pricing.
- **Native PDF support**: Send PDFs directly to Claude as `document` content blocks. Eliminates `pdf-parse`, the 100k char truncation, and image-based PDF rejection. Superior text + visual understanding.
- **Zod 4.3.6 + structured outputs**: Anthropic's `zodOutputFormat()` guarantees schema-compliant JSON via constrained decoding. Zero parsing failures. Replaces fragile `JSON.parse()` on raw LLM output.
- **Citations API**: Machine-verified exact clause quotes with page numbers. Eliminates hallucinated or paraphrased quotes -- the single most impactful addition for a contract review tool.
- **Prompt caching**: 90% input cost reduction on cache hits. 5-minute TTL covers the entire multi-pass pipeline. Makes multi-pass economically viable.
- **unpdf 1.4.0**: Fallback text extractor for contracts exceeding 60 pages (where native PDF would exceed 200K context window). Serverless-optimized, page-level extraction, replaces unmaintained `pdf-parse`.

**Do not add:** Vercel AI SDK (abstraction over direct SDK without benefit), LangChain (over-engineered), vector databases (unnecessary -- full contracts fit in context), Next.js (no migration benefit), Supabase/databases (out of scope).

### Expected Features

The feature landscape is well-defined by construction industry contract review practices and competitor analysis. See [FEATURES.md](./FEATURES.md) for the full prioritization matrix.

**Must have (table stakes):**
- Exact clause quoting in every finding (verbatim text, not summaries)
- Comprehensive risk findings across all major categories (30-80+ findings per contract)
- Indemnification clause analysis (limited/intermediate/broad form detection)
- Pay-if-paid / pay-when-paid detection with enforceability context
- Liquidated damages, retainage, and insurance requirements extraction
- Scope of work extraction with inclusions/exclusions
- Labor compliance checklist (prevailing wage, certified payroll, OSHA, licensing)
- Date/deadline extraction including notice periods and cure periods
- Risk score (0-100) as weighted composite of finding severities

**Should have (differentiators):**
- Questionable verbiage detection (ambiguous, one-sided, or missing protections)
- Negotiation prep output (suggested positions per Critical/High finding)
- Flow-down clause analysis (prime-to-sub cascading obligations)
- Change order terms analysis (unilateral change rights, pricing mechanisms)
- Scope gap detection (compare to standard glazing subcontract scope items)
- Section-by-section contract map
- PDF report export

**Defer (v2+):**
- Bid-to-scope comparison, state-specific legal context, contract version comparison, historical risk tracking

**Anti-features (do not build):**
- Automated redlining (legal liability risk), multi-document comparison (wrong use case), playbook customization (over-engineering for single user), real-time chat with contract (comprehensive upfront analysis is better), contract storage database (out of scope), Procore integration (standalone tool)

### Architecture Approach

The architecture is a sequential multi-pass pipeline within a single Vercel serverless function, streaming results to the client via Server-Sent Events. Five focused Claude API calls share the same cached contract text. Each pass has a specialized prompt, its own output token budget, and produces typed results. A result merger deduplicates cross-category findings and computes the final risk score. The client renders findings progressively as each pass completes. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full data flow and component design.

**Major components:**
1. **Pass Orchestrator** (`api/lib/passOrchestrator.ts`) -- Runs 5 analysis passes sequentially against the cached contract, manages prompt caching, handles per-pass errors
2. **Pass Definitions** (`api/lib/passes/*.ts`) -- Specialized prompts and output schemas for each analysis category (legal, scope, compliance, financial, verbiage)
3. **SSE Writer** (`api/lib/sseWriter.ts`) -- Streams pass_start, pass_complete, and analysis_complete events to the client
4. **Analysis Stream Hook** (`src/hooks/useAnalysisStream.ts`) -- Client-side SSE consumer that feeds progressive results into the contract store
5. **Result Merger** (`api/lib/resultMerger.ts`) -- Combines findings from all passes, deduplicates, computes weighted risk score

**Key architectural constraint:** Citations API and structured outputs are incompatible in the same API request. Citation passes extract exact quotes with page numbers. Structured output passes categorize and score findings into typed schemas. This drives a minimum of 2 pass types.

**Vercel constraints resolved:** Fluid Compute provides 300s on Hobby (was 60s). Total pipeline time is estimated at 22-39s with prompt caching. SSE streaming is supported from Node.js serverless functions. The 4.5MB request body limit constrains PDF uploads to ~3MB raw (keep current limit).

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the complete list with recovery strategies.

1. **pdf-parse ENOENT crash on Vercel** -- The `pdf-parse` package looks for a test file that Vercel strips out. This is almost certainly the current production bug. Fix: replace with `unpdf` or use Claude's native PDF support. Phase 1.
2. **4096 max_tokens truncates JSON mid-response** -- Current output cap produces ~3000 words, grossly insufficient for comprehensive analysis. Truncated JSON causes `SyntaxError`. Fix: increase to 8192-16384 per pass, check `stop_reason`, use structured outputs. Phase 1.
3. **60-second Vercel timeout** -- Multi-pass analysis of long contracts takes 25-45 seconds. Current 60s limit plus cold start and network overhead leaves no margin. Fix: enable Fluid Compute (300s), update `maxDuration` in `vercel.json`. Phase 1.
4. **LLM hallucination of contract clauses** -- Research shows 17-33% hallucination rates in legal AI tools. Fix: Citations API for machine-verified quotes, prompt engineering for verbatim-only extraction, client-side quote verification. Phase 2.
5. **4.5MB Vercel request body limit** -- Base64 encoding inflates a 3MB PDF to ~4MB payload, near the 4.5MB limit. Fix: keep 3MB client limit for now, plan blob storage migration for larger files later. Phase 1 awareness, Phase 3+ fix.

## Implications for Roadmap

Based on the combined research, the roadmap should follow this phase structure. Each phase has clear dependencies and delivers independently valuable functionality.

### Phase 1: Fix Production Bugs and Stabilize Foundation
**Rationale:** Nothing else matters until the analysis pipeline actually works. Three independent bugs (pdf-parse, max_tokens, timeout) all prevent successful analysis of real contracts. These must be fixed together because they mask each other -- fixing one may reveal the next.
**Delivers:** A working analysis pipeline that can successfully analyze a 50+ page contract and return complete, valid JSON results.
**Addresses:** Fix analysis bug (P1), increase max_tokens, update Vercel timeout configuration, improve error messages.
**Avoids:** Pitfalls 1 (pdf-parse ENOENT), 2 (4096 truncation), 3 (4.5MB payload), 5 (60s timeout), 6 (scanned PDF detection).
**Stack changes:** Replace `pdf-parse` with `unpdf` (or Claude native PDF), increase `max_tokens` to 8192+, update `vercel.json` maxDuration to 300.

### Phase 2: Multi-Pass Analysis Pipeline (Server)
**Rationale:** The core architecture must exist before any feature enhancement. This phase builds the server-side pass orchestrator, prompt caching, SSE streaming, and the first 2-3 pass definitions. It replaces the single-call approach with the multi-pass pattern that every downstream feature depends on.
**Delivers:** Server-side multi-pass pipeline with SSE streaming. Legal Issues and Scope of Work passes producing detailed findings with exact clause quotes. Prompt caching reducing costs.
**Uses:** Claude Sonnet 4.6, native PDF support, Zod structured outputs, Citations API, prompt caching.
**Implements:** Pass Orchestrator, Pass Definitions (legal + scope), SSE Writer, Claude Client with caching.
**Avoids:** Pitfall 4 (hallucination) via Citations API for clause extraction.

### Phase 3: Progressive Client Rendering
**Rationale:** Depends on Phase 2 streaming output. The client must consume SSE events, display progressive results, and show analysis progress. This phase also extends the contract store and review page for multi-pass data.
**Delivers:** Progressive UI that shows findings as each pass completes, analysis progress indicator, extended contract store with per-pass status tracking.
**Implements:** Analysis Stream Hook, AnalysisProgress component, extended ContractReview page, extended useContractStore.

### Phase 4: Complete Analysis Passes
**Rationale:** With the pipeline infrastructure stable (Phase 2-3), add the remaining analysis passes. Each pass is independently valuable and can be built and tested in isolation.
**Delivers:** Full-spectrum contract analysis across all categories: compliance/insurance, financial terms/dates, questionable verbiage. Result merger with deduplication and weighted risk scoring.
**Addresses:** P1 features: enhanced risk categories, labor compliance checklist, insurance extraction, date/deadline extraction with notice periods, scope of work extraction.
**Implements:** Remaining pass definitions, Result Merger.

### Phase 5: Differentiating Features
**Rationale:** With comprehensive analysis working end-to-end, add the features that differentiate ClearContract from generic AI tools. These are the P2 features from FEATURES.md that make the tool specifically valuable for glazing subcontractors.
**Delivers:** Negotiation prep output, flow-down clause analysis, change order terms analysis, scope gap detection, section-by-section contract map.
**Addresses:** P2 features from FEATURES.md.

### Phase 6: Output and Polish
**Rationale:** PDF report export is the last feature because it packages all analysis outputs. This phase also addresses UX polish, data persistence, and hardening.
**Delivers:** PDF report export, localStorage/IndexedDB persistence, rate limiting, improved error handling.
**Addresses:** PDF report export (P2), data persistence UX pitfall, security hardening.

### Phase Ordering Rationale

- **Phase 1 before everything:** Three production bugs block all usage. No point building features on a broken foundation.
- **Phase 2 before Phase 3:** Server must stream before client can consume. The SSE protocol must be defined server-side first.
- **Phase 3 before Phase 4:** The progressive rendering must work with 2 passes before adding 3 more. Verifying the full loop with fewer passes reduces debugging complexity.
- **Phase 4 is the bulk of the feature work:** Each new pass is an isolated prompt + schema + parser. This is the most parallelizable phase.
- **Phase 5 builds on Phase 4:** Differentiators like scope gap detection require scope extraction (Phase 4) to exist first.
- **Phase 6 is last:** PDF export packages all outputs. Persistence and security are important but not blocking for a single-user tool.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** The Citations API + structured outputs incompatibility drives the pass design. Needs API-level validation of citation response formats and structured output schema design. Prompt engineering for legal clause extraction is nuanced.
- **Phase 4:** Each analysis pass requires domain-specific prompt engineering (e.g., indemnification types, prevailing wage requirements, glazing scope items). May need iteration with real contracts.
- **Phase 5:** Scope gap detection requires a reference checklist of standard glazing subcontract scope items. This is domain knowledge, not code -- needs input from the user or industry research.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Bug fixes with known solutions. pdf-parse replacement is well-documented. Vercel configuration changes are straightforward.
- **Phase 3:** SSE consumption and progressive React rendering are well-documented patterns. No novel architecture.
- **Phase 6:** PDF generation libraries (e.g., jsPDF, react-pdf) and localStorage persistence are standard implementations.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official Anthropic docs, npm, and GitHub. Citations API, structured outputs, prompt caching, and native PDF support are GA features with TypeScript SDK integration. |
| Features | MEDIUM-HIGH | Feature landscape well-established via construction industry sources, competitor analysis, and domain knowledge. Specific glazing subcontractor needs confirmed via industry publications. Some competitor pricing/feature details from marketing materials (lower confidence). |
| Architecture | HIGH | Multi-pass pattern validated via Anthropic's legal summarization guide. Vercel duration limits, streaming support, and request body limits verified via official docs. Prompt caching cost model calculated from published pricing. |
| Pitfalls | HIGH | Root cause of production bug (pdf-parse ENOENT) confirmed via multiple community sources and the official issue tracker. All Vercel limits verified against official documentation. LLM hallucination rates from Stanford research. |

**Overall confidence:** HIGH

### Gaps to Address

- **Vercel Fluid Compute actual behavior on Hobby plan:** Research says 300s with Fluid Compute, but this needs runtime verification. If Fluid Compute is not enabled by default on the user's account, the 60s limit still applies. Validate during Phase 1 deployment.
- **Claude native PDF token costs at scale:** The ~3000 tokens/page estimate for native PDF is from documentation but actual costs depend on PDF complexity (embedded images, tables, formatting). Run cost benchmarks with real glazing contracts during Phase 2.
- **Citations API response parsing:** The interleaved text/citation format needs real-world testing to ensure reliable parsing. Build integration tests early in Phase 2.
- **Real contract testing:** All analysis quality assumptions need validation against actual glazing subcontracts. The user should provide 3-5 real contracts for testing during Phase 2-4 development.
- **Prompt engineering iteration:** Legal analysis prompt quality is not something you get right on the first try. Budget time for prompt iteration in Phases 2 and 4. Expected: 3-5 iterations per pass before quality stabilizes.

## Sources

### Primary (HIGH confidence)
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) -- model specs, pricing, context windows
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- Zod integration, `output_config`, GA status
- [Anthropic Citations](https://platform.claude.com/docs/en/build-with-claude/citations) -- citations API, document types, incompatibility with structured outputs
- [Anthropic PDF Support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) -- native PDF, base64, file limits
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- cache_control, pricing, duration
- [Anthropic Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- 200K standard, 1M beta
- [Anthropic Legal Summarization Guide](https://platform.claude.com/docs/en/about-claude/use-case-guides/legal-summarization) -- meta-summarization, chunking
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) -- duration, body size, memory
- [Vercel Function Duration Configuration](https://vercel.com/docs/functions/configuring-functions/duration) -- Fluid Compute, max duration per plan
- [Vercel Streaming Functions](https://vercel.com/docs/functions/streaming/streaming-examples) -- SSE and Node.js streaming support
- [pdf-parse ENOENT Issue (GitLab #24)](https://gitlab.com/autokent/pdf-parse/-/issues/24) -- confirmed deployment bug
- [unpdf on GitHub](https://github.com/unjs/unpdf) -- serverless-optimized PDF text extraction
- [Stanford Legal RAG Hallucinations](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf) -- 17-33% hallucination rates

### Secondary (MEDIUM confidence)
- [Mastt - Top 5 AI Construction Contract Review Software](https://www.mastt.com/software/ai-construction-contract-review) -- competitor feature analysis
- [Document Crunch](https://www.documentcrunch.com/construction-contract-review) -- competitor features
- [Archdesk - Dangerous Construction Contract Clauses](https://archdesk.com/blog/construction-contract-risks-and-clauses) -- clause taxonomy
- [Long International - Problematic Contract Clauses](https://www.long-intl.com/blog/problematic-construction-contract-clauses/) -- industry risk areas
- [AIA - Top 5 Unfair Provisions](https://learn.aiacontracts.com/articles/6421989-top-5-unfair-provisions-in-construction-contracts/) -- authoritative industry source
- [ContractEval: Benchmarking LLMs for Legal Risk](https://arxiv.org/abs/2508.03080) -- LLM accuracy in contract analysis
- [Using pdf-parse on Vercel (DEV Community)](https://dev.to/chudi_nnorukam/serverless-pdf-processing-why-unpdf-beats-pdf-parse-2jji) -- migration guide

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
