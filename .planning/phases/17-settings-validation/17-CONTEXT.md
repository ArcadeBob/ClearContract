# Phase 17: Settings Validation - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get clear feedback when entering invalid data in Settings and confirmation when changes save successfully. Covers inline validation errors on dollar amounts, dates, and employee count fields, plus a "Saved" indicator after persistence. Does not add new Settings fields or change what data is collected.

</domain>

<decisions>
## Implementation Decisions

### Validation scope
- Validate dollar amount fields (10 fields): GL per occurrence, GL aggregate, umbrella, auto, WC employer's liability, bonding single project, bonding aggregate, typical project min/max
- Validate date fields (2 fields): license expiry, DIR expiry — warn on past dates (non-blocking, user may be mid-renewal)
- Validate employee count (1 field): accept number or range format (e.g., "25" or "15-25")
- Free-text fields (license numbers, service area, cert IDs, WC statutory state, SBE fields, LAUSD vendor number) — no validation, any input accepted
- Empty fields are always valid — user might not have all info yet

### Dollar amount format
- Accept flexible input: $1,000,000 or 1000000 or 1,000,000 or $1000000
- Strip dollar signs and commas internally, reject negatives and non-numeric characters
- Auto-format to $X,XXX,XXX on blur (e.g., user types "500000" → field shows "$500,000")
- Empty string is valid (not required)

### Save feedback
- Inline green checkmark + "Saved" text appears next to the field after successful persistence
- Shows only when value actually changed (not on no-op blur)
- Fades in, stays ~2 seconds, fades out (Framer Motion, consistent with app patterns)
- After correcting a validation error, the checkmark shows to confirm the fix saved (red error → fix → green checkmark flow)

### Error presentation
- Red border on input + small red error message below the field (~12px, same size as field labels)
- Field-specific hint messages: "Enter a dollar amount (e.g., $1,000,000)" for money fields, "Enter a number or range (e.g., 15-25)" for employee count
- Date fields: amber/warning "This date has passed" for expired dates (non-blocking)
- Invalid values are blocked from saving — field reverts to last valid value on blur
- Errors clear immediately when user corrects the value

### Persistence timing
- Switch from current onChange (every keystroke) to onBlur-only persistence
- Flow: type freely → blur → validate → auto-format → save to localStorage → show checkmark
- All field types use onBlur consistently (including native date picker)
- Navigation away triggers blur/save — user doesn't lose typed data when clicking sidebar links

### Claude's Discretion
- Exact validation regex patterns for dollar amounts and employee count
- How to handle edge cases (e.g., "$0" — valid or not, very large numbers)
- Green checkmark icon choice from Lucide React
- Exact red/amber color shades for error/warning states
- Whether to refactor ProfileField into a more capable component or add validation wrapper
- Implementation of blur-on-navigate (may be automatic via browser focus behavior)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProfileField` (`src/pages/Settings.tsx`): Simple input component — needs enhancement with validation, error display, and save indicator. Currently accepts label, value, onChange, type props.
- `useCompanyProfile` (`src/hooks/useCompanyProfile.ts`): Manages profile state + localStorage persistence. Currently persists on every keystroke via `updateField` — needs refactoring to onBlur persistence with validation gate.
- `CompanyProfile` type (`src/knowledge/types.ts`): All 20 fields are strings. No field metadata (which are dollars, dates, etc.) — validation rules need to be defined somewhere.
- `DEFAULT_COMPANY_PROFILE` (`src/knowledge/types.ts`): Shows expected formats — dollar fields use "$X,XXX,XXX", dates use "YYYY-MM-DD", employee count uses "15-25" range format.
- Framer Motion: Already used throughout for animations — reuse for save checkmark fade in/out.

### Established Patterns
- Card-based Settings layout with 4 sections, each with icon, title, subtitle, and grid of fields
- `useCompanyProfile` hook pattern: `useState` + `useCallback` + `localStorage.setItem`
- Staggered section animations with `index * 0.1` delay
- Focus ring: `focus:ring-2 focus:ring-blue-500 focus:border-transparent` — error state replaces blue with red

### Integration Points
- `ProfileField` component in `Settings.tsx` — primary modification target
- `useCompanyProfile` hook — persistence logic changes (onChange → onBlur)
- `Settings.tsx` card definitions — field metadata (which fields are dollar, date, etc.) may be added here
- `profileLoader.ts` — reads localStorage, may need awareness of validation for data integrity

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

*Phase: 17-settings-validation*
*Context gathered: 2026-03-13*
