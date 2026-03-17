---
phase: 41
slug: contract-reads-and-data-mapping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No test framework configured (per CLAUDE.md) |
| **Config file** | none |
| **Quick run command** | `npm run build` (type-check + compile) |
| **Full suite command** | `npm run build && vercel dev` + manual browser check |
| **Estimated runtime** | ~15 seconds (build) + manual |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (catches type errors)
- **After every plan wave:** Run full build + manual browser walkthrough
- **Before `/gsd:verify-work`:** Full suite must be green — all three pages render from Supabase
- **Max feedback latency:** 15 seconds (build) + manual verification

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | DATA-01 | unit (build) | `npm run build` (type-check mapper) | ❌ W0 | ⬜ pending |
| 41-01-02 | 01 | 1 | DATA-01 | unit (build) | `npm run build` (null->undefined, JSONB passthrough) | ❌ W0 | ⬜ pending |
| 41-02-01 | 02 | 1 | DATA-02 | smoke (manual) | `vercel dev` + browser: dashboard shows DB contracts | ❌ W0 | ⬜ pending |
| 41-02-02 | 02 | 1 | DATA-02 | smoke (manual) | `vercel dev` + browser: review page shows nested findings/dates | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (no test framework needed — validation via `npm run build` type-checking + manual browser verification)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard renders contracts from Supabase | DATA-02 | No test framework; requires browser + auth session | Login → Dashboard → verify contracts list matches DB |
| All Contracts page renders from Supabase | DATA-02 | Same | Login → All Contracts → verify all contracts appear |
| Contract Review shows nested findings/dates | DATA-02 | Requires DB with seeded data | Login → Click contract → verify findings and dates render |
| Mapper produces zero runtime type errors | DATA-01 | Type safety verified at build time | `npm run build` succeeds with no TS errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
