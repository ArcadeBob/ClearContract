# ClearContract

## What This Is

A contract review tool for Clean Glass Installation Inc. that uses AI to comprehensively analyze glazing subcontracts. Uploads a PDF, extracts the full text, and produces an organized breakdown — legal risks with exact clause quotes and explanations, questionable verbiage, scope extraction, and labor compliance checklists. Built for a sole user reviewing subcontracts ranging from 5 to 100+ pages.

## Core Value

When you upload a contract, you walk away with a complete, organized breakdown of everything that matters — risks, scope, dates, compliance — with exact contract language quoted so you can act on it immediately.

## Requirements

### Validated

- ✓ PDF upload with drag-and-drop (3MB max) — existing
- ✓ View-based SPA with dashboard, upload, review, contracts, settings pages — existing
- ✓ AI-powered analysis via Claude API (Vercel serverless) — existing (but broken)
- ✓ Risk score (0-100) — existing
- ✓ Finding categorization (9 categories) with severity levels — existing
- ✓ Date/milestone extraction — existing
- ✓ Contract review page with findings display and filtering — existing

### Active

- [ ] Fix analysis bug — analysis currently fails with generic error
- [ ] Comprehensive legal issues extraction — exact clause quotes + explanation of why each is problematic (indemnification, pay-if-paid, liquidated damages, retainage, insurance, etc.)
- [ ] Questionable verbiage detection — ambiguous clauses, one-sided terms favoring GC, missing standard protections
- [ ] Scope of project extraction — pull full scope, scope rules, identify gaps, enable comparison to bid
- [ ] Labor compliance requirements checklist — all compliance items with associated dates and contacts
- [ ] Organized full breakdown output — all analysis categories presented in a clear, actionable format

### Out of Scope

- Multi-user/team features — sole user, not needed now
- User authentication — single-user context
- Data persistence across sessions — acceptable for now
- Mobile app — web-only
- Real-time collaboration — sole user

## Context

- Clean Glass Installation Inc. is a glazing subcontractor
- Primary contract type: subcontracts from general contractors
- Contracts range from 5 to 100+ pages
- Current system truncates text to 100k chars and uses a single Claude call with 4096 max tokens — insufficient for comprehensive analysis of long contracts
- Analysis currently fails with a generic error that needs diagnosis and fixing
- The user needs exact contract language quoted alongside explanations — not just summaries
- Output should support negotiation prep (push back on GC), scope verification (compare to bid), and compliance tracking (dates/contacts checklist)

## Constraints

- **Deployment**: Vercel serverless with 60-second function timeout
- **API**: Anthropic Claude API — token limits and costs factor into chunking strategy
- **File size**: Currently 3MB max PDF upload
- **Stack**: React 18 + TypeScript + Tailwind + Vite (existing, no reason to change)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Phased analysis approach | Contracts are long, single API call can't cover everything comprehensively | — Pending |
| Quotes + explanation format | User needs exact contract language to act on findings, not just summaries | — Pending |
| Subcontractor perspective | All analysis should flag risks from glazing sub's perspective, not GC's | — Pending |

---
*Last updated: 2026-03-02 after initialization*
