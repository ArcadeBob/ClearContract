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

## Milestone: v1.5 -- Code Health

**Shipped:** 2026-03-15
**Phases:** 6 | **Plans:** 12 | **Commits:** 55
**Timeline:** 2 days (2026-03-14 -> 2026-03-15)

### What Was Built
- Centralized localStorage access (storageManager), error handling (classifyError), and severity palette into shared utilities
- Extracted 3 reusable hooks: useInlineEdit, useContractFiltering, useFieldValidation
- Decomposed god components: LegalMetaBadge (11 subcomponents), ScopeMetaBadge (4), ContractReview (ReviewHeader + FilterToolbar + RiskSummary)
- Created ToastProvider context with useToast hook — eliminated prop drilling
- Hardened type safety: Zod as single source of truth for Finding type, client-side response validation, zero assertion casts in merge.ts
- Modularized 1,478-line api/analyze.ts into api/passes.ts + slim handler (~443 lines)
- Closed all tsc --noEmit errors across codebase via Phase 32 gap closure

### What Worked
- Incremental extraction approach (not wholesale rewrite) produced zero regressions without a test framework
- Phase ordering was correct: utilities first, then hooks, then components, then types, then server -- each phase built on the previous
- Server modularization last was the right call -- Phase 32 gap closure caught a type error that would have compounded on the server
- Milestone audit with re-audit after gap closure provided full confidence in requirements coverage
- Record<DiscriminantType, FC> dispatcher pattern for MetaBadge decomposition was clean and type-safe

### What Was Inefficient
- SUMMARY.md files lacked one_liner frontmatter (recurring issue from v1.4) -- automated extraction returned null for all 12 plans
- Nyquist validation remained not compliant across all 6 phases -- this is now 5 milestones of consistent deprioritization
- Phase 30 verification initially marked as gaps_found, requiring Phase 32 gap closure -- the Zod reconciliation should have caught the TS2322 in the same phase
- Some phases (27, 28) had CONTEXT.md sessions that added overhead with limited value for refactoring work

### Patterns Established
- StorageResult<T> wrapper pattern: typed ok/data/error/quotaExceeded for storage operations
- z.infer single-source-of-truth pattern: TypeScript types derived from Zod schemas, not duplicated
- Directory-module decomposition pattern: barrel-exported index.tsx dispatcher with focused subcomponents
- ToastProvider + useToast context pattern: centralized toast behavior with 3s auto-dismiss
- localStorage migration pattern: fill newly-required fields with safe defaults inline

### Key Lessons
- Refactoring without tests is viable when using incremental extraction with per-phase TypeScript compilation verification
- Zod as single source of truth for types eliminates an entire class of optionality drift bugs
- God component decomposition is most effective when hooks are extracted first (Phase 28 before 29 was essential)
- The audit-then-fix pattern works for refactoring milestones too, not just feature milestones
- 1,478 lines -> ~443 lines for a core API handler shows how much complexity was in configuration vs. logic

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution
- Sessions: ~3 sessions across 2 days
- Notable: 12 plans completed in ~2 days; refactoring phases averaged faster execution than feature phases

---

## Milestone: v1.6 -- Quality & Validation

**Shipped:** 2026-03-16
**Phases:** 6 | **Plans:** 13 | **Commits:** 76
**Timeline:** 1 day (2026-03-15 -> 2026-03-16)

### What Was Built
- Vitest + React Testing Library test infrastructure with Proxy-based Framer Motion mock and custom render wrapper
- 269 automated tests across 22 test files: pure logic (scoring, merge, bid signal, errors, storage, schemas), hooks (4 hooks), components (5 components), API integration (endpoint + pipeline + schema conformance)
- Mocked regression suite replaying all 16 pass fixtures through the real merge/scoring pipeline
- GitHub Actions CI workflow with lint + test:coverage on push/PR
- Live API test suite with separate vitest config for manual trigger
- Manual UAT checklist covering 14 workflow sections with 47 checkbox steps

### What Worked
- Factory functions with Zod validation caught field mismatches immediately during test development
- Proxy-based Framer Motion mock handled all motion.* elements dynamically -- no per-element mocking needed
- Raw flat-field API fixtures (matching actual Anthropic response shape) made integration tests realistic
- Coverage thresholds as intentional forcing function -- sets improvement target without blocking development
- Phase ordering (infra -> logic -> hooks -> components -> integration -> UAT) built each layer on the previous

### What Was Inefficient
- SUMMARY.md one_liner field missing across all 13 plans (7th consecutive milestone with this issue)
- Nyquist validation remained partial across all 6 phases (draft VALIDATION.md files, not compliant)
- ROADMAP.md progress table had formatting issues on phases 33-38 (missing milestone column values)
- Some plan estimates needed correction during execution (scoring formula values, schema field requirements)

### Patterns Established
- Vitest inline config in vite.config.ts: share path aliases and plugins between dev and test
- vi.spyOn(Storage.prototype) pattern for localStorage quota exceeded simulation
- Sequential mockCreate callIndex routing for deterministic pass mapping in API tests
- fireEvent.drop with dataTransfer for react-dropzone testing in jsdom
- Separate vitest config for live API tests excluded from main suite

