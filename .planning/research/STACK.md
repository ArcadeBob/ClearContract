# Technology Stack

**Project:** ClearContract v1.3 -- Workflow Completion
**Researched:** 2026-03-12
**Confidence:** HIGH

## Context

ClearContract v1.2 has a validated stack: React 18, TypeScript (strict), Vite, Tailwind CSS, Framer Motion, Anthropic SDK, unpdf, Zod v3, localStorage persistence, Lucide React, React Dropzone, Vercel serverless. This research covers ONLY the stack additions needed for v1.3 features: Export Report (PDF/CSV), Settings Validation + Save Feedback, URL-based Routing, Re-analyze Contract, and Finding Actions (Resolve/Annotate).

## Recommended Stack Additions

### PDF Export: jsPDF + jspdf-autotable

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| jspdf | ^4.2.0 | Client-side PDF generation | Mature library (30K+ GitHub stars, 2.6M weekly npm downloads). Client-side only -- no server round-trip needed. v4.0+ patches CVE-2025-68428 (a path traversal affecting Node.js builds only, not exploitable in browser, but use patched version). Ships TypeScript declarations. |
| jspdf-autotable | ^5.0.7 | Table rendering in generated PDFs | Contract reports need structured tables for findings, dates, risk scores, and bid signals. jspdf-autotable handles column widths, cell wrapping, page breaks, and styling automatically. 496 npm dependents. Ships TypeScript declarations. |

**Why jsPDF over alternatives:**
- **pdfmake**: Heavier bundle (~300KB vs ~200KB for jsPDF). JSON-declarative API is elegant but unnecessary for a known, fixed report layout. jsPDF gives more direct control over positioning and styling.
- **react-to-pdf / html2canvas**: Converts rendered React components to PDF via screenshot. Produces image-based PDFs -- no selectable text, large file sizes, poor print quality. Not suitable for a professional contract report that needs to be shared with project managers and attorneys.
- **@react-pdf/renderer**: React component-based PDF builder with its own layout engine. Adds ~400KB+ to the bundle and introduces a parallel rendering model. Overkill when the report is a linear document with tables, not a complex multi-column layout.

### CSV Export: No library needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native JS | N/A | CSV generation and download | CSV generation is trivial: join arrays with commas, escape fields containing commas/quotes with double-quoting, create a Blob with `text/csv` MIME type, trigger download via a temporary anchor element. Adding papaparse (a CSV parser, not generator) or file-saver (5 lines of native code) would be unnecessary dependencies. |

### URL-based Routing: wouter

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| wouter | ^3.9.0 | Client-side routing with browser History API | 1.5KB gzipped -- practically zero bundle cost. Hooks-first API (`useLocation`, `useRoute`, `useParams`) matches existing codebase conventions. Supports browser history (back/forward navigation), hash location fallback, route parameters, and nested routes. 165 npm dependents. Ships TypeScript declarations with inferred route params. |

**Why wouter over alternatives:**
- **React Router v7 (7.13.1)**: Has evolved into a Remix-style framework with data loaders, actions, and server-side rendering conventions. Massive API surface (~14KB gzipped) for what this app needs: 5 flat routes. The framework-oriented mental model does not match this project's simple SPA architecture.
- **TanStack Router**: Excellent type-safe router with search param management, route loaders, and nested layouts. Designed for complex applications. At ~30KB gzipped with a steep learning curve, it is overkill for 5 routes with no data loading needs.
- **Custom History API wrapper**: Could be built in ~100 lines, but wouter at 1.5KB is battle-tested, handles edge cases (popstate events, base paths, SSR compatibility), and eliminates maintenance burden for essentially free bundle cost.
- **No router (current approach)**: The ViewState approach cannot support URL-based deep links or browser back/forward. The requirement explicitly calls for these capabilities.

**Integration approach:**

The existing `navigateTo(view, contractId?)` function and `activeView` state in `useContractStore` get replaced by wouter's URL-based routing. Route mapping:

| Current ViewState | URL Path | Route Pattern |
|-------------------|----------|---------------|
| `'dashboard'` | `/` | `/` |
| `'upload'` | `/upload` | `/upload` |
| `'review'` | `/review/c-123456` | `/review/:id` |
| `'contracts'` | `/contracts` | `/contracts` |
| `'settings'` | `/settings` | `/settings` |

The `activeContractId` is derived from the `:id` route parameter on the review page via `useParams()`. The `ViewState` type can be retired or kept as a derived value from the current URL for backward compatibility with components that reference it.

### Settings Validation: No library needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native validation logic | N/A | Field validation + save confirmation | The settings form has ~20 fields: dollar amounts, dates, license numbers, free text. Validation rules are straightforward format checks. A dedicated validation or form library would be overkill for one form. Write a `validateCompanyProfile()` function with explicit rules per field. |

**Note on Zod reuse:** Zod v3 is already a dependency for server-side structured output schemas. It could technically validate settings client-side, but importing Zod into the client bundle adds ~13KB gzipped for what amounts to a handful of string format checks. Keep Zod server-side only. If validation logic later grows complex enough to warrant Zod, the dependency is already installed -- just import it.

### Re-analyze Contract: No new dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing stack | N/A | Re-trigger analysis pipeline | The analysis pipeline already exists (`analyzeContract()` client wrapper, `api/analyze.ts` serverless function). Re-analyze requires: (1) retaining the PDF file after initial upload, (2) calling the same pipeline again, (3) replacing findings/dates/riskScore on the existing contract record. |

**PDF retention strategy:** The original `File` object is currently consumed during upload and discarded. Two options:

| Approach | Storage | Survives Refresh | Size Impact |
|----------|---------|------------------|-------------|
| In-memory `Map<contractId, File>` | RAM | No | None on localStorage |
| Base64 in localStorage alongside contract | localStorage | Yes | ~1.3x file size (base64 overhead) on a 10MB max PDF |

**Recommendation:** In-memory `Map<string, File>`. Re-analyze is a session-level action (user changes company profile, then re-runs analysis). Persisting multi-megabyte base64 strings in localStorage would quickly hit the ~5MB browser quota and conflict with the existing contract data storage. If the user refreshes, they can re-upload -- this matches the current UX expectations where data persistence is a convenience, not a guarantee.

### Finding Actions (Resolve/Annotate): No new dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing stack | N/A | Mark findings resolved, add annotations | Pure data model extension + UI. Add `resolved?: boolean`, `resolution?: string`, `annotations?: string[]` to the `Finding` interface. UI built with existing Tailwind + Framer Motion. Persisted via existing localStorage mechanism through `useContractStore`. |

## What NOT to Add

| Library | Why Not |
|---------|---------|
| react-hook-form / formik | One form in the app (Settings). Native controlled inputs with a validate function is simpler and consistent with existing patterns. |
| papaparse | Designed for parsing complex CSVs, not generating simple ones. Native generation is trivial. |
| file-saver | The `saveAs` pattern is 5 lines of code: `const blob = new Blob([data]); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()`. |
| html2canvas | Produces image-based PDFs. Not suitable for professional text-based reports. |
| @react-pdf/renderer | Elegant API but ~400KB+ bundle. jsPDF + autotable covers the use case at 1/5 the cost. |
| react-router / react-router-dom v7 | Evolved into a framework (Remix merger). ~14KB gzipped, complex API surface, loader/action patterns. 10x the bundle size of wouter for features this app does not need. |
| tanstack-router | Type-safe but ~30KB gzipped. Designed for complex nested routing with search param management. Overkill for 5 flat routes. |
| zustand / jotai / redux | State management is fine with useState + props. The app has 5 views, one store hook, and straightforward data flow. Adding a state library is premature. |
| zod (client-side) | Already a server dependency but adds ~13KB to client bundle. Not worth it for ~20 simple field checks. |

## Installation

```bash
# New dependencies for v1.3
npm install jspdf@^4.2.0 jspdf-autotable@^5.0.7 wouter@^3.9.0
```

**Bundle impact estimate:**

