---
phase: 57-contract-only-scope-extraction
verified: 2026-04-06T05:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
human_verification:
  - test: "Upload a contract PDF with submittal requirements and verify the Submittals tab appears"
    expected: "Submittals tab visible in FilterToolbar after analysis; register table shows extracted submittals with type badges"
    why_human: "Requires a live contract PDF upload and actual LLM response to confirm end-to-end extraction"
  - test: "Upload a contract with milestone dates and submittal review periods that conflict"
    expected: "Schedule-conflict findings appear in the Findings tab with correct severity (Critical/High/Medium) and assumption labels in amber text"
    why_human: "Requires a real contract with extractable milestone and submittal data; deterministic logic verified but LLM extraction quality cannot be automated"
  - test: "Upload a contract with open-ended quantity language (e.g., 'as required', 'sufficient')"
    expected: "Quantity-ambiguity findings appear in Findings tab with scopeItemType quantity-ambiguity, correct severity tier, and exact phrase quoted"
    why_human: "Prompt instructions verified; whether LLM correctly triggers quantity-ambiguity classification needs runtime confirmation"
---

# Phase 57: Contract-Only Scope Extraction Verification Report

**Phase Goal:** Users get estimator-grade scope intelligence from a single contract PDF — a submittal register with durations and review cycles, schedule-conflict warnings, and quantity-ambiguity flags — with no bid PDF required.
**Verified:** 2026-04-06T05:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | scope-extraction pass returns submittals array alongside findings and dates | VERIFIED | `ScopeOfWorkPassResultSchema` in `scopeComplianceAnalysis.ts` line 67-71 includes `submittals: z.array(SubmittalEntrySchema)` |
| 2 | scope-extraction pass returns quantity-ambiguity findings with exact phrase quoted | VERIFIED | `scopeItemType` enum in `ScopeOfWorkFindingSchema` line 51-59 includes `'quantity-ambiguity'`; prompt in `passes.ts` line 217+ instructs exact phrase quoting |
| 3 | Submittals extracted from pass result flow through merge pipeline to DB write | VERIFIED | `merge.ts`: `allSubmittals` accumulator (line 458), scope-extraction extraction (line 474-475), returned as `submittals: allSubmittals` (line 613); `analyze.ts` line 708: `submittals: merged.submittals` in `contractPayload` |
| 4 | Existing contracts with no submittals column get empty array default | VERIFIED | `supabase/migrations/20260405_add_submittals.sql` contains `ALTER TABLE contracts ADD COLUMN submittals jsonb DEFAULT '[]'::jsonb` |
| 5 | Schedule-conflict warnings appear as findings when submittal durations exceed milestone timelines | VERIFIED | `api/conflicts.ts` exports `computeScheduleConflicts`; called in `analyze.ts` line 642 after merge, pushes findings to `merged.findings` line 644 |
| 6 | Conflict severity is deterministic: Critical >14d overrun, High 7-14d, Medium 1-7d | VERIFIED | `conflicts.ts` line 77: `overrun > 14 ? 'Critical' : overrun > 7 ? 'High' : 'Medium'` |
| 7 | Assumed values (buffer, lead time) are explicitly labeled in conflict finding text | VERIFIED | `conflicts.ts` line 62: `"(assumed, not in contract)"` appended when `resubmittalBuffer` not in `statedFields`; same pattern for `leadTime` line 66 |
| 8 | User sees Submittals tab on contract review page when submittals exist | VERIFIED | `FilterToolbar.tsx` line 89: `{submittalCount != null && submittalCount > 0 && ...}` renders tab conditionally; `ContractReview.tsx` line 168 passes `submittalCount={contract.submittals?.length ?? 0}` |
| 9 | Submittals tab is hidden when submittals array is empty | VERIFIED | Same conditional — `submittalCount > 0` guard means tab button not rendered when array is empty |
| 10 | Conflicted rows in the submittal register show amber warning styling and expand on click | VERIFIED | `SubmittalRegister.tsx` line 84-87: conflicted rows get `bg-amber-50 border-l-2 border-l-amber-400`; `toggleExpand` on click; `AnimatePresence` expansion panels line 119-146 |
| 11 | Quantity-ambiguity findings appear in the Findings tab with correct severity tiers | VERIFIED | Findings with `scopeItemType: 'quantity-ambiguity'` are part of the `findings` array returned by scope-extraction pass and merged into the main findings list — rendered by existing `FindingCard` in the Findings tab (no separate wiring needed) |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/schemas/scopeComplianceAnalysis.ts` | SubmittalEntrySchema + ScopeOfWorkPassResultSchema with submittals + quantity-ambiguity enum | VERIFIED | All three present: `SubmittalEntrySchema` line 22, `'quantity-ambiguity'` line 58, `submittals: z.array(...)` line 70 |
| `src/types/contract.ts` | SubmittalEntry interface + Contract.submittals field | VERIFIED | `SubmittalEntry` interface line 178-189; `submittals: SubmittalEntry[]` on Contract line 201 |
| `api/passes.ts` | scope-extraction pass prompt with Submittal Register Extraction and Quantity Ambiguity Detection | VERIFIED | "Submittal Register Extraction (NEW)" at line 195; "Quantity Ambiguity Detection (NEW)" at line 217; `statedFields` instructions at line 211-213; `ScopeOfWorkPassResultSchema` referenced at line 143 |
| `api/merge.ts` | MergedResult includes submittals; scope-extraction handler extracts submittals | VERIFIED | `submittals: SubmittalEntry[]` in MergedResult (line 446); accumulator line 458; extraction block line 474-475; return includes submittals line 613 |
| `api/analyze.ts` | submittals passed to contract payload + computeScheduleConflicts called | VERIFIED | Import line 32; call line 642; `merged.findings.push(...)` line 644; payload line 708 |
| `supabase/migrations/20260405_add_submittals.sql` | submittals jsonb column with empty array default | VERIFIED | File exists; contains `ALTER TABLE contracts ADD COLUMN submittals jsonb DEFAULT '[]'::jsonb` |
| `api/conflicts.ts` | computeScheduleConflicts function with deterministic severity tiers | VERIFIED | Exports `computeScheduleConflicts`; DEFAULTS object line 4-7; severity tiers line 77; `sourcePass: 'schedule-conflict'` line 89; `parseLocalDate` with split/Number pattern line 105-111 |
| `src/components/SubmittalRegister.tsx` | Register table with conflict annotations and expand/collapse | VERIFIED | Exports `SubmittalRegister`; amber conflict styling line 84-87; `aria-label="Schedule conflict"` line 107; `title="Schedule conflict"` on wrapper span line 104; `AnimatePresence` line 119; `hidden md:block` / `md:hidden` responsive layout lines 60, 150 |
| `src/components/SubmittalTypeBadge.tsx` | Pill badge for submittal type | VERIFIED | Exports `SubmittalTypeBadge`; all four color classes: `bg-indigo-100`, `bg-teal-100`, `bg-purple-100`, `bg-cyan-100` |
| `src/components/FilterToolbar.tsx` | ViewMode includes 'submittals'; conditional tab button; filter dropdown hidden | VERIFIED | ViewMode union line 13 includes `'submittals'`; `submittalCount?: number` prop line 27; `ClipboardList` import line 10; `viewMode !== 'submittals'` guard line 115 |
| `src/pages/ContractReview.tsx` | SubmittalRegister imported and wired into viewMode chain | VERIFIED | Import line 12; `viewMode === 'submittals'` branch line 172; `submittalCount` passed to FilterToolbar line 168; conflict findings filter line 175 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api/passes.ts` | `src/schemas/scopeComplianceAnalysis.ts` | schema reference on scope-extraction pass | WIRED | `ScopeOfWorkPassResultSchema` imported and used as `schema:` at line 143 |
| `api/merge.ts` | `src/types/contract.ts` | SubmittalEntry type import for MergedResult | WIRED | `import type { ..., SubmittalEntry }` line 3; used in MergedResult type and accumulator |
| `api/analyze.ts` | `api/merge.ts` | merged.submittals in contract payload | WIRED | `submittals: merged.submittals` at line 708 in `mapToSnake` call |
| `api/analyze.ts` | `api/conflicts.ts` | computeScheduleConflicts call after merge, before DB write | WIRED | Import line 32; call at line 642 (after `mergePassResults`, before synthesis and DB write) |
| `src/pages/ContractReview.tsx` | `src/components/SubmittalRegister.tsx` | viewMode === 'submittals' conditional render | WIRED | Branch at line 172; passes `submittals` and `conflictFindings` props |
| `src/components/SubmittalRegister.tsx` | `contract.findings` | client-side join: filter findings where sourcePass === 'schedule-conflict' | WIRED | `conflictFindings.filter(f => f.sourcePass === 'schedule-conflict' && f.title.includes(sub.description))` line 37-39 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCOPE-01 | 57-01, 57-02 | User sees extracted submittal register (shop drawings, samples, mockups, product data) with durations, parties, and review cycles | SATISFIED | SubmittalEntrySchema defines all fields; scope-extraction prompt instructs extraction; SubmittalRegister table renders type, description, duration, cycles, party, spec section |
| SCOPE-02 | 57-02 | User sees schedule-conflict warnings when submittal durations + lead times push past contract milestones | SATISFIED | `computeScheduleConflicts` in `api/conflicts.ts` generates findings; called in `analyze.ts` after merge; findings persisted to DB and rendered via existing FindingCard |
| SCOPE-05 | 57-01, 57-02 | User sees quantity ambiguity flags ("approximately", "as required", "sufficient") on scope items as bid-risk warnings | SATISFIED | `'quantity-ambiguity'` added to `scopeItemType` enum; scope-extraction prompt section "Quantity Ambiguity Detection" instructs High/Medium/Low severity tiers with exact phrase quoting; `actionPriority: 'pre-bid'` mandated |

