# Phase 27: Foundation Utilities - Research

**Researched:** 2026-03-15
**Domain:** Utility extraction / refactoring (localStorage, error handling, color palette, Zod validation)
**Confidence:** HIGH

## Summary

Phase 27 is a pure refactoring phase that extracts scattered patterns into shared utilities. No new runtime dependencies are needed -- the project already has Zod 3.25, TypeScript 5.5, Tailwind 3.4, and React 18. The work is creating three new utility files (`storageManager.ts`, `errors.ts`, `palette.ts`) plus one Zod request schema, then updating ~25 call sites across the codebase to import from these shared sources.

The primary risk is Tailwind JIT purge: if the palette map uses dynamically constructed class strings instead of complete literals, production builds will strip the CSS. The existing `tailwind.config.js` only scans `./src/**/*.{js,ts,jsx,tsx}`, which covers `src/utils/palette.ts` but NOT `api/`. This is fine since severity colors are only rendered client-side.

**Primary recommendation:** Build each utility file independently with its own export surface, then refactor call sites file-by-file. Keep each utility zero-dependency (no React, no DOM in errors.ts so it works server-side).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- One palette file exports both severity-to-Tailwind mappings AND risk-score-to-color mappings
- Severity uses single class string per level (e.g., `'bg-red-100 text-red-700 border-red-200'`), not structured objects
- Risk score color uses text-only classes with existing thresholds (70/40 breakpoints)
- Preserve current color differences between contexts (text-red-600 for score display, bg-red-100 text-red-700 for badge)
- Status badge colors (Reviewed/Analyzing) and date urgency colors stay inline -- not in scope
- File location: `src/utils/palette.ts`
- Must use complete Tailwind class strings (not fragments) to survive JIT purge
- Typed key registry: all valid keys defined as a union type mapping key -> value type
- Generic `load<K>()` and `save<K>()` methods with type inference from registry
- Returns typed Result objects (`{ ok, data, error, quotaExceeded }`) -- callers decide whether to toast, log, or ignore
- No UI dependencies in the manager itself -- pure utility
- File location: `src/storage/storageManager.ts`
- Migration logic stays in `contractStorage.ts`
- `contractStorage.ts` becomes a thin layer that uses the storage manager for reads/writes but owns migration
- Classify + format only -- no recovery strategies (retry, rollback stay in callers)
- Exports `classifyError(err)` returning `{ type, userMessage, retryable, originalError }`
- Error types: `'network' | 'api' | 'validation' | 'storage' | 'timeout' | 'unknown'`
- Shared across client AND server -- both sides import from same utility
- Also exports standardized `ApiErrorResponse` type for end-to-end typing: `{ error, type, retryable, details? }`
- Server uses `formatApiError()` for response shaping, client uses type for parsing
- File location: `src/utils/errors.ts`

### Claude's Discretion
- POST body validation: Zod schema design for /api/analyze request body (pdfBase64, fileName, companyProfile)
- Exact storage manager implementation details (JSON parse/serialize, error boundary patterns)
- Error classification heuristics (which patterns map to which error types)
- File and export naming conventions within the decided locations

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PATN-01 | Centralize localStorage access -- single storage manager with consistent error handling replaces 4 scattered locations | Storage manager architecture section; inventory of all 12 localStorage calls across 4 files |
| PATN-02 | Centralize error handling -- shared error classification and formatting utility used by App.tsx, analyze.ts, and storage layer | Error utility section; inventory of 9 error handling blocks; isomorphic (client+server) design |
| PATN-03 | Centralize color/severity mapping -- replace scattered ternary chains with a shared palette map | Palette section; inventory of 5+ severity/risk color locations; Tailwind purge considerations |
| TYPE-04 | Create request validation schema for /api/analyze POST body -- typed end-to-end | Zod schema design section; existing CompanyProfileSchema pattern reference |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.5.4 | Type system for registry, generics | Already in project, strict mode enabled |
| Zod | ^3.25.76 | Request body validation schema | Already used for CompanyProfileSchema and analysis schemas |
| Tailwind CSS | 3.4.17 | JIT-compiled utility classes | Already in project, purge config scans `src/` |

