---
phase: 01-pipeline-foundation
plan: 02
subsystem: infra
tags: [anthropic-files-api, multi-pass, structured-outputs, unpdf, zod-to-json-schema, serverless]

# Dependency graph
requires:
  - phase: 01-pipeline-foundation
    provides: Zod schemas (PassResultSchema, FindingSchema, ContractDateSchema, MergedAnalysisResultSchema) from Plan 01
provides:
  - Rewritten serverless endpoint with Files API upload-once/analyze-many pattern
  - 3 parallel analysis passes (risk-overview, dates-deadlines, scope-financial) with structured outputs
  - Deterministic risk score computation from findings severity weights
  - Native PDF upload with unpdf text extraction fallback for large/scanned PDFs
  - Partial failure handling via Promise.allSettled
  - RiskOverviewResultSchema for client/contractType extraction
affects: [01-03-PLAN, phase-02, phase-03, phase-04]

# Tech tracking
tech-stack:
  added: [zod-to-json-schema]
  patterns: [Files API upload-once/analyze-many, multi-pass parallel analysis, structured outputs via JSON Schema, deterministic scoring, graceful degradation]

key-files:
  created: []
  modified: [api/analyze.ts, vercel.json, src/schemas/analysis.ts, package.json]

key-decisions:
  - "Used zod-to-json-schema instead of zodOutputFormat because SDK helper requires Zod v4 (z.toJSONSchema) but project uses Zod v3"
  - "RiskOverviewResultSchema added to src/schemas/analysis.ts extending PassResultSchema with client and contractType fields (Option A from plan)"
  - "Document content block cast to unknown for type compatibility with beta SDK types that may not include document type definitions"
  - "10MB file size limit enforced server-side (Vercel 4.5MB body limit is the practical constraint via base64)"

patterns-established:
  - "Multi-pass pattern: Define passes as data (name, prompts, isOverview flag), execute all in parallel, merge results"
  - "Structured outputs with Zod v3: Convert via zod-to-json-schema, strip $schema key, wrap in { type: 'json_schema', schema } envelope"
  - "Graceful degradation: Try native PDF upload first, fall back to text extraction on failure or large PDFs"
  - "Finding deduplication: When same finding title appears in multiple passes, keep the one with higher severity"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 1 Plan 02: Pipeline Rewrite Summary

**Rewrote serverless analysis endpoint with Anthropic Files API upload-once/analyze-many pattern, 3 parallel focused analysis passes with structured JSON Schema outputs, and deterministic risk scoring**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T14:34:56Z
- **Completed:** 2026-03-03T14:41:06Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Completely rewrote api/analyze.ts replacing single pdf-parse call with Files API multi-pass pipeline
- Implemented 3 focused parallel analysis passes: risk-overview (client identification + top risks), dates-deadlines (time-sensitive terms), scope-financial (scope gaps + financial terms)
- Added structured outputs using JSON Schema (via zod-to-json-schema for Zod v3 compatibility) guaranteeing valid typed responses
- Built deterministic risk score computation from severity weights (Critical=25, High=15, Medium=8, Low=3, Info=0)
- Added graceful fallback: native PDF upload for normal files, unpdf text extraction for 100+ page PDFs or upload failures
- Partial results returned when some passes fail via Promise.allSettled
- Increased Vercel function timeout from 60s to 120s for multi-pass execution headroom

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite api/analyze.ts with Files API, multi-pass, and structured outputs** - `227b86d` (feat)
2. **Task 2: Update vercel.json for increased timeout and body size** - `cc253fd` (chore)

## Files Created/Modified
- `api/analyze.ts` - Completely rewritten serverless endpoint: Files API upload, 3 parallel passes, structured outputs, deterministic scoring, partial failure handling, file cleanup
- `src/schemas/analysis.ts` - Added RiskOverviewResultSchema extending PassResultSchema with client and contractType fields
- `vercel.json` - Increased maxDuration from 60 to 120 seconds
- `package.json` - Added zod-to-json-schema dependency
- `package-lock.json` - Updated lockfile

## Decisions Made
- Used zod-to-json-schema package instead of SDK's zodOutputFormat helper because the helper requires z.toJSONSchema() from Zod v4, but the project uses Zod v3. This is a lightweight bridge that produces identical JSON Schema output.
- Added RiskOverviewResultSchema to src/schemas/analysis.ts (Option A from plan) rather than inline, keeping all schemas centralized.
- Used type assertion (`as unknown as BetaContentBlockParam`) for document content block because the beta SDK types may not include the document type definition for file references.
- Enforced 10MB server-side file size limit per plan's approved scope deviation (25MB deferred due to Vercel 4.5MB body limit).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] zodOutputFormat incompatible with Zod v3**
- **Found during:** Task 1 (analysis pass implementation)
- **Issue:** The plan specified using `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`, but this helper calls `z.toJSONSchema()` which only exists in Zod v4+. Project uses Zod v3.
- **Fix:** Installed `zod-to-json-schema` package and created a `zodToOutputFormat()` wrapper that converts Zod v3 schemas to the JSON Schema format expected by Anthropic's `output_config.format` parameter.
- **Files modified:** api/analyze.ts, package.json, package-lock.json
- **Verification:** TypeScript compiles, JSON Schema output matches expected format
- **Committed in:** 227b86d (Task 1 commit)

**2. [Rule 3 - Blocking] FileUploadParams does not accept `purpose` parameter**
- **Found during:** Task 1 (PDF preparation function)
- **Issue:** Plan specified `purpose: 'vision'` in file upload params, but the SDK v0.78.0 FileUploadParams type only accepts `file` and `betas`.
- **Fix:** Removed `purpose` parameter from both file upload calls. The Files API beta does not require it.
- **Files modified:** api/analyze.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 227b86d (Task 1 commit)

**3. [Rule 3 - Blocking] beta.messages.create return type ambiguity**
- **Found during:** Task 1 (run analysis pass function)
- **Issue:** Without `stream: false`, the `create` method overload returns `Stream | BetaMessage`, making `response.content` inaccessible.
- **Fix:** Added explicit `stream: false` to the create params so TypeScript resolves to the non-streaming overload returning `BetaMessage`.
- **Files modified:** api/analyze.ts
- **Verification:** TypeScript compiles, content extraction works with proper type narrowing
- **Committed in:** 227b86d (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking issues)
**Impact on plan:** All auto-fixes were necessary to resolve SDK API compatibility issues. The zod-to-json-schema bridge produces identical output to zodOutputFormat. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors (unused imports, TS6133/TS6192) in unrelated UI components remain. These are out of scope for this plan. The api/analyze.ts file compiles cleanly with zero errors.
- The main tsconfig.json only includes `src/` directory, so api/analyze.ts was verified with direct tsc invocation using appropriate flags.

## User Setup Required

None - no new environment variables or external service configuration required. The existing ANTHROPIC_API_KEY is sufficient.

## Next Phase Readiness
- Pipeline endpoint is ready for Plan 03 (client-side integration) to consume the new response shape including passResults
- The structured output format guarantees the client will always receive valid typed JSON
- Future phases can add more analysis passes by simply appending to the ANALYSIS_PASSES array
- Risk scoring weights can be tuned in Phase 2-4 as domain expertise grows

---
*Phase: 01-pipeline-foundation*
*Completed: 2026-03-03*
