# ClearContract

## What This Is

A contract review tool for Clean Glass Installation Inc. that uses AI to comprehensively analyze glazing subcontracts. Uploads a PDF, runs 16 specialized analysis passes via Claude API, and produces an organized breakdown -- legal risks with exact clause quotes and explanations, questionable verbiage, scope extraction, labor compliance checklists, and negotiation positions for high-risk findings. Built for a sole user reviewing subcontracts ranging from 5 to 100+ pages.

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

### Active

(None -- plan next milestone)

### Out of Scope

- Multi-user/team features -- sole user, not needed now
- User authentication -- single-user context
- Data persistence across sessions -- acceptable for now
- Mobile app -- web-only
- Real-time collaboration -- sole user
- Automated redlining / markup -- legal liability risk
- Multi-document comparison -- single contract focus
- Playbook / template customization -- AI prompt IS the playbook
- Real-time chat with contract -- comprehensive upfront analysis suffices
- Contract storage / database -- no persistence needed
- Procore / PM integration -- export report, user attaches to PM
- Multi-language support -- US glazing contracts are in English

## Context

Shipped v1.0 with ~5,000 LOC TypeScript across client and server.
Tech stack: React 18, TypeScript (strict), Vite, Tailwind CSS, Framer Motion, Anthropic SDK.
Deployed on Vercel with serverless function (api/analyze.ts, 1,537 LOC).
16 analysis passes run in parallel via Files API upload-once/analyze-many pattern.
All structured outputs via Zod v3 schemas converted to JSON Schema.

Known tech debt: unused React imports, mock contracts don't exercise new fields, human UAT pending, vercel.json maxDuration may need Pro plan.

## Constraints

- **Deployment**: Vercel serverless with configurable function timeout (currently 300s, may need Pro plan)
- **API**: Anthropic Claude API -- token limits and costs factor into pass design
- **File size**: 10MB max PDF upload (Vercel 4.5MB body limit via base64)
- **Stack**: React 18 + TypeScript + Tailwind + Vite (established, no reason to change)

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

---
*Last updated: 2026-03-06 after v1.0 milestone*