### Supporting
No additional libraries needed. All utilities are pure TypeScript modules.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled storage manager | localForage | Overkill -- app only needs synchronous localStorage; localForage adds async complexity and a dependency |
| Zod for request validation | Manual checks | Already using manual checks; Zod gives type inference + consistent error messages for free since it's already installed |

## Architecture Patterns

### New Files
```
src/
├── utils/
│   ├── palette.ts          # Severity + risk score color mappings
│   └── errors.ts           # classifyError(), formatApiError(), types
├── storage/
│   ├── storageManager.ts   # Generic typed localStorage wrapper
│   └── contractStorage.ts  # (existing, refactored to use storageManager)
```

### Pattern 1: Typed Storage Registry
**What:** A TypeScript mapped type that associates each localStorage key string with its value type. Generic `load`/`save` functions infer the correct type from the key.
**When to use:** Any time a component reads/writes localStorage.

```typescript
// src/storage/storageManager.ts

// All known localStorage keys and their value types
interface StorageRegistry {
  'clearcontract:contracts': import('../types/contract').Contract[];
  'clearcontract:contracts-seeded': string;      // 'true'
  'clearcontract:schema-version': string;         // numeric string
  'clearcontract:company-profile': import('../knowledge/types').CompanyProfile;
  'clearcontract:hide-resolved': string;          // 'true' | 'false'
}

type StorageKey = keyof StorageRegistry;

interface StorageResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  quotaExceeded: boolean;
}

function load<K extends StorageKey>(key: K): StorageResult<StorageRegistry[K]> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { ok: true, data: null, error: null, quotaExceeded: false };
    const parsed = JSON.parse(raw) as StorageRegistry[K];
    return { ok: true, data: parsed, error: null, quotaExceeded: false };
  } catch {
    return { ok: false, data: null, error: 'Failed to read from storage', quotaExceeded: false };
  }
}

function save<K extends StorageKey>(key: K, value: StorageRegistry[K]): StorageResult<null> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, data: null, error: null, quotaExceeded: false };
  } catch (e) {
    const quotaExceeded =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      data: null,
      error: quotaExceeded
        ? 'Storage is full. Data saved in memory but will not persist after refresh.'
        : 'Could not save to browser storage.',
      quotaExceeded,
    };
  }
}

function remove<K extends StorageKey>(key: K): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
```

**Key design notes:**
- Keys that store simple strings (seeded, schema-version, hide-resolved) use `JSON.stringify`/`JSON.parse` uniformly. However, the existing code stores these as raw strings (`localStorage.setItem(key, 'true')`). The storage manager must handle this: either (a) store all values as JSON, requiring a one-time migration for raw strings, or (b) add a `loadRaw`/`saveRaw` overload for string-only keys. **Recommendation:** Use `saveRaw`/`loadRaw` for simple string keys to avoid migrating existing stored data. Only JSON-serialize complex objects.
- The `remove` method is needed because `contractStorage.ts` calls `localStorage.removeItem()` during migration.

### Pattern 2: Isomorphic Error Classifier
**What:** A single function that takes any caught error and returns a classified result with user-friendly message, error type, and retryable flag.
**When to use:** Every `catch` block across client and server.

