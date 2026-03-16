---
phase: 36
slug: component-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 + React Testing Library 16 |
| **Config file** | vite.config.ts (inline test config) |
| **Quick run command** | `npx vitest run src/components/ -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/ -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | COMP-01 | component | `npx vitest run src/components/FindingCard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 1 | COMP-02 | component | `npx vitest run src/components/SeverityBadge.test.tsx -x` | ✅ expand | ⬜ pending |
| 36-02-01 | 02 | 1 | COMP-03 | component | `npx vitest run src/components/UploadZone.test.tsx -x` | ❌ W0 | ⬜ pending |
| 36-02-02 | 02 | 1 | COMP-04 | component | `npx vitest run src/components/FilterToolbar.test.tsx -x` | ❌ W0 | ⬜ pending |
| 36-02-03 | 02 | 1 | COMP-05 | component | `npx vitest run src/components/Sidebar.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/FindingCard.test.tsx` — stubs for COMP-01
- [ ] `src/components/UploadZone.test.tsx` — stubs for COMP-03
- [ ] `src/components/FilterToolbar.test.tsx` — stubs for COMP-04
- [ ] `src/components/Sidebar.test.tsx` — stubs for COMP-05
- SeverityBadge.test.tsx already exists (2 tests) — expand in-place for COMP-02

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
