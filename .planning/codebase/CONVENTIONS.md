# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

**Files:**
- Components: PascalCase `.tsx` files (e.g., `FindingCard.tsx`, `SeverityBadge.tsx`, `AnalysisProgress.tsx`)
- Pages: PascalCase `.tsx` files in `src/pages/` (e.g., `ContractReview.tsx`, `Dashboard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useContractStore.ts`, `useCompanyProfile.ts`)
- Utilities: camelCase `.ts` files (e.g., `bidSignal.ts`, `categoryIcons.ts`)
- Schemas: camelCase `.ts` files (e.g., `analysis.ts`, `legalAnalysis.ts`)
- Types: camelCase `.ts` files (e.g., `contract.ts`, `types.ts`)
- API client wrappers: camelCase `.ts` (e.g., `analyzeContract.ts`)
- Serverless functions: camelCase `.ts` in `api/` (e.g., `api/analyze.ts`)

**Functions:**
- Use camelCase: `analyzeContract`, `computeBidSignal`, `loadCompanyProfile`
- Component functions: PascalCase (e.g., `FindingCard`, `Dashboard`)
- Helper/matcher functions: camelCase with descriptive verb prefix (e.g., `matchesBonding`, `buildBaseFinding`, `convertLegalFinding`)
- Boolean predicates: `is` or `has` prefix (e.g., `isSpecializedPass`, `hasEmptyProfileFields`)

**Variables:**
- camelCase for all variables: `activeContract`, `selectedCategory`, `riskScore`
- Constants: UPPER_SNAKE_CASE for module-level constants (e.g., `MAX_FILE_SIZE`, `SEVERITY_WEIGHTS`, `ANALYSIS_PASSES`, `BETAS`)
- State variables: camelCase with setter following React convention (`[activeView, setActiveView]`)

**Types:**
- Interfaces: PascalCase with descriptive suffix (e.g., `FindingCardProps`, `AnalysisResult`, `ComparisonRow`)
- Type aliases: PascalCase (e.g., `Severity`, `Category`, `ViewState`, `BidSignalLevel`)
- Zod schemas: PascalCase with `Schema` suffix (e.g., `FindingSchema`, `PassResultSchema`, `RiskOverviewResultSchema`)
- Inferred types from Zod: PascalCase with `Result` suffix (e.g., `PassResult`, `MergedAnalysisResult`)
- Discriminated unions: Use literal string `clauseType` or `passType` discriminator (see `LegalMeta` and `ScopeMeta` in `src/types/contract.ts`)

## Code Style

**Formatting:**
- Prettier with config in `.prettierrc`
- Single quotes (`'singleQuote': true`)
- Trailing commas: ES5 style (`'trailingComma': 'es5'`)
- Default Prettier settings for everything else (2-space indent, 80 char print width)
- lint-staged runs Prettier + ESLint on staged `*.{ts,tsx}` files

**Linting:**
- ESLint 8 with config in `.eslintrc.cjs`
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:react-hooks/recommended`
- Plugin: `react-refresh` with `only-export-components` rule (warn)
- Browser + ES2020 environment

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`
- Target: ES2020, JSX: react-jsx
- Module resolution: bundler

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from 'react'`)
2. External library imports (`framer-motion`, `lucide-react`, `react-dropzone`, `zod`)
3. Internal type imports (`from '../types/contract'`)
4. Internal module imports (hooks, components, utils, schemas, knowledge)

**Style:**
- Use named imports throughout, no default imports except for SDK clients (`import Anthropic from '@anthropic-ai/sdk'`)
- Use `import type` for type-only imports in API/server code (e.g., `import type { VercelRequest, VercelResponse } from '@vercel/node'`)
- Relative paths only -- no path aliases configured
- Typical relative depth: `../types/`, `../components/`, `../hooks/`, `../utils/`

## Error Handling

**Client-side API calls (`src/api/analyzeContract.ts`):**
- Validate inputs (file size, file type) before making API call -- throw `Error` with user-facing message
- Parse response: check `response.ok`, then inspect `content-type` header
- JSON error responses: extract `.error` field
- HTML responses: detect `<!DOCTYPE` and provide helpful message ("Is the API server running?")
- Truncate raw text errors to 200 chars
- All errors thrown as `new Error(message)` -- no custom error classes

**Caller error handling (`src/App.tsx`):**
- `.catch()` on Promise chain converts error to a Critical finding displayed in the UI
- Uses `err instanceof Error ? err.message : 'An unexpected error occurred'` pattern
- No global error boundary

**Server-side (`api/analyze.ts`):**
- HTTP method validation (405 for non-POST)
- Input validation (400 for missing fields, file size check)
- API key validation (401 for missing key)
- Content validation (422 for image-based PDFs with insufficient text)
- Rate limit handling (429 from Anthropic API)
- Failed analysis passes: `PromiseSettledResult` pattern -- failures become Critical findings in output rather than killing the whole request
- Console logging for errors (`console.error`)

**Pattern to follow for new error handling:**
```typescript
// Client-side: throw Error with user message
if (condition) {
  throw new Error('User-friendly error description.');
}