```typescript
// src/utils/errors.ts

type ErrorType = 'network' | 'api' | 'validation' | 'storage' | 'timeout' | 'unknown';

interface ClassifiedError {
  type: ErrorType;
  userMessage: string;
  retryable: boolean;
  originalError: unknown;
}

interface ApiErrorResponse {
  error: string;
  type: ErrorType;
  retryable: boolean;
  details?: unknown;
}

function classifyError(err: unknown): ClassifiedError {
  // Network errors (client-side fetch failures)
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return { type: 'network', userMessage: 'Connection failed. Check your internet and try again.', retryable: true, originalError: err };
  }
  if (err instanceof Error && err.message.includes('NetworkError')) {
    return { type: 'network', userMessage: 'Network error. Please try again.', retryable: true, originalError: err };
  }

  // Timeout errors
  if (err instanceof Error && (
    err.message.includes('HeadersTimeoutError') ||
    err.message.includes('timeout') ||
    err.message.includes('ETIMEDOUT')
  )) {
    return { type: 'timeout', userMessage: 'Request timed out. Please try again.', retryable: true, originalError: err };
  }

  // Storage errors
  if (err instanceof DOMException && (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )) {
    return { type: 'storage', userMessage: 'Storage is full.', retryable: false, originalError: err };
  }

  // API errors (errors with HTTP status codes)
  const statusErr = err as { status?: number; message?: string };
  if (typeof statusErr.status === 'number') {
    if (statusErr.status === 429) {
      return { type: 'api', userMessage: 'Rate limit exceeded. Please wait and try again.', retryable: true, originalError: err };
    }
    if (statusErr.status === 401) {
      return { type: 'api', userMessage: 'Server configuration error: invalid API key.', retryable: false, originalError: err };
    }
    return { type: 'api', userMessage: statusErr.message || 'API error occurred.', retryable: false, originalError: err };
  }

  // Unknown
  return {
    type: 'unknown',
    userMessage: err instanceof Error ? err.message : 'An unexpected error occurred.',
    retryable: false,
    originalError: err,
  };
}

function formatApiError(classified: ClassifiedError, details?: unknown): ApiErrorResponse {
  return {
    error: classified.userMessage,
    type: classified.type,
    retryable: classified.retryable,
    ...(details ? { details } : {}),
  };
}
```

**Isomorphic constraint:** `errors.ts` lives in `src/utils/` which is bundled by Vite for client, but also importable from `api/analyze.ts` (Node/Vercel). It must NOT use browser APIs (no `window`, no `document`). The `DOMException` check is fine -- Node 18+ has `DOMException` globally. The existing `tsconfig.json` includes only `src` in its `include`, but `api/` has its own `tsconfig.node.json` that can reference `src/` files via relative imports (already done throughout `api/analyze.ts`).

### Pattern 3: Severity Palette Map
**What:** A record mapping `Severity` values to complete Tailwind class strings.
**When to use:** Any component rendering severity-colored UI.

```typescript
// src/utils/palette.ts
import type { Severity } from '../types/contract';

/** Severity badge colors: background + text + border */
export const SEVERITY_BADGE_COLORS: Record<Severity, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-amber-100 text-amber-700 border-amber-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
  Info: 'bg-slate-100 text-slate-700 border-slate-200',
};

/** Risk score text color based on score thresholds */
export function getRiskScoreColor(score: number): string {
  if (score > 70) return 'text-red-600';
  if (score > 40) return 'text-amber-600';
  return 'text-emerald-600';
}

/** Risk score badge colors (bg variant, used in ContractCard) */
export function getRiskBadgeColor(score: number): string {
  if (score >= 70) return 'bg-red-100 text-red-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}
```

**Tailwind purge safety:** All class strings are complete string literals in the source file. Since `src/utils/palette.ts` is in the `./src/**/*.{js,ts,jsx,tsx}` content glob, Tailwind JIT will scan it and include all referenced classes. No safelisting needed.

### Pattern 4: Request Body Zod Schema
**What:** A Zod schema for the `/api/analyze` POST body, replacing ad-hoc validation.
**When to use:** Server-side request validation in `api/analyze.ts`.

```typescript
// Could live in src/schemas/requestSchemas.ts (near existing schemas)
// or inline in api/analyze.ts. Recommendation: src/schemas/ for consistency.

import { z } from 'zod';

export const AnalyzeRequestSchema = z.object({
  pdfBase64: z.string().min(1, 'pdfBase64 is required'),
  fileName: z.string().max(255).optional(),
  companyProfile: CompanyProfileSchema.optional(),  // reuse existing schema
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
```

**Decision note:** The existing `CompanyProfileSchema` is defined locally in `api/analyze.ts` (lines 53-74). For TYPE-04, the request schema should compose it. The `CompanyProfileSchema` could be extracted to `src/schemas/` or kept in `api/analyze.ts` with the new request schema wrapping it. Recommendation: keep `CompanyProfileSchema` where it is and define `AnalyzeRequestSchema` in the same file, since the schema references local constants and is only used server-side.