No orphaned requirements found — all three IDs (SCOPE-01, SCOPE-02, SCOPE-05) are claimed by plans and verified in the codebase.

### Anti-Patterns Found

No blocker or warning anti-patterns found in phase-modified files. The `return null` occurrences in `conflicts.ts` and `SubmittalRegister.tsx` are legitimate guard clauses (null date parse guard; empty expansion panel guard).

TypeScript compilation of phase-modified production files is clean. Errors reported by `tsc --noEmit` are pre-existing issues in test files and unrelated modules (unused imports in test files, `ImportMeta.env` in `supabase.ts`, `any` type in legacy badge tests) — none introduced by this phase.

### Human Verification Required

**1. End-to-end submittal extraction from contract PDF**

**Test:** Upload a glazing subcontract PDF that contains submittal requirements (shop drawings, samples, etc.) and verify the Submittals tab appears on the ContractReview page after analysis.
**Expected:** FilterToolbar shows "Submittals (N)" tab button; SubmittalRegister table renders with type badges, duration values, and responsible parties.
**Why human:** Requires a live PDF upload and actual Claude structured-output response — cannot verify LLM extraction accuracy programmatically.

**2. Schedule-conflict warning generation**

**Test:** Upload a contract with explicit milestone dates (e.g., "Substantial Completion: 2026-09-01") and submittal review periods that mathematically conflict with those milestones.
**Expected:** Conflict findings appear in Findings tab with title "Schedule Conflict: [submittal] vs [milestone]", amber severity badge, and assumption labels highlighted in amber text when buffer/lead time were not stated.
**Why human:** The deterministic computation logic is verified. The precondition — that the LLM correctly extracts milestone dates AND submittal review durations from the same contract — requires real PDF validation.

**3. Quantity-ambiguity flag rendering**

**Test:** Upload a contract containing open-ended scope language such as "as required", "sufficient to weatherproof", or "approximately N units".
**Expected:** Findings appear in the Findings tab with category "Scope of Work", severity matching the tier (High for open-ended, Medium for soft quantities, Low for substitution), and the exact phrase quoted in clauseText.
**Why human:** Prompt instructions and schema are verified. Actual classification accuracy depends on LLM behavior at runtime.

### Gaps Summary

No gaps. All 11 observable truths are verified. The phase goal is achieved: the data pipeline (schema → pass prompt → merge → DB) and the UI (Submittals tab → SubmittalRegister → conflict annotations) are both fully wired. Three items are flagged for human verification to confirm LLM extraction quality at runtime — these are not blockers, as the infrastructure is complete and correct.

---

_Verified: 2026-04-06T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
