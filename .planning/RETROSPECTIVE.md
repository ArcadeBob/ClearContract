# Retrospective

## Milestone: v1.0 -- Enhanced Analysis Release

**Shipped:** 2026-03-06
**Phases:** 6 | **Plans:** 13 | **Commits:** 78
**Timeline:** 6 days (2026-02-28 -> 2026-03-06)

### What Was Built
- Multi-pass analysis pipeline with Anthropic Files API and 16 specialized analysis passes
- Comprehensive legal clause analysis (11 clause types) with exact verbatim quotes and metadata
- Scope extraction, dates/deadlines, labor compliance checklists, and verbiage flagging
- Negotiation positions on Critical/High findings with suggested replacement language
- Category-grouped UI with view-mode toggle, LegalMetaBadge, and ScopeMetaBadge components
- React 18 migration and structured output guarantees via Zod schemas

### What Worked
- Schema-first approach (Zod schemas as single source of truth) prevented parsing failures entirely
- Self-contained pass schemas enabled independent structured output compilation per pass
- Additive type changes (optional fields on existing interfaces) avoided breaking the UI at each phase
- Parallel execution of analysis passes via Promise.allSettled with graceful partial failure handling
- Consistent patterns across phases (LegalMetaBadge -> ScopeMetaBadge, convertLegalFinding -> convertScopeFinding)

### What Was Inefficient
- ROADMAP.md plan checkboxes fell out of sync with disk state (Phases 1, 3, 4, 5 showed unchecked plans despite being complete)
- Milestone audit discovered tech debt that could have been caught earlier (unused imports, missing VERIFICATION.md)
- No test framework means verification relied entirely on TypeScript compilation and manual checks

### Patterns Established
- Per-pass Zod schema pattern: each analysis pass has its own schema with clause-type-specific required metadata
- Convert function pattern: maps flat API response to unified Finding shape with discriminated union metadata
- Composite key dedup: clauseReference+category primary key with title-based fallback
- Dual enforcement: file size limits enforced at both dropzone and API layer
- Category ordering: deterministic CATEGORY_ORDER constant instead of Set-based extraction

### Key Lessons
- Structured outputs with required fields produce significantly better results than optional fields
- zod-to-json-schema bridges Zod v3 to structured outputs cleanly -- no need to upgrade to Zod v4
- Files API upload-once/analyze-many is the right pattern for multi-pass document analysis
- Gap closure phases (Phase 6) are lightweight and effective for fixing integration issues found by audit

### Cost Observations
- Model: claude-sonnet-4-5-20241022 for all analysis passes (structured output support requirement)
- Sessions: ~10 sessions across 6 days
- Notable: Plans averaged 3-4 minutes execution time; total milestone execution under 1 hour of AI time

---

## Milestone: v1.1 -- Domain Intelligence

**Shipped:** 2026-03-10
**Phases:** 4 | **Plans:** 8 | **Tasks:** 17
**Timeline:** 10 days (2026-02-28 -> 2026-03-10)

### What Was Built
- Knowledge module architecture with TypeScript types, central registry, token budget enforcement, and per-pass selective loading
- Company profile Settings page with 4 data-entry cards backed by localStorage persistence
- Company-specific intelligence pipeline: insurance gap detection, bonding capacity checks, severity downgrade, bid/no-bid signal
- CA regulatory knowledge modules (mechanics lien, prevailing wage, Title 24, Cal/OSHA) with void-by-law severity guard
- Industry trade knowledge: Division 08 scope classification, 40+ ASTM/AAMA/FGIA standards validation, contract form detection
- Full pipeline integration: 11 knowledge modules wired across 3 domains into analysis passes

### What Worked
- Knowledge-as-code pattern (TypeScript modules, not RAG) kept the system simple with zero new dependencies
- Content-as-instructions pattern (writing knowledge as Claude analysis instructions) produced natural integration with analysis
- Central registry with Map-based module store enabled clean per-pass selective loading
- Phase 9 pattern (conservative token sizing, void-by-law critical flagging) carried forward cleanly into Phase 10
- Execution velocity dramatically improved: ~4 min/plan average vs ~45 min in v1.0