### Anti-Patterns to Avoid
- **String fragment concatenation for Tailwind:** Never do `` `bg-${color}-100` `` -- Tailwind JIT cannot detect dynamic strings. Always use complete string literals.
- **localStorage.getItem without try-catch:** Safari private browsing, full storage, and corrupt data all throw. Every call must be wrapped.
- **Importing React/DOM in utilities:** `errors.ts` and `storageManager.ts` must be pure -- no React imports, no JSX. This keeps them usable from server-side code.
- **Mixing recovery logic into the error classifier:** The classifier should only classify and format. Retry logic, toast display, and rollback stay in callers (App.tsx, hooks).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request body validation | Manual `if (!field)` checks | Zod schema `.safeParse()` | Already using Zod; gives typed output + structured error messages for free |
| JSON parse error handling | Inline try-catch per call site | Storage manager's `load()` | Centralizes parse failure handling, eliminates 12 scattered try-catches |
| Quota detection | Per-call DOMException checks | Storage manager's result object | Quota check pattern is identical everywhere -- centralize once |

## Common Pitfalls

### Pitfall 1: Tailwind Purge Strips Palette Colors
**What goes wrong:** Production build renders severity badges as unstyled text because JIT never saw the class strings.
**Why it happens:** Classes defined in a utility file that's outside Tailwind's content glob, OR classes constructed via string interpolation.
**How to avoid:** (1) Verify `src/utils/palette.ts` is covered by `./src/**/*.{js,ts,jsx,tsx}` in `tailwind.config.js` (it is). (2) Use only complete string literals. (3) Test with `npm run build` after implementing.
**Warning signs:** Classes work in dev (Tailwind scans everything in dev mode) but disappear in production.

### Pitfall 2: Raw vs JSON String Storage Mismatch
**What goes wrong:** Existing stored values like `'true'` (raw string) are read through `JSON.parse()` and either work accidentally (valid JSON) or break.
**Why it happens:** Current code uses `localStorage.setItem(key, 'true')` (raw) for flags but `JSON.stringify(contracts)` for complex data. A uniform JSON wrapper would break existing raw values.
**How to avoid:** The storage manager should provide both `load`/`save` (JSON) and `loadRaw`/`saveRaw` (string) methods. Flag keys (`seeded`, `schema-version`, `hide-resolved`) use raw methods. Complex keys (`contracts`, `company-profile`) use JSON methods.
**Warning signs:** `"true"` (JSON-parsed string) vs `true` (boolean) mismatches in comparisons.

### Pitfall 3: Server-Side DOMException Reference
**What goes wrong:** `errors.ts` references `DOMException` which may not exist in all Node.js versions.
**Why it happens:** `DOMException` is a browser API that was added to Node.js globals in v17.
**How to avoid:** The project targets Node 20+ (Vercel runtime). `DOMException` is available globally. However, the storage error classification branch will never execute server-side (no localStorage on server). The classifier should handle this gracefully -- the check is harmless even if it never matches.
**Warning signs:** None expected with Node 20+; only relevant if Node version is < 17.

### Pitfall 4: Circular Import Between storageManager and contractStorage
**What goes wrong:** If `storageManager.ts` imports types from `contractStorage.ts` and vice versa, TypeScript emits a circular dependency warning.
**Why it happens:** Both files deal with contract storage.
**How to avoid:** `storageManager.ts` imports only from `types/contract.ts` and `knowledge/types.ts` (for the registry type map). `contractStorage.ts` imports from `storageManager.ts`. One-directional dependency.
**Warning signs:** TypeScript "implicitly has type 'any'" errors or runtime `undefined` imports.

### Pitfall 5: isNetworkError Duplication
**What goes wrong:** `App.tsx` has an inline `isNetworkError` function. After creating `errors.ts`, forgetting to remove the old function leaves duplicate logic.
**Why it happens:** The old function is an arrow function inside the component, easy to overlook.
**How to avoid:** After integrating `classifyError()`, explicitly search for and remove `isNetworkError` from `App.tsx`. The classifier's `type === 'network'` replaces it.
**Warning signs:** Two different error classification paths in the same file.

## Code Examples