| Package | Minified | Gzipped | Notes |
|---------|----------|---------|-------|
| jspdf | ~200KB | ~65KB | Lazy-load via dynamic `import()` -- zero impact on initial page load |
| jspdf-autotable | ~45KB | ~14KB | Loaded alongside jspdf only when user clicks Export |
| wouter | ~4KB | ~1.5KB | Loaded on every page (routing is always needed) |
| **Total** | **~249KB** | **~80.5KB** | Only ~1.5KB affects initial load; ~79KB is lazy-loaded on export |

**Lazy loading strategy for PDF export:**
```typescript
async function exportToPdf(contract: Contract) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable'); // side-effect import extends jsPDF prototype
  const doc = new jsPDF();
  // ... generate report
  doc.save(`${contract.name}-report.pdf`);
}
```

This keeps the ~79KB PDF bundle out of the critical path entirely. Users who never export pay zero cost.

## TypeScript Considerations

All three new dependencies ship with built-in TypeScript declarations. No `@types/*` packages needed.

- **jspdf**: Full type support for document creation, text, images, and save methods.
- **jspdf-autotable**: Extends the `jsPDF` class with a typed `autoTable()` method. Import side-effect augments the jsPDF type.
- **wouter**: Route params are type-inferred from path pattern strings (e.g., `/review/:id` infers `{ id: string }`).

## Vercel Deployment Impact

None of the new dependencies affect the serverless function. jsPDF and wouter are client-side only. The `api/analyze.ts` endpoint remains unchanged. No new environment variables needed.

**Critical: Vercel rewrite rule for client-side routing.** With wouter using the History API, direct navigation to `/review/c-123456` would return a Vercel 404 because no file exists at that path. Add a catch-all rewrite to `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

This sends all non-API requests to `index.html`, where wouter picks up the URL and renders the correct view. The negative lookahead `(?!api/)` preserves the existing `/api/analyze` serverless function route.

## Integration Summary

| Feature | New Dependencies | Integration Point | Complexity |
|---------|-----------------|-------------------|------------|
| PDF Export | jspdf, jspdf-autotable | New `exportPdf()` utility, lazy-loaded from ContractReview page | Medium -- report layout design, table formatting, multi-page handling |
| CSV Export | None | New `exportCsv()` utility, called from ContractReview page | Low -- string concatenation + Blob download |
| URL Routing | wouter | Replace `useContractStore` navigation with wouter routes in `App.tsx` | Medium -- rewire navigation across all components, add Vercel rewrite |
| Settings Validation | None | New `validateCompanyProfile()` function, toast/inline feedback in Settings page | Low -- format checks on ~20 fields |
| Re-analyze | None | Store File in memory Map, add re-analyze button to ContractReview, call existing pipeline | Low-Medium -- file retention + UI for re-analysis state |
| Finding Actions | None | Extend Finding type, add resolve/annotate UI to FindingCard, persist via existing store | Low-Medium -- data model + UI components |

## Sources

- [jspdf on npm](https://www.npmjs.com/package/jspdf) -- v4.2.0, last published ~21 days ago (HIGH confidence)
- [jspdf-autotable on npm](https://www.npmjs.com/package/jspdf-autotable) -- v5.0.7, last published ~2 months ago (HIGH confidence)
- [wouter on npm](https://www.npmjs.com/package/wouter) -- v3.9.0, last published ~3 months ago (HIGH confidence)
- [wouter GitHub](https://github.com/molefrog/wouter) -- ~2.2KB gzipped, hooks-first API, hash location + History API support (HIGH confidence)
- [CVE-2025-68428 GitHub Advisory](https://github.com/advisories/GHSA-f8cm-6447-x5h2) -- jsPDF path traversal, fixed in v4.0.0, affects Node.js builds only (HIGH confidence)
- [jsPDF GitHub](https://github.com/parallax/jsPDF) -- 30.4K stars, actively maintained by yWorks (HIGH confidence)
- [React Router on npm](https://www.npmjs.com/package/react-router) -- v7.13.1, evaluated and rejected for this use case (HIGH confidence)
- [TanStack Router](https://tanstack.com/router/latest) -- Evaluated and rejected: overkill for 5 flat routes (MEDIUM confidence)

---
*Stack research for: ClearContract v1.3 Workflow Completion*
*Researched: 2026-03-12*
