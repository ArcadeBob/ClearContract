---
phase: 20
slug: fix-all-contracts-nav
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual browser verification
- **Before `/gsd:verify-work`:** Full suite must be green + all 4 success criteria manually verified
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | ROUTE-01, ROUTE-02 | build + manual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework to install — project uses manual browser verification plus type-checked builds.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar "All Contracts" click lands on All Contracts page | ROUTE-01 | Requires browser DOM + click interaction | 1. Start dev server 2. Click "All Contracts" in sidebar 3. Verify All Contracts page renders |
| Browser back/forward reaches contracts list | ROUTE-01 | Requires browser history navigation | 1. Navigate to contract review 2. Click browser back 3. Verify contracts list is reachable |
| Direct `/contracts` URL shows All Contracts | ROUTE-02 | Requires browser URL bar entry | 1. Type `localhost:PORT/contracts` in browser 2. Verify All Contracts page renders |
| Refresh on `/contracts` stays on All Contracts | ROUTE-02 | Requires browser refresh | 1. Navigate to All Contracts 2. Press F5 3. Verify still on All Contracts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
