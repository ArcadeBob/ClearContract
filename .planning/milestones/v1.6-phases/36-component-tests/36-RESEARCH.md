# Phase 36: Component Tests - Research

**Researched:** 2026-03-16
**Domain:** React component testing with Vitest + React Testing Library
**Confidence:** HIGH

## Summary

Phase 36 tests five UI components: FindingCard, SeverityBadge, UploadZone, FilterToolbar, and Sidebar. The test infrastructure from Phase 33 is mature -- Vitest 3.2 with jsdom, React Testing Library 16, jest-dom matchers, Framer Motion globally mocked, custom render wrapper with ToastProvider, and factory functions that produce Zod-validated test data. All patterns are established and proven across Phases 33-35.

The key technical challenges are: (1) FindingCard is the most complex component (206 LOC, 6 child components, useInlineEdit hook, ConfirmDialog with createPortal), (2) UploadZone uses react-dropzone which requires specific event simulation patterns, and (3) FilterToolbar's CONTEXT.md decision to mock MultiSelectDropdown via vi.mock needs a clean stub implementation.

**Primary recommendation:** Follow the established colocated test file pattern, use createFinding factory for all test data, use the custom render wrapper, and lean on fireEvent/userEvent for interactions. No new dependencies needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full render all child components (no vi.mock for SeverityBadge, ActionPriorityBadge, ClauseQuote, etc.) -- except FilterToolbar which mocks MultiSelectDropdown
- FindingCard: key variations approach (minimal, fully-loaded, each severity, resolved, note editing flow including cancel and delete confirmation)
- UploadZone: fireEvent.change on hidden file input with mock File objects; test drag-active state and error-clearing on dragEnter
- FilterToolbar: vi.mock MultiSelectDropdown with simple stub; parameterized tests for 4 view mode buttons; test hide-resolved checkbox and negotiation-only toggle
- SeverityBadge: expand existing test file in-place; test all 5 severity levels with CSS class assertions from SEVERITY_BADGE_COLORS map; test className passthrough
- Test files colocated next to source: src/components/ComponentName.test.tsx

### Claude's Discretion
- Exact number of test cases per component
- describe/it nesting structure
- Whether to use test.each for parameterized severity tests
- Sidebar test depth (straightforward -- render, click, verify)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | FindingCard renders all severity levels with correct styling and metadata | createFinding factory with severity override; full child render; assert visible text for title, description, category, severity badge, recommendation, clause text, explanation |
| COMP-02 | SeverityBadge renders correct colors and labels for all severity values | SEVERITY_BADGE_COLORS map from palette.ts provides exact Tailwind classes per severity; expand existing 2-test file |
| COMP-03 | UploadZone accepts valid PDFs, rejects invalid files, shows error states | fireEvent.change with mock File objects; react-dropzone onDropRejected error codes map to specific messages |
| COMP-04 | FilterToolbar toggles filters correctly, reflects active filter state | vi.mock MultiSelectDropdown; parameterized view mode button tests; checkbox interactions |
| COMP-05 | Sidebar navigation renders all views, highlights active view, triggers navigation | 4 nav items (dashboard, upload, contracts, settings); active state applies specific CSS classes; click triggers onNavigate |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.2.4 | Test runner | Already configured inline in vite.config.ts |
| @testing-library/react | ^16.3.2 | Component rendering/queries | Standard for React component tests |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers | toBeInTheDocument, toHaveClass, etc. |
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Realistic event dispatching for clicks, typing |
| jsdom | ^26.1.0 | DOM environment | Configured as Vitest environment |

### Supporting (already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| src/test/render.tsx | N/A | Custom render with ToastProvider | Every component render |
| src/test/factories.ts | N/A | createFinding, createContract | All test data creation |
| src/test/mocks/framer-motion.ts | N/A | FM proxy mock | Auto-loaded via setup.ts |

### No New Dependencies Needed
Everything required is already installed and configured.

