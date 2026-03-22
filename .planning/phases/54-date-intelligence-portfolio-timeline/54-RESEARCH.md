# Phase 54: Date Intelligence and Portfolio Timeline - Research

**Researched:** 2026-03-22
**Domain:** React UI components, date grouping/urgency logic, sidebar badge integration
**Confidence:** HIGH

## Summary

Phase 54 adds two features: (1) a portfolio-wide deadline timeline on the Dashboard grouped by urgency (overdue / this week / this month / later), and (2) a sidebar badge showing the count of deadlines due within 7 days. Both features build entirely on existing infrastructure -- contract dates are already loaded from the `contract_dates` table and stitched onto contracts in `useContractStore`, and the Dashboard already has a small "Upcoming Deadlines" widget with a `getDateUrgency` helper function.

The work is purely client-side UI. No new API endpoints, no database changes, no new dependencies. The existing `getDateUrgency` function in `Dashboard.tsx` already computes day differences and color classes -- it needs to be extracted and extended to support urgency group bucketing. The Sidebar already supports a numeric badge pattern on nav items (see `contractCount` on "All Contracts") which can be reused for the deadline count.

**Primary recommendation:** Extract date urgency logic into a shared utility, build a `DeadlineTimeline` component that groups dates by urgency bucket, and thread the 7-day deadline count through to the Sidebar.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATE-01 | Portfolio-wide deadline timeline on dashboard grouped by urgency (overdue/this week/this month/later) | Existing `getDateUrgency` helper provides day-diff logic; existing `upcomingDates` memo shows flatMap pattern for cross-contract date collection; new `DeadlineTimeline` component with grouped sections |
| DATE-02 | Sidebar badge showing count of deadlines within 7 days | Sidebar already has `badge` prop pattern on nav items; `useContractStore` already provides all dates; compute count in App.tsx and pass as prop |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | Component framework | Already in use |
| TypeScript | strict mode | Type safety | Already in use |
| Tailwind CSS | - | Styling | Already in use |
| Lucide React | - | Icons (Calendar, AlertCircle, Clock) | Already in use |
| Framer Motion | - | Entry animations | Already in use |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Date | date-fns / dayjs | Explicitly out of scope per REQUIREMENTS.md -- native Date + Intl handles all needed operations |

**Installation:** None required. All dependencies already present.

## Architecture Patterns

### Existing Infrastructure to Build On

1. **`getDateUrgency()` in Dashboard.tsx (lines 21-42)** -- Already computes day difference and returns label/colorClass/isPast. Currently scoped to Dashboard; needs extraction to shared utility with urgency group bucketing.

2. **`upcomingDates` memo in Dashboard.tsx (lines 66-79)** -- Already flatMaps all contract dates with contractId/contractName, filters to near-future, sorts by date. This pattern is the foundation for the full timeline.

3. **Sidebar badge pattern (Sidebar.tsx lines 36-39, 67-70)** -- `navItems` support an optional `badge` number that renders as a pill. The Dashboard nav item currently has no badge; adding `badge` to it follows the existing pattern exactly.

4. **`ContractDate` type (contract.ts lines 172-176)** -- `{ label: string; date: string; type: 'Start' | 'Milestone' | 'Deadline' | 'Expiry' }`. The `date` field is a string (ISO date format from Supabase).

### Recommended New Structure

```
src/
├── utils/
│   └── dateUrgency.ts         # Extracted + extended urgency logic (NEW)
├── components/
│   └── DeadlineTimeline.tsx    # Portfolio timeline grouped by urgency (NEW)
├── pages/
│   └── Dashboard.tsx           # Replace mini widget with DeadlineTimeline (MODIFY)
├── components/
│   └── Sidebar.tsx             # Add deadlineBadge prop (MODIFY)
└── App.tsx                     # Compute deadline count, pass to Sidebar (MODIFY)
```

### Pattern 1: Urgency Grouping

**What:** Group all portfolio dates into four buckets: Overdue, This Week, This Month, Later.
**When to use:** For the DeadlineTimeline component rendering.
**Example:**

