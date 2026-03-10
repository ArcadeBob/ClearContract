---
phase: 10
slug: industry-trade-knowledge
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (TypeScript compilation as smoke test) |
| **Config file** | `tsconfig.json` |
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
| 10-01-01 | 01 | 1 | TRADE-01 | smoke | `npm run build` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | TRADE-02 | smoke | `npm run build` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | TRADE-03 | smoke | `npm run build` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | TRADE-01, TRADE-02, TRADE-03 | integration | `npm run build && npm run lint` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework exists — validation is via TypeScript compilation (`npm run build`) and manual testing with real contracts through `vercel dev`. This matches the established pattern from Phases 7-9.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Division 08 scope flags appear in findings | TRADE-01 | Requires Claude AI analysis of test contract | Upload contract with non-glazing Div 08 scope via `vercel dev`, verify findings reference CSI sections |
| AAMA/ASTM standards flagged correctly | TRADE-02 | Requires Claude AI analysis of test contract | Upload contract referencing obsolete standards, verify findings flag superseded versions |
| Contract form family detected | TRADE-03 | Requires Claude AI analysis of test contract | Upload AIA A401 subcontract, verify form detection finding appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
