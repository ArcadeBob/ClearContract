# ClearContract

## What This Is

A contract review tool for Clean Glass Installation Inc. that uses AI to comprehensively analyze glazing subcontracts. Uploads a PDF, runs 16 specialized analysis passes via Claude API with domain-specific knowledge injection, and produces an organized breakdown -- legal risks with exact clause quotes and explanations, questionable verbiage, scope extraction, labor compliance checklists, negotiation positions, CA regulatory awareness, industry standards validation, and bid/no-bid signals. Built for a sole user reviewing subcontracts ranging from 5 to 100+ pages.

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

### Active

- [ ] Export contract analysis as PDF or CSV report
- [ ] Settings fields validated with save confirmation feedback
- [ ] URL-based routing with deep links and browser back/forward support
- [ ] Re-analyze contract after company profile changes
- [ ] Finding actions: resolve and annotate findings during review

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
- RAG / vector database -- knowledge base under 50K tokens; TypeScript modules simpler and type-safe
- Full standard form document storage -- copyright issues with AIA/ConsensusDocs; clause patterns only
- Real-time regulatory monitoring -- CA regulations change 1-2x/year; manual updates sufficient
- AI fine-tuning / model training -- using Claude API; prompt engineering with knowledge injection is correct approach

## Context

Shipped v1.1 with ~4,238 LOC TypeScript across client, server, and knowledge modules.
Tech stack: React 18, TypeScript (strict), Vite, Tailwind CSS, Framer Motion, Anthropic SDK.
Deployed on Vercel with serverless function (api/analyze.ts).
16 analysis passes run in parallel via Files API upload-once/analyze-many pattern.
11 knowledge modules across 3 domains (regulatory, trade, standards) injected per-pass via prompt builder.
Company profile with localStorage persistence drives insurance/bonding comparison and bid/no-bid signals.
All structured outputs via Zod v3 schemas converted to JSON Schema.

Known tech debt: duplicate BidSignal types, stale reviewByDate on ca-title24, scope-of-work pass at max capacity (4/4 modules), human UAT pending, vercel.json maxDuration may need Pro plan.

## Constraints

- **Deployment**: Vercel serverless with configurable function timeout (currently 300s, may need Pro plan)
- **API**: Anthropic Claude API -- token limits and costs factor into pass design
- **File size**: 10MB max PDF upload (Vercel 4.5MB body limit via base64)
- **Stack**: React 18 + TypeScript + Tailwind + Vite (established, no reason to change)
- **Knowledge modules**: scope-of-work pass at max capacity (4 modules); adding more requires raising MAX_MODULES_PER_PASS

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

## Current Milestone: v1.3 Workflow Completion

**Goal:** Complete stubbed features, add routing, and enable the full contract review workflow with export, re-analysis, and finding actions.

**Target features:**
- Export Report (PDF/CSV)
- Settings Validation + Save Feedback
- URL-based Routing
- Re-analyze Contract
- Finding Actions (Resolve/Annotate)

---
*Last updated: 2026-03-12 after v1.3 milestone start*
