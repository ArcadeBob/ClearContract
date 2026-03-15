---
phase: 24
slug: actionable-output
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | OUT-02 | build | `npm run build` | N/A | ⬜ pending |
| 24-01-02 | 01 | 1 | OUT-02 | build | `npm run build` | N/A | ⬜ pending |
| 24-01-03 | 01 | 1 | OUT-03 | build | `npm run build` | N/A | ⬜ pending |
| 24-01-04 | 01 | 1 | OUT-04 | build | `npm run build` | N/A | ⬜ pending |
| 24-02-01 | 02 | 2 | OUT-01 | build | `npm run build` | N/A | ⬜ pending |
| 24-02-02 | 02 | 2 | OUT-01 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to set up (project has no test framework per CLAUDE.md).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF report generates and downloads with correct content | OUT-01 | Visual output quality, file download behavior | Upload contract, click PDF button, verify download contains header, risk score, findings by category, dates |
| Findings display action priority badge | OUT-02 | Visual badge rendering and placement | Analyze new contract, verify pre-bid/pre-sign/monitor badges appear next to severity |
| Bid signal shows per-factor reason text | OUT-03 | Visual text rendering in expanded widget | Expand bid signal widget, verify each factor shows reason text |
| Negotiation checklist view shows grouped findings | OUT-04 | Visual tab rendering and grouping | Switch to Negotiation tab, verify findings grouped by action priority with negotiation positions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
