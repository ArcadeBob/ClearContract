# Phase 21: Fix Filtered CSV Export - Research

**Researched:** 2026-03-13
**Domain:** CSV export filtering (TypeScript, plain string manipulation)
**Confidence:** HIGH

## Summary

This is a small, self-contained change to two existing files. The current `exportContractCsv(contract)` function always exports `contract.findings` (all findings). The fix passes the already-computed `visibleFindings` array from `ContractReview` into the export function, and adds conditional metadata rows describing active filters.

No new dependencies, no new files, no architectural changes. The existing `visibleFindings` variable (line 144 of ContractReview.tsx) already applies both `hideResolved` and `selectedCategory` filters. The export button handler (line 224-229) just needs to pass this filtered array plus filter descriptions.

**Primary recommendation:** Add an optional `options` parameter to `exportContractCsv` containing `findings` override and `filterDescriptions`, keeping backward compatibility.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pass `visibleFindings` (already computed in ContractReview) to the export function instead of `contract.findings`
- Findings in the CSV are the same set the user sees on screen
- Severity sort order preserved within the filtered set (Critical -> High -> Medium -> Low -> Info)
- When filters are active, add two rows after "Total Findings": `Exported Findings` (count) and `Filters Applied` (comma-separated description)
- "Total Findings" always shows the full unfiltered count
- When no filters are active, omit "Exported Findings" and "Filters Applied" rows -- CSV identical to current behavior
- Filename convention unchanged: `{ContractName}_{YYYY-MM-DD}.csv` (no "-filtered" suffix)

### Claude's Discretion
- Exact function signature change (add findings array param vs options object)
- How filter state is communicated from ContractReview to the export function
- Whether to pass filter descriptions as strings or derive them inside the export function

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPORT-02 | User's CSV export respects active category/severity filters | Pass `visibleFindings` to export function; add metadata rows describing active filters |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase uses only existing project code:

| Asset | Location | Purpose |
|-------|----------|---------|
| `exportContractCsv` | `src/utils/exportContractCsv.ts` | CSV generation -- needs signature update |
| `downloadCsv` | `src/utils/exportContractCsv.ts` | Blob download helper -- no changes |
| `sanitizeFilename` | `src/utils/exportContractCsv.ts` | Filename sanitizer -- no changes |
| `ContractReview` | `src/pages/ContractReview.tsx` | Export button handler -- needs to pass filtered data |

## Architecture Patterns

### Current Export Flow (lines 224-229 of ContractReview.tsx)
```typescript
onClick={() => {
  const csv = exportContractCsv(contract);
  const filename = `${sanitizeFilename(contract.name)}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);
  onShowToast?.({ type: 'success', message: 'CSV exported' });
}}
```

### Recommended: Options Object Pattern
Use an optional second parameter with an options object rather than positional args. This keeps backward compatibility and is extensible.

```typescript
interface ExportOptions {
  findings?: Finding[];          // Override contract.findings with filtered set
  filterDescriptions?: string[]; // e.g., ["Category: Legal Issues", "Hide Resolved: Yes"]
}

export function exportContractCsv(contract: Contract, options?: ExportOptions): string {
  const findings = options?.findings ?? contract.findings;
  const filterDescriptions = options?.filterDescriptions ?? [];
  // ...
}
```

**Why options object over positional args:**
- Adding `findings` as a 2nd positional param and `filterDescriptions` as 3rd is fragile
- Options object lets the planner add future export options without signature churn
- Matches the project's existing pattern of optional fields with nullish coalescing

### Filter Description Construction
Build filter descriptions at the call site in ContractReview (where `hideResolved` and `selectedCategory` state live), then pass as strings. This is simpler than passing raw filter state and having the export function interpret it.

```typescript
// In ContractReview export handler
const filterDescriptions: string[] = [];
if (selectedCategory !== 'All') filterDescriptions.push(`Category: ${selectedCategory}`);
if (hideResolved) filterDescriptions.push('Hide Resolved: Yes');

const csv = exportContractCsv(contract, {
  findings: visibleFindings,
  filterDescriptions,
});
```

### Metadata Row Logic
Current metadata section (lines 28-38 of exportContractCsv.ts):
```
Contract Name, [name]
Contract Type, [type]
Risk Score, [score]
Bid Signal, [label (score)]     // conditional
Analysis Date, [date]
Total Findings, [count]
                                // blank row
[column headers]
```

Updated (when filters active):
```
Contract Name, [name]
Contract Type, [type]
Risk Score, [score]
Bid Signal, [label (score)]     // conditional
Analysis Date, [date]
Total Findings, [full count]    // always full contract.findings.length
Exported Findings, [filtered count]   // only when filters active
Filters Applied, [description]        // only when filters active
                                // blank row
