# Phase 17: Settings Validation - Research

**Researched:** 2026-03-13
**Domain:** Form validation, input formatting, inline feedback (React + Tailwind)
**Confidence:** HIGH

## Summary

This phase adds inline validation, auto-formatting, and save feedback to the existing Settings page. The scope is narrow and well-defined: 10 dollar fields need format validation and auto-formatting on blur, 2 date fields need past-date warnings, 1 employee count field needs number/range validation, and all validated fields show a "Saved" checkmark after successful persistence. The current `ProfileField` component and `useCompanyProfile` hook need targeted enhancements but no architectural rethinking.

The primary change is switching from onChange persistence (every keystroke) to onBlur persistence with a validate-then-format-then-save pipeline. This is a standard HTML form pattern. No external validation library is needed -- the validation rules are simple regex checks on 3 field types. Framer Motion (already installed) handles the checkmark fade animation.

**Primary recommendation:** Enhance `ProfileField` with field-type metadata, add a validation utility module, and refactor `useCompanyProfile` to support onBlur persistence with validation gating.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Validate dollar amount fields (10 fields): GL per occurrence, GL aggregate, umbrella, auto, WC employer's liability, bonding single project, bonding aggregate, typical project min/max
- Validate date fields (2 fields): license expiry, DIR expiry -- warn on past dates (non-blocking, user may be mid-renewal)
- Validate employee count (1 field): accept number or range format (e.g., "25" or "15-25")
- Free-text fields (license numbers, service area, cert IDs, WC statutory state, SBE fields, LAUSD vendor number) -- no validation, any input accepted
- Empty fields are always valid -- user might not have all info yet
- Accept flexible dollar input: $1,000,000 or 1000000 or 1,000,000 or $1000000
- Strip dollar signs and commas internally, reject negatives and non-numeric characters
- Auto-format to $X,XXX,XXX on blur
- Inline green checkmark + "Saved" text appears next to the field after successful persistence
- Shows only when value actually changed (not on no-op blur)
- Fades in, stays ~2 seconds, fades out (Framer Motion)
- Red border on input + small red error message below the field (~12px)
- Date fields: amber/warning "This date has passed" for expired dates (non-blocking)
- Invalid values are blocked from saving -- field reverts to last valid value on blur
- Switch from onChange to onBlur-only persistence
- Flow: type freely -> blur -> validate -> auto-format -> save to localStorage -> show checkmark
- All field types use onBlur consistently (including native date picker)

### Claude's Discretion
- Exact validation regex patterns for dollar amounts and employee count
- How to handle edge cases (e.g., "$0" -- valid or not, very large numbers)
- Green checkmark icon choice from Lucide React
- Exact red/amber color shades for error/warning states
- Whether to refactor ProfileField into a more capable component or add validation wrapper
- Implementation of blur-on-navigate (may be automatic via browser focus behavior)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SET-01 | User sees inline validation errors on invalid dollar amounts or dates in Settings | Validation utility with field-type metadata, red border/error message pattern, amber warning for dates |
| SET-02 | User sees "Saved" feedback after Settings fields persist successfully | Framer Motion AnimatePresence checkmark, onBlur persistence with change detection |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | ^18.3.1 | Component framework | Already in project |
| Framer Motion | ^11.5.4 | Checkmark fade animation | Already in project, used throughout |
| Lucide React | 0.522.0 | Check icon for "Saved" indicator | Already in project |
| Tailwind CSS | (project) | Error/warning styling | Already in project |

### No New Dependencies Needed

This phase requires zero new packages. Validation is simple enough for hand-written utilities (3 regex patterns). The existing stack covers all needs:
- `Check` or `CheckCircle2` from lucide-react for the saved indicator (both already imported elsewhere in the project)
- `AnimatePresence` + `motion.span` from framer-motion for fade in/out
- Tailwind classes for red border (`border-red-300`), error text (`text-red-500`), amber warning (`text-amber-500`)

## Architecture Patterns

### Recommended Approach: Enhanced ProfileField

Rather than creating a wrapper component, enhance the existing `ProfileField` inline component in `Settings.tsx` with new props. This keeps the single-file simplicity.

```
src/
├── pages/Settings.tsx           # Enhanced ProfileField + field metadata on cards
├── hooks/useCompanyProfile.ts   # Add validateAndSave(), keep updateField for free-text
└── utils/settingsValidation.ts  # NEW: validation + formatting functions
```

### Pattern 1: Field Type Metadata

**What:** Each field in the `CardSection.fields` array gets a `fieldType` discriminator that drives validation behavior.
**When to use:** When rendering ProfileField, pass fieldType to determine validation rules.

