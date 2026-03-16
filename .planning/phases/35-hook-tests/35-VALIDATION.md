---
phase: 35
slug: hook-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | HOOK-01 | unit | `npx vitest run src/hooks/__tests__/useContractStore.test.ts` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 1 | HOOK-02 | unit | `npx vitest run src/hooks/__tests__/useInlineEdit.test.ts` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 1 | HOOK-03 | unit | `npx vitest run src/hooks/__tests__/useContractFiltering.test.ts` | ❌ W0 | ⬜ pending |
| 35-04-01 | 04 | 1 | HOOK-04 | unit | `npx vitest run src/hooks/__tests__/useFieldValidation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — Vitest, @testing-library/react, and factory functions are already in place from Phases 33-34.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
