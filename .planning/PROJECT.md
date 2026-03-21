# ClearContract

## What This Is

A contract review tool for Clean Glass Installation Inc. that uses AI to comprehensively analyze glazing subcontracts. Uploads a PDF, runs a 17-pass analysis pipeline (16 specialized passes + cross-pass synthesis) via Claude API with domain-specific knowledge injection, and produces an organized breakdown -- legal risks with exact clause quotes and explanations, questionable verbiage, scope extraction, labor compliance checklists, negotiation positions, CA regulatory awareness, industry standards validation, compound risk detection, and bid/no-bid signals. Delivers actionable output: PDF reports, action priority classification, negotiation checklists, and cross-contract portfolio intelligence. Built for a sole user reviewing subcontracts ranging from 5 to 100+ pages.

## Core Value

When you upload a contract, you walk away with a complete, organized breakdown of everything that matters -- risks, scope, dates, compliance -- with exact contract language quoted so you can act on it immediately.

## Requirements

### Validated

- ✓ PDF upload with drag-and-drop (10MB max) -- v1.0
- ✓ View-based SPA with dashboard, upload, review, contracts, settings pages -- v1.0
- ✓ AI-powered analysis via Claude API (Vercel serverless) -- v1.0
- ✓ Risk score (0-100) with deterministic severity-weighted computation -- v1.0
- ✓ Finding categorization (9 categories) with severity levels -- v1.0
- ✓ Date/milestone extraction -- v1.0
- ✓ Contract review page with findings display and filtering -- v1.0
- ✓ Multi-pass analysis engine (16 specialized passes) with structured JSON outputs -- v1.0
- ✓ Native PDF support via Anthropic Files API with unpdf fallback -- v1.0
- ✓ Exact verbatim clause quotes + plain-English explanations on every finding -- v1.0
- ✓ Legal clause analysis: indemnification, pay-if-paid, liquidated damages, retainage, insurance, termination, flow-down, delays, liens, disputes, change orders -- v1.0
- ✓ Scope extraction with inclusions, exclusions, spec references, scope rules -- v1.0
- ✓ Questionable verbiage flagging (ambiguous, one-sided, missing protections) -- v1.0
- ✓ Labor compliance checklist with dates, parties, contacts -- v1.0
- ✓ Negotiation positions on Critical/High findings -- v1.0
- ✓ Category-grouped output with view-mode toggle -- v1.0
- ✓ Knowledge module architecture with per-pass selective loading -- v1.1
- ✓ Company profile Settings (insurance, bonding, licenses, capabilities) with localStorage persistence -- v1.1
- ✓ Insurance gap detection and bonding capacity comparison against company profile -- v1.1
- ✓ Severity downgrade for findings company already meets, with metadata tracking -- v1.1
- ✓ Bid/no-bid traffic light signal with 5 weighted factors -- v1.1
- ✓ CA regulatory knowledge: mechanics lien law, prevailing wage, Title 24, Cal/OSHA -- v1.1
- ✓ Void-by-law severity guard for CA statutes (CC 8814, 2782, 8122) -- v1.1
- ✓ Division 08 scope classification flagging non-glazing work -- v1.1
- ✓ ASTM/AAMA/FGIA standards validation with obsolescence detection -- v1.1
- ✓ Contract standard form detection (AIA A401, ConsensusDocs 750, EJCDC) with deviation flagging -- v1.1
- ✓ localStorage persistence for contracts across sessions -- v1.2
- ✓ Contract deletion with confirmation dialog -- v1.2
- ✓ Upload error feedback with toast notifications and inline file rejections -- v1.2
- ✓ Dashboard and DateTimeline empty states -- v1.2
- ✓ URL-based routing with History API (back/forward, refresh, deep links) -- v1.3
- ✓ Finding actions: resolve toggle, note CRUD, hide-resolved filter, resolved counts -- v1.3
- ✓ Settings inline validation with onBlur persistence and save feedback -- v1.3
- ✓ Re-analyze contract with PDF re-selection, confirmation dialog, and failure rollback -- v1.3
- ✓ CSV export of findings with filter awareness (hideResolved, category) -- v1.3
- ✓ Tech debt cleanup: consolidated types, single init, type-safe merge, shared schemas, consistent routing -- v1.4
- ✓ UX quick wins: inline contract rename, open/resolved badges, urgency indicators, bid signal breakdown, upcoming deadlines -- v1.4
- ✓ Category-weighted risk scoring with cross-pass compound risk synthesis (17th pass) -- v1.4
- ✓ 5 new CA knowledge modules with staleness warning system and Title 24 2025 update -- v1.4
- ✓ PDF report generation with jsPDF (header, risk score, findings by category, dates) -- v1.4
- ✓ Action priority classification (pre-bid/pre-sign/monitor) on all findings -- v1.4
- ✓ Negotiation checklist tab with findings grouped by action priority -- v1.4
- ✓ Cross-contract pattern detection on dashboard -- v1.4
- ✓ Side-by-side contract comparison with findings diff and risk score delta -- v1.4
- ✓ Advanced multi-select filters (severity, category, priority, negotiation position) -- v1.4
- ✓ Re-analyze finding preservation via composite key matching (resolved status + notes) -- v1.4
- ✓ Centralized localStorage access (storageManager), error handling (classifyError), severity palette -- v1.5
- ✓ Extracted reusable hooks: useInlineEdit, useContractFiltering, useFieldValidation -- v1.5
- ✓ Component decomposition: LegalMetaBadge (11 subcomponents), ScopeMetaBadge (4), ContractReview (3 subcomponents) -- v1.5
- ✓ ToastProvider context with useToast hook — eliminated prop drilling -- v1.5
- ✓ Zod as single source of truth for Finding type, client-side response validation, localStorage migration -- v1.5
- ✓ Server-side modularization: api/passes.ts extracted, analyze.ts slimmed to ~443 lines -- v1.5
- ✓ Zero tsc --noEmit errors across entire codebase -- v1.5
- ✓ Request validation schema for /api/analyze POST body -- v1.5
- ✓ merge.ts assertion casts replaced with Zod safeParse type guards -- v1.5
- ✓ Vitest + React Testing Library test infrastructure with Framer Motion mock and custom render wrapper -- v1.6
- ✓ 269 automated tests across pure logic, hooks, components, and API integration -- v1.6
- ✓ All 15 specialized pass handlers tested with Zod schema validation on merge output -- v1.6
- ✓ Component tests for FindingCard, SeverityBadge, UploadZone, FilterToolbar, Sidebar -- v1.6
- ✓ Mocked regression suite replaying 16 pass fixtures through pipeline -- v1.6
- ✓ GitHub Actions CI workflow with coverage thresholds -- v1.6
- ✓ Manual UAT checklist covering full user workflow -- v1.6
- ✓ Live API test suite with separate vitest config -- v1.6
- ✓ Supabase Postgres schema (contracts, findings, contract_dates, company_profiles) with 16 RLS policies and CASCADE deletes -- v2.0
- ✓ Email/password authentication with session persistence, auth gate, and protected routes -- v2.0
- ✓ Type-safe snake_case/camelCase mappers with Supabase-backed contract loading -- v2.0
- ✓ Company profile Supabase persistence with fire-and-forget upsert -- v2.0
- ✓ Server-owned analysis pipeline with JWT auth, DB profile read, and Postgres writes -- v2.0
- ✓ All CRUD mutations wired to Supabase with optimistic updates and rollback -- v2.0
- ✓ localStorage contract code removed, storageManager trimmed to UI preferences only -- v2.0
- ✓ Full test suite restored (269/269 green) with Supabase-aware mocks -- v2.1
- ✓ Zero high/critical npm audit vulnerabilities -- v2.1
- ✓ ESLint 10+ flat config with typescript-eslint v8 -- v2.1
- ✓ 76.92% statement / 64.01% function coverage (429 tests total) -- v2.1
- ✓ Dead code removed (isUploading, stale env vars, phantom references) -- v2.1