### Storage Manager Usage (refactored contractStorage.ts)
```typescript
// src/storage/contractStorage.ts (after refactor)
import { load, save, loadRaw, saveRaw, remove } from './storageManager';
import { Contract } from '../types/contract';
import { MOCK_CONTRACTS } from '../data/mockContracts';

const CURRENT_SCHEMA_VERSION = 1;

export function loadContracts(): {
  contracts: Contract[];
  fromStorage: boolean;
  migrationWarning?: string;
} {
  const versionResult = loadRaw('clearcontract:schema-version');
  const version = versionResult.data ? parseInt(versionResult.data, 10) : 0;

  if (version > 0 && version < CURRENT_SCHEMA_VERSION) {
    remove('clearcontract:contracts');
    saveRaw('clearcontract:schema-version', String(CURRENT_SCHEMA_VERSION));
    return { contracts: [], fromStorage: true, migrationWarning: 'Storage format updated.' };
  }

  const contractsResult = load('clearcontract:contracts');
  if (contractsResult.ok && contractsResult.data && Array.isArray(contractsResult.data)) {
    if (!versionResult.data) {
      saveRaw('clearcontract:schema-version', String(CURRENT_SCHEMA_VERSION));
    }
    return { contracts: contractsResult.data, fromStorage: true };
  }

  const seededResult = loadRaw('clearcontract:contracts-seeded');
  if (!seededResult.data) {
    saveContracts(MOCK_CONTRACTS);
    saveRaw('clearcontract:contracts-seeded', 'true');
    saveRaw('clearcontract:schema-version', String(CURRENT_SCHEMA_VERSION));
    return { contracts: MOCK_CONTRACTS, fromStorage: false };
  }

  return { contracts: [], fromStorage: true };
}

export function saveContracts(contracts: Contract[]): { success: boolean; error?: string } {
  const result = save('clearcontract:contracts', contracts);
  if (result.ok) return { success: true };
  return { success: false, error: result.error ?? 'Could not save.' };
}
```

### Error Classifier Usage (refactored App.tsx catch block)
```typescript
import { classifyError } from './utils/errors';

// In catch handler:
.catch((err) => {
  deleteContract(id);
  if (activeView === 'review' && activeContractId === id) {
    navigateTo('dashboard');
  }

  const classified = classifyError(err);
  setToast({
    type: 'error',
    message: classified.userMessage,
    ...(classified.retryable ? {
      onRetry: () => { setToast(null); handleUploadComplete(file); },
    } : {}),
    onDismiss: () => setToast(null),
  });
})
```

