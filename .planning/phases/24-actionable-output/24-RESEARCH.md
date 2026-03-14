# Phase 24: Actionable Output - Research

**Researched:** 2026-03-14
**Domain:** Client-side PDF generation, UI enhancements (badges, widgets, views), Zod schema evolution
**Confidence:** HIGH

## Summary

Phase 24 delivers four features that surface existing analysis data in actionable formats: PDF report generation (OUT-01), action priority labels on findings (OUT-02), bid signal factor reason text (OUT-03), and a negotiation checklist view (OUT-04). All four are client-side UI features except OUT-02 which requires schema changes across the analysis pipeline (Zod schemas, merge.ts, type definitions).

The PDF generation is the most technically complex piece. jsPDF with the jspdf-autotable plugin is the standard choice for client-side PDF generation in this context -- it handles multi-page documents, colored table cells, and custom typography without server round-trips. The remaining three features (action priority badges, bid signal reasons, negotiation tab) follow established patterns already in the codebase: badge rendering in FindingCard, expand/collapse in BidSignalWidget, and tab-based views in ContractReview.

**Primary recommendation:** Use jsPDF + jspdf-autotable for PDF generation. Add `actionPriority` field to all pass schemas, merge.ts, and the Finding type. Compute bid signal reason text client-side from matched findings. Add negotiation tab following the existing CoverageComparisonTab pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PDF generation is client-side (no server round-trip)
- Clean professional style -- simple header, severity color indicators, clean typography, no logos
- Always exports full report regardless of current filter state
- Report sections: header (contract name, client, type, date, risk score, bid signal) -> findings grouped by category -> key dates
- Action priority is AI-assigned during analysis via `actionPriority` field with values: `pre-bid`, `pre-sign`, `monitor`
- Displayed as small colored badge next to severity badge in FindingCard header
- New analyses only -- existing contracts show no priority badge; no client-side fallback
- Bid signal enhancement: add per-factor reason text computed client-side from matched findings
- Negotiation checklist: new tab in review page view mode toggle
- Only shows findings with non-empty negotiationPosition
- Grouped by action priority sections: PRE-BID, PRE-SIGN, MONITOR
- Each checklist item: severity badge + title, full negotiation position, clause reference, resolved toggle
- Read-only extract view -- no negotiation status tracking

### Claude's Discretion
- PDF library choice (jsPDF, html2pdf, or similar)
- PDF typography, spacing, and color mapping for severity indicators
- Exact badge colors for action priority (suggested: orange for pre-bid, blue for pre-sign, slate for monitor)
- How reason text is summarized from matched findings (phrasing, length)
- Negotiation checklist empty state when no findings have negotiation positions
- How the Negotiation tab handles contracts analyzed before actionPriority was added (graceful degradation)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUT-01 | User can generate a PDF report of contract analysis (header, risk score, findings, dates) | jsPDF + jspdf-autotable for client-side PDF; download pattern from exportContractCsv.ts |
| OUT-02 | Findings have action priority classification (pre-bid / pre-sign / monitor) | New `actionPriority` field on Finding type, all pass Zod schemas, merge.ts buildBaseFinding |
| OUT-03 | Bid signal widget shows full factor breakdown with weighted scores | Already shows factors (Phase 22); enhance with reason text computed from FACTOR_DEFS match functions |
| OUT-04 | Negotiation checklist view generated from findings with negotiationPosition data | New ViewMode 'negotiation' tab following CoverageComparisonTab pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | ^2.5 | Client-side PDF document generation | 30k+ GitHub stars, 2.6M+ weekly npm downloads, mature and stable |
| jspdf-autotable | ^3.8 | Table generation plugin for jsPDF | Standard companion for tabular PDF content, supports cell colors and styling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.25 (existing) | Schema validation for actionPriority field | Already in project, extend existing pass schemas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF | pdfmake | Better for complex layouts via JSON DSL, but heavier bundle (~300KB vs ~150KB) and different paradigm from rest of codebase |
| jsPDF | @react-pdf/renderer | React component model for PDFs, but requires separate component tree and adds significant complexity for a report export |
| jsPDF + autoTable | html2pdf.js | Renders actual HTML/CSS to PDF via html2canvas, but rasterizes text (not selectable), poor quality for professional reports |

