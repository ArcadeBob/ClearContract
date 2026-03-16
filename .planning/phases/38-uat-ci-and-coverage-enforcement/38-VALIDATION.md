---
phase: 38
slug: uat-ci-and-coverage-enforcement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vite.config.ts` (inline test config) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | UAT-01 | manual-only | N/A (markdown review) | ❌ W0 | ⬜ pending |
| 38-02-01 | 02 | 1 | INFRA-06 | unit | `npx vitest run --coverage` | ❌ W0 | ⬜ pending |
| 38-02-02 | 02 | 1 | UAT-02 | integration | `npx vitest run api/regression.test.ts` | ❌ W0 | ⬜ pending |
| 38-02-03 | 02 | 1 | UAT-03 | integration (manual) | `npm run test:live` | ❌ W0 | ⬜ pending |
| 38-03-01 | 03 | 2 | INFRA-05 | integration | Push to GitHub, verify Actions run | ❌ W0 | ⬜ pending |
| 38-03-02 | 03 | 2 | INFRA-06 | integration | `npx vitest run --coverage` (exits non-zero if below threshold) | ✅ (config) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@vitest/coverage-v8` — install as devDependency
- [ ] Coverage config in `vite.config.ts` — add provider, thresholds, exclude patterns
- [ ] `api/regression.test.ts` — new regression test file (extends Phase 37 patterns)
- [ ] `api/live-api.test.ts` — new live API test file with separate vitest config
- [ ] `vitest.live.config.ts` — separate config for live test isolation from CI
- [ ] `.github/workflows/ci.yml` — new CI workflow file
- [ ] `.planning/UAT-CHECKLIST.md` — new UAT checklist document
- [ ] `package.json` — add `test:live` script

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UAT checklist covers all workflows | UAT-01 | Document review, not executable | Review `.planning/UAT-CHECKLIST.md` against success criteria list |
| Vercel Pro 300s maxDuration works | UAT-04 | Requires deployed environment | Upload a long contract on production, confirm no 60s timeout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
