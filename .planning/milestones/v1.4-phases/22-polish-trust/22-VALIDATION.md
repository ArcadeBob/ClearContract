---
phase: 22
slug: polish-trust
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (per CLAUDE.md) |
| **Config file** | none — no test framework in project |
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
| 22-01-01 | 01 | 1 | DEBT-01 | build | `npm run build` | N/A | ⬜ pending |
| 22-01-02 | 01 | 1 | DEBT-02 | build+grep | `npm run build` | N/A | ⬜ pending |
| 22-01-03 | 01 | 1 | DEBT-03 | build | `npm run build` | N/A | ⬜ pending |
| 22-01-04 | 01 | 1 | DEBT-04 | build | `npm run build` | N/A | ⬜ pending |
| 22-01-05 | 01 | 1 | DEBT-05 | build | `npm run build` | N/A | ⬜ pending |
| 22-01-06 | 01 | 1 | DEBT-06 | manual | Browser back/forward | N/A | ⬜ pending |
| 22-02-01 | 02 | 1 | UX-01 | manual | Visual verification | N/A | ⬜ pending |
| 22-02-02 | 02 | 1 | UX-02 | manual | Visual verification | N/A | ⬜ pending |
| 22-02-03 | 02 | 1 | UX-03 | manual | Visual verification | N/A | ⬜ pending |
| 22-02-04 | 02 | 1 | UX-04 | manual | Visual verification | N/A | ⬜ pending |
| 22-02-05 | 02 | 1 | UX-05 | manual | Visual verification | N/A | ⬜ pending |
| 22-02-06 | 02 | 1 | UX-06 | manual | Browser navigation | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework exists and none is being introduced in this phase. Build and lint serve as automated validation. All UX items require manual verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline contract rename | UX-01 | Visual + interaction | Click title, type new name, blur/Enter; verify dashboard, sidebar, all contracts reflect new name |
| Open/resolved badges | UX-02 | Visual | Upload contract, check badge counts on dashboard cards and review header |
| Date urgency coloring | UX-03 | Visual + time-dependent | Check dates <7 days (red), <30 days (amber), >30 days (green), past (muted) |
| Bid signal expand/collapse | UX-04 | Visual + interaction | Click traffic light to expand, verify 5 factors shown with individual bars |
| Upcoming deadlines widget | UX-05 | Visual + cross-contract | With 2+ contracts, verify next 3-5 dates shown sorted by proximity with urgency colors |
| Upload back/cancel | UX-06 | Navigation + async | Click back during upload, verify placeholder removed; trigger re-analyze failure, verify return to review page |
| Browser back/forward | DEBT-06 | Navigation | Navigate through upload→review→dashboard using back/forward buttons, verify consistent behavior |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
