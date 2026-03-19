---
phase: 40
slug: authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.x + React Testing Library |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | AUTH-01 | unit | `npx vitest run src/pages/LoginPage.test.tsx -x` | ❌ W0 | ⬜ pending |
| 40-01-02 | 01 | 1 | AUTH-02 | integration | Manual verification (requires real Supabase) | manual-only | ⬜ pending |
| 40-01-03 | 01 | 1 | AUTH-03 | unit | `npx vitest run src/App.test.tsx -x` | ❌ W0 | ⬜ pending |
| 40-01-04 | 01 | 1 | AUTH-04 | unit | `npx vitest run src/components/Sidebar.test.tsx -x` | ❌ W0 | ⬜ pending |
| 40-01-05 | 01 | 1 | AUTH-05 | unit | `npx vitest run src/pages/LoginPage.test.tsx -x` | ❌ W0 | ⬜ pending |
| 40-01-06 | 01 | 1 | AUTH-06 | unit | `npx vitest run src/contexts/AuthContext.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/pages/LoginPage.test.tsx` — stubs for AUTH-01, AUTH-05
- [ ] `src/contexts/AuthContext.test.tsx` — stubs for AUTH-06
- [ ] `src/App.test.tsx` — stubs for AUTH-03 (auth gate rendering)
- [ ] `src/components/Sidebar.test.tsx` — stubs for AUTH-04 (sign-out button)
- [ ] Mock for `@supabase/supabase-js` auth module — shared across test files

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session persists across browser restart | AUTH-02 | Requires real Supabase session + browser close/reopen | 1. Sign in successfully 2. Close browser completely 3. Reopen browser and navigate to app 4. Verify user is still signed in without re-entering credentials |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
