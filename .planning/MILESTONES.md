# Milestones

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
