---
phase: 47-security-audit
plan: 01
subsystem: infra
tags: [npm, security, audit, dependencies, overrides]

# Dependency graph
requires:
  - phase: 46-test-suite-repair
    provides: "269/269 green test suite baseline"
provides:
  - "Zero high/critical npm audit vulnerabilities"
  - "npm overrides pattern for transitive dependency security"
affects: [48-eslint-upgrade, 49-coverage]

# Tech tracking
tech-stack:
  added: []
  patterns: [npm-overrides-for-transitive-vulns]

key-files:
  created: []
  modified: [package.json, package-lock.json]

key-decisions:
  - "Used undici ^6.24.0 override instead of ^5.29.0 because all 5.x versions are in the vulnerable range (<=6.23.0)"
  - "Left esbuild and ajv moderate vulnerabilities unresolved -- require breaking major upgrades of vite and @vercel/node respectively"

patterns-established:
  - "npm overrides: scope overrides to parent package to avoid unintended version changes elsewhere"

requirements-completed: [SEC-01, SEC-02]

# Metrics
duration: 7min
completed: 2026-03-20
---

# Phase 47 Plan 01: Security Audit Summary

**Eliminated all high/critical npm audit vulnerabilities via non-breaking fixes and targeted npm overrides for transitive deps in @vercel/node and @vercel/build-utils**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T02:27:12Z
- **Completed:** 2026-03-20T02:34:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Reduced npm audit from 13 vulnerabilities (1 critical, 8 high, 4 moderate) to 5 moderate
- Zero high or critical vulnerabilities remaining (SEC-01 satisfied)
- Full test suite 269/269 green after all changes (SEC-02 satisfied)
- Production build clean with no new warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Run npm audit fix for non-breaking dependency updates** - `02709ec` (fix)
2. **Task 2: Add npm overrides for remaining transitive high vulnerabilities** - `675f949` (fix)

## Files Created/Modified
- `package.json` - Added overrides section for transitive vulnerability resolution
- `package-lock.json` - Updated dependency tree with patched versions

## Decisions Made
- **undici override version:** Used ^6.24.0 instead of ^5.29.0 because the advisory covers `<=6.23.0`, meaning all 5.x versions remain vulnerable. The 6.x override resolves the CVEs while staying compatible with @vercel/node's HTTP client.
- **Moderate vulnerabilities accepted:** Left ajv (via @vercel/static-config) and esbuild (via vite) moderate vulnerabilities unresolved. Both require breaking major version upgrades (@vercel/node@3.x or vite@8.x) that would regress functionality. SEC-01 only requires zero high/critical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] undici ^5.29.0 override insufficient for CVE coverage**
- **Found during:** Task 2
- **Issue:** Plan specified `"undici": "^5.29.0"` but the advisory range is `<=6.23.0`, so all 5.x versions remain vulnerable
- **Fix:** Changed override to `"undici": "^6.24.0"` which is outside the vulnerable range
- **Files modified:** package.json
- **Verification:** npm audit --audit-level=high exits 0, tests 269/269 green
- **Committed in:** 675f949

**2. [Rule 3 - Blocking] npm override shorthand syntax not supported**
- **Found during:** Task 2
- **Issue:** `"@vercel/node>path-to-regexp": "^6.3.0"` shorthand syntax caused npm install error "Override without name"
- **Fix:** Used nested object syntax `"@vercel/node": { "path-to-regexp": "^6.3.0" }` instead
- **Files modified:** package.json
- **Verification:** npm install succeeds, npm ls path-to-regexp shows 6.3.0
- **Committed in:** 675f949

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## Remaining Moderate Vulnerabilities (Accepted)

| Package | Severity | Parent | Why Not Fixed |
|---------|----------|--------|---------------|
| ajv | moderate | @vercel/static-config -> @vercel/node | Requires @vercel/node@3.x (breaking downgrade) |
| esbuild | moderate | vite@5.x | Requires vite@8.x (breaking major upgrade) |

These 5 moderate vulnerabilities are documented as known limitations of the parent packages. They do not block SEC-01 (zero high/critical).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Security audit complete, zero high/critical vulnerabilities
- Ready for Phase 48 (ESLint upgrade) or Phase 49 (coverage)
- Moderate vulnerabilities tracked for future milestone when vite 8.x and @vercel/node 6.x are adopted

---
*Phase: 47-security-audit*
*Completed: 2026-03-20*
