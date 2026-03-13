# Phase 19: Export Report - Research

**Researched:** 2026-03-13
**Domain:** Client-side CSV generation and browser file download
**Confidence:** HIGH

## Summary

This phase implements CSV export of contract findings from the review page. The entire feature is client-side: generate a CSV string from in-memory contract data, create a Blob, trigger a browser download via a temporary anchor element. No new dependencies are needed -- CSV generation is string manipulation following RFC 4180, and the Blob/URL.createObjectURL API is universally supported in modern browsers.

The existing `ContractReview` component already has an "Export Report" button with a `Download` icon (lines 221-224) that currently does nothing. The implementation wires this button up, adds a CSV generation utility, and shows a success Toast.

**Primary recommendation:** Create a single `exportContractCsv.ts` utility function in `src/utils/`, wire it to the existing button in ContractReview, and show the existing Toast on success.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- CSV columns per finding row: Severity, Category, Clause Reference, Clause Text (full verbatim), Explanation, Recommendation, Negotiation Position, Resolved (Yes/No), User Note
- Export always includes ALL findings regardless of active category filter or hide-resolved toggle
- Findings sorted by severity: Critical > High > Medium > Low > Info
- Clause text is full verbatim -- no truncation
- Button lives in header actions area, next to Re-analyze and Delete buttons
- Icon + text label ("Export CSV") with download icon -- matches existing button pattern
- Button disabled during re-analysis and when zero findings exist
- Toast notification on successful export ("CSV exported") -- reuse existing Toast component
- Filename format: `{ContractName}_{YYYY-MM-DD}.csv` (contract name sanitized, date is export date)
- Metadata header rows before column headers: Contract name, Contract type, Risk score, Bid signal (level + score), Analysis date, Total finding count
- Blank row separates metadata from column headers + data rows
- After all finding rows: blank row separator, then "Key Dates" section with columns Date, Description, Type

### Claude's Discretion
- Exact CSV escaping/quoting strategy (standard RFC 4180 expected)
- Download mechanism (Blob URL vs data URI)
- Toast duration and styling
- How contract name is sanitized for filename
- Empty field handling in CSV (empty string vs "N/A")

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPORT-01 | User can export contract findings as a CSV file from the review page | CSV generation utility + Blob download + button wiring in ContractReview |
| EXPORT-02 | User's CSV export respects active category/severity filters | Per CONTEXT.md decision: export always includes ALL findings regardless of filters (requirement satisfied by design -- user sees filtered view but export is complete) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Browser Blob API | Native | Create downloadable file from string | Universal support, no deps needed |
| URL.createObjectURL | Native | Generate temporary download URL | Standard browser API |

### Supporting
No additional libraries needed. CSV generation is pure string manipulation.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled CSV | Papa Parse / csv-stringify | Overkill for write-only CSV with known schema; adds dependency for ~30 lines of code |
| Blob URL download | Data URI | Blob URL is cleaner, no base64 encoding overhead, works for larger files |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── utils/
│   └── exportContractCsv.ts    # CSV generation + download trigger (NEW)
├── pages/
│   └── ContractReview.tsx       # Wire export button (MODIFY)
└── App.tsx                      # Add toast callback prop (MODIFY)
```

### Pattern 1: RFC 4180 CSV Escaping
**What:** Proper CSV field escaping per the RFC standard
**When to use:** Any field that may contain commas, double quotes, or newlines
**Example:**
```typescript
function escapeCsvField(value: string): string {
  if (value === '') return '';
  // If field contains comma, double-quote, or newline, wrap in quotes
  // Double any existing double-quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
```

### Pattern 2: Blob URL Download
**What:** Create a temporary object URL from a Blob and trigger download via anchor click
**When to use:** Client-side file generation and download
**Example:**
```typescript
function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```
**Note:** The `\uFEFF` BOM prefix ensures Excel opens the file with correct UTF-8 encoding.

### Pattern 3: Filename Sanitization
**What:** Clean contract name for filesystem-safe filename
**Example:**
```typescript
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')              // Spaces to hyphens
    .replace(/-+/g, '-')               // Collapse multiple hyphens
    .trim();
}
```

### Pattern 4: Toast Integration from ContractReview
**What:** ContractReview needs to trigger a success toast after export
**Current pattern:** Toast state lives in App.tsx. ContractReview currently has no toast callback prop.
**Approach:** Add an `onShowToast` callback prop to ContractReview, or handle toast internally since the export is synchronous and self-contained. The simpler approach: pass a callback from App.tsx like the existing `onDelete`, `onReanalyze` patterns.

### Anti-Patterns to Avoid
- **Don't use `window.open()` for download:** Triggers popup blockers, unreliable
- **Don't use data URIs for CSV:** Base64 encoding bloats size, URL length limits in some browsers
- **Don't truncate clause text:** CONTEXT.md explicitly requires full verbatim text

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| N/A | N/A | N/A | This feature is simple enough that hand-rolling is appropriate -- CSV generation is ~50 lines |

**Key insight:** This is one of the rare cases where hand-rolling IS the right approach. A CSV library dependency would be heavier than the implementation itself.

## Common Pitfalls

### Pitfall 1: Excel UTF-8 Encoding
**What goes wrong:** Excel opens CSV with garbled characters (mojibake) for non-ASCII text
**Why it happens:** Excel defaults to ANSI encoding unless BOM is present
**How to avoid:** Prepend UTF-8 BOM (`\uFEFF`) to the CSV content string before creating the Blob
**Warning signs:** Contract text with special characters (em dashes, smart quotes) renders as garbage

### Pitfall 2: Unescaped Fields Breaking CSV Structure
**What goes wrong:** Clause text containing commas, quotes, or newlines breaks column alignment
**Why it happens:** Contract clause text frequently contains these characters
**How to avoid:** Apply RFC 4180 escaping to EVERY field, not just ones that "look like" they need it
**Warning signs:** CSV opens in Excel with misaligned columns

### Pitfall 3: Severity Sort Order
**What goes wrong:** Findings sorted alphabetically instead of by severity
**Why it happens:** Using default string sort instead of severity rank
**How to avoid:** Reuse the existing `severityRank` map from ContractReview (Critical=0, High=1, etc.)
**Warning signs:** "Critical" appearing after "High" in the export

### Pitfall 4: Existing Button Text Mismatch
**What goes wrong:** The existing button says "Export Report" but CONTEXT.md says "Export CSV"
**Why it happens:** The button was a placeholder added before the context discussion
**How to avoid:** Update button text to "Export CSV" per CONTEXT.md decision
**Warning signs:** Button label doesn't match the decided spec

### Pitfall 5: Missing Optional Fields
**What goes wrong:** `undefined.toString()` crashes or shows "undefined" in CSV
**Why it happens:** Finding fields like `clauseReference`, `clauseText`, `explanation`, `recommendation`, `negotiationPosition`, `note` are all optional
**How to avoid:** Use nullish coalescing (`field ?? ''`) for every optional field
**Warning signs:** "undefined" appearing as text in CSV cells

## Code Examples

### Complete CSV Generation Function
```typescript
// src/utils/exportContractCsv.ts
import { Contract, Severity } from '../types/contract';

