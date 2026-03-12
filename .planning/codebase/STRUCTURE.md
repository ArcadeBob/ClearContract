# Codebase Structure

**Analysis Date:** 2026-03-12

## Directory Layout

```
clearcontract/
├── api/
│   └── analyze.ts               # Vercel serverless function (sole backend endpoint)
├── src/
│   ├── api/
│   │   └── analyzeContract.ts   # Client-side API wrapper (base64 encode + fetch)
│   ├── components/              # Reusable UI components
│   │   ├── AnalysisProgress.tsx
│   │   ├── BidSignalWidget.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── CategorySection.tsx
│   │   ├── ClauseQuote.tsx
│   │   ├── ContractCard.tsx
│   │   ├── CoverageComparisonTab.tsx
│   │   ├── DateTimeline.tsx
│   │   ├── FindingCard.tsx
│   │   ├── LegalMetaBadge.tsx
│   │   ├── ScopeMetaBadge.tsx
│   │   ├── SeverityBadge.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   └── UploadZone.tsx
│   ├── data/
│   │   └── mockContracts.ts     # Sample contract data (3 contracts, seeded on load)
│   ├── hooks/
│   │   ├── useCompanyProfile.ts # React hook for company profile CRUD (localStorage)
│   │   └── useContractStore.ts  # Central app state hook (contracts, view, navigation)
│   ├── knowledge/               # Domain knowledge module system
│   │   ├── index.ts             # Public API: composeSystemPrompt, exports
│   │   ├── profileLoader.ts     # Load company profile from localStorage
│   │   ├── registry.ts          # Module registry + pass-to-module mapping
│   │   ├── tokenBudget.ts       # Token cap enforcement (10K per module, 4 per pass)
│   │   ├── types.ts             # KnowledgeModule, CompanyProfile interfaces + defaults
│   │   ├── regulatory/          # Regulatory knowledge modules
│   │   │   ├── index.ts         # Side-effect registration barrel
│   │   │   ├── ca-calosha.ts
│   │   │   ├── ca-lien-law.ts
│   │   │   ├── ca-prevailing-wage.ts
│   │   │   └── ca-title24.ts
│   │   ├── standards/           # Industry standards modules
│   │   │   ├── index.ts         # Side-effect registration barrel
│   │   │   ├── contract-forms.ts
│   │   │   └── standards-validation.ts
│   │   └── trade/               # Trade-specific knowledge modules
│   │       ├── index.ts         # Side-effect registration barrel
│   │       └── div08-scope.ts
│   ├── pages/                   # Page-level components (one per ViewState)
│   │   ├── AllContracts.tsx
│   │   ├── ContractReview.tsx
│   │   ├── ContractUpload.tsx
│   │   ├── Dashboard.tsx
│   │   └── Settings.tsx
│   ├── schemas/                 # Zod schemas for Claude structured outputs
│   │   ├── analysis.ts          # Core schemas (Finding, PassResult, MergedAnalysisResult)
│   │   ├── legalAnalysis.ts     # 11 legal pass schemas (self-contained, no cross-imports)
│   │   └── scopeComplianceAnalysis.ts  # 4 scope/compliance pass schemas
│   ├── types/
│   │   └── contract.ts          # All domain type definitions (Contract, Finding, ViewState, etc.)
│   ├── utils/
│   │   ├── bidSignal.ts         # Deterministic bid/no-bid signal computation
│   │   └── categoryIcons.ts     # Category-to-icon mapping
│   ├── App.tsx                  # Root component: view routing, upload handling
│   ├── index.tsx                # React DOM entry point
│   └── index.css                # Tailwind imports, Inter font, .glass-panel utility
├── index.html                   # Vite HTML entry point
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config (strict mode)
├── tsconfig.node.json           # TypeScript config for Vite/Node tooling
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration (Tailwind + autoprefixer)
├── vercel.json                  # Vercel deployment config (300s maxDuration for API)
├── .eslintrc.cjs                # ESLint configuration
├── .prettierrc                  # Prettier configuration
└── CLAUDE.md                    # AI assistant instructions
```

## Directory Purposes

**`api/`:**
- Purpose: Vercel serverless function(s)
- Contains: Single file `analyze.ts` (1745 lines) -- the entire backend
- Key files: `api/analyze.ts`

