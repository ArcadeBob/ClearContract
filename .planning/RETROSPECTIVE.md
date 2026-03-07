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

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 6 |
| Plans | 13 |
| Avg plan duration | ~4min |
| Requirements | 22/22 |
| Audit status | tech_debt |
| LOC | ~5,000 |
