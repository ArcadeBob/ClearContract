---
phase: 25
slug: portfolio-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (per CLAUDE.md) |
| **Config file** | none |
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
| 25-01-01 | 01 | 1 | PORT-01 | manual + build | `npm run build` | N/A | ⬜ pending |
| 25-01-02 | 01 | 1 | PORT-03 | manual + build | `npm run build` | N/A | ⬜ pending |
| 25-02-01 | 02 | 2 | PORT-02 | manual + build | `npm run build` | N/A | ⬜ pending |
| 25-02-02 | 02 | 2 | PORT-04 | manual + build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install — `npm run build` provides type-checking.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pattern stats on dashboard | PORT-01 | UI rendering, requires 3+ contracts | Load dashboard with 3+ contracts, verify pattern cards show category frequencies |
| Side-by-side contract comparison | PORT-02 | Visual layout, requires navigation | Navigate to /compare?a=id1&b=id2, verify two-column layout with findings diff |
| Multi-select filtering | PORT-03 | Interactive UI, filter combinations | Apply severity + category + resolved filters, verify AND logic, export CSV |
| Finding preservation on re-analyze | PORT-04 | Stateful flow across API call | Resolve a finding, add note, re-analyze, verify resolved status and note preserved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
