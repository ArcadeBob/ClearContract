# Coding Conventions

**Analysis Date:** 2026-03-01

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `FindingCard.tsx`, `SeverityBadge.tsx`)
- Utility/hook files: camelCase (e.g., `useContractStore.ts`, `analyzeContract.ts`)
- Type/interface files: camelCase (e.g., `contract.ts`)
- API handlers: camelCase (e.g., `analyze.ts`)

**Functions:**
- React components: PascalCase (e.g., `function Dashboard()`, `export function SeverityBadge()`)
- Utility functions: camelCase (e.g., `readFileAsBase64()`, `analyzeContract()`)
- Event handlers: camelCase with `on` prefix or `handle` prefix (e.g., `onNavigate()`, `handleUploadComplete()`, `onDrop()`)
- Hook functions: camelCase with `use` prefix (e.g., `useContractStore()`)

**Variables:**
- State variables: camelCase (e.g., `activeContract`, `isUploading`, `selectedCategory`)
- Type/interface variables: PascalCase (e.g., `Contract`, `Finding`, `ViewState`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `SYSTEM_PROMPT`, `MOCK_CONTRACTS`)
- Object properties/keys: camelCase (e.g., `riskScore`, `uploadDate`, `clauseReference`)

**Types:**
- Interface names: PascalCase (e.g., `Finding`, `Contract`, `ContractDate`)
- Type aliases: PascalCase (e.g., `Severity`, `Category`, `ViewState`)
- Generic parameters: PascalCase (e.g., `T`, `Props`)
- Discriminated union literals: PascalCase or quoted strings (e.g., `'Critical' | 'High'` for severity)

## Code Style

**Formatting:**
- No Prettier config in repo — formatting is manual/editor-based
- ESLint configuration: `.eslintrc.cjs` with `eslint:recommended`, `@typescript-eslint/recommended`, and `react-hooks/recommended`
- Indentation: 2 spaces (implicit from codebase style)
- Line length: No explicit limit enforced (see ~80-90 character lines throughout)
- Trailing semicolons: Always included
- Arrow functions: Preferred over function declarations in component/callback contexts

**Linting:**
- Tool: ESLint 8.50.0 with `@typescript-eslint/parser`
- Key rule: `react-refresh/only-export-components` (warn) — Ensures exported components work with React Refresh fast refresh
- No custom lint rules beyond defaults; codebase follows standard TS/React conventions

## Import Organization

**Order:**
1. React imports (`import React from 'react'`)
2. Third-party library imports (`framer-motion`, `lucide-react`, `react-dropzone`, `@vercel/node`, `@anthropic-ai/sdk`)
3. Internal absolute imports (`from '../types/contract'`, `from '../hooks/useContractStore'`, `from '../components/...'`)

**Path Aliases:**
- No path aliases configured; all imports are relative (`../', `./`)

**Example:**
```typescript
import React from 'react';
import { Contract, Category } from '../types/contract';
import { FindingCard } from '../components/FindingCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ChevronLeft, Download, Share2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
```

## Error Handling

**Patterns:**
- Custom `Error` constructor with descriptive message strings for validation: `throw new Error('Only PDF files are supported.')`
- HTTP error responses wrapped in user-friendly messages: `throw new Error(body.error || 'Analysis failed (HTTP ${response.status})')`
- Type narrowing for caught errors: `const err = error as { status?: number; message?: string }`
- Error type guards: `if (err instanceof SyntaxError)` or `if (err.status === 429)`
- Graceful fallback on missing response body: `.catch(() => ({ error: 'Unknown error' }))`
- No global error boundary or centralized error handler — error handling is local to each async operation

**Error propagation in App.tsx (`src/App.tsx`):**
- Upload failures during `analyzeContract()` are caught and converted to a "Critical" finding in the contract UI
- Error message displayed as a Finding with severity "Critical", category "Risk Assessment", title "Analysis Failed"

**Error propagation in analyzeContract.ts (`src/api/analyzeContract.ts`):**
- File validation errors (size, type) throw immediately with descriptive messages
- HTTP errors extract body and throw with either provided error message or HTTP status code
- Reader errors from FileReader API throw with generic message

**Error propagation in analyze.ts (`api/analyze.ts`):**
- Missing/invalid API key: 500 response with "Server configuration error"
- Missing pdfBase64: 400 response with "Missing or invalid pdfBase64 field"
- Insufficient text extraction (image-based PDF): 422 response with specific guidance on text-based PDF requirement
- Rate limit (429) from Claude API: Pass through to client as 429
- Auth failure (401) from Claude API: Convert to 500 with "Server configuration error"
- JSON parse failure: 500 response with "Failed to parse AI response"
- Unexpected errors: 500 response with generic "An error occurred during analysis"
- Errors logged to console: `console.error('Analysis error:', err.message || error)`

## Logging

**Framework:** `console` object only — no dedicated logging library

**Patterns:**
- Errors logged in catch blocks: `console.error('Analysis error:', err.message || error)` in `api/analyze.ts` line 157
- No info/debug logging in client code
- No structured logging; plain text messages to console
- No log levels (info, warn, debug) — only error logging used

## Comments

**When to Comment:**
- Inline comments for non-obvious logic (e.g., PDF base64 prefix stripping in `readFileAsBase64()` explains "Strip the data:...;base64, prefix")
- Section comments for major blocks (e.g., "Create placeholder contract in Analyzing state" in `App.tsx`)
- No over-commenting; self-documenting code via clear naming is preferred

**JSDoc/TSDoc:**
- Not used in codebase; no function-level documentation comments
- Type definitions provide documentation via interfaces (e.g., `interface FindingCardProps`)

## Function Design

**Size:** Typically 10-40 lines; larger functions break at logical boundaries (e.g., `renderContent()` in `App.tsx` uses switch statement to delegate)

**Parameters:**
- Destructured from objects when multiple related values (e.g., `{ finding, index }` in `FindingCard`)
- Callback props use type-safe handlers (e.g., `onNavigate: (view: ViewState, contractId?: string) => void`)
- Optional parameters using `?` for nullable values (e.g., `contractId?`, `className?`)

**Return Values:**
- JSX for component functions
- Promises for async functions (`Promise<T>`)
- Typed data objects for utilities (e.g., `AnalysisResult` interface)
- Void for event handlers (`onClick`, `onDrop`)

## Module Design

**Exports:**
- Named exports for reusable components and functions: `export function SeverityBadge()`, `export function useContractStore()`
- Default exports: Not used
- Type exports: `export type Severity = ...`, `export interface Contract`

**Barrel Files:**
- Not used; components imported directly from their files

**Example structure:**
```typescript
// Component with typed props
interface MyComponentProps {
  prop1: string;
  prop2?: number;
  onClick: () => void;
}

export function MyComponent({ prop1, prop2, onClick }: MyComponentProps) {
  return <div>{prop1}</div>;
}
```

---

*Convention analysis: 2026-03-01*
