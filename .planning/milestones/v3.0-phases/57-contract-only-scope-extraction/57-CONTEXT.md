# Phase 57: Contract-Only Scope Extraction - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get estimator-grade scope intelligence from a single contract PDF — a submittal register with durations and review cycles, schedule-conflict warnings, and quantity-ambiguity flags — with no bid PDF required. This phase delivers SCOPE-01, SCOPE-02, and SCOPE-05.

</domain>

<decisions>
## Implementation Decisions

### Submittal register structure
- Submittals are **data extracts, not risk findings** — presented as a structured table, separate from the findings list.
- New `submittals: SubmittalEntry[]` array on the Contract type (alongside `findings` and `dates`). Requires new DB column (jsonb) and Zod schema.
- Fields per entry: type (`shop-drawing | sample | mockup | product-data`), description, reviewDuration, responsibleParty, reviewCycles (number), resubmittalBuffer, specSection (CSI ref), leadTime, clauseReference.
- Unstated fields (resubmittalBuffer, leadTime) are **left blank** in the register — UI shows "Not stated" or "—". Schedule-conflict computation uses configurable industry defaults (e.g., 7-day buffer) and **labels the assumption explicitly** in the warning text.
- Submittal extraction happens in the existing `scope-extraction` pass (Stage 2) with schema extension — not a new pass.

### Schedule-conflict detection
- **Deterministic TypeScript computation** after the extraction pass — no additional LLM call (per SC2).
- Compare submittal total durations against **extracted ContractDate milestones only** (type: 'Milestone' from the dates-deadlines pass). No inferred project phases.
- Total duration formula: `(reviewDuration × reviewCycles) + resubmittalBuffer + leadTime`. When buffer/leadTime unstated, use industry default (7d buffer, 0d lead) and label assumption in warning.
- Each conflict generates a **real Finding** (category: 'Scope of Work') AND annotates the submittal register row with a warning icon and overrun summary. Dual visibility.
- **Severity tiered by overrun days:** Critical >14d, High 7-14d, Medium 1-7d. Deterministic, not LLM-assigned.
- Conflict findings appear in PDF report export alongside other findings (sorted by severity). Submittal register table itself deferred to Phase 62 UX.

### Quantity-ambiguity flags
- Use existing `scope-extraction` pass with new `scopeItemType: 'quantity-ambiguity'` value — not the verbiage pass (different purpose: bid-risk vs. contract-language quality).
- **One finding per scope item** with ambiguous quantity phrase — each quotes the exact phrase and identifies the scope item.
- **Severity tiered by bid exposure:**
  - High: open-ended quantity phrases (`as required`, `sufficient`, `to weatherproof`, `all necessary`, `complete system`) — sub bears unlimited quantity risk.
  - Medium: approximation phrases (`approximately`, `estimated`, `about`) — quantities exist but soft.
  - Low: minor ambiguity (`or equal`, `similar to`, `match existing`) — substitution risk, not quantity.

### Standalone UX
- Submittal register appears in a **new "Submittals" tab** on the contract review page, alongside Findings and Negotiation Checklist tabs.
- **Tab hidden entirely** when `submittals` array is empty (purchase orders, change orders without submittal requirements).
- Quantity-ambiguity findings appear in the Findings tab (they are findings, not register data).
- All three capabilities work on contracts uploaded without any bid PDF — this phase ships standalone value (SC4).