### Key Lessons
- Test infrastructure for an existing 10K+ LOC app can be stood up rapidly when v1.5 code health work provides clean module boundaries
- Factory functions with Zod validation are more valuable than simple object literals -- they catch schema drift as the codebase evolves
- Integration test fixtures should match actual API response shape (flat fields), not factory-generated convenience objects
- Coverage thresholds work best as forcing functions (aspirational) rather than hard gates -- functions coverage passed at 60.5% while statements lagged

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution
- Sessions: 1 session
- Notable: 13 plans completed in 47 minutes total -- fastest full milestone by absolute time; test-writing phases executed efficiently due to established patterns from v1.5

---

## Milestone: v2.0 -- Enterprise Foundation

**Shipped:** 2026-03-19
**Phases:** 7 | **Plans:** 11
**Timeline:** 2 days (2026-03-17 -> 2026-03-18)

### What Was Built
- Supabase Postgres schema with 4 tables, 16 RLS policies, CASCADE deletes, and Supabase CLI migration workflow
- Email/password auth with AuthContext, session persistence via onAuthStateChange, auth gate, branded loading screen
- Type-safe snake_case/camelCase mappers (mapRow, mapRows, mapToSnake) with Supabase-backed contract loading
- Company profile Supabase persistence with fire-and-forget upsert and meta column exclusion
- Server-owned analysis pipeline: JWT validation, DB profile read, sequential DB inserts, re-analyze mode
- All CRUD mutations (delete, resolve, note, rename) wired to Supabase with optimistic updates and closure-snapshot rollback
- Batch Supabase write for finding preservation after re-analyze (non-blocking, best-effort)
- Dead localStorage contract code removed; storageManager trimmed to single UI preference key

### What Worked
- Single new dependency (@supabase/supabase-js v2) kept scope minimal -- no ORM, no auth helpers
- Two-client pattern (anon key for RLS, service_role for server) provided clean security boundary
- Server-owns-creation pattern eliminated orphaned placeholder rows during analysis
- Phase ordering (schema -> auth -> reads -> profile -> writes -> mutations -> cleanup) was exactly right; each phase built on the previous
- Optimistic update + closure snapshot rollback pattern gave instant UI with safe recovery
- Fire-and-forget upsert for company profile kept the UI responsive while persisting async
- TEXT + CHECK constraints over Postgres ENUMs avoided migration complexity for future schema changes

### What Was Inefficient
- Pre-existing test failures not addressed: api/analyze.test.ts (16/18), api/regression.test.ts (6/6), App.test.tsx (1/3) -- Supabase migration broke mocks but fixing was out of scope
- Deleted useContractStore.test.ts rather than rewriting -- lost store-level test coverage
- .env.example documents wrong key name (SUPABASE_ANON_KEY vs VITE_SUPABASE_ANON_KEY) -- never caught during phases
- Orphaned isUploading/setIsUploading exports remained in useContractStore -- dead API surface
- Nyquist validation only 1/7 phases compliant (consistent multi-milestone issue)
- SUMMARY.md one_liner field still missing (8th consecutive milestone)

### Patterns Established
- Supabase RLS with (select auth.uid()) subquery pattern for per-row performance
- AuthenticatedApp inner component: unmounting on sign-out clears all in-memory state
- mapToSnake inverse mapper with meta column exclusion (id, created_at, updated_at)
- Parallel Supabase queries + client-side stitching via Map lookups (normalized tables)
- Optimistic update with [...contracts] closure snapshot for rollback fidelity
- Non-blocking batch writes for best-effort preservation (console.error only)
- activeViewRef pattern for detecting navigation during async operations

### Key Lessons
- Moving from localStorage to Supabase is a clean migration when done phase-by-phase (reads first, then writes, then cleanup)
- Server-owned creation (not client-side placeholder) is architecturally correct for database-backed apps
- Optimistic updates are essential for perceived performance -- users notice 200ms DB roundtrips in mutation-heavy workflows
- Test suite damage from infrastructure migrations is unavoidable when mocks assume specific storage backends -- separate test remediation phase is the right approach
- Single dependency (@supabase/supabase-js) carries enormous capability -- auth, RLS, realtime, storage -- resist adding helpers
- Fresh start (no migration) was the right call for a single-user app -- eliminated entire class of edge cases

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution
- Sessions: ~4 sessions across 2 days
- Notable: 11 plans in 2 days (~5min avg per plan); database migration milestone executed at same velocity as feature milestones

---

## Milestone: v2.1 -- Quality Restoration

**Shipped:** 2026-03-21
**Phases:** 5 | **Plans:** 8 | **Commits:** 50
**Timeline:** 3 days (2026-03-19 -> 2026-03-21)

