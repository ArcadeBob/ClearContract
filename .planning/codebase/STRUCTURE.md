# Codebase Structure

**Analysis Date:** 2026-03-01

## Directory Layout

```
ClearContract/
├── api/
│   └── analyze.ts                    # Vercel serverless function: PDF parse + Claude API
├── src/
│   ├── index.tsx                     # React DOM render entry point
│   ├── App.tsx                       # Root component: layout, view routing, upload handler
│   ├── index.css                     # Tailwind imports, Inter font, .glass-panel custom class
│   ├── types/
│   │   └── contract.ts               # Domain types: Contract, Finding, Category, ViewState
│   ├── hooks/
│   │   └── useContractStore.ts       # Central state hook: contracts array, active contract/view
│   ├── api/
│   │   └── analyzeContract.ts        # Client-side API wrapper: file validation, base64 encode, fetch
│   ├── data/
│   │   └── mockContracts.ts          # Initial contract data (3 sample contracts)
│   ├── components/                   # Reusable UI components
│   │   ├── Sidebar.tsx               # Left navigation panel
│   │   ├── SeverityBadge.tsx         # Severity indicator (Critical, High, Medium, Low, Info)
│   │   ├── FindingCard.tsx           # Individual finding display with icon, title, description
│   │   ├── ContractCard.tsx          # Contract summary for list views
│   │   ├── CategoryFilter.tsx        # Filter findings by category
│   │   ├── DateTimeline.tsx          # Visual timeline of contract dates
│   │   ├── StatCard.tsx              # Dashboard metric card (value + trend)
│   │   ├── UploadZone.tsx            # PDF drag-drop interface (react-dropzone)
│   │   └── AnalysisProgress.tsx      # Animated progress during contract analysis
│   └── pages/                        # Page components (rendered via view state)
│       ├── Dashboard.tsx             # Overview: stats, recent contracts, quick actions
│       ├── ContractUpload.tsx        # Upload form wrapper
│       ├── ContractReview.tsx        # Detailed analysis view with findings, timeline, filters
│       ├── AllContracts.tsx          # Full contract list
│       └── Settings.tsx              # Settings page (placeholder)
├── dist/                             # Production build output (Vite)
├── node_modules/                     # Dependencies
├── vite.config.ts                    # Vite build config
├── tsconfig.json                     # TypeScript compiler options (strict mode)
├── tsconfig.node.json                # TS config for vite.config.ts
├── package.json                      # Dependencies and scripts
├── package-lock.json                 # Locked dependency versions
├── postcss.config.js                 # Tailwind CSS processing
├── tailwind.config.js                # Tailwind theme customization
├── vercel.json                       # Vercel deployment config (60s timeout for /api/analyze)
├── CLAUDE.md                         # Project instructions and architecture docs
└── .planning/codebase/               # GSD analysis documents (this directory)
    ├── ARCHITECTURE.md
    ├── STRUCTURE.md
    └── ...
```

## Directory Purposes