// Server-side: return JSON error with HTTP status
return res.status(400).json({ error: 'Description of what went wrong' });

// Graceful degradation for partial failures
const results = await Promise.allSettled(passes);
// Handle each settled result individually
```

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- `console.error()` for caught exceptions in server-side code
- No client-side logging in production code
- No structured logging or log levels beyond console methods

## Comments

**When to Comment:**
- Section dividers in long files: use `// ----` horizontal rule blocks with section titles (see `api/analyze.ts`)
- Important constraints: use `// IMPORTANT:` prefix for schema constraints or behavioral notes
- Inline comments for non-obvious logic (e.g., `// Clamp to 0-100`, `// Rough page count estimate`)
- CRITICAL comments for guarding fragile code (e.g., `/* CRITICAL: THE FOLLOWING TAILWIND IMPORTS MUST NEVER BE DELETED */` in `src/index.css`)

**JSDoc/TSDoc:**
- Used sparingly, mainly on utility functions and exported functions in `src/utils/` and `src/knowledge/`
- `/** ... */` block style with `@param` omitted (description only)
- Not used on React components or hooks

## Function Design

**Size:** Components range from 20 to 320 lines. Utility functions are short (10-30 lines). The serverless handler (`api/analyze.ts`) is ~1500 lines total but decomposed into many small helper functions.

**Parameters:**
- Components: destructured props with explicit interface (`{ finding, index }: FindingCardProps`)
- Utility functions: typed positional parameters
- Default parameter values used for optional props (e.g., `color = 'blue'`, `className = ''`)

**Return Values:**
- Components: JSX (single root element)
- Hooks: plain object with named properties (not tuple except for `useState`)
- Utility functions: typed return values

## Module Design

**Exports:**
- Components: named export of a single function component per file (`export function FindingCard`)
- Hooks: named export of a single hook per file (`export function useContractStore`)
- Types: named exports of all types from a single file (`src/types/contract.ts`)
- Knowledge system: barrel file re-exports via `src/knowledge/index.ts`
- No default exports anywhere in the codebase

**Barrel Files:**
- `src/knowledge/index.ts` re-exports from `types.ts`, `registry.ts`, `tokenBudget.ts`
- `src/knowledge/regulatory/index.ts`, `src/knowledge/trade/index.ts`, `src/knowledge/standards/index.ts` register modules via side-effect imports
- No barrel files for components or pages -- each is imported directly

## Component Patterns

**Props Interface:**
- Always define an explicit `interface XxxProps` immediately before the component
- Keep interface in the same file as the component (not in a shared types file)
- Use `children` sparingly -- prefer explicit props

**State Management:**
- All app state lives in `useContractStore` hook (`src/hooks/useContractStore.ts`) using `useState`
- Local component state for UI concerns (filters, view mode, toggle state)
- No Context, no Redux, no external state libraries
- Company profile persisted to `localStorage` via `useCompanyProfile` hook

**Animation Pattern:**
- Framer Motion `motion.div` for entry animations
- Staggered delays: `delay: index * 0.05`
- Standard initial/animate: `{ opacity: 0, y: 10 }` to `{ opacity: 1, y: 0 }`
- `AnimatePresence` with `mode="popLayout"` for filtered list transitions

**Severity Color Map (use consistently):**
```typescript
const colors = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-amber-100 text-amber-700 border-amber-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
  Info: 'bg-slate-100 text-slate-700 border-slate-200',
};
```

**Tailwind Patterns:**
- Use `slate` as the neutral color throughout (not `gray` or `zinc`)
- Background: `bg-slate-50` for page, `bg-white` for cards
- Borders: `border-slate-200` standard, `border-slate-100` for subtle dividers
- Text: `text-slate-900` for headings, `text-slate-600` for body, `text-slate-500` for secondary, `text-slate-400` for muted
- Rounded corners: `rounded-lg` for cards, `rounded-xl` for larger containers, `rounded-full` for badges/pills
- Custom class: `.glass-panel` (`bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm`) defined in `src/index.css`

## Zod Schema Conventions

**Location:** `src/schemas/analysis.ts`, `src/schemas/legalAnalysis.ts`, `src/schemas/scopeComplianceAnalysis.ts`

**Rules:**
- No `.min()`, `.max()`, `.minLength()`, `.maxLength()` constraints -- Anthropic structured outputs does not support them
- Enum values kept in sync manually with `src/types/contract.ts`
- Convert to JSON Schema via `zod-to-json-schema` for API `output_config`
- Infer TypeScript types from Zod schemas with `z.infer<typeof Schema>`

---

*Convention analysis: 2026-03-12*