```typescript
type FieldType = 'dollar' | 'date' | 'employeeCount' | 'text';

// In card definitions:
fields: [
  { label: 'GL Per Occurrence', key: 'glPerOccurrence', fieldType: 'dollar' as const },
  { label: 'License Expiry', key: 'contractorLicenseExpiry', type: 'date', fieldType: 'date' as const },
  { label: 'Employee Count', key: 'employeeCount', fieldType: 'employeeCount' as const },
  { label: 'Service Area', key: 'serviceArea', fieldType: 'text' as const },
]
```

### Pattern 2: Validation Utility Module

**What:** Pure functions for validation and formatting, no React dependencies.

```typescript
// src/utils/settingsValidation.ts

interface ValidationResult {
  valid: boolean;
  error?: string;      // error message for invalid
  warning?: string;    // warning message (non-blocking, e.g., past date)
  formatted?: string;  // auto-formatted value (e.g., "$500,000")
}

function validateDollar(raw: string): ValidationResult { ... }
function validateDate(raw: string): ValidationResult { ... }
function validateEmployeeCount(raw: string): ValidationResult { ... }

function validateField(value: string, fieldType: FieldType): ValidationResult {
  if (value === '') return { valid: true }; // empty always valid
  switch (fieldType) {
    case 'dollar': return validateDollar(value);
    case 'date': return validateDate(value);
    case 'employeeCount': return validateEmployeeCount(value);
    default: return { valid: true };
  }
}
```

### Pattern 3: OnBlur Persistence Flow

**What:** ProfileField manages local input state, validates on blur, persists only valid values.

```typescript
// Inside ProfileField:
const [localValue, setLocalValue] = useState(value);
const [error, setError] = useState<string | null>(null);
const [warning, setWarning] = useState<string | null>(null);
const [showSaved, setShowSaved] = useState(false);

const handleBlur = () => {
  const result = validateField(localValue, fieldType);
  if (!result.valid) {
    setError(result.error!);
    setLocalValue(value); // revert to last valid
    return;
  }
  setError(null);
  setWarning(result.warning || null);
  const finalValue = result.formatted || localValue;
  setLocalValue(finalValue);
  if (finalValue !== value) {
    onSave(finalValue); // persist to localStorage
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }
};
```

### Pattern 4: Saved Indicator Animation

**What:** AnimatePresence wrapping a motion.span with the checkmark icon.

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

<AnimatePresence>
  {showSaved && (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="inline-flex items-center gap-1 text-xs text-emerald-600"
    >
      <Check className="w-3 h-3" />
      Saved
    </motion.span>
  )}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Controlled-only with onChange persistence:** Current pattern saves every keystroke. Must switch to local state + onBlur.
- **Global error state:** Don't store validation errors in the hook or a context. Keep them local to each ProfileField instance.
- **Blocking on date warnings:** Past-date is a warning (amber), not an error. Must still save the value.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dollar formatting | Custom number formatting | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })` | Handles commas, dollar sign, locale edge cases |
| Fade animations | CSS transitions with class toggling | Framer Motion AnimatePresence | Already used throughout, handles mount/unmount |

**Key insight:** `Intl.NumberFormat` handles the `$X,XXX,XXX` formatting requirement perfectly and is built into all browsers. No need for manual comma insertion.

## Common Pitfalls

### Pitfall 1: Stale Closure in setTimeout
**What goes wrong:** The `showSaved` timeout references stale state if component re-renders.
**Why it happens:** setTimeout callback captures the state at creation time.
**How to avoid:** Use `useRef` for the timer ID and clear on unmount/re-trigger. Or use a simple boolean state with setTimeout -- since we only set it to false, stale closure is not an issue for this specific case.
**Warning signs:** "Saved" indicator stays visible or doesn't appear.

### Pitfall 2: Blur Fires Before Navigation Click
**What goes wrong:** User clicks a sidebar link, blur fires on the current field, but navigation happens before save completes.
**Why it happens:** Browser focus behavior: clicking another element triggers blur on the focused element synchronously before the click handler.
**How to avoid:** This actually works in our favor -- blur fires synchronously, setState + localStorage.setItem are synchronous, so save completes before navigation. No special handling needed.
**Warning signs:** None expected -- this is the desired behavior.

### Pitfall 3: Native Date Input Blur Behavior
**What goes wrong:** Native `<input type="date">` may fire blur when the date picker dropdown opens/closes.
**Why it happens:** Browser-specific behavior with date picker popups.
**How to avoid:** Validate only when the value actually changed from the last saved value. The `if (finalValue !== value)` check prevents spurious saves.
**Warning signs:** "Saved" indicator appearing when user just opens/closes the date picker without changing the value.

### Pitfall 4: Revert to Last Valid on Invalid + Re-blur
**What goes wrong:** User enters "abc", field reverts to "$1,000,000" on blur, but error message stays visible.
**Why it happens:** Error state not cleared when value reverts.
**How to avoid:** Clear error after a brief delay (e.g., 2 seconds) or clear immediately on the next focus event. The decision says "errors clear immediately when user corrects the value" -- so clear on the next onChange or onFocus.
**Warning signs:** Error message visible on a field showing a valid value.

### Pitfall 5: useEffect Sync Between Parent Value and Local State
**What goes wrong:** If parent passes a new `value` prop (e.g., after loading from localStorage on mount), local state gets out of sync.
**Why it happens:** `useState(value)` only uses the initial value; subsequent prop changes are ignored.
**How to avoid:** Add a `useEffect` that syncs local state when the `value` prop changes (but only when the field is not focused, to avoid overwriting user typing).
**Warning signs:** Field shows stale value after page load or external profile update.

## Code Examples

### Dollar Validation and Formatting

```typescript
// src/utils/settingsValidation.ts

