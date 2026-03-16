# ClearContract UAT Checklist

**Version:** v1.6
**Date:** 2026-03-16
**Tester:** _______________
**Environment:** Production (clearcontract.vercel.app)

## Instructions
Run through each section in order. Check the box when the step passes. Note any failures in the "Issues" column.

## Dashboard (Empty State)

- [ ] Navigate to `/` with no contracts -> shows empty dashboard with upload prompt
- [ ] Dashboard stats show 0 contracts, 0 findings, N/A risk score

## Upload & Analyze

- [ ] Click Upload or navigate to `/upload` -> upload zone visible with drag-and-drop area
- [ ] Drag a valid PDF (< 3MB) onto the zone -> file accepted, status changes to "Analyzing"
- [ ] App navigates to review page immediately with loading/analyzing state
- [ ] Analysis completes within 60s -> findings, risk score, dates displayed
- [ ] Try uploading a non-PDF file -> rejection error message shown
- [ ] Try uploading a PDF > 3MB -> size limit error message shown

## Review Findings

- [ ] Contract review page shows risk score badge with color (red/amber/yellow/green)
- [ ] Findings list displays all findings with severity badges (Critical/High/Medium/Low/Info)
- [ ] Each finding shows: title, description, clause reference, clause text, recommendation
- [ ] Bid signal indicator displays (bid/caution/no-bid)
- [ ] Dates/milestones section shows extracted dates

## Resolve & Annotate Findings

- [ ] Click resolve on a finding -> finding marked as resolved with visual change
- [ ] Add a note to a finding -> note persists when navigating away and back
- [ ] Unresolve a finding -> reverts to unresolved state

## Filter Findings

- [ ] Filter toolbar shows category and severity filter options
- [ ] Select a severity filter -> only findings of that severity shown
- [ ] Select a category filter -> only findings of that category shown
- [ ] Combine severity + category filters -> intersection displayed
- [ ] Clear filters -> all findings visible again
- [ ] Filter selections persist across page navigation

## CSV Export

- [ ] Click CSV export button -> downloads a .csv file
- [ ] CSV contains all visible (filtered) findings with correct columns
- [ ] CSV respects active filters (exports only what's shown)

## PDF Export

- [ ] Click PDF export button -> downloads a .pdf report
- [ ] PDF contains contract summary, risk score, and findings

## All Contracts View

- [ ] Navigate to `/contracts` -> shows list of all analyzed contracts
- [ ] Each contract card shows name, risk score, date, finding count
- [ ] Click a contract -> navigates to its review page

## Contract Comparison

- [ ] Select two contracts for comparison -> comparison view loads
- [ ] Side-by-side risk scores and finding summaries displayed

## Re-analyze

- [ ] On review page, click re-analyze -> contract re-enters analyzing state
- [ ] New analysis completes and updates findings/scores

## Settings

- [ ] Navigate to `/settings` -> settings page loads
- [ ] Settings form validates input on blur

## URL Routing

- [ ] Direct navigation to `/upload` loads upload page
- [ ] Direct navigation to `/contracts` loads all contracts
- [ ] Direct navigation to `/settings` loads settings
- [ ] Browser back/forward buttons work correctly
- [ ] Refreshing the page maintains the current view

## Empty States

- [ ] Dashboard with no contracts shows appropriate empty state
- [ ] Contracts list with no contracts shows appropriate empty state
- [ ] Filters that match no findings show "no results" message

## Vercel Pro Configuration (UAT-04)

- [ ] Verify `vercel.json` contains `"maxDuration": 300` for `api/analyze.ts`
- [ ] Upload a long/complex contract (10+ pages) -> analysis completes without timeout
- [ ] Confirm the deployed endpoint does NOT timeout at 60s (old limit)

---
## Results Summary

| Section | Pass | Fail | Notes |
|---------|------|------|-------|
| Dashboard (Empty State) | | | |
| Upload & Analyze | | | |
| Review Findings | | | |
| Resolve & Annotate | | | |
| Filter Findings | | | |
| CSV Export | | | |
| PDF Export | | | |
| All Contracts View | | | |
| Contract Comparison | | | |
| Re-analyze | | | |
| Settings | | | |
| URL Routing | | | |
| Empty States | | | |
| Vercel Pro Config | | | |

**Overall Result:** PASS / FAIL
**Tested by:** _______________
**Date completed:** _______________
