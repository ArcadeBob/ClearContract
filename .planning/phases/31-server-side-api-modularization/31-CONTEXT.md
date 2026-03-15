# Phase 31: Server-side API Modularization - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose the 1,478-line `api/analyze.ts` monolith by extracting the 16 analysis pass definitions into a separate `api/passes.ts` module, while preserving the Vercel serverless entry-point contract (`export const config` and default handler export). `merge.ts` stays unchanged. No new user-facing features, no behavior changes.

</domain>

<decisions>
## Implementation Decisions

### Pass definitions organization
- Extract all 16 pass definitions to a single `api/passes.ts` file
- Prompts stay inline as template literals in pass objects (no separate prompts file)
- Schemas remain in `src/schemas/` (legalAnalysis.ts, scopeComplianceAnalysis.ts, analysis.ts, synthesisAnalysis.ts) — passes.ts imports them
- passes.ts exports the typed pass array and the `AnalysisPass` interface
- The `zodToOutputFormat` helper stays in analyze.ts (used by pass definitions but also by runSynthesisPass)

### Module directory structure
- Flat structure in `api/` — no subdirectories
- passes.ts sits alongside analyze.ts, merge.ts, pdf.ts, scoring.ts
- No api/lib/ or api/passes/ directories

### merge.ts decomposition
- Keep merge.ts as-is at 554 lines — converters, dispatch map, and dedup are tightly coupled
- Phase 30 already cleaned up type casts; no further decomposition needed
- DECOMP-05 is satisfied by the Phase 30 type guard refactoring (merge.ts is already well-structured)

### Handler orchestration
- analyze.ts keeps: `export const config`, CompanyProfileSchema, AnalyzeRequestSchema, sanitizeFileName, constants (BETAS, MODEL, MAX_TOKENS), PASSES_RECEIVING_PROFILE, zodToOutputFormat, runAnalysisPass, runSynthesisPass, and the handler
- Target ~490 lines after pass extraction (down from 1,478)
- runAnalysisPass/runSynthesisPass stay in analyze.ts — they share the Anthropic client and constants with the handler

### Claude's Discretion
- Exact import structure in passes.ts (how to handle zodToOutputFormat dependency)
- Whether to re-export AnalysisPass type from passes.ts or keep it in analyze.ts
- Any minor interface adjustments needed for the extraction

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Project-level
- `.planning/REQUIREMENTS.md` — DECOMP-04 and DECOMP-05 requirements for this phase
- `.planning/ROADMAP.md` §Phase 31 — success criteria (analyze.ts under 200 lines target is aspirational; ~490 is the realistic outcome given decisions to keep handler logic in-file)

### Prior phase context
- `.planning/phases/30-type-safety-hardening/30-CONTEXT.md` — Zod-as-source-of-truth decision that applies to pass schemas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/pdf.ts` and `api/scoring.ts` — already-extracted modules, proving the flat-file pattern works
- `src/schemas/legalAnalysis.ts`, `src/schemas/scopeComplianceAnalysis.ts`, `src/schemas/analysis.ts`, `src/schemas/synthesisAnalysis.ts` — all pass output schemas already live outside analyze.ts

### Established Patterns
- Flat `api/` sibling files with explicit imports between them
- Pass definitions use an `AnalysisPass` interface with name, systemPrompt, userPrompt, outputSchema, and boolean flags (isOverview, isLegal, isScope)
- `zodToOutputFormat()` converts Zod schemas to Anthropic structured output format

### Integration Points
- `analyze.ts` handler imports pass array from `passes.ts` and iterates over it
- `merge.ts` imports are unchanged — it already imports from `../src/schemas/`
- Vercel bundles all imported files into the serverless function — flat structure ensures no resolution issues

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward extraction of pass definitions to their own file.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-server-side-api-modularization*
*Context gathered: 2026-03-15*
