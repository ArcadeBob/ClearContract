---
phase: 31
slug: server-side-api-modularization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (no test framework in project) |
| **Config file** | none — structural grep checks + build validation |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` + structural grep validation script |
| **Estimated runtime** | ~15 seconds |

**Note:** Project `tsconfig.json` only includes `src/`, not `api/`. The api/ directory is compiled by Vercel's bundler at deploy time. Structural grep checks validate api/ correctness.

---

## Sampling Rate

- **After every task commit:** Run `npm run build` + structural grep checks
- **After every plan wave:** Run full structural validation suite
- **Before `/gsd:verify-work`:** Full suite must be green + Vercel preview deploy test
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | DECOMP-04 | structural | `grep "export interface AnalysisPass" api/passes.ts` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | DECOMP-04 | structural | `grep "export const ANALYSIS_PASSES" api/passes.ts` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | DECOMP-04 | structural | `grep -c "name: '" api/passes.ts` (expect 16) | ❌ W0 | ⬜ pending |
| 31-01-04 | 01 | 1 | DECOMP-04 | structural | `grep "from './passes'" api/analyze.ts` | ✅ after extraction | ⬜ pending |
| 31-01-05 | 01 | 1 | DECOMP-04 | structural | `grep "from './analyze'" api/passes.ts` (expect 0) | ✅ after extraction | ⬜ pending |
| 31-01-06 | 01 | 1 | DECOMP-04 | build | `npm run build` | ✅ existing | ⬜ pending |
| 31-01-07 | 01 | 1 | DECOMP-04 | structural | `grep "export const config" api/analyze.ts && grep "export default" api/analyze.ts` | ✅ existing | ⬜ pending |
| 31-01-08 | 01 | 1 | DECOMP-05 | structural | `wc -l api/merge.ts` (expect ~555, unchanged) | ✅ existing | ⬜ pending |
| 31-01-09 | 01 | 1 | SC-4 | e2e/manual | Vercel preview deploy + PDF upload | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/passes.ts` — created with extracted pass definitions, AnalysisPass interface, ANALYSIS_PASSES array
- [ ] `api/analyze.ts` — updated with imports from passes.ts, reduced to orchestration-only

*Existing infrastructure (npm run build) covers compilation validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full 16-pass pipeline works end-to-end | SC-4 | Requires Vercel deploy + API key + real PDF | Deploy to Vercel preview, upload a 3-5MB PDF contract, verify analysis completes with all finding categories |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
