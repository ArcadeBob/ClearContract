# Phase 47: Security Audit - Research

**Researched:** 2026-03-19
**Domain:** npm dependency security, vulnerability remediation
**Confidence:** HIGH

## Summary

The project has 13 npm audit vulnerabilities: 1 critical (jspdf), 8 high (flatted, minimatch, path-to-regexp, tar, undici x4), and 4 moderate (ajv, esbuild). The remediation splits cleanly into two tiers: (1) non-breaking fixes via `npm audit fix` that resolve jspdf, flatted, tar, and the direct undici dependency, and (2) transitive vulnerabilities trapped inside `@vercel/node@5.x` and `vite@5.x` that cannot be resolved without major version upgrades or npm overrides.

The critical jspdf vulnerability and most high-severity issues are fixable with simple patch/minor updates. The remaining issues (ajv, esbuild, minimatch, path-to-regexp, nested undici) are all transitive dependencies of `@vercel/node@5.x` and `vite@5.x`. These can be addressed using npm `overrides` in package.json to force safe versions of transitive dependencies without upgrading the parent packages to breaking major versions.

**Primary recommendation:** Run `npm audit fix` first (non-breaking), then use targeted npm `overrides` for the remaining transitive vulnerabilities. Verify with `npm run test` (269/269 green) and `npm run build` after each change.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | `npm audit` reports zero high or critical vulnerabilities | Full vulnerability inventory below with specific fix paths for each |
| SEC-02 | All dependency upgrades pass existing test suite | Two-tier approach (non-breaking first, overrides second) with test verification at each step |
</phase_requirements>

## Current Vulnerability Inventory

### Tier 1: Fixable via `npm audit fix` (non-breaking)

| Package | Current | Fixed | Severity | Advisory | Direct/Transitive |
|---------|---------|-------|----------|----------|-------------------|
| jspdf | 4.2.0 | 4.2.1 | CRITICAL | GHSA-7x6v-j9x4-qf24, GHSA-wfv2-pwc8-crg5 | Direct dep |
| flatted | 3.3.3 | 3.4.2 | HIGH | GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh | Transitive (eslint -> flat-cache) |
| tar | 7.5.9 | 7.5.12 | HIGH | GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256 | Transitive (@vercel/nft -> @mapbox/node-pre-gyp) |
| undici (direct) | 7.22.0 | 7.24.5 | HIGH | Multiple CVEs | Direct dep |

Running `npm audit fix` also upgrades `@vercel/node` from 5.6.9 to 5.6.18 (semver-compatible).

### Tier 2: Remaining after `npm audit fix` -- require overrides

| Package | Vulnerable Version | In | Severity | Fix Strategy |
|---------|-------------------|-----|----------|-------------|
| undici (nested) | 5.28.4 | @vercel/node -> undici | HIGH | Override to ^5.29.0 or ^6.22.0 |
| path-to-regexp | 6.1.0 | @vercel/node | HIGH | Override to ^6.3.0 |
| minimatch | 10.1.1-10.2.4 | @vercel/build-utils -> @vercel/python-analysis | HIGH | Override to ^10.3.0 |
| ajv | (via @vercel/static-config) | @vercel/node -> @vercel/static-config | MODERATE | Override or accept (moderate only) |
| esbuild | 0.21.5 | vite@5.4.21 | MODERATE | Override to ^0.25.0 or accept (moderate, dev-only) |

### Severity Filter for SEC-01

SEC-01 requires zero **high or critical**. The 4 moderate vulnerabilities (ajv, esbuild) are NOT blockers for SEC-01 but should still be addressed if safe.

**Minimum required fixes for SEC-01:**
- All Tier 1 items (npm audit fix)
- undici nested (override)
- path-to-regexp (override)
- minimatch (override)

**Nice-to-have (moderate):**
- ajv (override)
- esbuild (override -- dev-only, only affects `npm run dev`)

## Architecture Patterns

### npm Overrides Pattern

