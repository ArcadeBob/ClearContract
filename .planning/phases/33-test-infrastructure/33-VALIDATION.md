---
phase: 33
slug: test-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | vite.config.ts (inline test config) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | INFRA-01 | infra | `npm run test` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | INFRA-02 | infra | `npm run test` | ❌ W0 | ⬜ pending |
| 33-02-01 | 02 | 1 | INFRA-03 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 33-02-02 | 02 | 1 | INFRA-04 | unit | `npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Vitest 3.x + @testing-library/react + @testing-library/jest-dom + jsdom installed
- [ ] `vite.config.ts` — inline test config with jsdom environment
- [ ] `src/test/setup.ts` — jest-dom matchers + framer-motion mock
- [ ] `npm run test` script in package.json

*This phase IS Wave 0 — it establishes the test infrastructure for subsequent phases.*

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
