---
phase: 52
slug: cost-display-and-portfolio-spend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No test framework configured |
| **Config file** | none — project has no test framework |
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
| 52-01-01 | 01 | 1 | COST-03 | build | `npm run build` | ✅ | ⬜ pending |
| 52-01-02 | 01 | 1 | COST-03 | build | `npm run build` | ✅ | ⬜ pending |
| 52-02-01 | 02 | 1 | COST-04 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install — validation is build + lint + manual browser verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cost breakdown collapsible section expands/collapses | COST-03 | UI interaction + animation | Open contract review, click expand on cost section, verify per-pass rows appear with correct data |
| Dashboard portfolio spend cards show correct totals | COST-04 | Requires seeded data in Supabase | Navigate to dashboard, verify total spend and avg cost per contract cards display |
| Cache hit rate percentage displays correctly | COST-03 | Computed field from token data | Analyze a contract, verify cache hit rate shows as percentage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