## Architecture Patterns

### Test File Placement
```
src/components/
├── FindingCard.tsx
├── FindingCard.test.tsx        # NEW
├── SeverityBadge.tsx
├── SeverityBadge.test.tsx      # EXPAND (2 existing tests)
├── UploadZone.tsx
├── UploadZone.test.tsx         # NEW
├── FilterToolbar.tsx
├── FilterToolbar.test.tsx      # NEW
├── Sidebar.tsx
└── Sidebar.test.tsx            # NEW
```

### Pattern 1: Standard Component Test Structure
**What:** Import from custom render, create test data with factories, render, assert.
**When to use:** Every test in this phase.
**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/render';
import { createFinding } from '../test/factories';
import { FindingCard } from './FindingCard';

describe('FindingCard', () => {
  it('renders title and description', () => {
    const finding = createFinding({ title: 'Test Title', description: 'Test Desc' });
    render(<FindingCard finding={finding} index={0} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Desc')).toBeInTheDocument();
  });
});
```

### Pattern 2: Parameterized Severity Tests
**What:** Use test.each or SEVERITIES array iteration for all 5 severity levels.
**When to use:** SeverityBadge and FindingCard severity rendering.
**Example:**
```typescript
import { SEVERITIES } from '../types/contract';
import { SEVERITY_BADGE_COLORS } from '../utils/palette';

it.each(SEVERITIES)('renders %s with correct colors', (severity) => {
  render(<SeverityBadge severity={severity} />);
  const badge = screen.getByText(severity);
  const classes = SEVERITY_BADGE_COLORS[severity].split(' ');
  classes.forEach(cls => expect(badge).toHaveClass(cls));
});
```

### Pattern 3: Mock File Object for UploadZone
**What:** Create File objects and dispatch via fireEvent.change on the hidden input.
**When to use:** UploadZone accept/reject tests.
**Example:**
```typescript
const validPdf = new File(['pdf-content'], 'contract.pdf', { type: 'application/pdf' });
const input = container.querySelector('input[type="file"]')!;
fireEvent.change(input, { target: { files: [validPdf] } });
```

### Pattern 4: vi.mock for MultiSelectDropdown (FilterToolbar only)
**What:** Replace MultiSelectDropdown with a minimal stub to isolate FilterToolbar logic.
**When to use:** FilterToolbar tests only. All other components render children fully.
**Example:**
```typescript
vi.mock('./MultiSelectDropdown', () => ({
  MultiSelectDropdown: ({ label }: { label: string }) => (
    <div data-testid={`dropdown-${label}`}>{label}</div>
  ),
}));
```

### Pattern 5: ConfirmDialog Portal Testing
**What:** ConfirmDialog uses createPortal to document.body. RTL queries search the full document by default, so portal content is queryable with screen.getByText.
**When to use:** FindingCard delete note confirmation flow.
**Important:** The portal renders to document.body, which screen queries already cover. No special setup needed.

### Anti-Patterns to Avoid
- **Testing implementation details:** Do not assert on component state or hook internals. Assert on visible DOM output.
- **Snapshot testing:** Explicitly out of scope per REQUIREMENTS.md (brittle for this component structure).
- **Mocking child components unnecessarily:** Only FilterToolbar mocks MultiSelectDropdown. All other tests render the full component tree.
- **Using container.querySelector for text assertions:** Use screen.getByText, getByRole, etc. Reserve querySelector for input[type="file"] where no accessible role exists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test data | Manual finding objects | createFinding({overrides}) | Factory produces Zod-validated data with unique IDs and sensible defaults |
| Provider wrapping | Manual ToastProvider nesting | Custom render from src/test/render.tsx | Already handles all context providers |
| Animation mocking | Per-test motion mocks | Global FM mock in setup.ts | Already configured, auto-loaded |
| File validation testing | Manual dropzone event simulation | fireEvent.change + File constructor | react-dropzone processes the change event through its validation pipeline |

## Common Pitfalls

### Pitfall 1: UploadZone react-dropzone Event Handling
**What goes wrong:** Using userEvent.upload or fireEvent.drop may not trigger react-dropzone's internal validation pipeline correctly in jsdom.
**Why it happens:** react-dropzone hooks into the native file input via onDrop/onDropRejected callbacks, but jsdom's drag-and-drop support is limited.
**How to avoid:** Use `fireEvent.change` on the hidden `<input>` element for file acceptance tests. For rejection testing, use `fireEvent.drop` on the dropzone container with a DataTransfer-like structure, OR directly invoke the dropzone's onDropRejected behavior via file input with invalid files.
**Warning signs:** Tests pass but onFileSelect/error callbacks never fire.

### Pitfall 2: react-dropzone File Validation in jsdom
**What goes wrong:** react-dropzone's `accept` filter checks `File.type` property. In jsdom, the File constructor supports the `type` option, but react-dropzone may not reject files via `fireEvent.change` alone -- it validates on drop, not on input change.
**Why it happens:** `fireEvent.change` on a file input bypasses react-dropzone's type/size validation in some versions.
**How to avoid:** For rejection tests, use `fireEvent.drop` on the root dropzone element with `dataTransfer: { files: [invalidFile], items: [...], types: ['Files'] }`. Alternatively, call the dropzone's native drop handler. Test the actual error messages in the DOM to confirm rejection worked.
**Warning signs:** Invalid file type still triggers onFileSelect instead of onDropRejected.

### Pitfall 3: ConfirmDialog Portal Rendering
**What goes wrong:** Searching for dialog text within the FindingCard container fails because the dialog renders to document.body via createPortal.
**Why it happens:** RTL's `within(container)` scoping does not include portal content.
**How to avoid:** Use `screen.getByText()` (document-wide search) for dialog assertions, not scoped queries.
**Warning signs:** Cannot find "Delete Note" or "Are you sure" text in tests.

### Pitfall 4: useInlineEdit commitEdit Requires Value Change
**What goes wrong:** Saving a note that equals the initialValue (empty string for new notes) does nothing -- commitEdit checks `finalValue !== initialValue`.
**Why it happens:** useInlineEdit line 38: `if (finalValue !== '' && finalValue !== initialValue)`.
**How to avoid:** In note-saving tests, type a non-empty value that differs from the initial value. For new notes (initialValue=''), any non-empty text works. For edit tests, change the existing text.
**Warning signs:** onUpdateNote callback never fires despite clicking Save.

### Pitfall 5: FilterToolbar Active Button CSS Assertion
**What goes wrong:** Asserting exact className string fails because Tailwind classes are concatenated with conditional logic.
**Why it happens:** The active button has `bg-white text-slate-900 shadow-sm` while inactive has `text-slate-500 hover:text-slate-700`.
**How to avoid:** Assert individual distinguishing classes with `toHaveClass('bg-white')` or `toHaveClass('text-slate-900')` for active state.
**Warning signs:** Full className string comparison breaks on whitespace differences.

### Pitfall 6: Sidebar contractCount=0 Hides Badge
**What goes wrong:** Badge for "All Contracts" does not render when contractCount is 0.
**Why it happens:** Line 64: `{item.badge && (...)}` -- when badge is 0 (falsy), the badge span is not rendered.
**How to avoid:** Test with contractCount > 0 when asserting badge presence. Test with contractCount = 0 to verify badge absence.
**Warning signs:** Looking for "0" badge text that doesn't exist in the DOM.

## Code Examples

### FindingCard: Minimal Finding
```typescript
const minimal = createFinding({
  title: 'Minimal Finding',
  description: 'Just the basics.',
  recommendation: undefined,  // Will be excluded by Zod or set empty
  clauseText: undefined,
  explanation: undefined,
  negotiationPosition: undefined,
  crossReferences: undefined,
  clauseReference: undefined,
  note: '',
});
// Note: createFinding validates via Zod -- some fields have defaults.
// Check which fields are truly optional in MergedFindingSchema.
```

### FindingCard: Note Add Flow
```typescript
import { render, screen, userEvent } from '../test/render';

const onUpdateNote = vi.fn();
const finding = createFinding({ note: '' });
render(<FindingCard finding={finding} index={0} onUpdateNote={onUpdateNote} />);

const user = userEvent.setup();
await user.click(screen.getByText('+ Add note'));
await user.type(screen.getByPlaceholderText('Add your note...'), 'My note');
await user.click(screen.getByText('Save'));

expect(onUpdateNote).toHaveBeenCalledWith(finding.id, 'My note');
```

### FindingCard: Delete Note Confirmation
```typescript
const onUpdateNote = vi.fn();
const finding = createFinding({ note: 'Existing note' });
render(<FindingCard finding={finding} index={0} onUpdateNote={onUpdateNote} />);

const user = userEvent.setup();
await user.click(screen.getByTitle('Delete note'));
// Portal dialog appears
expect(screen.getByText('Delete Note')).toBeInTheDocument();
await user.click(screen.getByText('Delete')); // confirm button
expect(onUpdateNote).toHaveBeenCalledWith(finding.id, undefined);
```

### UploadZone: Accept Valid PDF
```typescript
import { render, screen } from '../test/render';
import { fireEvent } from '@testing-library/react';

const onFileSelect = vi.fn();
const { container } = render(<UploadZone onFileSelect={onFileSelect} />);

const file = new File(['%PDF-1.4'], 'contract.pdf', { type: 'application/pdf' });
const input = container.querySelector('input[type="file"]')!;
fireEvent.change(input, { target: { files: [file] } });

expect(onFileSelect).toHaveBeenCalledWith(file);
```

### UploadZone: Reject Non-PDF (via drop)
```typescript
const onFileSelect = vi.fn();
const { container } = render(<UploadZone onFileSelect={onFileSelect} />);

const file = new File(['not-a-pdf'], 'contract.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
const dropzone = container.firstElementChild!;
fireEvent.drop(dropzone, {
  dataTransfer: {
    files: [file],
    items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
    types: ['Files'],
  },
});

expect(await screen.findByText('Only PDF files are accepted')).toBeInTheDocument();
expect(onFileSelect).not.toHaveBeenCalled();
```

### FilterToolbar: View Mode Buttons
```typescript
const setViewMode = vi.fn();
const defaultFilters: FilterState = {
  severities: new Set(SEVERITIES),
  categories: new Set(CATEGORIES),
  priorities: new Set(['pre-bid', 'pre-sign', 'monitor']),
  negotiationOnly: false,
};

render(
  <FilterToolbar
    viewMode="by-category"
    setViewMode={setViewMode}
    filters={defaultFilters}
    toggleFilter={vi.fn()}
    setFilterSet={vi.fn()}
    hideResolved={false}
    toggleHideResolved={vi.fn()}
  />
);

const bySeverityBtn = screen.getByText('All by Severity');
await user.click(bySeverityBtn);
expect(setViewMode).toHaveBeenCalledWith('by-severity');
```

### Sidebar: Navigation and Active State
```typescript
const onNavigate = vi.fn();
render(<Sidebar activeView="dashboard" onNavigate={onNavigate} contractCount={5} />);

// All nav items rendered
expect(screen.getByText('Dashboard')).toBeInTheDocument();
expect(screen.getByText('Upload & Review')).toBeInTheDocument();
expect(screen.getByText('All Contracts')).toBeInTheDocument();
expect(screen.getByText('Settings')).toBeInTheDocument();

// Contract count badge
expect(screen.getByText('5')).toBeInTheDocument();

// Click navigation
await user.click(screen.getByText('Upload & Review'));
expect(onNavigate).toHaveBeenCalledWith('upload');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Enzyme shallow render | RTL full render + screen queries | RTL v13+ (2022) | Tests behavior not implementation |
| fireEvent for all interactions | userEvent for realistic user interactions | user-event v14 (2023) | More realistic event sequence |
| Manual mock setup per test | Global setup.ts with auto-mocks | Vitest convention | Less boilerplate |

**No deprecated patterns in use.** The project is on current versions of all testing libraries.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 + React Testing Library 16 |
| Config file | vite.config.ts (inline test config) |
| Quick run command | `npx vitest run src/components/FindingCard.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | FindingCard renders severity levels, metadata, interactions | component | `npx vitest run src/components/FindingCard.test.tsx -x` | No - Wave 0 |
| COMP-02 | SeverityBadge colors and labels for all severities | component | `npx vitest run src/components/SeverityBadge.test.tsx -x` | Yes - expand |
| COMP-03 | UploadZone accept/reject/error states | component | `npx vitest run src/components/UploadZone.test.tsx -x` | No - Wave 0 |
| COMP-04 | FilterToolbar toggle, active state, checkboxes | component | `npx vitest run src/components/FilterToolbar.test.tsx -x` | No - Wave 0 |
| COMP-05 | Sidebar navigation, active highlight, click | component | `npx vitest run src/components/Sidebar.test.tsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/ -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `src/components/FindingCard.test.tsx` -- covers COMP-01
- [ ] `src/components/UploadZone.test.tsx` -- covers COMP-03
- [ ] `src/components/FilterToolbar.test.tsx` -- covers COMP-04
- [ ] `src/components/Sidebar.test.tsx` -- covers COMP-05
- SeverityBadge.test.tsx exists (2 tests) -- needs expansion for COMP-02

## Open Questions

1. **react-dropzone file rejection in jsdom**
   - What we know: fireEvent.change may bypass react-dropzone's accept/maxSize validation. fireEvent.drop with dataTransfer may work.
   - What's unclear: Exact event structure needed for rejection in react-dropzone v14 with jsdom v26.
   - Recommendation: Try fireEvent.drop first. If flaky, directly test error state by simulating the rejected file scenario. The error messages are the key assertions ("Only PDF files are accepted", "File exceeds 10MB limit").

2. **createFinding optional fields**
   - What we know: createFinding defaults include recommendation, clauseReference, negotiationPosition, actionPriority.
   - What's unclear: Which MergedFindingSchema fields are truly optional vs have empty-string defaults.
   - Recommendation: Test "minimal" finding by passing empty/undefined overrides and checking what Zod allows. If Zod rejects undefined for some fields, use empty strings.

## Sources

### Primary (HIGH confidence)
- Source files read directly: FindingCard.tsx (206 LOC), SeverityBadge.tsx (34 LOC), UploadZone.tsx (108 LOC), FilterToolbar.tsx (131 LOC), Sidebar.tsx (97 LOC)
- Test infrastructure: src/test/render.tsx, src/test/factories.ts, src/test/setup.ts, src/test/mocks/framer-motion.ts
- Existing test: src/components/SeverityBadge.test.tsx (2 tests)
- Type definitions: src/types/contract.ts, src/utils/palette.ts
- Dependencies: package.json (vitest ^3.2.4, RTL ^16.3.2, user-event ^14.6.1)
- Config: vite.config.ts (test block with jsdom, setupFiles, css:false)

### Secondary (MEDIUM confidence)
- react-dropzone file input simulation patterns -- based on react-dropzone v14 API knowledge and common testing patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies installed and verified in package.json
- Architecture: HIGH - patterns established across 3 prior test phases, source code fully read
- Pitfalls: HIGH - derived from direct source code analysis (useInlineEdit commitEdit logic, ConfirmDialog portal, Sidebar badge falsy check, FilterToolbar CSS)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- no version changes expected)