**`src/components/`:**
- Purpose: Reusable UI building blocks
- Contains: Presentational React components; each is a single `.tsx` file with a named export
- Key files: `Sidebar.tsx` (navigation), `UploadZone.tsx` (file upload), `FindingCard.tsx` (finding display), `BidSignalWidget.tsx` (bid signal display), `CoverageComparisonTab.tsx` (insurance comparison)

**`src/pages/`:**
- Purpose: Top-level page components, one per view
- Contains: Page components rendered by `App.tsx` based on `ViewState`
- Key files: `Dashboard.tsx`, `ContractReview.tsx` (main analysis display), `ContractUpload.tsx`, `AllContracts.tsx`, `Settings.tsx`

**`src/hooks/`:**
- Purpose: Custom React hooks for state management
- Contains: `useContractStore.ts` (central app state), `useCompanyProfile.ts` (localStorage-backed profile)
- Key files: `useContractStore.ts`

**`src/schemas/`:**
- Purpose: Zod schemas that define the shape of Claude structured output responses
- Contains: Three schema files, self-contained (no cross-imports between legal and scope schemas)
- Key files: `analysis.ts` (core + merged), `legalAnalysis.ts` (11 legal passes), `scopeComplianceAnalysis.ts` (4 scope passes)

**`src/knowledge/`:**
- Purpose: Domain knowledge injection system for AI prompts
- Contains: Module types, registry, token budgeting, prompt composition, and domain content files
- Key files: `index.ts` (public API), `registry.ts` (pass-to-module mapping), `types.ts` (interfaces + defaults)

**`src/knowledge/regulatory/`:**
- Purpose: California-specific regulatory knowledge for AI analysis
- Contains: Modules for Cal/OSHA, lien law, prevailing wage, Title 24
- Pattern: Each file exports nothing directly; calls `registerModule()` as a side effect

**`src/knowledge/standards/`:**
- Purpose: Industry contract form standards and validation rules
- Contains: Contract forms knowledge, standards validation rules

**`src/knowledge/trade/`:**
- Purpose: Glazing trade-specific knowledge (Division 08 scope definitions)
- Contains: `div08-scope.ts`

**`src/types/`:**
- Purpose: TypeScript type definitions shared across client and server
- Contains: Single file with all domain types
- Key files: `contract.ts`

**`src/utils/`:**
- Purpose: Pure utility functions
- Contains: Bid signal computation, category icon mapping
- Key files: `bidSignal.ts`

**`src/api/`:**
- Purpose: Client-side API communication
- Contains: Single file wrapping fetch to `/api/analyze`
- Key files: `analyzeContract.ts`

**`src/data/`:**
- Purpose: Mock/seed data
- Contains: `mockContracts.ts` with 3 pre-built contracts for demo purposes

## Key File Locations

**Entry Points:**
- `index.html`: Vite HTML entry, loads `src/index.tsx`
- `src/index.tsx`: React DOM render of `<App />`
- `src/App.tsx`: Application root -- state initialization, view routing, upload orchestration
- `api/analyze.ts`: Sole serverless endpoint (`POST /api/analyze`)

**Configuration:**
- `tsconfig.json`: TypeScript strict mode config
- `vite.config.ts`: Vite build config
- `tailwind.config.js`: Tailwind theme configuration
- `vercel.json`: Deployment config (300s function timeout)
- `.eslintrc.cjs`: ESLint rules
- `.prettierrc`: Prettier formatting rules
- `postcss.config.js`: PostCSS plugins

**Core Logic:**
- `api/analyze.ts`: Multi-pass analysis pipeline, PDF processing, result merging, deduplication
- `src/hooks/useContractStore.ts`: Central state management
- `src/api/analyzeContract.ts`: Client-to-server analysis bridge
- `src/utils/bidSignal.ts`: Bid/no-bid signal algorithm
- `src/knowledge/index.ts`: Prompt composition with domain knowledge

**Domain Types:**
- `src/types/contract.ts`: All shared types (`Contract`, `Finding`, `LegalMeta`, `ScopeMeta`, `ViewState`, etc.)
- `src/knowledge/types.ts`: `KnowledgeModule`, `CompanyProfile` interfaces

