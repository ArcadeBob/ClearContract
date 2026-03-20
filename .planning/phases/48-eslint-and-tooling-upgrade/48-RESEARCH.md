# Phase 48: ESLint and Tooling Upgrade - Research

**Researched:** 2026-03-20
**Domain:** ESLint flat config migration, typescript-eslint v8, plugin ecosystem
**Confidence:** HIGH

## Summary

This phase migrates the project from ESLint 8.x with legacy `.eslintrc.cjs` format to ESLint 10.x with flat config (`eslint.config.js`). The migration also upgrades `@typescript-eslint` from v5 to v8 (now the unified `typescript-eslint` package) and updates all ESLint plugins to flat-config-compatible versions.

The current codebase has 2 lint errors and 44 warnings under ESLint 8. The requirement (TOOL-04) demands zero errors after migration. The lint script in package.json uses `--ext .js,.jsx,.ts,.tsx` which is an eslintrc-only flag removed in ESLint 10 and must be replaced with `files` patterns in the flat config.

**Primary recommendation:** Upgrade to ESLint 10.1.0 with `eslint.config.js` using the `typescript-eslint` unified package v8 for config composition. Fix the 2 existing errors. Accept peer dependency warning from `eslint-plugin-react-hooks` (functionally compatible, fix merged but not yet published).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOOL-01 | ESLint upgraded to v10+ with flat config (eslint.config.js) | ESLint 10.1.0 available on npm; flat config is only supported format; Node.js 22.18.0 meets `^22.13.0` requirement |
| TOOL-02 | @typescript-eslint upgraded to v8+ | Unified `typescript-eslint@8.57.1` package available; provides `tseslint.config()` helper and flat config presets |
| TOOL-03 | All ESLint plugins compatible with new config format | eslint-plugin-react-hooks@7.0.1 has flat config support; eslint-plugin-react-refresh@0.5.2 requires ESLint 9+/flat config; both verified compatible |
| TOOL-04 | `npm run lint` passes with zero errors on current codebase | 2 existing errors must be fixed (conditional hook call, empty function); lint script must drop `--ext` flag |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint | 10.1.0 | JavaScript/TypeScript linter | Latest major; flat config only, eslintrc removed |
| @eslint/js | 10.0.1 | ESLint recommended rules preset | Required companion for eslint 10 flat config |
| typescript-eslint | 8.57.1 | Unified TS-ESLint package (parser + plugin + configs) | Replaces separate @typescript-eslint/parser + @typescript-eslint/eslint-plugin |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-react-hooks | 7.0.1 | React hooks lint rules | Flat config via `reactHooks.configs.flat.recommended` |
| eslint-plugin-react-refresh | 0.5.2 | React Fast Refresh lint rules | Flat config via `reactRefresh.configs.vite()` or manual plugin entry |

### Packages to REMOVE

| Package | Reason |
|---------|--------|
| @typescript-eslint/eslint-plugin | Replaced by unified `typescript-eslint` package |
| @typescript-eslint/parser | Replaced by unified `typescript-eslint` package |

**Installation:**
```bash
npm install --save-dev eslint@^10.1.0 @eslint/js@^10.0.1 typescript-eslint@^8.57.1 eslint-plugin-react-hooks@^7.0.1 eslint-plugin-react-refresh@^0.5.2
npm uninstall @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## Architecture Patterns

### Target Config File: `eslint.config.js`

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Global ignores (replaces .eslintignore and ignorePatterns)
  {
    ignores: ['dist/', 'node_modules/', '*.config.js', '*.config.ts'],
  },

  // Base recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules (replaces plugin:@typescript-eslint/recommended)
  ...tseslint.configs.recommended,

  // React hooks rules
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // React refresh rules
  {
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Project-wide settings
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
);
```

### Key Migration Mapping

