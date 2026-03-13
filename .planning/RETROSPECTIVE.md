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

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v1.3 |
|--------|------|------|------|
| Phases | 6 | 4 | 7 |
| Plans | 13 | 8 | 8 |
| Avg plan duration | ~4min | ~4min | ~2min |
| Requirements | 22/22 | 23/23 | 16/16 |
| Audit status | tech_debt | tech_debt | gaps_found→closed |
| LOC | ~5,000 | ~4,238 | ~7,461 |
| Sessions | ~10 | ~6 | 1 |

### Top Lessons (Verified Across Milestones)

1. Schema-first with required fields produces better AI output (v1.0, v1.1)
2. Gap closure phases are lightweight and effective for cross-phase integration fixes (v1.0, v1.3)
3. ROADMAP.md plan checkboxes consistently fall out of sync -- needs automation (v1.0, v1.1, v1.3)
4. Nyquist validation consistently deprioritized -- either automate or remove from process (v1.1, v1.3)
5. Execution velocity improves with each milestone as patterns mature (45min→4min→2min per plan)
