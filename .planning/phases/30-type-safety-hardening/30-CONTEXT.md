# Phase 30: Type Safety Hardening - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Zod schemas and TypeScript interfaces agree on field optionality, API responses are validated on the client, and merge.ts uses type guards instead of assertion casts. No new user-facing features. Requirements: TYPE-01, TYPE-02, TYPE-03.

</domain>

<decisions>
## Implementation Decisions

### Optionality reconciliation direction
- Zod schemas are the source of truth — TS interfaces are updated to match what the API actually produces
- Context-dependent fields (legalMeta, scopeMeta, isSynthesis, downgradedFrom) stay optional in both Zod and TS — they only appear on specific pass types
- User-added fields (resolved, note) get defaults on creation in merge.ts: resolved: false, note: ''
- These become required in the TS Finding interface — eliminates nullish coalescing throughout the UI
- Canonical Finding schema lives in `src/schemas/finding.ts` — TS Finding type inferred via z.infer
- Pass-level schemas (analysis.ts, legalAnalysis.ts) stay separate — they define per-pass API output, not the merged result

### Client validation behavior
- Full response-level AnalysisResultSchema in src/schemas/ validates the entire API response (client, contractType, riskScore, findings[], dates[], passResults[])
- Finding schema composed inside AnalysisResultSchema — one safeParse() call validates everything
- Hard fail on validation error — throws error that becomes a Critical finding in the UI (same path as HTTP errors)
- Generic user message: "Analysis returned invalid data. Please try again." — Zod issues logged to console.error for debugging
- AnalysisResult type inferred from Zod schema (z.infer) — delete the manual interface in analyzeContract.ts

### Migration strategy
- Lazy migration on load — contractStorage.ts fills missing fields with safe defaults when contracts are read from localStorage
- Patch known fields approach — simple function checks for undefined fields and fills defaults (resolved: false, note: '', etc.)
- Write migrated contracts back to localStorage immediately after patching — only migrated once
- Add schemaVersion number to localStorage data — migration function checks version and only runs patches for versions behind current
- Matches Phase 27 decision: migration logic lives in contractStorage.ts

### Type guard approach for merge.ts
- Parse pass results through their Zod schemas first (legalAnalysis.ts, scopeComplianceAnalysis.ts, etc.)
- Converter functions receive properly-typed z.infer data instead of Record<string, unknown>
- Discriminated narrowing via clauseType/passType switch — assertion casts disappear naturally because fields are already typed
- If a pass result fails Zod parsing: skip the malformed result, log console.error, continue with other passes
- Import pass-level schemas directly from each schema file (no barrel) — merge.ts knows which passes it's converting

### Claude's Discretion
- Exact field-by-field optionality audit results (which optional fields become required)
- AnalysisResultSchema composition details (how Finding/ContractDate/BidSignal schemas are nested)
- Schema version numbering scheme (starting number, increment strategy)
- Migration function internals (field default values, version check logic)
- How to restructure merge.ts converter function signatures to accept Zod-inferred types

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas/legalAnalysis.ts`: Zod schema for legal pass results — merge.ts will import and parse against this
- `src/schemas/scopeComplianceAnalysis.ts`: Zod schema for scope/compliance pass results — same pattern
- `src/schemas/analysis.ts`: Base analysis schema — reference for field definitions
- `src/schemas/synthesisAnalysis.ts`: Synthesis pass schema — needs same treatment
- `src/storage/contractStorage.ts`: Existing migration logic and storage layer — lazy migration added here
- `src/types/contract.ts`: Finding interface (9 optional fields), LegalMeta/ScopeMeta discriminated unions

### Established Patterns
- Zod v3 with `zod-to-json-schema` for structured validation (established in API pipeline)
- Pass-level schemas are self-contained with local enums (avoid cross-dependency)
- `z.infer<typeof Schema>` for type inference from Zod (used in existing schema files)
- Discriminated union dispatch via Record map (established in Phase 29 for LegalMetaBadge/ScopeMetaBadge)
- Error handling: console.error for debugging, user-facing errors thrown as `new Error(message)`

### Integration Points
- `src/api/analyzeContract.ts` line 77: `return response.json()` — add safeParse before return
- `api/merge.ts`: ~50 `as string` / `as string[]` casts across converter functions — all replaced by Zod-parsed inputs
- `src/storage/contractStorage.ts`: Migration function added to load path
- `src/types/contract.ts`: Finding interface updated — all consumers get type changes automatically
- All Finding consumers that use `finding.resolved ?? false` or `finding.note ?? ''` — simplify to direct access

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user selected recommended options throughout. All decisions follow the principle: Zod is the single source of truth, types are inferred, and existing patterns (discriminated unions, lazy migration) are extended rather than replaced.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-type-safety-hardening*
*Context gathered: 2026-03-15*
