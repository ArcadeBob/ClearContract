---
phase: 27
slug: foundation-utilities
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 27 — Validation Strategy

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
| 27-01-01 | 01 | 1 | PATN-01 | manual-only | `grep -rn "localStorage\." src/ --include="*.ts" --include="*.tsx" \| grep -v storageManager` | N/A | ⬜ pending |
| 27-01-02 | 01 | 1 | PATN-02 | manual-only | `grep -rn "isNetworkError\|catch.*error.*message" src/ --include="*.ts" --include="*.tsx" \| grep -v errorUtils` | N/A | ⬜ pending |
| 27-01-03 | 01 | 1 | PATN-03 | manual-only | `grep -rn "bg-red\|bg-amber\|bg-yellow\|bg-blue\|text-red\|text-amber" src/ --include="*.tsx" \| grep -v palette` | N/A | ⬜ pending |
| 27-02-01 | 02 | 1 | TYPE-04 | manual-only | `curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{}'` | N/A | ⬜ pending |
| 27-02-02 | 02 | 1 | ALL | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework to set up (testing is explicitly out of scope for v1.5).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All localStorage via storage manager | PATN-01 | No test framework configured | Grep for bare `localStorage.` calls outside storageManager.ts; expect zero hits |
| All error handling uses shared classifier | PATN-02 | No test framework configured | Grep for inline `isNetworkError` and ad-hoc error classification; expect zero hits |
| No inline severity ternary chains | PATN-03 | No test framework configured | Grep for severity color class literals outside palette.ts; expect zero hits |
| POST body validated with Zod | TYPE-04 | No test framework configured | POST empty/malformed JSON to /api/analyze; expect 400 with descriptive message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