### Claude's Discretion
- Schema layout for SubmittalEntry Zod type and DB column design (jsonb shape).
- Exact industry-default values for resubmittal buffer and lead time.
- How scope-extraction pass prompt is extended to extract submittals + quantity ambiguity alongside existing scope findings.
- Submittal register UI component design (table layout, column widths, responsive behavior).
- TypeScript organization for the schedule-conflict computation function.
- How conflict findings reference both the submittal and the milestone in clauseReference/clauseText.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` §Phase 57 — goal, success criteria (4 criteria), SCOPE-01/SCOPE-02/SCOPE-05 requirements
- `.planning/REQUIREMENTS.md` §SCOPE — requirement wording for SCOPE-01, SCOPE-02, SCOPE-05

### Phase 56 context (direct predecessor)
- `.planning/phases/56-architecture-foundation/56-CONTEXT.md` — Stage 3 wave pattern, inferenceBasis discriminator, scope pass split decisions, timeout budgets
- `.planning/phases/56-architecture-foundation/56-01-PLAN.md` — scope-extraction rename, MAX_MODULES_PER_PASS raise
- `.planning/phases/56-architecture-foundation/56-02-PLAN.md` — inferenceBasis schema, merge-time enforcement
- `.planning/phases/56-architecture-foundation/56-03-PLAN.md` — Stage 3 orchestration block

### Research (v3.0 milestone)
- `.planning/research/SUMMARY.md` — scope-intel feature rationale, pipeline timeline math
- `.planning/research/FEATURES.md` — submittal tracking, quantity signals, schedule-conflict detection
- `.planning/research/ARCHITECTURE.md` — three-stage pipeline, pass registry pattern
- `.planning/research/PITFALLS.md` §Pitfall 10 — knowledge module bloat, token budget discipline

### Existing code (integration points)
- `api/passes.ts` — `scope-extraction` pass definition, schema reference, system prompt
- `src/schemas/scopeComplianceAnalysis.ts` — `ScopeOfWorkFindingSchema` with `scopeItemType` enum (needs `quantity-ambiguity` value added)
- `src/types/contract.ts` — `Contract` interface (add `submittals` array), `ContractDate` interface (milestone source for conflict detection)
- `src/schemas/finding.ts` — `MergedFindingSchema` (single source of truth for Finding type)
- `api/merge.ts` — merge pipeline (schedule-conflict computation inserts here, after extraction merge)
- `api/analyze.ts` — pipeline orchestration, Stage 2/3 flow, where post-extraction computation would run
- `src/knowledge/trade/div08-scope.ts` — existing Div 08 scope classification module (loaded by scope-extraction)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ScopeOfWorkFindingSchema`: Already has `scopeItemType` enum — extend with `'quantity-ambiguity'` value for quantity-ambiguity findings.
- `ContractDate` interface: `type: 'Milestone'` entries are the milestone source for conflict detection.
- `scope-extraction` pass in `api/passes.ts`: Existing pass that extracts inclusions, exclusions, scope rules — extend prompt and schema for submittals + quantity ambiguity.
- `div08-scope` knowledge module: CSI section references useful for populating `specSection` field on submittal entries.
- Tab pattern on contract review page: Findings/Negotiation Checklist tabs exist — add Submittals tab following same pattern.

### Established Patterns
- Contract type extension: add field to interface + Zod schema + DB column (jsonb) + snake_case mapper. Pattern established in v2.0/v2.2.
- Finding generation in TypeScript (not LLM): precedent in risk-score computation and bid-signal factors — deterministic, runs post-merge.
- Tab visibility conditional on data: compare tab hidden when not in compare mode — same pattern for submittals tab.

### Integration Points
- `api/passes.ts` scope-extraction entry: prompt and schema need extension for submittal extraction + quantity-ambiguity phrases.
- `api/merge.ts` or post-merge step: schedule-conflict computation runs after scope-extraction findings + submittals are merged, before DB write.
- `src/types/contract.ts` Contract interface: add `submittals: SubmittalEntry[]`.
- DB migration: add `submittals` jsonb column to contracts table.
- Contract review page: add Submittals tab component with register table and conflict annotations.

</code_context>

<specifics>
## Specific Ideas

- Submittal register modeled after the preview: structured table with Type/Description/Duration/Party columns, warning icons on conflicted rows, conflict detail below the table.
- Schedule-conflict warnings explicitly label assumed values (e.g., "7d buffer (assumed, not in contract)") to distinguish contract-stated from industry-default values.
- Severity tiers for both conflicts and quantity ambiguity are deterministic — based on overrun days and phrase classification respectively, not LLM judgment.
- "Not stated" for unstated fields rather than filling with defaults — keeps the register honest about what the contract actually says.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 57-contract-only-scope-extraction*
*Context gathered: 2026-04-05*
