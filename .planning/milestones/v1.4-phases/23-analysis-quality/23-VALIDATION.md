---
phase: 23
slug: analysis-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (TypeScript compilation as primary gate) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green + manual UAT with real contract
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | PIPE-01 | build + manual | `npm run build` | N/A | ⬜ pending |
| 23-01-02 | 01 | 1 | PIPE-03 | build + manual | `npm run build` | N/A | ⬜ pending |
| 23-01-03 | 01 | 1 | PIPE-05 | build + manual | `npm run build` | N/A | ⬜ pending |
| 23-02-01 | 02 | 1 | PIPE-02 | build | `npm run build` | N/A | ⬜ pending |
| 23-02-02 | 02 | 1 | PIPE-04 | build + manual | `npm run build` | N/A | ⬜ pending |
| 23-02-03 | 02 | 1 | PIPE-06 | build + manual | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework is configured for this project, and adding one is out of scope. TypeScript compilation (`npm run build`) serves as the primary automated validation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Synthesis pass produces compound risk findings | PIPE-01 | No test framework; requires Claude API call | Upload multi-risk contract, verify synthesis findings appear with "Compound Risk" category |
| Category-weighted scoring excludes error findings | PIPE-03 | Requires real analysis output inspection | Upload contract, force a pass failure, verify error finding excluded from score |
| Verbiage pass focused on missing protections | PIPE-04 | Requires Claude API output inspection | Upload contract, verify verbiage findings show missing protections without duplicating legal pass |
| Staleness warnings for expired modules | PIPE-05 | Requires time-dependent behavior | Set expirationDate to past date, verify Info-level staleness finding appears |
| matchesBonding uses structured metadata | PIPE-06 | Requires real contract with bonding requirements | Upload contract with bonding, verify bid signal factor uses metadata not text scanning |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
