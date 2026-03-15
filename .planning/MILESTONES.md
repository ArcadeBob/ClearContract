# Milestones

## v1.5 Code Health (Shipped: 2026-03-15)

**Phases:** 27-32 (12 plans)
**Timeline:** 2 days (2026-03-14 → 2026-03-15)
**Code:** 55 commits, 10,809 LOC TypeScript total
**Requirements:** 16/16 satisfied
**Audit:** PASSED (re-audited after Phase 32 gap closure)

**Key accomplishments:**
- Centralized localStorage access (storageManager), error handling (classifyError), and severity palette into shared utilities — eliminated scattered inline patterns
- Extracted 3 reusable hooks: useInlineEdit (shared edit state machine), useContractFiltering (filter/group/sort with persistence), useFieldValidation (onBlur validate/save/revert)
- Decomposed god components: LegalMetaBadge (11 subcomponents), ScopeMetaBadge (4 subcomponents), ContractReview split into ReviewHeader + FilterToolbar + RiskSummary orchestrator
- Created ToastProvider context with useToast hook — eliminated prop drilling from App.tsx through page components
- Hardened type safety: Zod as single source of truth for Finding type (z.infer), client-side response validation with safeParse, localStorage v1→v2 migration, zero assertion casts in merge.ts
- Modularized 1,478-line api/analyze.ts into api/passes.ts (16 pass definitions) + slim handler (~443 lines)
- Zero tsc --noEmit errors across entire codebase after Phase 32 gap closure

**Tech debt carried forward:**
- Human UAT (live API + real contract) not yet performed
- vercel.json maxDuration: 300 may require Vercel Pro plan
- Nyquist validation not compliant (no test framework configured)

---

## v1.4 Production Readiness (Shipped: 2026-03-15)

**Phases:** 22-26 (11 plans)
**Timeline:** 2 days (2026-03-14 → 2026-03-15)
**Code:** 48 files changed, 2,902 insertions, 792 deletions (9,669 LOC TypeScript total)
**Requirements:** 26/26 satisfied
**Audit:** TECH_DEBT (all requirements met, 4 info-level items — 3 closed post-audit)

**Key accomplishments:**
- Eliminated 6 tech debt items (duplicate types, dead code, schema copies, routing asymmetry) and delivered UX quick wins — inline contract rename, open/resolved badges, urgency indicators, bid signal factor breakdown, upcoming deadlines widget
- Added 5 CA knowledge modules (insurance law, public works payment, dispute resolution, liquidated damages, glazing sub protections) with staleness warning system and updated Title 24 to 2025 code cycle
- Built category-weighted risk scoring with compound risk detection via 17th cross-pass synthesis analysis
- Delivered PDF report generation (jsPDF), action priority classification (pre-bid/pre-sign/monitor) on all findings, and negotiation checklist tab
- Cross-contract intelligence: pattern frequency detection across stored contracts, side-by-side contract comparison with findings diff and risk score delta, advanced multi-select filters
- Re-analyze finding preservation via clauseReference+category composite key matching — resolved status and notes survive re-analysis

**Tech debt carried forward:**
- negotiationPosition required in Zod schema but optional on TS Finding interface (intentional backward-compat)
- Human UAT (live API + real contract) not yet performed
- vercel.json maxDuration: 300 may require Vercel Pro plan
- Nyquist validation partial (phases 22-25 draft, phase 26 missing)

---

## v1.3 Workflow Completion (Shipped: 2026-03-13)

**Phases:** 15-21 (8 plans)
**Timeline:** 1 day (2026-03-13)
**Code:** 13 files changed, 851 insertions, 79 deletions (7,461 LOC TypeScript total)
**Requirements:** 16/16 satisfied
**Audit:** GAPS_FOUND → closed by Phase 20 + 21

**Key accomplishments:**
- URL-based routing with History API — browser back/forward, refresh, deep links, bookmarkable URLs
- Finding actions — resolve toggle, note CRUD (add/edit/delete), hide-resolved filter, resolved counts in risk summary
- Settings validation — inline errors with onBlur validation, auto-formatting, save confirmation feedback
- Re-analyze contract — PDF re-selection, confirmation dialog, loading overlay, failure rollback with error toast
- CSV export — RFC 4180 compliant, filter-aware (respects hideResolved and category filters), UTF-8 BOM for Excel
- Gap closures — All Contracts navigation fix (Phase 20) and filtered CSV export fix (Phase 21) from milestone audit

