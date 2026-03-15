# Phase 27: Foundation Utilities - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Shared utility primitives that later phases depend on — storage manager, error handling, severity palette, and POST body validation. No new user-facing features. All refactoring uses existing stack (no new runtime dependencies).

</domain>

<decisions>
## Implementation Decisions

### Severity palette scope
- One palette file exports both severity-to-Tailwind mappings AND risk-score-to-color mappings
- Severity uses single class string per level (e.g., `'bg-red-100 text-red-700 border-red-200'`), not structured objects
- Risk score color uses text-only classes with existing thresholds (70/40 breakpoints)
- Preserve current color differences between contexts (text-red-600 for score display, bg-red-100 text-red-700 for badge)
- Status badge colors (Reviewed/Analyzing) and date urgency colors stay inline — not in scope
- File location: `src/utils/palette.ts`
- Must use complete Tailwind class strings (not fragments) to survive JIT purge

### Storage manager API design
- Typed key registry: all valid keys defined as a union type mapping key → value type
- Generic `load<K>()` and `save<K>()` methods with type inference from registry
- Returns typed Result objects (`{ ok, data, error, quotaExceeded }`) — callers decide whether to toast, log, or ignore
- No UI dependencies in the manager itself — pure utility
- File location: `src/storage/storageManager.ts`
- Migration logic stays in `contractStorage.ts` (contract-specific business logic, not generic storage concern)
- `contractStorage.ts` becomes a thin layer that uses the storage manager for reads/writes but owns migration

### Error utility boundaries
- Classify + format only — no recovery strategies (retry, rollback stay in callers)
- Exports `classifyError(err)` returning `{ type, userMessage, retryable, originalError }`
- Error types: `'network' | 'api' | 'validation' | 'storage' | 'timeout' | 'unknown'`
- Shared across client AND server — both sides import from same utility
- Also exports standardized `ApiErrorResponse` type for end-to-end typing: `{ error, type, retryable, details? }`
- Server uses `formatApiError()` for response shaping, client uses type for parsing
- File location: `src/utils/errors.ts`

### Claude's Discretion
- POST body validation: Zod schema design for /api/analyze request body (pdfBase64, fileName, companyProfile)
- Exact storage manager implementation details (JSON parse/serialize, error boundary patterns)
- Error classification heuristics (which patterns map to which error types)
- File and export naming conventions within the decided locations

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/contractStorage.ts`: Existing storage layer with schema migration, quota detection — will be refactored to use storage manager
- `src/components/SeverityBadge.tsx` (lines 12-18): Primary severity-to-color mapping — source of truth for palette extraction
- `src/components/RiskScoreDisplay.tsx` (lines 12-17): Risk score color ternary — will import from palette
- `api/analyze.ts` (lines 53-74): `CompanyProfileSchema` Zod schema — pattern reference for request body validation schema

### Established Patterns
- localStorage keys use `clearcontract:` prefix consistently across 5 keys
- Error handling uses try-catch with specific error type detection (DOMException for quota, TypeError for network)
- Zod v3 with `zod-to-json-schema` for structured validation (established in API pipeline)
- Severity color scheme: red=Critical, amber=High, yellow=Medium, blue=Low, slate=Info

### Integration Points
- 12 direct localStorage calls across 4 files must route through storage manager
- 5 severity/risk color mapping locations must import from palette
- 9 error handling blocks across App.tsx, analyze.ts, and contractStorage.ts must use shared classifier
- `api/analyze.ts` request validation (lines 1327-1361) must use new Zod request schema

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User selected recommended options throughout and trusts Claude's judgment on technical implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-foundation-utilities*
*Context gathered: 2026-03-15*
