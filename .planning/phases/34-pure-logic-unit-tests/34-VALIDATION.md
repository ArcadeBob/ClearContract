---
phase: 34
slug: pure-logic-unit-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (inline in vite.config.ts) |
| **Config file** | vite.config.ts (test section) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05, UNIT-06 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 34-02-01 | 02 | 1 | UNIT-01 | unit | `npx vitest run api/scoring.test.ts -x` | ❌ W0 | ⬜ pending |
| 34-02-02 | 02 | 1 | UNIT-02, UNIT-06 | unit | `npx vitest run api/merge.test.ts -x` | ❌ W0 | ⬜ pending |
| 34-02-03 | 02 | 1 | UNIT-03 | unit | `npx vitest run src/utils/bidSignal.test.ts -x` | ❌ W0 | ⬜ pending |
| 34-02-04 | 02 | 1 | UNIT-04 | unit | `npx vitest run src/utils/errors.test.ts -x` | Exists (trivial) | ⬜ pending |
| 34-03-01 | 03 | 2 | UNIT-05 | unit | `npx vitest run src/storage/storageManager.test.ts src/storage/contractStorage.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/factories.ts` — extend with 15 pass-specific factory functions
- [ ] `api/scoring.test.ts` — stub for UNIT-01
- [ ] `api/merge.test.ts` — stub for UNIT-02, UNIT-06
- [ ] `src/utils/bidSignal.test.ts` — stub for UNIT-03
- [ ] `src/utils/errors.test.ts` — replace trivial with comprehensive (UNIT-04)
- [ ] `src/storage/storageManager.test.ts` — stub for UNIT-05 (generic CRUD)
- [ ] `src/storage/contractStorage.test.ts` — stub for UNIT-05 (domain + migration)

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