### What Was Built
- Restored full test suite to green (269/269) with Supabase-aware mocks (createTableMock factory, JWT auth headers)
- Eliminated all high/critical npm audit vulnerabilities via targeted overrides for transitive deps
- Migrated ESLint 8→10 with flat config, typescript-eslint 5→8, react-hooks v7 -- zero-error lint pass
- 160 new tests pushing coverage to 76.92% statements / 64.01% functions (429 total tests)
- Removed dead code: orphaned isUploading state, stale env vars, phantom mockContracts references

### What Worked
- Milestone directly addressed all tech debt items carried forward from v2.0 -- systematic debt resolution
- createTableMock factory pattern unified all Supabase mock patterns across API test files
- describe.each parameterized testing compressed 12 knowledge modules and 15 MetaBadge variants into compact test blocks
- Props-based page testing (passing data as props) avoided complex hook mocking for Dashboard/AllContracts/ContractUpload
- vi.hoisted() solved the Vitest mock variable hoisting problem cleanly for jsPDF mock
- Phase ordering (tests first → security → lint → coverage → cleanup) was correct -- each phase needed the previous

### What Was Inefficient
- Phase 50 ROADMAP.md plan checkbox not updated to [x] (recurring issue, 10th milestone)
- Progress table had formatting drift on phases 49-50 (missing milestone column values)
- Nyquist validation remained partial (4 draft, 1 missing) -- 10th consecutive milestone without compliance
- npm overrides are a maintenance burden -- undici and cookie overrides will need revisiting on next major upgrades

### Patterns Established
- createTableMock factory: chainable Supabase query builder mock with .select().eq().single() + .then() paths
- vi.hoisted() for mock variables referenced in vi.mock() factories
- describe.each parameterized testing for families of similar components/modules
- Props-based page testing as alternative to hook mocking for data-driven pages
- npm overrides for transitive dependency vulnerability resolution without breaking changes

### Key Lessons
- Quality restoration milestones are fast (3 days, 8 plans) because the scope is well-defined by prior tech debt tracking
- Parameterized testing (describe.each) is dramatically more efficient than individual test cases for similar modules
- Props-based testing > hook mocking when components accept data via props -- simpler, more maintainable, fewer false failures
- npm overrides are effective for CVE resolution but create invisible maintenance burden -- track override freshness
- Test restoration after infrastructure migration is best done as a dedicated milestone, not inline during the migration

### Cost Observations
- Model: Claude Opus 4.6 for planning/execution
- Sessions: ~3 sessions across 3 days
- Notable: 8 plans in 3 days; coverage push phase (49) was the largest with 3 plans producing 160 tests

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v1.3 | v1.4 | v1.5 | v1.6 | v2.0 | v2.1 |
|--------|------|------|------|------|------|------|------|------|
| Phases | 6 | 4 | 7 | 5 | 6 | 6 | 7 | 5 |
| Plans | 13 | 8 | 8 | 11 | 12 | 13 | 11 | 8 |
| Avg plan duration | ~4min | ~4min | ~2min | ~2min | ~2min | ~3.6min | ~5min | ~4min |
| Requirements | 22/22 | 23/23 | 16/16 | 26/26 | 16/16 | 29/29 | 28/28 | 16/16 |
| Audit status | tech_debt | tech_debt | gaps_found→closed | tech_debt→closed | passed (re-audit) | tech_debt | tech_debt | passed |
| LOC | ~5,000 | ~4,238 | ~7,461 | ~9,669 | ~10,809 | ~11,122 | ~15,658 | ~15,658 |
| Tests | 0 | 0 | 0 | 0 | 0 | 269 | 269* | 429 |
| Sessions | ~10 | ~6 | 1 | ~4 | ~3 | 1 | ~4 | ~3 |

### Top Lessons (Verified Across Milestones)

1. Schema-first with required fields produces better AI output (v1.0, v1.1, v1.4)
2. Gap closure phases are lightweight and effective for cross-phase integration fixes (v1.0, v1.3, v1.4, v1.5)
3. ROADMAP.md plan checkboxes consistently fall out of sync -- needs automation (v1.0, v1.1, v1.3, v1.4)
4. Nyquist validation consistently deprioritized -- either automate or remove from process (v1.1, v1.3, v1.4, v1.5, v2.0)
5. Execution velocity improves with each milestone as patterns mature (45min→4min→2min→5min per plan)
6. Tech debt cleanup first in a milestone creates clean foundation for subsequent phases (v1.4, v1.5)
7. Incremental extraction without tests is viable when each phase verifies via tsc compilation (v1.5)
8. SUMMARY.md one_liner field consistently missing -- template or tooling should enforce it (v1.4, v1.5, v1.6, v2.0)
9. Test infrastructure is most effective when built on clean module boundaries (v1.5 code health enabled v1.6 test velocity)
10. Infrastructure migrations (localStorage→Supabase) are cleanest as phase-by-phase progression: schema→auth→reads→writes→cleanup (v2.0)
11. Test suite damage from storage backend changes is unavoidable -- plan a separate remediation phase rather than fixing inline (v2.0, v2.1)
12. Parameterized testing (describe.each) is dramatically more efficient than individual test cases for families of similar modules (v2.1)
13. Quality restoration milestones are fast and well-scoped when prior milestones track tech debt systematically (v2.1)