**api/**
- Purpose: Vercel serverless functions handling backend logic
- Contains: TypeScript files compiled and deployed as Functions on Vercel
- Key files: `api/analyze.ts` (PDF processing, Claude API integration)

**src/**
- Purpose: Client-side React application source code
- Contains: Components, pages, hooks, types, data, styles
- Entry point: `src/index.tsx` → `src/App.tsx`

**src/types/**
- Purpose: Domain type definitions
- Contains: TypeScript interfaces and types used throughout the app
- Key files: `src/types/contract.ts` (Contract, Finding, ContractDate, Category, Severity, ViewState)

**src/hooks/**
- Purpose: Custom React hooks for state and business logic
- Contains: `useContractStore` (single custom hook managing all application state)
- Pattern: State management via `useState`, returned methods for mutations

**src/api/**
- Purpose: API client and integration logic
- Contains: Functions for communicating with serverless backend
- Key files: `src/api/analyzeContract.ts` (file validation, base64 encoding, POST to /api/analyze)

**src/data/**
- Purpose: Static mock data for development and initialization
- Contains: Sample contracts at varying risk levels (3 contracts)
- Key files: `src/data/mockContracts.ts` (MOCK_CONTRACTS array)

**src/components/**
- Purpose: Reusable UI building blocks
- Contains: Presentational components (no state except local UI state)
- Pattern: Functional components, props-based, Tailwind styling, Lucide icons

**src/pages/**
- Purpose: Full-page components rendered based on active ViewState
- Contains: Dashboard, upload form, contract review, settings
- Pattern: Receive data and callbacks from `App.tsx` via props
- Not a router: pages rendered via simple switch statement in `App.tsx`

**dist/**
- Purpose: Compiled production build
- Contains: Bundled JavaScript, CSS, assets (output of `npm run build`)
- Generated: Yes (do not commit, included in .gitignore)
- Committed: No

## Key File Locations

**Entry Points:**
- `src/index.tsx`: React app mount point, renders App into DOM
- `src/App.tsx`: Root component, layout and view routing logic
- `api/analyze.ts`: Vercel serverless endpoint for contract analysis

**Configuration:**
- `tsconfig.json`: TypeScript compiler settings (strict mode)
- `vite.config.ts`: Vite bundler configuration
- `tailwind.config.js`: Tailwind theme and customization
- `postcss.config.js`: PostCSS and Tailwind processing
- `vercel.json`: Deployment settings (60s timeout for analyze function)
- `package.json`: Dependencies and npm scripts
- `CLAUDE.md`: Project instructions and architecture overview

**Core Logic:**
- `src/hooks/useContractStore.ts`: Central state management
- `src/api/analyzeContract.ts`: Client-side API wrapper
- `api/analyze.ts`: Server-side PDF processing and Claude API
- `src/types/contract.ts`: All domain type definitions

**Testing:**
- No test files present (no test framework configured)

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `FindingCard.tsx`, `Dashboard.tsx`)
- Hooks: `camelCase` prefix `use`, e.g. `useContractStore.ts`
- Utilities/helpers: `camelCase.ts` (e.g., `analyzeContract.ts`)
- Type definition files: `contract.ts` (contains all Contract-related types)
- Config files: lowercase (e.g., `vite.config.ts`, `tailwind.config.js`)

**Directories:**
- Plural names for categories: `components/`, `pages/`, `hooks/`, `types/`, `api/`
- Lowercase: `src/`, `dist/`, `api/`, `data/`

**TypeScript:**
- Domain types: PascalCase (e.g., `Contract`, `Finding`, `Severity`, `Category`, `ViewState`)
- Interfaces: PascalCase prefixed with context (e.g., `ContractUploadProps`, `AnalysisResult`)
- Functions: camelCase (e.g., `useContractStore()`, `analyzeContract()`, `updateContract()`)
- Constants: SCREAMING_SNAKE_CASE for objects/arrays (e.g., `MOCK_CONTRACTS`)

## Where to Add New Code

**New Feature (e.g., contract export, filtering):**
- Primary code: Add hook method to `src/hooks/useContractStore.ts` if state needed; add component in `src/components/` or refactor existing page in `src/pages/`
- Tests: No test structure currently; add unit tests to new file following `[name].test.ts` pattern if tests are configured
- Types: Extend types in `src/types/contract.ts` if new domain model needed

**New Component/Module:**
- Implementation: Create `.tsx` file in `src/components/` (reusable) or `src/pages/` (full-page)
- Export from barrel file: Consider creating barrel files if directory grows (e.g., `src/components/index.ts` with `export * from './...'`)
- Props: Define `interface [ComponentName]Props` at top of file
- Styling: Use Tailwind utility classes exclusively; add custom classes to `src/index.css` if `.glass-panel`-style utility needed

**Utilities/Helpers:**
- Shared logic: Create in `src/api/` if API-related, or create new `src/utils/` directory if general helpers
- File naming: Match function name (e.g., `validatePDF.ts` for `validatePDF()` function)
- Types: Define types in `src/types/` if used across multiple files

**New API Integration:**
- Client wrapper: Add function to `src/api/analyzeContract.ts` following same pattern (validation, error handling, fetch with error response parsing)
- Server handler: Add new file to `api/` directory (e.g., `api/exportContract.ts`) with Vercel request/response signature
- Environment: Add required env var to `vercel.json` references and `.env.local` (locally); document in CLAUDE.md

**New Page:**
- File: Create `src/pages/[PageName].tsx`
- Add to ViewState: Update type in `src/types/contract.ts` (e.g., add `'newPage'` to ViewState union)
- Add to routing: Add case to switch statement in `src/App.tsx` `renderContent()` method
- Navigation: Add button to `src/components/Sidebar.tsx` `navItems` array to make navigable

## Special Directories

**dist/:**
- Purpose: Production build output directory
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignore)
- Clean: Run `npm run build` to regenerate

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (.gitignore)
- Clean: Delete and re-run `npm install`

**.planning/codebase/:**
- Purpose: GSD analysis documents
- Generated: Yes (by mapping tools)
- Committed: Yes (tracked in git for CI/CD reference)
- Contents: ARCHITECTURE.md, STRUCTURE.md, and other analysis files

---

*Structure analysis: 2026-03-01*
