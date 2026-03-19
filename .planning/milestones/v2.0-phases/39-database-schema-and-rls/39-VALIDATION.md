---
phase: 39
slug: database-schema-and-rls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | manual (SQL migrations — no unit-testable application code) |
| **Config file** | none |
| **Quick run command** | `supabase db push --dry-run` |
| **Full suite command** | `supabase db push` + manual RLS verification |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Review migration SQL for correctness
- **After every plan wave:** Run `supabase db push` to remote
- **Before `/gsd:verify-work`:** All tables visible in Supabase dashboard; RLS test query returns no unauthorized data
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | DB-01 | manual | `supabase db push` success | N/A | ⬜ pending |
| 39-01-02 | 01 | 1 | DB-02 | manual | `supabase db push` success | N/A | ⬜ pending |
| 39-01-03 | 01 | 1 | DB-03 | manual | `supabase db push` success | N/A | ⬜ pending |
| 39-01-04 | 01 | 1 | DB-04 | manual | `supabase db push` success | N/A | ⬜ pending |
| 39-01-05 | 01 | 1 | DB-05 | manual | RLS test via SQL editor | N/A | ⬜ pending |
| 39-01-06 | 01 | 1 | DB-06 | manual | Verify `.env.local` + Vercel settings | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/` directory — created by `supabase init`
- [ ] Supabase project must exist (created via dashboard before execution)
- [ ] `.env.local` needs three new Supabase variables

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tables exist with correct columns | DB-01, DB-02, DB-03, DB-04 | SQL DDL migrations — no app code to test | Confirm `supabase db push` succeeds; check tables in Supabase dashboard |
| RLS restricts to owning user | DB-05 | Requires authenticated context against live DB | Query with anon key as user A, verify user B data not visible |
| CASCADE delete works | DB-01 | FK behavior — requires live DB | Insert contract + findings, delete contract, verify findings gone |
| Env vars configured | DB-06 | Environment config, not code | Verify `.env.local` has SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; check Vercel project settings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