| Old (.eslintrc.cjs) | New (eslint.config.js) |
|---------------------|------------------------|
| `root: true` | Not needed (flat config doesn't cascade) |
| `env: { browser: true, es2020: true }` | `languageOptions: { ecmaVersion: 2020, sourceType: 'module' }` + globals |
| `extends: ['eslint:recommended']` | `eslint.configs.recommended` |
| `extends: ['plugin:@typescript-eslint/recommended']` | `...tseslint.configs.recommended` |
| `extends: ['plugin:react-hooks/recommended']` | Manual plugin + rules spread |
| `parser: '@typescript-eslint/parser'` | Handled by `tseslint.configs.recommended` |
| `plugins: ['react-refresh']` | `plugins: { 'react-refresh': reactRefresh }` |
| `ignorePatterns: ['dist', '.eslintrc.cjs']` | `{ ignores: ['dist/'] }` at top level |

### Updated package.json lint script

The `--ext` flag is removed in ESLint 10. File extensions are controlled via `files` patterns in the config.

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix"
}
```

The `lint-staged` config also needs updating -- `eslint --fix` (without `--ext`) is correct for flat config.

### Files to Delete

- `.eslintrc.cjs` -- replaced by `eslint.config.js`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript parser setup | Manual parser config | `tseslint.configs.recommended` | Handles parser, plugin, and rules in one spread |
| Config composition | Manual array building | `tseslint.config()` helper | Type-safe, merges configs correctly |
| Legacy config compat | FlatCompat wrapper | Native flat config plugins | All plugins in this project support flat config natively |

## Common Pitfalls

### Pitfall 1: Forgetting to add globals for browser environment
**What goes wrong:** ESLint 10 flat config has no `env` property. Without globals, `window`, `document`, `console` etc. are flagged as undefined.
**How to avoid:** Install `globals` package and use `globals.browser` in `languageOptions.globals`.
```bash
npm install --save-dev globals
```
```javascript
import globals from 'globals';
// in config:
{ languageOptions: { globals: { ...globals.browser, ...globals.es2020 } } }
```

### Pitfall 2: The --ext flag breaks ESLint 10
**What goes wrong:** The current lint script `eslint . --ext .js,.jsx,.ts,.tsx` will error because `--ext` was removed.
**How to avoid:** Change lint script to just `eslint .` and control file matching via `files` patterns in config.

### Pitfall 3: eslint-plugin-react-hooks peer dependency warning
**What goes wrong:** `eslint-plugin-react-hooks@7.0.1` declares `eslint: ^3-^9` in peerDependencies. ESLint 10 triggers a warning.
**Why it happens:** The fix is merged in the React repo (PR #35720) but not yet published to npm.
**How to avoid:** The plugin works correctly with ESLint 10 at runtime. Use `--legacy-peer-deps` during install or add an npm override. This is cosmetic, not functional.

### Pitfall 4: Existing lint errors must be fixed BEFORE migration
**What goes wrong:** The codebase has 2 existing errors:
1. `src/App.tsx:55` -- conditional hook call (`react-hooks/rules-of-hooks`)
2. `src/pages/LoginPage.test.tsx:71` -- empty arrow function (`@typescript-eslint/no-empty-function`)
**How to avoid:** Fix these errors as part of the migration. The conditional hook is a real bug that should be restructured. The empty function in a test can use `() => { /* noop */ }` or a disable comment.

### Pitfall 5: Config files matching themselves
**What goes wrong:** If `eslint.config.js` is not in the ignores list, ESLint may try to lint the config file itself, causing parser errors if TypeScript rules apply.
**How to avoid:** Add config files to the global ignores block.

### Pitfall 6: Test files getting wrong rules
**What goes wrong:** Test files may need different rules (e.g., allowing `@ts-expect-error`, `no-non-null-assertion`).
**How to avoid:** Add a test-file-specific config block with relaxed rules:
```javascript
{
  files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/test/**'],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
}
```

## Code Examples

### Complete eslint.config.js (recommended for this project)

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
      'vitest.*.config.ts',
    ],
  },

  // Base rules
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // All source files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // API / serverless files need Node globals
  {
    files: ['api/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Relaxed rules for test files
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'src/test/**',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
);
```

### Fixing the Conditional Hook Error (App.tsx:55)

The conditional `useEffect` is a real React rules-of-hooks violation. It must be restructured so all hooks are called unconditionally at the top level of the component. The fix approach: move the early return below all hook calls, or move the conditional logic inside the useEffect callback.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.eslintrc.cjs` with `extends` strings | `eslint.config.js` with imported objects | ESLint 9 (default), ESLint 10 (only option) | Must migrate before upgrading |
| `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` (separate) | Unified `typescript-eslint` package | typescript-eslint v8 | Single import, `tseslint.config()` helper |
| `--ext` CLI flag for file extensions | `files` patterns in config objects | ESLint 10 (flag removed) | Lint script must change |
| `env: { browser: true }` | `languageOptions: { globals: globals.browser }` | Flat config | Need `globals` npm package |

## Open Questions

1. **eslint-plugin-react-hooks ESLint 10 peer dep**
   - What we know: Plugin works with ESLint 10 at runtime; peer dep fix merged but unpublished
   - What's unclear: When the fix will be published to npm
   - Recommendation: Install with `--legacy-peer-deps` or suppress the warning. Functionally safe.

2. **Should we enable type-checked rules?**
   - What we know: typescript-eslint v8 offers `recommendedTypeChecked` configs using `projectService`
   - What's unclear: Whether enabling type-checked linting would surface new errors
   - Recommendation: Do NOT enable type-checked rules in this phase. Stick with `tseslint.configs.recommended` (non-type-checked) to match current rule set. Type-checked linting is a separate enhancement.

## Current Lint Baseline

Before migration, the current codebase produces:
- **2 errors:** Conditional hook call (App.tsx), empty function (LoginPage.test.tsx)
- **44 warnings:** Mostly `no-non-null-assertion` (in tests), `no-unused-vars`, `no-explicit-any`

TOOL-04 requires zero errors. Warnings are acceptable (they don't cause `npm run lint` to fail with non-zero exit code unless `--max-warnings 0` is set).

## Sources

### Primary (HIGH confidence)
- [ESLint v10.0.0 Release Blog](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) - Breaking changes, Node.js requirements, removed features
- [ESLint Configuration Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide) - Flat config migration patterns
- [ESLint v10 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0) - Step-by-step migration
- [typescript-eslint v8 Announcement](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/) - Unified package, flat config API, projectService
- npm registry - Verified versions: eslint@10.1.0, @eslint/js@10.0.1, typescript-eslint@8.57.1, eslint-plugin-react-hooks@7.0.1, eslint-plugin-react-refresh@0.5.2

### Secondary (MEDIUM confidence)
- [eslint-plugin-react-hooks ESLint 10 peer dep issue](https://github.com/facebook/react/issues/35758) - Confirmed functional compatibility, peer dep fix pending
- [eslint-plugin-react-hooks ESLint 10 PR](https://github.com/facebook/react/pull/35720) - Fix merged but not released

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm registry; APIs verified against official docs
- Architecture: HIGH - Flat config format well-documented; migration path clear from current .eslintrc.cjs
- Pitfalls: HIGH - Current lint baseline measured (2 errors, 44 warnings); plugin compatibility verified

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable -- ESLint 10 just released, ecosystem catching up)