### Palette Usage (refactored SeverityBadge)
```typescript
import { SEVERITY_BADGE_COLORS } from '../utils/palette';

export function SeverityBadge({ severity, downgradedFrom, className = '' }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_BADGE_COLORS[severity]} ${className}`}>
      {severity}
    </span>
  );
}
```

## Inventory of Call Sites to Refactor

### localStorage calls (12 total across 4 files)
| File | Line(s) | Operation | Target Key |
|------|---------|-----------|------------|
| `src/storage/contractStorage.ts` | 21, 36 | getItem | contracts, schema-version |
| `src/storage/contractStorage.ts` | 27, 28, 43, 55, 56, 77 | setItem/removeItem | contracts, schema-version, seeded |
| `src/knowledge/profileLoader.ts` | 12 | getItem | company-profile |
| `src/hooks/useCompanyProfile.ts` | 16 | setItem | company-profile |
| `src/pages/ContractReview.tsx` | 137, 146 | getItem, setItem | hide-resolved |

### Severity/risk color mappings (5 primary locations)
| File | Lines | Pattern |
|------|-------|---------|
| `src/components/SeverityBadge.tsx` | 12-18 | Severity -> badge colors (primary source) |
| `src/components/RiskScoreDisplay.tsx` | 12-17 | Risk score -> text color |
| `src/pages/ContractComparison.tsx` | 29-31, 114 | Risk score -> badge + delta colors |
| `src/components/ContractCard.tsx` | 93-94 | Risk score -> badge colors |
| `src/pages/Dashboard.tsx` | 29-37 | Date urgency colors (OUT OF SCOPE per decisions) |

Note: `LegalMetaBadge.tsx` and `ScopeMetaBadge.tsx` use contextual colors (e.g., red for "broad" indemnification) that are NOT severity colors. These are domain-specific conditional colors and are out of scope for PATN-03.

### Error handling blocks (9 across 3 primary files)
| File | Lines | Pattern |
|------|-------|---------|
| `src/App.tsx` | 48-51 | `isNetworkError()` inline function |
| `src/App.tsx` | 88-118 | Upload catch -> network vs generic toast |
| `src/App.tsx` | 194-217 | Reanalyze catch -> network vs generic toast |
| `src/api/analyzeContract.ts` | 62-75 | HTTP response error parsing |
| `src/storage/contractStorage.ts` | 62-65 | Load catch (swallow) |
| `src/storage/contractStorage.ts` | 82-95 | Save catch -> quota detection |
| `api/analyze.ts` | 1462-1493 | Server catch -> status code / timeout / generic |
| `src/knowledge/profileLoader.ts` | 16-18 | Load catch (swallow) |
| `src/hooks/useCompanyProfile.ts` | 18-21 | Save catch -> storage error state |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `if (!field)` validation | Zod `.safeParse()` | Zod 3.x (2022+) | Type-safe parsing with structured errors |
| Inline severity color objects | Shared palette constant | This phase | Single source of truth, purge-safe |
| Per-file try-catch patterns | Centralized error classifier | This phase | Consistent error messages, retryable flag |
| Direct localStorage calls | Typed storage manager | This phase | Type safety, quota handling, testability |

## Open Questions

1. **Schema file location for AnalyzeRequestSchema**
   - What we know: Existing schemas live in `src/schemas/analysis.ts` and `src/schemas/legalAnalysis.ts`
   - What's unclear: Whether to put the request schema in a new file (`src/schemas/request.ts`) or inline in `api/analyze.ts`
   - Recommendation: New file `src/schemas/request.ts` for consistency with existing pattern, but keep `CompanyProfileSchema` in `api/analyze.ts` since it uses `.partial()` and server-specific `.max()` constraints

2. **loadRaw/saveRaw vs uniform JSON**
   - What we know: 3 keys store raw strings ('true', '1'), 2 keys store JSON
   - What's unclear: Whether to migrate existing raw values to JSON on first load
   - Recommendation: Use `loadRaw`/`saveRaw` for simplicity -- avoids migration, and these flag keys don't need type safety beyond string

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none -- no test framework in project |
| Quick run command | `npm run build` (type-check + bundle) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATN-01 | All localStorage via storage manager | manual-only | Grep for bare `localStorage.` calls outside storageManager.ts | N/A |
| PATN-02 | All error handling uses shared classifier | manual-only | Grep for `isNetworkError` and inline error classification | N/A |
| PATN-03 | No inline severity ternary chains | manual-only | Grep for severity color literals outside palette.ts | N/A |
| TYPE-04 | POST body validated with Zod schema | manual-only | `curl -X POST /api/analyze -d '{}'` returns 400 with descriptive message | N/A |

**Justification for manual-only:** No test framework is configured (TEST-01 is deferred to v1.6). Validation relies on `npm run build` (TypeScript compilation proves imports work), `npm run lint`, and grep-based audits.

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build succeeds + grep audits show zero bare localStorage/severity-color calls outside utility files

### Wave 0 Gaps
None -- no test infrastructure to set up (testing is explicitly out of scope for v1.5).

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all referenced files (contractStorage.ts, SeverityBadge.tsx, RiskScoreDisplay.tsx, analyze.ts, App.tsx, profileLoader.ts, useCompanyProfile.ts, ContractReview.tsx)
- `package.json` for exact dependency versions
- `tailwind.config.js` for content/purge configuration
- `tsconfig.json` for TypeScript configuration

### Secondary (MEDIUM confidence)
- Tailwind CSS JIT purge behavior -- well-documented in official Tailwind docs; class string detection is regex-based on source files within content glob

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, everything verified in package.json
- Architecture: HIGH -- patterns derived directly from existing code and user decisions in CONTEXT.md
- Pitfalls: HIGH -- all pitfalls identified from actual code patterns in the repository

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- refactoring existing code, no external API changes expected)
