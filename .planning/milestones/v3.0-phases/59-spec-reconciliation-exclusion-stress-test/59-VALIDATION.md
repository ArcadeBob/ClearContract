---
phase: 59
slug: spec-reconciliation-exclusion-stress-test
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 59-01-01 | 01 | 1 | SCOPE-03 | unit | `npx vitest run api/merge.test.ts -t "spec-reconciliation" -x` | No - Wave 0 | ⬜ pending |
| 59-01-02 | 01 | 1 | SCOPE-03 | unit | `npx vitest run api/merge.test.ts -t "enforceInferenceBasis" -x` | Partial | ⬜ pending |
| 59-01-03 | 01 | 1 | SCOPE-04 | unit | `npx vitest run api/merge.test.ts -t "exclusion-stress-test" -x` | No - Wave 0 | ⬜ pending |
| 59-01-04 | 01 | 1 | SCOPE-04 | unit | `npx vitest run api/merge.test.ts -t "enforceInferenceBasis" -x` | Partial | ⬜ pending |
| 59-01-05 | 01 | 1 | SCOPE-03+04 | unit | `npx vitest run api/merge.test.ts -t "model-prior" -x` | Existing | ⬜ pending |
| 59-01-06 | 01 | 1 | SCOPE-03+04 | unit | `npx vitest run api/analyze.test.ts -t "Stage 3" -x` | Partial | ⬜ pending |
| 59-01-07 | 01 | 1 | SCOPE-03+04 | unit | `npx vitest run src/schemas/inferenceBasis.test.ts -x` | Existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/merge.test.ts` — add test cases for `spec-reconciliation` findings (convert + dedup + inference enforcement)
- [ ] `api/merge.test.ts` — add test cases for `exclusion-stress-test` findings (convert + dedup + inference enforcement)
- [ ] `api/analyze.test.ts` — update Stage 3 integration test with real pass registration
- [ ] `src/schemas/scopeComplianceAnalysis.test.ts` — schema validation tests for SpecReconciliationFindingSchema, ExclusionStressTestFindingSchema

*Existing infrastructure covers InferenceBasis schema validation and enforceInferenceBasis generic tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prompt produces useful findings on real contract | SCOPE-03+04 | LLM output quality cannot be deterministically tested | Upload a 50-page glazing subcontract; verify spec-reconciliation and exclusion-stress-test findings appear with meaningful content |
| Total pipeline stays within 250s timeout | SCOPE-03+04 | End-to-end timing depends on API latency | Run full analysis on 50-page contract; check cost summary bar timing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