**Installation:**
```bash
npm install jspdf jspdf-autotable
```

**TypeScript types:** jsPDF ships its own types. jspdf-autotable has `@types/jspdf-autotable` but the library also ships types natively since v3.5+.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── utils/
│   ├── exportContractPdf.ts     # PDF generation logic (parallel to exportContractCsv.ts)
│   └── bidSignal.ts             # Add generateFactorReasons() alongside computeBidSignal()
├── components/
│   ├── FindingCard.tsx           # Add ActionPriorityBadge inline
│   ├── ActionPriorityBadge.tsx   # Small colored badge component
│   ├── BidSignalWidget.tsx       # Add reason text row per factor
│   └── NegotiationChecklist.tsx  # New tab component (like CoverageComparisonTab)
├── types/
│   └── contract.ts              # Add actionPriority to Finding interface
├── schemas/
│   ├── analysis.ts              # Add actionPriority to FindingSchema
│   ├── legalAnalysis.ts         # Add actionPriority to each legal finding schema
│   ├── scopeComplianceAnalysis.ts # Add actionPriority to scope/compliance schemas
│   └── synthesisAnalysis.ts     # Add actionPriority to synthesis schema
└── pages/
    └── ContractReview.tsx        # Add 'negotiation' ViewMode, PDF download button
api/
└── merge.ts                     # Map actionPriority in buildBaseFinding
```

### Pattern 1: PDF Generation Utility
**What:** Self-contained function that takes a Contract and returns a downloaded PDF
**When to use:** PDF export triggered by button click in ContractReview header
**Example:**
```typescript
// src/utils/exportContractPdf.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, Finding, CATEGORIES } from '../types/contract';
import { sanitizeFilename } from './exportContractCsv';

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  Critical: [239, 68, 68],   // red-500
  High: [245, 158, 11],      // amber-500
  Medium: [234, 179, 8],     // yellow-500
  Low: [59, 130, 246],       // blue-500
  Info: [100, 116, 139],     // slate-500
};

