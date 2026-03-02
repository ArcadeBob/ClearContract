# Pitfalls Research

**Domain:** AI-powered contract/document analysis (LLM pipeline on Vercel serverless)
**Researched:** 2026-03-02
**Confidence:** HIGH (verified against official docs, known issues, and current codebase)

## Critical Pitfalls

### Pitfall 1: pdf-parse Breaks on Vercel Deployment (ENOENT test file error)

**What goes wrong:**
The `pdf-parse` package crashes on Vercel with `ENOENT: no such file or directory, open './test/data/05-versions-space.pdf'`. The app works perfectly locally but fails in production. This is a known, widely-reported issue that has existed for years.

**Why it happens:**
`pdf-parse` checks `!module.parent` to determine if it is running in "debug mode." In Vercel's serverless bundling environment, this check evaluates incorrectly, causing it to look for a test PDF file (`test/data/05-versions-space.pdf`) that Vercel's optimized deployment strips out. The package assumes test files exist in production -- a fundamental design flaw.

**How to avoid:**
Two proven fixes exist. Use one:
1. **Import bypass:** Import directly from the compiled path: `import pdf from 'pdf-parse/lib/pdf-parse.js'` -- this skips the problematic `index.js` entirely.
2. **Replace pdf-parse entirely:** Switch to `unpdf`, which has zero native dependencies and is designed for serverless. This is the recommended long-term fix since pdf-parse also has canvas dependency issues.

**Warning signs:**
- Analysis works locally but returns generic 500 errors on Vercel deployment.
- Error logs show `ENOENT` referencing `05-versions-space.pdf`.
- This is very likely the current "generic error" bug reported in PROJECT.md.

**Phase to address:**
Phase 1 (Bug Fix) -- this is almost certainly the root cause of the current broken analysis pipeline. Fix immediately.

---

### Pitfall 2: 4096 max_tokens Output Cap Truncates Complex Contract Analysis

**What goes wrong:**
The current code sets `max_tokens: 4096` for Claude's response. For a comprehensive analysis of a 50-100+ page glazing contract (with exact clause quotes, multiple findings across 9 categories, dates, and recommendations), 4096 tokens produces roughly 3,000 words of JSON. This is grossly insufficient. The response gets truncated mid-JSON, causing `JSON.parse()` to throw a `SyntaxError`. The catch block returns the unhelpful "Failed to parse AI response. Please try again."

**Why it happens:**
Developers set conservative `max_tokens` values during initial development with short test documents. When real contracts are analyzed, the model needs far more output space to produce detailed findings with clause quotes. The `stop_reason: "max_tokens"` is never checked, so truncation is indistinguishable from other failures.

**How to avoid:**
1. **Increase max_tokens to 8192-16384** for comprehensive analysis. Claude Sonnet 4 supports up to 8192 output tokens by default (16384 with extended thinking). Budget generously.
2. **Always check `stop_reason`:** If `response.stop_reason === "max_tokens"`, the JSON is incomplete. Either retry with higher limits or implement continuation logic.
3. **Use structured outputs** (`output_config.format` with `json_schema`) -- now generally available on Claude Sonnet 4.5+. This guarantees valid JSON and prevents malformed output even if truncated.
4. **For multi-section analysis,** consider splitting into multiple API calls (one per analysis category) to keep each response focused and within token limits.

**Warning signs:**
- "Failed to parse AI response" errors that happen inconsistently (short contracts work, long ones fail).
- Analysis results that seem shallow or missing categories.
- `SyntaxError` in server logs from `JSON.parse()`.

**Phase to address:**
Phase 1 (Bug Fix) -- increase max_tokens and add stop_reason checking. Phase 2 (Enhanced Analysis) -- implement structured outputs and multi-call strategy.

---

### Pitfall 3: Vercel 4.5MB Request Body Limit vs Base64-Encoded PDFs

