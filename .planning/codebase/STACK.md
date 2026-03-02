# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.5.4 - Full application codebase (`src/` and `api/`)
- JSX - React component templates

**Secondary:**
- JavaScript - Configuration files and build scripts

## Runtime

**Environment:**
- Node.js (no version pinned in package.json) - Required for `@vercel/node` serverless functions

**Package Manager:**
- npm - Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI component library
- Vite 5.2.0 - Build tool and dev server
- TypeScript - Type checking (strict mode enabled in `tsconfig.json`)

**UI/Styling:**
- Tailwind CSS 3.4.17 - Utility-based CSS framework
- Framer Motion 11.5.4 - Animation library for staggered entries and presence detection
- Lucide React 0.522.0 - Icon library
- Emotion 11.13.3 - CSS-in-JS utilities (included as dependency)

**Form/Input:**
- React Dropzone 14.2.3 - File upload handling with drag-and-drop

**Backend/Serverless:**
- @vercel/node 5.6.9 - Vercel serverless functions (`api/analyze.ts`)

**Testing:**
- Not configured (no test framework in package.json)

**Build/Dev:**
- Vite 5.2.0 - Development server and production bundler
- @vitejs/plugin-react 4.2.1 - React Fast Refresh integration
- Tailwind CSS 3.4.17 - CSS processing
- PostCSS - CSS transformation
- Autoprefixer - Vendor prefixes for CSS

## Key Dependencies

**Critical:**
- @anthropic-ai/sdk 0.78.0 - Claude API client for contract analysis
- pdf-parse 2.4.5 - Server-side PDF text extraction (used in Vercel function)
- react 18.3.1 - UI framework
- react-dropzone 14.2.3 - File upload UX

**Infrastructure/DevOps:**
- @vercel/node 5.6.9 - Serverless function runtime
- typescript 5.5.4 - Language and type checker
- vite 5.2.0 - Build and dev server

**Linting:**
- eslint 8.50.0 - Code quality checks
- @typescript-eslint/eslint-plugin 5.54.0 - TypeScript-specific rules
- @typescript-eslint/parser 5.54.0 - TypeScript parsing for ESLint
- eslint-plugin-react-hooks 4.6.0 - React Hooks rules
- eslint-plugin-react-refresh 0.4.1 - React Refresh rules

**Type Definitions:**
- @types/react 18.3.1 - React type definitions
- @types/react-dom 18.3.1 - React DOM type definitions
- @types/node 20.11.18 - Node.js type definitions
- @types/pdf-parse 1.1.5 - pdf-parse type definitions

## Configuration

**TypeScript:**
- Config file: `tsconfig.json`
- Target: ES2020
- Module: ESNext
- Strict mode enabled (`strict: true`)
- JSX mode: react-jsx
- Settings: noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch enabled

**Tailwind CSS:**
- Config file: `tailwind.config.js`
- Scans: `index.html` and `src/**/*.{js,ts,jsx,tsx}`

**PostCSS:**
- Config file: `postcss.config.js`
- Configured for Tailwind and Autoprefixer

**Vite:**
- Config file: `vite.config.ts`
- Plugins: React plugin with Fast Refresh

**ESLint:**
- Config file: `.eslintrc.cjs`
- Extends: eslint:recommended, @typescript-eslint/recommended, react-hooks/recommended
- Parser: @typescript-eslint/parser
- Plugins: react-refresh, @typescript-eslint
- Key rule: `react-refresh/only-export-components` (warn)

**Environment:**
- `.env.local` file present - Contains `ANTHROPIC_API_KEY` (git-ignored)
- Node environment: `browser: true, es2020: true` in ESLint config

## Deployment

**Hosting:**
- Vercel - Serverless deployment

**Serverless Configuration:**
- File: `vercel.json`
- `/api/analyze.ts` function max duration: 60 seconds

**Build Command:**
- `npm run build` → `vite build`

**Start Command:**
- Development: `npm run dev` → `vite`
- Preview: `npm run preview` → `vite preview`

## Platform Requirements

**Development:**
- Node.js runtime (version unspecified, compatible with latest npm)
- npm package manager
- Supported OS: Windows, macOS, Linux (Vite supports all)

**Production:**
- Vercel platform required for deployment
- Node 18+ implied by @vercel/node 5.6.9
- ANTHROPIC_API_KEY environment variable required

---

*Stack analysis: 2026-03-01*