**Schemas (Claude structured outputs):**
- `src/schemas/analysis.ts`: Core schemas (`FindingSchema`, `PassResultSchema`, `MergedAnalysisResultSchema`)
- `src/schemas/legalAnalysis.ts`: 11 legal clause-type schemas
- `src/schemas/scopeComplianceAnalysis.ts`: 4 scope/compliance schemas

## Naming Conventions

**Files:**
- Components: PascalCase `.tsx` (`FindingCard.tsx`, `SeverityBadge.tsx`)
- Pages: PascalCase `.tsx` (`Dashboard.tsx`, `ContractReview.tsx`)
- Hooks: camelCase with `use` prefix `.ts` (`useContractStore.ts`, `useCompanyProfile.ts`)
- Utilities: camelCase `.ts` (`bidSignal.ts`, `categoryIcons.ts`)
- Types: camelCase `.ts` (`contract.ts`)
- Schemas: camelCase `.ts` (`analysis.ts`, `legalAnalysis.ts`)
- Knowledge modules: kebab-case `.ts` (`ca-calosha.ts`, `div08-scope.ts`)
- Serverless functions: camelCase `.ts` (`analyze.ts`)

**Directories:**
- All lowercase, no separators (`components/`, `pages/`, `hooks/`, `schemas/`)
- Knowledge subdirs by domain (`regulatory/`, `standards/`, `trade/`)

**Exports:**
- Components: Named exports (not default) -- `export function Dashboard()`
- Hooks: Named exports -- `export function useContractStore()`
- Types: Named exports -- `export interface Contract`, `export type ViewState`
- Schemas: Named exports -- `export const FindingSchema`
- Knowledge modules: Side-effect registration (no explicit exports needed)

## Where to Add New Code

**New Page/View:**
1. Add view name to `ViewState` type in `src/types/contract.ts`
2. Create page component in `src/pages/NewPage.tsx` (PascalCase, named export)
3. Add case to `renderContent()` switch in `src/App.tsx`
4. Add nav item to `navItems` array in `src/components/Sidebar.tsx`

**New UI Component:**
- Create in `src/components/ComponentName.tsx`
- Use named export, accept props interface defined inline or in types file
- Use Tailwind utility classes for styling

**New Analysis Pass:**
1. Define Zod schema in `src/schemas/legalAnalysis.ts` or `src/schemas/scopeComplianceAnalysis.ts`
2. Add `AnalysisPass` entry to `ANALYSIS_PASSES` array in `api/analyze.ts`
3. Add conversion logic to `convertLegalFinding()` or `convertScopeFinding()` in `api/analyze.ts`
4. If needed, add new `LegalMeta` or `ScopeMeta` variant to `src/types/contract.ts`
5. Map knowledge modules in `PASS_KNOWLEDGE_MAP` in `src/knowledge/registry.ts`

**New Knowledge Module:**
1. Create module file in appropriate subdomain: `src/knowledge/regulatory/`, `src/knowledge/standards/`, or `src/knowledge/trade/`
2. Call `registerModule()` in the file (side-effect registration pattern)
3. Import the file in the subdomain's `index.ts` barrel
4. Map to relevant passes in `PASS_KNOWLEDGE_MAP` in `src/knowledge/registry.ts`
5. Ensure content stays under 10K estimated tokens (content.length / 4)

**New Utility:**
- Add to `src/utils/utilityName.ts`
- Use named exports, keep functions pure

**New Hook:**
- Add to `src/hooks/useHookName.ts`
- Prefix with `use`, named export

**New Domain Type:**
- Add to `src/types/contract.ts` (all domain types live in one file)

## Special Directories

**`api/`:**
- Purpose: Vercel serverless functions (auto-routed by filename)
- Generated: No
- Committed: Yes
- Note: Files here become API endpoints at `/api/{filename}`. Currently only `analyze.ts` exists.

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (by `npm run build`)
- Committed: Yes (present in repo)

**`.vercel/`:**
- Purpose: Vercel CLI project config
- Generated: Yes (by `vercel` CLI)
- Committed: Partial (`project.json` is committed)

**`src/knowledge/regulatory/`, `src/knowledge/standards/`, `src/knowledge/trade/`:**
- Purpose: Domain knowledge content for AI prompt injection
- Generated: No (hand-authored)
- Committed: Yes
- Note: Each has a `.gitkeep` file and an `index.ts` barrel that imports all modules for side-effect registration

---

*Structure analysis: 2026-03-12*
