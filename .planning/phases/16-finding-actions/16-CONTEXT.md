# Phase 16: Finding Actions - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can track remediation progress by resolving findings and adding notes during contract review. Resolve is a toggleable state per finding. Notes are plain-text user annotations (add, edit, delete). A "Hide resolved" filter removes resolved findings from view. Resolved counts appear in the risk summary and per-category headers.

</domain>

<decisions>
## Implementation Decisions

### Resolve interaction
- Resolve button is a small checkmark icon in the top-right corner of FindingCard, next to the severity badge
- Single-click toggle — no confirmation needed (easily reversible)
- Resolved findings get muted styling: 60% opacity, strikethrough title, green checkmark icon
- Resolved findings stay in their original position (no re-sorting)

### Notes experience
- "Add note" trigger is a subtle text link (`+ Add note`) at the bottom of the FindingCard
- Clicking opens an inline textarea that expands below the finding content (no modal)
- Textarea has Save and Cancel buttons
- Saved notes display as a styled block on the card — purple/violet tint to distinguish user notes from AI-generated content (Recommendation=blue, Why This Matters=amber, Negotiation=emerald, User Note=purple)
- Note block shows "YOUR NOTE" label with edit (pencil) and delete (×) icon buttons
- Editing a note re-opens the inline textarea pre-filled with existing text
- Deleting a note requires confirmation (destructive — typed content can't be recovered)

### Hide resolved filter
- Toggle lives in the view controls area, next to the existing By Category / By Severity / Coverage toggles
- Checkbox-style toggle labeled "Hide resolved"
- Default state: off (show all findings)
- When toggled on and a finding is resolved, the finding animates out using Framer Motion AnimatePresence
- Toggle preference persists in localStorage across sessions

### Resolved counts display
- Overall count as parenthetical next to existing findings count: "12 Findings (5 resolved)"
- Per-category counts in CategorySection headers: "Legal Issues (2 of 5 resolved)"
- When all findings in a category are resolved, the section header gets a green checkmark icon

### Claude's Discretion
- Exact icon choices for resolve/edit/delete buttons (from Lucide React)
- Textarea sizing and character limits
- Purple/violet shade selection for note blocks
- Animation timing for resolve/hide transitions
- How "Hide resolved" interacts with empty state (all resolved + hide = show message?)
- localStorage key naming for hide-resolved preference

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FindingCard` (`src/components/FindingCard.tsx`): Primary target — needs resolve button, note display, and "Add note" trigger added. Currently a clean card with severity badge, clause quote, recommendation, explanation, negotiation position, and meta badges.
- `ConfirmDialog` (`src/components/ConfirmDialog.tsx`): Already exists — reuse for note delete confirmation.
- `CategorySection` (`src/components/CategorySection.tsx`): Renders category headers — needs resolved count and green checkmark when fully resolved.
- `SeverityBadge` (`src/components/SeverityBadge.tsx`): Existing badge pattern to follow for consistent styling.
- `AnimatePresence` from Framer Motion: Already used in ContractReview for filtered lists — reuse for hide-resolved animations.

### Established Patterns
- Colored info blocks on FindingCard: blue (Recommendation), amber (Why This Matters), emerald (Negotiation Position) — user notes follow same pattern with purple/violet
- `useContractStore` manages contract data with localStorage persistence via `updateContract()` — finding actions (resolve, notes) persist through this existing mechanism
- `useCompanyProfile` uses onBlur persistence pattern — notes could use Save button persistence
- Staggered animation with `index * 0.05` delay pattern throughout the app

### Integration Points
- `Finding` type (`src/types/contract.ts`): Needs optional `resolved` and `note` fields added (nullish coalescing for backward compatibility with existing contracts)
- `ContractReview` (`src/pages/ContractReview.tsx`): Needs "Hide resolved" toggle in view controls, resolved counts in summary stats, and per-category counts
- `useContractStore`: Needs methods to update individual finding state (resolve toggle, note CRUD)
- CategoryFilter area: Existing filter controls row where "Hide resolved" toggle will live

</code_context>

<specifics>
## Specific Ideas

- Note blocks should feel like a natural extension of the existing colored info blocks on FindingCard — same border/background pattern, just with a distinct purple/violet color that immediately reads as "user-added" vs "AI-generated"
- The resolve checkmark should be subtle when unresolved (outline/ghost style) and solid green when resolved

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-finding-actions*
*Context gathered: 2026-03-13*