### Active

- [ ] Analysis parallelization
- [ ] Token/cost tracking
- [ ] Contract lifecycle & date intelligence

### Out of Scope

- Multi-user/team features -- sole user, not needed now
- Mobile app -- web-only
- Real-time collaboration -- sole user
- Automated redlining / markup -- legal liability risk
- Playbook / template customization -- AI prompt IS the playbook
- Real-time chat with contract -- comprehensive upfront analysis suffices
- Procore / PM integration -- export report, user attaches to PM
- Multi-language support -- US glazing contracts are in English
- RAG / vector database -- knowledge base under 50K tokens; TypeScript modules simpler and type-safe
- Full standard form document storage -- copyright issues with AIA/ConsensusDocs; clause patterns only
- Real-time regulatory monitoring -- CA regulations change 1-2x/year; manual updates sufficient
- AI fine-tuning / model training -- using Claude API; prompt engineering with knowledge injection is correct approach
- Saved/named filter presets -- advanced filters sufficient for sole user without persistence
- Custom tags/bookmarks on findings -- resolved + notes + filters cover annotation needs
- Negotiation status tracking (Open/Proposed/Agreed) -- checklist view is read-only extract; status tracking adds workflow complexity
- Cross-contract trend graphs over time -- pattern detection covers insights; time-series charts are premature
- Template negotiation scripts -- negotiationPosition from AI is per-finding; generic templates add legal liability

