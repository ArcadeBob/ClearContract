# Phase 18: Re-analyze Contract - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can re-run AI analysis on a contract from the review page by re-selecting the PDF file. If re-analysis fails, the previous analysis remains intact. Does not add diff view, auto-triggering, or PDF storage.

</domain>

<decisions>
## Implementation Decisions

### Re-analyze trigger
- Button goes in the review page header action row, between Share and Export Report: [Delete] [Share] [Re-analyze] [Export Report]
- Outlined/secondary button style (not filled), consistent with Delete and Share buttons
- RefreshCw icon from Lucide React + "Re-analyze" label
- Clicking opens a confirmation dialog before proceeding (not immediate file picker)
- Confirmation dialog message: "Re-analyzing will replace all current findings, including any resolved status and notes you've added. Select a PDF to continue." with [Cancel] and [Select PDF] buttons
- Reuses existing ConfirmDialog component

### PDF re-selection
- After user confirms, browser's native file dialog opens immediately (no custom dropzone modal)
- Accepts any PDF file (not restricted to original filename)
- On successful re-analysis, contract name updates to match the new PDF's filename (minus .pdf extension)
- Same 10MB max and PDF-only validation as initial upload (reuse analyzeContract function)

### In-progress state
- User stays on the review page — no navigation
- Loading overlay/banner appears at the top of the findings area with "Re-analyzing contract..." text and spinner
- Existing findings remain visible below but dimmed/disabled (pointer-events: none, reduced opacity)
- Re-analyze button stays visible but disabled with a spinner icon replacing RefreshCw
- No cancel option — analysis runs to completion once started
- After successful re-analysis: green success toast "Analysis complete — findings updated." using existing Toast component

### Data preservation
- Clean slate on success: all findings replaced wholesale, resolved statuses and notes are lost
- Confirmation dialog explicitly warns about this before proceeding
- On failure: previous analysis remains completely untouched (findings, resolved states, notes all intact) — satisfies REANA-03
- Error toast on failure: "Analysis failed. Your previous findings are unchanged."
- Network errors (failed to fetch) show retry button on toast (re-opens file picker); API errors show just the message — matches existing upload error pattern
- "Hide resolved" toggle state preserved in localStorage regardless of re-analysis outcome

### Claude's Discretion
- Exact overlay/dimming implementation (CSS overlay vs opacity on container)
- How to snapshot previous contract state for rollback (deep clone vs separate ref)
- Spinner animation on the disabled button
- Toast auto-dismiss timing
- Whether to update uploadDate on re-analysis

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `analyzeContract(file)` (`src/api/analyzeContract.ts`): Full analysis pipeline — base64 encode, POST to /api/analyze, return structured AnalysisResult. Reuse directly for re-analysis.
- `handleUploadComplete(file)` (`src/App.tsx`): Shows the pattern for creating placeholder → analyzing → updating contract. Re-analyze flow will follow similar pattern but update existing contract instead of creating new one.
- `ConfirmDialog` (`src/components/ConfirmDialog.tsx`): Reuse for the "are you sure" confirmation before re-analysis.
- `Toast` (`src/components/Toast.tsx`): Reuse for success and error feedback. Already supports `onRetry` callback for network errors.
- `AnalysisProgress` (`src/components/AnalysisProgress.tsx`): Existing spinner component — may inform the loading overlay design.
- `isNetworkError()` (`src/App.tsx`): Existing helper to distinguish network vs API errors for retry logic.

### Established Patterns
- `updateContract(id, updates)` in `useContractStore`: Partial update with localStorage persistence — use for updating contract with new analysis results.
- Error handling pattern: network errors get retry button, API errors get plain message (handleUploadComplete in App.tsx).
- Toast state managed via `useState<ToastData | null>` in App.tsx.
- Contract status field: 'Analyzing' | 'Reviewed' — can set to 'Analyzing' during re-analysis, back to 'Reviewed' on completion.

### Integration Points
- `ContractReview` component: Needs new `onReanalyze` prop (callback accepting File) + `isReanalyzing` prop for overlay state.
- `App.tsx`: New `handleReanalyze(contractId, file)` function alongside existing `handleUploadComplete`.
- Header action row in `ContractReview.tsx` (line ~179-195): Add Re-analyze button between Share and Export Report.
- Hidden file input element: Needed for programmatic native file dialog trigger after confirmation.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Diff view showing what changed after re-analysis (REANA-04, REANA-05 — already in REQUIREMENTS.md as v1.4+ future requirements)

</deferred>

---

*Phase: 18-re-analyze-contract*
*Context gathered: 2026-03-13*