### What Was Inefficient
- ROADMAP.md plan checkboxes again fell out of sync (Phases 7, 9 showed unchecked despite completion)
- Token cap changed mid-milestone (1500 -> 10000 in Phase 10) -- should have been anticipated during architecture
- Nyquist validation not maintained (2 phases missing, 2 partial) -- validation was deprioritized for velocity
- SUMMARY files missing requirements-completed frontmatter across all 4 phases

### Patterns Established
- Knowledge module interface: id, domain, title, effectiveDate, reviewByDate, content, tokenEstimate
- Domain barrel index pattern: each domain has index.ts that imports and registers all modules
- Side-effect import pattern in api/analyze.ts for runtime module registration
- Severity guard post-processing: runs after risk score for display-only severity upgrades
- Profile transport: localStorage -> POST body -> server -> prompt injection for selected passes

### Key Lessons
- Knowledge files under 50K tokens total don't need RAG -- TypeScript modules are simpler and type-safe
- Writing knowledge as analysis instructions (not encyclopedic reference) produces much better Claude integration
- Token budgets should be set generously from the start -- raising caps mid-milestone creates documented inconsistencies
- Velocity improvement from v1.0 to v1.1 (45min -> 4min per plan) suggests the patterns are maturing well

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution, Sonnet for analysis passes
- Sessions: ~6 sessions across 10 calendar days (sparse, not daily)
- Notable: 8 plans completed in ~34 minutes total AI execution time

---

## Milestone: v1.3 -- Workflow Completion

**Shipped:** 2026-03-13
**Phases:** 7 | **Plans:** 8
**Timeline:** 1 day (2026-03-13)

### What Was Built
- URL-based routing with History API — browser back/forward, refresh, deep links, bookmarkable URLs
- Finding actions — resolve toggle, note CRUD (add/edit/delete), hide-resolved filter, resolved counts
- Settings validation — inline errors with onBlur validation, auto-formatting, save confirmation feedback
- Re-analyze contract — PDF re-selection, confirmation dialog, loading overlay, failure rollback with error toast
- CSV export — RFC 4180 compliant, filter-aware, UTF-8 BOM for Excel compatibility
- Two gap closure phases from milestone audit (All Contracts navigation, filtered CSV export)

### What Worked
- Single-session execution for all 7 phases -- highest velocity milestone yet
- Milestone audit identified 2 cross-phase integration gaps that were fixed before shipping
- Gap closure phases (20, 21) were minimal and surgical -- exact fixes for exact problems
- visibleFindings pattern (filter at data level) made CSV export filtering trivial once wired correctly
- structuredClone for rollback provided safe deep copy without custom serialization

### What Was Inefficient
- STATE.md progress tracking fell behind (showed 0% despite all phases complete)
- ROADMAP.md plan checkboxes not updated to [x] on completion (recurring issue from v1.0/v1.1)
- Nyquist validation skipped for phases 16-19 (recurring deprioritization)
- Audit status reported as gaps_found but gaps were closed by subsequent phases -- no mechanism to update audit status

### Patterns Established
- Custom History API hook pattern: parseUrl + navigateTo + popstate listener (~80 lines, zero deps)
- Optional fields with nullish coalescing for backward-compatible schema migration
- Filter-at-data-level pattern: single visibleFindings array feeds all downstream consumers
- structuredClone rollback pattern for destructive operations with recovery
- ExportOptions parameter pattern for progressive enhancement of existing utilities

### Key Lessons
- Cross-phase integration testing (milestone audit) catches bugs that per-phase verification misses
- Three flat routes don't need a router library -- custom History API hook is simpler and more maintainable
- Backward-compatible schema changes (optional fields + nullish coalescing) avoid migration complexity entirely
- Gap closure phases are consistently lightweight and effective -- the audit-then-fix pattern works well

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution
- Sessions: 1 session
- Notable: All 8 plans (including 2 gap closures) completed in a single session -- fastest milestone by far

---

## Milestone: v1.4 -- Production Readiness