**What goes wrong:**
Vercel serverless functions have a hard **4.5MB request body limit**. The current app allows 3MB PDF uploads, but base64 encoding inflates file size by ~33%, turning a 3MB PDF into a ~4MB JSON payload (with the `pdfBase64` field plus `fileName` and JSON overhead). A 3.4MB+ PDF will hit `413: FUNCTION_PAYLOAD_TOO_LARGE` in production, even though the client-side 3MB check passes.

**Why it happens:**
The 3MB client-side limit was set without accounting for base64 encoding overhead. The JSON wrapper adds further bytes. Developers test with small PDFs and never hit the wall, but real glazing contracts (100+ pages with embedded images) routinely exceed this.

**How to avoid:**
1. **Short term:** Reduce the client-side limit to 3MB and verify the base64-encoded payload stays under 4.5MB. A safe max is ~3.2MB raw PDF (3.2 * 1.33 = ~4.26MB payload).
2. **Long term:** Upload PDFs directly to a blob store (Vercel Blob, S3) and pass only the URL to the serverless function. This eliminates the body size constraint entirely.
3. **Consider compression:** If sticking with base64, strip unnecessary whitespace from the JSON payload.

**Warning signs:**
- Uploads of larger contracts fail silently or with a vague network error.
- HTTP 413 errors in Vercel function logs.
- Users report "it works with short contracts but not long ones."

**Phase to address:**
Phase 1 (Bug Fix) -- tighten client-side limit. Phase 3+ -- implement blob storage upload pattern.

---

### Pitfall 4: LLM Hallucination of Contract Clauses That Do Not Exist

**What goes wrong:**
The LLM fabricates clause references, invents contract language that does not appear in the source document, or misattributes text from one section to another. In a legal/contract context, a hallucinated indemnification clause or fabricated dollar amount could lead the user to negotiate based on phantom provisions. Research shows legal AI tools hallucinate 17-33% of responses in some benchmarks (Stanford study on Lexis+ AI and Westlaw AI).

**Why it happens:**
LLMs are trained on vast legal corpora and will pattern-match "typical" contract language when the actual text is ambiguous, truncated, or poorly extracted. When asked to quote exact clauses, the model may reconstruct plausible-sounding text rather than extracting verbatim. This is worse when input text is truncated (the current 100k char limit cuts off content) or when PDF extraction produces garbled text.

**How to avoid:**
1. **Instruct the prompt to quote verbatim only:** Add explicit instructions like "Only quote text that appears exactly in the provided document. If you cannot find the exact language, state that the clause could not be located verbatim."
2. **Include source validation in the schema:** Add a `verbatimQuote` field alongside the `description` field so the model separates its analysis from the quoted text. Then implement client-side verification that the `verbatimQuote` actually appears in the extracted text.
3. **Never truncate without warning:** If the document is truncated at 100k chars, tell the user and the model. The prompt should include: "The following text may be truncated. Do not speculate about content beyond what is provided."
4. **Use longer context windows:** Claude Sonnet 4's 200k token context window can handle far more than 100k characters. Increase the limit to avoid truncation.

**Warning signs:**
- Clause references that do not correspond to any section in the original PDF.
- Findings with suspiciously "perfect" legal language that the user cannot locate in the contract.
- Multiple findings referencing sections near the end of a truncated document.

**Phase to address:**
Phase 2 (Enhanced Analysis) -- prompt engineering for verbatim quoting. Phase 3 -- client-side quote verification against extracted text.

---

### Pitfall 5: 60-Second Vercel Timeout vs Claude API Response Time for Long Contracts

**What goes wrong:**
The current `vercel.json` sets `maxDuration: 60` for the analyze function. For a 100+ page contract, the Claude API call alone can take 30-60+ seconds (especially with high output token counts). Add PDF parsing time, cold start latency (800ms-2.5s), and network overhead, and the function frequently times out with a `504 FUNCTION_INVOCATION_TIMEOUT` error.

**Why it happens:**
Claude's response time scales with both input length and output token count. A comprehensive analysis of a long contract with 20+ findings and clause quotes can take 45-90 seconds of inference time. The 60-second limit was set without benchmarking real-world contract analysis.

