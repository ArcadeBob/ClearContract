# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- TypeScript 5.5+ (strict mode) - All application code, both client and server
- TSX - React component files in `src/components/` and `src/pages/`

**Secondary:**
- CSS - Tailwind utility layer plus custom classes in `src/index.css`
- HTML - Single `index.html` entry point

## Runtime

**Environment:**
- Node.js (ES2020 target, ESNext modules)
- Browser (DOM, DOM.Iterable libs)
- Vercel serverless functions (Node.js runtime for `api/analyze.ts`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.3 - UI framework, functional components only
- Vite 5.2 - Dev server and build tool, configured in `vite.config.ts`
- Tailwind CSS 3.4 - Utility-first styling, configured in `tailwind.config.js`

**Animation:**
- Framer Motion 11.5 - Component animations, staggered entries, `AnimatePresence`

**Build/Dev:**
- `@vitejs/plugin-react` 4.2 - React Fast Refresh for Vite
- PostCSS + Autoprefixer - CSS processing pipeline (`postcss.config.js`)
- Vercel CLI - Local serverless function development (`vercel dev`)

**Code Quality:**
- ESLint 8.50 - Linting (`.eslintrc.cjs`)
- Prettier 3.8 - Formatting (`.prettierrc`)
- lint-staged 16.3 - Pre-commit formatting and linting

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` ^0.78.0 - Claude API client for contract analysis (used in `api/analyze.ts`)
- `zod` ^3.25.76 - Schema validation for all analysis pass results (`src/schemas/`)
- `zod-to-json-schema` ^3.25.1 - Converts Zod schemas to JSON Schema for Anthropic structured output
- `unpdf` ^1.4.0 - Server-side PDF text extraction (`api/analyze.ts`)

**Infrastructure:**
- `@vercel/node` ^5.6.9 - Vercel serverless function types and runtime
- `undici` ^7.22.0 - HTTP client with custom Agent for Anthropic API calls (`api/analyze.ts`)

**UI:**
- `react-dropzone` ^14.2.3 - PDF file upload drag-and-drop (`src/components/UploadZone.tsx`)
- `lucide-react` 0.522.0 - Icon library used throughout components

## TypeScript Configuration

**Client (`tsconfig.json`):**
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enforced
- JSX: react-jsx (automatic runtime)
- Scope: `src/` directory only

**Server (`tsconfig.node.json`):**
- Composite project for `vite.config.ts`
- Module: ESNext with bundler resolution
- Strict mode enabled

## Configuration

**Environment:**
- `.env.local` file present - contains `ANTHROPIC_API_KEY` (git-ignored)
- Environment variable accessed server-side only in `api/analyze.ts` via `process.env.ANTHROPIC_API_KEY`
- Company profile stored in browser `localStorage` under key `clearcontract:company-profile` (`src/knowledge/profileLoader.ts`)

**Build:**
- `vite.config.ts` - Dev server on port 3000, proxy `/api` to `localhost:3001`
- `vercel.json` - Serverless function config, `api/analyze.ts` max duration 300 seconds
- `tailwind.config.js` - Content paths: `index.html`, `src/**/*.{js,ts,jsx,tsx}`
- `postcss.config.js` - Tailwind + Autoprefixer plugins

**Code Style:**
- `.prettierrc` - Single quotes, ES5 trailing commas
- `.eslintrc.cjs` - Extends `eslint:recommended`, `@typescript-eslint/recommended`, `react-hooks/recommended`
- `lint-staged` in `package.json` - Runs Prettier and ESLint on staged `.ts/.tsx` files

## Scripts

```bash
npm run dev          # Vite dev server (frontend only, no API)
npm run dev:full     # vercel dev (frontend + serverless API)
npm run build        # vite build (production)
npm run lint         # ESLint check
npm run format       # Prettier write
npm run format:check # Prettier check
npm run preview      # Preview production build
```

## Platform Requirements

**Development:**
- Node.js with npm
- Vercel CLI for full-stack local development (`vercel dev`)
- Ports 3000 (Vite) and 3001 (API proxy target) - note ports 3000-3007 often occupied on dev machine

**Production:**
- Vercel hosting with serverless functions
- `ANTHROPIC_API_KEY` env var required in Vercel project settings
- Serverless function timeout: 300 seconds (for multi-pass AI analysis)

---

*Stack analysis: 2026-03-12*