export function exportContractPdf(contract: Contract): void {
  const doc = new jsPDF();
  let y = 20;

  // Header section
  doc.setFontSize(18);
  doc.text(contract.name, 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Client: ${contract.client}  |  Type: ${contract.type}  |  Date: ${contract.uploadDate}`, 14, y);
  y += 8;
  doc.text(`Risk Score: ${contract.riskScore}/100`, 14, y);
  // ... etc

  // Findings grouped by category using autoTable
  for (const category of CATEGORIES) {
    const catFindings = contract.findings.filter(f => f.category === category);
    if (catFindings.length === 0) continue;

    autoTable(doc, {
      startY: y,
      head: [[category, 'Severity', 'Action', 'Details']],
      body: catFindings.map(f => [
        f.title,
        f.severity,
        f.actionPriority ?? '',
        f.description,
      ]),
      // Column-specific styling
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === 'body') {
          const color = SEVERITY_COLORS[data.cell.raw as string];
          if (color) data.cell.styles.textColor = color;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Download
  doc.save(`${sanitizeFilename(contract.name)}-report.pdf`);
}
```

### Pattern 2: Schema Extension for actionPriority
**What:** Add optional actionPriority enum to every pass finding schema
**When to use:** Each Zod schema that defines a finding object
**Example:**
```typescript
// In each pass schema file, add to the finding object:
const ActionPriorityEnum = z.enum(['pre-bid', 'pre-sign', 'monitor']);

// In FindingSchema (analysis.ts):
export const FindingSchema = z.object({
  // ... existing fields ...
  actionPriority: ActionPriorityEnum,  // Required in schema (AI must provide)
});

// In contract.ts Finding interface:
actionPriority?: 'pre-bid' | 'pre-sign' | 'monitor';  // Optional for backward compat
```

### Pattern 3: Client-side Reason Text Generation
**What:** Compute one-line reason text per bid signal factor from matched findings
**When to use:** BidSignalWidget expanded view
**Example:**
```typescript
// src/utils/bidSignal.ts - add to existing file
export interface BidFactorWithReason extends BidFactor {
  reason: string;
}

export function generateFactorReasons(
  factors: BidFactor[],
  findings: Finding[]
): BidFactorWithReason[] {
  return FACTOR_DEFS.map((def, i) => {
    const matched = findings.filter(def.match);
    let reason: string;
    if (matched.length === 0) {
      reason = `No ${def.name.toLowerCase()} issues found`;
    } else {
      const worst = matched.reduce((a, b) =>
        severityRank(a.severity) < severityRank(b.severity) ? a : b
      );
      reason = worst.title;
    }
    return { ...factors[i], reason };
  });
}
```

### Pattern 4: NegotiationChecklist Tab Component
**What:** New tab component following CoverageComparisonTab pattern
**When to use:** ViewMode === 'negotiation'
**Example:**
```typescript
// src/components/NegotiationChecklist.tsx
interface NegotiationChecklistProps {
  findings: Finding[];
  onToggleResolved?: (findingId: string) => void;
}

// Filter to findings with negotiationPosition, group by actionPriority
const PRIORITY_ORDER = ['pre-bid', 'pre-sign', 'monitor'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  'pre-bid': 'PRE-BID',
  'pre-sign': 'PRE-SIGN',
  'monitor': 'MONITOR',
};
```

### Anti-Patterns to Avoid
- **Rendering HTML to canvas for PDF:** html2canvas approach rasterizes text, making it non-selectable and blurry. Use jsPDF's direct text/table API instead.
- **Server-side PDF generation:** Adds latency, server cost, and complexity. Client-side is sufficient for this report size.
- **Modifying existing findings for backward compat:** Use optional field (`actionPriority?`) and nullish checks, not default values that would misrepresent old data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table layout | Manual x/y text positioning | jspdf-autotable | Page breaks, cell wrapping, column widths, header repeating on new pages |
| PDF multi-page | Manual page break detection | jspdf-autotable handles this | Content overflow, margin management, header repetition |
| Filename sanitization | New sanitize function | Existing `sanitizeFilename()` | Already handles special chars, spaces, dashes |
| File download trigger | New download logic | Follow `downloadCsv()` pattern (Blob + createObjectURL) | jsPDF has built-in `doc.save()` that handles this |

**Key insight:** jsPDF's `doc.save()` handles the download mechanics internally -- no need to replicate the Blob/URL pattern from CSV export. The CSV pattern is only relevant for filename sanitization.

## Common Pitfalls

### Pitfall 1: jsPDF Y-coordinate Tracking
**What goes wrong:** Content overlaps or runs off page because Y position isn't tracked after each section
**Why it happens:** jsPDF uses absolute coordinates; autoTable tracks its own Y but you must read `finalY` after each table
**How to avoid:** Always read `(doc as any).lastAutoTable.finalY` after each autoTable call and add spacing before the next section. Check `doc.internal.pageSize.getHeight()` before manual text to add page breaks.
**Warning signs:** PDF content overlapping, truncated at bottom of page

### Pitfall 2: Font Embedding for Non-Latin Characters
**What goes wrong:** Special characters in contract text render as boxes or empty
**Why it happens:** jsPDF default font (Helvetica) doesn't include all Unicode. Contract text may contain legal symbols, accented characters.
**How to avoid:** For this project, Helvetica covers standard English contract text. If issues arise, use `doc.addFont()` with a TTF. Not expected to be a problem for glazing contracts.
**Warning signs:** Square boxes in PDF output

### Pitfall 3: Schema Field Addition Breaking Existing Analyses
**What goes wrong:** Old contracts without actionPriority cause runtime errors
**Why it happens:** Code assumes field exists without nullish checks
**How to avoid:** Make actionPriority optional in the Finding interface (`actionPriority?: ...`). Use nullish coalescing everywhere it's accessed. The CONTEXT.md explicitly says "no client-side fallback for old contracts" -- just don't render the badge when field is absent.
**Warning signs:** TypeError on accessing `.actionPriority` of undefined

### Pitfall 4: Negotiation Tab Empty When No actionPriority
**What goes wrong:** Contracts analyzed before this phase have no actionPriority, so grouping by priority produces empty sections
**Why it happens:** The negotiation tab groups by actionPriority, but old contracts lack this field
**How to avoid:** For findings without actionPriority, group them under an "UNCATEGORIZED" section at the bottom, or simply list them ungrouped. Show empty state if no findings have negotiationPosition at all.
**Warning signs:** Blank negotiation tab for re-analyzed contracts

### Pitfall 5: autoTable TypeScript Types
**What goes wrong:** TypeScript errors when accessing `doc.lastAutoTable` or using autoTable import
**Why it happens:** autoTable augments jsPDF prototype but types may not be fully recognized
**How to avoid:** Import as `import autoTable from 'jspdf-autotable'` and call as `autoTable(doc, options)` (function style, not method style). Access finalY via `(doc as any).lastAutoTable.finalY`.
**Warning signs:** TS2339 errors about properties not existing on jsPDF

## Code Examples

### jsPDF Basic Setup and Section Rendering
```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF();

// Header
doc.setFontSize(20);
doc.setTextColor(30, 41, 59); // slate-800
doc.text('Contract Analysis Report', 14, 20);

// Risk score with color
const riskColor = riskScore >= 70 ? [239, 68, 68] : riskScore >= 40 ? [245, 158, 11] : [34, 197, 94];
doc.setFontSize(14);
doc.setTextColor(...riskColor);
doc.text(`Risk Score: ${riskScore}/100`, 14, 35);

// Table with severity colors
autoTable(doc, {
  startY: 50,
  head: [['Finding', 'Severity', 'Priority', 'Recommendation']],
  body: findings.map(f => [f.title, f.severity, f.actionPriority ?? '-', f.recommendation ?? '']),
  headStyles: { fillColor: [30, 41, 59] }, // slate-800
  columnStyles: {
    0: { cellWidth: 50 },
    1: { cellWidth: 20 },
    2: { cellWidth: 20 },
    3: { cellWidth: 'auto' },
  },
  didParseCell: (data) => {
    // Color severity column
    if (data.column.index === 1 && data.section === 'body') {
      const colors: Record<string, [number, number, number]> = {
        Critical: [239, 68, 68],
        High: [245, 158, 11],
        Medium: [234, 179, 8],
        Low: [59, 130, 246],
        Info: [100, 116, 139],
      };
      const c = colors[data.cell.raw as string];
      if (c) data.cell.styles.textColor = c;
    }
  },
});

doc.save('report.pdf');
```

### ActionPriorityBadge Component
```typescript
// src/components/ActionPriorityBadge.tsx
const PRIORITY_STYLES = {
  'pre-bid': 'bg-orange-100 text-orange-700',
  'pre-sign': 'bg-blue-100 text-blue-700',
  'monitor': 'bg-slate-100 text-slate-600',
} as const;

const PRIORITY_LABELS = {
  'pre-bid': 'Pre-Bid',
  'pre-sign': 'Pre-Sign',
  'monitor': 'Monitor',
} as const;

interface ActionPriorityBadgeProps {
  priority: 'pre-bid' | 'pre-sign' | 'monitor';
}

export function ActionPriorityBadge({ priority }: ActionPriorityBadgeProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
```

### Bid Signal Reason Text Generation
```typescript
// Addition to src/utils/bidSignal.ts
export function generateFactorReasons(findings: Finding[]): Record<string, string> {
  const reasons: Record<string, string> = {};

  for (const def of FACTOR_DEFS) {
    const matched = findings.filter(def.match);
    if (matched.length === 0) {
      reasons[def.name] = `No ${def.name.toLowerCase()} issues found`;
    } else {
      // Use the highest-severity matched finding's title
      const sorted = [...matched].sort(
        (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      );
      reasons[def.name] = sorted[0].title;
    }
  }

  return reasons;
}

const SEVERITY_RANK: Record<string, number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas + jsPDF | Direct jsPDF API + autoTable | 2023+ | Selectable text, smaller files, better quality |
| Server-side PDF (puppeteer) | Client-side jsPDF | Industry standard for simple reports | No server cost, instant generation |
| jspdf-autotable v2 | jspdf-autotable v3+ | 2021 | Function-style API, better TypeScript support |

**Deprecated/outdated:**
- `doc.autoTable()` method style: Use `autoTable(doc, options)` function style instead (v3+)
- html2pdf.js for text documents: Rasterizes content, use jsPDF directly

## Open Questions

1. **PDF page size and margins**
   - What we know: jsPDF defaults to A4 (210x297mm) with configurable margins
   - What's unclear: Whether US Letter (8.5x11) is preferred for US construction industry
   - Recommendation: Default to Letter size (`new jsPDF({ format: 'letter' })`) since this is a US glazing company

2. **Long clause text wrapping in PDF**
   - What we know: autoTable handles cell text wrapping automatically
   - What's unclear: Very long clauseText fields may create awkward page breaks
   - Recommendation: Truncate clauseText to first ~200 chars in PDF with "..." indicator; full text is in the app

3. **ActionPriority for synthesis findings**
   - What we know: Synthesis pass detects compound risks across passes
   - What's unclear: Whether synthesis findings should also get actionPriority
   - Recommendation: Yes, include actionPriority in synthesis schema; compound risks are often pre-sign items

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUT-01 | PDF report generates and downloads | manual-only | Manual: upload contract, click PDF button, verify download | N/A |
| OUT-02 | Findings display action priority badge | manual-only | Manual: analyze new contract, verify badges appear | N/A |
| OUT-03 | Bid signal shows factor reasons | manual-only | Manual: expand bid signal widget, verify reason text | N/A |
| OUT-04 | Negotiation checklist view works | manual-only | Manual: switch to Negotiation tab, verify grouped items | N/A |

**Justification for manual-only:** No test framework configured. Build + lint catches type errors and import issues. Visual verification required for PDF output quality and UI rendering.

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build green + manual verification of all 4 features

### Wave 0 Gaps
None -- no test infrastructure to set up (project has no test framework per CLAUDE.md).

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/types/contract.ts`, `src/schemas/*.ts`, `api/merge.ts`, `src/utils/bidSignal.ts`, `src/utils/exportContractCsv.ts`, `src/components/BidSignalWidget.tsx`, `src/components/FindingCard.tsx`, `src/pages/ContractReview.tsx`
- [jsPDF GitHub](https://github.com/parallax/jsPDF) - API, capabilities
- [jspdf-autotable GitHub](https://github.com/simonbengtsson/jsPDF-AutoTable) - Table plugin API, styling options

### Secondary (MEDIUM confidence)
- [npm-compare: jsPDF vs pdfmake vs react-pdf](https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf) - Library comparison data
- [Nutrient JS PDF libraries guide 2025](https://www.nutrient.io/blog/javascript-pdf-libraries/) - Ecosystem overview
- [Joyfill PDF comparison 2025](https://joyfill.io/blog/comparing-open-source-pdf-libraries-2025-edition) - Feature comparison

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jsPDF is the clear standard for client-side PDF generation, widely used and well-documented
- Architecture: HIGH - all integration points identified in existing codebase, patterns are extensions of established code
- Pitfalls: HIGH - jsPDF coordinate tracking and TypeScript issues are well-documented in community

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable libraries, 30-day validity)
