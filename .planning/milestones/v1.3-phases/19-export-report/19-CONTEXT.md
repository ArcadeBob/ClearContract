# Phase 19: Export Report - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can download their contract analysis as a CSV file from the review page. The CSV includes all findings (regardless of active filters) with full detail, a metadata summary header, and key dates. Export is a client-side operation — no server involvement.

</domain>

<decisions>
## Implementation Decisions

### CSV columns & content
- Full detail per finding row: Severity, Category, Clause Reference, Clause Text (full verbatim), Explanation, Recommendation, Negotiation Position, Resolved (Yes/No), User Note
- Export always includes ALL findings regardless of active category filter or hide-resolved toggle
- Findings sorted by severity: Critical → High → Medium → Low → Info
- Clause text is full verbatim — no truncation

### Export button placement
- Button lives in header actions area, next to Re-analyze and Delete buttons
- Icon + text label ("Export CSV") with download icon — matches existing button pattern
- Button disabled during re-analysis and when zero findings exist (grayed out, unclickable)
- Toast notification on successful export ("CSV exported") — reuse existing Toast component

### Filename convention
- Format: `{ContractName}_{YYYY-MM-DD}.csv` (e.g., "ABC-Corp-Subcontract_2026-03-12.csv")
- Contract name sanitized for filesystem (spaces → hyphens, special chars removed)
- Date is export date, not analysis date

### Metadata header
- First rows before column headers contain contract summary:
  - Contract name
  - Contract type
  - Risk score
  - Bid signal (Go/Caution/No-Go) and score
  - Analysis date
  - Total finding count
- Blank row separates metadata from column headers + data rows

### Key dates section
- After all finding rows, a blank row separator, then "Key Dates" section
- Columns: Date, Description, Type
- Includes all dates/milestones extracted during analysis

### Claude's Discretion
- Exact CSV escaping/quoting strategy (standard RFC 4180 expected)
- Download mechanism (Blob URL vs data URI)
- Toast duration and styling
- How contract name is sanitized for filename
- Empty field handling in CSV (empty string vs "N/A")

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Toast` (`src/components/Toast.tsx`): Already exists with success variant — reuse for "CSV exported" feedback
- `ContractReview` (`src/pages/ContractReview.tsx`): Has header actions area with Re-analyze and Delete buttons — export button slots in alongside
- `visibleFindings` pattern in ContractReview: Although export uses ALL findings, this pattern shows how filtering works if needed later
- Lucide React icons: Download icon available for the button

### Established Patterns
- Button pattern in ContractReview header: icon + text with Tailwind styling, disabled state handling
- `isReanalyzing` prop already used to disable Re-analyze button — reuse same pattern for Export
- `contract.findings` array has all finding fields needed for CSV columns
- `contract.dates` array has date/milestone data for the dates section
- `contract.clientName`, `contract.contractType`, `contract.riskScore`, `contract.bidSignal` available for metadata header

### Integration Points
- `ContractReview` component: Add Export CSV button to header actions row
- `Finding` type (`src/types/contract.ts`): All needed fields already exist (severity, category, clauseReference, clauseText, explanation, recommendation, negotiationPosition, resolved, note)
- `Contract` type: Has clientName, contractType, riskScore, bidSignal, analyzedAt, dates, findings
- No new dependencies needed — CSV generation is string manipulation + Blob download

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-export-report*
*Context gathered: 2026-03-13*