**How to avoid:**
1. **Enable Fluid Compute:** With Fluid Compute enabled, even the Hobby plan gets 300s (5 min) max duration. This is the easiest fix.
2. **Use streaming:** Switch from `client.messages.create()` to `client.messages.stream()`. Streaming keeps the connection alive and prevents proxy timeouts. The client receives incremental data, improving perceived performance.
3. **Split analysis into multiple smaller calls:** Instead of one massive analysis, make parallel calls for each analysis category (legal issues, scope, dates, etc.). Each call is faster and less likely to timeout.
4. **Increase maxDuration:** On Pro plan, this can be set up to 800 seconds with Fluid Compute.

**Warning signs:**
- Analysis succeeds for short contracts but fails for long ones.
- 504 errors in Vercel logs.
- Users see "An error occurred during analysis" after waiting exactly 60 seconds.

**Phase to address:**
Phase 1 (Bug Fix) -- enable Fluid Compute or increase maxDuration. Phase 2 (Enhanced Analysis) -- implement streaming and/or multi-call architecture.

---

### Pitfall 6: Scanned/Image-Based PDFs Produce Zero Extractable Text

**What goes wrong:**
The current code checks for `text.length < 100` and returns a 422 error for image-based PDFs. But many real-world contracts are partially scanned -- some pages are text-based, others are image-based (amendments, signed pages, exhibits). The extracted text may pass the 100-char threshold but miss critical sections.

**Why it happens:**
`pdf-parse` (and `unpdf`) can only extract text from text-layer PDFs. Scanned pages, signed pages, or exhibits that were photocopied produce no text. The 100-char threshold is a blunt instrument -- a 50-page contract where 5 pages are text and 45 are scanned will produce some text but miss almost everything.

**How to avoid:**
1. **Report extraction quality:** Calculate the ratio of extracted text length to page count. If a 50-page PDF yields only 2,000 characters, flag it as likely partially scanned.
2. **Warn the user, do not silently proceed:** "We extracted text from X of Y pages. Some pages appear to be scanned images. Analysis may be incomplete."
3. **Future: Add OCR capability:** Integrate Tesseract.js or a cloud OCR service for scanned pages. This is complex and should be a later phase.
4. **Accept the limitation for now:** Most modern contracts are digitally generated (text-layer PDFs). State the limitation clearly in the UI.

**Warning signs:**
- Analysis results that seem to miss entire sections of a contract.
- Very short extracted text relative to the PDF page count.
- Users uploading contracts that were "printed and scanned back."