**Shipped:** 2026-03-15
**Phases:** 5 | **Plans:** 11
**Timeline:** 2 days (2026-03-14 -> 2026-03-15)

### What Was Built
- Eliminated 6 tech debt items and delivered UX quick wins (inline rename, finding badges, urgency indicators, bid signal breakdown, upcoming deadlines)
- Added 5 CA knowledge modules with expiration-based staleness warning system; updated Title 24 to 2025 code cycle
- Category-weighted risk scoring and 17th cross-pass synthesis analysis detecting compound risks
- PDF report generation (jsPDF), action priority classification (pre-bid/pre-sign/monitor), negotiation checklist tab
- Cross-contract pattern detection, side-by-side contract comparison, advanced multi-select filters
- Re-analyze finding preservation via clauseReference+category composite key matching
- Audit gap closure: Compound Risk in category order, accurate dialog message, placeholder button cleanup

### What Worked
- Two-phase execution (Phases 22-23 day 1, Phases 24-26 day 2) kept sessions focused
- Milestone audit with gap closure phase pattern continued to work well -- Phase 26 was surgical
- Tech debt addressed first (Phase 22) created clean foundation for pipeline improvements
- actionPriority/negotiationPosition "required in Zod, optional on TS" pattern reused successfully from v1.0
- Set-based filter state with "all-selected = no filtering" gave clean multi-select UX

### What Was Inefficient
- ROADMAP.md progress table had formatting drift on phases 24-26 (missing milestone column values)
- Nyquist validation remained partial across all phases -- consistently deprioritized
- 4 tech debt items accumulated that required post-audit cleanup commit
- Some SUMMARY.md files lacked one_liner frontmatter, making automated extraction fail

### Patterns Established
- Two-tier category weights pattern: 1.0x for legal/financial, 0.75x for scope/compliance categories
- Non-fatal synthesis pass pattern: additive analysis that returns empty array on failure
- Client-side PDF generation pattern: jsPDF + jspdf-autotable, no server roundtrip
- Composite key preservation pattern: clauseReference+category for matching findings across re-analysis
- Multi-select filter pattern: Set-based state, all-selected means no filtering, generic MultiSelectDropdown component

### Key Lessons
- Tech debt cleanup as first phase of a milestone pays dividends -- clean types and routing made later phases simpler
- Cross-pass synthesis (compound risk detection) adds meaningful value but must be non-fatal to avoid blocking analysis
- Action priority classification gives users a natural workflow ordering they were missing before
- Portfolio features (patterns, comparison) become valuable once 3+ contracts are stored -- earlier milestones correctly deferred this
- The audit-then-fix cycle is now a proven 4-milestone pattern and should remain standard

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution
- Sessions: ~4 sessions across 2 days
- Notable: 11 plans across 5 phases completed efficiently; gap closure phase was single-plan

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v1.3 | v1.4 |
|--------|------|------|------|------|
| Phases | 6 | 4 | 7 | 5 |
| Plans | 13 | 8 | 8 | 11 |
| Avg plan duration | ~4min | ~4min | ~2min | ~2min |
| Requirements | 22/22 | 23/23 | 16/16 | 26/26 |
| Audit status | tech_debt | tech_debt | gaps_found→closed | tech_debt→closed |
| LOC | ~5,000 | ~4,238 | ~7,461 | ~9,669 |
| Sessions | ~10 | ~6 | 1 | ~4 |

### Top Lessons (Verified Across Milestones)

1. Schema-first with required fields produces better AI output (v1.0, v1.1, v1.4)
2. Gap closure phases are lightweight and effective for cross-phase integration fixes (v1.0, v1.3, v1.4)
3. ROADMAP.md plan checkboxes consistently fall out of sync -- needs automation (v1.0, v1.1, v1.3, v1.4)
4. Nyquist validation consistently deprioritized -- either automate or remove from process (v1.1, v1.3, v1.4)
5. Execution velocity improves with each milestone as patterns mature (45min→4min→2min per plan)
6. Tech debt cleanup first in a milestone creates clean foundation for subsequent phases (v1.4)