## Context

Shipped v2.1 with ~15,658 LOC TypeScript across client, server, knowledge modules, and test suites.
Tech stack: React 18, TypeScript (strict), Vite, Tailwind CSS, Framer Motion, Anthropic SDK, jsPDF, Supabase (Postgres + Auth), Vitest, React Testing Library, ESLint 10 (flat config).
Deployed on Vercel with serverless function (api/analyze.ts + api/passes.ts + api/pdf.ts).
17-pass analysis pipeline (16 specialized + 1 synthesis) via Files API upload-once/analyze-many pattern.
16 knowledge modules across 3 domains (regulatory, trade, standards) with expiration-based staleness warnings.
Category-weighted risk scoring with compound risk detection across pass boundaries.
Company profile persists in Supabase (was localStorage) and drives insurance/bonding comparison and bid/no-bid signals.
All structured outputs via Zod v3 schemas converted to JSON Schema. Finding type derived from z.infer (Zod is single source of truth).
All contract data persists in Supabase Postgres with RLS. Auth via Supabase email/password with session persistence. URL-based routing via custom History API hook.
Finding workflow: resolve/annotate, hide resolved, multi-select filters, filter-aware CSV export. All mutations use optimistic updates with rollback.
Actionable output: PDF reports, action priority badges, negotiation checklist tab, bid signal factor breakdown.
Portfolio intelligence: cross-contract pattern detection, side-by-side comparison, finding preservation across re-analysis.
Code health: shared utilities (storageManager for UI prefs only, classifyError, palette), 3 extracted hooks, decomposed god components, ToastProvider context, zero tsc errors. No dead code or orphaned exports.
Test coverage: 429 automated tests (76.92% statements, 64.01% functions), mocked regression suite, live API test suite, GitHub Actions CI with coverage thresholds passing. ESLint 10 flat config with zero errors.

## Constraints