**Phase to address:**
Phase 1 -- improve detection and user messaging. Phase 4+ -- OCR integration.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single API call for all analysis | Simpler code, one request/response | Cannot handle long contracts, truncation, shallow analysis | Never for production with 100+ page contracts |
| In-memory state only (no persistence) | Fast MVP, no database needed | User loses all analysis on page refresh; cannot build history | MVP only -- add persistence before real usage |
| Hardcoded model name (`claude-sonnet-4-20250514`) | Works now | Model deprecation breaks the app without warning | Acceptable if checked quarterly; better to use latest alias |
| base64 in request body | Simple file transfer | Hits 4.5MB limit, wastes bandwidth, doubles memory usage | Acceptable for small PDFs (<2MB); replace for larger files |
| Raw JSON.parse on LLM output | Works most of the time | Breaks on truncated responses, markdown fences, extra text | Never -- always use structured outputs or robust parsing |
| No retry logic on API failures | Simpler error handling | Transient errors (rate limits, network) fail permanently | Never -- at minimum retry once on 429/500 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Anthropic SDK | Setting max_tokens too low and not checking stop_reason | Set generous max_tokens (8192+), always check `response.stop_reason`, handle `"max_tokens"` as incomplete |
| Anthropic SDK | Requesting JSON via system prompt without enforcement | Use `output_config.format` with `json_schema` for guaranteed schema compliance (structured outputs) |
| Anthropic SDK | Not handling rate limits (429) with exponential backoff | Implement retry with exponential backoff: wait 1s, 2s, 4s. The SDK has built-in retry support -- enable it |
| pdf-parse on Vercel | Using default import which triggers test-file lookup | Import from `pdf-parse/lib/pdf-parse.js` or switch to `unpdf` |
| Vercel Functions | Sending large payloads in request body | Upload files to blob storage, pass URL to function |
| Vercel Functions | Assuming 60s is enough for AI API calls | Enable Fluid Compute (300s default), use streaming for real-time feedback |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending entire PDF as base64 in JSON body | Slow uploads, 413 errors on large files | Use blob storage or multipart upload | PDFs > 3.2MB (after base64 = 4.26MB, near 4.5MB limit) |
| Single synchronous Claude API call for full analysis | 30-90s blocking request, timeout on long contracts | Stream responses or split into parallel calls per category | Contracts > 30 pages with comprehensive analysis |
| Truncating contract text to 100k chars | Missing critical clauses in long contracts | Use Claude's full 200k token context (or 1M with beta header) | Contracts > ~25,000 words (roughly 50+ pages) |
| Creating new Anthropic client on every request | Cold start overhead, connection setup time | Initialize client outside handler (module-level) for connection reuse | Every cold start adds 200-500ms |
| No caching of analysis results | Re-analyzing the same PDF costs money and time | Store results by PDF hash; check before re-analyzing | Costs scale linearly with usage; $3-15 per analysis |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting LLM-generated clause quotes without verification | User acts on fabricated contract language in negotiations | Add verbatim quote verification against source text |
| No rate limiting on the /api/analyze endpoint | Cost attack -- someone floods the endpoint and racks up Claude API bills | Add per-IP rate limiting, require API key or session token |
| Logging full contract text in error handlers | PII/confidential contract data in Vercel logs | Log only error types and metadata, never document content |
| Storing PDF content in client-side state | Sensitive contract data accessible via browser devtools | Clear base64 data from state after upload completes |
| No input sanitization on PDF text before sending to Claude | Prompt injection via malicious PDF content | Sanitize extracted text; use system prompt to anchor behavior |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "An error occurred during analysis" with no detail | User has no idea what went wrong or how to fix it | Show specific error: "PDF appears to be scanned," "Contract too large," "AI service busy -- retry in 30s" |
| No progress indication during 30-60s analysis | User thinks the app is frozen, refreshes, loses state | Show streaming progress: "Extracting text... Analyzing legal issues... Reviewing scope..." |
| Analysis succeeds but silently truncated (incomplete findings) | User misses critical contract risks they relied on the tool to catch | Check stop_reason, warn user if analysis may be incomplete, show confidence indicator |
| All findings shown at once without hierarchy | User overwhelmed by 20+ findings, misses the critical ones | Group by severity, show Critical/High first, collapse Low/Info by default |
| No way to verify AI findings against source text | User cannot trust findings without manual PDF review | Link findings to page numbers or quote exact contract text with highlights |
| Losing all data on page refresh | User loses analysis they spent time reviewing | Add localStorage persistence at minimum; IndexedDB for full contracts |

## "Looks Done But Isn't" Checklist

