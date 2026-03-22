---
phase: 51
slug: analysis-pipeline-parallelization-and-token-capture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test framework configured |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 51-01-01 | 01 | 1 | PERF-01 | manual | curl POST /api/analyze + check log ordering | N/A | ⬜ pending |
| 51-01-02 | 01 | 1 | PERF-02 | manual | curl POST /api/analyze + verify AbortSignal timeout | N/A | ⬜ pending |
| 51-01-03 | 01 | 1 | PERF-03 | manual | curl POST /api/analyze mid-timeout + check DB for partial results | N/A | ⬜ pending |
| 51-02-01 | 02 | 1 | COST-01, COST-02 | build | `npm run build` (type-check migration + RLS) | ❌ W0 | ⬜ pending |
| 51-02-02 | 02 | 1 | COST-01 | manual | curl POST /api/analyze + query analysis_usage table | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Supabase migration for `analysis_usage` table and CHECK constraint update
- [ ] Verify `npm run build` passes before any code changes

*No test framework to install — project uses build + lint + manual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Primer fires first, then 15 passes concurrently | PERF-01 | Requires live Claude API call with real PDF | Upload contract, check server logs for primer completion before parallel batch |
| Single pass timeout at ~90s | PERF-02 | Requires simulating slow API response | Upload large contract, monitor for individual pass abort without full analysis failure |
| Partial results persisted on function timeout | PERF-03 | Requires killing serverless function mid-execution | Upload contract, kill function at ~60s, verify DB has partial findings |
| Cache hit confirmation | PERF-01 | Requires checking API response usage fields | Upload contract, verify passes 2-16 show cache_read_input_tokens > 0 |
| Per-pass token capture in analysis_usage | COST-01, COST-02 | Requires live API call | Upload contract, query analysis_usage table for token counts and computed cost |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
