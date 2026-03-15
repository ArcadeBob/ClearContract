---
phase: 29
slug: component-decomposition-toast-context
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (build verification) |
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
| 29-01-01 | 01 | 1 | DECOMP-02 | build | `npm run build` | N/A | ⬜ pending |
| 29-01-02 | 01 | 1 | DECOMP-03 | build | `npm run build` | N/A | ⬜ pending |
| 29-02-01 | 02 | 2 | DECOMP-01 | build | `npm run build` | N/A | ⬜ pending |
| 29-02-02 | 02 | 2 | PATN-04 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Filter toggle animations (AnimatePresence exit) still work after splits | DECOMP-01 | Visual animation behavior | Toggle severity/category filters, verify smooth enter/exit animations on findings |
| Toast appears correctly positioned after context migration | PATN-04 | Visual positioning and z-index | Trigger toast via upload error and CSV export, verify correct fixed positioning |
| Toast auto-dismisses in 3 seconds | PATN-04 | Timer behavior | Trigger a success toast, verify it disappears after ~3 seconds |
| Existing import paths resolve unchanged | DECOMP-02, DECOMP-03 | Module resolution | `npm run build` covers this, but verify no runtime import errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