- **Deployment**: Vercel Pro with 300s serverless function timeout
- **API**: Anthropic Claude API -- token limits and costs factor into pass design
- **File size**: 10MB max PDF upload (Vercel 4.5MB body limit via base64)
- **Stack**: React 18 + TypeScript + Tailwind + Vite + jsPDF (established, no reason to change)
- **Knowledge modules**: scope-of-work pass at max capacity (4 modules); adding more requires raising MAX_MODULES_PER_PASS
- **Storage**: Supabase Postgres with RLS -- localStorage retained only for UI preferences (hide-resolved filter)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Phased analysis approach (16 passes) | Single API call can't cover long contracts comprehensively | ✓ Good -- enables deep analysis per clause type |
| Quotes + explanation format | User needs exact contract language to act on findings | ✓ Good -- every finding has clauseText + explanation |
| Subcontractor perspective | All analysis flags risks from glazing sub's perspective | ✓ Good -- consistent framing throughout |
| Zod v3 schemas with zod-to-json-schema | SDK zodOutputFormat requires Zod v4, project uses v3 | ✓ Good -- clean bridge, identical output |
| Files API upload-once/analyze-many | Avoid re-uploading PDF per pass | ✓ Good -- efficient, reliable |
| Self-contained pass schemas | Each pass has local enums to avoid cross-dependency | ✓ Good -- structured outputs compile independently |
| Required metadata fields in schemas | Optional fields produce lower quality structured outputs | ✓ Good -- forces Claude to populate all fields |
| Composite key dedup (clauseReference+category) | Multiple passes may find same clause | ✓ Good -- prefers specialized pass findings |
| Deterministic risk scoring (severity weights) | Reproducible, transparent scoring | ✓ Good -- consistent scores |
| Category-grouped default view | Users work through contracts systematically by topic | ✓ Good -- matches review workflow |
| negotiationPosition required in schema, optional on client | Maximizes structured output quality while allowing empty for Low/Info | ✓ Good -- all Critical/High get positions |
| Knowledge as TypeScript modules (not RAG) | Under 50K tokens total; type-safe, no new dependencies | ✓ Good -- simple, reliable |
| Content as Claude instructions (not reference text) | Direct prompt injection, Claude acts on knowledge immediately | ✓ Good -- natural analysis integration |
| Central registry with Map-based module store | O(1) lookups, per-pass selective loading | ✓ Good -- efficient, no context bloat |
| Token cap 10000 per module | Comprehensive industry content needs space | ✓ Good -- modules range 450-1200 tokens |
| onBlur persistence for company profile | Avoids excessive localStorage writes per keystroke | ✓ Good -- smooth UX |
| Severity downgrade (never remove) for false positives | Preserves finding visibility while adjusting severity | ✓ Good -- transparent to user |
| Deterministic bid signal (5 weighted factors) | Reproducible scoring: Bonding/Insurance 0.25, Scope 0.20, Payment/Retainage 0.15 | ✓ Good -- consistent signals |
| Severity guard runs after risk score computation | Display-only upgrade, no risk score inflation | ✓ Good -- accurate scoring preserved |
| $refStrategy: 'none' for zodToJsonSchema | Anthropic API doesn't support $ref in structured output | ✓ Good -- eliminated runtime errors |
| Custom History API hook (not wouter/React Router) | Only 3 flat routes; zero deps, ~80 lines | ✓ Good -- simple, no overhead |
| Upload view transient (no URL) | Upload is a modal action, not a bookmarkable destination | ✓ Good -- clean URL semantics |
| Optional resolved/note fields with nullish coalescing | Backward compat with existing localStorage contracts | ✓ Good -- zero migration needed |
| Filter at data level (visibleFindings) | Single filtered array feeds both view modes and CSV export | ✓ Good -- consistent filtering |
| onBlur validation with revert | Validates on field exit, reverts invalid input to last good value | ✓ Good -- prevents bad data |
| structuredClone for re-analyze rollback | Deep copy of contract state before re-analysis attempt | ✓ Good -- safe rollback |
| CSV with UTF-8 BOM | Excel opens CSV correctly without import wizard | ✓ Good -- user-friendly |
| Exact-match before prefix in URL parsing | /contracts before /contracts/:id prevents false matches | ✓ Good -- correct routing |
| Two-tier category weights (1.0x legal/financial, 0.75x scope/compliance) | Legal and financial findings carry more risk weight than scope or compliance | ✓ Good -- better risk differentiation |
| Synthesis pass non-fatal (empty array on failure) | Cross-pass synthesis is additive; failure shouldn't block analysis | ✓ Good -- graceful degradation |
| actionPriority required in Zod, optional on TS interface | Same pattern as negotiationPosition; backward compat for old contracts | ✓ Good -- consistent approach |
| jsPDF for client-side PDF generation | No server roundtrip needed; letter format for US construction industry | ✓ Good -- fast, reliable |
| Composite key for finding preservation across re-analysis | clauseReference+category matches old→new findings to preserve resolved/notes | ✓ Good -- user work survives re-analysis |
| Set-based multi-select filter state | All-selected = no filtering; clean toggle semantics | ✓ Good -- intuitive behavior |
| Compare route transient (no sidebar entry) | Contract comparison is ad-hoc action, not persistent navigation | ✓ Good -- clean navigation |
| StorageResult<T> wrapper for all storage ops | Typed ok/data/error/quotaExceeded; replaces try/catch at each call site | ✓ Good -- consistent error handling |
| Zod as single source of truth (z.infer) | Finding type derived from MergedFindingSchema; eliminates optionality drift | ✓ Good -- zero Zod/TS mismatches |
| localStorage v1→v2 migration | Fills newly-required fields with safe defaults instead of clearing data | ✓ Good -- backward compatible |
| Record<DiscriminantType, FC> dispatcher pattern | MetaBadge decomposition uses type-safe dispatch map instead of switch/case | ✓ Good -- clean component routing |
| Toast fixed positioning + provider timer | Auto-dismiss 3s timer in ToastProvider, not in each caller | ✓ Good -- centralized behavior |
| Incremental extraction over wholesale rewrite | Safer without test coverage; each phase verifiable independently | ✓ Good -- zero regressions |
| Server modularization last | Highest regression risk; verify all client phases first | ✓ Good -- caught TYPE-01 gap before touching server |
| Coalesce undefined at store level | `note ?? ''` in updateFindingNote for Finding.note type safety | ✓ Good -- single fix point |
| Vitest inline config in vite.config.ts | Share path aliases and plugins between dev and test | ✓ Good -- zero config drift |
| Proxy-based Framer Motion mock | Handles all motion.* elements dynamically, filters animation props | ✓ Good -- no per-element mocking needed |
| Factory functions with Zod validation | Test factories produce schema-valid objects; catches drift immediately | ✓ Good -- caught field mismatches early |
| localStorage spy pattern (vi.spyOn Storage.prototype) | Test quota exceeded without affecting other tests | ✓ Good -- clean isolation |
| Raw flat-field API fixtures (not factory-generated) | Match actual Anthropic API JSON shape for integration tests | ✓ Good -- realistic fixture data |
| Coverage thresholds as forcing function (60%) | CI fails until coverage improves; functions pass, statements aspirational | ✓ Good -- drives incremental improvement |
| Live test isolation via separate vitest config | Excluded from main suite; runs only via npm run test:live | ✓ Good -- CI-safe, no API key required |
| Fresh start (no localStorage migration) | Single user decided to start fresh rather than migrate data | ✓ Good -- eliminated migration complexity |
| Single dependency: @supabase/supabase-js v2 | No auth-helpers, no ORM; one package for auth + DB | ✓ Good -- minimal footprint |
| Two-client pattern (anon + service_role) | Anon key for client RLS queries, service_role for server writes | ✓ Good -- proper security boundary |
| Server owns contract creation | Server writes contract/findings/dates to DB during analysis, not client | ✓ Good -- eliminates orphaned placeholder rows |
| TEXT + CHECK over Postgres ENUMs | Easier to add new values without migrations | ✓ Good -- flexible schema evolution |
| (select auth.uid()) in RLS policies | Subquery pattern for auth.uid() in RLS policies for performance | ✓ Good -- avoids per-row function call overhead |
| AuthenticatedApp inner component | Unmounting clears all in-memory state on sign-out | ✓ Good -- clean state reset |
| mapToSnake for write payloads | Inverse of mapRow; excludes meta columns (id, created_at, updated_at) | ✓ Good -- consistent write pattern |
| Fire-and-forget upsert for company profile | UI updates immediately, Supabase write async with toast on failure | ✓ Good -- responsive UX |
| Optimistic updates with closure snapshot rollback | [...contracts] snapshot before mutation for safe rollback | ✓ Good -- instant UI feedback with safety net |
| Non-blocking batch write for finding preservation | Partial failures logged to console.error, no user toast | ✓ Good -- preservation is best-effort, not blocking |
| createTableMock factory for Supabase query builder | Chainable mock with dual .single()/.then() paths for all DB operations | ✓ Good -- unified mock pattern across all API tests |
| undici ^6.24.0 override (not ^5.29.0) | All 5.x in vulnerable range <=6.23.0 | ✓ Good -- resolved critical CVE |
| Leave moderate ajv/esbuild vulns | Require breaking vite 8.x / @vercel/node 3.x upgrades | ✓ Good -- accepted risk, documented |
| ESLint no-unused-vars/no-explicit-any as warn | Match pre-migration v5 severity levels | ✓ Good -- gradual strictness |
| --legacy-peer-deps for react-hooks v7 | Peer dep fix merged but unpublished for ESLint 10 | ✓ Good -- temporary workaround |
| describe.each parameterized testing | All 12 knowledge modules + 15 MetaBadge variants | ✓ Good -- DRY test coverage |
| vi.hoisted() for mock variables | jsPDF mock variables referenced in vi.mock() factory | ✓ Good -- correct Vitest hoisting |
| Props-based page testing | Dashboard/AllContracts/ContractUpload tested via props, no hook mocking | ✓ Good -- simpler, more maintainable |