npm `overrides` in package.json force a specific version of a transitive dependency regardless of what the parent package declares. This is the standard approach when a parent package pins a vulnerable transitive dep and hasn't released a fix.

```json
{
  "overrides": {
    "@vercel/node": {
      "undici": "^6.22.0"
    },
    "@vercel/python-analysis": {
      "minimatch": "^10.3.0"
    },
    "@vercel/node>path-to-regexp": "^6.3.0",
    "@vercel/static-config>ajv": "^8.17.2"
  }
}
```

**Key rules:**
1. Overrides go in the **root** package.json only
2. Use scoped overrides (`"parent": { "child": "version" }`) to avoid overriding the same package used elsewhere at different versions
3. After adding overrides, must run `rm -rf node_modules && npm install` to force resolution
4. Must verify with `npm audit` that vulnerabilities are actually resolved

### Verification Workflow

Each fix step follows this sequence:
1. Make the change (npm audit fix / add override / update version)
2. `rm -rf node_modules && npm install` (for overrides)
3. `npm audit --audit-level=high` to verify vulnerability resolved
4. `npm run test` to verify 269/269 pass
5. `npm run build` to verify no new build warnings

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transitive dep resolution | Manual node_modules patching | npm overrides | Survives reinstalls, declarative |
| Vulnerability tracking | Manual advisory checking | `npm audit --audit-level=high` | Authoritative source, automated |
| Version compatibility | Guessing safe versions | `npm view <pkg> versions` + changelog | Must verify semver compatibility |

## Common Pitfalls

### Pitfall 1: Override breaks parent package
**What goes wrong:** Forcing a major version bump on a transitive dep can break the parent package's API expectations.
**Why it happens:** The parent pinned that version for compatibility, not laziness.
**How to avoid:** After each override, run `npm run build` and `npm run test`. Check if the parent package's functionality still works (e.g., `vercel dev` still serves API routes).
**Warning signs:** Build errors mentioning the overridden package, import resolution failures.

### Pitfall 2: npm audit fix --force downgrades packages
**What goes wrong:** `npm audit fix --force` may DOWNGRADE packages. For example, it suggests installing `@vercel/node@3.0.1` which is a regression from 5.6.x.
**Why it happens:** npm's --force logic picks the first version without the vulnerability, even if it's older.
**How to avoid:** NEVER use `npm audit fix --force`. Use targeted overrides instead.
**Warning signs:** npm warns "Will install X@Y, which is a breaking change."

### Pitfall 3: Overrides not applied after npm install
**What goes wrong:** Adding overrides to package.json and running `npm install` doesn't always update existing node_modules.
**Why it happens:** npm's dependency resolution cache may keep old versions.
**How to avoid:** Always `rm -rf node_modules package-lock.json && npm install` after changing overrides.
**Warning signs:** `npm audit` still shows the same vulnerabilities after adding overrides.

### Pitfall 4: esbuild override breaks vite
**What goes wrong:** Vite 5.x is tightly coupled to specific esbuild versions. Overriding esbuild can break the dev server and build.
**Why it happens:** Vite uses esbuild's internal APIs that change between versions.
**How to avoid:** Leave the esbuild/vite moderate vulnerability alone -- it's dev-only and moderate severity. Fixing it properly requires Vite 6+ (Phase 48+ concern or future milestone).
**Warning signs:** `npm run dev` or `npm run build` fail with esbuild-related errors.

### Pitfall 5: undici major version mismatch in @vercel/node
**What goes wrong:** @vercel/node@5.x uses undici@5.x internally. Overriding to undici@7.x may break its HTTP handling.
**Why it happens:** undici 5->6->7 had breaking API changes.
**How to avoid:** Check if undici@5.29+ exists and fixes the CVEs. If not, try @6.22+ but test thoroughly. The nested undici is used by @vercel/node's internal HTTP client.
**Warning signs:** API route failures, `vercel dev` not proxying requests correctly.

## Code Examples

