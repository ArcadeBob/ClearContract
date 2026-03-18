---
phase: 42
slug: company-profile-migration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-17
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | DATA-03 | unit (TDD) | `npx vitest run src/lib/__tests__/mappers.test.ts src/hooks/__tests__/useCompanyProfile.test.ts --reporter=verbose` | ❌ W0 | ⬜ pending |
| 42-01-02 | 01 | 1 | DATA-03 | integration | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useCompanyProfile.test.ts` — stubs for DATA-03 (profile load, upsert, defaults, error handling)
- [ ] `src/lib/__tests__/mappers.test.ts` — additions for mapToSnake/camelToSnake (inverse mapper tests)

*Test files created as part of Task 1 TDD approach (tdd=true).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile loads from Supabase on Settings mount | DATA-03 | Requires live Supabase + auth session | Open Settings page, verify fields populated from DB |
| Field edit persists via upsert | DATA-03 | Requires Supabase write + page refresh | Edit a field, refresh, verify new value appears |
| New user sees defaults (no errors) | DATA-03 | Requires fresh user with no profile row | Sign up new user, open Settings, verify defaults shown |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-17
