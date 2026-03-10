# Phase 8: Pipeline Integration and Company-Specific Intelligence - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Phase 7 knowledge architecture into the live analysis pipeline. Company profile flows from client to server, relevant passes receive profile data in their system prompts via `composeSystemPrompt()`, and the AI generates company-specific comparison findings (insurance gaps, bonding checks). Severity downgrading happens in the AI prompt. A deterministic bid/no-bid widget is computed post-analysis. Review page gets a Coverage Comparison tab and a bid signal widget. No new domain knowledge content (Phase 9-10). No new npm dependencies.

</domain>

<decisions>
## Implementation Decisions

### Company profile data flow
- Claude's discretion on transport mechanism (POST body vs header — choose cleanest for existing `api/analyze.ts` structure)
- Only relevant passes receive company profile (insurance, bonding, risk-overview, retainage, scope — not dates-deadlines, verbiage, etc.)
- Comparison logic (e.g., "contract requires $2M GL, you have $1M") happens inside the AI prompt — Claude sees the profile and generates comparison findings directly
- When company profile fields are empty/incomplete: show a warning banner ("Some profile fields are empty — comparison may be incomplete") then proceed with analysis, skipping comparison for missing fields

### Gap/comparison display
- Insurance gaps and bonding failures appear as regular findings in the existing category system (FindingCard, severity badges, category filtering) AND in a dedicated Coverage Comparison tab
- Coverage Comparison tab lives alongside the findings view (tab navigation, not inline)
- Table shows only what the contract requires — if contract doesn't mention umbrella, no umbrella row
- Claude's discretion on table column layout (requirement + coverage + status, or similar — optimize for clarity)

### Severity downgrade UX
- Show the NEW (lower) severity badge with a small annotation tag: "↓ was High"
- Downgrade reason is inline in the finding explanation: "Downgraded from [X] to [Y]: company meets this insurance requirement." Always visible, no hover/click needed
- Downgraded findings use their NEW severity for risk score calculation — the score reflects the company's actual risk given their profile
- AI decides downgrades in the prompt — Claude sees company profile and adjusts severity in its response, including the downgrade reason in the explanation

### Bid/no-bid signal widget
- Traffic light style: Green/Yellow/Red circle with label ("Bid Recommended" / "Proceed with Caution" / "Significant Concerns")
- Placed next to the risk score in the review page header area — two key metrics side by side
- Computed by deterministic post-processing TypeScript code (not AI-generated) — consistent with how risk score already works
- 5 weighted factors: Bonding, Insurance, Scope, Payment, Retainage — all weighted, no single dealbreaker override
- Claude's discretion on exact weights and threshold boundaries

### Claude's Discretion
- Client-to-server transport mechanism for company profile
- Which specific passes beyond insurance/bonding/risk-overview should receive the profile
- Coverage comparison table column design
- Bid/no-bid factor weights and green/yellow/red threshold values
- Any schema changes needed for passes to return downgrade metadata
- How the comparison tab integrates with the existing category filter / view mode toggle

</decisions>

<specifics>
## Specific Ideas

- Insurance gap findings should be highly specific: "Contract requires $2M GL, your policy covers $1M — $1M gap" not "Insurance may be insufficient"
- Bonding comparison should show clear over/under amounts: "Contract requires $750K bond, your capacity is $500K — $250K over capacity"
- The bid/no-bid widget should feel complementary to the risk score, not redundant — risk score = contract severity, bid signal = should YOU take this job given YOUR capabilities
- Warning banner for incomplete profile should be non-blocking — user can dismiss and proceed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FindingCard` component: Handles severity badges, clause quotes, explanations — gap findings slot directly in
- `SeverityBadge` component: Color-coded severity display — needs minor extension for downgrade annotation
- `composeSystemPrompt()` in `src/knowledge/index.ts`: Already composes base + knowledge + profile, just not called yet
- `useCompanyProfile` hook: Reads/writes localStorage, returns current profile
- `PASS_KNOWLEDGE_MAP` in registry: Maps pass names to knowledge module IDs, all currently empty arrays
- `formatCompanyProfile()` in `src/knowledge/index.ts`: Already formats profile as human-readable string for prompt injection

### Established Patterns
- Deterministic risk score: severity-weighted computation in `api/analyze.ts` — bid/no-bid should follow same pattern
- `SEVERITY_WEIGHTS` constant: `{ Critical: 25, High: 15, Medium: 8, Low: 3, Info: 0 }`
- Structured output via Zod schemas converted to JSON Schema — pass schemas may need new fields for downgrade metadata
- 16 passes run in parallel with Files API upload-once/analyze-many

### Integration Points
- `api/analyze.ts` line 985: `system: pass.systemPrompt` — replace with `composeSystemPrompt()` call
- `api/analyze.ts` POST body: Needs to accept `companyProfile` from client
- `src/api/analyzeContract.ts`: Client wrapper needs to read localStorage profile and include in request
- `src/pages/ContractReview.tsx`: Add Coverage Comparison tab, bid/no-bid widget next to risk score
- `src/types/contract.ts`: May need `originalSeverity` or `downgradedFrom` field on Finding type
- `src/components/SeverityBadge.tsx`: Extend for downgrade annotation display

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-pipeline-integration-and-company-specific-intelligence*
*Context gathered: 2026-03-08*
