---
phase: 30
slug: type-safety-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (build-time type checking via tsc strict) |
| **Config file** | tsconfig.json |
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
| 30-01-01 | 01 | 1 | TYPE-01 | build | `npm run build` | N/A compile-time | ⬜ pending |
| 30-01-02 | 01 | 1 | TYPE-01 | grep | `grep -c "as string\|as unknown" api/merge.ts` | N/A | ⬜ pending |
| 30-02-01 | 02 | 1 | TYPE-02 | build | `npm run build` | N/A compile-time | ⬜ pending |
| 30-02-02 | 02 | 1 | TYPE-03 | grep | `grep -c "as string\|as boolean\|as number\|as unknown\|as Array" api/merge.ts` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to set up (project decision: testing is a separate milestone). Build-time type checking via tsc strict serves as the verification mechanism for this type-safety phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Client validates malformed API response | TYPE-02 | No test framework; requires mocked API response | 1. Modify api/analyze.ts to return malformed JSON 2. Upload a PDF 3. Verify user-visible error appears instead of silent bad data |
| localStorage migration from v1 to v2 | TYPE-01 | Requires browser localStorage state | 1. Store a v1 contract in localStorage 2. Reload app 3. Verify contract loads with safe defaults for newly-required fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
