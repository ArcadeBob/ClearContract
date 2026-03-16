---
phase: 37
slug: api-integration-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.x (inline config in vite.config.ts) |
| **Config file** | vite.config.ts (test section) |
| **Quick run command** | `npx vitest run api/analyze.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run api/analyze.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | INTG-01 | integration | `npx vitest run api/analyze.test.ts -t "valid PDF"` | ❌ W0 | ⬜ pending |
| 37-01-02 | 01 | 1 | INTG-02 | integration | `npx vitest run api/analyze.test.ts -t "error"` | ❌ W0 | ⬜ pending |
| 37-02-01 | 02 | 1 | INTG-03 | integration | `npx vitest run api/analyze.test.ts -t "pipeline"` | ❌ W0 | ⬜ pending |
| 37-02-02 | 02 | 1 | INTG-04 | integration | `npx vitest run api/analyze.test.ts -t "schema"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/analyze.test.ts` — replace placeholder with real integration tests
- [ ] `api/test-fixtures/pass-responses.ts` — new fixture file for all 16 passes + synthesis

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