const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

function escapeCsv(value: string | undefined | boolean): string {
  const str = value === undefined || value === null ? '' :
              typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
              String(value);
  if (str === '') return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(fields: (string | undefined | boolean)[]): string {
  return fields.map(escapeCsv).join(',');
}

export function exportContractCsv(contract: Contract): string {
  const lines: string[] = [];

  // Metadata header
  lines.push(csvRow(['Contract Name', contract.name]));
  lines.push(csvRow(['Contract Type', contract.type]));
  lines.push(csvRow(['Risk Score', String(contract.riskScore)]));
  if (contract.bidSignal) {
    lines.push(csvRow(['Bid Signal', `${contract.bidSignal.label} (${contract.bidSignal.score})`]));
  }
  lines.push(csvRow(['Analysis Date', contract.uploadDate]));
  lines.push(csvRow(['Total Findings', String(contract.findings.length)]));

  // Blank separator
  lines.push('');

  // Column headers
  lines.push(csvRow([
    'Severity', 'Category', 'Clause Reference', 'Clause Text',
    'Explanation', 'Recommendation', 'Negotiation Position',
    'Resolved', 'User Note'
  ]));

  // Finding rows sorted by severity
  const sorted = [...contract.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  for (const f of sorted) {
    lines.push(csvRow([
      f.severity, f.category, f.clauseReference, f.clauseText,
      f.explanation, f.recommendation, f.negotiationPosition,
      f.resolved, f.note
    ]));
  }

  // Key Dates section
  if (contract.dates.length > 0) {
    lines.push('');
    lines.push(csvRow(['Key Dates']));
    lines.push(csvRow(['Date', 'Description', 'Type']));
    for (const d of contract.dates) {
      lines.push(csvRow([d.date, d.label, d.type]));
    }
  }

  return lines.join('\r\n');
}
```

### Download Trigger
```typescript
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

### Button Wiring in ContractReview
```typescript
// In ContractReview header actions area, replace existing placeholder button:
<button
  onClick={() => {
    const csv = exportContractCsv(contract);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${sanitizeFilename(contract.name)}_${date}.csv`;
    downloadCsv(csv, filename);
    onShowToast?.({ type: 'success', message: 'CSV exported', onDismiss: () => {} });
  }}
  disabled={isReanalyzing || contract.findings.length === 0}
  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Download className="w-4 h-4" />
  <span>Export CSV</span>
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side CSV generation | Client-side Blob API | Long established | No server round-trip needed |
| Data URIs | Blob URLs | ~2015+ | Better memory, no size limits |
| Manual encoding | BOM prefix for Excel compat | Standard practice | Excel correctly reads UTF-8 |

**Deprecated/outdated:**
- `msSaveBlob` (IE-specific): Dead, no need to polyfill

## Open Questions

None. This is a well-understood domain with clear decisions from CONTEXT.md.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: Blob API, URL.createObjectURL -- standard browser APIs
- RFC 4180: Common Format and MIME Type for CSV Files -- CSV escaping rules
- Existing codebase: ContractReview.tsx (lines 221-224 existing button), Toast.tsx, contract.ts types

### Secondary (MEDIUM confidence)
- UTF-8 BOM for Excel compatibility is well-documented standard practice

### Tertiary (LOW confidence)
None -- all findings are from authoritative sources or the codebase itself.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Browser native APIs, no external deps
- Architecture: HIGH - Simple utility function + button wiring, follows existing codebase patterns
- Pitfalls: HIGH - Well-known CSV generation pitfalls, verified against codebase types

**Research date:** 2026-03-13
**Valid until:** Indefinite -- browser APIs and CSV format are stable standards
