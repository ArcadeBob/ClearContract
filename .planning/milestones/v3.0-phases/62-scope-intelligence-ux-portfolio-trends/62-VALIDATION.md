---
phase: 62
slug: scope-intelligence-ux-portfolio-trends
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 62 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 62-01-01 | 01 | 1 | UX-01 | unit | `npx vitest run src/components/CategorySection.test.tsx -x` | Needs update | ⬜ pending |
| 62-01-02 | 01 | 1 | UX-02 | unit | `npx vitest run src/components/FilterToolbar.test.tsx -x` | Needs update | ⬜ pending |
| 62-02-01 | 02 | 1 | UX-02 | unit | `npx vitest run src/components/ScopeIntelView.test.tsx -x` | ❌ W0 | ⬜ pending |
| 62-02-02 | 02 | 1 | PORT-01 | unit | `npx vitest run src/components/ScopeTrendsCard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 62-02-03 | 02 | 1 | PORT-01 | unit | `npx vitest run src/components/ScopeTrendsCard.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/ScopeIntelView.test.tsx` — stubs for UX-02 (scope intel view-mode rendering)
- [ ] `src/components/ScopeTrendsCard.test.tsx` — stubs for PORT-01 (trends card aggregation + N<10 threshold)
- [ ] Update `src/components/CategorySection.test.tsx` — covers UX-01 subcategory rendering
- [ ] Update `src/components/FilterToolbar.test.tsx` — covers UX-02 scope-intel mode button

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Legacy contract empty states | UX-02 | Requires visual inspection of pre-v3.0 contract rendering | Upload a contract analyzed before v3.0, open Scope Intelligence view, verify empty states (no errors) |
| Dashboard trends card visual layout | PORT-01 | Layout correctness is visual | View dashboard with 10+ contracts, verify trends card renders exclusion frequencies and recurring scope items |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
