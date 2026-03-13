---
phase: 15
slug: url-based-routing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (manual testing) |
| **Config file** | N/A |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | ROUTE-01 | manual | `npm run build` | N/A | ⬜ pending |
| 15-01-02 | 01 | 1 | ROUTE-02 | manual | `npm run build` | N/A | ⬜ pending |
| 15-01-03 | 01 | 1 | ROUTE-03 | manual | `npm run build` | N/A | ⬜ pending |
| 15-01-04 | 01 | 1 | ROUTE-04 | manual | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Back/forward buttons navigate between views | ROUTE-01 | Requires browser interaction | Navigate dashboard → contract review → click back → verify dashboard shown |
| Page refresh preserves current view | ROUTE-02 | Requires browser refresh | Navigate to `/contracts/:id` → refresh → verify same contract review shown |
| Deep link to contract review | ROUTE-03 | Requires new tab navigation | Copy `/contracts/:id` URL → paste in new tab → verify contract loads |
| Unknown URL shows dashboard | ROUTE-04 | Requires manual URL entry | Navigate to `/contracts/bad-id` → verify dashboard shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
