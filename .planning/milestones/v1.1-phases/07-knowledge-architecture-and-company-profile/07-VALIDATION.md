---
phase: 7
slug: knowledge-architecture-and-company-profile
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (TypeScript compiler + lint only) |
| **Config file** | tsconfig.json (strict mode) |
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
| 07-01-01 | 01 | 1 | ARCH-01 | build | `npm run build` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | ARCH-04 | build | `npm run build` | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | ARCH-02 | build | `npm run build` | ✅ | ⬜ pending |
| 07-01-04 | 01 | 1 | ARCH-03 | build | `npm run build` | ✅ | ⬜ pending |
| 07-01-05 | 01 | 1 | ARCH-05 | build | `npm run build` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | PROF-05 | manual | localStorage inspect | N/A | ⬜ pending |
| 07-02-02 | 02 | 1 | PROF-06 | manual | Visual verify defaults | N/A | ⬜ pending |
| 07-02-03 | 02 | 1 | PROF-01 | manual | Visual inspect Settings | N/A | ⬜ pending |
| 07-02-04 | 02 | 1 | PROF-02 | manual | Visual inspect Settings | N/A | ⬜ pending |
| 07-02-05 | 02 | 1 | PROF-03 | manual | Visual inspect Settings | N/A | ⬜ pending |
| 07-02-06 | 02 | 1 | PROF-04 | manual | Visual inspect Settings | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install — project explicitly has no test framework per CLAUDE.md. TypeScript strict mode compiler serves as the primary automated gate.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Insurance fields display and save | PROF-01 | UI visual + localStorage | Open Settings, verify Insurance card fields, edit value, refresh, verify persistence |
| Bonding fields display and save | PROF-02 | UI visual + localStorage | Open Settings, verify Bonding card fields, edit value, refresh, verify persistence |
| License fields display and save | PROF-03 | UI visual + localStorage | Open Settings, verify Licenses card fields, edit value, refresh, verify persistence |
| Capabilities fields display and save | PROF-04 | UI visual + localStorage | Open Settings, verify Capabilities card fields, edit value, refresh, verify persistence |
| Data persists across sessions | PROF-05 | Requires browser interaction | Edit fields, close tab, reopen, verify values retained |
| Defaults pre-populated on first visit | PROF-06 | Requires clean browser state | Clear localStorage, load Settings, verify Clean Glass defaults appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