**Tech debt carried forward:**
- Dead code: updateField in useCompanyProfile.ts (replaced by saveField)
- Pre-existing TS6133 warning in CoverageComparisonTab.tsx:171
- Nyquist validation missing for phases 16-19
- Human UAT (live API + real contract) not yet performed
- vercel.json maxDuration: 300 may require Vercel Pro plan

---

## v1.1 Domain Intelligence (Shipped: 2026-03-10)

**Phases:** 7-10 (8 plans, 17 tasks)
**Timeline:** 10 days (2026-02-28 -> 2026-03-10)
**Code:** 33 files changed, 1,364 insertions, 461 deletions (4,238 LOC TypeScript total)
**Requirements:** 23/23 satisfied
**Audit:** TECH_DEBT (all requirements met, 9 minor debt items)

**Key accomplishments:**
- Knowledge module architecture with TypeScript types, central registry, token budget enforcement, and per-pass selective loading across 16 analysis passes
- Company profile Settings page with 4 data-entry cards (insurance, bonding, licenses, capabilities) backed by localStorage persistence
- Company-specific intelligence pipeline: insurance gap detection, bonding capacity checks, severity downgrade with metadata, bid/no-bid traffic light widget
- CA regulatory knowledge modules (mechanics lien law, prevailing wage, Title 24 glazing, Cal/OSHA) with void-by-law severity guard for CC 8814/2782/8122
- Industry trade knowledge: Division 08 scope classification, 40+ ASTM/AAMA/FGIA standards validation with superseded detection, AIA/ConsensusDocs/EJCDC form detection
- Full pipeline integration: 11 knowledge modules wired to analysis passes via prompt injection with side-effect imports

**Tech debt carried forward:**
- Duplicate BidSignal type definitions in contract.ts and bidSignal.ts
- Stale reviewByDate on ca-title24 module (2025-12-01)
- scope-of-work pass at max capacity (4/4 modules)
- ARCH-03 requirement text says 1500-token cap but actual cap is 10000 (documented decision)
- ARCH-04 reviewByDate metadata stored but not displayed in UI
- SUMMARY files missing requirements-completed frontmatter (phases 07-10)
- Nyquist validation incomplete (phases 08, 09 missing; 07, 10 partial)

---

## v1.0 Enhanced Analysis Release (Shipped: 2026-03-06)

**Phases:** 1-6 (13 plans)
**Timeline:** 6 days (2026-02-28 -> 2026-03-06)
**Code:** 81 files changed, ~20k insertions, 4,990 LOC TypeScript
**Requirements:** 22/22 satisfied
**Audit:** TECH_DEBT (all requirements met, 7 minor debt items)

**Key accomplishments:**
- Built multi-pass analysis pipeline with Anthropic Files API (upload once, analyze many) and structured JSON outputs via Zod schemas
- 16 specialized analysis passes covering indemnification, payment contingency, liquidated damages, retainage, insurance, termination, flow-down, delays, liens, disputes, change orders, scope, dates, compliance, and verbiage
- Every finding includes exact verbatim clause text, plain-English explanation, and clause-type-specific metadata
- Critical/High findings include negotiation positions with suggested replacement language
- Category-grouped UI with severity filtering, LegalMetaBadge and ScopeMetaBadge rendering, and view-mode toggle
- React 18 migration (createRoot), forwardRef fixes, and robust error handling throughout

**Tech debt carried forward:**
- Missing VERIFICATION.md for Phase 6
- Unused React imports in CategorySection.tsx and ContractReview.tsx
- Pre-existing BoxIcon TS2749 errors in FindingCard.tsx and StatCard.tsx
- Mock contracts don't exercise new finding fields
- Human UAT (live API) not yet performed
- vercel.json maxDuration: 300 may require Vercel Pro plan

---