- [ ] **PDF upload:** Works with simple PDFs but fails with scanned, encrypted, password-protected, or form-filled PDFs -- test with real glazing contracts
- [ ] **Analysis output:** Returns findings but never verified that clause quotes actually appear in the source document -- add quote verification
- [ ] **Error handling:** Catches errors but all return the same generic message -- differentiate timeout, truncation, parsing, rate limit, and extraction errors
- [ ] **Token limits:** Set max_tokens but never checked if response was truncated -- always inspect stop_reason
- [ ] **File size:** Client validates 3MB but base64 encoding pushes actual payload past Vercel's 4.5MB limit -- test with 3MB PDFs
- [ ] **Timeout:** Set 60s maxDuration but Claude API + PDF parsing + cold start regularly exceeds this -- test with long contracts end-to-end
- [ ] **JSON parsing:** Handles markdown code fences but not partial JSON, extra whitespace, or BOM characters -- use structured outputs instead
- [ ] **Long contracts:** Truncates to 100k chars but never tells the user or model that content was lost -- add truncation warnings

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| pdf-parse ENOENT on Vercel | LOW | Change import path or switch to unpdf; redeploy |
| Truncated JSON from max_tokens | LOW | Increase max_tokens, add stop_reason check; redeploy |
| 4.5MB payload limit hit | MEDIUM | Reduce client-side file limit immediately; plan blob storage migration |
| Hallucinated clause quotes | MEDIUM | Update prompt to require verbatim-only quoting; add post-analysis verification |
| 60-second timeout failures | LOW | Enable Fluid Compute in Vercel dashboard or increase maxDuration; redeploy |
| Scanned PDF silent failure | LOW | Improve text extraction validation and user messaging; no code rewrite needed |
| Lost analysis data on refresh | MEDIUM | Add localStorage persistence layer to useContractStore; involves state refactor |
| No retry on transient API errors | LOW | Enable Anthropic SDK built-in retries or add manual retry with backoff |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| pdf-parse ENOENT deployment crash | Phase 1 (Bug Fix) | Deploy to Vercel, upload a PDF, confirm analysis completes |
| 4096 max_tokens truncation | Phase 1 (Bug Fix) | Analyze a 50+ page contract, verify complete JSON response |
| 4.5MB payload limit | Phase 1 (Bug Fix) | Upload a 3MB PDF, confirm no 413 error |
| 60-second timeout | Phase 1 (Bug Fix) | Analyze a 100-page contract, confirm no 504 error |
| Generic error messages | Phase 1 (Bug Fix) | Trigger each error type, verify user sees specific messages |
| Hallucinated clause quotes | Phase 2 (Enhanced Analysis) | Compare 10 findings' clauseReference to actual PDF text |
| Scanned PDF detection | Phase 2 (Enhanced Analysis) | Upload a partially-scanned PDF, verify warning shown |
| No progress indication | Phase 2 (Enhanced Analysis) | Start analysis, verify streaming progress UI updates |
| Data loss on refresh | Phase 3 (Persistence) | Analyze contract, refresh page, verify data survives |
| No rate limiting | Phase 3 (Hardening) | Verify endpoint rejects excessive requests from same IP |
| Prompt injection via PDF content | Phase 3 (Hardening) | Test with adversarial PDF content, verify analysis unaffected |
| No analysis caching | Phase 4 (Optimization) | Re-upload same PDF, verify cached result returned |

## Sources

- [Using pdf-parse on Vercel Is Wrong -- Here's What Actually Works (DEV Community)](https://dev.to/chudi_nnorukam/serverless-pdf-processing-why-unpdf-beats-pdf-parse-2jji) -- MEDIUM confidence, community article verified against GitLab issue
- [ENOENT test data issue -- pdf-parse GitLab #24](https://gitlab.com/autokent/pdf-parse/-/issues/24) -- HIGH confidence, official issue tracker
- [How to get pdf-parse to work on Vercel deployments (GitHub Discussion #5278)](https://github.com/vercel/community/discussions/5278) -- HIGH confidence, Vercel community with verified solutions
- [Vercel Functions Limits (Official)](https://vercel.com/docs/functions/limitations) -- HIGH confidence, official documentation: 4.5MB body limit, 300s max duration with Fluid Compute
- [Structured Outputs -- Claude API Docs (Official)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- HIGH confidence, official Anthropic documentation
- [Handling Stop Reasons -- Claude API Docs (Official)](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) -- HIGH confidence, official documentation for max_tokens handling
- [ContractEval: Benchmarking LLMs for Clause-Level Legal Risk Identification](https://arxiv.org/abs/2508.03080) -- MEDIUM confidence, peer-reviewed research on LLM legal analysis accuracy
- [Legal RAG Hallucinations (Stanford)](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf) -- HIGH confidence, Stanford research showing 17-33% hallucination rates in legal AI tools
- [Context Windows -- Claude API Docs (Official)](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- HIGH confidence, official documentation for 200k/1M token limits
- [Vercel Timeout KB (Official)](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) -- HIGH confidence, official knowledge base

---
*Pitfalls research for: AI-powered glazing contract analysis (ClearContract)*
*Researched: 2026-03-02*