[column headers]
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV escaping | Custom escaper | Existing `escapeCsv()` | Already handles commas, quotes, booleans, undefined |
| Filter computation | Re-derive in export | `visibleFindings` from ContractReview | Already computed at line 144, single source of truth |

## Common Pitfalls

### Pitfall 1: Forgetting `contract.findings.length` for Total Findings
**What goes wrong:** Using `findings.length` (the filtered array) for the "Total Findings" row, making it look like the contract only has N findings.
**How to avoid:** Always use `contract.findings.length` for "Total Findings". Use `findings.length` (the override) only for "Exported Findings".

### Pitfall 2: Inconsistent visibleFindings Computation
**What goes wrong:** `visibleFindings` in ContractReview (line 144) only applies `hideResolved`. The `selectedCategory` filter is applied later in `groupedFindings` (line 154-170). If you pass `visibleFindings` directly, category filtering is NOT applied.
**How to avoid:** Compute the fully-filtered set at the export call site by also applying `selectedCategory`:
```typescript
const exportFindings = selectedCategory === 'All'
  ? visibleFindings
  : visibleFindings.filter(f => f.category === selectedCategory);
```
**This is the most critical pitfall in this phase.**

### Pitfall 3: Missing Filter Description When No Findings Match
**What goes wrong:** User has filters active but all findings are filtered out. The CSV exports with 0 findings but no explanation.
**How to avoid:** Still include "Exported Findings: 0" and "Filters Applied" rows even when the filtered count is 0, as long as filters are active.

## Code Examples

### Complete exportContractCsv Signature Change
```typescript
import { Contract, Finding, Severity } from '../types/contract';

interface ExportOptions {
  findings?: Finding[];
  filterDescriptions?: string[];
}

export function exportContractCsv(contract: Contract, options?: ExportOptions): string {
  const findings = options?.findings ?? contract.findings;
  const filterDescriptions = options?.filterDescriptions ?? [];
  const lines: string[] = [];

  // Metadata header rows
  lines.push(csvRow(['Contract Name', contract.name]));
  lines.push(csvRow(['Contract Type', contract.type]));
  lines.push(csvRow(['Risk Score', String(contract.riskScore)]));
  if (contract.bidSignal) {
    lines.push(csvRow(['Bid Signal', `${contract.bidSignal.label} (${contract.bidSignal.score})`]));
  }
  lines.push(csvRow(['Analysis Date', contract.uploadDate]));
  lines.push(csvRow(['Total Findings', String(contract.findings.length)]));

  // Conditional filter metadata
  if (filterDescriptions.length > 0) {
    lines.push(csvRow(['Exported Findings', String(findings.length)]));
    lines.push(csvRow(['Filters Applied', filterDescriptions.join(', ')]));
  }

  // ... rest unchanged, but use `findings` variable instead of `contract.findings`
}
```

### Complete ContractReview Export Handler
```typescript
onClick={() => {
  // Compute fully filtered findings (visibleFindings only handles hideResolved)
  const exportFindings = selectedCategory === 'All'
    ? visibleFindings
    : visibleFindings.filter(f => f.category === selectedCategory);

  const filterDescriptions: string[] = [];
  if (selectedCategory !== 'All') filterDescriptions.push(`Category: ${selectedCategory}`);
  if (hideResolved) filterDescriptions.push('Hide Resolved: Yes');

  const csv = exportContractCsv(contract, {
    findings: exportFindings,
    filterDescriptions,
  });
  const filename = `${sanitizeFilename(contract.name)}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);
  onShowToast?.({ type: 'success', message: 'CSV exported' });
}}
```

## Open Questions

None -- this phase is fully scoped and straightforward.

## Validation Architecture

> `workflow.nyquist_validation` not set in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPORT-02 | CSV export respects hideResolved and selectedCategory filters | manual | Manual: apply filters, export CSV, open in spreadsheet, verify rows match screen | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors)
- **Per wave merge:** `npm run build`
- **Phase gate:** Manual verification: export with filters active, confirm CSV content matches visible findings

### Wave 0 Gaps
None -- no test framework configured for this project; verification is manual + type-check via build.

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/utils/exportContractCsv.ts` (87 lines, fully analyzed)
- Direct code reading: `src/pages/ContractReview.tsx` (485 lines, fully analyzed)
- Direct code reading: `src/types/contract.ts` (Finding interface, Contract interface)

No external libraries involved -- this is pure TypeScript string manipulation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no external dependencies, just existing project code
- Architecture: HIGH - options object pattern is straightforward TypeScript
- Pitfalls: HIGH - identified through direct code reading (especially the visibleFindings vs category filter gap)

**Research date:** 2026-03-13
**Valid until:** Indefinite (no external dependencies to become stale)