### Adding overrides to package.json
```json
{
  "overrides": {
    "@vercel/node": {
      "undici": "^5.29.0"
    },
    "@vercel/build-utils": {
      "@vercel/python-analysis": {
        "minimatch": "^10.3.0"
      }
    },
    "@vercel/node>path-to-regexp": "^6.3.0"
  }
}
```

### Verifying a specific override took effect
```bash
npm ls undici  # Should show new version in @vercel/node subtree
npm ls minimatch  # Should show >=10.3.0 under @vercel/python-analysis
npm audit --audit-level=high  # Should show reduced count
```

### Full verification sequence
```bash
npm run test        # Must be 269/269 pass
npm run build       # Must succeed, no new warnings
npm audit           # Check remaining vulnerability count
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npm audit fix --force` | Targeted npm overrides | npm 8.3+ (2022) | Safer, no accidental downgrades |
| Ignoring transitive vulns | npm overrides + audit | npm 8.3+ | Can fix without waiting for parent package updates |
| Manual shrinkwrap editing | package.json overrides | npm 8.3+ | Declarative, survives reinstalls |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | vite.config.ts (test section) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` (same -- 269 tests) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Zero high/critical npm audit vulns | audit check | `npm audit --audit-level=high` | N/A (CLI check) |
| SEC-02 | All tests pass after upgrades | full suite | `npm run test` | Existing (269 tests) |

### Sampling Rate
- **Per task commit:** `npm run test && npm run build && npm audit --audit-level=high`
- **Per wave merge:** Same (single wave expected)
- **Phase gate:** `npm audit` zero high/critical + 269/269 green + build clean

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. No new test files needed; this phase validates existing tests still pass after dependency changes.

## Open Questions

1. **Can undici nested dep be overridden safely?**
   - What we know: @vercel/node@5.x ships with undici@5.28.4. The latest 5.x is likely 5.28.5+.
   - What's unclear: Whether undici 5.x has a patched version for all the listed CVEs, or if the fix requires 6.x+.
   - Recommendation: Check `npm view undici versions` for latest 5.x. If no 5.x patch exists, the override may need to go to 6.x -- test carefully. If it breaks, this specific nested undici vuln may need to be accepted as a @vercel/node limitation and documented.

2. **Will minimatch 10.3.0+ exist?**
   - What we know: The vulnerable range is 10.0.0-10.2.2. Current installed is 10.2.4 which may already be patched.
   - What's unclear: Need to verify 10.2.4 is outside the vulnerable range.
   - Recommendation: Check if 10.2.4 resolves the advisories. If so, only the 10.1.1 instance needs updating.

3. **Moderate vulnerabilities -- fix or accept?**
   - What we know: SEC-01 specifies "zero high or critical." Moderates are technically out of scope.
   - What's unclear: Whether overriding ajv or esbuild would cause breakage.
   - Recommendation: Fix if safe, accept and document if risky. Do NOT risk breaking the build for moderate issues.

## Sources

### Primary (HIGH confidence)
- `npm audit` output -- direct scan of project's node_modules (2026-03-19)
- `npm audit fix --dry-run` -- verified which fixes are non-breaking
- `npm ls <package>` -- verified exact dependency trees for all vulnerable packages
- `npm outdated` -- verified current vs latest versions for all dependencies
- `npm view @vercel/node@5.6.18 dependencies` -- confirmed 5.6.18 still pins vulnerable transitive deps
- package.json direct inspection -- verified direct vs transitive dependency status

### Secondary (MEDIUM confidence)
- npm overrides documentation (established feature since npm 8.3, well-documented)

## Metadata

**Confidence breakdown:**
- Vulnerability inventory: HIGH - direct npm audit scan of actual project
- Fix strategy (Tier 1): HIGH - npm audit fix --dry-run confirmed
- Fix strategy (Tier 2/overrides): MEDIUM - overrides are standard but each must be tested
- Pitfalls: HIGH - based on common npm audit remediation experience

**Research date:** 2026-03-19
**Valid until:** 2026-04-02 (vulnerability landscape changes with new advisories)