```typescript
// src/utils/dateUrgency.ts
export type UrgencyGroup = 'overdue' | 'this-week' | 'this-month' | 'later';

export interface UrgencyConfig {
  key: UrgencyGroup;
  label: string;
  colorClass: string;     // text color
  bgClass: string;        // section header bg
  iconColor: string;      // icon accent
}

export const URGENCY_GROUPS: UrgencyConfig[] = [
  { key: 'overdue',    label: 'Overdue',    colorClass: 'text-red-600',     bgClass: 'bg-red-50',    iconColor: 'text-red-500' },
  { key: 'this-week',  label: 'This Week',  colorClass: 'text-amber-600',   bgClass: 'bg-amber-50',  iconColor: 'text-amber-500' },
  { key: 'this-month', label: 'This Month', colorClass: 'text-blue-600',    bgClass: 'bg-blue-50',   iconColor: 'text-blue-500' },
  { key: 'later',      label: 'Later',      colorClass: 'text-slate-600',   bgClass: 'bg-slate-50',  iconColor: 'text-slate-400' },
];

export function getUrgencyGroup(dateStr: string): UrgencyGroup {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this-week';
  if (diffDays <= 30) return 'this-month';
  return 'later';
}

export function countDeadlinesWithin7Days(dates: Array<{ date: string }>): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dates.filter(d => {
    const target = new Date(d.date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 7;
  }).length;
}
```

### Pattern 2: Timeline Entry with Navigation

**What:** Each timeline entry is a clickable button showing date, contract name, and description -- clicking navigates to the contract review page.
**When to use:** Inside DeadlineTimeline grouped sections.
**Example:**

```typescript
// Reuses the existing Dashboard pattern (lines 260-279)
interface TimelineEntry {
  label: string;
  date: string;
  type: ContractDate['type'];
  contractId: string;
  contractName: string;
  urgencyGroup: UrgencyGroup;
}

// Clicking calls onNavigate('review', entry.contractId)
```

### Pattern 3: Sidebar Badge Threading

**What:** Compute deadline count in App.tsx (where contracts are available), pass to Sidebar as a new prop.
**When to use:** For the DATE-02 requirement.
**Example:**

```typescript
// App.tsx -- compute from contracts already in memory
const deadlineCount = useMemo(() => {
  const allDates = contracts
    .filter(c => c.status === 'Reviewed')
    .flatMap(c => c.dates);
  return countDeadlinesWithin7Days(allDates);
}, [contracts]);

// Pass to Sidebar
<Sidebar
  activeView={activeView}
  onNavigate={(view) => navigateTo(view)}
  contractCount={contracts.length}
  deadlineBadge={deadlineCount}  // NEW
  onSignOut={signOut}
/>
```

```typescript
// Sidebar.tsx -- add to Dashboard nav item, conditionally render
{
  id: 'dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  badge: deadlineBadge > 0 ? deadlineBadge : undefined,
}
```

### Anti-Patterns to Avoid

- **Fetching dates separately for the timeline:** Dates are already loaded and stitched in `useContractStore`. Do NOT add a separate Supabase query. Derive everything from the existing `contracts` array.
- **Using a date library:** Explicitly out of scope. Native `Date` and `Intl.DateTimeFormat` handle everything needed (day diffing, formatting).
- **Putting urgency logic in the component:** Extract to a utility so both Dashboard (timeline) and App.tsx (badge count) can share it without duplication.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom format functions | `Intl.DateTimeFormat` / `toLocaleDateString` | Already used in existing code (Dashboard line 274) |
| Urgency color mapping | Inline conditionals | Const config array (`URGENCY_GROUPS`) | Single source of truth, easy to adjust |

**Key insight:** This feature is pure UI derivation from existing data. No new data fetching, no new persistence, no new API calls.

## Common Pitfalls

### Pitfall 1: Timezone-Sensitive Date Comparison
**What goes wrong:** `new Date('2026-03-22')` in local timezone vs UTC can shift the day boundary, causing dates to appear in the wrong urgency group.
**Why it happens:** ISO date strings without time component are parsed as UTC midnight, but comparisons use local time.
**How to avoid:** Always normalize both dates with `setHours(0,0,0,0)` before comparing -- the existing `getDateUrgency` already does this correctly. Follow the same pattern.
**Warning signs:** Dates showing as "overdue" when they should be "today", especially near midnight.

### Pitfall 2: Empty State Handling
**What goes wrong:** Timeline component renders empty section headers with no entries.
**Why it happens:** Not all urgency groups will have entries. Rendering an "Overdue" header with nothing underneath looks broken.
**How to avoid:** Only render urgency group sections that have at least one entry. Show "No upcoming deadlines" when all groups are empty.
**Warning signs:** Empty headers, wasted whitespace.

