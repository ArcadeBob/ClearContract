# Phase 24: Actionable Output - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Give users shareable deliverables and priority-ordered workflow tools. PDF report generation, action priority labels on findings, bid signal factor explanations, and a negotiation checklist view. No new analysis capabilities — this phase surfaces existing data in actionable formats.

</domain>

<decisions>
## Implementation Decisions

### PDF Report Generation (OUT-01)
- Client-side PDF generation in the browser (no server round-trip)
- Clean professional style — simple header with company context, severity color indicators, clean typography, no logos
- Always exports full report regardless of current filter state (CSV handles filtered exports)
- Report sections in order:
  1. Header: contract name, client, type, date, risk score with color indicator, bid signal result
  2. Findings grouped by category (matching by-category view order), each finding showing severity, title, clause text, explanation, recommendation, and negotiation position (for Critical/High)
  3. Key dates timeline with type labels (Start, Milestone, Deadline, Expiry)
- Action priority labels included in PDF findings

### Action Priority Labels (OUT-02)
- AI-assigned during analysis — each pass schema gets an `actionPriority` field with values: `pre-bid`, `pre-sign`, `monitor`
- Claude decides priority based on clause context (e.g., bonding = pre-bid, indemnification = pre-sign, warranty = monitor)
- Displayed as small colored badge next to severity badge in FindingCard header
- Included in both CSV export (new column) and PDF report
- New analyses only — existing contracts without the field show no priority badge; user can re-analyze to get them
- No client-side fallback for old contracts

### Bid Signal Factor Breakdown (OUT-03)
- BidSignalWidget already shows 5 factors with scores, weights, and color bars (Phase 22 UX-04)
- Enhancement: add per-factor reason text explaining WHY each factor scored as it did
- Reason text derived from matched findings — each bid signal factor already matches against findings; generate short summary from matched finding titles/descriptions
- No schema changes needed — reason text computed client-side from existing data

### Negotiation Checklist (OUT-04)
- New tab in review page view mode toggle: [By Category] [All by Severity] [Coverage] [Negotiation]
- Only shows findings that have a non-empty negotiationPosition — findings without positions are excluded
- Grouped by action priority sections: PRE-BID, PRE-SIGN, MONITOR (uses the new actionPriority field)
- Each checklist item shows:
  - Severity badge + finding title
  - Full negotiation position text (the core value)
  - Clause reference (contract section for lookup)
  - Resolved toggle (reuses existing resolve functionality)
- Read-only extract view — no negotiation status tracking (per Out of Scope in REQUIREMENTS.md)

### Claude's Discretion
- PDF library choice (jsPDF, html2pdf, or similar)
- PDF typography, spacing, and color mapping for severity indicators
- Exact badge colors for action priority (suggested: orange for pre-bid, blue for pre-sign, slate for monitor)
- How reason text is summarized from matched findings (phrasing, length)
- Negotiation checklist empty state when no findings have negotiation positions
- How the Negotiation tab handles contracts analyzed before actionPriority was added (graceful degradation)

</decisions>

<specifics>
## Specific Ideas

- PDF should look like something you'd hand to a project manager — professional, not flashy
- Action priority badge sits alongside severity badge in FindingCard header row (compact, not a separate line)
- Negotiation checklist grouped by timing (pre-bid first) matches the workflow: user works through items in order of when they need to act
- Bid signal reason text like "No bonding requirement found" or "Pay-if-paid clause detected" — concise, one-line per factor

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `exportContractCsv.ts`: CSV export with download mechanics (Blob + URL.createObjectURL pattern) — reuse download pattern for PDF
- `escapeCsv()`, `sanitizeFilename()`: Utility functions reusable for PDF filename generation
- `BidSignalWidget` (src/components/BidSignalWidget.tsx): Already shows 5 factors with expand/collapse — add reason text row per factor
- `FindingCard` (src/components/FindingCard.tsx): Already renders severity badge, negotiation position — add actionPriority badge
- `CategorySection` (src/components/CategorySection.tsx): Category grouping logic — PDF can follow same ordering
- `CoverageComparisonTab` (src/components/CoverageComparisonTab.tsx): Existing tab component pattern — negotiation checklist follows same integration

### Established Patterns
- View mode toggle in ContractReview.tsx: `ViewMode = 'by-category' | 'by-severity' | 'coverage'` — add `'negotiation'`
- Severity color coding: red=Critical, amber=High, yellow=Medium, blue=Low, slate=Info
- Download trigger: button in header toolbar (Export CSV button pattern)
- Optional fields with nullish coalescing for backward compat (resolved, note) — same pattern for actionPriority
- Self-contained pass schemas with local enums — actionPriority enum added per schema

### Integration Points
- `src/types/contract.ts`: Finding interface needs `actionPriority?: 'pre-bid' | 'pre-sign' | 'monitor'` field
- `src/schemas/*.ts`: Each pass schema needs actionPriority field added
- `api/merge.ts`: Convert functions need to map actionPriority from pass results to Finding
- `src/utils/bidSignal.ts`: Factor computation — add reason text generation from matched findings
- `src/pages/ContractReview.tsx`: Add PDF download button, add 'negotiation' to ViewMode union
- `src/utils/exportContractCsv.ts`: Add actionPriority column to CSV export

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-actionable-output*
*Context gathered: 2026-03-14*