const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function validateDollar(raw: string): ValidationResult {
  if (raw.trim() === '') return { valid: true };

  // Strip $ and commas, then check if it's a valid non-negative number
  const stripped = raw.replace(/[$,\s]/g, '');
  if (stripped === '') return { valid: true };

  if (!/^\d+(\.\d+)?$/.test(stripped)) {
    return {
      valid: false,
      error: 'Enter a dollar amount (e.g., $1,000,000)',
    };
  }

  const num = parseFloat(stripped);
  // $0 is valid (some fields may legitimately be zero)
  const formatted = dollarFormatter.format(num);
  return { valid: true, formatted };
}
```

### Employee Count Validation

```typescript
export function validateEmployeeCount(raw: string): ValidationResult {
  if (raw.trim() === '') return { valid: true };

  const trimmed = raw.trim();
  // Accept: "25" or "15-25" (with optional spaces around dash)
  if (/^\d+(\s*-\s*\d+)?$/.test(trimmed)) {
    // Normalize: remove spaces around dash
    const formatted = trimmed.replace(/\s*-\s*/, '-');
    return { valid: true, formatted };
  }

  return {
    valid: false,
    error: 'Enter a number or range (e.g., 15-25)',
  };
}
```

### Date Warning (Non-Blocking)

```typescript
export function validateDate(raw: string): ValidationResult {
  if (raw.trim() === '') return { valid: true };

  // Native date input gives YYYY-MM-DD format
  const date = new Date(raw + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Enter a valid date' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    return { valid: true, warning: 'This date has passed' };
  }

  return { valid: true };
}
```

### Enhanced ProfileField Signature

```typescript
function ProfileField({
  label,
  value,
  onSave,       // renamed from onChange -- called only on blur with validated value
  type = 'text',
  fieldType = 'text',
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  fieldType?: FieldType;
}) {
  // Local state for typing
  // Validation on blur
  // Error/warning display
  // Saved indicator with AnimatePresence
}
```

### Hook Refactoring

```typescript
// useCompanyProfile.ts -- minimal change
// Keep updateField for programmatic use, add saveField for blur-based persistence

const saveField = useCallback(
  <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setProfile((prev) => {
      if (prev[key] === value) return prev; // no-op check
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Quota exceeded
      }
      return next;
    });
  },
  []
);

return { profile, updateField, saveField };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Controlled inputs with onChange save | Local state + onBlur save | Standard pattern | Prevents keystroke-level persistence, enables validation gate |
| Custom comma formatting | `Intl.NumberFormat` | Long-standing browser API | Zero-dependency, locale-aware formatting |
| CSS class toggle for show/hide | Framer Motion AnimatePresence | Already adopted in project | Smooth mount/unmount animations |

## Open Questions

1. **$0 validity**
   - What we know: "$0" parses as a valid number and formats correctly.
   - Recommendation: Treat $0 as valid. It is a legitimate value (e.g., a field that doesn't apply). No business rule requires minimum amounts.

2. **Very large numbers**
   - What we know: JavaScript numbers are safe up to `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991). `Intl.NumberFormat` handles large values.
   - Recommendation: No upper bound check needed. If someone enters $999,999,999,999 that is their data.

3. **Blur-on-navigate implementation**
   - What we know: Browser behavior triggers blur synchronously when focus moves (including clicking sidebar links). Since `localStorage.setItem` is synchronous, the save completes before React unmounts the Settings page.
   - Recommendation: No special handling needed. Standard browser blur behavior handles this correctly.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `Settings.tsx`, `useCompanyProfile.ts`, `profileLoader.ts`, `types.ts` -- direct inspection
- MDN `Intl.NumberFormat` -- well-established browser API, universal support
- Framer Motion AnimatePresence -- already used in 6+ components in this project

### Secondary (MEDIUM confidence)
- Browser blur event ordering (blur fires before click on new element) -- consistent across modern browsers, verified behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all tools already in project
- Architecture: HIGH - straightforward React form pattern (local state + onBlur)
- Pitfalls: HIGH - well-known React form patterns, no exotic edge cases
- Validation logic: HIGH - simple regex patterns on 3 field types

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no moving targets)