### Pitfall 3: Badge Showing When Zero
**What goes wrong:** Sidebar shows a "0" badge on Dashboard, which is noisy.
**Why it happens:** Not conditionally hiding the badge when count is zero.
**How to avoid:** Only pass the badge prop when `deadlineCount > 0`. The existing Sidebar pattern already checks `item.badge &&` (truthy check) so `0` would be falsy -- but be explicit with `> 0 ? count : undefined`.
**Warning signs:** Permanent "0" badge on Dashboard nav item.

### Pitfall 4: Duplicate Dates from Same Contract
**What goes wrong:** A contract with 5 dates floods the timeline, making it contract-centric instead of portfolio-centric.
**Why it happens:** Flat-mapping all dates without considering density.
**How to avoid:** This is acceptable per requirements (show ALL dates). But sort by date so the most urgent always appear first regardless of which contract they belong to.

### Pitfall 5: Stale getDateUrgency in Dashboard
**What goes wrong:** After extracting urgency logic to a utility, the old `getDateUrgency` function remains in Dashboard.tsx, creating drift.
**Why it happens:** Forgetting to remove/replace the inline function.
**How to avoid:** Delete `getDateUrgency` from Dashboard.tsx and import from the shared utility. The existing mini "Upcoming Deadlines" widget should be replaced by the new `DeadlineTimeline` component.

## Code Examples

### Collecting Portfolio Dates (existing pattern)

```typescript
// Already in Dashboard.tsx lines 66-79 -- this is the pattern to extend
const allPortfolioDates = useMemo(() => {
  return contracts
    .filter(c => c.status === 'Reviewed')
    .flatMap(c => c.dates.map(d => ({
      ...d,
      contractId: c.id,
      contractName: c.name,
    })))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}, [contracts]);
```

### Date Formatting (existing pattern)

```typescript
// Already used in Dashboard.tsx line 274
new Date(d.date).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
```

### Sidebar Badge Rendering (existing pattern)

```typescript
// Sidebar.tsx lines 67-70 -- already renders conditional badge
{item.badge && (
  <span className="bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full">
    {item.badge}
  </span>
)}
```

For the deadline badge, consider using a more urgent color (red/amber background) to differentiate from the neutral contract count badge:

```typescript
// Deadline badge variant -- red pill for urgency
{item.urgentBadge && (
  <span className="bg-red-600 text-white text-xs py-0.5 px-2 rounded-full">
    {item.urgentBadge}
  </span>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mini 5-item upcoming dates widget | Full portfolio timeline with urgency groups | Phase 54 | Dashboard becomes deadline-aware across all contracts |
| No sidebar urgency indicator | Badge with 7-day deadline count | Phase 54 | Users see urgency from any page |

## Open Questions

1. **Should "overdue" dates include all historical past dates or only recently overdue?**
   - What we know: Current `upcomingDates` filters to `>= now - 1 day` (includes yesterday). The existing `getDateUrgency` marks past dates as "Xd ago" in slate color.
   - What's unclear: Should the timeline show dates from 6 months ago as "overdue"? Probably not.
   - Recommendation: Show overdue dates from the last 30 days only. Older dates are no longer actionable. This avoids timeline clutter.

2. **Should the DeadlineTimeline replace or sit alongside the existing "Upcoming Deadlines" widget?**
   - What we know: The existing widget is in the right sidebar column of the Dashboard (lines 231-283). The new timeline is the expanded version.
   - Recommendation: Replace the existing widget entirely. The new timeline is strictly more capable (grouped, all dates, urgency-coded). Place it prominently -- either as a full-width section or in the existing right-column position but expanded.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none |
| Quick run command | `npm run build` (type checking via tsc) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATE-01 | Portfolio timeline with urgency grouping | manual | Visual verification on dashboard | N/A |
| DATE-02 | Sidebar badge with 7-day count | manual | Visual verification on sidebar | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build + lint green

### Wave 0 Gaps
None -- no test framework configured per project conventions. Build + lint is the verification mechanism.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/pages/Dashboard.tsx` (existing date urgency logic, upcoming dates memo)
- Direct codebase inspection: `src/components/Sidebar.tsx` (existing badge pattern)
- Direct codebase inspection: `src/types/contract.ts` (ContractDate type definition)
- Direct codebase inspection: `src/hooks/useContractStore.ts` (date loading and stitching)
- Direct codebase inspection: `src/App.tsx` (Sidebar prop threading, contracts state)
- `.planning/REQUIREMENTS.md` (DATE-01, DATE-02 definitions; Out of Scope constraints)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing
- Architecture: HIGH - extending clearly established patterns (badge, date urgency, flatMap)
- Pitfalls: HIGH - timezone and empty-state issues are well-understood React/JS patterns

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- no external dependencies or API changes involved)