## Current Milestone: v2.2 Performance & Intelligence

**Goal:** Parallelize the analysis pipeline for speed, add token/cost tracking for visibility, and build contract lifecycle management with date intelligence for actionable portfolio insights.

**Target features:**
- Analysis parallelization (independent passes run concurrently)
- Token/cost tracking per pass and per contract
- Contract lifecycle status tracking (Draft → Negotiating → Signed → Active)
- Portfolio-wide deadline timeline and date intelligence

## Completed Milestones

- **v1.0** Enhanced Analysis Release (2026-03-06) -- 16-pass analysis pipeline, findings with clause quotes
- **v1.1** Domain Intelligence (2026-03-10) -- knowledge modules, company profile, bid/no-bid signals
- **v1.2** UX Foundations (2026-03-12) -- persistence, contract management, upload error feedback
- **v1.3** Workflow Completion (2026-03-13) -- routing, finding actions, settings, re-analyze, CSV export
- **v1.4** Production Readiness (2026-03-15) -- risk scoring, PDF reports, action priority, portfolio intelligence
- **v1.5** Code Health (2026-03-15) -- shared utilities, hook extraction, component decomposition, type safety
- **v1.6** Quality & Validation (2026-03-16) -- 269 automated tests, CI pipeline, UAT checklist, regression suite
- **v2.0** Enterprise Foundation (2026-03-19) -- Supabase Postgres + Auth, all data in DB, server-owned analysis, optimistic CRUD
- **v2.1** Quality Restoration (2026-03-21) -- test suite restored, npm vulns fixed, ESLint 10, 76.92% coverage, dead code removed

---
*Last updated: 2026-03-21 after v2.2 milestone start*
